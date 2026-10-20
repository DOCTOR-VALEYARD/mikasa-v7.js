/* =================================================
   ✨ MIKASA BOT — ATTP (texto vira figurinha animada)
   📁 Arquivo: attp.js

   Uso:  $attp seu texto      (ou responda uma mensagem de texto com $attp)

   Estilos (cada um é um comando):
     $attp   → 1  PISCA-PISCA   letras piscando em vermelho / verde / amarelo / rosa (ordem sorteada)
     $attp2  → 2  ARCO-ÍRIS     cada letra com uma cor, as cores vão rodando
     $attp3  → 3  NEON          letras brilhando e pulsando (cor sorteada)
     $attp4  → 4  DIGITANDO     o texto vai sendo digitado letra por letra
     $attp5  → 5  ONDA          as letras sobem e descem como uma onda

   Fundo transparente, 512x512, sai pronta como figurinha (o bot já grava o nome do pacote).
   Precisa do ffmpeg (já usado pela figurinha normal).
================================================= */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { createCanvas, GlobalFonts } = require("@napi-rs/canvas");
const config = require("../../config");
const { semSincronia } = require("../ffmpeg-compat/ffmpeg-compat");

const TAM = 512;
const LIMITE_TEXTO = 80;
const CORES = ["#FF2D2D", "#22E65A", "#FFE600", "#FF4FD8"]; // vermelho, verde, amarelo, rosa

// ───────────── fonte ─────────────
let FAMILIA = null;
function fonte() {
    if (FAMILIA) return FAMILIA;
    const candidatos = [
        path.join(__dirname, "../midias/assets/fonts/Poppins-Bold.ttf"),
        "/system/fonts/Roboto-Bold.ttf",
        "/system/fonts/NotoSans-Bold.ttf",
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    ];
    for (const f of candidatos) {
        try { if (fs.existsSync(f) && GlobalFonts.registerFromPath(f, "AttpFonte")) return (FAMILIA = "AttpFonte"); } catch {}
    }
    return (FAMILIA = "sans-serif");
}

// ───────────── utilidades ─────────────
const sortear = lista => lista[Math.floor(Math.random() * lista.length)];
function embaralhar(lista) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

// quebra em linhas e acha o MAIOR tamanho de letra que cabe no quadrado
// (1º tenta sem quebrar nenhuma palavra no meio; só quebra palavra se não houver outro jeito)
function ajustar(ctx, texto) {
    const area = TAM - 56;
    const palavras = String(texto).split(/\s+/).filter(Boolean);
    for (const permitirQuebra of [false, true]) {
        for (let tam = 170; tam >= 26; tam -= 4) {
            ctx.font = `bold ${tam}px ${fonte()}`;
            if (!permitirQuebra && palavras.some(p => ctx.measureText(p).width > area)) continue;
            const linhas = quebrar(ctx, texto, area);
            const altura = linhas.length * tam * 1.12;
            if (altura <= area && linhas.every(l => ctx.measureText(l).width <= area)) return { tam, linhas };
        }
    }
    ctx.font = `bold 26px ${fonte()}`;
    return { tam: 26, linhas: quebrar(ctx, texto, area).slice(0, 14) };
}

function quebrar(ctx, texto, largura) {
    const linhas = [];
    for (const paragrafo of String(texto).split("\n")) {
        let atual = "";
        for (const palavra of paragrafo.split(/\s+/).filter(Boolean)) {
            let p = palavra;
            // palavra maior que a linha: quebra por letras
            while (ctx.measureText(p).width > largura && p.length > 1) {
                let corte = p.length - 1;
                while (corte > 1 && ctx.measureText(p.slice(0, corte)).width > largura) corte--;
                if (atual) { linhas.push(atual); atual = ""; }
                linhas.push(p.slice(0, corte)); p = p.slice(corte);
            }
            const teste = atual ? `${atual} ${p}` : p;
            if (ctx.measureText(teste).width <= largura) atual = teste;
            else { if (atual) linhas.push(atual); atual = p; }
        }
        if (atual) linhas.push(atual);
    }
    return linhas.length ? linhas : [""];
}

