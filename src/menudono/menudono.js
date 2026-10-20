// src/menudono.js — agora 1 botão só (VER TUDO) com card próprio. Ver src/menu-unico.
async function menudono(sock, msg) {
    return require("../menu-unico/menu-unico").abrirMenu(sock, msg.key.remoteJid, msg, "dono");
}

module.exports = { menudono };
