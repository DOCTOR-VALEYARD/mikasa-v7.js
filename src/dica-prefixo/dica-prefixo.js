/* =================================================
   💡 MIKASA BOT — DICA DE PREFIXO / COMANDO ERRADO
   📁 Arquivo: dica-prefixo.js

   1) PREFIXO ERRADO: se alguém usa um comando QUE EXISTE no bot, mas com outro
      prefixo (ex.: o do bot é "/" e a pessoa escreve "!menu"), o bot marca a
      pessoa e diz como se chama do jeito certo:
          @pessoa ❌ Esse comando não funciona assim.
          ✅ O certo é: /menu   (com o prefixo certo do bot)

   2) COMANDO DIGITADO ERRADO: com o prefixo certo, mas com erro de digitação
      ("/menuu", "/pla"), o bot sugere o parecido: "Você quis dizer /menu?".
      Se não existe nada parecido, fica quieto (pode ser comando de outro bot).

   Proteções contra spam (grupo com vários bots): no máximo 1 aviso por pessoa a
   cada 60 s e 6 avisos por minuto em cada chat.
   Desligar:  AVISAR_PREFIXO_ERRADO: false   /   SUGERIR_COMANDO: false  (config.js)
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { RAIZ } = require("../caminhos/caminhos");

const COOLDOWN_PESSOA_MS = 60 * 1000;
const MAX_AVISOS_POR_MINUTO = 6;

// Comandos que existem mas não devem gerar dica (têm fluxo próprio).
const NAO_AVISAR = new Set(["tra", "bu", "gp", "kill"]);

let conhecidos = null;
function comandosDoBot() {
    if (conhecidos) return conhecidos;
    const set = new Set();
    try {
        const texto = fs.readFileSync(path.join(RAIZ, "mikasabot.js"), "utf8");
        for (const m of texto.matchAll(/case\s+["']([^"']+)["']/g)) set.add(m[1].toLowerCase());
        for (const m of texto.matchAll(/command\s*===?\s*["']([^"']+)["']/g)) set.add(m[1].toLowerCase());
    } catch {}
    conhecidos = set;
    return set;
}

function tirarAcentos(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function numeroDe(jid) {
    return String(jid || "").split("@")[0].split(":")[0];
}

// Distância de edição com troca de letras vizinhas ("pla" → "play" = 1, "mneu" → "menu" = 1)
function distancia(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const custo = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
    }
    return d[m][n];
}

// ---------- controle de spam ----------
const ultimoAvisoPorPessoa = new Map();
const avisosPorChat = new Map(); // chat -> [timestamps]

function podeAvisar(chat, pessoa) {
    const agora = Date.now();
    if (agora - (ultimoAvisoPorPessoa.get(`${chat}|${pessoa}`) || 0) < COOLDOWN_PESSOA_MS) return false;
    const recentes = (avisosPorChat.get(chat) || []).filter(t => agora - t < 60000);
    if (recentes.length >= MAX_AVISOS_POR_MINUTO) return false;
    recentes.push(agora);
    avisosPorChat.set(chat, recentes);
    ultimoAvisoPorPessoa.set(`${chat}|${pessoa}`, agora);
    return true;
}

// ---------- 1) prefixo errado ----------
const RE_PREFIXO_ERRADO = /^([^\p{L}\p{N}\s@]{1,2})([\p{L}\p{N}_-]{3,32})(?=\s|$|[.!?,;:])/u;

function detectarPrefixoErrado(body) {
    const m = String(body || "").trim().match(RE_PREFIXO_ERRADO);
    if (!m) return null;
    const simbolo = m[1];
    if (/\p{Extended_Pictographic}/u.test(simbolo)) return null;     // emoji não é prefixo
    if (simbolo.includes(String(config.PREFIX))) return null;        // já é o prefixo certo
    return { simbolo, nome: tirarAcentos(m[2]).toLowerCase() };
}

async function verificarPrefixoErrado(sock, msg, body) {
    if (config.AVISAR_PREFIXO_ERRADO === false) return false;
    const det = detectarPrefixoErrado(body);
    if (!det) return false;
    if (det.nome.length < 3 || NAO_AVISAR.has(det.nome) || !comandosDoBot().has(det.nome)) return false;

    const chat = msg.key.remoteJid;
    const pessoa = msg.key.participant || chat;
    if (!podeAvisar(chat, pessoa)) return false;

    await sock.sendMessage(chat, {
        text: `@${numeroDe(pessoa)} ❌ Esse comando não funciona assim.\n✅ O certo é: *${config.PREFIX}${det.nome}*`,
        mentions: [pessoa]
    }, { quoted: msg });
    return true;
}

// ---------- 2) comando com erro de digitação ----------
async function sugerirComandoParecido(sock, msg, command) {
    if (config.SUGERIR_COMANDO === false) return false;
    const digitado = tirarAcentos(command).toLowerCase();
    const todos = comandosDoBot();
    if (digitado.length < 3 || todos.has(digitado) || NAO_AVISAR.has(digitado)) return false;

    const limite = digitado.length <= 4 ? 1 : 2;
    let melhor = null;
    for (const c of todos) {
        if (c.length < 3 || Math.abs(c.length - digitado.length) > limite) continue;
        const dist = distancia(digitado, c);
        if (dist <= limite && (!melhor || dist < melhor.dist)) melhor = { c, dist };
    }
    if (!melhor) return false;

    const chat = msg.key.remoteJid;
    const pessoa = msg.key.participant || chat;
    if (!podeAvisar(chat, pessoa)) return false;

    await sock.sendMessage(chat, {
        text: `@${numeroDe(pessoa)} ❌ O comando *${config.PREFIX}${digitado}* não existe.\n💡 Você quis dizer *${config.PREFIX}${melhor.c}*?`,
        mentions: [pessoa]
    }, { quoted: msg });
    return true;
}

module.exports = { verificarPrefixoErrado, sugerirComandoParecido, detectarPrefixoErrado, comandosDoBot, distancia };
