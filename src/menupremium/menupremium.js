// Menu PREMIUM — 1 botão só (VER TUDO) com card próprio. Ver src/menu-unico.
async function menupremium(sock, msg) {
    return require("../menu-unico/menu-unico").abrirMenu(sock, msg.key.remoteJid, msg, "premium");
}
module.exports = { menupremium };
