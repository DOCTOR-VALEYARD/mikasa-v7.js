// src/reacao-sistema.js - SISTEMA DE REAÇÕES ALEATÓRIAS
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/botconfig.json");

function lerDB() {
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        return {
            EMOJIS_REACAO: [
                "👍", "❤️", "😂", "🤔", "👏", "🎉", "🔥", "✨", 
                "💯", "🌟", "😍", "🚀", "⭐", "💪", "🎊", "👌",
                "🌸", "💖", "😎", "🤩"
            ],
            REACAO_ATIVA: true
        };
    }
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function salvarDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

async function adicionarReacao(sock, msg) {
    try {
        const db = lerDB();
        
        // Se reações estão desativadas, não faz nada
        if (db.REACAO_ATIVA === false) {
            return;
        }
        
        // Pega a lista de emojis
        const emojis = db.EMOJIS_REACAO || [
            "👍", "❤️", "😂", "🤔", "👏", "🎉", "🔥", "✨", 
            "💯", "🌟", "😍", "🚀", "⭐", "💪", "🎊", "👌",
            "🌸", "💖", "😎", "🤩"
        ];
        
        // Escolhe um emoji aleatório
        const emojiAleatorio = emojis[Math.floor(Math.random() * emojis.length)];
        
        // Adiciona reação à mensagem
        await sock.sendMessage(msg.key.remoteJid, 
            { react: { text: emojiAleatorio, key: msg.key } }
        );
        
    } catch (error) {
        console.log("Erro ao adicionar reação:", error.message);
    }
}

function obterEmojis() {
    const db = lerDB();
    return db.EMOJIS_REACAO || [
        "👍", "❤️", "😂", "🤔", "👏", "🎉", "🔥", "✨", 
        "💯", "🌟", "😍", "🚀", "⭐", "💪", "🎊", "👌",
        "🌸", "💖", "😎", "🤩"
    ];
}

function estaAtiva() {
    const db = lerDB();
    return db.REACAO_ATIVA !== false;
}

module.exports = { adicionarReacao, obterEmojis, estaAtiva, lerDB, salvarDB };
