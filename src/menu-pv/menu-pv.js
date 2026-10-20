/* =================================================
   😏 MIKASA BOT — MENU BLOQUEADO NO PV
   📁 Arquivo: menu-pv.js

   Quando alguém tenta puxar o menu no PRIVADO, o bot não manda
   o menu — em vez disso, puxa um card com a foto de perfil da
   pessoa e manda uma mensagem arrogante dizendo que ela não tem
   capacidade pra isso. O menu de verdade só funciona em grupo.
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");

const {
    criarCardBloqueioPV,
    baixarBuffer
} = require("../cardGenerator/cardGenerator");

const { enviarCardOuAnimado } = require("../card-envio/card-envio");

const {
    enviarAudioDaPasta
} = require("../audio-pastas/audio-pastas");


// ═══════════════════════════════════════════════════════════════
// 📂 BANCO DE USUÁRIOS
// ═══════════════════════════════════════════════════════════════

const DB_PATH = path.join(
    __dirname, "../../database/usuarios.json"
);


// ═══════════════════════════════════════════════════════════════
// 📊 STATS PADRÃO
// ═══════════════════════════════════════════════════════════════

const STATS_PADRAO = {
    nivel: 1,
    exp: 0,
    moedas: 0,
    vitorias: 0,
    derrotas: 0
};


// ═══════════════════════════════════════════════════════════════
// 📥 LER ESTATÍSTICAS DO USUÁRIO
// ═══════════════════════════════════════════════════════════════

function lerStatsOuPadrao(usuarioJid) {

    try {

        if (!fs.existsSync(DB_PATH)) {
            return {
                ...STATS_PADRAO
            };
        }


        const conteudo =
            fs.readFileSync(
                DB_PATH,
                "utf8"
            ).trim();


        if (!conteudo) {
            return {
                ...STATS_PADRAO
            };
        }


        const banco =
            JSON.parse(conteudo);


        if (
            !banco ||
            typeof banco !== "object" ||
            !banco[usuarioJid]
        ) {
            return {
                ...STATS_PADRAO
            };
        }


        const dados =
            banco[usuarioJid];


        return {

            nivel:
                Number.isFinite(dados.nivel) &&
                dados.nivel > 0
                    ? dados.nivel
                    : 1,

            exp:
                Number.isFinite(dados.xp) &&
                dados.xp >= 0
                    ? dados.xp
                    : 0,

            moedas:
                Number.isFinite(dados.ouro) &&
                dados.ouro >= 0
                    ? dados.ouro
                    : 0,

            vitorias:
                Number.isFinite(dados.vitorias) &&
                dados.vitorias >= 0
                    ? dados.vitorias
                    : 0,

            derrotas:
                Number.isFinite(dados.derrotas) &&
                dados.derrotas >= 0
                    ? dados.derrotas
                    : 0
        };

    } catch (erro) {

        console.error(
            "⚠️ Erro ao ler estatísticas:",
            erro
        );

        return {
            ...STATS_PADRAO
        };
    }
}


// ═══════════════════════════════════════════════════════════════
// 🏆 SISTEMA DE PATENTES
// ═══════════════════════════════════════════════════════════════

function calcularPatente(nivel) {

    const nivelSeguro =
        Number(nivel) || 1;


    if (nivelSeguro >= 25) {
        return "🏆 LENDÁRIO";
    }

    if (nivelSeguro >= 18) {
        return "💎 DIAMANTE";
    }

    if (nivelSeguro >= 12) {
        return "🥇 OURO";
    }

    if (nivelSeguro >= 7) {
        return "🥈 PRATA";
    }

    if (nivelSeguro >= 3) {
        return "🥉 BRONZE";
    }

    return "⚪ INICIANTE";
}


// ═══════════════════════════════════════════════════════════════
// 🎯 CALCULAR XP NECESSÁRIO
// ═══════════════════════════════════════════════════════════════

function calcularExpNecessario(nivel) {

    const nivelSeguro =
        Math.max(
            1,
            Number(nivel) || 1
        );

    return nivelSeguro * 100;
}


// ═══════════════════════════════════════════════════════════════
// 🛡️ BLOQUEIO DO MENU NO PV
// ═══════════════════════════════════════════════════════════════

async function bloquearMenuPV(sock, msg) {

    // ───────────────────────────────────────────────────────────
    // 📍 DESTINO
    // ───────────────────────────────────────────────────────────

    const from =
        msg?.key?.remoteJid;


    if (!from) {
        return;
    }

    // Bloqueia de verdade antes de responder. LID não é um JID bloqueável;
    // por isso tentamos somente as formas de telefone disponíveis.
    const candidatosBloqueio = [
        from,
        msg?.key?.remoteJidAlt,
        msg?.key?.participant,
        msg?.key?.participantAlt
    ].filter(Boolean).map(valor => {
        const jid = String(valor);
        return jid.endsWith("@c.us") ? jid.replace("@c.us", "@s.whatsapp.net") : jid;
    }).filter(jid => /@s\.whatsapp\.net$/i.test(jid));
    let bloqueado = false;
    for (const jid of [...new Set(candidatosBloqueio)]) {
        try {
            await sock.updateBlockStatus(jid, "block");
            bloqueado = true;
            console.log(`✅ PV bloqueado: ${jid}`);
            break;
        } catch (erroBloqueio) {
            console.warn(`⚠️ Não consegui bloquear ${jid}:`, erroBloqueio?.message || erroBloqueio);
        }
    }
    if (!bloqueado) console.warn("⚠️ O WhatsApp não aceitou nenhum JID de telefone para bloquear este PV.");

    // ───────────────────────────────────────────────────────────
    // 🔊 ÁUDIO DE BLOQUEIO
    // ───────────────────────────────────────────────────────────

    try {

        await enviarAudioDaPasta(
            sock,
            from,
            "menupv",
            {
                quoted: msg
            }
        );

    } catch (erroAudio) {

        console.warn(
            "⚠️ Áudio menupv indisponível:",
            erroAudio?.message || erroAudio
        );
    }


    // ───────────────────────────────────────────────────────────
    // 👤 IDENTIFICAÇÃO
    // ───────────────────────────────────────────────────────────

    const nomeUsuario =
        String(
            msg.pushName ||
            from.split("@")[0] ||
            "Usuário"
        ).trim();


    const numeroUsuario =
        from.split("@")[0];


    // ───────────────────────────────────────────────────────────
    // 🖼️ FOTO DE PERFIL
    // ───────────────────────────────────────────────────────────

    let fotoBuffer = null;

    try {

        const fotoUrl =
            await sock.profilePictureUrl(
                from,
                "image"
            );


        if (fotoUrl) {

            fotoBuffer =
                await baixarBuffer(
                    fotoUrl
                );
        }

    } catch {

        fotoBuffer = null;
    }


    // ───────────────────────────────────────────────────────────
    // 📊 ESTATÍSTICAS
    // ───────────────────────────────────────────────────────────

    const {
        nivel,
        exp,
        moedas,
        vitorias,
        derrotas
    } = lerStatsOuPadrao(from);


    // ───────────────────────────────────────────────────────────
    // 🏆 PATENTE
    // ───────────────────────────────────────────────────────────

    const patente =
        calcularPatente(nivel);


    const expNecessario =
        calcularExpNecessario(nivel);


    // ───────────────────────────────────────────────────────────
    // 😈 MENSAGEM DE BLOQUEIO
    // ───────────────────────────────────────────────────────────

    const legendaArrogante = `
〔 🚫 𝐀𝐂𝐄𝐒𝐒𝐎 𝐁𝐋𝐎𝐐𝐔𝐄𝐀𝐃𝐎 〕
『 😏 𝐏𝐕 𝐍𝐀̃𝐎 𝐃𝐈𝐒𝐏𝐎𝐍𝐈́𝐕𝐄𝐋 』
    └─ @${numeroUsuario}
         └─ ${nomeUsuario}
━━━━━━━━━━━━━━
> 🛑 𝐀𝐕𝐈𝐒𝐎
   └─ Achou mesmo que o menu ia
          funcionar no privado? 😏

> 🔒 𝐀𝐂𝐄𝐒𝐒𝐎 𝐑𝐄𝐒𝐓𝐑𝐈𝐓𝐎
   └─ O menu está disponível apenas
          dentro dos grupos autorizados.

> 🎭 𝐃𝐈𝐂𝐀
   └─ Volte para o grupo e tente
          novamente por lá.
━━━━━━━━━━━━━━
> 🏆 𝐒𝐄𝐔 𝐏𝐄𝐑𝐅𝐈𝐋
   └─ Patente: ${patente}
    └─ Nível: ${nivel}
     └─ XP: ${exp}/${expNecessario}
      └─ 🪙 Ouro: ${moedas}
       └─ 🏆 Vitórias: ${vitorias}
         └─ 💀 Derrotas: ${derrotas}
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;


    // ───────────────────────────────────────────────────────────
    // 🎨 GERAR CARD
    // ───────────────────────────────────────────────────────────

    try {

        await enviarCardOuAnimado(sock, from, (fundoBuffer) => criarCardBloqueioPV({

                fotoBuffer,

                nomeUsuario,

                patente,

                nivel,

                exp,

                expNecessario,

                moedas,

                vitorias,

                derrotas,

                fundoBuffer
            }), { caption: legendaArrogante }, msg);

    } catch (erroCard) {

        console.error(
            "❌ Erro ao gerar card de bloqueio PV:",
            erroCard
        );


        // ───────────────────────────────────────────────────────
        // 📝 FALLBACK PARA TEXTO
        // ───────────────────────────────────────────────────────

        try {

            await sock.sendMessage(
                from,
                {
                    text: legendaArrogante
                },
                {
                    quoted: msg
                }
            );

        } catch (erroTexto) {

            console.error(
                "❌ Erro ao enviar bloqueio em texto:",
                erroTexto
            );
        }
    }
}


// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════

module.exports = {
    bloquearMenuPV,
    lerStatsOuPadrao,
    calcularPatente
};