// desenha uma linha letra por letra (cada letra pode ter cor/posição própria)
function desenharLinha(ctx, linha, yBase, tam, estiloLetra, offsetIndice) {
    ctx.font = `bold ${tam}px ${fonte()}`;
    const letras = [...linha];
    const larguras = letras.map(c => ctx.measureText(c).width);
    const total = larguras.reduce((a, b) => a + b, 0);
    let x = (TAM - total) / 2;
    letras.forEach((c, i) => {
        const est = estiloLetra(c, offsetIndice + i) || {};
        ctx.save();
        ctx.translate(x + larguras[i] / 2, yBase + (est.dy || 0));
        if (est.escala) ctx.scale(est.escala, est.escala);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        if (est.brilho) { ctx.shadowColor = est.brilho; ctx.shadowBlur = est.brilhoTam || 24; }
        if (est.contorno) { ctx.lineWidth = est.contornoTam || Math.max(6, tam * 0.08); ctx.strokeStyle = est.contorno; ctx.strokeText(c, 0, 0); }
        ctx.shadowBlur = est.brilho ? (est.brilhoTam || 24) / 2 : 0;
        ctx.fillStyle = est.cor || "#fff";
        ctx.fillText(c, 0, 0);
        ctx.restore();
        x += larguras[i];
    });
}

function desenharBloco(ctx, linhas, tam, estiloLetra) {
    const alturaLinha = tam * 1.12;
    const topo = (TAM - alturaLinha * linhas.length) / 2 + alturaLinha / 2;
    let idx = 0;
    linhas.forEach((linha, i) => {
        desenharLinha(ctx, linha, topo + i * alturaLinha, tam, estiloLetra, idx);
        idx += [...linha].length;
    });
}

// ───────────── os estilos: cada um devolve a lista de quadros ─────────────
// quadro = função (ctx) que desenha; "fps" é a velocidade
const ESTILOS = {
    // 1️⃣ pisca-pisca nas 4 cores (a ordem das cores é sorteada)
    1: (ctx, { tam, linhas }) => {
        const ordem = embaralhar(CORES);
        const quadros = [];
        for (let f = 0; f < 8; f++) {
            const cor = ordem[f % ordem.length];
            quadros.push(() => desenharBloco(ctx, linhas, tam, () => ({ cor, contorno: "#000000" })));
        }
        return { quadros, fps: 6 };
    },
    // 2️⃣ arco-íris rodando
    2: (ctx, { tam, linhas }) => {
        const quadros = [];
        const N = 12;
        for (let f = 0; f < N; f++) {
            quadros.push(() => desenharBloco(ctx, linhas, tam, (c, i) => ({
                cor: `hsl(${(i * 38 + f * (360 / N)) % 360}, 100%, 58%)`, contorno: "#000000"
            })));
        }
        return { quadros, fps: 10 };
    },
    // 3️⃣ neon pulsante (cor sorteada)
    3: (ctx, { tam, linhas }) => {
        const cor = sortear(CORES);
        const quadros = [];
        const N = 10;
        for (let f = 0; f < N; f++) {
            const p = (Math.sin((f / N) * Math.PI * 2) + 1) / 2; // 0..1
            quadros.push(() => desenharBloco(ctx, linhas, tam * (0.96 + p * 0.06), () => ({
                cor: "#ffffff", contorno: cor, contornoTam: Math.max(5, tam * 0.06), brilho: cor, brilhoTam: 14 + p * 40
            })));
        }
        return { quadros, fps: 10 };
    },
    // 4️⃣ digitando letra por letra
    4: (ctx, { tam, linhas }, texto) => {
        const cor = sortear(CORES);
        const total = [...linhas.join("")].length;
        const passo = Math.max(1, Math.ceil(total / 18));
        const quadros = [];
        for (let n = passo; n < total + passo; n += passo) {
            const mostrar = Math.min(n, total);
            quadros.push(() => {
                let restante = mostrar;
                const parciais = linhas.map(l => {
                    const letras = [...l];
                    const pega = Math.max(0, Math.min(letras.length, restante));
                    restante -= pega;
                    return letras.slice(0, pega).join("");
                });
                // mantém as linhas no lugar certo (alinha pelo texto completo)
                const alturaLinha = tam * 1.12;
                const topo = (TAM - alturaLinha * linhas.length) / 2 + alturaLinha / 2;
                ctx.font = `bold ${tam}px ${fonte()}`;
                linhas.forEach((cheia, i) => {
                    if (!parciais[i]) return;
                    const larguraCheia = ctx.measureText(cheia).width;
                    const x0 = (TAM - larguraCheia) / 2;
                    ctx.save();
                    ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
                    ctx.lineWidth = Math.max(6, tam * 0.08); ctx.strokeStyle = "#000"; ctx.strokeText(parciais[i], x0, topo + i * alturaLinha);
                    ctx.fillStyle = cor; ctx.fillText(parciais[i], x0, topo + i * alturaLinha);
                    ctx.restore();
                });
            });
        }
        for (let k = 0; k < 6; k++) quadros.push(quadros[quadros.length - 1]); // segura o texto pronto
        return { quadros, fps: 8 };
    },
    // 5️⃣ onda
    5: (ctx, { tam, linhas }) => {
        const ordem = embaralhar(CORES);
        const quadros = [];
        const N = 12;
        for (let f = 0; f < N; f++) {
            quadros.push(() => desenharBloco(ctx, linhas, tam, (c, i) => ({
                dy: Math.sin((i * 0.7) + (f / N) * Math.PI * 2) * tam * 0.16,
                cor: ordem[i % ordem.length], contorno: "#000000"
            })));
        }
        return { quadros, fps: 10 };
    }
};

