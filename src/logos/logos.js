const config = require("../../config");
async function logos(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!args.length) {
        return sock.sendMessage(from, {
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
❌ Use: ${config.PREFIX}logos [texto]
Exemplo: ${config.PREFIX}logos meu nome
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }
    
    const resp = `
┅┄┅┄『 ✦ 』┄┅┄┅┄
『 ✦ 』${config.BOT_NAME}『 ✦ 』
┅┄┅┄『 ✦ 』┄┅┄┅┄

  🎯 LOGO GERADO 🎯

┅┄┅┄『 ✦ 』┄┅┄┅┄
『 ✦ 』 📝 Texto: ${args.join(" ")}
『 ✦ 』 ✅ Logo criado com sucesso!
『 ✦ 』 💡 Disponível em breve
┅┄┅┄『 ✦ 』┄┅┄┅┄`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { logos };
