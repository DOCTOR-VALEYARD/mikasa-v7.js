
/* =================================================
   📊 SISTEMA DE NÍVEL, XP E MOEDAS
   📁 Arquivo: level.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");

const {
    criarCardLevelUp,
    baixarBuffer
} = require("../cardGenerator/cardGenerator");

const { enviarCardOuAnimado } = require("../card-envio/card-envio");

const {
    buscarFotoContexto
} = require("../foto-contexto/foto-contexto");


// ═══════════════════════════════════════════════════════════════
// 📂 CONFIGURAÇÃO DO BANCO
// ═══════════════════════════════════════════════════════════════

const DB_DIR = path.join(__dirname, "../../database");
const DB_PATH = path.join(DB_DIR, "usuarios.json");


// Garante que a pasta database exista
function garantirBanco() {
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, {
            recursive: true
        });
    }
}


// ═══════════════════════════════════════════════════════════════
// 📥 CARREGAR BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════

function loadDB() {

    garantirBanco();

    if (!fs.existsSync(DB_PATH)) {
        return {};
    }

    try {

        const conteudo = fs.readFileSync(
            DB_PATH,
            "utf8"
        ).trim();

        if (!conteudo) {
            return {};
        }

        const dados = JSON.parse(conteudo);

        if (
            typeof dados !== "object" ||
            Array.isArray(dados) ||
            dados === null
        ) {
            console.warn(
                "⚠️ Banco inválido. Criando banco vazio."
            );

            return {};
        }

        return dados;

    } catch (erro) {

        console.error(
            "❌ Erro ao carregar usuarios.json:",
            erro
        );

        return {};
    }
}


// ═══════════════════════════════════════════════════════════════
// 💾 SALVAR BANCO DE DADOS
// ═══════════════════════════════════════════════════════════════

function saveDB(dados) {

    garantirBanco();

    const arquivoTemporario =
        `${DB_PATH}.tmp`;

    try {

        const conteudo =
            JSON.stringify(
                dados,
                null,
                2
            );

        // Escreve primeiro em arquivo temporário.
        // Isso reduz o risco de destruir o banco
        // caso o processo seja interrompido durante a escrita.
        fs.writeFileSync(
            arquivoTemporario,
            conteudo,
            "utf8"
        );

        fs.renameSync(
            arquivoTemporario,
            DB_PATH
        );

    } catch (erro) {

        console.error(
            "❌ Erro ao salvar usuarios.json:",
            erro
        );

        if (
            fs.existsSync(
                arquivoTemporario
            )
        ) {
            try {
                fs.unlinkSync(
                    arquivoTemporario
                );
            } catch {}
        }

        throw erro;
    }
}


// ═══════════════════════════════════════════════════════════════
// 👤 CRIAR / GARANTIR USUÁRIO
// ═══════════════════════════════════════════════════════════════

function garantirUsuario(
    db,
    usuarioId,
    nome = "Viajante"
) {

    if (!db[usuarioId]) {

        db[usuarioId] = {
            nivel: 1,
            xp: 0,
            ouro: 0,
            nome,
            ultimaAtividade: Date.now()
        };

        return db[usuarioId];
    }


    // Corrige possíveis dados antigos/incompletos
    if (
        typeof db[usuarioId].nivel !== "number" ||
        db[usuarioId].nivel < 1
    ) {
        db[usuarioId].nivel = 1;
    }

    if (
        typeof db[usuarioId].xp !== "number" ||
        db[usuarioId].xp < 0
    ) {
        db[usuarioId].xp = 0;
    }

    if (
        typeof db[usuarioId].ouro !== "number" ||
        db[usuarioId].ouro < 0
    ) {
        db[usuarioId].ouro = 0;
    }

    if (!db[usuarioId].nome) {
        db[usuarioId].nome = nome;
    }

    return db[usuarioId];
}


// ═══════════════════════════════════════════════════════════════
// 🎲 XP ALEATÓRIO
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// 🐢 PROGRESSÃO LENTA (nível por DIAS de atividade, não por quantidade de mensagens)
// ═══════════════════════════════════════════════════════════════
// • Cada mensagem de texto vale 1 XP, mas só conta se passou o INTERVALO desde a
//   última que contou (60 s) e se não passou do LIMITE DO DIA (10 XP).
//   Ou seja: mandar 70 mensagens seguidas NÃO adianta — o dia rende no máximo 10 XP.
// • Pra subir de nível a pessoa precisa de X dias "no máximo de atividade":
//     nível 1 → 2:  5 dias     nível 2 → 3: 12 dias     nível 3 → 4: 20 dias
//     nível 4 → 5: 70 dias     depois: 120, 180, 250, 365... e cresce 25% a cada nível
//   Quem manda poucas mensagens por dia demora ainda mais.
// Tudo ajustável no config.js, no bloco LEVEL: { XP_POR_DIA, INTERVALO_SEGUNDOS,
// XP_POR_MENSAGEM, DIAS_POR_NIVEL: [5, 12, 20, 70, ...] }
function configLevel() {
    const c = config.LEVEL || {};
    return {
        xpPorDia: Number(c.XP_POR_DIA) > 0 ? Number(c.XP_POR_DIA) : 10,
        intervaloMs: (Number(c.INTERVALO_SEGUNDOS) >= 0 ? Number(c.INTERVALO_SEGUNDOS) : 60) * 1000,
        xpPorMensagem: Number(c.XP_POR_MENSAGEM) > 0 ? Number(c.XP_POR_MENSAGEM) : 1,
        dias: Array.isArray(c.DIAS_POR_NIVEL) && c.DIAS_POR_NIVEL.length ? c.DIAS_POR_NIVEL.map(Number) : [5, 12, 20, 70, 120, 180, 250, 365]
    };
}

// Quantos dias (no máximo de atividade) pra sair desse nível pro próximo.
function diasParaSubir(nivel) {
    const { dias } = configLevel();
    const n = Math.max(1, Math.floor(nivel));
    if (n <= dias.length) return dias[n - 1];
    return Math.round(dias[dias.length - 1] * Math.pow(1.25, n - dias.length));
}

// XP necessário pra sair desse nível pro próximo.
function xpNecessario(nivel) {
    return diasParaSubir(nivel) * configLevel().xpPorDia;
}

// Data de hoje no fuso do Brasil (pra zerar o limite diário à meia-noite daqui).
function diaDeHoje() {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function normalizarTextoXp(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

// Decide se ESSA mensagem rende XP e quanto. Mexe no registro do usuário.
function calcularXpDaMensagem(usuario, texto) {
    const cfg = configLevel();
    const agora = Date.now();
    const hoje = diaDeHoje();

    if (!usuario.xpDia || usuario.xpDia.dia !== hoje) usuario.xpDia = { dia: hoje, ganho: 0 };

    const normalizado = normalizarTextoXp(texto);
    if (normalizado.length < 3) return 0;                                     // "k", "oi?", "." não contam
    if (usuario.ultimoTextoXp && usuario.ultimoTextoXp === normalizado) return 0; // texto repetido não conta
    if (agora - (usuario.ultimoXpEm || 0) < cfg.intervaloMs) return 0;        // calma: 1 por minuto
    if (usuario.xpDia.ganho >= cfg.xpPorDia) return 0;                        // bateu o limite do dia

    const ganho = Math.min(cfg.xpPorMensagem, cfg.xpPorDia - usuario.xpDia.ganho);
    usuario.xpDia.ganho += ganho;
    usuario.ultimoXpEm = agora;
    usuario.ultimoTextoXp = normalizado;
    return ganho;
}


// ═════════════════════════════════════════════════
// 📢 ANÚNCIO DE LEVEL UP (um por vez, por pessoa)
// ═════════════════════════════════════════════════

const anunciosEmAndamento = new Set();

async function anunciarLevelUp(sock, grupoId, usuarioId, nivel, recompensaOuro) {

    // Se já tem um aviso dessa pessoa sendo montado/enviado, não manda outro.
    const chave = `${grupoId}|${usuarioId}`;
    if (anunciosEmAndamento.has(chave)) return;
    anunciosEmAndamento.add(chave);

    try {

        const nomeExibicao = usuarioId.split("@")[0];

        const legendaSubida = `
〔 🎉 𝐋𝐄𝐕𝐄𝐋 𝐔𝐏 〕
『 🆙 𝐍𝐎𝐕𝐎 𝐍𝐈́𝐕𝐄𝐋 』
    └─ @${nomeExibicao}
        └─ Você subiu de nível!
━━━━━━━━━━━━━━
> 📈 𝐍𝐈́𝐕𝐄𝐋
   └─ ${nivel}
> 🪙 𝐑𝐄𝐂𝐎𝐌𝐏𝐄𝐍𝐒𝐀
   └─ +${recompensaOuro} moedas de ouro
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;

        let fotoBuffer = null;
        try {
            const fotoUrl = await sock.profilePictureUrl(usuarioId, "image");
            if (fotoUrl) fotoBuffer = await baixarBuffer(fotoUrl);
        } catch {
            fotoBuffer = null;
        }

        let fotoContextoBuffer = null;
        try {
            fotoContextoBuffer = await buscarFotoContexto(sock, grupoId);
        } catch {
            fotoContextoBuffer = null;
        }

        try {

            await enviarCardOuAnimado(sock, grupoId, (fundoBuffer) => criarCardLevelUp({
                fotoBuffer,
                nomeUsuario: nomeExibicao,
                novoNivel: nivel,
                ouroGanho: recompensaOuro,
                fotoContextoBuffer,
                fundoBuffer
            }), {
                caption: legendaSubida,
                mentions: [usuarioId]
            });

        } catch (erroCard) {

            console.error("❌ Erro no card de Level Up:", erroCard);

            try {
                await sock.sendMessage(grupoId, {
                    text: legendaSubida,
                    mentions: [usuarioId]
                });
            } catch (erroFallback) {
                console.error("❌ Erro no fallback do Level Up:", erroFallback);
            }
        }

    } finally {
        // segura a trava por alguns segundos: se a pessoa continuar mandando
        // mensagens e subir de novo logo em seguida, não vira uma chuva de avisos
        setTimeout(() => anunciosEmAndamento.delete(chave), 15000);
    }
}


// ═══════════════════════════════════════════════════════════════
// 🆙 PROCESSAMENTO DE LEVEL
// ═══════════════════════════════════════════════════════════════

async function processLevel(sock, msg) {

    try {

        // ───────────────────────────────────────────────────────
        // 🚫 IGNORA MENSAGENS SEM PARTICIPANTE
        // ───────────────────────────────────────────────────────

        if (!msg?.key?.participant) {
            return;
        }


        // ───────────────────────────────────────────────────────
        // 📝 EXTRAI TEXTO
        // ───────────────────────────────────────────────────────

        const textoMensagem =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";


        if (!textoMensagem) {
            return;
        }


        // ───────────────────────────────────────────────────────
        // 🚫 COMANDOS NÃO DÃO XP
        // ───────────────────────────────────────────────────────

        const prefixo =
            config.PREFIX || ".";

        if (
            textoMensagem.trim()
                .startsWith(prefixo)
        ) {
            return;
        }


        // ───────────────────────────────────────────────────────
        // 👤 DADOS DO USUÁRIO
        // ───────────────────────────────────────────────────────

        const usuarioId =
            msg.key.participant;

        const grupoId =
            msg.key.remoteJid;

        const nomeUsuario =
            msg.pushName?.trim() ||
            "Viajante";


        // ───────────────────────────────────────────────────────
        // 📂 CARREGA BANCO
        // ───────────────────────────────────────────────────────

        // 🔒 LEVEL DESLIGADO POR PADRÃO: só funciona nos grupos onde um admin ligou
        // com <prefixo>level on. Desligado = não conta XP e não manda aviso.
        try {
            const { getDB } = require("../grupo-db/grupo-db");
            if (getDB()[grupoId]?.level !== true) return;
        } catch {
            return;
        }

        const db = loadDB();

        const usuario =
            garantirUsuario(
                db,
                usuarioId,
                nomeUsuario
            );


        // ───────────────────────────────────────────────────────
        // 🔄 ATUALIZA DADOS
        // ───────────────────────────────────────────────────────

        usuario.nome =
            nomeUsuario;

        usuario.ultimaAtividade =
            Date.now();


        // ───────────────────────────────────────────────────────
        // ⚡ ADICIONA XP
        // ───────────────────────────────────────────────────────

        const xpGanho = calcularXpDaMensagem(usuario, textoMensagem);

        if (xpGanho <= 0) {
            // Não rendeu XP (spam, repetida, limite do dia...): só guarda a atividade.
            saveDB(db);
            return;
        }

        usuario.xp += xpGanho;


        // ───────────────────────────────────────────────────────
        // 🆙 VERIFICA LEVEL UP
        // ───────────────────────────────────────────────────────

        // 🔒 TUDO ATÉ O saveDB ABAIXO É SÍNCRONO (nenhum await no meio).
        // Antes, o envio do card (que demora) acontecia ANTES de salvar:
        // se a pessoa mandasse 10 mensagens de uma vez, as 10 liam o mesmo
        // banco "antigo", as 10 achavam que tinham acabado de subir de nível
        // e o bot mandava 10 avisos. Agora o nível é calculado e salvo na
        // hora; só a 1ª mensagem sobe de nível, as outras 9 já leem o banco
        // atualizado e não têm o que anunciar.
        let nivelSubiu = false;
        let ouroDaSubida = 0;

        while (
            usuario.xp >=
            xpNecessario(usuario.nivel)
        ) {
            usuario.xp -= xpNecessario(usuario.nivel);
            usuario.nivel += 1;

            const recompensaOuro = usuario.nivel * 50;
            usuario.ouro += recompensaOuro;

            nivelSubiu = true;
            ouroDaSubida += recompensaOuro;
        }

        // ───────────────────────────────────────────────────────
        // 💾 SALVA BANCO
        // ───────────────────────────────────────────────────────

        saveDB(db);

        // 📢 UM único aviso, com o nível final e todo o ouro ganho.
        if (nivelSubiu) {
            await anunciarLevelUp(sock, grupoId, usuarioId, usuario.nivel, ouroDaSubida);
        }

    } catch (erro) {

        console.error(
            "❌ Erro no sistema de Level:",
            erro
        );
    }
}


// ═══════════════════════════════════════════════════════════════
// 💰 ADICIONAR OURO
// ═══════════════════════════════════════════════════════════════

async function addGold(
    usuarioId,
    quantidade
) {

    if (
        !usuarioId ||
        !Number.isFinite(quantidade) ||
        quantidade <= 0
    ) {
        return false;
    }


    const valor =
        Math.floor(quantidade);


    if (valor <= 0) {
        return false;
    }


    const db =
        loadDB();


    const usuario =
        garantirUsuario(
            db,
            usuarioId,
            "Usuário"
        );


    usuario.ouro +=
        valor;


    saveDB(db);


    console.log(
        `[💰 OURO] +${valor} → ${usuarioId}`
    );


    return true;
}


// ═══════════════════════════════════════════════════════════════
// 📉 REMOVER OURO
// ═══════════════════════════════════════════════════════════════

async function removeGold(
    usuarioId,
    quantidade
) {

    if (
        !usuarioId ||
        !Number.isFinite(quantidade) ||
        quantidade <= 0
    ) {
        return 0;
    }


    const valorSolicitado =
        Math.floor(quantidade);


    if (valorSolicitado <= 0) {
        return 0;
    }


    const db =
        loadDB();


    if (!db[usuarioId]) {
        return 0;
    }


    const usuario =
        garantirUsuario(
            db,
            usuarioId,
            "Usuário"
        );


    // Nunca permite saldo negativo
    const valorRemovido =
        Math.min(
            valorSolicitado,
            usuario.ouro
        );


    usuario.ouro -=
        valorRemovido;


    saveDB(db);


    console.log(
        `[💰 OURO] -${valorRemovido} → ${usuarioId}`
    );


    return valorRemovido;
}


// ═══════════════════════════════════════════════════════════════
// 💳 CONSULTAR SALDO
// ═══════════════════════════════════════════════════════════════

function getBalance(usuarioId) {

    if (!usuarioId) {

        return {
            nivel: 1,
            xp: 0,
            ouro: 0
        };
    }


    const db =
        loadDB();


    if (!db[usuarioId]) {

        return {
            nivel: 1,
            xp: 0,
            ouro: 0
        };
    }


    return db[usuarioId];
}


// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTAÇÕES
// ═══════════════════════════════════════════════════════════════

module.exports = {
    xpNecessario,
    diasParaSubir,
    configLevel,
    processLevel,
    loadDB,
    saveDB,
    addGold,
    removeGold,
    getBalance
};