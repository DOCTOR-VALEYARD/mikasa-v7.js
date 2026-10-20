/* =================================================
   🤖 MIKASA BOT — ANTI-BOT (evita loop entre bots)
   📁 Arquivo: anti-bot.js

   Problema: em grupo com mais de um bot usando o MESMO prefixo, um responde o
   outro, o outro responde de volta... e vira spam.

   COMO RESOLVE
   1) 🔎 ID da mensagem — bots em Baileys geram IDs num formato que o celular não usa:
        • BAE5 + 12 caracteres        → bot Baileys antigo: ignorado na hora
        • 3EB0 + 18 ou 36 caracteres  → "provável bot" (o WhatsApp Web usa algo parecido,
          por isso só vira bot se um dos sinais abaixo também bater)
   2) ⏱️ Reação rápida — "provável bot" que escreve até 2,5 s depois de uma resposta MINHA
      no mesmo chat é resposta automática de outro bot.
   3) ⚡ Rajada — "provável bot" que manda 3 mensagens em até 5 s no mesmo chat não é gente.
   4) 📝 Quem é marcado como bot fica salvo (src/dados/outros-bots.json) e é ignorado por
      2 horas; depois a pessoa volta a ser avaliada. O DONO nunca é ignorado.

   🔁 ANTI-REPETIÇÃO (vale pra bot E pra gente): se o bot JÁ respondeu uma mensagem e a
   MESMA pessoa manda exatamente o mesmo texto de novo em 60 s, a segunda é ignorada.
   Corta o ping-pong ("qual o prefixo?" → resposta → mesma pergunta → resposta...).

   🏷️ Também anota o ID de tudo que o bot enviou (antes mesmo de enviar), pra nunca tratar
   um eco seu como se fosse de outra pessoa.

   AJUSTES no config.js
     IGNORAR_OUTROS_BOTS: false      → desliga a detecção de outros bots
     ANTI_REPETICAO_SEGUNDOS: 60     → janela da anti-repetição (0 = desligada)
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { DADOS } = require("../caminhos/caminhos");

// ───────────── constantes ─────────────
const ARQUIVO = path.join(DADOS, "outros-bots.json");
const JANELA_REACAO_MS = 2500;             // resposta "rápida demais" depois de uma fala minha
const RAJADA_QTD = 3;                      // quantas mensagens...
const RAJADA_JANELA_MS = 5000;             // ...nesse intervalo contam como rajada
const VALIDADE_MS = 2 * 60 * 60 * 1000;    // quanto tempo um bot fica ignorado
const GUARDAR_IDS_MS = 15 * 60 * 1000;     // por quanto tempo lembrar dos IDs que eu enviei
const LIMITE_MAPA = 2000;                  // trava de segurança: nenhum mapa cresce sem fim

// ───────────── estado em memória ─────────────
const entradas = new Map();             // id recebido -> { chave, t }
const respondidos = new Map();          // chat|pessoa|texto -> quando o bot respondeu
const ultimaEntradaNoChat = new Map();  // chat -> { chave, t }
const idsEnviados = new Map();          // id que EU enviei -> quando
const ultimoEnvioNoChat = new Map();    // chat -> quando enviei algo (reação não conta)
const rajadas = new Map();              // chat|pessoa -> [timestamps recentes]
let marcados = {};                      // pessoa -> até quando é ignorada

try {
    if (fs.existsSync(ARQUIVO)) marcados = JSON.parse(fs.readFileSync(ARQUIVO, "utf8")) || {};
} catch { marcados = {}; }

// ───────────── utilidades ─────────────
let salvando = null;
function salvar() {
    // grava em arquivo temporário e troca (nunca deixa o JSON pela metade) e junta várias gravações seguidas
    if (salvando) return;
    salvando = setTimeout(() => {
        salvando = null;
        try {
            fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
            const tmp = `${ARQUIVO}.tmp`;
            fs.writeFileSync(tmp, JSON.stringify(marcados, null, 2), "utf8");
            fs.renameSync(tmp, ARQUIVO);
        } catch (e) { console.error("⚠️ anti-bot: não consegui salvar a lista:", e?.message || e); }
    }, 300);
    if (typeof salvando.unref === "function") salvando.unref();
}

function ligado() {
    return config.IGNORAR_OUTROS_BOTS !== false;
}

function limitar(mapa) {
    // se passar do limite, descarta os mais antigos (Map mantém a ordem de inserção)
    while (mapa.size > LIMITE_MAPA) mapa.delete(mapa.keys().next().value);
}

function chaveDoRemetente(msg) {
    return String(msg?.key?.participant || msg?.key?.remoteJid || "").replace(/:\d+@/, "@");
}

// ───────────── anti-repetição ─────────────
function janelaRepeticaoMs() {
    const seg = Number(config.ANTI_REPETICAO_SEGUNDOS ?? 60);
    return seg > 0 ? seg * 1000 : 0;
}

function normalizarParaRepeticao(texto) {
    return String(texto || "")
        .toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function chaveDeRepeticao(msg, texto) {
    const norm = normalizarParaRepeticao(texto);
    if (norm.length < 2 || /^[0-9 ]+$/.test(norm)) return null; // vazio ou só número ("1", "2"...)
    return `${msg?.key?.remoteJid}|${chaveDoRemetente(msg)}|${norm}`;
}

// A mesma pessoa mandou, de novo, o mesmo texto que o bot já respondeu há pouco?
function ehRepeticao(msg, texto, ehDono = false) {
    const janela = janelaRepeticaoMs();
    if (!janela || ehDono || msg?.key?.fromMe) return false;
    const chave = chaveDeRepeticao(msg, texto);
    if (!chave) return false;
    const quando = respondidos.get(chave);
    return !!quando && Date.now() - quando < janela;
}

// Anota que chegou essa mensagem (pra saber, depois, qual delas o bot respondeu).
function registrarEntrada(msg, texto) {
    const chave = chaveDeRepeticao(msg, texto);
    if (!chave) return;
    const registro = { chave, t: Date.now() };
    if (msg?.key?.id) entradas.set(msg.key.id, registro);
    ultimaEntradaNoChat.set(msg.key.remoteJid, registro);
    limitar(entradas); limitar(ultimaEntradaNoChat);
}

// O bot respondeu algo: marca a mensagem respondida (pela citação, ou a mais recente do chat).
function marcarRespondido(chatId, idCitado) {
    let registro = idCitado ? entradas.get(idCitado) : null;
    if (!registro) {
        const ultimo = ultimaEntradaNoChat.get(chatId);
        if (ultimo && Date.now() - ultimo.t <= 20000) registro = ultimo;
    }
    if (registro) { respondidos.set(registro.chave, Date.now()); limitar(respondidos); }
}

// ───────────── rastreio do que o bot envia ─────────────
function registrarEnvio(chatId, idMensagem, ehReacao = false) {
    if (idMensagem) idsEnviados.set(idMensagem, Date.now());
    if (chatId && !ehReacao) ultimoEnvioNoChat.set(chatId, Date.now());
    limitar(idsEnviados); limitar(ultimoEnvioNoChat);
}

// gera o ID da mensagem ANTES de enviar (assim o eco nunca chega antes de eu anotar)
function novoIdMensagem(sock) {
    try {
        const b = require("@whiskeysockets/baileys");
        const gerar = b.generateMessageIDV2 || b.generateMessageID;
        if (typeof gerar !== "function") return null;
        return gerar(sock.authState?.creds?.me?.id || sock.user?.id);
    } catch { return null; }
}

// Envolve sendMessage/relayMessage do socket pra anotar tudo que o bot manda.
function instalarRastreio(sock) {
    if (!sock || sock.__antiBotInstalado) return;
    sock.__antiBotInstalado = true;

    // 🏷️ Figurinha enviada sem etiqueta (nome do pacote/autor) ganha a etiqueta padrão do bot.
    try { require("../figurinha-meta/figurinha-meta").instalar(sock); } catch {}

    const enviarOriginal = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, conteudo, ...resto) => {
        const ehReacao = !!conteudo?.react;
        let idAntes = null;
        try {
            if (!conteudo?.delete && !resto[0]?.messageId) {
                idAntes = novoIdMensagem(sock);
                if (idAntes) { resto[0] = { ...(resto[0] || {}), messageId: idAntes }; registrarEnvio(jid, idAntes, ehReacao); }
            }
        } catch { idAntes = null; }

        const resultado = await enviarOriginal(jid, conteudo, ...resto);
        try {
            registrarEnvio(jid, resultado?.key?.id, ehReacao);
            if (!ehReacao && !conteudo?.delete) marcarRespondido(jid, resto[0]?.quoted?.key?.id);
        } catch {}
        return resultado;
    };

    if (typeof sock.relayMessage === "function") {
        const retransmitirOriginal = sock.relayMessage.bind(sock);
        sock.relayMessage = async (jid, mensagem, opcoes = {}) => {
            try { registrarEnvio(jid, opcoes?.messageId); marcarRespondido(jid, null); } catch {}
            return retransmitirOriginal(jid, mensagem, opcoes);
        };
    }
}

// Mensagem que veio do MESMO número do bot (eco do que ele mesmo enviou)?
function ehEcoDoBot(msg) {
    return idsEnviados.has(msg?.key?.id);
}

// ───────────── detecção de outro bot ─────────────
function tipoDeId(id) {
    const v = String(id || "");
    if (/^BAE5[0-9A-F]{12}$/i.test(v)) return "certo";
    if (/^3EB0[0-9A-F]{18}$/i.test(v) || /^3EB0[0-9A-F]{36}$/i.test(v)) return "provavel";
    return "humano";
}

// 3 mensagens em até 5 s do mesmo "provável bot" no mesmo chat → é rajada de bot
function ehRajada(msg) {
    const chave = `${msg.key.remoteJid}|${chaveDoRemetente(msg)}`;
    const agora = Date.now();
    const lista = (rajadas.get(chave) || []).filter(t => agora - t <= RAJADA_JANELA_MS);
    lista.push(agora);
    rajadas.set(chave, lista);
    limitar(rajadas);
    return lista.length >= RAJADA_QTD;
}

/**
 * true  → a mensagem é de outro bot: ignore por completo (sem comando, sem reação).
 * false → trata normal.
 * ehDono: se quem mandou é o dono do bot, nunca é ignorado.
 */
