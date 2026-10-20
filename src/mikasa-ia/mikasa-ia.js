/* =================================================
   🧠 MIKASA BOT — IA REAL (Hugging Face Inference Providers)
   📁 Arquivo: mikasa-ia.js
   👑 DOCTOR VALEYARD

   Mantém o mesmo sistema de ativar/desativar por chat
   (.ia), mas agora:
   - Só responde quando falam DIRETAMENTE com ela
     (menciona @bot, responde/quota uma mensagem dela,
     ou é uma conversa privada) — não responde tudo
   - Guarda um histórico curto por pessoa, pra não
     "esquecer" o assunto no meio da conversa
   - Responde imagens (visão)
   - Avisa quando a pessoa manda um texto muito grande
================================================= */

const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

const modoAtivo = new Map();

// ── persistência do modo ativo/desativado por chat ──
// Sem isso, se o bot reiniciar depois de alguém dar ".ia" pra ativar,
// a ativação se perde e parece que "não funciona".
const modoPath = path.join(__dirname, "../dados/mikasa-modo.json");

(function carregarModoInicial() {
    try {
        if (fs.existsSync(modoPath)) {
            const salvo = JSON.parse(fs.readFileSync(modoPath, "utf8"));
            for (const chave of Object.keys(salvo)) modoAtivo.set(chave, !!salvo[chave]);
        }
    } catch (e) {
        console.error("❌ Erro ao carregar estado da IA:", e);
    }
})();

function salvarModoDisco() {
    try {
        const obj = {};
        for (const [chave, valor] of modoAtivo.entries()) obj[chave] = valor;
        fs.writeFileSync(modoPath, JSON.stringify(obj, null, 2), "utf8");
    } catch (e) {
        console.error("❌ Erro ao salvar estado da IA:", e);
    }
}

// ── MEMÓRIA PERSISTENTE EM DISCO ──
// Assim a IA não "esquece" o assunto se o bot reiniciar, e continua de onde
// parou quando a pessoa voltar a falar com ela depois.
const memoriaPath = path.join(__dirname, "../dados/mikasa-memoria.json");

function carregarMemoriaDisco() {
    try {
        if (fs.existsSync(memoriaPath)) {
            return JSON.parse(fs.readFileSync(memoriaPath, "utf8"));
        }
    } catch (e) {
        console.error("❌ Erro ao carregar memória da IA:", e);
    }
    return {};
}

let salvandoMemoria = false;
let salvarPendente = false;
function salvarMemoriaDisco() {
    // debounce simples pra não ficar escrevendo em disco a cada mensagem
    if (salvandoMemoria) { salvarPendente = true; return; }
    salvandoMemoria = true;
    setTimeout(() => {
        try {
            const obj = {};
            for (const [chave, valor] of historicos.entries()) {
                obj[chave] = { historico: valor.historico, ultimaInteracao: valor.ultimaInteracao };
            }
            fs.writeFileSync(memoriaPath, JSON.stringify(obj, null, 2), "utf8");
        } catch (e) {
            console.error("❌ Erro ao salvar memória da IA:", e);
        }
        salvandoMemoria = false;
        if (salvarPendente) { salvarPendente = false; salvarMemoriaDisco(); }
    }, 800);
}

// Por quanto tempo, depois de falar com ela, a pessoa continua "na conversa"
// sem precisar marcar/responder de novo (em grupo). Em DM isso não importa,
// já é sempre direto.
const JANELA_CONVERSA_MS = 10 * 60 * 1000; // 10 minutos

// Acima disso, o bot só avisa que a mensagem tá grande (economiza chamadas de IA)
const LIMITE_MENSAGEM_LONGA = 400;

const avisosMensagemLonga = [
    "📏 Uau, mandou um textão! Da próxima vez tenta resumir, fica mais fácil pra todo mundo acompanhar 😅",
    "📝 Textão detectado! Bora resumir aí que fica mais leve pro grupo 😂",
    "😮 Escreveu um livro hein! Segura a criatividade um pouquinho da próxima vez 📚",
];

