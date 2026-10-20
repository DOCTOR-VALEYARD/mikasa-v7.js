/* =================================================
   🎙️ MIKASA BOT — EFEITOS DE VOZ (33 efeitos)
   📁 Arquivo: voz.js

   Responda (marque) um ÁUDIO ou NOTA DE VOZ com o comando do efeito e o
   bot devolve o mesmo áudio com a voz mudada, como nota de voz.
   Qualquer pessoa pode usar. Lista na tela:  <prefixo>voz
   Também funciona assim:  <prefixo>voz esquilo

   Precisa do ffmpeg (o instalar.sh já instala).
   Pra criar um efeito novo é só acrescentar uma linha em EFEITOS.
================================================= */

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../../config");

// Tudo é convertido pra 44100 Hz antes do efeito, pra o cálculo do tom dar certo
// independente do formato do áudio original.
const BASE = "aresample=44100";
// Muda o tom SEM mudar a velocidade (fator > 1 = mais agudo, < 1 = mais grave).
const pitch = (fator) =>
    `${BASE},asetrate=44100*${fator},aresample=44100,atempo=${(1 / fator).toFixed(4)}`;

// categoria: 1 = pessoas / idade, 2 = ambiente, 3 = criativos, 4 = velocidade
const EFEITOS = {
    // ───────── 👥 PESSOAS E IDADE ─────────
    masculino: { cat: 1, emoji: "👨", nome: "Masculino",  filtro: `${pitch(0.84)},equalizer=f=140:t=h:width=200:g=4,equalizer=f=4000:t=h:width=2000:g=-3` },
    feminino:  { cat: 1, emoji: "👩", nome: "Feminino",   filtro: `${pitch(1.22)},equalizer=f=3000:t=h:width=2000:g=3,equalizer=f=120:t=h:width=150:g=-4` },
    crianca:   { cat: 1, emoji: "🧒", nome: "Criança",    filtro: `${pitch(1.55)},equalizer=f=3500:t=h:width=2500:g=3` },
    bebe:      { cat: 1, emoji: "👶", nome: "Bebê",       filtro: `${pitch(1.9)},equalizer=f=4000:t=h:width=3000:g=3,atempo=0.92` },
    idoso:     { cat: 1, emoji: "👴", nome: "Idoso",      filtro: `${pitch(0.92)},tremolo=f=5.5:d=0.45,lowpass=f=4200,atempo=0.9` },
    gigante:   { cat: 1, emoji: "🗿", nome: "Gigante",    filtro: `${pitch(0.55)},volume=1.5,aecho=0.7:0.6:80:0.3` },
    esquilo:   { cat: 1, emoji: "🐿️", nome: "Esquilo",    filtro: pitch(1.7) },
    grave:     { cat: 1, emoji: "🧔", nome: "Grave",      filtro: `${pitch(0.78)},volume=1.3` },
    demonio:   { cat: 1, emoji: "😈", nome: "Demônio",    filtro: `${BASE},asetrate=44100*0.62,aresample=44100,aecho=0.8:0.7:40:0.4` },

    // ───────── 🏔️ AMBIENTE ─────────
    caverna:   { cat: 2, emoji: "🕳️", nome: "Caverna",    filtro: `${BASE},aecho=0.8:0.9:500|1000|1500:0.45|0.35|0.25,lowpass=f=6000` },
    banheiro:  { cat: 2, emoji: "🚿", nome: "Banheiro",   filtro: `${BASE},highpass=f=250,aecho=0.8:0.85:30|50|75:0.45|0.35|0.25` },
    igreja:    { cat: 2, emoji: "⛪", nome: "Igreja",     filtro: `${BASE},aecho=0.8:0.9:80|160|320|640:0.5|0.4|0.3|0.2,lowpass=f=7000` },
    estadio:   { cat: 2, emoji: "🏟️", nome: "Estádio",    filtro: `${BASE},highpass=f=200,aecho=0.8:0.8:120|280|480:0.4|0.3|0.2` },
    tunel:     { cat: 2, emoji: "🚇", nome: "Túnel",      filtro: `${BASE},aecho=0.9:0.6:20|45|120:0.5|0.4|0.3,equalizer=f=800:t=q:width=2:g=4` },
    agua:      { cat: 2, emoji: "🌊", nome: "Debaixo d'água", filtro: `${BASE},lowpass=f=700,vibrato=f=5:d=0.6,aecho=0.8:0.7:100:0.4` },
    megafone:  { cat: 2, emoji: "📢", nome: "Megafone",   filtro: `${BASE},highpass=f=500,lowpass=f=3500,acompressor=threshold=0.05:ratio=10,volume=2` },
    walkie:    { cat: 2, emoji: "📟", nome: "Walkie-talkie", filtro: `${BASE},highpass=f=600,lowpass=f=2800,acrusher=bits=8:mode=lin:aa=1:mix=0.5,volume=1.5` },
    telefone:  { cat: 2, emoji: "☎️", nome: "Telefone antigo", filtro: `${BASE},highpass=f=300,lowpass=f=2400,acompressor=threshold=0.06:ratio=6,volume=1.5` },
    eco:       { cat: 2, emoji: "🏔️", nome: "Eco",        filtro: `${BASE},aecho=0.8:0.88:60|1000:0.4|0.3` },
    radio:     { cat: 2, emoji: "📻", nome: "Rádio",      filtro: `${BASE},highpass=f=400,lowpass=f=3200,acompressor=threshold=0.05:ratio=8,volume=1.4` },

    // ───────── 🎭 CRIATIVOS ─────────
    alien:     { cat: 3, emoji: "👽", nome: "Alienígena", filtro: `${pitch(1.25)},vibrato=f=14:d=0.7,aecho=0.6:0.5:30:0.4` },
    fantasma:  { cat: 3, emoji: "👻", nome: "Fantasma",   filtro: `${pitch(0.85)},tremolo=f=3:d=0.4,aecho=0.8:0.9:400|800:0.5|0.4,lowpass=f=5000` },
    bebado:    { cat: 3, emoji: "🥴", nome: "Bêbado",     filtro: `${BASE},vibrato=f=1.3:d=0.9,atempo=0.85` },
    "8bit":    { cat: 3, emoji: "🕹️", nome: "8-bit (videogame)", filtro: `aresample=8000,acrusher=level_in=1:level_out=1:bits=6:mode=lin:aa=0:samples=8:mix=1,aresample=44100` },
    distorcao: { cat: 3, emoji: "🎸", nome: "Distorção",  filtro: `${BASE},volume=10,asoftclip=type=hard,volume=0.4` },
    reverso:   { cat: 3, emoji: "🔄", nome: "Reverso (de trás pra frente)", filtro: `${BASE},areverse` },
    coral:     { cat: 3, emoji: "🎶", nome: "Coral",      filtro: `${BASE},chorus=0.5:0.9:50|60|40:0.4|0.32|0.3:0.25|0.4|0.3:2|2.3|1.3` },
    dueto:     { cat: 3, emoji: "👯", nome: "Dueto (duas vozes)", filtro: `${BASE},asplit=2[a][b];[b]asetrate=44100*1.25,aresample=44100,atempo=0.8[c];[a][c]amix=inputs=2:duration=first:normalize=0` },
    robo:      { cat: 3, emoji: "🤖", nome: "Robô",       filtro: `${BASE},afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75` },

    // ───────── ⚡ VELOCIDADE ─────────
    vaporwave: { cat: 4, emoji: "🌴", nome: "Vaporwave (lento e grave)", filtro: `${BASE},asetrate=44100*0.75,aresample=44100,aecho=0.8:0.7:60:0.3,lowpass=f=6000` },
    nightcore: { cat: 4, emoji: "⚡", nome: "Nightcore",  filtro: `${BASE},asetrate=44100*1.3,aresample=44100` },
    rapido:    { cat: 4, emoji: "⏩", nome: "Rápido",     filtro: `${BASE},atempo=1.6` },
    lento:     { cat: 4, emoji: "⏪", nome: "Lento",      filtro: `${BASE},atempo=0.65` }
};

