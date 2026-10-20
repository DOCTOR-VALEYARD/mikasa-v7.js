/* =================================================
   🕵️ MIKASA BOT — X9 (APAGADAS + VISUALIZAÇÃO ÚNICA)
   📁 Arquivo: src/x9/x9.js

   Um comando só: .x9 liga/desliga NO CHAT.
   Quando ligado:
     🗑️ tudo que alguém APAGAR (texto, foto, vídeo, áudio, figurinha,
        documento) volta pro chat — a própria mídia, com a legenda
        original e a marcação de quem apagou. Mensagem curta.
     👁️ toda VISUALIZAÇÃO ÚNICA vira uma mídia normal (foto, vídeo
        ou áudio), com a legenda original.

   ⚠️ Só consegue devolver o que passou pelo bot DEPOIS que o X9 foi
   ligado nesse chat (o WhatsApp não entrega o conteúdo de antes).
   Para não pesar na hospedagem, a memória das mídias tem limite
   (ver LIMITE_* abaixo): as mais antigas saem primeiro.
================================================= */

const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

// ── LIGA/DESLIGA POR CHAT ──
const x9Ativo = new Map();
const x9Path = path.join(__dirname, "../dados/x9-modo.json");

(function carregarX9Inicial() {
    try {
        if (fs.existsSync(x9Path)) {
            const salvo = JSON.parse(fs.readFileSync(x9Path, "utf8"));
            for (const chave of Object.keys(salvo)) x9Ativo.set(chave, !!salvo[chave]);
        }
    } catch (e) {
        console.error("❌ Erro ao carregar estado do X9:", e);
    }
})();

function salvarX9Disco() {
    try {
        fs.mkdirSync(path.dirname(x9Path), { recursive: true });
        const obj = {};
        for (const [chave, valor] of x9Ativo.entries()) obj[chave] = valor;
        fs.writeFileSync(x9Path, JSON.stringify(obj, null, 2), "utf8");
    } catch (e) {
        console.error("❌ Erro ao salvar estado do X9:", e);
    }
}

function gerenciarX9(chatId) {
    if (x9Ativo.get(chatId)) {
        x9Ativo.set(chatId, false);
        salvarX9Disco();
        return "🔸 *X9:* DESATIVADO\n_Não mostro mais o que apagarem nem visualização única._";
    }
    x9Ativo.set(chatId, true);
    salvarX9Disco();
    return "🕵️ *X9:* ATIVADO\n_Tudo que apagarem aqui eu mostro de volta (texto, foto, vídeo, áudio, figurinha) e visualização única vira normal._";
}

// .viewonce / .vo agora ligam/desligam o mesmo X9 (ele já cobre as duas coisas)
const gerenciarViewOnce = gerenciarX9;

// ───────────────────────────────────────────────
// 🔧 UTILITÁRIOS (usados também pelo anti-delete)
// ───────────────────────────────────────────────
const LOGGER_MUDO = { level: "silent", info() {}, debug() {}, warn() {}, error() {}, trace() {}, fatal() {}, child() { return LOGGER_MUDO; } };

function numeroDe(jid) { return String(jid || "").split("@")[0].split(":")[0]; }

function tamanhoDe(no) {
    const t = no?.fileLength;
    if (t == null) return 0;
    if (typeof t === "object" && typeof t.toNumber === "function") return t.toNumber();
    return Number(t) || 0;
}

// Tira os "envelopes" do WhatsApp (mensagem temporária, visualização única,
// documento com legenda...) e diz se era visualização única.
function desembrulhar(m) {
    let viewOnce = false;
    for (let i = 0; i < 6 && m; i++) {
        if (m.ephemeralMessage?.message) { m = m.ephemeralMessage.message; continue; }
        if (m.viewOnceMessageV2Extension?.message) { viewOnce = true; m = m.viewOnceMessageV2Extension.message; continue; }
        if (m.viewOnceMessageV2?.message) { viewOnce = true; m = m.viewOnceMessageV2.message; continue; }
        if (m.viewOnceMessage?.message) { viewOnce = true; m = m.viewOnceMessage.message; continue; }
        if (m.documentWithCaptionMessage?.message) { m = m.documentWithCaptionMessage.message; continue; }
        break;
    }
    if (m?.imageMessage?.viewOnce || m?.videoMessage?.viewOnce || m?.audioMessage?.viewOnce) viewOnce = true;
    return { conteudo: m, viewOnce };
}

