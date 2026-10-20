/* =================================================
   💳 PAGAMENTO PIX — integração com Mercado Pago
   📁 Arquivo: pagamento-pix.js

   Como funciona, resumido:
   1) criarCobrancaPix() manda pro Mercado Pago "quero cobrar R$X
      desse jeito" e recebe de volta um QR Code + código copia-e-cola.
   2) O bot NÃO espera um aviso do Mercado Pago (isso exigiria um
      endereço de internet público, que o Termux não tem por padrão).
      Em vez disso, iniciarPolling() fica perguntando de tempos em
      tempos pro Mercado Pago "esse pagamento já caiu?" até confirmar
      ou desistir depois de um tempo.
================================================= */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const config = require("../../config");

const dbPath = path.join(__dirname, "../../database/botconfig.json");
const pendentesPath = path.join(__dirname, "../dados/pagamentos-pendentes.json");

function lerDB() {
    try {
        return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf-8")) : {};
    } catch {
        return {};
    }
}

function obterToken() {
    const db = lerDB();
    return (db && db.MP_ACCESS_TOKEN) || config.MP_ACCESS_TOKEN || "";
}

function tokenConfigurado() {
    return !!obterToken();
}

function lerPendentes() {
    try {
        return fs.existsSync(pendentesPath) ? JSON.parse(fs.readFileSync(pendentesPath, "utf-8")) : {};
    } catch {
        return {};
    }
}

function salvarPendentes(db) {
    fs.writeFileSync(pendentesPath, JSON.stringify(db, null, 2), "utf-8");
}

function registrarPendente(paymentId, dados) {
    const db = lerPendentes();
    db[paymentId] = { ...dados, criadoEm: Date.now() };
    salvarPendentes(db);
}

function removerPendente(paymentId) {
    const db = lerPendentes();
    delete db[paymentId];
    salvarPendentes(db);
}

// 💰 Cria a cobrança Pix no Mercado Pago. Retorna o essencial pra
// mostrar pro cliente: o texto "copia e cola" e a imagem do QR Code
// (o próprio Mercado Pago já devolve a imagem pronta em base64).
async function criarCobrancaPix({ valor, descricao, email, referencia }) {
    const token = obterToken();
    if (!token) {
        throw new Error(
            "O token do Mercado Pago ainda não foi configurado. " +
            `Use ${config.PREFIX}configurar-bot mptoken SEU_TOKEN`
        );
    }

    const resposta = await axios.post(
        "https://api.mercadopago.com/v1/payments",
        {
            transaction_amount: Number(valor),
            description: descricao || "Aluguel do bot",
            payment_method_id: "pix",
            external_reference: referencia,
            payer: { email: email || "cliente@mikasabot.com" }
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                // Evita cobrar duas vezes se a requisição for repetida.
                "X-Idempotency-Key": `${referencia}-${Date.now()}`
            },
            timeout: 20000
        }
    );

    const dados = resposta.data;
    const pix = dados?.point_of_interaction?.transaction_data;
    if (!pix?.qr_code) throw new Error("O Mercado Pago não devolveu o QR Code do Pix.");

    return {
        id: dados.id,
        status: dados.status,
        copiaECola: pix.qr_code,
        qrCodeBase64: pix.qr_code_base64,
        ticketUrl: pix.ticket_url
    };
}

// 🔎 Consulta o status atual de um pagamento específico.
async function consultarPagamento(paymentId) {
    const token = obterToken();
    const resposta = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000
    });
    return resposta.data;
}

// ⏱️ Fica checando o pagamento de tempos em tempos até aprovar ou
// esgotar o prazo. onPago/onExpirado são chamados só uma vez.
function iniciarPolling(paymentId, { onPago, onExpirado, intervaloMs = 15000, timeoutMs = 30 * 60 * 1000 }) {
    const inicio = Date.now();

    const checar = async () => {
        try {
            const pagamento = await consultarPagamento(paymentId);
            if (pagamento.status === "approved") {
                removerPendente(paymentId);
                clearInterval(intervalo);
                return onPago && onPago(pagamento);
            }
            if (["cancelled", "rejected"].includes(pagamento.status)) {
                removerPendente(paymentId);
                clearInterval(intervalo);
                return onExpirado && onExpirado("recusado");
            }
        } catch (erro) {
            console.error("⚠️ Erro ao checar pagamento Pix:", erro.message);
        }

        if (Date.now() - inicio >= timeoutMs) {
            removerPendente(paymentId);
            clearInterval(intervalo);
            return onExpirado && onExpirado("tempo_esgotado");
        }
    };

    const intervalo = setInterval(checar, intervaloMs);
    return intervalo;
}

// 🔁 Chamar uma vez quando o bot inicia: retoma o polling de cobranças
// que ainda estavam pendentes (ex.: o bot reiniciou no meio do processo).
function retomarPendentes({ onPago, onExpirado }) {
    if (!tokenConfigurado()) return;
    const db = lerPendentes();
    for (const [paymentId, dados] of Object.entries(db)) {
        // Não retoma cobrança muito velha, só deixa expirar.
        if (Date.now() - dados.criadoEm > 30 * 60 * 1000) {
            removerPendente(paymentId);
            continue;
        }
        iniciarPolling(paymentId, {
            intervaloMs: 15000,
            timeoutMs: 30 * 60 * 1000 - (Date.now() - dados.criadoEm),
            onPago: pagamento => onPago && onPago(pagamento, dados),
            onExpirado: motivo => onExpirado && onExpirado(motivo, dados)
        });
    }
}

module.exports = {
    tokenConfigurado,
    criarCobrancaPix,
    consultarPagamento,
    iniciarPolling,
    retomarPendentes,
    registrarPendente,
    removerPendente,
    lerPendentes
};
