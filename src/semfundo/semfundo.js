/* =================================================
   🫥 MIKASA BOT — FIGURINHA SEM FUNDO
   📁 Arquivo: semfundo.js

   POR QUE EXISTE: quando um GIF do teclado do WhatsApp (ou uma imagem com fundo transparente)
   é enviado como foto/vídeo, o WhatsApp JÁ achata a transparência — o fundo vira PRETO (ou
   branco) antes de chegar no bot. Aqui o bot "apaga" esse fundo de cor lisa e devolve uma
   figurinha com transparência de verdade.

   USO:  responda (ou envie com a legenda) uma imagem / GIF / vídeo / figurinha com
         $sf            → descobre sozinho a cor do fundo (preto, branco, verde...) e apaga
         $sf preto      → força apagar fundo preto
         $sf branco     → força apagar fundo branco
         $sf verde      → força apagar fundo verde (chroma key)
         $sf 60         → muda a tolerância (1 a 100; padrão 40) — maior apaga mais
   Só apaga o que está LIGADO À BORDA: partes pretas dentro do desenho (olhos, contornos) ficam.
   Se a imagem já veio com transparência de verdade (PNG enviado como DOCUMENTO), ela é mantida.
   Aliases: $semfundo  $sfundo
================================================= */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const config = require("../../config");
const { semSincronia } = require("../ffmpeg-compat/ffmpeg-compat");
const { montarWebpAnimado, rodarFfmpeg, TAM } = require("../attp/attp");

const MAX_SEGUNDOS = 6;
const FPS = 12;
const COR_NOMES = {
    preto: [0, 0, 0], branco: [255, 255, 255], verde: [0, 177, 64], azul: [0, 71, 187], vermelho: [220, 0, 0]
};