// Descobre o que é a mensagem. Devolve null para tipos que ignoramos.
function classificar(c) {
    if (!c) return null;
    if (c.conversation) return { tipo: "texto", texto: c.conversation };
    if (c.extendedTextMessage?.text) return { tipo: "texto", texto: c.extendedTextMessage.text };
    if (c.imageMessage) return { tipo: "imagem", legenda: c.imageMessage.caption || "", no: c.imageMessage, mimetype: c.imageMessage.mimetype || "image/jpeg" };
    if (c.videoMessage) return { tipo: "video", legenda: c.videoMessage.caption || "", no: c.videoMessage, mimetype: c.videoMessage.mimetype || "video/mp4", gif: !!c.videoMessage.gifPlayback };
    if (c.audioMessage) return { tipo: "audio", legenda: "", no: c.audioMessage, mimetype: c.audioMessage.mimetype || "audio/ogg; codecs=opus", ptt: !!c.audioMessage.ptt };
    if (c.stickerMessage) return { tipo: "figurinha", legenda: "", no: c.stickerMessage, mimetype: c.stickerMessage.mimetype || "image/webp" };
    if (c.documentMessage) return { tipo: "documento", legenda: c.documentMessage.caption || "", no: c.documentMessage, mimetype: c.documentMessage.mimetype || "application/octet-stream", nomeArquivo: c.documentMessage.fileName || "arquivo" };
    return null;
}

async function baixar(msgBase, conteudo, sock) {
    const alvo = { key: msgBase.key, message: conteudo };
    const ctx = { logger: LOGGER_MUDO };
    if (sock?.updateMediaMessage) ctx.reuploadRequest = sock.updateMediaMessage;
    return downloadMediaMessage(alvo, "buffer", {}, ctx);
}

function remetenteDe(msg) {
    // prefere o número de telefone (mais legível que o LID)
    const jid = msg.key.participantAlt || msg.key.participant || msg.key.remoteJidAlt || msg.key.remoteJid;
    return { jid, numero: numeroDe(jid) };
}

// ───────────────────────────────────────────────
// 👁️ VISUALIZAÇÃO ÚNICA → MÍDIA NORMAL (chamar pra toda mensagem recebida)
// Retorna true se tratou o evento.
// ───────────────────────────────────────────────
async function processarX9(sock, msg, from) {
    if (!x9Ativo.get(from) || msg?.key?.fromMe) return false;

    const { conteudo, viewOnce } = desembrulhar(msg.message);
    if (!viewOnce) return false;
    const info = classificar(conteudo);
    if (!info || !["imagem", "video", "audio"].includes(info.tipo)) return false;

    try {
        const buffer = await baixar(msg, conteudo, sock);
        const quem = remetenteDe(msg);
        const cab = `👁️ @${quem.numero} · visualização única`;
        const legenda = info.legenda ? `\n\n${info.legenda}` : "";
        const mentions = [quem.jid];

        if (info.tipo === "imagem") {
            await sock.sendMessage(from, { image: buffer, caption: cab + legenda, mentions });
        } else if (info.tipo === "video") {
            await sock.sendMessage(from, { video: buffer, caption: cab + legenda, mimetype: info.mimetype, mentions });
        } else {
            await sock.sendMessage(from, { text: cab, mentions });
            await sock.sendMessage(from, { audio: buffer, mimetype: info.mimetype, ptt: !!info.ptt });
        }
        return true;
    } catch (erro) {
        console.error("❌ X9: erro na visualização única:", erro?.message || erro);
        return false;
    }
}

module.exports = { gerenciarX9, gerenciarViewOnce, processarX9, x9Ativo, desembrulhar, classificar, baixar, remetenteDe, tamanhoDe };
