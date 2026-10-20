// src/menuadm.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");


// ═══════════════════════════════════════════════════════════════
// 🛡️ MENU ADMINISTRATIVO
// ═══════════════════════════════════════════════════════════════

async function menuadm(sock, msg) {

    const from =
        msg?.key?.remoteJid;

    if (!from) {
        return;
    }


    // 🔐 Somente administradores podem abrir o painel administrativo.
    try {
        const meta = await sock.groupMetadata(from);
        const autor = msg.key.participant || msg.key.remoteJid;
        const admin = meta.participants.some(p => (p.id === autor || p.lid === autor) && p.admin);
        if (!admin) return sock.sendMessage(from, { text: "❌ O menu administrativo é exclusivo para administradores." }, { quoted: msg });
    } catch {
        return sock.sendMessage(from, { text: "❌ Não consegui verificar sua permissão de administrador." }, { quoted: msg });
    }

    return require("../menu-unico/menu-unico").abrirMenu(sock, from, msg, "admin");
}

module.exports = {
    menuadm
};