function ehOutroBot(msg, ehDono = false) {
    if (!ligado() || ehDono || msg?.key?.fromMe) return false;
    if (!String(msg?.key?.remoteJid || "").endsWith("@g.us")) return false; // só faz sentido em grupo

    const chave = chaveDoRemetente(msg);
    if (marcados[chave] && marcados[chave] > Date.now()) return true;

    const tipo = tipoDeId(msg.key.id);
    let motivo = tipo === "certo" ? "ID de bot" : null;

    if (!motivo && tipo === "provavel") {
        const ultimo = ultimoEnvioNoChat.get(msg.key.remoteJid);
        if (ultimo && Date.now() - ultimo <= JANELA_REACAO_MS) motivo = "respondeu rápido demais";
        else if (ehRajada(msg)) motivo = "rajada de mensagens";
    }

    if (motivo) {
        marcados[chave] = Date.now() + VALIDADE_MS;
        salvar();
        console.log(`🤖 Outro bot detectado em ${msg.key.remoteJid}: ${chave} (${motivo}) — ignorando por 2h.`);
        return true;
    }
    return false;
}

// ───────────── manutenção ─────────────
function limparAntigos() {
    const agora = Date.now();
    for (const [id, t] of idsEnviados) if (agora - t > GUARDAR_IDS_MS) idsEnviados.delete(id);
    const limite = Math.max(janelaRepeticaoMs(), 60000) * 2;
    for (const [k, v] of respondidos) if (agora - v > limite) respondidos.delete(k);
    for (const [k, v] of entradas) if (agora - v.t > limite) entradas.delete(k);
    for (const [k, v] of ultimaEntradaNoChat) if (agora - v.t > limite) ultimaEntradaNoChat.delete(k);
    for (const [k, v] of ultimoEnvioNoChat) if (agora - v > limite) ultimoEnvioNoChat.delete(k);
    for (const [k, lista] of rajadas) if (!lista.some(t => agora - t <= RAJADA_JANELA_MS)) rajadas.delete(k);
    let mudou = false;
    for (const [jid, expira] of Object.entries(marcados)) {
        if (expira <= agora) { delete marcados[jid]; mudou = true; }
    }
    if (mudou) salvar();
}

// faxina automática a cada 5 min (não impede o bot de encerrar)
const faxina = setInterval(limparAntigos, 5 * 60 * 1000);
if (typeof faxina.unref === "function") faxina.unref();

// ───────────── utilidades pra o dono ─────────────
/** Quem está sendo ignorado agora: [{ jid, ateQuando }] */
function listarMarcados() {
    const agora = Date.now();
    return Object.entries(marcados).filter(([, t]) => t > agora).map(([jid, t]) => ({ jid, ateQuando: t }));
}
/** Libera alguém que foi marcado como bot por engano. */
function liberar(jid) {
    const chave = String(jid || "").replace(/:\d+@/, "@");
    const existia = !!marcados[chave];
    delete marcados[chave];
    if (existia) salvar();
    return existia;
}

module.exports = {
    instalarRastreio, registrarEnvio, ehEcoDoBot, ehOutroBot, tipoDeId,
    ehRepeticao, registrarEntrada, marcarRespondido,
    listarMarcados, liberar
};
