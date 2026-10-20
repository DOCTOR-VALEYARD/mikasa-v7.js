
/* =================================================
   📨 LINK DE CONVITE DO GRUPO
   📁 Arquivo: convite.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
================================================= */

const config = require("../../config");
const { isAdmin } = require("../grupo/grupo"); // ✅ Usa função que já existe para verificar permissão

async function convite(sock, msg, args) {
    const from = msg.key.remoteJid;
    const remetente = msg.key.participant || from;
    const isGroup = from.endsWith("@g.us");

    // ❌ SÓ FUNCIONA DENTRO DE GRUPO
    if (!isGroup) {
        return sock.sendMessage(from, {
            text: `╭━🚫━━━━━━━━━━━━━━━━🚫━╮
    ❌ COMANDO RESTRITO
╰━🚫━━━━━━━━━━━━━━━━🚫━╯

📨 Esse recurso só pode ser
utilizado dentro de grupos!

🤖 ${config.BOT_NAME}`
        }, { quoted: msg });
    }

    // ⛔ SOMENTE ADMINISTRADORES PODEM PEGAR O LINK
    if (!await isAdmin(sock, from, remetente)) {
        return sock.sendMessage(from, {
            text: `╭━⚠️━━━━━━━━━━━━━━━━⚠️━╮
     🛑 PERMISSÃO NEGADA
╰━⚠️━━━━━━━━━━━━━━━━⚠️━╯

📨 Apenas administradores do
grupo podem solicitar o link
de convite para novos membros!

👤 Solicitante: @${remetente.split("@")[0]}
🤖 ${config.BOT_NAME}`
        }, { quoted: msg, mentions: [remetente] });
    }

    try {
        // 📋 PEGA DADOS E CÓDIGO DO GRUPO
        const dadosGrupo = await sock.groupMetadata(from);
        const codigoConvite = await sock.groupInviteCode(from);

        // ✅ MENSAGEM COM PADRÃO VISUAL DO SISTEMA
        const mensagemConvite = `╭━📨━━━━━━━━━━━━━━━━━━━━📨━╮
      📎 LINK DE CONVITE
╰━📨━━━━━━━━━━━━━━━━━━━━📨━╯

📛 *NOME DO GRUPO:*
${dadosGrupo.subject}

👥 *TOTAL DE PARTICIPANTES:*
${dadosGrupo.participants.length} membros

╭━🔗━━━━━━━━━━━━━━━━━━━━🔗━╮
🔗 *ACESSO DIRETO:*
https://chat.whatsapp.com/${codigoConvite}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💡 *Aviso:* Guarde esse link com cuidado,
ele dá acesso direto a quem receber!

👤 Gerado por: @${remetente.split("@")[0]}
🤖 ${config.BOT_NAME} • SEGURANÇA E FACILIDADE ✨`;

        await sock.sendMessage(from, {
            text: mensagemConvite,
            mentions: [remetente]
        }, { quoted: msg });

    } catch (erro) {
        console.error("[CONVITE] Erro ao gerar link:", erro.message);
        await sock.sendMessage(from, {
            text: `╭━❌━━━━━━━━━━━━━━━━❌━╮
    ⚠️ NÃO FOI POSSÍVEL GERAR
╰━❌━━━━━━━━━━━━━━━━❌━╯

📨 Verifique se eu tenho permissão
de administrador dentro do grupo!
Sem esse cargo não consigo acessar
ou criar o link de convite.

🤖 ${config.BOT_NAME}`
        }, { quoted: msg });
    }
}

module.exports = { convite };
