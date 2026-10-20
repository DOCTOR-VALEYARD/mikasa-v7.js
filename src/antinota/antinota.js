const fs = require("fs");
const path = require("path");
const dbPath = path.join(__dirname, "../../database/antinota.json");

function lerDB() {
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function salvarDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function antinota(sock, msg, args) {
    const from = msg.key.remoteJid;
    const db = lerDB();
    const estado = !db[from];
    db[from] = estado;
    salvarDB(db);
    const resp = estado ? `✅ Anti-nota ATIVADO` : `❌ Anti-nota DESATIVADO`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { antinota };
