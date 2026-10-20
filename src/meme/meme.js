/* =================================================
   🃏 COMANDO .meme — busca um gif por descrição (Tenor,
   com fallback pro Giphy) e manda como figurinha, com
   metadados profissionais (igual o .figurinha).
   📁 Arquivo: meme.js
   ================================================= */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const axios = require('axios');
const config = require('../../config');
const { semSincroniaTexto } = require('../ffmpeg-compat/ffmpeg-compat');

const dbPath = path.join(__dirname, "../../database/botconfig.json");
function lerChaves() {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
    } catch {
        return {};
    }
}

// ── BUSCA NO TENOR (v2) ──
async function buscarTenor(query, apiKey) {
    const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${apiKey}&limit=8&media_filter=gif&locale=pt_BR`;
    const resp = await axios.get(url, { timeout: 12000 });
    const resultados = resp.data?.results || [];
    if (!resultados.length) throw new Error("Tenor não achou nada pra essa busca.");
    const escolhido = resultados[Math.floor(Math.random() * Math.min(resultados.length, 5))];
    const mediaUrl =
        escolhido.media_formats?.gif?.url ||
        escolhido.media_formats?.mediumgif?.url ||
        escolhido.media_formats?.tinygif?.url;
    if (!mediaUrl) throw new Error("Tenor não devolveu um link de gif utilizável.");
    return mediaUrl;
}

// ── BUSCA NO GIPHY (fallback) ──
async function buscarGiphy(query, apiKey) {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(query)}&limit=8&lang=pt`;
    const resp = await axios.get(url, { timeout: 12000 });
    const resultados = resp.data?.data || [];
    if (!resultados.length) throw new Error("Giphy não achou nada pra essa busca.");
    const escolhido = resultados[Math.floor(Math.random() * Math.min(resultados.length, 5))];
    const mediaUrl = escolhido.images?.original?.url || escolhido.images?.downsized?.url;
    if (!mediaUrl) throw new Error("Giphy não devolveu um link de gif utilizável.");
    return mediaUrl;
}

async function baixarBuffer(url) {
    const resp = await axios.get(url, { responseType: "arraybuffer", timeout: 20000 });
    return Buffer.from(resp.data);
}

async function meme(sock, msg, args) {
    const from = msg.key.remoteJid;
    const remetente = msg.key.participant || msg.key.remoteJid;
    const nomeUsuario = msg.pushName || remetente.split('@')[0];
    const ehGrupo = from.endsWith("@g.us");
    const query = (args || []).join(" ").trim();

    if (!query) {
        return sock.sendMessage(from, {
            text: `🃏 *COMANDO MEME*\n\nUse: ${config.PREFIX}meme descrição do que você quer\nEx: ${config.PREFIX}meme programador frustrado quebrando teclado`
        }, { quoted: msg });
    }

    const chaves = lerChaves();
    const tenorKey = chaves.TENOR_API_KEY;
    const giphyKey = chaves.GIPHY_API_KEY;

    if (!tenorKey && !giphyKey) {
        return sock.sendMessage(from, {
            text: `❌ Nenhuma chave de API configurada ainda pro comando .meme.\n\n💡 Peça pro dono do bot rodar:\n${config.PREFIX}configurar-bot tenorkey <chave>\nou\n${config.PREFIX}configurar-bot giphykey <chave>\n\n(pelo menos uma das duas é grátis e leva minutos pra criar)`
        }, { quoted: msg });
    }

    let localEnvio = "💬 CONVERSA PRIVADA";
    if (ehGrupo) {
        const grupoInfo = await sock.groupMetadata(from).catch(() => null);
        localEnvio = grupoInfo?.subject || "👥 GRUPO DESCONHECIDO";
    }

    const agora = new Date();
    const dataHora = agora.toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
    });

    // ── BUSCA: Tenor primeiro, Giphy como reforço se falhar/estiver ausente ──
    let mediaUrl = null;
    let fonteUsada = null;
    let erroTenor = null, erroGiphy = null;

    if (tenorKey) {
        try {
            mediaUrl = await buscarTenor(query, tenorKey);
            fonteUsada = "Tenor";
        } catch (e) {
            erroTenor = e.message;
            console.warn("⚠️ MEME — Tenor falhou:", e.message);
        }
    }

    if (!mediaUrl && giphyKey) {
        try {
            mediaUrl = await buscarGiphy(query, giphyKey);
            fonteUsada = "Giphy";
        } catch (e) {
            erroGiphy = e.message;
            console.warn("⚠️ MEME — Giphy falhou:", e.message);
        }
    }

    if (!mediaUrl) {
        return sock.sendMessage(from, {
            text: `❌ Não consegui achar um meme pra "${query}".\n${erroTenor ? `\n🔸 Tenor: ${erroTenor}` : ""}${erroGiphy ? `\n🔸 Giphy: ${erroGiphy}` : ""}`
        }, { quoted: msg });
    }

    const idUnico = Date.now() + "_" + Math.floor(Math.random() * 9999);
    const tempEntrada = path.join(__dirname, `meme_in_${idUnico}.gif`);
    const tempSaida = path.join(__dirname, `meme_out_${idUnico}.webp`);

    try {
        const bufferGif = await baixarBuffer(mediaUrl);
        fs.writeFileSync(tempEntrada, bufferGif);

        // mesma lógica de "preencher sem sobrar espaço" do .figurinha
        await execAsync(
            `ffmpeg -y -threads 0 -i "${tempEntrada}" ` +
            `-t 3 -vf "scale=512:512:force_original_aspect_ratio=increase,crop=512:512:(iw-512)/2:(ih-512)/2,fps=12:round=up" ` +
            `-c:v libwebp -preset default -compression_level 2 -loop 1 -lossless 0 -quality 80 -an ${semSincroniaTexto()} -f webp "${tempSaida}"`
        );

        if (!fs.existsSync(tempSaida) || fs.statSync(tempSaida).size < 512) {
            throw new Error("FFmpeg não gerou a figurinha do meme.");
        }

        // 📋 mesmos metadados profissionais do .figurinha — gravados DENTRO do arquivo
        // (mandar packname/author no sendMessage não funciona, o Baileys ignora)
        const { adicionarMetadados } = require('../figurinha-meta/figurinha-meta');
        const bufferFinal = adicionarMetadados(fs.readFileSync(tempSaida), {
            packname: `🃏 ${config.BOT_NAME} • Meme: ${query}`,
            author: `👑 CRIADOR: ${config.OWNER_NAME}
👤 PEDIDO POR: ${nomeUsuario}
📍 LOCAL: ${localEnvio}
⏰ DATA/HORA: ${dataHora}
🔎 FONTE: ${fonteUsada}`
        });

        await sock.sendMessage(from, {
            sticker: bufferFinal,
            mimetype: "image/webp"
        }, { quoted: msg });

    } catch (erro) {
        console.error("❌ Erro ao gerar meme:", erro.message);
        await sock.sendMessage(from, { text: "😵 Achei o meme, mas não consegui transformar em figurinha. Tenta de novo!" }, { quoted: msg });
    } finally {
        for (const caminho of [tempEntrada, tempSaida]) {
            if (fs.existsSync(caminho)) {
                try { fs.unlinkSync(caminho); } catch {}
            }
        }
    }
}

module.exports = { meme };
