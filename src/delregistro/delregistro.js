const fs = require("fs");
const path = require("path");
const dbPath = path.join(__dirname, "../../database/usuarios.json");

function lerDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function salvarDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function delregistro(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const db = lerDB();

    if (!db[userId]) {
        return sock.sendMessage(from, { text: `❌ Você não está registrado!` }, { quoted: msg });
    }

    delete db[userId];
    salvarDB(db);

    const resp = `✅ Seu registro foi deletado com sucesso!`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}
module.exports = { delregistro };
