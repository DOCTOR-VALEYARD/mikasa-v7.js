const fs = require('fs');
const path = require('path');

// =================================================================
// 🎯 CAMINHO DO BANCO DE DADOS - SINCRONIZADO
// =================================================================
// 🔧 CORRIGIDO: o comentário já dizia "mesmo banco que o level.js", mas
// o caminho estava errado (apontava pra database.json, que nunca existe).
// Agora aponta de verdade pro banco real.
const dbPath = path.join(__dirname, "../../database/usuarios.json");

// Função para carregar o banco de dados
function loadDB() {
    if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        return data ? JSON.parse(data) : {};
    }
    return {}; // Retorna um objeto vazio se o arquivo não existir
}

// Função para normalizar o ID do usuário (ex: 5511999999999)
function normalize(id) {
    return id ? id.split('@')[0] : '';
}

// =================================================================
// 🚀 FUNÇÃO PRINCIPAL DO COMANDO /PERFIL
// =================================================================
async function saldo(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    // --- Lógica para identificar o alvo do comando ---
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const quotedJid = msg.message?.extendedTextMessage?.contextInfo?.participant;
    
    let targetJid;
    if (mentionedJid) {
        targetJid = mentionedJid; // Prioridade 1: Usuário mencionado
    } else if (quotedJid) {
        targetJid = quotedJid;   // Prioridade 2: Usuário respondido
    } else {
        targetJid = sender;      // Padrão: O próprio usuário que enviou o comando
    }

    const db = loadDB();
    const userData = db[targetJid]; // Busca os dados do alvo no DB

    // Se o usuário alvo não for encontrado no banco de dados
    if (!userData) {
        const targetName = normalize(targetJid);
        return sock.sendMessage(from, { 
            text: `😕 Não encontrei um perfil para @${targetName}. Esta pessoa provavelmente ainda não interagiu no grupo.`,
            mentions: [targetJid]
        }, { quoted: msg });
    }

    // --- Monta a mensagem de perfil ---
    const xpToNextLevel = require("../level/level").xpNecessario(userData.nivel || 1);
    const userName = userData.nome || userData.pushName || 'Viajante';

    const profileMessage = `
╭─「 ✨ *PERFIL DE AVENTUREIRO* ✨ 」
│
│  👤 *Nome:* ${userName}
│  🌟 *Nível:* ${userData.nivel || 1}
│  ⚡ *XP:* ${userData.xp || 0} / ${xpToNextLevel}
│  💰 *Ouro:* ${userData.ouro || 0}
│
╰───────────────────
    `.trim();

    // Envia a mensagem mencionando o usuário alvo
    await sock.sendMessage(from, {
        text: profileMessage,
        mentions: [targetJid]
    }, { quoted: msg });
}

module.exports = { saldo };

