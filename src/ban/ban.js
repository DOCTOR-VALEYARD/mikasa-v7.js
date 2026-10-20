
/* =================================================
   🚫 COMANDO BANIR — MODERAÇÃO
   📁 Arquivo: ban.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */

const config = require("../../config");
const { registrarRemocao } = require("../comandos-solicitados/comandos-solicitados");

async function ban(sock, msg, args) {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    
    // ❌ SÓ FUNCIONA EM GRUPO
    if (!isGroup) {
        return sock.sendMessage(from, {
            text: `❌ *ERRO!*\nEste comando só pode ser utilizado dentro de grupos!`
        }, { quoted: msg });
    }

    // ✅ VERIFICA PERMISSÕES DE ADMINISTRADOR
    try {
        const grupoDados = await sock.groupMetadata(from);
        const usuarioInfo = grupoDados.participants.find(p => p.id === sender);
        
        if (!usuarioInfo || !usuarioInfo.admin) {
            return sock.sendMessage(from, {
                text: `
┅『 🚫 *ACESSO NEGADO* 』┄┅
Apenas administradores podem usar este comando. 😏✋
┅┄┅┄『 ✦ 』┄┅┄┅┄`
            }, { quoted: msg });
        }
    } catch (erro) {
        return sock.sendMessage(from, { 
            text: `⚠️ *Falha ao carregar dados do grupo.*\nTente novamente em instantes.` 
        }, { quoted: msg });
    }

    // ❌ PRECISA RESPONDER A MENSAGEM
    if (!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        return sock.sendMessage(from, {
            text: `📝 *COMO USAR:*\nResponda diretamente à mensagem da pessoa que deseja remover!\n\n💡 Exemplo:\n${config.PREFIX}ban [motivo opcional]`
        }, { quoted: msg });
    }

    const usuarioAlvo = msg.message.extendedTextMessage.contextInfo.participant;
    const motivo = args.length > 0 ? args.join(" ") : "Moderação geral do grupo";

    // ⚠️ NÃO DEIXA BANIR ADMIN DO BOT OU O PRÓPRIO BOT
    const botId = sock.user?.id || "";
    const donoSistema = config.DONO_NUMERO + "@s.whatsapp.net";
    
    if (usuarioAlvo === botId) {
        return sock.sendMessage(from, { 
            text: `
『 😤 TENTOU ME BANIR?! 』 
> NÃO VAI ACONTECER NÃO! 
> Eu sou essencial por aqui, entenda logo!
┅┄┅┄『 ✦ 』┄┅┄┅┄` 
        }, { quoted: msg });
    }
    
    if (usuarioAlvo === donoSistema) {
        return sock.sendMessage(from, { 
            text: `👑 *IMPOSSÍVEL!*\nVocê não tem autoridade para remover o criador do sistema. 🚫👑` 
        }, { quoted: msg });
    }

    try {
        // ✅ EXECUTA A REMOÇÃO
        await sock.groupParticipantsUpdate(from, [usuarioAlvo], "remove");
        registrarRemocao(from, usuarioAlvo, sender, motivo);
        
        // ✅ MENSAGEM PADRÃO DO SISTEMA
        const textoFinal = `
┅┄┅┄『 🙋  』
⚠️ USUÁRIO BANIDO ⚠️
┅┄┅┄『 🙋  』

┅┄┅┄『 👤: 』 *Pessoa Removida:* @${usuarioAlvo.split("@")[0]}
👮 *Responsável:* @${sender.split("@")[0]}
📄 *Motivo:* ${motivo}

💨 Acesso revogado permanentemente!
✨ *${config.BOT_NAME} — Controle Total* ✨`;

        await sock.sendMessage(from, { 
            text: textoFinal,
            mentions: [usuarioAlvo, sender] // Marca automaticamente
        }, { quoted: msg });

    } catch (erro) {
        return sock.sendMessage(from, { 
            text: `❌ *ERRO AO EXECUTAR:*\nVerifique se eu sou administrador e tenho permissão para remover membros!\n\nDetalhe: ${erro.message}` 
        }, { quoted: msg });
    }
}

module.exports = { ban };
