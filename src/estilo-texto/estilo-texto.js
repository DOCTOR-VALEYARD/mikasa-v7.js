/* =================================================
   ᴍɪᴋᴀꜱᴀ ʙᴏᴛ — ESTILO DE TEXTO
   Tudo que o bot envia sai SEM caixinhas (╭─╮ │ ╰) e com letras
   unicode pequeninhas (ᴀʙᴄ). Funciona em qualquer mensagem, menu,
   botão e lista, sem precisar mexer nos comandos.
   • Não mexe em: links, @menções, `código`, comandos (.menu), números/emojis.
   • Desligar: config.ESTILO_TEXTO = false
================================================= */
const config = require("../../config");

const MAPA = {
    a: "ᴀ", b: "ʙ", c: "ᴄ", d: "ᴅ", e: "ᴇ", f: "ꜰ", g: "ɢ", h: "ʜ", i: "ɪ", j: "ᴊ", k: "ᴋ", l: "ʟ", m: "ᴍ",
    n: "ɴ", o: "ᴏ", p: "ᴘ", q: "ǫ", r: "ʀ", s: "ꜱ", t: "ᴛ", u: "ᴜ", v: "ᴠ", w: "ᴡ", x: "x", y: "ʏ", z: "ᴢ"
};

const BORDA = "╭╮╰╯│┃┏┓┗┛┌┐└┘├┤┬┴┼╔╗╚╝║╠╣╦╩╬┣┫";
const LINHA = "─═━┈┄┅┉┇┆┊╌╍▬▭┷┯";
const RE_SO_DECOR = new RegExp(`^[\\s${BORDA}${LINHA}*_~•·\\-]*$`);
const RE_RUN = new RegExp(`[${LINHA}]{2,}`, "g");
const RE_BORDA_INI = new RegExp(`^[ \\t]*[${BORDA}][${LINHA}]*[ \\t]*`);
const RE_BORDA_FIM = new RegExp(`[ \\t]*[${BORDA}${LINHA}]+[ \\t]*$`);

function pequeno(txt) {
    let saida = "";
    for (const ch of txt.normalize("NFD")) {
        const l = ch.toLowerCase();
        saida += (l.length === 1 && MAPA[l]) ? MAPA[l] : ch;
    }
    return saida.normalize("NFC");
}

// protege trechos que NÃO devem virar letrinha
const RE_PROTEGIDO_BASE = /```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+|www\.\S+|@\d{5,}|(?:^|(?<=\s))[.!\/#$][A-Za-zÀ-ÿ0-9_]+|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\b[\w-]+(?:\.[\w-]+)*\.(?:com|me|net|org|br|io|gg|link|app)\b\S*/g;

// nomes que NÃO devem virar letrinha (nome do bot e do dono, vindos do config)
let _nomes = "", _re = null;
function regexProtegido() {
    const nomes = [config.BOT_NAME, config.OWNER_NAME].filter(n => typeof n === "string" && n.trim());
    const chave = nomes.join("|");
    if (_re && chave === _nomes) return _re;
    _nomes = chave;
    const esc = nomes.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length);
    const base = RE_PROTEGIDO_BASE.source;
    _re = new RegExp(esc.length ? `${esc.join("|")}|${base}` : base, "g");
    return _re;
}

function letrinhas(txt) {
    let r = "", ult = 0, m;
    const RE_PROTEGIDO = regexProtegido();
    RE_PROTEGIDO.lastIndex = 0;
    while ((m = RE_PROTEGIDO.exec(txt))) {
        r += pequeno(txt.slice(ult, m.index)) + m[0];
        ult = m.index + m[0].length;
    }
    return r + pequeno(txt.slice(ult));
}

function semCaixinha(txt) {
    const linhas = String(txt).split("\n");
    const out = [];
    let abriu = false;
    for (let linha of linhas) {
        const temDecor = new RegExp(`[${BORDA}${LINHA}]`).test(linha);
        if (!temDecor) { out.push(linha); continue; }
        const eraTopo = new RegExp(`^[ \\t]*[╭┏╔┌]`).test(linha);
        let l = linha.replace(RE_BORDA_INI, "").replace(RE_BORDA_FIM, "").replace(RE_RUN, " ").replace(new RegExp(`[${BORDA}]`, "g"), " ").trim();
        if (RE_SO_DECOR.test(l) && !/[\p{L}\p{N}]/u.test(l)) { if (eraTopo) abriu = true; out.push(""); continue; }
        out.push((eraTopo || abriu) && !/👀/.test(l) ? `👀 ${l}` : l);
        abriu = false;
    }
    return out.join("\n").replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").replace(/^\n+|\n+$/g, "");
}

function estilizar(txt) {
    if (typeof txt !== "string" || !txt) return txt;
    try { return letrinhas(semCaixinha(txt)); } catch { return txt; }
}

const CHAVES_TEXTO = new Set([
    "text", "caption", "footer", "title", "description", "buttonText", "displayText", "display_text",
    "hydratedContentText", "hydratedFooterText", "hydratedTitleText", "contentText", "footerText", "name_label"
]);
const CHAVES_JSON = new Set(["buttonParamsJson", "paramsJson"]);

function percorrer(obj, prof = 0) {
    if (!obj || typeof obj !== "object" || prof > 12 || Buffer.isBuffer(obj) || obj instanceof Uint8Array) return obj;
    if (Array.isArray(obj)) return obj.map(o => percorrer(o, prof + 1));
    const novo = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === "string" && CHAVES_TEXTO.has(k)) novo[k] = estilizar(v);
        else if (typeof v === "string" && CHAVES_JSON.has(k)) {
            try { novo[k] = JSON.stringify(percorrer(JSON.parse(v), prof + 1)); } catch { novo[k] = v; }
        } else if (v && typeof v === "object") novo[k] = percorrer(v, prof + 1);
        else novo[k] = v;
    }
    return novo;
}

function estilizarConteudo(c) {
    if (!c || typeof c !== "object") return c;
    if (c.react || c.delete || c.sticker || c.audio || c.poll || c.forward || c.disappearingMessagesInMessage) return c;
    return percorrer(c);
}

function instalar(sock) {
    if (!sock || sock.__estiloTextoInstalado || config.ESTILO_TEXTO === false) return;
    sock.__estiloTextoInstalado = true;
    const enviar = sock.sendMessage.bind(sock);
    sock.sendMessage = (jid, conteudo, ...resto) => enviar(jid, estilizarConteudo(conteudo), ...resto);
    if (typeof sock.relayMessage === "function") {
        const relay = sock.relayMessage.bind(sock);
        sock.relayMessage = (jid, message, opts) => relay(jid, percorrer(message), opts);
    }
}

module.exports = { instalar, estilizar, semCaixinha, letrinhas };
