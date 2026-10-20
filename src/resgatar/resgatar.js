const fs = require('fs');
const path = require('path');
const { addGold } = require('../level/level'); // Importa a função de adicionar gold

// =================================================================
// 💎 BANCO DE DADOS DE TOKENS (CÓDIGOS DE RESGATE)
// =================================================================
const tokensDBPath = path.join(__dirname, "../dados/tokens.json");

function loadTokensDB() {
    if (!fs.existsSync(tokensDBPath)) {
        // Se o arquivo não existe, criamos um com exemplos
        const exampleTokens = {
            "BRONZE-123-XYZ": { pacote: "bronze", usado_por: null },
            "PRATA-456-ABC": { pacote: "prata", usado_por: null },
            "OURO-789-DEF": { pacote: "ouro", usado_por: null },
            "DIAMANTE-000-MASTER": { pacote: "diamante", usado_por: null }
        };
        fs.writeFileSync(tokensDBPath, JSON.stringify(exampleTokens, null, 2));
        return exampleTokens;
    }
    return JSON.parse(fs.readFileSync(tokensDBPath, 'utf8'));
}

function saveTokensDB(data) {
    fs.writeFileSync(tokensDBPath, JSON.stringify(data, null, 2));
}

// =================================================================
// 🎁 PACOTES DE GOLD
// =================================================================
const PACOTES = {
    "bronze": { gold: 100, nome: "Pacote Bronze" },
    "prata": { gold: 500, nome: "Pacote Prata" },
    "ouro": { gold: 2000, nome: "Pacote Ouro" },
    "diamante": { gold: 10000, nome: "Pacote Diamante" }
};

// =================================================================
// 🚀 FUNÇÃO PRINCIPAL DE RESGATE
// =================================================================
async function resgatar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    const tokenDigitado = args[0];

    if (!tokenDigitado) {
        return sock.sendMessage(from, { text: "❌ Você precisa digitar o código do token para resgatar!\n\n*Exemplo:* `!resgatar CODIGO-SECRETO-123`" }, { quoted: msg });
    }

    const tokens = loadTokensDB();
    const tokenInfo = tokens[tokenDigitado];

    if (!tokenInfo) {
        return sock.sendMessage(from, { text: "❌ Token inválido ou não encontrado. Verifique se digitou corretamente." }, { quoted: msg });
    }

    if (tokenInfo.usado_por !== null) {
        const userIdQueUsou = tokenInfo.usado_por.split('@')[0];
        return sock.sendMessage(from, { text: `😥 Este token já foi resgatado pelo usuário @${userIdQueUsou}.`, mentions: [tokenInfo.usado_por] }, { quoted: msg });
    }

    const pacote = PACOTES[tokenInfo.pacote];
    if (!pacote) {
        return sock.sendMessage(from, { text: "❌ Erro interno: O pacote associado a este token não foi encontrado." }, { quoted: msg });
    }

    try {
        await addGold(sender, pacote.gold);
        tokenInfo.usado_por = sender;
        saveTokensDB(tokens);

        const successMessage = `🎉 *RESGATE BEM-SUCEDIDO!* 🎉\n\nVocê resgatou o *${pacote.nome}* e ganhou *${pacote.gold} de Gold*! 💰`;
        await sock.sendMessage(from, { text: successMessage }, { quoted: msg });

    } catch (error) {
        console.error("Erro ao resgatar token:", error);
        await sock.sendMessage(from, { text: "😥 Ocorreu um erro ao processar seu resgate. Tente novamente." }, { quoted: msg });
    }
}

module.exports = { resgatar };

