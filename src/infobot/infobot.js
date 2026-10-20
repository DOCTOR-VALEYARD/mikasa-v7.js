// src/infobot.js - INFO DO BOT PUXANDO DA CONFIG
const config = require("../../config");
const { extrairComandosDoBot, enviarNativeFlow, botaoUrl, obterLinkCanalConfig } = require("../menuBotoes/menuBotoes");

async function infobot(sock, msg) {
    const from = msg.key.remoteJid;

    const totalComandos = extrairComandosDoBot().length;
    const uptimeSeg = Math.floor(process.uptime());
    const horas = Math.floor(uptimeSeg / 3600);
    const minutos = Math.floor((uptimeSeg % 3600) / 60);
    const uptime = horas > 0 ? `${horas}h ${minutos}min` : `${minutos}min`;

    const resp = `『 ✦ 』${config.BOT_NAME}『 ✦ 』

『 👑 IDENTIDADE 』
> 📛 Nome: *${config.BOT_NAME}*
> 👑 Criador: *${config.OWNER_NAME}*
> 📞 Contato: *${config.OWNER_NUMBER}*
> 📌 Prefixo: *${config.PREFIX}*
> 📊 Versão: *${config.VERSION}*

『 💻 TECNOLOGIA 』
> ⚙️ Linguagem: Node.js
> 📡 Framework: Baileys
> 🟢 Status: Online

『 ⚡ SISTEMA 』
> 🎯 Comandos disponíveis: *${totalComandos}+*
> ⏱️ Rodando há: *${uptime}*
> 🌟 Tudo funcionando normalmente

『 ✦ 』 ${config.BOT_NAME} 『 ✦ 』`;

    const canal = obterLinkCanalConfig();
    if (canal) {
        return enviarNativeFlow(sock, from, {
            text: resp,
            footer: config.BOT_NAME || "Mikasa Bot",
            quoted: msg,
            buttons: [botaoUrl("📢 ENTRAR NO CANAL", canal)]
        });
    }
    return sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { infobot };