// ───────────── onde está a mídia ─────────────
function acharMidia(msg) {
    const topo = msg.message || {};
    const cit = topo.extendedTextMessage?.contextInfo?.quotedMessage
        || topo.imageMessage?.contextInfo?.quotedMessage
        || topo.videoMessage?.contextInfo?.quotedMessage || {};
    for (const m of [topo, cit]) {
        const x = (m.ephemeralMessage?.message) || (m.viewOnceMessage?.message) || (m.viewOnceMessageV2?.message) || m;
        if (x.imageMessage) return { tipo: "image", alvo: x.imageMessage };
        if (x.videoMessage) return { tipo: "video", alvo: x.videoMessage };
        if (x.stickerMessage) return { tipo: "sticker", alvo: x.stickerMessage };
        if (x.documentMessage) {
            const mt = String(x.documentMessage.mimetype || "");
            if (/^image\//.test(mt)) return { tipo: "document", alvo: x.documentMessage };
            if (/^video\//.test(mt)) return { tipo: "document-video", alvo: x.documentMessage };
        }
        if (x.documentWithCaptionMessage?.message?.documentMessage) {
            const d = x.documentWithCaptionMessage.message.documentMessage;
            if (/^(image|video)\//.test(String(d.mimetype || ""))) return { tipo: /^video/.test(d.mimetype) ? "document-video" : "document", alvo: d };
        }
    }
    return null;
}

async function baixar(midia) {
    const tipoBaileys = midia.tipo === "image" ? "image" : midia.tipo === "video" ? "video"
        : midia.tipo === "sticker" ? "sticker" : "document";
    const stream = await downloadContentFromMessage(midia.alvo, tipoBaileys);
    const partes = [];
    for await (const c of stream) partes.push(c);
    return Buffer.concat(partes);
}

// ───────────── remoção do fundo ─────────────
function distancia(r, g, b, k) {
    const dr = r - k[0], dg = g - k[1], db = b - k[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

// cor do fundo = a cor que mais se repete na borda do quadro
function corDoFundo(d, w, h) {
    const cont = new Map();
    const amostra = (x, y) => {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 200) return;
        const chave = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
        const e = cont.get(chave) || { n: 0, r: 0, g: 0, b: 0 };
        e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
        cont.set(chave, e);
    };
    for (let x = 0; x < w; x += 2) { amostra(x, 0); amostra(x, h - 1); }
    for (let y = 0; y < h; y += 2) { amostra(0, y); amostra(w - 1, y); }
    let melhor = null;
    for (const e of cont.values()) if (!melhor || e.n > melhor.n) melhor = e;
    if (!melhor) return null;
    return { cor: [melhor.r / melhor.n, melhor.g / melhor.n, melhor.b / melhor.n], fracao: melhor.n };
}

function jaTemTransparencia(d, w, h) {
    let transparentes = 0, total = 0;
    for (let x = 0; x < w; x += 4) for (const y of [0, h - 1]) { total++; if (d[(y * w + x) * 4 + 3] < 20) transparentes++; }
    for (let y = 0; y < h; y += 4) for (const x of [0, w - 1]) { total++; if (d[(y * w + x) * 4 + 3] < 20) transparentes++; }
    return transparentes > total * 0.5;
}

/**
 * Apaga o fundo ligado à borda (preenchimento por inundação), com borda suave.
 * @returns {boolean} true se removeu algo
 */
function removerFundo(img, chave, tolerancia) {
    const { data: d, width: w, height: h } = img;
    const T1 = tolerancia;            // até aqui: some por completo
    const T2 = tolerancia * 2.2 + 12; // daqui pra cima: fica intacto; entre os dois: suavizado
    const visitado = new Uint8Array(w * h);
    const fila = new Int32Array(w * h);
    let ini = 0, fim = 0;

    const tenta = (x, y) => {
        const p = y * w + x;
        if (visitado[p]) return;
        const i = p * 4;
        if (d[i + 3] === 0) { visitado[p] = 1; fila[fim++] = p; return; }
        if (distancia(d[i], d[i + 1], d[i + 2], chave) < T2) { visitado[p] = 1; fila[fim++] = p; }
    };
    for (let x = 0; x < w; x++) { tenta(x, 0); tenta(x, h - 1); }
    for (let y = 0; y < h; y++) { tenta(0, y); tenta(w - 1, y); }

    let removidos = 0;
    while (ini < fim) {
        const p = fila[ini++];
        const x = p % w, y = (p - x) / w;
        const i = p * 4;
        const dist = distancia(d[i], d[i + 1], d[i + 2], chave);
        if (dist <= T1) { d[i + 3] = 0; removidos++; }
        else if (dist < T2) {
            const a = Math.round(255 * (dist - T1) / (T2 - T1));
            d[i + 3] = Math.min(d[i + 3], a); removidos++;
        }
        if (x > 0) tenta(x - 1, y);
        if (x < w - 1) tenta(x + 1, y);
        if (y > 0) tenta(x, y - 1);
        if (y < h - 1) tenta(x, y + 1);
    }
    return removidos > w * h * 0.01;
}

// ───────────── o comando ─────────────
function lerOpcoes(args) {
    let cor = null, tol = 40;
    for (const a of (args || []).map(x => String(x).toLowerCase())) {
        if (COR_NOMES[a]) cor = COR_NOMES[a];
        else if (/^\d{1,3}$/.test(a)) tol = Math.max(1, Math.min(100, Number(a)));
    }
    return { cor, tol };
}

async function responder(sock, from, msg, titulo, linhas) {
    try {
        const { enviarMensagemPadrao } = require("../menuBotoes/menuBotoes");
        return await enviarMensagemPadrao(sock, from, { titulo: ` ${titulo} `, linhas, quoted: msg });
    } catch {
        return sock.sendMessage(from, { text: `『 ✦ 』 ${titulo} 『 ✦ 』\n${[].concat(linhas).join("\n")}` }, { quoted: msg });
    }
}

async function semFundo(sock, msg, args) {
    const from = msg.key.remoteJid;
    const midia = acharMidia(msg);
    if (!midia) {
        return responder(sock, from, msg, "🫥 FIGURINHA SEM FUNDO", [
            "Responda uma imagem, GIF, vídeo ou figurinha com:",
            `${config.PREFIX}sf`,
            "",
            "Ele apaga o fundo preto/branco/verde que o WhatsApp deixou.",
            `${config.PREFIX}sf preto  ${config.PREFIX}sf branco  ${config.PREFIX}sf verde`,
            `${config.PREFIX}sf 60 → apaga mais (1 a 100)`
        ]);
    }

    const { cor: corForcada, tol } = lerOpcoes(args);
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "sf-"));
    try {
        await sock.sendMessage(from, { text: "⏳ Apagando o fundo..." }, { quoted: msg });
        const entrada = path.join(pasta, "entrada.bin");
        fs.writeFileSync(entrada, await baixar(midia));

        // 1) separa em quadros PNG (imagem = 1 quadro; vídeo/GIF = até 6 s)
        const animado = midia.tipo === "video" || midia.tipo === "document-video";
        const bruto = path.join(pasta, "bruto");
        fs.mkdirSync(bruto);
        const filtro = `scale=${TAM}:${TAM}:force_original_aspect_ratio=decrease:flags=lanczos,format=rgba`;
        await rodarFfmpeg(animado
            ? ["-y", "-t", String(MAX_SEGUNDOS), "-i", entrada, "-vf", `fps=${FPS},${filtro}`, ...semSincronia(), path.join(bruto, "b_%03d.png")]
            : ["-y", "-i", entrada, "-frames:v", "1", "-vf", filtro, path.join(bruto, "b_001.png")]);
        const arquivos = fs.readdirSync(bruto).filter(f => f.endsWith(".png")).sort();
        if (!arquivos.length) throw new Error("Não consegui abrir essa mídia.");

        // 2) apaga o fundo quadro a quadro (a cor do fundo é descoberta no 1º quadro e mantida)
        const canvas = createCanvas(TAM, TAM);
        const ctx = canvas.getContext("2d");
        let chave = corForcada, ja = false, apagou = false;
        for (let i = 0; i < arquivos.length; i++) {
            const quadro = await loadImage(fs.readFileSync(path.join(bruto, arquivos[i])));
            const qw = quadro.width, qh = quadro.height;
            const ox = Math.round((TAM - qw) / 2), oy = Math.round((TAM - qh) / 2);
            ctx.clearRect(0, 0, TAM, TAM);
            ctx.drawImage(quadro, ox, oy);
            // trabalha só dentro da área do desenho (as sobras do 512x512 já são transparentes)
            const img = ctx.getImageData(ox, oy, qw, qh);
            if (i === 0) {
                ja = jaTemTransparencia(img.data, qw, qh); // PNG/figurinha que já veio com fundo transparente
                if (!chave) {
                    const achada = corDoFundo(img.data, qw, qh);
                    chave = achada ? achada.cor : [0, 0, 0];
                }
            }
            if (!ja && removerFundo(img, chave, tol)) apagou = true;
            ctx.putImageData(img, ox, oy);
            fs.writeFileSync(path.join(pasta, `f_${String(i).padStart(3, "0")}.png`), canvas.toBuffer("image/png"));
        }
        if (!apagou && !ja) {
            return responder(sock, from, msg, "🫥 NÃO ACHEI FUNDO", [
                "Esse desenho não tem um fundo de cor lisa pra apagar.",
                `Tente dizendo a cor: ${config.PREFIX}sf preto / branco / verde`
            ]);
        }

        // 3) monta a figurinha (parada ou animada)
        let webp;
        if (arquivos.length === 1) {
            const saida = path.join(pasta, "saida.webp");
            for (const q of [90, 70, 50, 30]) {
                await rodarFfmpeg(["-y", "-i", path.join(pasta, "f_000.png"), "-vf", "format=yuva420p",
                    "-c:v", "libwebp", "-lossless", "0", "-q:v", String(q), "-compression_level", "4", saida]);
                if (fs.statSync(saida).size <= 90 * 1024) break;
            }
            webp = fs.readFileSync(saida);
        } else {
            webp = await montarWebpAnimado(pasta, arquivos.length, FPS);
        }
        return await sock.sendMessage(from, { sticker: webp }, { quoted: msg });
    } catch (erro) {
        console.error("❌ sf:", erro?.message || erro);
        return responder(sock, from, msg, "❌ NÃO CONSEGUI", [String(erro?.message || erro).slice(0, 180)]);
    } finally {
        try { fs.rmSync(pasta, { recursive: true, force: true }); } catch {}
    }
}

module.exports = { semFundo, removerFundo, corDoFundo };
