/* =================================================
   🔞 MIKASA BOT — ANTI-NSFW (detecção de figurinha +18)
   📁 Arquivo: antinsfw.js

   Liga/desliga por grupo (.antinsfw). Quando ativado, toda FIGURINHA
   enviada no grupo passa por uma análise real de conteúdo adulto (via
   API — não é só "achismo" por tamanho/legenda, é análise de imagem de
   verdade). Se detectar pornografia/nudez explícita, apaga a figurinha
   na hora. Figurinhas normais (beijo, abraço, meme, etc) NÃO são afetadas
   — só conteúdo realmente explícito.

   Precisa de config.NSFW_API_KEY (grátis em https://deepai.org).
   Sem essa chave configurada, o recurso fica desativado (avisa 1x).
================================================= */

const fs = require("fs");
const path = require("path");
const os = require("os");
const https = require("https");
const { exec } = require("child_process");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../../config");
const { getDB, saveDB } = require("../grupo-db/grupo-db");

// 🎚️ Score (0 a 1) a partir do qual considera "conteúdo impróprio".
// Mais alto = mais tolerante (só apaga coisa bem explícita).
const LIMITE_NSFW = 0.82;

let avisoChaveFaltando = false;

// ✅/❌ LIGA-DESLIGA por grupo — comando: .antinsfw
function gerenciarAntiNSFW(chatId) {
    const db = getDB();
    if (!db[chatId]) db[chatId] = {};
    const novoEstado = !db[chatId].antinsfw;
    db[chatId].antinsfw = novoEstado;
    saveDB(db);

    if (novoEstado && !config.NSFW_API_KEY) {
        return `⚠️ *ANTI-NSFW ATIVADO, MAS FALTA CONFIGURAR*\n\nPreciso de uma chave em *config.NSFW_API_KEY* pra analisar as figurinhas de verdade (é grátis, veja no config.js como pegar). Sem isso, o recurso fica ligado mas não faz nada.`;
    }

    return novoEstado
        ? `🔞 *ANTI-NSFW ATIVADO*\n\nToda figurinha com conteúdo adulto explícito enviada aqui será apagada automaticamente.`
        : `❌ *ANTI-NSFW DESATIVADO*\n\nFigurinhas não serão mais analisadas.`;
}

// 📤 Envia o buffer da imagem (jpg) pra API da DeepAI, via multipart manual
// (sem precisar de nenhuma lib nova, só o https nativo do Node).
function consultarApiNSFW(bufferJpg) {
    return new Promise((resolve, reject) => {
        const boundary = "----dvclNSFW" + Date.now();
        const inicio = Buffer.from(
            `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="sticker.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`
        );
        const fim = Buffer.from(`\r\n--${boundary}--\r\n`);
        const corpo = Buffer.concat([inicio, bufferJpg, fim]);

        const req = https.request({
            hostname: "api.deepai.org",
            path: "/api/nsfw-detector",
            method: "POST",
            headers: {
                "api-key": config.NSFW_API_KEY,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": corpo.length
            }
        }, (res) => {
            let data = "";
            res.on("data", (c) => data += c);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    const score = json?.output?.nsfw_score;
                    if (typeof score === "number") resolve(score);
                    else reject(new Error("Resposta inesperada da API: " + data));
                } catch (e) { reject(e); }
            });
        });
        req.on("error", reject);
        req.write(corpo);
        req.end();
    });
}

// 🖼️ Converte qualquer mídia (webp, jpg, png, mp4...) pra .jpg usando
// ffmpeg (já é dependência do projeto por causa da música). Pra vídeo,
// pega um frame lá pelo 1º segundo — suficiente pra analisar o conteúdo.
function converterParaJpg(caminhoOrigem, caminhoJpg, ehVideo) {
    const comando = ehVideo
        ? `ffmpeg -y -ss 00:00:01 -i "${caminhoOrigem}" -frames:v 1 "${caminhoJpg}"`
        : `ffmpeg -y -i "${caminhoOrigem}" "${caminhoJpg}"`;
    return new Promise((resolve, reject) => {
        exec(comando, (erro) => {
            if (erro) return reject(erro);
            resolve();
        });
    });
}

