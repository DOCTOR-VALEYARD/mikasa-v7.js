/* =================================================
   💘 MIKASA BOT — ANTI-AMOR
   📁 Arquivo: antiamor.js

   Quando alguém manda uma palavra carinhosa (amor, meu bem, minha
   vida, benzinho, te amo...) o bot responde com um ÁUDIO sorteado da
   pasta  src/midias/audios/antiamor  marcando a pessoa.

   🎵 ÁUDIOS
   - Pode colocar quantos quiser, com qualquer nome. O bot sorteia um
     (sem repetir o mesmo dois seguidos) usando o audio-pastas.js.
   - Dá pra subir pelo próprio bot: configurar-bot → SUBIR ÁUDIO →
     ANTI-AMOR (o nome do arquivo é criado sozinho), ou colocar os
     arquivos direto na pasta.
   - Pra apagar: configurar-bot → APAGAR ÁUDIO → ANTI-AMOR.

   ⚙️ LIGAR / DESLIGAR (por grupo, vem DESLIGADO)
   - <prefixo>antiamor on   /   <prefixo>antiamor off

   🛡️ COOLDOWN: a mesma pessoa no mesmo chat só dispara de novo depois
   de alguns minutos, pra não virar spam.
================================================= */

const { enviarAudioDaPasta } = require("../audio-pastas/audio-pastas");
const { getDB } = require("../grupo-db/grupo-db");

// 🧬 PADRÕES (abreviações, gírias e jeitos de escrever da galera nova).
// São expressões regulares sobre o texto SEM acento e em minúsculo. O texto é
// testado em várias versões: normal, com letras repetidas encurtadas
// ("amooor" → "amor"), com números trocados por letras ("4m0r" → "amor") e com
// letras separadas ("a m o r" → "amor"). Já aceita estar no MEIO de qualquer frase.
const PADROES_CARINHOSOS = [
    // amor e variações
    "amr+", "amor(?:zinho|zinha|zao|zona|es)?", "mor", "mozao|mzao|mozaum|mozinho|mozinha|mozaozinho",
    "bb|bbz|bbzinho|bby|bbzin|babe|baby|bebezinho|bebezao",
    // "te amo" / "te quero" / "te adoro" escritos de vários jeitos
    "(?:te|ti|ta)\\s*(?:amo+|amu+)", "t\\s+(?:amo+|amu+)", "t[kq]m(?:m+|t|uito)?", "t[qk]\\s*muito",
    "(?:te|ti|t)\\s*(?:quero|qro|kero|qero)", "(?:te|ti|t)\\s*adoro", "adoro\\s*(?:vc|voce|oce|tu)",
    "amo\\s*(?:muito\\s*)?(?:vc|voce|oce|tu|v\\s*c)", "amo-te|amote",
    "love\\s*(?:you|u|vc)|i\\s*love\\s*(?:you|u|vc)|ily|lov\\s*u|luv\\s*u|meu\\s+love",
    // saudade / falta
    "saudades?", "sdd+s*", "sinto\\s+(?:a\\s+)?(?:sua|tua)\\s+falta", "sinto\\s+falta\\s+de\\s+(?:vc|voce|oce|tu)",
    // beijos e carinho
    "beijos?", "beijinhos?", "beijao", "beijocas?", "bjs", "bjo+s?", "bjao", "bjocas?", "bjkas?", "bjinhos?",
    "abracao", "carinho(?:so|sa)?",
    // apelidos
    "meu\\s+(?:bem|anjo|rei|amor|bb|bebe|mozao|principe|tesouro|coracao|querido|lindo|nego|docinho|xodo|mundo|dengo|fofo|gatinho)",
    "minha\\s+(?:vida|vidinha|princesa|rainha|paixao|querida|linda|nega|flor|joia|bb|amor|metade|gatinha|fofa|lindinha)",
    "vida\\s+minha", "(?:oi+|oie|ola|eai|e\\s*ai|fala|opa|bom\\s*dia|boa\\s*tarde|boa\\s*noite|bdia|bd)[,!.\\s]+(?:minha\\s+)?vida", "vidinha", "coracaozinho|coracaozao", "benzinho|benzao|benzoca",
    "queridinh[oa]", "lindinh[oa]", "fofinh[oa]", "gatinh[oa]", "docinho", "xuxu", "xodo", "dengo(?:sa|so)?",
    // paixão e namoro
    "apaixonad[oa]s?", "paixao", "paixonite", "namorad[oa]", "namorar", "casar\\s+comigo"
];

