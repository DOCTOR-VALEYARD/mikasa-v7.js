const config = require("../../config");
async function infoadv(sock, msg) {
    const from = msg.key.remoteJid;
    const resp = `
╭─「 ⚠️ *INFO ADVERTÊNCIA* 」
│
│ 📌 Como funciona:
│ • 1ª advertência: aviso
│ • 2ª advertência: mute
│ • 3ª advertência: ban
│
│ 💡 Comando: ${config.PREFIX}aviso @user
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { infoadv };
