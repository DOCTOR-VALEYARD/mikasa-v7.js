const config = require("../../config");
async function inforegistrar(sock, msg) {
    const from = msg.key.remoteJid;
    const resp = `
╭─「 ℹ️ *INFO REGISTRO* 」
│
│ 📝 Como se registrar:
│ 1. Use ${config.PREFIX}registrar [seu nome]
│ 2. Aguarde confirmação
│ 3. Use ${config.PREFIX}perfil para ver
│
│ 💡 Dica: Use seu nome real
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { inforegistrar };
