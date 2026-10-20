/* =================================================
   ☀️ MIKASA BOT — SAUDAÇÕES AUTOMÁTICAS
   📁 Arquivo: saudacoes.js

   Detecta "bom dia", "boa tarde" ou "boa noite" em QUALQUER parte da
   mensagem (começo, meio, fim, maiúsculo ou minúsculo — não importa) e
   responde com um áudio (marcando a pessoa), puxado de uma pastinha
   própria em src/audios/.

   🛡️ COOLDOWN ANTI-SPAM: se a mesma pessoa, no mesmo chat, mandar
   saudação de novo antes do tempo passar, o bot fica quieto (não manda
   áudio de novo). Isso pega até quem varia o texto ("bom dia" / "bom
   dia!" / "bom dia gente") — o filtro geral de mensagem repetida não
   pegaria isso, porque exige texto idêntico.
================================================= */

const { enviarAudioDaPasta } = require("../audio-pastas/audio-pastas");
const { getDB } = require("../grupo-db/grupo-db");

// Ordem importa: "boa noite" antes de checar isoladamente, pra evitar
// qualquer ambiguidade boba entre frases parecidas.
const PADROES = [
    { pasta: "boanoite", regex: /\bboa\s*noite\b/i },
    { pasta: "boatarde", regex: /\bboa\s*tarde\b/i },
    { pasta: "bomdia",   regex: /\bbom\s*dia\b/i },
];

// ⏱️ Tempo mínimo (em ms) entre um áudio de saudação e outro, pra MESMA
// pessoa no MESMO chat. Ajuste aqui se quiser mais ou menos tolerante.
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutos

const ultimoEnvio = new Map(); // chave: `${chatId}::${remetente}::${pasta}` -> timestamp

async function verificarSaudacao(sock, msg, body) {
    if (!body) return false;
    const from = msg.key.remoteJid;
    const remetente = msg.key.participant || msg.key.remoteJid;

    // Desligado por padrão. O administrador ativa com .saudacao on.
    try {
        const db = getDB();
        if (from.endsWith("@g.us") && db[from]?.saudacao !== true) return false;
    } catch {
        return false;
    }

    for (const { pasta, regex } of PADROES) {
        if (regex.test(body)) {
            const chave = `${from}::${remetente}::${pasta}`;
            const agora = Date.now();
            const ultima = ultimoEnvio.get(chave) || 0;

            if (agora - ultima < COOLDOWN_MS) {
                // 🔇 Ainda dentro do cooldown — fica quieto, sem spam
                return false;
            }

            const enviou = await enviarAudioDaPasta(sock, from, pasta, { mentions: [remetente], quoted: msg });
            if (enviou) ultimoEnvio.set(chave, agora);
            return enviou; // se a pasta tava vazia, não trava nada — só não manda
        }
    }
    return false;
}

module.exports = { verificarSaudacao };