const NOMES = { 1: "PISCA-PISCA", 2: "ARCO-ÍRIS", 3: "NEON", 4: "DIGITANDO", 5: "ONDA" };

// ───────────── gera o WebP animado ─────────────
function rodarFfmpeg(args) {
    return new Promise((resolve, reject) => {
        const p = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
        let erro = "";
        p.stderr.on("data", d => { erro += d.toString(); if (erro.length > 4000) erro = erro.slice(-4000); });
        p.on("error", e => reject(e.code === "ENOENT" ? new Error("ffmpeg não está instalado (no Termux: pkg install ffmpeg).") : e));
        p.on("close", code => code === 0 ? resolve() : reject(new Error("ffmpeg falhou: " + erro.split("\n").slice(-4).join(" ").trim())));
    });
}

// Junta os quadros f_000.png, f_001.png... (com transparência) numa figurinha animada de até ~480 KB.
// 1) cada quadro vira um WebP parado; 2) o node-webpmux junta tudo e LIMPA o quadro anterior
//    (sem isso, as letras antigas ficariam "fantasmas" por baixo).
async function montarWebpAnimado(pasta, total, fps) {
    const { Image } = require("node-webpmux");
    let melhor = null;
    // se ainda ficar grande demais pro WhatsApp (~500 KB), usa metade dos quadros (mais devagar, mais leve)
    for (const passo of [1, 2, 3]) {
        const usar = [];
        for (let i = 0; i < total; i += passo) usar.push(i);
        for (const q of [60, 45, 30, 20, 10]) {
            const lista = path.join(pasta, "lista.txt");
            fs.writeFileSync(lista, usar.map(i => `file '${path.join(pasta, `f_${String(i).padStart(3, "0")}.png`)}'`).join("\n"));
            await rodarFfmpeg([
                "-y", "-f", "concat", "-safe", "0", "-i", lista,
                "-vf", `scale=${TAM}:${TAM}:flags=lanczos,format=yuva420p`,
                "-c:v", "libwebp", "-lossless", "0", "-q:v", String(q), "-compression_level", "4",
                "-f", "image2", "-start_number", "0", ...semSincronia(), path.join(pasta, "q_%03d.webp")
            ]);
            const frames = [];
            for (let k = 0; k < usar.length; k++) {
                const buf = fs.readFileSync(path.join(pasta, `q_${String(k).padStart(3, "0")}.webp`));
                frames.push(await Image.generateFrame({ buffer: buf, delay: Math.round((1000 / fps) * passo), blend: false, dispose: true }));
            }
            melhor = await Image.save(null, { frames, width: TAM, height: TAM, loops: 0, bgColor: [0, 0, 0, 0] });
            if (melhor.length <= 480 * 1024) return melhor;
        }
    }
    return melhor;
}

