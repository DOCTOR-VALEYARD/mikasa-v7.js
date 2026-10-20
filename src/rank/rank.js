// src/rank.js - VER RANKING DO BANCO DE DADOS
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/usuarios.json");

function lerDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

async function rank(sock, msg, args) {
    const from = msg.key.remoteJid;
    const db = lerDB();
    const usuarios = Object.values(db).sort((a, b) => (b.nivel || 0) - (a.nivel || 0) || (b.xp || 0) - (a.xp || 0));

    if (usuarios.length === 0) {
        return sock.sendMessage(from, { text: `❌ Nenhum usuário registrado ainda!` }, { quoted: msg });
    }

    let ranking = `╭─「 🏆 *RANKING* 」\n`;
    usuarios.slice(0, 10).forEach((user, i) => {
        ranking += `│ ${i + 1}º 👤 ${user.nome || "?"}\n`;
        ranking += `│    Nível: ${user.nivel || 1} | Ouro: ${user.ouro || 0}\n`;
    });
    ranking += `┅┄┅┄『 ✦ 』┄┅┄┅┄`;

    await sock.sendMessage(from, { text: ranking }, { quoted: msg });
}

module.exports = { rank };
