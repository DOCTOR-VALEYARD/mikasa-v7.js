// 🔓 ABRIR O GRUPO — todo mundo volta a poder falar.
// A resposta sai no formato padrão do bot (card com botão), sem texto solto pra copiar.
const config = require("../../config");

async function responder(sock, from, msg, titulo, linhas, mentions) {
    try {
        const { enviarMensagemPadrao } = require("../menuBotoes/menuBotoes");
        return await enviarMensagemPadrao(sock, from, { titulo, linhas, quoted: msg, mentions });
    } catch {
        return sock.sendMessage(from, { text: `『 ✦ 』${titulo}『 ✦ 』\n${[].concat(linhas).join("\n")}`, mentions }, { quoted: msg });
    }
}

async function abrir(sock, msg, args) {
    const from = msg.key.remoteJid;
    const autor = msg.key.participant || msg.key.participantAlt;
    const mentions = autor ? [autor] : [];
    const quem = autor ? `@${String(autor).split("@")[0]}` : "um administrador";

    if (!from.endsWith("@g.us")) {
        return responder(sock, from, msg, " ⚠️ SÓ EM GRUPOS ", ["Esse comando funciona apenas dentro de grupos."], []);
    }
    try {
        await sock.groupSettingUpdate(from, "not_announcement");
        return responder(sock, from, msg, " 🔓 GRUPO ABERTO ", [
            "Todos os membros já podem enviar mensagens.",
            `Aberto por ${quem}.`
        ], mentions);
    } catch (err) {
        const semPermissao = /not-authorized|forbidden|403|admin/i.test(String(err?.message || err));
        return responder(sock, from, msg, " ❌ NÃO CONSEGUI ABRIR ", [
            semPermissao ? "Preciso ser administrador do grupo para abrir." : `Algo deu errado: ${err?.message || err}`
        ], []);
    }
}
module.exports = { abrir };
