// src/registrar.js - REGISTRAR USUÁRIO COM BANCO DE DADOS
const fs = require("fs");
const path = require("path");
const config = require("../../config");

// Banco de dados de usuários
const dbPath = path.join(__dirname, "../../database/usuarios.json");

function lerDB() {
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function salvarDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function registrar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const db = lerDB();

    if (db[userId]) {
        return sock.sendMessage(from, {
            text: `❌ Você já está registrado! Use ${config.PREFIX}perfil para ver seus dados.`
        }, { quoted: msg });
    }

    if (!args.length) {
        return sock.sendMessage(from, {
            text: `❌ Use: ${config.PREFIX}registrar [nome]\n\nExemplo: ${config.PREFIX}registrar João`
        }, { quoted: msg });
    }

    const nome = args.join(" ");
    const novoUsuario = {
        id: userId,
        nome: nome,
        nivel: 1,
        exp: 0,
        gold: 100,
        dataRegistro: new Date().toLocaleDateString("pt-BR"),
        ultimaAtividade: new Date().toLocaleTimeString("pt-BR")
    };

    db[userId] = novoUsuario;
    salvarDB(db);

    const resposta = `
╭─「 ✅ *REGISTRO SUCESSO* 」
│ 👤 Nome: ${nome}
│ 🎖️ Nível: 1
│ ⭐ EXP: 0
│ 💰 Gold: 100
│ 📅 Data: ${novoUsuario.dataRegistro}
╰───────────────────────────

Parabéns! Você foi registrado com sucesso!
Use ${config.PREFIX}perfil para ver seus dados.
`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { registrar };
