/* =================================================
   🎴 CRIADOR DE FIGURINHAS — ESTÁTICA / ANIMADA ✅ CORRIGIDO
   📁 Arquivo: figurinha.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const config = require('../../config');
const { semSincroniaTexto } = require('../ffmpeg-compat/ffmpeg-compat');

/**
 * Função principal — COMANDO ou AUTOMÁTICO
 * @param {boolean} modoAutomatico — true = sem avisos / sem frases
 */
async function criarFigurinha(sock, msg, modoAutomatico = false) {
    const from = msg.key.remoteJid;
    const remetente = msg.key.participant || msg.key.remoteJid;
    const nomeUsuario = msg.pushName || remetente.split('@')[0];
    const ehGrupo = from.endsWith("@g.us");
    
    // 📍 Definição de local
    let localEnvio = "💬 CONVERSA PRIVADA";
    if (ehGrupo) {
        // Tenta pegar nome do grupo
        const grupoInfo = await sock.groupMetadata(from).catch(() => null);
        localEnvio = grupoInfo?.subject || "👥 GRUPO DESCONHECIDO";
    }

    // 📅 HORA E DATA PARA COLOCAR NA INFORMAÇÃO
    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR", { 
        day: "2-digit", month: "2-digit", year: "numeric", 
        hour: "2-digit", minute: "2-digit", second: "2-digit" 
    });

    // 📥 IDENTIFICA MÍDIA
    const midiaDireta = msg.message?.imageMessage || msg.message?.videoMessage;
    const midiaResposta = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const mensagemComMidia = midiaDireta || midiaResposta?.imageMessage || midiaResposta?.videoMessage;
    const tipoDireto = msg.message?.imageMessage ? 'image' : msg.message?.videoMessage ? 'video' : null;
    const tipoResposta = midiaResposta?.imageMessage ? 'image' : midiaResposta?.videoMessage ? 'video' : null;
    const tipo = tipoDireto || tipoResposta;

    if (!tipo) {
        if (!modoAutomatico) {
            return sock.sendMessage(from, { 
                text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
 🖼️ *ERRO AO CRIAR!*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Envie uma imagem ou vídeo E use o comando,
ou então RESPONDA em cima da mídia com:
┅┄┅┄『 ✦ 』┄┅┄┅┄
${config.PREFIX}s / ${config.PREFIX}sticker
┅┄┅┄『 ✦ 』┄┅┄┅┄` 
            }, { quoted: msg });
        }
        return;
    }

    try {
        // ⏳ MENSAGEM DE ESPERA — SÓ NO COMANDO (texto simples, sem enfeites)
        if (!modoAutomatico) {
            await sock.sendMessage(from, { text: "⏳ Convertendo..." }, { quoted: msg });
        }

        // ⬇️ BAIXA ARQUIVO
        const stream = await downloadContentFromMessage(mensagemComMidia, tipo);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // 📁 ARQUIVOS TEMPORÁRIOS
        const nomeArquivo = Date.now() + "_" + Math.floor(Math.random() * 9999);
        const tempInput = path.join(__dirname, `entrada_${nomeArquivo}.tmp`);
        const tempOutput = path.join(__dirname, `saida_${nomeArquivo}.webp`);
        
        fs.writeFileSync(tempInput, buffer);

        // ⚙️ ✅ CORREÇÃO PRINCIPAL: VÍDEO AGORA ANIMA DE VERDADE
        let comandoFFmpeg;

        if (tipo === "video") {
            // 🎥 VÍDEO ANIMADO — LIMITE 3s, LOOP CORRETO, QUALIDADE BOA
            // ⚡ compression_level mais baixo (0-6, padrão era 4) = codifica
            // bem mais rápido pro webp animado, com perda de qualidade quase
            // imperceptível numa figurinha. threads 0 deixa o ffmpeg usar
            // todos os núcleos disponíveis pra decodificar/escalar.
            comandoFFmpeg = `ffmpeg -y -threads 0 -i "${tempInput}" 
                -t 3 
                -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-512)/2:(ih-512)/2,fps=12:round=up" 
                -c:v libwebp 
                -preset default 
                -compression_level 2 
                -loop 1 
                -lossless 0 
                -quality 80 
                -an ${semSincroniaTexto()} 
                -f webp "${tempOutput}"`;
        } else {
            // 🖼️ IMAGEM ESTÁTICA
            // ⚡ Antes usava lossless 1 + qualidade 100, que é o modo mais
            // lento do encoder webp. Lossy com qualidade alta fica visualmente
            // idêntico numa figurinha e converte muito mais rápido.
            comandoFFmpeg = `ffmpeg -y -threads 0 -i "${tempInput}" 
                -vcodec libwebp 
                -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-512)/2:(ih-512)/2" 
                -preset picture 
                -compression_level 3 
                -lossless 0 
                -loop 0 
                -an ${semSincroniaTexto()} 
                -q:v 90 "${tempOutput}"`;
        }

        // ⚡ EXECUÇÃO
        exec(comandoFFmpeg.replace(/\s+/g, ' '), async (erroExec) => {
            
            if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);

            if (erroExec) {
                console.error("❌ ERRO CONVERSÃO:", erroExec.message);
                if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                if (!modoAutomatico) {
                    return sock.sendMessage(from, { 
                        text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
 ❌ *FALHA NA CRIAÇÃO!*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Arquivo muito longo ou corrompido.
Tente novamente!
┅┄┅┄『 ✦ 』┄┅┄┅┄` 
                    }, { quoted: msg });
                }
                return;
            }

            // ✅ 📦 AQUI É ONDE COLOCAMOS TODAS AS INFORMAÇÕES QUE VOCÊ QUER
            const bufferSemEtiqueta = fs.readFileSync(tempOutput);

            // 📋 DADOS QUE APARECEM AO CLICAR NA FIGURINHA (nome do pacote + autor).
            // Eles precisam ser gravados DENTRO do arquivo .webp: mandar "packname" e
            // "author" no sendMessage não funciona (o Baileys ignora esses campos).
            const { adicionarMetadados } = require('../figurinha-meta/figurinha-meta');
            const bufferFinal = adicionarMetadados(bufferSemEtiqueta, {
                packname: `🎴 ${config.BOT_NAME} • ${config.OWNER_NAME}`,
                author: `👑 CRIADOR: ${config.OWNER_NAME}
👤 FEITO POR: ${nomeUsuario}
📍 LOCAL: ${localEnvio}
⏰ DATA/HORA: ${dataHora}`
            });

            await sock.sendMessage(from, {
                sticker: bufferFinal,
                mimetype: "image/webp"
            }, { quoted: msg });

            // 🧹 LIMPEZA FINAL
            if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
        });

    } catch (erroGeral) {
        console.error("⚠️ ERRO:", erroGeral);
        if (!modoAutomatico) {
            await sock.sendMessage(from, { text: `😵 *OPSSS!* Verifique a conexão e tente novamente!` }, { quoted: msg });
        }
    }
}

module.exports = { criarFigurinha };