const CATEGORIAS = { 1: "👥 PESSOAS E IDADE", 2: "🏔️ AMBIENTE", 3: "🎭 CRIATIVOS", 4: "⚡ VELOCIDADE" };

const DURACAO_MAXIMA_S = 180;      // áudios maiores que isso são recusados
const COOLDOWN_MS = 4000;          // tempo mínimo entre dois efeitos da mesma pessoa
const ultimoUso = new Map();

function menuDeEfeitos() {
    const p = config.PREFIX || "!";
    let texto = `🎙️ *EFEITOS DE VOZ* (${Object.keys(EFEITOS).length})\n\nResponda um *áudio* com o efeito:\n`;
    for (const [cat, titulo] of Object.entries(CATEGORIAS)) {
        const itens = Object.entries(EFEITOS).filter(([, e]) => String(e.cat) === cat);
        texto += `\n*${titulo}*\n` + itens.map(([id, e]) => `${e.emoji} ${p}${id}`).join("\n") + "\n";
    }
    return texto + `\n💡 Também vale: ${p}voz esquilo`;
}

// Nomes de efeito que já são comandos do bot (ex.: um jogo chamado "bebado") não são
// tomados: nesses casos o efeito só funciona assim: <prefixo>voz <efeito>.
function efeitosLivres(textoDoBot) {
    const jaTem = new Set([...String(textoDoBot || "").matchAll(/case\s+["']([^"']+)["']/g)].map(m => m[1].toLowerCase()));
    return Object.keys(EFEITOS).filter(id => !jaTem.has(id));
}

