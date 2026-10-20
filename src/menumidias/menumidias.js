/* MENU DE MÍDIAS — 1 botão só (VER TUDO) com card próprio. Ver src/menu-unico. */
async function menumidias(sock, msg) {
    const from = msg?.key?.remoteJid;
    if (!from) return;
    return require("../menu-unico/menu-unico").abrirMenu(sock, from, msg, "midias");
}

module.exports = { menumidias };
