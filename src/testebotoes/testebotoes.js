/* =================================================
   🧪 MIKASA BOT — TESTE DE LAYOUT DE BOTÕES
   📁 Arquivo: testebotoes.js

   Uso: <prefixo>testebotoes   (somente dono)

   O WhatsApp decide sozinho se os botões ficam lado a lado ou um embaixo
   do outro, e isso depende do TIPO de mensagem. Este comando manda a
   mesma dupla de botões em 4 formatos diferentes (A, B, C e D) para você
   ver qual deles aparece lado a lado no SEU WhatsApp. Depois me diga a
   letra e o formato vencedor é aplicado em todos os botões do bot.
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const baileys = require("@whiskeysockets/baileys");
const { generateWAMessageFromContent, generateMessageIDV2, generateMessageID, isJidGroup } = baileys;

function ehDono(msg) {
    const numero = String(config.OWNER_NUMBER || "").replace(/\D/g, "");
    const autor = String(msg.key.participant || msg.key.participantAlt || msg.key.remoteJid || "");
    return msg.key.fromMe || (numero && autor.includes(numero));
}

async function relay(sock, jid, content, extraNodes = [], quoted) {
    const userJid = sock.authState?.creds?.me?.id || sock.user?.id;
    const makeId = generateMessageIDV2 || generateMessageID;
    const gerada = generateWAMessageFromContent(jid, content, {
        logger: sock.logger,
        userJid,
        messageId: typeof makeId === "function" ? makeId(userJid) : undefined,
        timestamp: new Date(),
        quoted
    });
    const nodes = [...extraNodes];
    const grupo = typeof isJidGroup === "function" ? isJidGroup(jid) : String(jid).endsWith("@g.us");
    if (!grupo) nodes.push({ tag: "bot", attrs: { biz_bot: "1" } });
    await sock.relayMessage(jid, gerada.message, { messageId: gerada.key.id, additionalNodes: nodes });
}

const NO_NATIVE_FLOW = {
    tag: "biz",
    attrs: {},
    content: [{
        tag: "interactive",
        attrs: { type: "native_flow", v: "1" },
        content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }]
    }]
};

function qr(texto, id) {
    return { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: texto, id }) };
}

async function testebotoes(sock, msg) {
    const from = msg.key.remoteJid;

    if (!ehDono(msg)) {
        return sock.sendMessage(from, { text: "❌ Comando exclusivo do dono." }, { quoted: msg });
    }

    await sock.sendMessage(from, {
        text: "🧪 *TESTE DE BOTÕES*\n\nVou mandar 4 mensagens (A, B, C e D), cada uma com 2 botões.\nMe diga qual letra apareceu com os botões *lado a lado*."
    }, { quoted: msg });

    // 🖼️ Miniatura para o formato B (cartão de prévia, como no print)
    let miniatura = null;
    try {
        const caminho = path.join(__dirname, "../midias/imagens/menu.png");
        if (fs.existsSync(caminho)) miniatura = fs.readFileSync(caminho);
    } catch {}

    const resultados = [];

    // A) Interativa (native flow) — mínima: sem título, sem rodapé
    try {
        await relay(sock, from, {
            interactiveMessage: {
                body: { text: "A) Native flow mínimo" },
                nativeFlowMessage: { buttons: [qr("🎧 Áudio", "teste_a1"), qr("🎬 Vídeo", "teste_a2")], messageParamsJson: "" }
            }
        }, [NO_NATIVE_FLOW], msg);
        resultados.push("A ✅ enviado");
    } catch (e) { resultados.push(`A ❌ ${e?.message || e}`); }

    // B) Interativa + cartão de prévia (externalAdReply), igual ao print
    try {
        const contextInfo = {
            externalAdReply: {
                title: config.BOT_NAME || "Mikasa Bot",
                body: "Teste de botões",
                mediaType: 1,
                renderLargerThumbnail: true,
                sourceUrl: config.CHANNEL_URL || "https://whatsapp.com",
                ...(miniatura ? { thumbnail: miniatura } : {})
            }
        };
        await relay(sock, from, {
            interactiveMessage: {
                body: { text: "B) Native flow + cartão de prévia" },
                contextInfo,
                nativeFlowMessage: { buttons: [qr("🎧 Áudio", "teste_b1"), qr("🎬 Vídeo", "teste_b2")], messageParamsJson: "" }
            }
        }, [NO_NATIVE_FLOW], msg);
        resultados.push("B ✅ enviado");
    } catch (e) { resultados.push(`B ❌ ${e?.message || e}`); }

    // C) Botões clássicos (buttonsMessage)
    try {
        await relay(sock, from, {
            buttonsMessage: {
                contentText: "C) Botões clássicos",
                footerText: config.BOT_NAME || "Mikasa Bot",
                headerType: 1,
                buttons: [
                    { buttonId: "teste_c1", buttonText: { displayText: "🎧 Áudio" }, type: 1 },
                    { buttonId: "teste_c2", buttonText: { displayText: "🎬 Vídeo" }, type: 1 }
                ]
            }
        }, [{ tag: "biz", attrs: {}, content: [{ tag: "buttons", attrs: {} }] }], msg);
        resultados.push("C ✅ enviado");
    } catch (e) { resultados.push(`C ❌ ${e?.message || e}`); }

    // D) Modelo (templateMessage) com respostas rápidas
    try {
        await relay(sock, from, {
            templateMessage: {
                hydratedTemplate: {
                    hydratedContentText: "D) Template",
                    hydratedFooterText: config.BOT_NAME || "Mikasa Bot",
                    hydratedButtons: [
                        { index: 0, quickReplyButton: { displayText: "🎧 Áudio", id: "teste_d1" } },
                        { index: 1, quickReplyButton: { displayText: "🎬 Vídeo", id: "teste_d2" } }
                    ]
                }
            }
        }, [], msg);
        resultados.push("D ✅ enviado");
    } catch (e) { resultados.push(`D ❌ ${e?.message || e}`); }

    return sock.sendMessage(from, {
        text: `🧪 *RESULTADO DO ENVIO*\n\n${resultados.join("\n")}\n\nO que apareceu *lado a lado*? Responda só com a letra.\n(Se alguma não apareceu no seu WhatsApp, diga também.)`
    }, { quoted: msg });
}

module.exports = { testebotoes };
