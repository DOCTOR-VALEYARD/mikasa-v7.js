
const config = require("../../config");

async function sortear(sock, msg, args) {
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');

    const fullArgs = args.join(' ');

    // CASO 1: Sortear entre opções separadas por vírgula
    if (fullArgs.includes(',')) {
        const options = fullArgs.split(',').map(opt => opt.trim()).filter(opt => opt.length > 0);
        if (options.length < 2) {
            return sock.sendMessage(remoteJid, { text: `Forneça pelo menos duas opções separadas por vírgula.\nEx: ${config.PREFIX}sortear Opção A, Opção B` }, { quoted: msg });
        }
        const winner = options[Math.floor(Math.random() * options.length)];
        return sock.sendMessage(remoteJid, { text: `🎲 Analisando as opções... A escolha sorteada foi:\n\n🎉 *${winner}* 🎉` }, { quoted: msg });
    }

    // CASO 2: Sortear membro do grupo
    if (!isGroup) {
        return sock.sendMessage(remoteJid, { text: "Para sortear um membro, você precisa estar em um grupo." }, { quoted: msg });
    }

    try {
        const metadata = await sock.groupMetadata(remoteJid);
        const participants = metadata.participants;
        const winner = participants[Math.floor(Math.random() * participants.length)];

        let contextText = "para a tarefa misteriosa";
        if (fullArgs.length > 0) contextText = `para *${fullArgs}*`;

        await sock.sendMessage(remoteJid, {
            text: `🥁 Rufe os tambores... O sorteado ${contextText} foi:\n\n🏆 @${winner.id.split('@')[0]} 🏆`,
            mentions: [winner.id]
        }, { quoted: msg });

    } catch (error) {
        console.error("Erro ao sortear membro:", error);
        await sock.sendMessage(remoteJid, { text: "❌ Ocorreu um erro ao tentar sortear um membro do grupo." }, { quoted: msg });
    }
}

module.exports = { sortear };
