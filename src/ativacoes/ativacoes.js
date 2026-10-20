/* =================================================
   🎚️ MIKASA BOT — LIGAR / DESLIGAR LEVEL E REAÇÃO (por grupo)
   📁 Arquivo: ativacoes.js

   Os dois vêm DESLIGADOS. Cada grupo é independente: ligar num grupo
   não liga nos outros.

     <prefixo>level on / off     → conta XP e avisa quando alguém sobe de nível
     <prefixo>reacao on / off    → o bot reage com emoji nas mensagens do grupo
     <prefixo>level              → mostra se está ligado

   Só administrador do grupo (ou o dono do bot) liga/desliga.
================================================= */

const config = require("../../config");
const { getDB, saveDB } = require("../grupo-db/grupo-db");
const { isAdmin } = require("../grupo/grupo");

const RECURSOS = {
    level:  { campo: "level",  nome: "Level (XP e aviso de nível)", emoji: "📊" },
    reacao: { campo: "reacao", nome: "Reação automática",           emoji: "🎲" }
};

async function ativacoes(sock, msg, command, args) {
    const from = msg.key.remoteJid;
    const responder = (texto) => sock.sendMessage(from, { text: texto }, { quoted: msg });

    if (!String(from).endsWith("@g.us")) {
        return responder("ℹ️ Esse comando só funciona dentro de grupo — cada grupo liga o seu.");
    }

    const chave = String(command).toLowerCase().replace("ç", "c").replace("ã", "a");
    const recurso = RECURSOS[chave];
    if (!recurso) return;

    const db = getDB();
    if (!db[from]) db[from] = {};
    const estaLigado = db[from][recurso.campo] === true;

    const opcao = String(args?.[0] || "").toLowerCase();
    const querLigar = ["on", "ligar", "ativar", "1", "sim"].includes(opcao);
    const querDesligar = ["off", "desligar", "desativar", "0", "nao", "não"].includes(opcao);

    if (!querLigar && !querDesligar) {
        return responder(
            `${recurso.emoji} *${recurso.nome}*\n` +
            `Neste grupo está: *${estaLigado ? "LIGADO ✅" : "DESLIGADO ❌"}*\n\n` +
            `Para mudar (só admin):\n` +
            `• ${config.PREFIX}${chave} on\n` +
            `• ${config.PREFIX}${chave} off`
        );
    }

    const autor = msg.key.participant || msg.key.remoteJid;
    const admin = await isAdmin(sock, from, autor).catch(() => false);
    if (!admin) return responder("🚫 Apenas administradores podem ligar ou desligar isso.");

    db[from][recurso.campo] = querLigar;
    saveDB(db);

    return responder(
        `${recurso.emoji} *${recurso.nome}* ${querLigar ? "LIGADO ✅" : "DESLIGADO ❌"} neste grupo.` +
        (chave === "level" && querLigar
            ? `\n\n🐢 O nível sobe devagar: no máximo ${config.LEVEL?.XP_POR_DIA || 10} XP por dia, então spam não adianta.`
            : "")
    );
}

module.exports = { ativacoes };