async function gerarWebp(texto, estilo) {
    const montar = ESTILOS[estilo] || ESTILOS[1];
    const medidor = createCanvas(TAM, TAM).getContext("2d");
    const ajuste = ajustar(medidor, texto);

    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "attp-"));
    try {
        const canvas = createCanvas(TAM, TAM);
        const ctx = canvas.getContext("2d");
        const { quadros, fps } = montar(ctx, ajuste, texto);
        for (let i = 0; i < quadros.length; i++) {
            ctx.clearRect(0, 0, TAM, TAM);
            quadros[i]();
            fs.writeFileSync(path.join(pasta, `f_${String(i).padStart(3, "0")}.png`), canvas.toBuffer("image/png"));
        }
        return await montarWebpAnimado(pasta, quadros.length, fps);
    } finally {
        try { fs.rmSync(pasta, { recursive: true, force: true }); } catch {}
    }
}

// ───────────── o comando ─────────────
function textoDaMensagem(msg, args) {
    let t = (args || []).join(" ").trim();
    if (t) return t;
    const citada = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    return String(citada?.conversation || citada?.extendedTextMessage?.text || citada?.imageMessage?.caption || citada?.videoMessage?.caption || "").trim();
}

async function responder(sock, from, msg, titulo, linhas) {
    try {
        const { enviarMensagemPadrao } = require("../menuBotoes/menuBotoes");
        return await enviarMensagemPadrao(sock, from, { titulo: ` ${titulo} `, linhas, quoted: msg });
    } catch {
        return sock.sendMessage(from, { text: `『 ✦ 』 ${titulo} 『 ✦ 』\n${[].concat(linhas).join("\n")}` }, { quoted: msg });
    }
}

async function attp(sock, msg, args, estilo = 1) {
    const from = msg.key.remoteJid;
    const cmd = estilo === 1 ? "attp" : `attp${estilo}`;
    const texto = textoDaMensagem(msg, args);

    if (!texto) {
        return responder(sock, from, msg, "✨ ATTP — TEXTO EM FIGURINHA", [
            `Escreva o texto depois do comando:`,
            `${config.PREFIX}${cmd} seu texto aqui`,
            "",
            `${config.PREFIX}attp  → pisca-pisca colorido`,
            `${config.PREFIX}attp2 → arco-íris`,
            `${config.PREFIX}attp3 → neon pulsante`,
            `${config.PREFIX}attp4 → digitando`,
            `${config.PREFIX}attp5 → onda`
        ]);
    }
    if ([...texto].length > LIMITE_TEXTO) {
        return responder(sock, from, msg, "⚠️ TEXTO GRANDE DEMAIS", [`Use no máximo ${LIMITE_TEXTO} letras. O seu tem ${[...texto].length}.`]);
    }

    try { await sock.sendPresenceUpdate("composing", from); } catch {}
    try {
        const webp = await gerarWebp(texto, estilo);
        return await sock.sendMessage(from, { sticker: webp }, { quoted: msg });
    } catch (erro) {
        console.error(`❌ ${cmd}:`, erro?.message || erro);
        return responder(sock, from, msg, "❌ NÃO CONSEGUI CRIAR", [String(erro?.message || erro).slice(0, 180)]);
    }
}

module.exports = {
    attp: (sock, msg, args) => attp(sock, msg, args, 1),
    attp2: (sock, msg, args) => attp(sock, msg, args, 2),
    attp3: (sock, msg, args) => attp(sock, msg, args, 3),
    attp4: (sock, msg, args) => attp(sock, msg, args, 4),
    attp5: (sock, msg, args) => attp(sock, msg, args, 5),
    gerarWebp, montarWebpAnimado, rodarFfmpeg, TAM, NOMES
};
