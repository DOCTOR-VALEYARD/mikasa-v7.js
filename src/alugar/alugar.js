const config = require("../../config");
const { getDB, saveDB } = require("../grupo-db/grupo-db");
const { ehDono } = require("../utils-validacao/utils-validacao");
const { isAdmin } = require("../grupo/grupo");
const vip = require("../aluguel-planos/aluguel-planos");

function soNumeros(v) {
    return String(v || "").replace(/\D/g, "");
}

// 🔢 Conta em quantos OUTROS grupos essa pessoa já está com o bot
// alugado no momento (não conta o grupo atual, se já for dela).
function contarGruposAtivadosPor(numero, grupoAtualJid) {
    const db = getDB();
    let total = 0;
    for (const [jid, dados] of Object.entries(db)) {
        if (jid === grupoAtualJid) continue;
        if (dados?.alugado === true && soNumeros(dados?.alugadoPor) === numero) total++;
    }
    return total;
}

async function alugar(sock, msg, args) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const remetente = msg.key.participant || msg.key.remoteJid;
    const numeroRemetente = soNumeros(remetente);
    const donoBot = ehDono([remetente, msg.key.participantAlt, from], config.OWNER_NUMBER);

    // ──────────────────────────────────────────────────────────────
    // 💰 O DONO DO BOT pode ativar/desativar de graça, sem limite.
    // Qualquer outra pessoa (mesmo sendo admin do grupo) só consegue
    // ativar se tiver um plano de aluguel — e o plano decide em quantos grupos:
    //   3 dias   → 0 grupos (só PV / teste)
    //   15 dias  → 1 grupo
    //   30 dias+ → 2 grupos
    // Ex: .alugar 1  → ativa o bot nesse grupo
    //     .alugar 0  → desativa o bot nesse grupo
    // ──────────────────────────────────────────────────────────────
    const userAdmin = isGroup && !donoBot ? await isAdmin(sock, from, remetente).catch(() => false) : false;

    if (isGroup) {
        // 🔒 Em grupo, o comando de aluguel é SÓ pra administrador (ou o dono do bot).
        if (!donoBot && !userAdmin) {
            return sock.sendMessage(from, {
                text: `🚫 O comando *${config.PREFIX}alugar* é exclusivo para *administradores* do grupo.`
            }, { quoted: msg });
        }

        const argumento = String(args?.[0] || "").toLowerCase();
        const ligarPalavras = ["1", "on", "ativar", "ativado"];
        const desligarPalavras = ["0", "off", "desativar", "desativado"];

        if (ligarPalavras.includes(argumento)) {
            const db = getDB();
            const jaEraDela = db[from]?.alugado === true && soNumeros(db[from]?.alugadoPor) === numeroRemetente;

            // 🔐 Sem ser o dono do bot, precisa ter plano de aluguel que
            // permita grupo pra poder ativar.
            if (!donoBot) {
                if (!(userAdmin || jaEraDela)) {
                    return sock.sendMessage(from, {
                        text: `🚫 Só um *administrador do grupo* pode ativar o aluguel aqui.`
                    }, { quoted: msg });
                }

                const limite = vip.limiteGruposAtual(numeroRemetente);

                if (limite === 0) {
                    const ehVipMasSemGrupo = vip.ehVip(numeroRemetente);
                    return sock.sendMessage(from, {
                        text: ehVipMasSemGrupo
                            ? `⚠️ Seu plano de aluguel atual não inclui ativar o bot em grupos.\n💎 Assine um plano de *15 dias* (1 grupo) ou *30 dias* (2 grupos) pra liberar isso.\n\nUse ${config.PREFIX}alugarbot pra ver os planos.`
                            : `⚠️ Só quem tem um *plano de aluguel* ativo pode ativar o bot em grupos.\n💎 Use ${config.PREFIX}alugarbot pra ver os planos.`
                    }, { quoted: msg });
                }

                if (!jaEraDela) {
                    const usados = contarGruposAtivadosPor(numeroRemetente, from);
                    if (usados >= limite) {
                        return sock.sendMessage(from, {
                            text: `⚠️ Você já ativou o bot em *${usados}* grupo(s), que é o limite do seu plano de aluguel atual (${limite} grupo${limite > 1 ? "s" : ""}).\n\nPra ativar aqui também, desative em outro grupo primeiro (${config.PREFIX}alugar 0 lá) ou assine um plano maior.`
                        }, { quoted: msg });
                    }
                }
            }

            if (!db[from]) db[from] = {};
            db[from].alugado = true;
            db[from].alugadoPor = donoBot ? "" : numeroRemetente;
            db[from].alugadoEm = Date.now();
            saveDB(db);

            return sock.sendMessage(from, {
                text: `✅ *GRUPO ALUGADO* ✅\n\n💰 O bot agora está liberado pra funcionar normalmente neste grupo.\n\n🤍 ${config.BOT_NAME}`
            }, { quoted: msg });
        }

        if (desligarPalavras.includes(argumento)) {
            const db = getDB();

            // 🔐 Só o dono do bot ou quem ativou o aluguel pode desativar
            // (evita um admin qualquer derrubar o aluguel que outra
            // pessoa pagou).
            if (!donoBot && soNumeros(db[from]?.alugadoPor) !== numeroRemetente) {
                return sock.sendMessage(from, {
                    text: `🚫 Só o *dono do bot* ou quem ativou o aluguel aqui pode desativar.`
                }, { quoted: msg });
            }

            if (!db[from]) db[from] = {};
            db[from].alugado = false;
            db[from].alugadoPor = "";
            saveDB(db);

            return sock.sendMessage(from, {
                text: `❌ *ALUGUEL ENCERRADO* ❌\n\n💰 O bot foi desativado neste grupo — nenhum comando vai funcionar aqui até ser alugado de novo (nem para administradores).\n\n🤍 ${config.BOT_NAME}`
            }, { quoted: msg });
        }

        // usou ".alugar" sem argumento válido dentro de um grupo — mostra status + instrução
        const db = getDB();
        const estadoAtual = db[from]?.alugado === true;
        const limiteRemetente = donoBot ? "∞" : vip.limiteGruposAtual(numeroRemetente);
        const mensagemStatus = `
╭─── ❀ ───
💰 SISTEMA DE ALUGUEL
╰─── ❀ ───

📊 Este grupo está: ${estadoAtual ? "🟢 ALUGADO" : "🔴 NÃO ALUGADO"}
💎 Seu limite de grupos: ${limiteRemetente}

❀ Use:
${config.PREFIX}alugar 1  → ativa o bot aqui
${config.PREFIX}alugar 0  → desativa o bot aqui

❀────────────────────❀
🤍 ${config.BOT_NAME}
❀────────────────────❀`;
        return sock.sendMessage(from, { text: mensagemStatus }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────
    // Qualquer outra pessoa (ou uso fora de grupo): mensagem de
    // divulgação de sempre, sem mexer em nada.
    // ──────────────────────────────────────────────────────────────
    const resp = `💼 *ALUGAR ${config.BOT_NAME}*\n\nInteressado em alugar este bot?\n\n📞 Contato: ${config.OWNER_NUMBER}\n👑 Criador: ${config.OWNER_NAME}\n\nEntre em contato para mais informações!\n\n💎 Veja os planos e valores com ${config.PREFIX}alugarbot`;
    await sock.sendMessage(from, { text: resp }, { quoted: msg });
}

module.exports = { alugar };
