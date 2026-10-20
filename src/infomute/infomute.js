const config = require("../../config");
async function infomute(sock, msg) {
    const from = msg.key.remoteJid;
    const resp = `
╭─「 🔇 *INFO MUTE* 」
│
│ 🔕 Usuário silenciado:
│ • Não pode enviar mensagens
│ • Não pode reações
│ • Permanece no grupo
│
│ ⏱️ Duração: Até ser desmutado
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { infomute };
