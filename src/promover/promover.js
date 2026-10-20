// 👑 PROMOVER — dá admin a alguém do grupo.
// Funciona de 3 jeitos: RESPONDENDO a mensagem da pessoa, MARCANDO ela (@), ou digitando o número.
// Resposta no formato padrão do bot (card), com letras pequenas.
const config = require("../../config");
const PEQ = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"ꜱ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",y:"ʏ",z:"ᴢ" };
const pq = t => String(t).toLowerCase().replace(/[a-z]/g, c => PEQ[c] || c);

async function responder(sock, from, msg, titulo, linhas, mentions = []) {
    try {
        const { enviarMensagemPadrao } = require("../menuBotoes/menuBotoes");
        return await enviarMensagemPadrao(sock, from, { titulo: ` ${titulo} `, linhas, quoted: msg, mentions });
    } catch {
        return sock.sendMessage(from, { text: `『 ✦ 』 ${titulo} 『 ✦ 』\n${[].concat(linhas).join("\n")}`, mentions }, { quoted: msg });
    }
}

// contextInfo da mensagem, mesmo se vier embrulhada (temporária, visualização única...)
function contextoDa(msg) {
    let m = msg?.message || {};
    for (let i = 0; i < 4; i++) {
        const dentro = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message || m.documentWithCaptionMessage?.message;
        if (!dentro) break;
        m = dentro;
    }
    for (const tipo of Object.keys(m)) {
        const ctx = m[tipo]?.contextInfo;
        if (ctx) return ctx;
    }
    return {};
}

const soNumero = j => String(j || "").split("@")[0].split(":")[0];

// Descobre quem promover: respondida > marcada > número digitado
function alvoDe(msg, args) {
    const ctx = contextoDa(msg);
    if (ctx.quotedMessage && ctx.participant) return ctx.participant;
    if (Array.isArray(ctx.mentionedJid) && ctx.mentionedJid.length) return ctx.mentionedJid[0];
    const num = String((args || []).join(" ")).replace(/\D/g, "");
    if (num.length >= 8 && num.length <= 15) return `${num}@s.whatsapp.net`;
    return null;
}

async function promover(sock, msg, args) {
    const from = msg.key.remoteJid;
    if (!from.endsWith("@g.us")) {
        return responder(sock, from, msg, `⚠️ ${pq("só em grupos")}`, [pq("esse comando funciona apenas dentro de grupos.")]);
    }

    const alvo = alvoDe(msg, args);
    if (!alvo) {
        return responder(sock, from, msg, `👑 ${pq("quem promover?")}`, [
            pq("responda a mensagem da pessoa com o comando,"),
            pq("ou marque ela:") + ` ${config.PREFIX || "."}promover @pessoa`,
            pq("ou digite o número:") + ` ${config.PREFIX || "."}promover 5511999999999`
        ]);
    }

    const mentions = [alvo];
    const nome = `@${soNumero(alvo)}`;

    try {
        // confere se já é admin / se o bot é admin antes de tentar
        const meta = await sock.groupMetadata(from);
        const ehAdmin = id => meta.participants.some(p =>
            [p.id, p.lid, p.jid, p.phoneNumber].some(x => x && soNumero(x) === soNumero(id)) && p.admin);
        const noGrupo = meta.participants.some(p => [p.id, p.lid, p.jid, p.phoneNumber].some(x => x && soNumero(x) === soNumero(alvo)));

        if (!noGrupo) {
            return responder(sock, from, msg, `❌ ${pq("não está no grupo")}`, [`${nome} ${pq("não faz parte desse grupo.")}`], mentions);
        }
        if (ehAdmin(alvo)) {
            return responder(sock, from, msg, `ℹ️ ${pq("já é admin")}`, [`${nome} ${pq("já é administrador do grupo.")}`], mentions);
        }

        await sock.groupParticipantsUpdate(from, [alvo], "promote");
        const autor = msg.key.participant || msg.key.participantAlt;
        if (autor) mentions.push(autor);
        return responder(sock, from, msg, `👑 ${pq("promovido a admin")}`, [
            `${nome} ${pq("agora é administrador do grupo.")}`,
            autor ? `${pq("promovido por")} @${soNumero(autor)}` : null
        ].filter(Boolean), mentions);
    } catch (err) {
        const semPermissao = /not-authorized|forbidden|403|admin/i.test(String(err?.message || err));
        return responder(sock, from, msg, `❌ ${pq("não consegui promover")}`, [
            semPermissao ? pq("preciso ser administrador do grupo para promover alguém.") : `${pq("algo deu errado:")} ${err?.message || err}`
        ]);
    }
}

module.exports = { promover };
