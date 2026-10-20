/* =================================================
   📌 MIKASA BOT — FIXAR MENSAGEM
   📁 Arquivo: fixar.js

   Uso: responda (marque) uma mensagem e envie
        <prefixo>fixar           → fixa por 7 dias (padrão)
        <prefixo>fixar 24h       → fixa por 24 horas
        <prefixo>fixar 7 dias    → fixa por 7 dias
        <prefixo>fixar 30 dias   → fixa por 30 dias

   O WhatsApp só aceita 3 durações (24h, 7 dias e 30 dias); qualquer outro
   valor é arredondado para a mais próxima acima. Depois de fixar, o bot
   manda um aviso com o botão "ENTRAR NO CANAL".
================================================= */

const config = require("../../config");
const { isAdmin, isBotAdmin } = require("../grupo/grupo");
const { enviarNativeFlow, botaoUrl } = require("../menuBotoes/menuBotoes");

const UM_DIA = 86400;
const SETE_DIAS = 604800;
const TRINTA_DIAS = 2592000;

function normalizarId(id) {
    return String(id || "").split(":")[0].split("@")[0];
}

// Converte o texto digitado em uma das 3 durações aceitas pelo WhatsApp.
function interpretarDuracao(args) {
    const texto = (args || []).join(" ").toLowerCase().trim();
    if (!texto) return { segundos: SETE_DIAS, rotulo: "7 dias" };

    const m = texto.match(/(\d+)\s*(h|hr|hrs|hora|horas|d|dia|dias|s|sem|semana|semanas|m|mes|mês|meses)?/);
    if (!m) return { segundos: SETE_DIAS, rotulo: "7 dias" };

    const numero = Math.max(1, parseInt(m[1], 10));
    const unidade = m[2] || "d";

    let dias;
    if (/^(h|hr|hrs|hora|horas)$/.test(unidade)) dias = numero / 24;
    else if (/^(s|sem|semana|semanas)$/.test(unidade)) dias = numero * 7;
    else if (/^(m|mes|mês|meses)$/.test(unidade)) dias = numero * 30;
    else dias = numero;

    if (dias <= 1) return { segundos: UM_DIA, rotulo: "24 horas" };
    if (dias <= 7) return { segundos: SETE_DIAS, rotulo: "7 dias" };
    return { segundos: TRINTA_DIAS, rotulo: "30 dias" };
}

function obterLinkCanal() {
    const candidatos = [
        config.CHANNEL_URL, config.CHANNEL_LINK, config.CHANNEL,
        config.CANAL_URL, config.CANAL_LINK, config.CANAL
    ];
    const valor = candidatos.find(v => typeof v === "string" && v.trim());
    if (!valor) return null;
    const limpo = valor.trim();
    if (/^https?:\/\//i.test(limpo)) return limpo;
    if (/^whatsapp\.com\/channel\//i.test(limpo)) return `https://${limpo}`;
    if (/^[A-Za-z0-9._-]+$/.test(limpo)) return `https://whatsapp.com/channel/${limpo}`;
    return null;
}

async function fixar(sock, msg, args = []) {
    const from = msg.key.remoteJid;

    if (!from || !from.endsWith("@g.us")) {
        return sock.sendMessage(from, { text: "📌 O comando de fixar só funciona em grupos." }, { quoted: msg });
    }

    const autor = msg.key.participant || msg.key.participantAlt || from;

    // 🔒 Só administrador (ou o próprio número do bot / dono) pode fixar.
    const admin = msg.key.fromMe || await isAdmin(sock, from, autor).catch(() => false);
    if (!admin) {
        return sock.sendMessage(from, {
            text: `╭─── ❀ ───\n⚠️ PERMISSÃO NEGADA ⚠️\n╰─── ❀ ───\n\n❌ Apenas administradores podem fixar mensagens!\n\n❀────────────────────❀\n🧣 ${config.BOT_NAME}\n🌹 ${config.OWNER_NAME}\n❀────────────────────❀`
        }, { quoted: msg });
    }

    // 📎 Precisa marcar (responder) a mensagem que será fixada.
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (!ctx?.stanzaId) {
        return sock.sendMessage(from, {
            text: `📌 *COMO FIXAR*\n\nMarque (responda) a mensagem que você quer fixar e envie:\n\n❀ ${config.PREFIX}fixar — 7 dias\n❀ ${config.PREFIX}fixar 24h — 24 horas\n❀ ${config.PREFIX}fixar 30 dias — 30 dias`
        }, { quoted: msg });
    }

    // O bot precisa ser admin para o aviso/fixação funcionar sem surpresas.
    const botAdmin = await isBotAdmin(sock, from).catch(() => false);
    if (!botAdmin) {
        return sock.sendMessage(from, {
            text: "⚠️ Me dê *administrador* no grupo para eu conseguir fixar mensagens."
        }, { quoted: msg });
    }

    const { segundos, rotulo } = interpretarDuracao(args);

    // Monta a chave da mensagem marcada.
    const donoDaMarcada = ctx.participant || null;
    const meusIds = [sock.user?.id, sock.user?.lid].filter(Boolean).map(normalizarId);
    const key = {
        remoteJid: from,
        id: ctx.stanzaId,
        fromMe: donoDaMarcada ? meusIds.includes(normalizarId(donoDaMarcada)) : false,
        ...(donoDaMarcada ? { participant: donoDaMarcada } : {})
    };

    try {
        // type: 1 = fixar para todos
        await sock.sendMessage(from, { pin: key, type: 1, time: segundos });
    } catch (erro) {
        console.error("❌ Erro ao fixar mensagem:", erro?.message || erro);
        return sock.sendMessage(from, {
            text: `❌ Não consegui fixar essa mensagem.\n⚠️ ${erro?.message || "Erro desconhecido."}`
        }, { quoted: msg });
    }

    const texto =
`╭─── ❀ ───
📌 ᴍᴇɴsᴀɢᴇᴍ ꜰɪxᴀᴅᴀ 📌
╰─── ❀ ───

✅ Uma mensagem foi fixada no grupo!
⏳ Duração: *${rotulo}*
👮 Por: @${normalizarId(autor)}

📣 Dá uma olhada lá em cima e fique por dentro!

❀────────────────────❀
🧣 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀`;

    const linkCanal = obterLinkCanal();
    if (linkCanal) {
        try {
            return await enviarNativeFlow(sock, from, {
                text: texto,
                footer: config.BOT_NAME || "Mikasa Bot",
                buttons: [botaoUrl("📢 ENTRAR NO CANAL", linkCanal)],
                quoted: msg,
                mentions: [autor]
            });
        } catch (erro) {
            console.error("⚠️ Aviso do fixar com botão falhou, enviando texto simples:", erro?.message || erro);
        }
    }

    return sock.sendMessage(from, { text: texto, mentions: [autor] }, { quoted: msg });
}

module.exports = { fixar, interpretarDuracao };
