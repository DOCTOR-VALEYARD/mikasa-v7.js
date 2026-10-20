/* =================================================
   🏷️ MIKASA BOT — METADADOS DE FIGURINHA (nome do pacote + autor)
   📁 Arquivo: figurinha-meta.js

   Quando você toca numa figurinha e escolhe "ver detalhes", o WhatsApp mostra o
   NOME DO PACOTE e o AUTOR. Isso fica gravado DENTRO do arquivo .webp (bloco EXIF).

   O problema: mandar "packname" e "author" no sendMessage NÃO grava nada — o
   Baileys ignora esses campos, então a figurinha do /s saía limpa. Aqui a gente
   grava de verdade no arquivo, sem depender de nenhuma biblioteca extra.

   adicionarMetadados(buffer, { packname, author })  → devolve o webp com a "etiqueta"
   instalar(sock)  → TODA figurinha que o bot enviar sem etiqueta ganha a padrão
                     (nome do bot + dono). Figurinha que já tem etiqueta fica como está.
   Funciona em figurinha parada e animada.
================================================= */

const crypto = require("crypto");
const config = require("../../config");

const TAMANHO_MAXIMO_JSON = 60000;

function ehWebp(buf) {
    return Buffer.isBuffer(buf) && buf.length > 20 &&
        buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP";
}

function lerChunks(buf) {
    const chunks = [];
    let pos = 12;
    while (pos + 8 <= buf.length) {
        const id = buf.toString("ascii", pos, pos + 4);
        const tamanho = buf.readUInt32LE(pos + 4);
        const dados = buf.subarray(pos + 8, Math.min(pos + 8 + tamanho, buf.length));
        chunks.push({ id, dados });
        pos += 8 + tamanho + (tamanho % 2);
    }
    return chunks;
}

function temExif(buf) {
    if (!ehWebp(buf)) return false;
    try { return lerChunks(buf).some(c => c.id === "EXIF" && c.dados.length > 30); } catch { return false; }
}

// largura/altura da imagem quando o arquivo é "simples" (sem bloco VP8X)
function dimensoesDoChunk(chunk) {
    const d = chunk.dados;
    if (chunk.id === "VP8 " && d.length >= 10 && d[3] === 0x9d && d[4] === 0x01 && d[5] === 0x2a) {
        return { largura: d.readUInt16LE(6) & 0x3fff, altura: d.readUInt16LE(8) & 0x3fff, alpha: false };
    }
    if (chunk.id === "VP8L" && d.length >= 5 && d[0] === 0x2f) {
        const bits = d.readUInt32LE(1);
        return { largura: (bits & 0x3fff) + 1, altura: ((bits >> 14) & 0x3fff) + 1, alpha: ((bits >> 28) & 1) === 1 };
    }
    return null;
}

function montarExif({ packname, author, emojis }) {
    const json = {
        "sticker-pack-id": `com.mikasa.bot.${crypto.randomBytes(8).toString("hex")}`,
        "sticker-pack-name": String(packname || "").slice(0, 300),
        "sticker-pack-publisher": String(author || "").slice(0, 1000),
        "emojis": Array.isArray(emojis) && emojis.length ? emojis : ["🎴"]
    };
    const jsonBuf = Buffer.from(JSON.stringify(json), "utf8").subarray(0, TAMANHO_MAXIMO_JSON);
    const cabecalho = Buffer.from([
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    const exif = Buffer.concat([cabecalho, jsonBuf]);
    exif.writeUIntLE(jsonBuf.length, 14, 4);
    return exif;
}

function criarChunk(id, dados) {
    const cab = Buffer.alloc(8);
    cab.write(id, 0, 4, "ascii");
    cab.writeUInt32LE(dados.length, 4);
    return Buffer.concat([cab, dados, dados.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)]);
}

/**
 * Grava nome do pacote e autor dentro da figurinha (.webp).
 * Se algo der errado, devolve a figurinha original sem mexer (nunca quebra o envio).
 */
function adicionarMetadados(buffer, { packname, author, emojis } = {}) {
    try {
        if (!ehWebp(buffer)) return buffer;
        let chunks = lerChunks(buffer).filter(c => c.id !== "EXIF");
        let vp8x = chunks.find(c => c.id === "VP8X");

        if (!vp8x) {
            const imagem = chunks.find(c => c.id === "VP8 " || c.id === "VP8L");
            const dim = imagem && dimensoesDoChunk(imagem);
            if (!dim) return buffer;
            const dados = Buffer.alloc(10);
            const temAlpha = dim.alpha || chunks.some(c => c.id === "ALPH");
            dados[0] = temAlpha ? 0x10 : 0x00;
            dados.writeUIntLE(dim.largura - 1, 4, 3);
            dados.writeUIntLE(dim.altura - 1, 7, 3);
            vp8x = { id: "VP8X", dados };
            chunks.unshift(vp8x);
        }
        vp8x.dados = Buffer.from(vp8x.dados);
        vp8x.dados[0] |= 0x08; // avisa que existe EXIF

        chunks.push({ id: "EXIF", dados: montarExif({ packname, author, emojis }) });

        const corpo = Buffer.concat(chunks.map(c => criarChunk(c.id, c.dados)));
        const cabecalho = Buffer.alloc(12);
        cabecalho.write("RIFF", 0, 4, "ascii");
        cabecalho.writeUInt32LE(corpo.length + 4, 4);
        cabecalho.write("WEBP", 8, 4, "ascii");
        return Buffer.concat([cabecalho, corpo]);
    } catch (erro) {
        console.error("⚠️ figurinha-meta:", erro?.message || erro);
        return buffer;
    }
}

function etiquetaPadrao() {
    return {
        packname: `🎴 ${config.BOT_NAME || "Mikasa Bot"}`,
        author: `👑 ${config.OWNER_NAME || "Dono"}`
    };
}

// Toda figurinha (em buffer) que o bot enviar sem etiqueta recebe a padrão.
function instalar(sock) {
    if (!sock || sock.__figuMetaInstalado) return;
    sock.__figuMetaInstalado = true;
    const enviarOriginal = sock.sendMessage.bind(sock);
    sock.sendMessage = async (jid, conteudo, ...resto) => {
        try {
            if (conteudo && Buffer.isBuffer(conteudo.sticker) && ehWebp(conteudo.sticker) && !temExif(conteudo.sticker)) {
                conteudo = { ...conteudo, sticker: adicionarMetadados(conteudo.sticker, etiquetaPadrao()) };
            }
        } catch {}
        return enviarOriginal(jid, conteudo, ...resto);
    };
}

module.exports = { adicionarMetadados, temExif, instalar, ehWebp };
