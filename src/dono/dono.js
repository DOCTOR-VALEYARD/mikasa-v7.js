// 🔐 ACESSO RESTRITO — resposta quando alguém marca/chama o dono sem autorização.
// Sai no formato padrão do bot: imagem + card + botão "FALAR COM O CRIADOR".
// Tudo vem do config.js (nenhum nome fixo). Sem caixinhas, sem texto solto pra copiar.
const config = require("../../config");
const fs = require("fs");
const path = require("path");

const FRASES = [
    "Você não tem autoridade para marcar ou chamar a minha liderança.",
    "Cuidado com esse contato. Acesso restrito a níveis superiores.",
    "Canal exclusivo. Você não possui permissão para acessar essa área.",
    "Meu criador está ocupado com assuntos importantes. Não incomode sem autorização.",
    "Tentativa de acesso detectada. Contato com a liderança: AUTORIDADE NEGADA."
];

// Anti-flood: o mesmo chat só recebe esse aviso 1 vez a cada 20 s (evita spam de marcações)
const ultimoAviso = new Map();
const INTERVALO_MS = 20000;

// 🔡 letras minúsculas pequenininhas (unicode small caps)
const PEQ = { a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"ꜱ",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",y:"ʏ",z:"ᴢ" };
const pq = t => String(t).toLowerCase().replace(/[a-z]/g, c => PEQ[c] || c);

function dataHora() {
    const f = { timeZone: "America/Sao_Paulo" };
    const d = new Date();
    return {
        data: d.toLocaleDateString("pt-BR", f),
        hora: d.toLocaleTimeString("pt-BR", { ...f, hour: "2-digit", minute: "2-digit" })
    };
}

function montarTexto() {
    const nome = config.BOT_NAME || "Mikasa Bot";
    const { data, hora } = dataHora();
    const frase = FRASES[Math.floor(Math.random() * FRASES.length)];
    const numero = String(config.OWNER_NUMBER || "").replace(/\D/g, "");
    const linhas = [
        `🚫 *${pq(frase)}*`,
        "",
        `👑 *${pq("criador")}*`,
        `> ${config.OWNER_NAME}`,
        numero ? `> wa.me/${numero}` : null,
        `> ${pq("status: ocupado em desenvolvimento")}`,
        `> ${pq("atendimento: somente convidados")}`,
        "",
        `🤖 *${pq("sistema")}*`,
        `> ${nome} • ${pq("versão")} ${config.VERSION || "—"}`,
        "",
        `🕒 *${pq("registro")}* ${data} ${pq("às")} ${hora}`
    ].filter(l => l !== null).join("\n");
    return `『 ✦ 』 🔐 ${pq("acesso restrito")} 『 ✦ 』\n${linhas}\n\n『 ✦ 』 ${nome} 『 ✦ 』`;
}

const responderDono = async (sock, from, msg) => {
    const agora = Date.now();
    if (agora - (ultimoAviso.get(from) || 0) < INTERVALO_MS) return;
    ultimoAviso.set(from, agora);
    if (ultimoAviso.size > 500) for (const [k, t] of ultimoAviso) if (agora - t > INTERVALO_MS) ultimoAviso.delete(k);

    const text = montarTexto();
    const nome = config.BOT_NAME || "Mikasa Bot";
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");
    const imagem = fs.existsSync(caminhoImagem) ? fs.readFileSync(caminhoImagem) : null;

    try {
        const M = require("../menuBotoes/menuBotoes");
        const link = M.linkFalarComCriador();
        const buttons = link ? [M.botaoUrl("💬 ꜰᴀʟᴀʀ ᴄᴏᴍ ᴏ ᴄʀɪᴀᴅᴏʀ", link)] : [];
        if (buttons.length) {
            return await M.enviarNativeFlow(sock, from, { text, footer: nome, quoted: msg, imageBuffer: imagem || undefined, buttons });
        }
    } catch (e) { /* cai no envio simples abaixo */ }

    try {
        if (imagem) return await sock.sendMessage(from, { image: imagem, caption: text }, { quoted: msg });
    } catch {}
    return sock.sendMessage(from, { text }, { quoted: msg });
};

module.exports = { responderDono };
