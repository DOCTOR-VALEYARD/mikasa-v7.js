/* =================================================
   🎴 SALVAR FIGURINHA NA COLEÇÃO
   📁 Arquivo: addfigurinha.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */

const fs = require("fs");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require('../../config');

module.exports.addfigurinha = async function(sock, msg, args){

    const from = msg.key.remoteJid;

    // ❌ ERRO: Sem nome
    if(args.length < 1){
        return sock.sendMessage(from,{
            text: `📝 *COMO USAR:*\nResponda a mídia e digite:\n${config.PREFIX}addfigurinha nome_da_figurinha\n\n💡 Aceita nomes com espaço!`
        },{ quoted: msg });
    }

    // ✅ Junta tudo e padroniza
    const nome = args.join(" ").toLowerCase().trim();

    // 🔒 BLOQUEIA CARACTERES ESTRANHOS
    if(!/^[a-z0-9áàâãéèêíïóôõúüç ]+$/i.test(nome)){
        return sock.sendMessage(from,{
            text: "❌ *NOME INVÁLIDO!*\nUse apenas letras, números, espaços e acentos.\nNão use símbolos ou caracteres especiais."
        },{ quoted: msg });
    }

    // 📏 LIMITE DE TAMANHO
    if(nome.length < 2 || nome.length > 30){
        return sock.sendMessage(from,{
            text: "⚠️ *TAMANHO INVÁLIDO!*\nO nome precisa ter entre 2 e 30 caracteres."
        },{ quoted: msg });
    }

    // 📥 VERIFICA SE ESTÁ RESPONDENDO ALGO
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if(!quoted){
        return sock.sendMessage(from,{
            text: "🎴 *NENHUMA MÍDIA SELECIONADA!*\nResponda diretamente em cima de uma imagem, figurinha, vídeo ou GIF para salvar."
        },{ quoted: msg });
    }

    let stream;
    let extensao;

    // 📽️ 🖼️ 🎴 DEFINE TIPO E EXTENSÃO CORRETA
    if(quoted.stickerMessage){
        stream = await downloadContentFromMessage(quoted.stickerMessage, "sticker");
        extensao = ".webp";
    }
    else if(quoted.videoMessage){
        stream = await downloadContentFromMessage(quoted.videoMessage, "video");
        extensao = ".mp4";
    }
    else if(quoted.imageMessage){
        stream = await downloadContentFromMessage(quoted.imageMessage, "image");
        extensao = ".jpg";
    }
    else{
        return sock.sendMessage(from,{
            text: "❌ *TIPO NÃO SUPORTADO!*\nApenas: Imagem • Figurinha • Vídeo • GIF"
        },{ quoted: msg });
    }

    // ⏳ RECEBE O ARQUIVO EM PARTES
    let buffer = Buffer.from([]);
    try {
        for await (const chunk of stream){
            buffer = Buffer.concat([buffer, chunk]);
        }
    } catch (erro) {
        return sock.sendMessage(from, {
            text: "⚠️ *FALHA AO BAIXAR!*\nHouve problema na conexão ou arquivo muito grande."
        }, { quoted: msg });
    }

    // 📁 GARANTE PASTA EXISTE
    const pasta = path.join(__dirname, "../midias/stickers");
    if(!fs.existsSync(pasta)){
        fs.mkdirSync(pasta, { recursive: true });
    }

    // 📍 CAMINHO FINAL COM EXTENSÃO CERTA — ANTES ERA SEMPRE .GIF E ISSO DAVA PROBLEMA! ✅
    const caminhoCompleto = path.join(pasta, `${nome}${extensao}`);

    // ⚠️ SE JÁ EXISTIR AVISA E NÃO SOBRESCREVE
    if(fs.existsSync(caminhoCompleto)){
        return sock.sendMessage(from,{
            text: `⚠️ *JÁ EXISTE!*\nJá tem uma figurinha salva com o nome: *${nome}*\nEscolha outro nome!`
        },{ quoted: msg });
    }

    // 💾 SALVA NO BANCO DE MÍDIAS
    fs.writeFileSync(caminhoCompleto, buffer);

    // ✅ RESPOSTA BONITA NO PADRÃO MIKASA BOT
    const resposta = `
┅┄┅┄『 ✦ 』┄┅┄┅┄
FIGURINHA SALVA COM SUCESSO!
┅┄┅┄『 ✦ 』┄┅┄┅┄

📛 *Nome cadastrado:* 
> 『 ✦ ${nome} 』
📂 *Local:* Biblioteca de Mídias
💡 *Como usar:* Apenas digite o nome enviado!

> 『 ✦ *${config.BOT_NAME} 』
— Sistema de Arquivos* ✨
┅┄『  *Criado por:*  』┄┅┄┅┄ 
> 『 ✦ ${config.OWNER_NAME} 』`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });

};
