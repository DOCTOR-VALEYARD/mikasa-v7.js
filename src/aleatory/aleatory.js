const config = require("../../config");
async function aleatory(sock, msg) {
    const from = msg.key.remoteJid;
    const numero = Math.floor(Math.random() * 100) + 1;
    const resp = `
╭─┅┄『 🎲 *ALEATÓRIO* 』 
│ 『 🎯 』 Número: ${numero}
│ 『 📊 』 Intervalo: 1-100
│ 『 ✅ 』 Resultado aleatório
╰─┅┄『 ✦ Mikasa sharman 』`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { aleatory };
