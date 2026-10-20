/* =================================================
   📌 MIKASA BOT — PINTEREST (VÍDEO + FOTO)
   📁 Arquivo: pinterest-video.js

   A pessoa manda o link do Pin e o bot baixa:
     • se o Pin for VÍDEO  → manda o vídeo (mp4)
     • se for foto/GIF     → manda a imagem (tentando o tamanho original)
   Funciona com link normal (pinterest.com/pin/...) e curto (pin.it/...).

   Como acha o vídeo (em ordem):
     1) mp4 direto dentro da página do Pin (og:video / video_list / v1.pinimg.com)
     2) vídeo em HLS (.m3u8): o ffmpeg junta e vira mp4
     3) yt-dlp (que também entende Pinterest), se a página indicar que é vídeo
   Devolve true se mandou algo; false se não achou nada (aí o comando antigo
   tenta a foto do jeito que já fazia).
================================================= */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { execFile } = require("child_process");

const UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36";
const LIMITE_VIDEO_BYTES = 60 * 1024 * 1024; // WhatsApp aceita até ~64 MB

function limparUrl(u) {
    return String(u || "")
        .replace(/\\u002F/gi, "/")
        .replace(/\\\//g, "/")
        .replace(/&amp;/g, "&")
        .replace(/\\u0026/gi, "&");
}

function extrairLink(texto) {
    const m = String(texto || "").match(/https?:\/\/[^\s]+/i);
    return m ? m[0].replace(/[)\]>.,;]+$/, "") : null;
}

async function pegarPagina(link) {
    const resp = await axios.get(link, {
        timeout: 25000,
        maxRedirects: 6,
        headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8" },
        validateStatus: s => s >= 200 && s < 400
    });
    return { html: String(resp.data || ""), urlFinal: resp.request?.res?.responseUrl || link };
}