// Palavras soltas (as da versão anterior). Escreva sem acento e em minúsculo.
const PALAVRAS_CARINHOSAS = [
    "amor", "meu amor", "minha vida", "te amo", "te adoro", "te quero", "amo voce", "amo vc",
    "meu bem", "meu anjo", "minha princesa", "meu principe", "meu rei", "minha rainha",
    "saudade", "saudades", "beijinho", "beijinhos", "beijao", "carinho", "baby", "benzinho", "mozao"
];

// ⏱️ Tempo mínimo entre dois áudios pra MESMA pessoa no MESMO chat.
const COOLDOWN_MS = 5 * 60 * 1000;

const PASTA_AUDIOS = "antiamor";

function tirarAcentos(texto) {
    return String(texto || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function escaparRegex(t) {
    return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Cria as várias versões do texto que serão testadas.
function versoesDoTexto(original) {
    const cru = String(original || "").slice(0, 6000).toLowerCase();
    const base = tirarAcentos(cru).replace(/\s+/g, " ").trim();
    const repetidas3 = base.replace(/(.)\1{2,}/g, "$1$1");   // amooor → amoor
    const repetidas2 = base.replace(/(.)\1+/g, "$1");         // amoor → amor
    const numeros = base.replace(/[04@$3]/g, c => ({ "0": "o", "4": "a", "@": "a", "$": "s", "3": "e" }[c])); // 4m0r → amor
    const numerosCompactos = numeros.replace(/(.)\1+/g, "$1");
    // letras separadas: "a m o r", "a.m.o.r", "a-m-o-r"
    const separadas = base.replace(/(?<![a-z])(?:[a-z][\s._-]+){2,}[a-z](?![a-z])/g, m => m.replace(/[\s._-]+/g, ""));
    return [...new Set([base, repetidas3, repetidas2, numeros, numerosCompactos, separadas])];
}

const REGEX_CARINHO = new RegExp(
    "(?<![a-z0-9])(?:" +
    [
        ...PADROES_CARINHOSOS,
        ...[...PALAVRAS_CARINHOSAS].sort((x, y) => y.length - x.length).map(p => escaparRegex(tirarAcentos(p)).replace(/ /g, "\\s+"))
    ].join("|") +
    ")(?![a-z0-9])"
);

// "mô" só vale COM acento (sem acento "mo" é só uma sílaba) — testado no texto original.
const REGEX_MO = /(?<![\p{L}\p{N}])mô+h?(?![\p{L}\p{N}])/u;

function acharPalavraCarinhosa(texto) {
    const cru = String(texto || "").slice(0, 6000).toLowerCase();
    const mo = cru.match(REGEX_MO);
    if (mo) return mo[0];
    for (const v of versoesDoTexto(texto)) {
        const m = v.match(REGEX_CARINHO);
        if (m) return m[0];
    }
    return null;
}

function temPalavraCarinhosa(texto) {
    return acharPalavraCarinhosa(texto) !== null;
}

const ultimoEnvio = new Map(); // `${chat}::${pessoa}` -> timestamp

async function verificarAntiAmor(sock, msg, body) {
    if (!body || msg?.key?.fromMe) return false;

    const from = msg.key.remoteJid;
    if (!from || !from.endsWith("@g.us")) return false; // só em grupo

    try {
        if (getDB()[from]?.antiamor !== true) return false; // desligado
    } catch {
        return false;
    }

    if (!temPalavraCarinhosa(body)) return false;

    const remetente = msg.key.participant || msg.key.remoteJid;
    const chave = `${from}::${remetente}`;
    const agora = Date.now();
    if (agora - (ultimoEnvio.get(chave) || 0) < COOLDOWN_MS) return false;

    const enviou = await enviarAudioDaPasta(sock, from, PASTA_AUDIOS, {
        mentions: [remetente],
        quoted: msg
    });
    if (enviou) ultimoEnvio.set(chave, agora);
    return enviou; // pasta vazia = não manda nada e não atrapalha o resto
}

module.exports = { verificarAntiAmor, temPalavraCarinhosa, acharPalavraCarinhosa, PALAVRAS_CARINHOSAS, PADROES_CARINHOSOS };