// Acha o áudio: ou a mensagem marcada, ou o próprio áudio.
function acharAudio(msg) {
    const base = msg.message || {};
    const ctx = base.extendedTextMessage?.contextInfo || base.audioMessage?.contextInfo;
    const citada = ctx?.quotedMessage;
    const desembrulhado = citada?.ephemeralMessage?.message || citada?.viewOnceMessage?.message || citada;
    return desembrulhado?.audioMessage || base.audioMessage || null;
}

async function baixarBuffer(audio) {
    const stream = await downloadContentFromMessage(audio, "audio");
    const pedacos = [];
    for await (const p of stream) pedacos.push(p);
    return Buffer.concat(pedacos);
}

function rodarFfmpeg(args) {
    return new Promise((resolve, reject) => {
        execFile("ffmpeg", args, { timeout: 60000, maxBuffer: 1024 * 1024 * 10 }, (erro, _out, stderr) => {
            if (erro) {
                const detalhe = String(stderr || erro.message || "").trim().split("\n").slice(-3).join(" | ");
                return reject(new Error(detalhe.slice(0, 400) || "ffmpeg falhou"));
            }
            resolve();
        });
    });
}

function apagar(...arquivos) {
    for (const a of arquivos) { try { fs.unlinkSync(a); } catch {} }
}

async function aplicarEfeito(bufferEntrada, filtro) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const entrada = path.join(__dirname, `voz_in_${id}`);
    const saidaOgg = path.join(__dirname, `voz_out_${id}.ogg`);
    const saidaMp3 = path.join(__dirname, `voz_out_${id}.mp3`);
    fs.writeFileSync(entrada, bufferEntrada);

    try {
        // 1ª opção: nota de voz (opus)
        try {
            await rodarFfmpeg(["-y", "-i", entrada, "-vn", "-af", filtro,
                "-c:a", "libopus", "-b:a", "48k", "-ar", "48000", "-ac", "1", "-f", "ogg", saidaOgg]);
            return { buffer: fs.readFileSync(saidaOgg), mimetype: "audio/ogg; codecs=opus", ptt: true };
        } catch (erroOpus) {
            // 2ª opção: MP3 (se esse ffmpeg não tiver opus)
            await rodarFfmpeg(["-y", "-i", entrada, "-vn", "-af", filtro,
                "-c:a", "libmp3lame", "-b:a", "96k", "-ac", "1", saidaMp3]);
            return { buffer: fs.readFileSync(saidaMp3), mimetype: "audio/mpeg", ptt: false };
        }
    } finally {
        apagar(entrada, saidaOgg, saidaMp3);
    }
}

async function voz(sock, msg, command, args) {
    const from = msg.key.remoteJid;
    const responder = (texto) => sock.sendMessage(from, { text: texto }, { quoted: msg });

    // Qual efeito? (esquilo, grave...) ou "voz esquilo"
    let efeitoId = String(command || "").toLowerCase();
    if (efeitoId === "voz" || efeitoId === "efeitovoz" || efeitoId === "vozes") {
        efeitoId = String(args?.[0] || "").toLowerCase();
    }
    if (!EFEITOS[efeitoId]) return responder(menuDeEfeitos());

    const audio = acharAudio(msg);
    if (!audio) {
        return responder(`🎙️ Responda (marque) um *áudio* ou nota de voz com *${config.PREFIX}${efeitoId}*.`);
    }
    if (Number(audio.seconds || 0) > DURACAO_MAXIMA_S) {
        return responder(`⏱️ Esse áudio é muito longo. O máximo é ${DURACAO_MAXIMA_S / 60} minutos.`);
    }

    const quem = msg.key.participant || from;
    if (Date.now() - (ultimoUso.get(quem) || 0) < COOLDOWN_MS) {
        return responder("⏳ Calma, espera uns segundos antes do próximo efeito.");
    }
    ultimoUso.set(quem, Date.now());

    try { await sock.sendPresenceUpdate("recording", from); } catch {}

    try {
        const entrada = await baixarBuffer(audio);
        const efeito = EFEITOS[efeitoId];
        const saida = await aplicarEfeito(entrada, efeito.filtro);
        return await sock.sendMessage(from, {
            audio: saida.buffer,
            mimetype: saida.mimetype,
            ptt: saida.ptt
        }, { quoted: msg });
    } catch (erro) {
        console.error("Erro no efeito de voz:", erro?.message || erro);
        const semFfmpeg = /ENOENT|not found/i.test(String(erro?.message));
        return responder(semFfmpeg
            ? "❌ O ffmpeg não está instalado. No Termux: pkg install ffmpeg"
            : "❌ Não consegui aplicar o efeito nesse áudio.");
    }
}

module.exports = { voz, EFEITOS, aplicarEfeito, efeitosLivres };
