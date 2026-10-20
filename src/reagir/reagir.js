const config = require("../../config");
async function reagir(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(from, {
            text: `❌ Responda uma mensagem para reagir`
        }, { quoted: msg });
    }
    
    const reacoes = ["👍", "❤️", "😂", "😮", "😢", "🔥", "✨", "🎉"];
    const reacao = reacoes[Math.floor(Math.random() * reacoes.length)];
    
    await sock.sendMessage(from, { text: reacao }, { quoted: msg });
}
module.exports = { reagir };
