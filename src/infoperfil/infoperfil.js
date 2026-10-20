/* =================================================
   👤 INFORMAÇÕES DO SISTEMA DE PERFIL
   📁 Arquivo: infoperfil.js
  
   ================================================= */

const config = require("../../config");

async function infoperfil(sock, msg) {
    const from = msg.key.remoteJid;

    const resposta = `╭━👤━━━━━━━━━━━━━━━━━👤━╮
     📊 COMO FUNCIONA SEU PERFIL
╰━👤━━━━━━━━━━━━━━━━━👤━╯

📌 *Dados armazenados e exibidos:*
🔸 Nome de cadastro
🔖 Código de identificação
🎖️ Nível atual do jogador
📊 Barra e porcentagem de Progresso
⭐ Quantidade de Experiência (EXP)
💰 Saldo de Moedas Gold 🪙
📅 Data em que se registrou
⏱️ Última atividade no sistema

📈 *Avaliações especiais do sistema:*
🐂 Nível de Gado
💍 Grau de Fidelidade
💅 Padrão de Beleza

💡 *Para ver tudo isso:*
Apenas digite: ${config.PREFIX}perfil
Ou RESPONDA a mensagem de alguém para ver O PERFIL DELA!

✨ * Sistema de Evolução* ✨`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { infoperfil };

