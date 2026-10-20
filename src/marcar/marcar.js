// src/marcar.js - MARCA TODOS OS MEMBROS DO GRUPO
const config = require("../../config");
const fs = require("fs");
const path = require("path");

async function marcar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");

    // 🚫 SÓ FUNCIONA EM GRUPO
    if (!isGroup) {
        const aviso = `
╭─── ❀ ───╮
⚠️ MARCAR TODOS ⚠️
╰─── ❀ ───╯

❌ Este comando só pode ser utilizado
dentro de grupos de conversa!

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }

    try {
        // ✅ PEGA DADOS COMPLETOS DO GRUPO
        const groupMetadata = await sock.groupMetadata(from);
        const membros = groupMetadata.participants.map(p => p.id);
        const totalMembros = membros.length;

        // ✅ MENSAGEM PERSONALIZADA OU PADRÃO
        const mensagemBase = args.length > 0 ? args.join(" ") : "📣 ATENÇÃO A TODOS OS MEMBROS!";

        // ✅ CONSTRÓI O TEXTO COM AS MENÇÕES — AGORA ORGANIZADO POR LINHA
        let textoFinal = `
╭─── ❀ ───╮
📣 MARCAÇÃO GERAL 📣
╰─── ❀ ───╯

💬 MENSAGEM:
${mensagemBase}

👥 TOTAL DE PESSOAS: ${totalMembros}

❀ 🔔 LISTA DE MARCAÇÕES ❀
`;

        // ✅ AQUI É A MUDANÇA PRINCIPAL: CADA UM EM LINHA NOVA COM SÍMBOLO
        const limite = Math.min(membros.length, 150); // Limite seguro
        for (let i = 0; i < limite; i++) {
            textoFinal += `✧ @${membros[i].split("@")[0]}\n`; 
            // ✧ = símbolo separador, \n = pula linha
        }

        if (totalMembros > limite) {
            textoFinal += `
✂️ *Aviso:* Grupo muito grande — 
apenas os primeiros foram marcados!`;
        }

        textoFinal += `

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;

        // ✅ ENVIA COM MENÇÕES REAIS FUNCIONANDO
        await sock.sendMessage(from, {
            text: textoFinal,
            mentions: membros // continua enviando a lista completa para o WhatsApp reconhecer
        }, { quoted: msg });


    } catch (err) {
        console.error("Erro Marcar:", err);
        const erroMsg = `
╭─── ❀ ───╮
❌ FALHA NA AÇÃO ❌
╰─── ❀ ───╯

❀ Não consegui realizar a marcação!
❀ Motivo: ${err.message}

💡 Verifique minhas permissões no grupo.

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        await sock.sendMessage(from, { text: erroMsg }, { quoted: msg });
    }
}

module.exports = { marcar };