function aleatorio(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

function normalizarTexto(t) {
    return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function gerenciarModoIA(grupoId) {
    if (modoAtivo.get(grupoId)) {
        modoAtivo.set(grupoId, false);
        salvarModoDisco();
        return `🔸 *${config.BOT_NAME} IA:* DESATIVADA\n_Volto quando me chamarem._`;
    } else {
        modoAtivo.set(grupoId, true);
        salvarModoDisco();
        return `🔹 *${config.BOT_NAME} IA:* ATIVADA\n_Pode falar comigo à vontade, eu acompanho a conversa._`;
    }
}

// ── MEMÓRIA CURTA DE CONVERSA (por pessoa, não pelo chat inteiro) ──
// Assim, se você falar "conta uma piada" e depois "não gostei, conta outra",
// ela lembra do assunto em vez de perguntar "qual piada?".
const MAX_HISTORICO = 12; // 6 pares pergunta/resposta
const historicos = new Map(); // chaveMemoria -> { historico: [{role, content}], ultimaInteracao: timestamp }

// carrega memória salva em disco (se existir) assim que o módulo sobe
(function carregarInicial() {
    const salvo = carregarMemoriaDisco();
    for (const chave of Object.keys(salvo)) {
        historicos.set(chave, {
            historico: Array.isArray(salvo[chave]?.historico) ? salvo[chave].historico : [],
            ultimaInteracao: salvo[chave]?.ultimaInteracao || 0,
        });
    }
})();

function pegarEntrada(chaveMemoria) {
    if (!historicos.has(chaveMemoria)) historicos.set(chaveMemoria, { historico: [], ultimaInteracao: 0 });
    return historicos.get(chaveMemoria);
}

function pegarHistorico(chaveMemoria) {
    return pegarEntrada(chaveMemoria).historico;
}

function ultimaInteracao(chaveMemoria) {
    return pegarEntrada(chaveMemoria).ultimaInteracao || 0;
}

function adicionarAoHistorico(chaveMemoria, role, content) {
    const entrada = pegarEntrada(chaveMemoria);
    entrada.historico.push({ role, content });
    while (entrada.historico.length > MAX_HISTORICO) entrada.historico.shift();
    entrada.ultimaInteracao = Date.now();
    salvarMemoriaDisco();
}

const SAUDACOES = ["bom dia", "boa tarde", "boa noite", "bomdia", "boatarde", "boanoite"];
const PALAVRAS_PERGUNTA = ["como", "por que", "porque", "pq", "o que", "oque", "quando", "onde", "quem", "qual", "quais", "alguem sabe", "sabe me dizer", "me ajuda", "me explica", "duvida"];

function pareceSaudacao(textoNormalizado) {
    return SAUDACOES.some(s => textoNormalizado === s || textoNormalizado.startsWith(s + " ") || textoNormalizado.startsWith(s + ","));
}

function pareceDuvidaOuPergunta(textoNormalizado) {
    if (textoNormalizado.includes("?")) return true;
    return PALAVRAS_PERGUNTA.some(p => textoNormalizado.startsWith(p + " ") || textoNormalizado.includes(" " + p + " "));
}

// ── Decide se a IA deve responder essa mensagem ──
// DM: sempre responde. Grupo: responde se for chamada diretamente
// (@ ou resposta), se for saudação, se parecer pergunta/dúvida, ou se a
// pessoa já estava numa conversa recente com ela (memória).
function estaFalandoComABot(msg, botId, isGroup, chaveMemoria, textoNormalizado = "") {
    if (!isGroup) return true;

    const numeroBot = (botId || "").split("@")[0].split(":")[0];
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;

    const respondeuOBot = contextInfo?.participant &&
        contextInfo.participant.split("@")[0].split(":")[0] === numeroBot;

    const mencionouOBot = (contextInfo?.mentionedJid || []).some(
        j => j.split("@")[0].split(":")[0] === numeroBot
    );

    if (respondeuOBot || mencionouOBot) return true;
    if (pareceSaudacao(textoNormalizado)) return true;
    if (pareceDuvidaOuPergunta(textoNormalizado)) return true;

    // Se a pessoa já estava conversando com ela recentemente, continua
    // valendo mesmo sem marcar de novo — ela tem memória da conversa.
    const ultima = chaveMemoria ? ultimaInteracao(chaveMemoria) : 0;
    if (ultima && (Date.now() - ultima) < JANELA_CONVERSA_MS) return true;

    return false;
}

// ── CHAMADA GENÉRICA À API DE IA (compatível com OpenAI) ──
// Trocar de provedor no futuro = só mexer em config.js (AI_BASE_URL / AI_MODEL / AI_API_KEY)
async function chamarIA(mensagens, modelo) {
    if (!config.AI_ATIVA || !config.AI_API_KEY) return null;
    try {
        const resposta = await axios.post(
            `${config.AI_BASE_URL}/chat/completions`,
            {
                model: modelo,
                messages: mensagens,
                max_tokens: 220,
                temperature: 0.85,
            },
            {
                headers: {
                    Authorization: `Bearer ${config.AI_API_KEY}`,
                    "Content-Type": "application/json",
                },
                timeout: 30000,
            }
        );
        return resposta.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (erro) {
        console.error("❌ Erro ao chamar IA:", erro?.response?.data || erro.message);
        return null;
    }
}

// ── PROCESSAMENTO PRINCIPAL — chamar pra toda mensagem de grupo/privado ──
// Retorna true se já respondeu (pra quem chamou saber que não precisa fazer mais nada)
async function processarIA(sock, msg, from, botId) {
    const estaAtivo = modoAtivo.get(from) || false;
    if (!estaAtivo || !config.AI_ATIVA) return false;

    const isGroup = from.endsWith("@g.us");
    const remetente = msg.key.participant || msg.key.remoteJid;
    const chaveMemoria = isGroup ? `${from}_${remetente}` : from;

    const temImagem = !!msg.message?.imageMessage;
    const texto = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption || ""
    ).trim();

    if (!estaFalandoComABot(msg, botId, isGroup, chaveMemoria, normalizarTexto(texto))) return false; // não é relevante, ignora

    if (!texto && !temImagem) return false;
    if (!temImagem && texto.length < 2) return false;

    // 📏 mensagem muito grande -> só avisa, não gasta chamada de IA nem entra na memória
    if (!temImagem && texto.length > LIMITE_MENSAGEM_LONGA) {
        await sock.sendMessage(from, { text: aleatorio(avisosMensagemLonga) }, { quoted: msg });
        return true;
    }

    let respostaTexto = null;

    if (temImagem) {
        // 🖼️ Responde imagens (visão) — usa o modelo configurado pra isso
        try {
            const buffer = await downloadMediaMessage(msg, "buffer", {});
            const base64 = buffer.toString("base64");
            respostaTexto = await chamarIA(
                [
                    { role: "system", content: config.AI_PERSONALIDADE },
                    ...pegarHistorico(chaveMemoria),
                    {
                        role: "user",
                        content: [
                            { type: "text", text: texto || "Comente essa imagem de forma breve." },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
                        ],
                    },
                ],
                config.AI_MODEL_VISAO
            );
        } catch (erro) {
            console.error("❌ Erro ao processar imagem pra IA:", erro);
        }
        if (respostaTexto) {
            adicionarAoHistorico(chaveMemoria, "user", texto || "[enviou uma imagem]");
            adicionarAoHistorico(chaveMemoria, "assistant", respostaTexto);
        }
    } else {
        // Usa o histórico da pessoa como contexto, pra não perder o fio da conversa
        respostaTexto = await chamarIA(
            [
                { role: "system", content: config.AI_PERSONALIDADE },
                ...pegarHistorico(chaveMemoria),
                { role: "user", content: texto },
            ],
            config.AI_MODEL
        );
        if (respostaTexto) {
            adicionarAoHistorico(chaveMemoria, "user", texto);
            adicionarAoHistorico(chaveMemoria, "assistant", respostaTexto);
        }
    }

    if (!respostaTexto) return false; // se a IA falhar, não trava o bot — só não responde dessa vez
    await sock.sendMessage(from, { text: respostaTexto }, { quoted: msg });
    return true;
}

module.exports = { gerenciarModoIA, processarIA, normalizarTexto, chamarIA };
