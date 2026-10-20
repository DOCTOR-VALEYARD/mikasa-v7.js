/* =================================================
   📢 MIKASA BOT — CITAR / CITA
   📁 Arquivo: citar.js

   Marca TODO MUNDO do grupo sem listar os nomes (marcação invisível).

   Como funciona:
   1) Marcando (respondendo) uma mensagem com o comando
        → o bot pega EXATAMENTE aquela mensagem e reenvia marcando
          todo mundo. Funciona com texto, áudio, foto, vídeo, GIF,
          figurinha e documento. O reenvio sai respondendo a mensagem
          original, pra todo mundo saber qual é.
   2) Escrevendo texto junto com o comando
        → citar bom dia pessoal  → reenvia "bom dia pessoal" marcando todos.
   3) Só o comando, sem nada marcado e sem texto
        → manda um aviso padrão marcando todos.

   O comando funciona como "citar" e também como "cita" (sem o R).
================================================= */

const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const TEXTO_PADRAO = "📢 Atenção de todos os membros.";

// Tira os "embrulhos" (mensagem temporária, visualização única...)
// pra chegar no conteúdo de verdade.
function desembrulhar(message) {
    let m = message;
    for (let i = 0; i < 6 && m; i++) {
        const interno =
            m.ephemeralMessage?.message ||
            m.viewOnceMessage?.message ||
            m.viewOnceMessageV2?.message ||
            m.viewOnceMessageV2Extension?.message ||
            m.documentWithCaptionMessage?.message ||
            null;
        if (!interno) break;
        m = interno;
    }
    return m || null;
}

// Acha a mensagem que foi marcada (respondida) junto com o comando.
function pegarMensagemMarcada(msg) {
    const base = desembrulhar(msg.message);
    if (!base) return null;
    let contexto = null;
    for (const valor of Object.values(base)) {
        if (valor && typeof valor === "object" && valor.contextInfo?.quotedMessage) {
            contexto = valor.contextInfo;
            break;
        }
    }
    if (!contexto) return null;
    const conteudo = desembrulhar(contexto.quotedMessage);
    if (!conteudo) return null;
    return {
        conteudo,
        stanzaId: contexto.stanzaId,
        participante: contexto.participant
    };
}

async function baixarBuffer(parte, tipo) {
    const stream = await downloadContentFromMessage(parte, tipo);
    const pedacos = [];
    for await (const pedaco of stream) pedacos.push(pedaco);
    return Buffer.concat(pedacos);
}

// Monta o conteúdo a reenviar (com as marcações) a partir da mensagem marcada.
async function montarReenvio(conteudo, mencoes) {
    const texto = conteudo.conversation || conteudo.extendedTextMessage?.text;
    if (texto) return { text: texto, mentions: mencoes };

    if (conteudo.imageMessage) {
        const buffer = await baixarBuffer(conteudo.imageMessage, "image");
        return { image: buffer, caption: conteudo.imageMessage.caption || "", mentions: mencoes };
    }
    if (conteudo.videoMessage) {
        const buffer = await baixarBuffer(conteudo.videoMessage, "video");
        return {
            video: buffer,
            caption: conteudo.videoMessage.caption || "",
            gifPlayback: conteudo.videoMessage.gifPlayback === true,
            mentions: mencoes
        };
    }
    if (conteudo.audioMessage) {
        const buffer = await baixarBuffer(conteudo.audioMessage, "audio");
        return {
            audio: buffer,
            mimetype: conteudo.audioMessage.mimetype || "audio/ogg; codecs=opus",
            ptt: conteudo.audioMessage.ptt === true,
            mentions: mencoes
        };
    }
    if (conteudo.stickerMessage) {
        const buffer = await baixarBuffer(conteudo.stickerMessage, "sticker");
        return { sticker: buffer, isAnimated: conteudo.stickerMessage.isAnimated === true, mentions: mencoes };
    }
    if (conteudo.documentMessage) {
        const buffer = await baixarBuffer(conteudo.documentMessage, "document");
        return {
            document: buffer,
            mimetype: conteudo.documentMessage.mimetype || "application/octet-stream",
            fileName: conteudo.documentMessage.fileName || "arquivo",
            caption: conteudo.documentMessage.caption || "",
            mentions: mencoes
        };
    }
    return null; // tipo que não dá pra reconstruir (contato, localização, enquete...)
}

async function citar(sock, msg, args, metaGrupo) {
    const from = msg.key.remoteJid;

    try {
        const meta = metaGrupo || await sock.groupMetadata(from);
        const mencoes = (meta.participants || []).map(p => p.id).filter(Boolean);

        const marcada = pegarMensagemMarcada(msg);

        // ── 1) Tem mensagem marcada → reenvia ELA marcando todo mundo ──
        if (marcada) {
            // Mensagem original, pra o reenvio sair respondendo ela.
            const original = marcada.stanzaId ? {
                key: {
                    remoteJid: from,
                    fromMe: false,
                    id: marcada.stanzaId,
                    ...(marcada.participante ? { participant: marcada.participante } : {})
                },
                message: marcada.conteudo
            } : undefined;
            const opcoes = original ? { quoted: original } : {};

            let conteudoReenvio = null;
            try {
                conteudoReenvio = await montarReenvio(marcada.conteudo, mencoes);
            } catch (erro) {
                console.error("⚠️ citar: não consegui baixar a mídia marcada:", erro?.message || erro);
            }

            if (conteudoReenvio) {
                return await sock.sendMessage(from, conteudoReenvio, opcoes);
            }

            // Tipos especiais (contato, localização...) ou mídia que falhou:
            // tenta encaminhar a mensagem como está, marcando todos.
            if (original) {
                try {
                    return await sock.sendMessage(from, { forward: original, mentions: mencoes });
                } catch (erro) {
                    console.error("⚠️ citar: encaminhar também falhou:", erro?.message || erro);
                }
            }
            return await sock.sendMessage(from, {
                text: "❌ Não consegui reenviar essa mensagem. Tente marcar um texto, áudio, foto, vídeo ou figurinha."
            }, { quoted: msg });
        }

        // ── 2) Sem mensagem marcada → usa o texto digitado (ou o aviso padrão) ──
        const texto = (args || []).join(" ").trim() || TEXTO_PADRAO;
        return await sock.sendMessage(from, { text: texto, mentions: mencoes });
    } catch (erro) {
        console.error("Erro no citar:", erro);
        await sock.sendMessage(from, { text: "❌ Não consegui citar os membros agora." }, { quoted: msg }).catch(() => {});
    }
}

module.exports = { citar, pegarMensagemMarcada, montarReenvio };
