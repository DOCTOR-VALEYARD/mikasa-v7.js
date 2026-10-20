const config = require("../../config");
async function avalie(sock, msg, args) {
    const from = msg.key.remoteJid;
    const estrelas = args[0] || "5";
    const resp = `
╭─「 ⭐ *AVALIAÇÃO* 」
│
│ ⭐⭐⭐⭐⭐ ${estrelas}/5 estrelas
│ ✅ Sua avaliação foi registrada
│ 
│ 💖 Obrigado pelo feedback!
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { avalie };
