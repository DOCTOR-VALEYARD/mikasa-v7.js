const { loadDB, saveDB } = require('../level/level'); // Reutiliza as funções do level.js

async function gastar(sock, msg, args) {
    const userId = msg.key.participant || msg.key.remoteJid;
    const remoteJid = msg.key.remoteJid;
    const db = loadDB();

    // Verifica se o usuário existe no banco de dados
    if (!db[userId] || db[userId].ouro <= 0) {
        return sock.sendMessage(remoteJid, { text: "Você não tem Ouro para gastar. Converse mais no grupo pra ganhar!" }, { quoted: msg });
    }

    const ouroGasto = db[userId].ouro;
    db[userId].ouro = 0; // Zera o ouro do usuário
    saveDB(db);

    const message = `💸 *OSTENTAÇÃO!* 💸\n\n@${userId.split('@')[0]} gastou todo o seu dinheiro, um total de *${ouroGasto} de Ouro*, em uma festa lendária! Agora você está zerado, mas com boas histórias para contar.`;

    await sock.sendMessage(remoteJid, {
        text: message,
        mentions: [userId]
    }, { quoted: msg });
}

module.exports = { gastar };

