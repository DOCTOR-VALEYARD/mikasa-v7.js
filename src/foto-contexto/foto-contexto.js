/* =================================================
   📸 MIKASA BOT — FOTO DE CONTEXTO (pra usar nos cards)
   📁 Arquivo: foto-contexto.js

   Busca a foto que deve aparecer no cantinho de QUALQUER card:
   - Se o comando foi chamado dentro de um GRUPO -> foto do grupo
   - Se foi chamado no PV -> foto de perfil da própria pessoa
   Como "from" já é o JID certo em ambos os casos (grupo ou pessoa),
   é só pedir a foto de perfil dele mesmo — funciona pros dois.

   ⚡ VELOCIDADE: a foto fica guardada em memória por alguns minutos
   (antes era buscada no WhatsApp e baixada de novo a cada card) e a
   busca tem limite de tempo, para um servidor lento não travar o card.
================================================= */

const { baixarBuffer } = require("../cardGenerator/cardGenerator");

const TEMPO_CACHE_FOTO = 10 * 60 * 1000;   // foto encontrada: 10 min
const TEMPO_CACHE_SEM_FOTO = 2 * 60 * 1000; // sem foto/erro: 2 min
const LIMITE_BUSCA_FOTO = 6000;             // 6 s no máximo

const cacheFotos = new Map(); // jid -> { buffer, expira }

function comLimite(promessa, ms) {
    return Promise.race([
        promessa,
        new Promise((_, rejeitar) => setTimeout(() => rejeitar(new Error("tempo esgotado")), ms))
    ]);
}

async function buscarFotoContexto(sock, from) {
    const guardada = cacheFotos.get(from);
    if (guardada && guardada.expira > Date.now()) return guardada.buffer;

    try {
        const buffer = await comLimite(
            (async () => {
                const url = await sock.profilePictureUrl(from, "image");
                return await baixarBuffer(url);
            })(),
            LIMITE_BUSCA_FOTO
        );
        cacheFotos.set(from, { buffer, expira: Date.now() + TEMPO_CACHE_FOTO });
        return buffer;
    } catch {
        // sem foto (grupo/pessoa sem foto definida) ou lento demais — os cards já lidam bem com isso
        cacheFotos.set(from, { buffer: null, expira: Date.now() + TEMPO_CACHE_SEM_FOTO });
        return null;
    }
}

module.exports = { buscarFotoContexto };
