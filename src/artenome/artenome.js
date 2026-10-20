/* =================================================
   🎨 ARTE COM NOME NA IMAGEM — 100% CANVAS, SEM IA
   - .artenome     → desenha o nome grande na foto (imagem parada)
   - .artenomegif  → mesma arte, só que animada (o brilho do gradiente
                     desliza pelo texto e ele pulsa um pouquinho)
   ================================================= */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const config = require('../../config');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { createCanvas } = require('@napi-rs/canvas');
const { carregarImagemComDiagnostico } = require('../cardGenerator/cardGenerator');

function pegarImagemAlvo(msg) {
    const midiaDireta = msg.message?.imageMessage;
    const midiaResposta = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;
    return midiaDireta || midiaResposta || null;
}

async function baixarImagemMsg(midia) {
    const stream = await downloadContentFromMessage(midia, 'image');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
    return buffer;
}

// acha o maior tamanho de fonte que cabe na largura da foto
function calcularFontSize(ctxMedida, texto, W, H) {
    let fontSize = Math.floor(H * 0.22);
    ctxMedida.font = `bold ${fontSize}px sans-serif`;
    while (ctxMedida.measureText(texto).width > W * 0.92 && fontSize > 24) {
        fontSize -= 4;
        ctxMedida.font = `bold ${fontSize}px sans-serif`;
    }
    return fontSize;
}

// desenha o texto estilizado num canvas já com a foto de fundo. Se
// "deslocamentoBrilho" for passado (0 a 1), o brilho do gradiente
// desliza pelo texto — usado na versão animada.
function desenharTextoArte(ctx, texto, W, H, fontSize, escala = 1, deslocamentoBrilho = 0.5) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.05);
    ctx.scale(escala, escala);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px sans-serif`;

    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = fontSize * 0.15;
    ctx.shadowOffsetX = fontSize * 0.04;
    ctx.shadowOffsetY = fontSize * 0.06;

    ctx.lineWidth = fontSize * 0.14;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(texto, 0, 0);

    // gradiente com um "brilho" que desliza (posição controlada por deslocamentoBrilho)
    const largura = W * 0.9;
    const centroX = -largura / 2 + deslocamentoBrilho * largura * 2 - largura / 2;
    const grad = ctx.createLinearGradient(centroX - largura / 2, 0, centroX + largura / 2, 0);
    grad.addColorStop(0, '#ff9d00');
    grad.addColorStop(0.5, '#fff6c8');
    grad.addColorStop(1, '#ffd700');
    ctx.shadowBlur = 0;
    ctx.fillStyle = grad;
    ctx.fillText(texto, 0, 0);
    ctx.restore();
}

const AJUDA_ARTENOME = (comando) => `🌸┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌸
🎨 𝑨𝑹𝑻𝑬 𝑪𝑶𝑴 𝑵𝑶𝑴𝑬
🌸┈┈┈┈┈┈┈┈┈┈┈┈┈┈🌸

Envie uma imagem (ou responda em cima
de uma) junto com:

🌷 ${config.PREFIX}${comando} SeuNome

💡 Coloca o nome bem grande e estilizado
no meio da foto.`;

// ══════════════════════════════════════════════════
// 🖌️ VERSÃO PARADA
// ══════════════════════════════════════════════════
async function artenome(sock, msg, args) {
    const from = msg.key.remoteJid;
    const texto = (args || []).join(' ').trim();
    const midia = pegarImagemAlvo(msg);

    if (!midia || !texto) {
        return sock.sendMessage(from, { text: AJUDA_ARTENOME("artenome") }, { quoted: msg });
    }

    try {
        const bufferImagem = await baixarImagemMsg(midia);
        const img = await carregarImagemComDiagnostico(bufferImagem, "artenome");

        const W = img.width, H = img.height;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);

        const fontSize = calcularFontSize(ctx, texto, W, H);
        desenharTextoArte(ctx, texto, W, H, fontSize, 1, 0.5);

        const resultado = await canvas.encode('jpeg');
        await sock.sendMessage(from, { image: resultado, caption: `🎨 ${texto}` }, { quoted: msg });

    } catch (erro) {
        console.error("❌ Erro em artenome:", erro.message);
        await sock.sendMessage(from, { text: "❌ Não consegui gerar a arte nessa imagem. Tenta com outra foto." }, { quoted: msg });
    }
}

// ══════════════════════════════════════════════════
// 🎬 VERSÃO ANIMADA (gif) — mesma arte, mas o brilho do gradiente
// desliza pelo texto e ele pulsa levemente. Tudo desenhado quadro a
// quadro com canvas e montado em vídeo com ffmpeg, igual os outros
// cards animados do bot.
// ══════════════════════════════════════════════════
async function artenomegif(sock, msg, args) {
    const from = msg.key.remoteJid;
    const texto = (args || []).join(' ').trim();
    const midia = pegarImagemAlvo(msg);

    if (!midia || !texto) {
        return sock.sendMessage(from, { text: AJUDA_ARTENOME("artenomegif") }, { quoted: msg });
    }

    const FRAMES = 14;
    const DURACAO = 1.6; // segundos
    const pastaTemp = path.join(__dirname, `artenomegif_${Date.now()}_${Math.floor(Math.random() * 9999)}`);

    try {
        const bufferImagem = await baixarImagemMsg(midia);
        const img = await carregarImagemComDiagnostico(bufferImagem, "artenomegif");
        const W = img.width, H = img.height;

        // mede o fontSize uma vez só, num canvas descartável
        const canvasMedida = createCanvas(W, H);
        const fontSize = calcularFontSize(canvasMedida.getContext('2d'), texto, W, H);

        fs.mkdirSync(pastaTemp, { recursive: true });

        for (let i = 0; i < FRAMES; i++) {
            const t = i / FRAMES; // 0 → quase 1 (loop fechado)
            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, W, H);

            const escala = 1 + Math.sin(t * Math.PI * 2) * 0.03; // pulso leve
            desenharTextoArte(ctx, texto, W, H, fontSize, escala, t);

            const bufFrame = await canvas.encode('png');
            fs.writeFileSync(path.join(pastaTemp, `f_${String(i).padStart(3, '0')}.png`), bufFrame);
        }

        const saida = path.join(pastaTemp, 'saida.mp4');
        const fps = (FRAMES / DURACAO).toFixed(2);
        await execAsync(`ffmpeg -y -framerate ${fps} -i "${path.join(pastaTemp, 'f_%03d.png')}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -profile:v baseline -level 3.1 -pix_fmt yuv420p -movflags faststart "${saida}"`);

        if (!fs.existsSync(saida)) throw new Error("O ffmpeg não gerou o vídeo final.");

        await sock.sendMessage(from, {
            video: fs.readFileSync(saida),
            gifPlayback: true,
            caption: `🎨 ${texto}`
        }, { quoted: msg });

    } catch (erro) {
        console.error("❌ Erro em artenomegif:", erro.message);
        await sock.sendMessage(from, { text: "❌ Não consegui gerar a arte animada nessa imagem. Tenta com outra foto." }, { quoted: msg });
    } finally {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    }
}

module.exports = { artenome, artenomegif };
