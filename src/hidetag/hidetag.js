
const config = require("../../config");
const { isAdmin } = require("../grupo/grupo"); // ✅ Importa verificação que já existe no seu sistema

async function hidetag(sock, msg, args) {
    // ✅ PROTEÇÃO: garante que args sempre seja um array
    args = args || [];

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const dataAtual = new Date().toLocaleString("pt-BR");
    let ambiente = "Privado";
    if (isGroup) ambiente = `Grupo`;


    // ❌ SÓ FUNCIONA EM GRUPO
    if (!isGroup) {
        return await sock.sendMessage(from, { 
            text: `
╭─「 ❌ AVISO 」
│ 📅 ${dataAtual}
╰─
│ Esse comando funciona *APENAS EM GRUPOS*!
│
├────────────────────
│ By | ${config.OWNER_NAME}
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
        }, { quoted: msg });
    }


    // 🔒 VERIFICA SE QUEM MANDOU É ADMIN (IGUAL REGRAS DO SEU BOT)
    if (!await isAdmin(sock, from, sender)) {
        return await sock.sendMessage(from, { 
            text: `
╭─「 ⛔ PERMISSÃO NEGADA 」
│ 📅 ${dataAtual}
╰─
│ Apenas *ADMINISTRADORES* podem usar!
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
        }, { quoted: msg });
    }


    try {
        // 📋 PEGA TODOS OS MEMBROS
        const groupMetadata = await sock.groupMetadata(from);
        const membros = groupMetadata.participants.map(p => p.id);
        
        // 💬 TEXTO DA MENSAGEM — PADRÃO SE NÃO ESCREVER NADA
        const texto = args.join(" ").trim() || "📢 Mensagem oculta para todos os participantes";


        // ✅ ENVIA COM MARCAÇÕES INVISÍVEIS
        await sock.sendMessage(from, { 
            text: texto, 
            mentions: membros 
        }, { quoted: msg });


    } catch (err) {
        console.log("⚠️ Erro no hidetag:", err.message);
        await sock.sendMessage(from, { 
            text: `
╭─「 ❌ FALHA AO ENVIAR 」
│ 📅 ${dataAtual}
╰─
│ Motivo: ${err.message}
│
├────────────────────
│ Verifique minhas permissões!
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
        }, { quoted: msg });
    }
}

module.exports = { hidetag };
