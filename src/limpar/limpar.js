const { checarAdminDeUsuarioComMeta, checarBotAdminComMeta } = require("../grupo/grupo");

const fs = require("fs");
const path = require("path");

function primeiroJidValido(...valores) {
    return valores.find(valor => valor && typeof valor === "string") || "";
}

function numeroExtraido(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (!/@(s\.whatsapp\.net|c\.us)$/i.test(texto)) return "";
    const numero = texto.split("@")[0].replace(/\D/g, "");
    return /^\d{8,16}$/.test(numero) ? numero : "";
}

function numeroOuNome(jid, meta, pushName = "", preferirNumero = false) {
    const valor = String(jid || "");
    const participante = (meta?.participants || []).find(p =>
        [p.id, p.lid, p.jid, p.participantAlt, p.phoneNumber, p.phoneNumberJid]
            .filter(Boolean)
            .some(id => String(id) === valor)
    );

    const nome = String(
        pushName || participante?.notify || participante?.name || ""
    ).trim();

    const jidTelefone = [
        participante?.phoneNumber,
        participante?.phoneNumberJid,
        participante?.id,
        participante?.jid,
        participante?.participantAlt,
        jid
    ].find(id => numeroExtraido(id));

    const numero = numeroExtraido(jidTelefone);

    if (preferirNumero && numero) return `+${numero}`;
    return nome || (numero ? `+${numero}` : valor.split("@")[0] || "usuário");
}

function obterMensagemRespondida(msg) {
    const contexto =
        msg?.message?.extendedTextMessage?.contextInfo ||
        msg?.message?.imageMessage?.contextInfo ||
        msg?.message?.videoMessage?.contextInfo ||
        msg?.message?.documentMessage?.contextInfo ||
        msg?.message?.stickerMessage?.contextInfo ||
        {};

    if (!contexto.quotedMessage || !contexto.stanzaId) return null;

    const autor = primeiroJidValido(
        [contexto.participant, contexto.participantAlt]
            .find(id => /@(s\.whatsapp\.net|c\.us)$/i.test(String(id || ""))),
        contexto.participant,
        contexto.participantAlt,
        contexto.remoteJid
    );

    return {
        key: {
            remoteJid: contexto.remoteJid || msg.key.remoteJid,
            id: contexto.stanzaId,
            participant: autor,
            fromMe: Boolean(contexto.fromMe)
        },
        autor
    };
}

async function limpar(sock, msg) {
    const from = msg?.key?.remoteJid;
    if (!from || !from.endsWith("@g.us")) {
        return sock.sendMessage(from, {
            text: "❌ O comando limpar só pode ser usado dentro de grupo."
        }, { quoted: msg });
    }

    try {
        const meta = await sock.groupMetadata(from);
        const sender = primeiroJidValido(
            msg.key.participantAlt,
            msg.key.participant,
            msg.key.remoteJid
        );

        const admin = checarAdminDeUsuarioComMeta(meta, sender, sock) ||
            checarAdminDeUsuarioComMeta(meta, msg.key.participant, sock) ||
            checarAdminDeUsuarioComMeta(meta, msg.key.participantAlt, sock);
        const botAdmin = checarBotAdminComMeta(meta, sock);

        if (!admin) {
            return sock.sendMessage(from, {
                text: "❌ Só administrador pode usar o comando limpar."
            }, { quoted: msg });
        }

        if (!botAdmin) {
            return sock.sendMessage(from, {
                text: "❌ Preciso ser administrador para apagar mensagens."
            }, { quoted: msg });
        }

        const alvo = obterMensagemRespondida(msg);
        if (!alvo) {
            return sock.sendMessage(from, {
                text: "⚠️ Responda à mensagem que deseja apagar e use o comando novamente."
            }, { quoted: msg });
        }

        const autorMensagem = numeroOuNome(alvo.autor, meta, "", true);
        const autorExclusao = numeroOuNome(sender, meta, msg.pushName);

        await sock.sendMessage(from, {
            delete: {
                remoteJid: from,
                id: alvo.key.id,
                participant: alvo.key.participant,
                fromMe: alvo.key.fromMe
            }
        });

        const textoAviso = `🗑️ *MENSAGEM APAGADA*\n\n👤 Quem apagou: *${autorExclusao}*\n📝 Mensagem de: *${autorMensagem}*\n\n😏 A mensagem foi enviada para o lixo pela Mikasa.`;
        const imagemAviso = path.join(__dirname, "../midias/imagens/mikasa_limpando_lixo.png");

        if (fs.existsSync(imagemAviso)) {
            await sock.sendMessage(from, {
                image: fs.readFileSync(imagemAviso),
                caption: textoAviso
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: textoAviso }, { quoted: msg });
        }
    } catch (erro) {
        console.error("❌ Erro no comando limpar:", erro?.message || erro);
        await sock.sendMessage(from, {
            text: "❌ Não consegui apagar essa mensagem. Verifique se o bot é administrador e se você respondeu diretamente à mensagem."
        }, { quoted: msg });
    }
}

module.exports = { limpar };