// Procura todos os links de vídeo dentro do HTML do Pin.
function acharVideos(html) {
    const limpo = limparUrl(html);
    const mp4 = new Set();
    const hls = new Set();

    // metas (og:video, og:video:url, twitter:player:stream)
    for (const m of limpo.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["'][^>]+content=["']([^"']+)["']/gi)) {
        (/\.m3u8/i.test(m[1]) ? hls : mp4).add(m[1]);
    }
    for (const m of limpo.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:video(?::url|:secure_url)?|twitter:player:stream)["']/gi)) {
        (/\.m3u8/i.test(m[1]) ? hls : mp4).add(m[1]);
    }
    // qualquer link do CDN de vídeo do Pinterest
    for (const m of limpo.matchAll(/https?:\/\/[a-z0-9.-]*pinimg\.com\/videos\/[^"'\s<>\\]+?\.(mp4|m3u8)(?:\?[^"'\s<>\\]*)?/gi)) {
        (m[1].toLowerCase() === "m3u8" ? hls : mp4).add(m[0]);
    }
    // links .m3u8 / .mp4 soltos no JSON da página (qualquer servidor do CDN)
    for (const m of limpo.matchAll(/https?:\/\/[^"'\s<>\\]+?\.m3u8(?:\?[^"'\s<>\\]*)?/gi)) hls.add(m[0]);
    for (const m of limpo.matchAll(/"url"\s*:\s*"(https?:\/\/[^"]+?\.mp4[^"]*)"/gi)) mp4.add(m[1]);
    // JSON-LD (contentUrl)
    for (const m of limpo.matchAll(/"contentUrl"\s*:\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/gi)) {
        (/\.m3u8/i.test(m[1]) ? hls : mp4).add(m[1]);
    }

    // melhor mp4: maior resolução citada no link (720p > 480p > 360p), senão o primeiro
    const pontuar = u => {
        const r = u.match(/(\d{3,4})p/i);
        if (r) return Number(r[1]);
        if (/expmp4/i.test(u)) return 700;
        return 100;
    };
    return {
        mp4: [...mp4].sort((a, b) => pontuar(b) - pontuar(a)),
        hls: [...hls],
        pareceVideo: /"is_video"\s*:\s*true|video_list|og:video|"videos"\s*:/i.test(limpo)
    };
}

function acharImagem(html) {
    const limpo = limparUrl(html);
    const m = limpo.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
        || limpo.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i);
    return m ? m[1] : null;
}

async function baixarBufferUrl(url, limite) {
    const resp = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 90000,
        maxContentLength: limite,
        headers: { "User-Agent": UA, Referer: "https://www.pinterest.com/" }
    });
    return Buffer.from(resp.data);
}

function rodar(comando, args, timeoutMs) {
    return new Promise((resolve, reject) => {
        execFile(comando, args, { timeout: timeoutMs, maxBuffer: 1024 * 1024 * 20 }, (erro, stdout, stderr) => {
            if (erro) return reject(new Error(String(stderr || erro.message).trim().split("\n").slice(-2).join(" | ")));
            resolve(stdout);
        });
    });
}

function arquivoTemporario(ext) {
    return path.join(__dirname, `pin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`);
}

async function hlsParaMp4(urlM3u8) {
    const saida = arquivoTemporario("mp4");
    try {
        await rodar("ffmpeg", ["-y", "-loglevel", "error", "-i", urlM3u8, "-c", "copy", "-bsf:a", "aac_adtstoasc", "-movflags", "+faststart", saida], 120000);
        return fs.readFileSync(saida);
    } finally {
        try { fs.unlinkSync(saida); } catch {}
    }
}

async function viaYtDlp(link) {
    const base = arquivoTemporario("%(ext)s");
    const prefixo = path.basename(base).replace(".%(ext)s", "");
    try {
        await rodar("yt-dlp", ["--no-playlist", "--no-warnings", "-f", "best[ext=mp4]/best", "--merge-output-format", "mp4", "-o", base, link], 120000);
        const achado = fs.readdirSync(__dirname).find(f => f.startsWith(prefixo));
        if (!achado) throw new Error("yt-dlp não gerou arquivo");
        const caminho = path.join(__dirname, achado);
        const buffer = fs.readFileSync(caminho);
        try { fs.unlinkSync(caminho); } catch {}
        return buffer;
    } finally {
        for (const f of fs.readdirSync(__dirname)) if (f.startsWith(prefixo)) { try { fs.unlinkSync(path.join(__dirname, f)); } catch {} }
    }
}

// Tenta trocar o tamanho pequeno da imagem pelo original.
function candidatasDaImagem(url) {
    const original = url.replace(/\/(?:\d+x\d*|\d+x)\//, "/originals/");
    return original !== url ? [original, url] : [url];
}

async function baixarPinterest(sock, msg, entrada) {
    const from = msg.key.remoteJid;
    const link = extrairLink(entrada);
    if (!link) return false;

    let pagina;
    try {
        pagina = await pegarPagina(link);
    } catch (erro) {
        console.error("📌 Pinterest: não abriu a página:", erro.message);
        return false;
    }

    const { mp4, hls, pareceVideo } = acharVideos(pagina.html);
    const legenda = "✅ Mídia do Pinterest baixada.";
    let video = null;

    // 1) mp4 direto
    for (const url of mp4) {
        try {
            video = await baixarBufferUrl(url, LIMITE_VIDEO_BYTES);
            if (video?.length > 2000) break;
            video = null;
        } catch (erro) { console.error("📌 mp4 falhou:", erro.message); }
    }
    // 2) HLS → mp4
    if (!video) {
        for (const url of hls) {
            try { video = await hlsParaMp4(url); if (video?.length > 2000) break; video = null; }
            catch (erro) { console.error("📌 HLS falhou:", erro.message); }
        }
    }
    // 3) yt-dlp (só se a página indica vídeo)
    if (!video && (pareceVideo || mp4.length || hls.length)) {
        try { video = await viaYtDlp(pagina.urlFinal || link); }
        catch (erro) { console.error("📌 yt-dlp falhou:", erro.message); }
    }

    if (video && video.length > 2000) {
        if (video.length > LIMITE_VIDEO_BYTES) {
            await sock.sendMessage(from, { text: "⚠️ Esse vídeo é grande demais pro WhatsApp (mais de 60 MB)." }, { quoted: msg });
            return true;
        }
        await sock.sendMessage(from, { video, mimetype: "video/mp4", caption: legenda }, { quoted: msg });
        return true;
    }

    // 4) não é vídeo: manda a imagem
    const img = acharImagem(pagina.html);
    if (img) {
        for (const url of candidatasDaImagem(img)) {
            try {
                const buffer = await baixarBufferUrl(url, 30 * 1024 * 1024);
                if (buffer?.length > 500) {
                    await sock.sendMessage(from, { image: buffer, caption: legenda }, { quoted: msg });
                    return true;
                }
            } catch {}
        }
    }
    return false;
}

module.exports = { baixarPinterest, acharVideos, acharImagem, extrairLink };
