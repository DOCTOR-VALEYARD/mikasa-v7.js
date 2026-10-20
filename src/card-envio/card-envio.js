/* =================================================
   🎬 ENVIO DE CARD — ESTÁTICO OU ANIMADO
   📁 Arquivo: card-envio.js
   Centraliza a decisão: se o fundo configurado (.configurar-bot fundo)
   for vídeo/gif, o card é remontado quadro a quadro e enviado como
   vídeo (roda em loop). Se o fundo for imagem (ou não tiver fundo
   animado configurado), continua exatamente como antes: imagem parada.
   ================================================= */

const { estaFundoAnimado, gerarCardAnimadoComFundo } = require("../cardGenerator/cardGenerator");
const { enviarNativeFlow } = require("../menuBotoes/menuBotoes");
const config = require("../../config");

// ⚡ VELOCIDADE: o card animado redesenha o card inteiro 16 vezes (uma por
// frame do fundo) e ainda junta tudo com o ffmpeg — é isso que deixava os
// cards lentos. Por padrão agora o card é desenhado UMA vez e enviado como
// imagem. Para voltar com o card animado: config.js → CARDS.ANIMADO: true
function cardAnimadoLigado() {
    return config.CARDS?.ANIMADO === true;
}

function linkCanalAtual() {
    try {
        const fs = require("fs");
        const path = require("path");
        const dbPath = path.join(__dirname, "../../database/botconfig.json");
        const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf8")) : {};
        const valor = [db.CHANNEL_URL, db.CHANNEL_LINK, db.CHANNEL, db.CANAL_URL, db.CANAL_LINK, db.CANAL].find(v => typeof v === "string" && v.trim());
        if (!valor) return null;
        const limpo = valor.trim();
        if (/^https?:\/\//i.test(limpo)) return limpo;
        if (/^(whatsapp\.com\/channel\/|wa\.me\/)/i.test(limpo)) return `https://${limpo}`;
        return null;
    } catch {
        return null;
    }
}

function botaoCanal() {
    const url = linkCanalAtual();
    if (!url) return null;
    return {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({ display_text: "📢 ENTRAR NO CANAL", url })
    };
}

/**
 * @param {*} sock
 * @param {string} from
 * @param {(fundoBuffer?: Buffer) => Promise<Buffer>} gerarCard — gera o PNG do card; recebe um fundoBuffer quando está montando a versão animada
 * @param {object} opcoesEnvio — demais campos da mensagem (caption, mentions, etc)
 * @param {object} [msg] — mensagem original, pra responder com {quoted}
 * @param {(jid: string, conteudo: object) => Promise<any>} [enviarFn] — opcional: função customizada de envio
 *   (ex: com retentativa). Se não passar, usa sock.sendMessage(from, conteudo, {quoted}) como sempre.
 */
async function enviarCardOuAnimado(sock, from, gerarCard, opcoesEnvio, msg, enviarFn) {
    const quoted = msg ? { quoted: msg } : undefined;
    const enviar = enviarFn || ((jid, conteudo) => sock.sendMessage(jid, conteudo, quoted));
    const nativeButtons = Array.isArray(opcoesEnvio?.nativeButtons)
        ? opcoesEnvio.nativeButtons.filter(Boolean)
        : [];
    const opcoesLimpa = { ...opcoesEnvio };
    delete opcoesLimpa.nativeButtons;

    if (cardAnimadoLigado() && estaFundoAnimado()) {
        try {
            const video = await gerarCardAnimadoComFundo((fundoBuffer) => gerarCard(fundoBuffer));
            if (video) {
                if (nativeButtons.length) {
                    return await enviarNativeFlow(sock, from, {
                        text: opcoesLimpa.caption || "",
                        footer: "📢 CANAL",
                        videoBuffer: video,
                        gifPlayback: true,
                        buttons: nativeButtons,
                        mentions: opcoesLimpa.mentions
                    });
                }
                return await enviar(from, { video, gifPlayback: true, ...opcoesLimpa });
            }
        } catch (erro) {
            console.error("❌ Erro ao gerar card animado, caindo pro card estático:", erro.message);
        }
    }

    const card = await gerarCard();
    if (nativeButtons.length) {
        return await enviarNativeFlow(sock, from, {
            text: opcoesLimpa.caption || "",
            footer: "📢 CANAL",
            imageBuffer: card,
            buttons: nativeButtons,
            mentions: opcoesLimpa.mentions
        });
    }
    return await enviar(from, { image: card, ...opcoesLimpa });
}

module.exports = { enviarCardOuAnimado };
