// Menu GOLD — 1 botão só (VER TUDO) com card próprio. Ver src/menu-unico.
async function menugold(sock, msg) {
    return require("../menu-unico/menu-unico").abrirMenu(sock, msg.key.remoteJid, msg, "gold");
}
module.exports = { menugold };
