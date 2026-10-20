/* =================================================
   🎴 MIKASA BOT — ROUBAR FIGURINHA (salva mídia marcada com um nome)
   📁 Arquivo: roubar.js
   👑 DOCTOR VALEYARD

   Substitui o antigo ".addfigurinha": agora é o ".roubar" que marca uma
   figurinha/imagem/vídeo e salva com o nome escolhido, usando a mesma
   "caixinha" visual (┅┄┅┄『 ✦ 』) já usada no comando de música, pra
   deixar o visual do bot consistente em todo canto.
================================================= */

const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../../config");

async function roubar(sock, msg, args) {
    const from = msg.key.remoteJid;

    // ❌ SEM NOME
    if (!args || args.length < 1) {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 📝 *COMO USAR*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Marque (responda) uma figurinha,
imagem, vídeo ou GIF e digite:
┅┄┅┄『 ✦ 』┄┅┄┅┄
*${config.PREFIX}roubar nome_da_figurinha*
┅┄┅┄『 ✦ 』┄┅┄┅┄
💡 Aceita nomes com espaço!
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    const nome = args.join(" ").toLowerCase().trim();

    // 🔒 CARACTERES VÁLIDOS
    if (!/^[a-z0-9áàâãéèêíïóôõúüç ]+$/i.test(nome)) {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 ❌ *NOME INVÁLIDO*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Use apenas letras, números,
espaços e acentos.
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    // 📏 TAMANHO
    if (nome.length < 2 || nome.length > 30) {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 ⚠️ *TAMANHO INVÁLIDO*
┅┄┅┄『 ✦ 』┄┅┄┅┄
O nome precisa ter entre
2 e 30 caracteres.
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    // 📥 PRECISA ESTAR MARCANDO ALGO
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!quoted) {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 🎴 *NADA MARCADO*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Responda em cima de uma figurinha,
imagem, vídeo ou GIF pra roubar.
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    let stream, extensao;
    if (quoted.stickerMessage) {
        stream = await downloadContentFromMessage(quoted.stickerMessage, "sticker");
        extensao = ".webp";
    } else if (quoted.videoMessage) {
        stream = await downloadContentFromMessage(quoted.videoMessage, "video");
        extensao = ".mp4";
    } else if (quoted.imageMessage) {
        stream = await downloadContentFromMessage(quoted.imageMessage, "image");
        extensao = ".jpg";
    } else {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 ❌ *TIPO NÃO SUPORTADO*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Apenas: Imagem • Figurinha
Vídeo • GIF
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    let buffer = Buffer.from([]);
    try {
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    } catch (erro) {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 ⚠️ *FALHA AO BAIXAR*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Problema na conexão ou
arquivo muito grande.
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    const pasta = path.join(__dirname, "../midias/stickers");
    if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

    const caminhoCompleto = path.join(pasta, `${nome}${extensao}`);
    if (fs.existsSync(caminhoCompleto)) {
        return sock.sendMessage(from, {
            text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 ⚠️ *JÁ EXISTE*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Já tem uma figurinha salva
com o nome: *${nome}*
Escolha outro nome!
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }

    fs.writeFileSync(caminhoCompleto, buffer);

    await sock.sendMessage(from, {
        text:
`┅┄┅┄『 ✦ 』┄┅┄┅┄
 🎴 *FIGURINHA ROUBADA!*
┅┄┅┄『 ✦ 』┄┅┄┅┄
┅┄┅┄『 ✦ 』📛 Nome:
*${nome}*
┅┄┅┄『 ✦ 』💡 Pra usar:
digite *${nome}* a qualquer hora!
┅┄┅┄『 ✦ 』┄┅┄┅┄
▸ *${config.BOT_NAME}* • *${config.OWNER_NAME}*
┅┄┅┄『 ✦ 』┄┅┄┅┄`
    }, { quoted: msg });
}

module.exports = { roubar };
