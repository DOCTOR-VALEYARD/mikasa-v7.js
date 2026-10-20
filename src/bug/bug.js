const config = require('../../config');

exports.bug = async function bug(sock, msg, args) {
    // ✅ PROTEÇÃO PRIMEIRO: SE NÃO VIER ARGS OU ESTIVER VAZIO, NÃO DEU ERRO
    if (!args || !Array.isArray(args) || !args.length) {
        try {
            return await sock.sendMessage(msg.key.remoteJid, {
                text: `╭━⚠️━━━━━━━━━━━━⚠️━╮
❌ *COMANDO INCOMPLETO!*
╰━━━━━━━━━━━━━━━━━━━╯
💡 Exemplo:
${config.PREFIX}bug O que aconteceu? O bot travou ao mandar áudio...`
            }, { quoted: msg });
        } catch { return; }
    }

    // ✅ SE TEM ARGUMENTOS, SEGUE NORMAL
    const from = msg.key.remoteJid;
    const descricao = args.join(" ").trim();
    const dataHora = new Date().toLocaleString("pt-BR");
    const nomeUsuario = msg.pushName || "Usuário sem nome";
    const idUsuario = msg.key.participant || msg.key.remoteJid;

    // ⚠️ COLOQUE AQUI O NÚMERO DO DONO PARA CHEGAR O AVISO
    const dono = "55SEUNUMEROAQUI@s.whatsapp.net"; 

    try {
        const avisoDono = `
╭━🐛━━━━━━━━━━━━━━━━━━━━━🐛━╮
📢 *NOVO RELATÓRIO DE BUG*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
👤 Usuário: ${nomeUsuario}
🆔 ID: ${idUsuario}
📅 Data/Hora: ${dataHora}
📍 Origem: ${from.endsWith("@g.us") ? "GRUPO" : "PRIVADO"}

📝 *DESCRIÇÃO:*
${descricao}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
🤖 • ${config.BOT_NAME}
`;

        // MENSAGEM PARA VOCÊ DONO
        await sock.sendMessage(dono, { text: avisoDono });

        // RESPOSTA PARA QUEM MANDOU
        await sock.sendMessage(from, {
            text: `╭━✅━━━━━━━━━━━━━━━━━━━✅━╮
🐛 *BUG ENVIADO COM SUCESSO!*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
Obrigado por ajudar a melhorar! 🛠️
Nossa equipe vai analisar em breve.

🤖 • ${config.BOT_NAME}
`
        }, { quoted: msg });

    } catch (erro) {
        console.log("❌ ERRO NO COMANDO BUG:", erro.message);
        try {
            await sock.sendMessage(from, {
                text: `╭━❌━━━━━━━━━━━━━━━━━━━❌━╮
⚠️ *NÃO FOI POSSÍVEL ENVIAR!*
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯
Tente novamente mais tarde. 📉`
            }, { quoted: msg });
        } catch {}
    }
};

