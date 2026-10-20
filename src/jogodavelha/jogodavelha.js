const config = require("../../config");
async function jogodavelha(sock, msg, args) {
    const from = msg.key.remoteJid;
    const resp = `
╭─「 ⭕ *JOGO DA VELHA* 」
│
│ 🎮 Iniciando jogo...
│ 🔲 Tabuleiro pronto
│ 👥 Aguardando jogador
│
│ 💡 Responda com número (1-9)
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { jogodavelha };
