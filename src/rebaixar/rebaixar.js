const config = require("../../config");
async function rebaixar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    if (!isGroup) return sock.sendMessage(from, { text: `❌ Só em grupos!` }, { quoted: msg });
    
    if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(from, { text: `❌ Responda à mensagem do usuário!` }, { quoted: msg });
    }
    
    const quotedJid = msg.message.extendedTextMessage.contextInfo.participant;
    try {
        await sock.groupParticipantsUpdate(from, [quotedJid], "demote");
        await sock.sendMessage(from, { text: `✅ @${quotedJid.split("@")[0]} rebaixado!` }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro: ${err.message}` }, { quoted: msg });
    }
}
module.exports = { rebaixar };
