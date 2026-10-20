// src/kick.js - EXPULSAR USUÁRIO (MESMO QUE BAN)
const config = require("../../config");
const { registrarRemocao } = require("../comandos-solicitados/comandos-solicitados");

async function kick(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    
    if (!isGroup) {
        return sock.sendMessage(from, {
            text: `❌ Este comando só funciona em grupos!`
        }, { quoted: msg });
    }

    if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(from, {
            text: `❌ Responda à mensagem do usuário que deseja expulsar!`
        }, { quoted: msg });
    }

    const quotedJid = msg.message.extendedTextMessage.contextInfo.participant;

    try {
        await sock.groupParticipantsUpdate(from, [quotedJid], "remove");
        registrarRemocao(from, quotedJid, msg.key.participant || msg.key.remoteJid, args?.join(" ") || "Expulsão do grupo");
        
        const resposta = `🚪 @${quotedJid.split("@")[0]} foi expulso do grupo!`;
        await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro ao expulsar: ${err.message}` }, { quoted: msg });
    }
}

module.exports = { kick };
