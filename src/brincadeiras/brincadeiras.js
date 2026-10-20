// BRINCADEIRAS — 1 botão só (VER TUDO): ligar/desligar + todos os comandos. Ver src/menu-unico.
async function brincadeiras(sock, msg) {
    return require('../menu-unico/menu-unico').abrirMenu(sock, msg.key.remoteJid, msg, 'brincadeiras');
}
module.exports = { brincadeiras };