// 🔬 Núcleo da análise: baixa a mídia da mensagem, converte pra jpg,
// consulta a API e devolve o score (0 a 1). Reaproveitado tanto pela
// figurinha quanto pela imagem/vídeo do .antinudes.
async function analisarMidiaDaMensagem(mensagemConteudo, tipoBaileys, ehVideo) {
    const idTemp = Date.now() + "_" + Math.floor(Math.random() * 10000);
    const extensaoOrigem = ehVideo ? "mp4" : (tipoBaileys === "sticker" ? "webp" : "jpg");
    const caminhoOrigem = path.join(os.tmpdir(), `nsfw_${idTemp}.${extensaoOrigem}`);
    const caminhoJpg = path.join(os.tmpdir(), `nsfw_${idTemp}.jpg`);

    try {
        const stream = await downloadContentFromMessage(mensagemConteudo, tipoBaileys);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        fs.writeFileSync(caminhoOrigem, buffer);

        await converterParaJpg(caminhoOrigem, caminhoJpg, ehVideo);
        const bufferJpg = fs.readFileSync(caminhoJpg);
        return await consultarApiNSFW(bufferJpg);
    } finally {
        try { fs.unlinkSync(caminhoOrigem); } catch {}
        try { fs.unlinkSync(caminhoJpg); } catch {}
    }
}

// 🕵️ Chamar pra toda figurinha recebida num grupo. Retorna true se ela
// era imprópria e foi apagada (pra quem chamar saber que já foi tratado).
async function processarFigurinhaNSFW(sock, msg) {
    const from = msg.key.remoteJid;
    if (!from.endsWith("@g.us")) return false;
    if (!msg.message?.stickerMessage) return false;

    const db = getDB();
    if (!db[from]?.antinsfw) return false;
    if (!avisarSeSemChave()) return false;

    try {
        const score = await analisarMidiaDaMensagem(msg.message.stickerMessage, "sticker", false);
        if (score >= LIMITE_NSFW) {
            await sock.sendMessage(from, { delete: msg.key });
            const remetente = msg.key.participant || msg.key.remoteJid;
            await sock.sendMessage(from, {
                text: `┅┄┅┄『 ✦ 』┄┅┄┅┄\n 🔞 *FIGURINHA REMOVIDA*\n┅┄┅┄『 ✦ 』┄┅┄┅┄\nConteúdo adulto detectado e apagado.\n┅┄┅┄『 ✦ 』┄┅┄┅┄`,
                mentions: [remetente]
            });
            return true;
        }
        return false;
    } catch (erro) {
        console.error("❌ Erro ao analisar figurinha (anti-NSFW):", erro?.message || erro);
        return false;
    }
}

function avisarSeSemChave() {
    if (config.NSFW_API_KEY) return true;
    if (!avisoChaveFaltando) {
        avisoChaveFaltando = true;
        console.error("⚠️ Anti-NSFW ativado em algum grupo, mas config.NSFW_API_KEY está vazio — recurso não vai funcionar até configurar.");
    }
    return false;
}

// 🕵️ Analisa IMAGEM ou VÍDEO comum (não figurinha) — usado pelo
// .antinudes em grupo.js. Retorna true/false se é conteúdo impróprio.
async function ehConteudoImproprio(mensagemConteudo, ehVideo) {
    if (!avisarSeSemChave()) return false;
    try {
        const score = await analisarMidiaDaMensagem(mensagemConteudo, ehVideo ? "video" : "image", ehVideo);
        return score >= LIMITE_NSFW;
    } catch (erro) {
        console.error("❌ Erro ao analisar imagem/vídeo (anti-nudes):", erro?.message || erro);
        return false;
    }
}

async function processarMidiaNSFW(sock, msg) {
    const from = msg.key.remoteJid;
    if (!from?.endsWith("@g.us")) return false;

    const db = getDB();
    if (!db[from]?.antinsfw) return false;
    if (!avisarSeSemChave()) return false;

    const conteudo = msg.message?.imageMessage || msg.message?.videoMessage;
    if (!conteudo) return false;

    const ehVideo = !!msg.message?.videoMessage;

    try {
        const score = await analisarMidiaDaMensagem(
            conteudo,
            ehVideo ? "video" : "image",
            ehVideo
        );

        if (score >= LIMITE_NSFW) {
            await sock.sendMessage(from, { delete: msg.key });

            const remetente = msg.key.participant || msg.key.remoteJid;

            await sock.sendMessage(from, {
                text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
 🔞 *MÍDIA REMOVIDA*
┅┄┅┄『 ✦ 』┄┅┄┅┄
Conteúdo adulto detectado e apagado.
┅┄┅┄『 ✦ 』┄┅┄┅┄`,
                mentions: [remetente]
            });

            return true;
        }

        return false;
    } catch (erro) {
        console.error("❌ Erro ao analisar mídia (anti-NSFW):", erro?.message || erro);
        return false;
    }
}

module.exports = {
    gerenciarAntiNSFW,
    processarFigurinhaNSFW,
    processarMidiaNSFW,
    ehConteudoImproprio
};
