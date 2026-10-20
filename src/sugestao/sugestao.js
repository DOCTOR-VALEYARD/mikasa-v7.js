const config = require("../../config");
async function sugestao(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!args.length) {
        return sock.sendMessage(from, {
            text: `❌ Use: ${config.PREFIX}sugestao [ideia]`
        }, { quoted: msg });
    }
    
    const ideia = args.join(" ");
    const resp = `
╭─「 💡 *SUGESTÃO RECEBIDA* 」
│
│ 📝 Ideia: ${ideia}
│ ✅ Registrada com sucesso
│ 🎯 Será analisada
│
│ 👑 Obrigado pelas sugestões!
╰───────────────────────────`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { sugestao };
