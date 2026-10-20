/* =================================================
   🪪 MIKASA BOT — PERFIL
   📁 Arquivo: perfil.js

   <prefixo>perfil              → o seu perfil
   <prefixo>perfil @pessoa      → de quem foi marcado
   (ou responda a mensagem de alguém com <prefixo>perfil)

   Manda a FOTO de perfil da pessoa, marcando ela, com:
     • cargo no grupo (dono do grupo / administrador / membro) e nome do grupo
     • nível e moedas (se a pessoa já tiver)
     • barrinhas de brincadeira: gado, beleza, fiel, infiel, puto(a)
   e um botão direto "ENTRAR NO CANAL" (1 toque abre o canal).
   Qualquer pessoa pode usar — não precisa se registrar.
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { baixarBuffer } = require("../cardGenerator/cardGenerator");

const dbPath = path.join(__dirname, "../../database/usuarios.json");

// 📚 LEITURA DO BANCO
function lerUsuarios() {
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(dbPath, "utf8") || "{}");
    } catch {
        return {};
    }
}

// 💾 SALVAR DADOS
function salvarUsuarios(dados) {
    fs.writeFileSync(dbPath, JSON.stringify(dados, null, 2), "utf8");
}

// 🎖️ CLASSIFICAÇÃO POR NÍVEL
function calcularPatente(nivel) {
    if (nivel >= 25) return "🏆 LENDÁRIO";
    if (nivel >= 18) return "🥇 DIAMANTE";
    if (nivel >= 12) return "🥈 OURO";
    if (nivel >= 7) return "🥉 PRATA";
    if (nivel >= 3) return "🔵 BRONZE";
    return "⚪ INICIANTE";
}

// ───────────── brincadeira das barrinhas ─────────────
// A porcentagem é "sorteada" a partir da pessoa + a semana, então o resultado é
// o mesmo a semana toda (ninguém muda no refresh) e muda na semana seguinte.
function semanaDoAno() {
    const d = new Date();
    const inicio = new Date(d.getFullYear(), 0, 1);
    return `${d.getFullYear()}-${Math.floor((d - inicio) / (7 * 86400000))}`;
}

function hashParaPorcentagem(texto) {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return Math.abs(h >>> 0) % 101; // 0 a 100
}

function barra(pct) {
    const cheios = Math.round(pct / 10);
    return "▰".repeat(cheios) + "▱".repeat(10 - cheios);
}

const ATRIBUTOS = [
    { id: "gado",   emoji: "🐂", nome: "Gado"    },
    { id: "beleza", emoji: "😍", nome: "Beleza"  },
    { id: "fiel",   emoji: "💍", nome: "Fiel"    },
    { id: "infiel", emoji: "💔", nome: "Infiel"  },
    { id: "puto",   emoji: "🔥", nome: "Puto(a)" }
];

function linhasDasBarras(alvo) {
    const semana = semanaDoAno();
    return ATRIBUTOS.map(a => {
        const pct = hashParaPorcentagem(`${alvo}|${semana}|${a.id}`);
        return `${a.emoji} *${a.nome}*\n${barra(pct)} ${pct}%`;
    }).join("\n\n");
}

// ───────────── quem é o alvo ─────────────
function limparJid(jid) {
    return String(jid || "").replace(/:\d+@/, "@");
}

function descobrirAlvo(msg, args, remetente) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.length) return ctx.mentionedJid[0];
    if (ctx?.participant) return ctx.participant;
    const numero = String(args?.[0] || "").replace(/\D/g, "");
    if (numero.length >= 10) return `${numero}@s.whatsapp.net`;
    return remetente;
}

function acharParticipante(meta, alvo) {
    const procurado = limparJid(alvo);
    const numero = procurado.split("@")[0];
    return (meta?.participants || []).find(p =>
        limparJid(p.id) === procurado ||
        (p.lid && limparJid(p.lid) === procurado) ||
        (p.phoneNumber && limparJid(p.phoneNumber) === procurado) ||
        String(p.id).split("@")[0] === numero
    );
}

function descreverCargo(participante) {
    if (participante?.admin === "superadmin") return "👑 Dono do grupo";
    if (participante?.admin === "admin") return "🛡️ Administrador";
    return "👤 Membro";
}

async function baixarFoto(sock, candidatos) {
    for (const jid of candidatos.filter(Boolean)) {
        try {
            const url = await sock.profilePictureUrl(jid, "image");
            if (url) return await baixarBuffer(url);
        } catch {}
    }
    return null;
}

async function perfil(sock, msg, args) {
    const from = msg.key.remoteJid;
    const ehGrupo = String(from).endsWith("@g.us");
    const remetente = msg.key.participant || msg.key.remoteJid;
    const alvo = descobrirAlvo(msg, args, remetente);
    const numero = String(alvo).split("@")[0].split(":")[0];

    // 👥 Cargo e nome do grupo
    let cargo = "👤 Conversa privada";
    let nomeGrupo = "Conversa privada";
    let participante = null;
    if (ehGrupo) {
        try {
            const meta = await sock.groupMetadata(from);
            nomeGrupo = meta.subject || "Grupo";
            participante = acharParticipante(meta, alvo);
            cargo = descreverCargo(participante);
        } catch {
            cargo = "👤 Membro";
            nomeGrupo = "Grupo";
        }
    }

    // 📊 Nível e moedas (se a pessoa já tiver)
    const banco = lerUsuarios();
    const dados = banco[alvo] || banco[limparJid(alvo)] || banco[participante?.id] || banco[participante?.lid] || null;
    let linhaNivel = "⭐ *Nível:* 1 • ⚪ INICIANTE";
    let linhaMoedas = "";
    if (dados) {
        const nivel = dados.nivel || 1;
        let proximo = "";
        try {
            const { xpNecessario } = require("../level/level");
            const falta = Math.max(0, xpNecessario(nivel) - (dados.xp || 0));
            proximo = `\n📈 *XP:* ${dados.xp || 0}/${xpNecessario(nivel)} (faltam ${falta})`;
        } catch {}
        linhaNivel = `⭐ *Nível:* ${nivel} • ${calcularPatente(nivel)}${proximo}`;
        linhaMoedas = `\n💸 *Moedas:* ${Number(dados.ouro || 0).toLocaleString("pt-BR")}`;
    }

    const texto =
        `🪪 *PERFIL* — @${numero}\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `🏷️ *Cargo:* ${cargo}\n` +
        `👥 *Grupo:* ${nomeGrupo}\n` +
        `${linhaNivel}${linhaMoedas}\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `${linhasDasBarras(limparJid(alvo))}\n\n` +
        `_🎲 só zoeira, muda toda semana_`;

    // 🖼️ Foto da pessoa (se não tiver/ou for privada, vai sem foto)
    const foto = await baixarFoto(sock, [alvo, participante?.id, participante?.lid, participante?.phoneNumber]);

    const { enviarNativeFlow, botaoUrl, obterLinkCanalConfig } = require("../menuBotoes/menuBotoes");
    const canal = obterLinkCanalConfig();
    const botoes = canal ? [botaoUrl("📢 ENTRAR NO CANAL", canal)] : [];

    try {
        if (botoes.length) {
            return await enviarNativeFlow(sock, from, {
                text: texto,
                footer: config.BOT_NAME || "Mikasa Bot",
                imageBuffer: foto || undefined,
                quoted: msg,
                mentions: [alvo],
                buttons: botoes
            });
        }
        throw new Error("sem botão");
    } catch (erro) {
        // Plano B: sem botão interativo, manda foto + texto normal
        if (foto) {
            return sock.sendMessage(from, { image: foto, caption: texto, mentions: [alvo] }, { quoted: msg });
        }
        return sock.sendMessage(from, { text: texto, mentions: [alvo] }, { quoted: msg });
    }
}

module.exports = { perfil, lerUsuarios, salvarUsuarios, linhasDasBarras, barra };
