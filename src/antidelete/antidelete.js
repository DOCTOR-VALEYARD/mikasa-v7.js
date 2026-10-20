/* =================================================
   🗑️ MIKASA BOT — ANTI-DELETE
   📁 Arquivo: src/antidelete/antidelete.js

   Guarda cópia (texto, foto, vídeo, áudio, figurinha, documento)
   das mensagens dos chats onde o X9 está ligado e, quando alguém
   apaga pra todos, devolve a MESMA coisa pro chat, curto, com a
   marcação de quem apagou. O liga/desliga (.x9) e a visualização
   única ficam em src/x9/x9.js.
================================================= */

const { proto } = require("@whiskeysockets/baileys");
const { gerenciarX9, x9Ativo, desembrulhar, classificar, baixar, remetenteDe, tamanhoDe } = require("../x9/x9");

const LIMITE_TOTAL_BYTES = 100 * 1024 * 1024; // memória máxima das mídias guardadas
const LIMITE_MIDIA_BYTES = 20 * 1024 * 1024;  // mídia maior que isso não é guardada
const LIMITE_ITENS = 1500;                    // mensagens guardadas (as mais antigas saem)

const cache = new Map(); // `${chat}::${id}` -> dados
let bytesTotal = 0;

function chave(chat, id) { return `${chat}::${id}`; }

const ROTULO = {
    texto: "esta mensagem", imagem: "esta foto", video: "este vídeo",
    audio: "este áudio", figurinha: "esta figurinha", documento: "este arquivo"
};

function guardar(k, dados) {
    cache.set(k, dados);
    bytesTotal += dados.midia ? dados.midia.length : 0;
    while ((bytesTotal > LIMITE_TOTAL_BYTES || cache.size > LIMITE_ITENS) && cache.size > 1) {
        const velha = cache.keys().next().value;
        const d = cache.get(velha);
        bytesTotal -= d?.midia ? d.midia.length : 0;
        cache.delete(velha);
    }
}

// ───────────────────────────────────────────────
// 📥 GUARDA UMA CÓPIA (chamar pra toda mensagem recebida)
// ───────────────────────────────────────────────
async function cachearMensagem(msg, sock) {
    try {
        if (!msg?.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid, id = msg.key.id;
        if (!from || !id || !x9Ativo.get(from)) return; // só guarda onde o X9 está ligado

        const { conteudo, viewOnce } = desembrulhar(msg.message);
        if (viewOnce || conteudo?.protocolMessage) return; // view-once é revelada na hora
        const info = classificar(conteudo);
        if (!info) return;

        let midia = null, falhou = false;
        if (info.tipo !== "texto") {
            const tam = tamanhoDe(info.no);
            if (tam > LIMITE_MIDIA_BYTES) falhou = true;
            else {
                try { midia = await baixar(msg, conteudo, sock); } catch { falhou = true; }
            }
        }
        const quem = remetenteDe(msg);
        guardar(chave(from, id), { ...info, no: undefined, midia, falhou, remetenteJid: quem.jid, remetente: quem.numero, ts: Date.now() });
    } catch (erro) {
        console.error("❌ X9: erro ao guardar mensagem:", erro?.message || erro);
    }
}

// ───────────────────────────────────────────────
// 🗑️ DETECTA "APAGOU PRA TODOS" E MOSTRA DE VOLTA
// Retorna true se a mensagem era um aviso de apagada (já tratada).
// ───────────────────────────────────────────────
async function verificarMensagemApagada(sock, msg) {
    try {
        const { conteudo } = desembrulhar(msg.message);
        const protocolo = conteudo?.protocolMessage;
        const ehRevoke = protocolo && (protocolo.type === proto.Message.ProtocolMessage.Type.REVOKE || protocolo.type === 0);
        if (!ehRevoke) return false;

        const from = protocolo.key?.remoteJid || msg.key.remoteJid;
        const idOriginal = protocolo.key?.id;
        if (!idOriginal) return true;

        const k = chave(from, idOriginal);
        const dados = cache.get(k);
        if (!dados) return true; // não tínhamos guardado — nada a mostrar
        cache.delete(k);
        bytesTotal -= dados.midia ? dados.midia.length : 0;

        if (!x9Ativo.get(from)) return true;

        const apagador = remetenteDe(msg);
        const outro = apagador.numero && apagador.numero !== dados.remetente;
        const rotulo = ROTULO[dados.tipo] || "esta mensagem";
        const cab = outro
            ? `🗑️ @${apagador.numero} apagou ${rotulo} de @${dados.remetente}`
            : `🗑️ @${dados.remetente} apagou ${rotulo}`;
        const mentions = [...new Set([dados.remetenteJid, outro ? apagador.jid : null].filter(Boolean))];
        const legenda = dados.legenda ? `\n\n${dados.legenda}` : "";

        if (dados.tipo === "texto") {
            await sock.sendMessage(from, { text: `${cab}\n\n${dados.texto}`, mentions });
        } else if (!dados.midia) {
            await sock.sendMessage(from, { text: `${cab}${legenda}\n\n_(não consegui recuperar o arquivo)_`, mentions });
        } else if (dados.tipo === "imagem") {
            await sock.sendMessage(from, { image: dados.midia, caption: cab + legenda, mentions });
        } else if (dados.tipo === "video") {
            await sock.sendMessage(from, { video: dados.midia, caption: cab + legenda, mimetype: dados.mimetype, gifPlayback: !!dados.gif, mentions });
        } else if (dados.tipo === "documento") {
            await sock.sendMessage(from, { document: dados.midia, mimetype: dados.mimetype, fileName: dados.nomeArquivo, caption: cab + legenda, mentions });
        } else if (dados.tipo === "audio") {
            await sock.sendMessage(from, { text: cab, mentions });
            await sock.sendMessage(from, { audio: dados.midia, mimetype: dados.mimetype, ptt: !!dados.ptt });
        } else if (dados.tipo === "figurinha") {
            await sock.sendMessage(from, { text: cab, mentions });
            await sock.sendMessage(from, { sticker: dados.midia });
        }
        return true;
    } catch (erro) {
        console.error("❌ X9: erro ao mostrar mensagem apagada:", erro?.message || erro);
        return true;
    }
}

function listarChavesGrupo(remoteJid) {
    const prefixo = `${remoteJid}::`;
    const r = [];
    for (const [k, d] of cache.entries()) if (k.startsWith(prefixo)) r.push({ id: k.slice(prefixo.length), remetente: d.remetente });
    return r;
}

module.exports = { cachearMensagem, verificarMensagemApagada, gerenciarX9, listarChavesGrupo };
