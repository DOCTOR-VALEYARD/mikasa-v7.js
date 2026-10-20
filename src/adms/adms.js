// src/adms.js - LISTAR ADMINISTRADORES DO GRUPO
const config = require("../../config");

async function adms(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = msg.key.remoteJid.endsWith("@g.us");
    
    if (!isGroup) {
        return sock.sendMessage(from, { text: `❌ Use em um grupo!` }, { quoted: msg });
    }

    try {
        const groupMetadata = await sock.groupMetadata(from);
        const admins = groupMetadata.participants.filter(p => p.admin);

        if (admins.length === 0) {
            return sock.sendMessage(from, { text: `❌ Nenhum admin no grupo!` }, { quoted: msg });
        }

        let mensagem = `╭─「 👮 *ADMINISTRADORES* 」\n`;
        admins.forEach((admin, i) => {
            mensagem += `│ ${i + 1}. @${admin.id.split("@")[0]}\n`;
        });
        mensagem += `╰───────────────────────────`;

        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: `❌ Erro: ${err.message}` }, { quoted: msg });
    }
}

module.exports = { adms };
