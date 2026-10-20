// src/utils-validacao.js - FUNÇÕES AUXILIARES DE VALIDAÇÃO
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/botconfig.json");

function lerDB() {
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        return null;
    }
    try {
        return JSON.parse(fs.readFileSync(dbPath, "utf8"));
    } catch {
        return null;
    }
}

// 🤖 Números do PRÓPRIO bot (preenchido quando ele conecta). O bot é tratado
// como dono: pode usar qualquer comando, até os restritos.
const meusIds = new Set();
function registrarMeuNumero(...ids) {
    for (const id of ids) {
        const n = String(id || "").split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
        if (n) meusIds.add(n);
    }
}

// 👑 Outros números do dono (ex.: o chip reserva). Vêm do config.js (DONOS_EXTRAS)
// e do database/botconfig.json (comando: configurar-bot adddono NUMERO).
function donosExtras(db) {
    let config = {};
    try { config = require("../../config"); } catch {}
    const lista = [...(Array.isArray(config.DONOS_EXTRAS) ? config.DONOS_EXTRAS : []), ...(Array.isArray(db?.DONOS_EXTRAS) ? db.DONOS_EXTRAS : [])];
    return lista.map(n => soNumeros(n)).filter(Boolean);
}

function soNumeros(texto) {
    if (!texto) return "";
    return String(texto).replace(/[^0-9]/g, "");
}

/**
 * ✅ VERSÃO ÚNICA E ROBUSTA — antes existiam 3 versões diferentes desse
 * mesmo tipo de checagem espalhadas pelo projeto (utils-validacao.js,
 * boot.js e validar-dono.js), e todas comparavam só o NÚMERO de telefone.
 * Isso quebra em grupos que o WhatsApp já migrou pro sistema de "lid"
 * (identidade oculta): ali, o participante aparece com um ID que não tem
 * NADA a ver com o número de telefone — então a comparação por número
 * nunca batia, e o bot nunca reconhecia o dono.
 *
 * Agora: aceita um ou vários IDs candidatos (ex: msg.key.participant E
 * msg.key.remoteJid ao mesmo tempo) e compara contra o número de telefone
 * E, se configurado, contra um OWNER_LID (descoberto com o comando
 * ".meuid" — ver src/meuid.js). Basta UM dos candidatos bater com UM dos
 * alvos pra considerar dono.
 *
 * @param {string|string[]} candidatos - um ID ou array de IDs possíveis do remetente
 * @param {string} ownerNumberFallback - número do dono vindo do config.js (usado se não tiver no banco)
 */
function ehDono(candidatos, ownerNumberFallback) {
    const lista = (Array.isArray(candidatos) ? candidatos : [candidatos])
        .filter(Boolean)
        .map(id => soNumeros(String(id).split("@")[0].split(":")[0]));
    if (!lista.length) return false;

    const db = lerDB();
    const numeroDoDono = (db && db.OWNER_NUMBER) || ownerNumberFallback;
    const lidDoDono = db && db.OWNER_LID;

    const alvos = [];
    const numeroLimpo = soNumeros(numeroDoDono);
    if (numeroLimpo) {
        alvos.push(numeroLimpo);
        if (numeroLimpo.length > 10) alvos.push(numeroLimpo.slice(-10));
    }
    const lidLimpo = soNumeros(lidDoDono);
    if (lidLimpo) alvos.push(lidLimpo);
    for (const extra of donosExtras(db)) alvos.push(extra, ...(extra.length > 10 ? [extra.slice(-10)] : []));
    for (const meu of meusIds) alvos.push(meu);

    if (!alvos.length) return false;

    return lista.some(id => alvos.some(alvo => id === alvo || id.endsWith(alvo) || alvo.endsWith(id)));
}

module.exports = { ehDono, lerDB, soNumeros, registrarMeuNumero, donosExtras };
