const config = require("../../config");
const fs = require('fs');
const path = require('path');

// ✅ GERENCIAMENTO DO BANCO — IGUAL DEMAIS SISTEMAS
const dbPath = path.join(__dirname, "../../database/usuarios.json"); // 🔧 CORRIGIDO: banco real de usuários

function loadDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(dados) {
    fs.writeFileSync(dbPath, JSON.stringify(dados, null, 2));
}

// ==============================================
// 🎰 FUNÇÃO PRINCIPAL DA ROLETA
// ==============================================
async function roleta(sock, msg, args) {
    args = args || []; // Proteção contra indefinido

    const userId = msg.key.participant || msg.key.remoteJid;
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const dataAtual = new Date().toLocaleString("pt-BR");
    const ambiente = isGroup ? "Grupo" : "Privado";

    const db = loadDB();

    // ⚠️ VERIFICA SE USUÁRIO ESTÁ NO SISTEMA
    if (!db[userId]) {
        return await sock.sendMessage(from, {
            text: `
╭─「 🎰 ROLETA 」
│ 📅 ${dataAtual}
╰─
│ Você ainda não está cadastrado!
│ Envie mensagens para ser adicionado 
│ ao sistema de níveis e moedas.
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
        }, { quoted: msg });
    }

    // 🎲 REGRAS DE SORTEIO: -50 ATÉ +100 GOLD
    const min = -50;
    const max = 100;
    const goldSorteado = Math.floor(Math.random() * (max - min + 1)) + min;

    // 💾 ATUALIZA SALDO NO BANCO
    db[userId].ouro = (db[userId].ouro || 0) + goldSorteado;
    saveDB(db);

    // ✨ MENSAGENS DE RESULTADO NO SEU ESTILO
    let mensagem;
    if (goldSorteado > 0) {
        mensagem = `
╭─「 🎰 ROLETA • GANHOU 🟢 」
│ 📅 ${dataAtual}
╰─
│ 🎯 Jogador: @${userId.split('@')[0]}
│ 💰 Resultado: + *${goldSorteado} Ouro*
│ 🥳 Parabéns! A sorte brilhou hoje!
│
├────────────────────
│ Saldo atualizado ✅
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`;
    } else if (goldSorteado < 0) {
        mensagem = `
╭─「 🎰 ROLETA • PERDEU 🔴 」
│ 📅 ${dataAtual}
╰─
│ 🎯 Jogador: @${userId.split('@')[0]}
│ 💸 Resultado: - *${Math.abs(goldSorteado)} Ouro*
│ 😣 Que azar temporário...
│ Mas continue tentando!
│
├────────────────────
│ Saldo atualizado ✅
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`;
    } else {
        mensagem = `
╭─「 🎰 ROLETA • NEUTRO ⚪ 」
│ 📅 ${dataAtual}
╰─
│ 🎯 Jogador: @${userId.split('@')[0]}
│ ➖ Resultado: Nada ganhou, nada perdeu
│ 😐 Foi por pouco!
│ Gire novamente para tentar a sorte.
│
├────────────────────
│ Saldo permaneceu igual ✅
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`;
    }

    // 📤 ENVIA COM MARCAÇÃO FUNCIONANDO
    await sock.sendMessage(from, { 
        text: mensagem, 
        mentions: [userId] 
    }, { quoted: msg });
}

module.exports = { roleta };

