const config = require("../../config");
async function moedas(sock, msg) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const saldo = Math.floor(Math.random() * 1000);
    const resp = `
┅┄┅┄『 ✦ 』💰 *MOEDAS* 
┅┄┅┄『 ✦ 』💵 Saldo: ${saldo} Gold
┅┄┅┄『 ✦ 』📊 Status: Ativo
┅┄┅┄『 ✦ 』🎁 Bônus: 0
💡 Use ${config.PREFIX}loja
┅┄┅┄『 ✦ 』┄┅┄┅┄`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { moedas };
