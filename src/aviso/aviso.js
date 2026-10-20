const config = require("../../config");
async function aviso(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(from, { text: `❌ Responda à mensagem!` }, { quoted: msg });
    }
    const quotedJid = msg.message.extendedTextMessage.contextInfo.participant;
    const motivo = args.join(" ") || "Comportamento inadequado";
    const resp = `⚠️ AVISO para @${quotedJid.split("@")[0]}\n📝 Motivo: ${motivo}\n\n🚨 Próxima advertência será sanção!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { aviso };
