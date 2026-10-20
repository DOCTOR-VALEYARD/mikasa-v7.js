// src/grupo.js — GERENCIAMENTO E SISTEMAS DE GRUPO
const config = require("../../config");
const fs = require("fs");
const path = require("path"); // ✅ Módulo path correto
const jsonPath = path.join(__dirname, "../dados/grupos.json"); // ✅ Caminho absoluto (não depende mais de onde o node foi chamado)
const { criarCardBoasVindas, criarCardDespedida, criarCardSolicitacao, criarCardSolicitacaoRecusada, criarCardMarcarTodos, baixarBuffer } = require("../cardGenerator/cardGenerator");
const { enviarCardOuAnimado } = require("../card-envio/card-envio");
const { gerarMensagemSolicitacao, gerarMensagemRecusa } = require("../solicitacao-mensagens/solicitacao-mensagens");
const { gerarChamadaEntrada, gerarZoeiraSaida, montarBemVindoPartes, montarMensagemSaida } = require("../boasvindas-mensagens/boasvindas-mensagens");
const { buscarFotoContexto } = require("../foto-contexto/foto-contexto");
const { getDB, saveDB } = require("../grupo-db/grupo-db");
const { resolverCaminhoSalvo } = require("../caminhos/caminhos");
const { ehDono } = require("../utils-validacao/utils-validacao");
const { ehConteudoImproprio } = require("../antinsfw/antinsfw");
const { enviarAudioDaPasta } = require("../audio-pastas/audio-pastas");

const rastreadorSpam = new Map();
const rastreadorFlood = new Map();

/* =========================
   📂 ACESSO AO BANCO (ver grupo-db.js)
========================= */

/* =========================
   🔧 NORMALIZAÇÃO DE ID
========================= */
function normalize(id) {
    if (!id) return "";
    return id.split(':')[0].split('@')[0];
}

// 🔁 Tenta de novo em caso de "Connection Closed" ou outra falha de rede
// passageira — dá até 2 segundos pra conexão voltar antes de desistir de
// vez. Sem isso, uma queda rápida de conexão (bem comum no WhatsApp) fazia
// o bot simplesmente não mandar nada, mesmo com toda a proteção de código.
// 🔁 Tenta de novo em caso de "Connection Closed" ou outra falha de rede
// passageira. Isso é comum logo nos primeiros segundos após reconectar,
// quando a "conexão de mídia" do WhatsApp ainda não terminou de
// estabilizar — por isso o tempo de espera cresce a cada tentativa
// (2s, 4s, 6s, 8s), dando mais chance de segurar até 20s no total antes
// de desistir de vez.
async function enviarComRetentativa(sock, jid, conteudo, tentativas = 5) {
    for (let i = 1; i <= tentativas; i++) {
        try {
            return await sock.sendMessage(jid, conteudo);
        } catch (erro) {
            const ultima = i === tentativas;
            console.error(`⚠️ Falha ao enviar (tentativa ${i}/${tentativas}): ${erro?.message || erro}`);
            if (ultima) throw erro;
            await new Promise(r => setTimeout(r, 2000 * i));
        }
    }
}

/* =========================
   📰 JORNAL DO GRUPO — registro de entradas/saídas + fotos
   (usado pelos cards de entrada/saída e pelo comando "saidas")
========================= */
const jornalPath = path.join(__dirname, "../dados/saidas-grupo.json");
const fotosMembrosDir = path.join(__dirname, "../dados/fotos-membros");

function lerJornal() {
    try {
        if (fs.existsSync(jornalPath)) return JSON.parse(fs.readFileSync(jornalPath, "utf8")) || {};
    } catch (e) { console.error("⚠️ Jornal: não consegui ler o registro:", e?.message || e); }
    return {};
}
function salvarJornal(dados) {
    try {
        fs.mkdirSync(path.dirname(jornalPath), { recursive: true });
        fs.writeFileSync(jornalPath, JSON.stringify(dados));
    } catch (e) { console.error("⚠️ Jornal: não consegui salvar o registro:", e?.message || e); }
}
function registrarEntradaJornal(grupoId, numero) {
    try {
        const dados = lerJornal();
        const g = dados[grupoId] || (dados[grupoId] = { entradas: {}, saidas: [] });
        g.entradas[numero] = Date.now();
        salvarJornal(dados);
    } catch {}
}
// devolve há quanto tempo a pessoa estava no grupo (ms) ou null se não sabemos
function registrarSaidaJornal(grupoId, { numero, jid, motivo, autor }) {
    let tempoMs = null;
    try {
        const dados = lerJornal();
        const g = dados[grupoId] || (dados[grupoId] = { entradas: {}, saidas: [] });
        if (g.entradas[numero]) tempoMs = Date.now() - g.entradas[numero];
        delete g.entradas[numero];
        g.saidas.unshift({ numero, jid, motivo, autor: autor || null, ts: Date.now(), tempoMs });
        g.saidas = g.saidas.slice(0, 30);
        salvarJornal(dados);
    } catch {}
    return tempoMs;
}
function formatarDuracao(ms) {
    if (ms == null || ms < 0) return null;
    const min = Math.floor(ms / 60000);
    if (min < 1) return "menos de 1 minuto";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h${min % 60 ? ` ${min % 60}min` : ""}`;
    const d = Math.floor(h / 24);
    if (d < 30) return `${d} dia${d > 1 ? "s" : ""}${h % 24 ? ` e ${h % 24}h` : ""}`;
    const m = Math.floor(d / 30);
    return `${m} ${m > 1 ? "meses" : "mês"}${d % 30 ? ` e ${d % 30} dia${d % 30 > 1 ? "s" : ""}` : ""}`;
}
function guardarFotoMembro(numero, buffer) {
    try {
        if (!numero || !buffer) return;
        fs.mkdirSync(fotosMembrosDir, { recursive: true });
        fs.writeFileSync(path.join(fotosMembrosDir, `${String(numero).replace(/\D/g, "")}.jpg`), buffer);
    } catch {}
}
function lerFotoMembro(numero) {
    try {
        const f = path.join(fotosMembrosDir, `${String(numero).replace(/\D/g, "")}.jpg`);
        if (fs.existsSync(f)) return fs.readFileSync(f);
    } catch {}
    return null;
}

// 📰 Botão único dos cards de entrada/saída: abre uma lista (formato do musica.js)
function botaoMaisNoJornal() {
    return {
        name: "single_select",
        buttonParamsJson: JSON.stringify({
            title: "📰 MAIS NO JORNAL",
            sections: [{
                title: "📰 jornal do grupo",
                rows: [
                    { id: "cmd:rank", title: "🏆 Ranking", description: "Quem mais manda mensagem no grupo" },
                    { id: "cmd:convite", title: "🔗 Convidar alguém", description: "Gera o link de convite do grupo" },
                    { id: "cmd:saidas", title: "📰 Últimas saídas", description: "Quem saiu do grupo recentemente" }
                ]
            }]
        })
    };
}

// Envia o card com o botão "MAIS NO JORNAL" (sem botão de canal). Se o
// formato interativo falhar, cai pra imagem normal com legenda.
async function enviarCardJornal(sock, grupoId, pngBuffer, caption, mentions = [], comBotao = true) {
    try {
        if (!comBotao) throw new Error("sem botão");
        const { enviarNativeFlow } = require("../menuBotoes/menuBotoes");
        await enviarNativeFlow(sock, grupoId, {
            text: caption,
            footer: `🧣 ${config.BOT_NAME || "Mikasa"}`,
            imageBuffer: pngBuffer,
            buttons: [botaoMaisNoJornal()],
            mentions
        });
        return;
    } catch (erroNativo) {
        console.error("⚠️ Card com botão falhou, enviando imagem simples:", erroNativo?.message || erroNativo);
    }
    await enviarComRetentativa(sock, grupoId, { image: pngBuffer, caption, mentions });
}

/* =========================
   👑 VERIFICAÇÃO DE ADMIN
========================= */
// 🔧 Antes, a comparação só testava sock.user.id contra p.id/p.lid — mas o
// WhatsApp mudou a forma de identificar participantes em muitos grupos pra
// um sistema de "lid" (identidade oculta), e o bot também tem um @lid
// próprio (sock.user.lid), separado do número de telefone (sock.user.id).
// Se o grupo lista o bot pelo @lid e a checagem só olhava o número de
// telefone (ou vice-versa), o bot nunca "se reconhecia" como admin. Agora
// juntamos TODOS os identificadores possíveis do bot (número + lid) e
// comparamos contra TODOS os identificadores possíveis do participante
// (id + lid), then any cruzamento que bater conta como "é o bot".
function souEuNoGrupo(participante, sock) {
    if (!participante) return false;
    const meuLidManual = "138457615745263"; // ✅ ID DE ACESSO MÁXIMO
    const candidatosSelf = [sock.user?.id, sock.user?.lid, meuLidManual]
        .filter(Boolean)
        .map(normalize);
    const candidatosParticipante = [participante.id, participante.lid, participante.jid]
        .filter(Boolean)
        .map(normalize);
    return candidatosParticipante.some(c => candidatosSelf.includes(c));
}

// 🧠 Versões "puras" — recebem o `meta` (dados do grupo) já buscado, sem
// fazer nenhuma chamada de rede nova. Usadas quando já temos o meta em
// mãos, pra nunca precisar buscar 2x seguido (isso causava falha
// intermitente: a 2ª chamada de sock.groupMetadata logo depois da 1ª
// podia falhar/travar, e o catch escondia isso retornando "não é admin").
function checarAdminDeUsuarioComMeta(meta, userId, sock) {
    const senderId = normalize(userId);
    const meuLidManual = "138457615745263";

    // 🤖 O próprio número do bot é tratado como dono: passa por qualquer trava.
    if (senderId === normalize(sock.user?.id || "") || senderId === meuLidManual) {
        return true;
    }
    const participante = meta.participants.find(p =>
        normalize(p.id) === senderId || (p.lid && normalize(p.lid) === senderId)
    );
    // 👑 Dono do bot (e outros números do dono) sempre valem como admin.
    if (ehDono([userId, participante?.id, participante?.lid, participante?.phoneNumber], config.OWNER_NUMBER)) {
        return true;
    }
    return participante?.admin === "admin" || participante?.admin === "superadmin";
}

function checarBotAdminComMeta(meta, sock) {
    const botNoGrupo = meta.participants.find(p => souEuNoGrupo(p, sock));
    return botNoGrupo?.admin === "admin" || botNoGrupo?.admin === "superadmin";
}

async function isAdmin(sock, jid, userId) {
    try {
        const meta = await sock.groupMetadata(jid);
        return checarAdminDeUsuarioComMeta(meta, userId, sock);
    } catch (e) { 
        console.error("Verificar Admin:", e);
        return false; 
    }
}

async function isBotAdmin(sock, jid) {
    try {
        const meta = await sock.groupMetadata(jid);
        return checarBotAdminComMeta(meta, sock);
    } catch (e) { 
        console.error("Verificar Bot Admin:", e);
        return false; 
    }
}

/* =========================
   📌 COMANDOS E REGRAS — PADRÃO VISUAL UNIFICADO
========================= */
async function grupoHandler(sock, msg, command, args) {
    const from = msg.key.remoteJid;
    if (!from || !from.endsWith("@g.us")) return;

    const sender = msg.key.participant || msg.key.remoteJid;
    const db = getDB();
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");

    // ✅ INICIALIZA DADOS DO GRUPO — RECURSOS AUTOMÁTICOS DESLIGADOS POR PADRÃO
    const padroesGrupo = {
        antilink: false,
        antinota: false,
        antiloc: false,
        antidoc: false,
        antifake: false,
        antispam: false,
        antiflood: false,
        antinsfw: false,
        antinudes: false,
        somenteadm: false,
        saudacao: false,
        antiamor: false,
        regras: "⚠️ Nenhuma regra definida ainda.\nUse: " + config.PREFIX + "regras [seu texto] para cadastrar."
    };
    if (!db[from]) db[from] = {};
    let bancoAlterado = false;
    for (const [chave, valorPadrao] of Object.entries(padroesGrupo)) {
        if (db[from][chave] === undefined) {
            db[from][chave] = valorPadrao;
            bancoAlterado = true;
        }
    }
    if (bancoAlterado) saveDB(db);

    // 🔧 Busca o meta do grupo UMA ÚNICA VEZ e reaproveita pras duas
    // checagens. Antes eram 2 chamadas de rede (sock.groupMetadata)
    // muito próximas uma da outra — e a 2ª podia falhar silenciosamente
    // (o catch devolvia "não é admin" mesmo quando na verdade era).
    let metaAtual = null;
    try { metaAtual = await sock.groupMetadata(from); } catch (e) {
        console.error("❌ Erro ao buscar metadados do grupo:", e);
    }
    const userAdmin = metaAtual ? checarAdminDeUsuarioComMeta(metaAtual, sender, sock) : await isAdmin(sock, from, sender);
    const botAdmin = metaAtual ? checarBotAdminComMeta(metaAtual, sock) : await isBotAdmin(sock, from);


    switch (command) {

    // ✅ CITAR / CITA — marca todo mundo reenviando a mensagem marcada
    // (ou o texto digitado). Toda a lógica fica em src/citar.
    case "cita":
    case "citar": {
        if (!userAdmin) {
            return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });
        }
        const { citar } = require("../citar/citar");
        return citar(sock, msg, args, metaAtual);
    }

    // ✅ MARCAR TODOS / CONVOCAÇÃO
    case "marcar":
    case "hidetag": {
        if (!userAdmin) {
            const aviso = `

 〔 🚫 𝐀𝐂𝐄𝐒𝐒𝐎 𝐍𝐄𝐆𝐀𝐃𝐎 〕

⚠️ PERMISSÃO INSUFICIENTE!

❌ Esta função é exclusiva para
ADMINISTRADORES DO GRUPO.

🔐 Seu nível de acesso não permite
executar este comando.

╭『 🛡️ 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐂̧𝐀̃𝐎 』
│ 👑 Somente administradores
│    podem utilizar esta função.
╰──────────────────

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        try {
            const groupMetadata = await sock.groupMetadata(from);
            const groupName = groupMetadata.subject;
            const participants = groupMetadata.participants;
            const participantJids = participants.map(p => p.id);

            const mensagemBase = args.join(" ") || "📢 ATENÇÃO GERAL A TODOS OS MEMBROS!";

            // 🔧 Em grupos com sistema LID, "sender" pode vir como um ID
            // oculto (ex: 2605333353717854), não o número de telefone —
            // por isso o nome exibido saía errado. "participantAlt" traz
            // o JID de telefone de verdade quando disponível.
            const senderTelefone = msg.key.participantAlt || sender;

            // 📢 MARCAÇÃO INVISÍVEL: nenhum card e nenhuma lista de @.
            // O WhatsApp recebe as mentions, mas o texto mostra somente
            // a mensagem personalizada e os dados do grupo.
            const administradores = participants.filter(p => !!p.admin).length;
            const textoMarcar =
`☀️ *BOM DIA, GRUPO ${groupName.toUpperCase()}!* 🌷

📢 *ATENÇÃO A TODOS OS MEMBROS*

👥 Membros: *${participantJids.length}*
🛡️ Administradores: *${administradores}*
👑 Criador: *${config.OWNER_NAME || 'Dono do bot'}*

💬 ${mensagemBase}`;

            // 🔗 Botões de URL: 1 toque já abre o canal / o PV do criador.
            // (Antes eram botões de resposta que mandavam OUTRO botão — agora não.)
            const { enviarNativeFlow, botaoUrl, obterLinkCanalConfig, linkFalarComCriador } = require('../menuBotoes/menuBotoes');
            const botoesLinks = [];
            const linkCanal = obterLinkCanalConfig() || config.CHANNEL_URL;
            const linkCriador = linkFalarComCriador();
            if (linkCanal) botoesLinks.push(botaoUrl('📢 ENTRAR NO CANAL', linkCanal));
            if (linkCriador) botoesLinks.push(botaoUrl('👑 FALAR COM O CRIADOR', linkCriador));

            const mencoesMarcar = [...new Set([sender, senderTelefone, ...participantJids])];
            if (botoesLinks.length) {
                await enviarNativeFlow(sock, from, {
                    text: textoMarcar,
                    footer: config.BOT_NAME || 'Mikasa Bot',
                    quoted: msg,
                    mentions: mencoesMarcar,
                    buttons: botoesLinks
                });
            } else {
                await sock.sendMessage(from, { text: textoMarcar, mentions: mencoesMarcar }, { quoted: msg });
            }

        } catch (erro) {
            console.error("Erro Marcar:", erro);
            const erroMsg = `
 〔 ❌ 𝐅𝐀𝐋𝐇𝐀 𝐍𝐀 𝐀𝐂̧𝐀̃𝐎 〕
┅┄┅┄『 ⚠️ 𝐀𝐓𝐄𝐍𝐂̧𝐀̃𝐎 』┄┅┄┅┄
└─ Não consegui realizar a marcação.
└─ Verifique minhas permissões no grupo.
━━━━━━━━━━━━━━

«🛡️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐎̃𝐄𝐒
└─ Certifique-se de que o bot possui
as permissões necessárias.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            await sock.sendMessage(from, { text: erroMsg }, { quoted: msg });
        }
        break;
    }


    // ✅ PROMOVER A ADMIN
    case "promover": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐆𝐀𝐃𝐀 〕
┅┄『 🛡️ 𝐀𝐂𝐄𝐒𝐒𝐎 𝐑𝐄𝐒𝐓𝐑𝐈𝐓𝐎 』
└─ Apenas administradores podem
promover membros do grupo.
━━━━━━━━━━━━━━

«👑 𝐅𝐔𝐍𝐂̧𝐀̃𝐎 𝐄𝐗𝐂𝐋𝐔𝐒𝐈𝐕𝐀
└─ Este comando está disponível
somente para administradores.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        if (!botAdmin) {
            const aviso = `
〔 ⚠️ 𝐅𝐀𝐋𝐓𝐀 𝐃𝐄 𝐀𝐂𝐄𝐒𝐒𝐎 〕
『 🛡️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐂𝐄𝐒𝐒𝐀́𝐑𝐈𝐀 』
 └─ Preciso ser administrador do grupo
para poder promover usuários.
━━━━━━━━━━━━━━
«👑 𝐀𝐂̧𝐀̃𝐎 𝐈𝐌𝐏𝐄𝐃𝐈𝐃𝐀
 └─ Conceda ao bot privilégios de
administrador e tente novamente.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
      
        const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mencionado || mencionado.length === 0) {
            const aviso = `
〔 ⚠️ 𝐒𝐄𝐋𝐄𝐂𝐈𝐎𝐍𝐄 𝐀𝐋𝐆𝐔𝐄́𝐌 〕
『 👤 𝐌𝐄𝐌𝐁𝐑𝐎 𝐍𝐀̃𝐎 𝐒𝐄𝐋𝐄𝐂𝐈𝐎𝐍𝐀𝐃𝐎 』
    └─ Você precisa marcar ou responder
à mensagem de quem deseja promover.
━━━━━━━━━━━━━━
«📌 𝐄𝐗𝐄𝐌𝐏𝐋𝐎
 └─ ${config.PREFIX} promover @nome
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
      
        await sock.groupParticipantsUpdate(from, mencionado, "promote");
        
        const sucesso = `
〔 ✅ 𝐂𝐀𝐑𝐆𝐎 𝐀𝐋𝐓𝐄𝐑𝐀𝐃𝐎 〕
『 👑 𝐍𝐎𝐕𝐎 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐃𝐎𝐑 』
└─ 👑 @${normalize(mencionado[0])}
└─ Agora é 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐃𝐎𝐑 do grupo! 🎖️
━━━━━━━━━━━━━━
«🏆 𝐏𝐎𝐒𝐈𝐂̧𝐀̃𝐎 𝐀𝐋𝐓𝐄𝐑𝐀𝐃𝐀
└─ O cargo foi atualizado com sucesso.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
        await sock.sendMessage(from, { text: sucesso, mentions: mencionado }, { quoted: msg });
        break;
    }


    // ✅ REBAIXAR ADMIN
    case "rebaixar": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐆𝐀𝐃𝐀 〕
『 🛡️ 𝐀𝐂𝐄𝐒𝐒𝐎 𝐑𝐄𝐒𝐓𝐑𝐈𝐓𝐎 』
└─ Apenas administradores podem
remover cargos de gestão.
━━━━━━━━━━━━━━
«👑 𝐅𝐔𝐍𝐂̧𝐀̃𝐎 𝐄𝐗𝐂𝐋𝐔𝐒𝐈𝐕𝐀
└─ Somente administradores possuem
autorização para executar esta ação.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        if (!botAdmin) {
            const aviso = `
〔 ⚠️ 𝐅𝐀𝐋𝐓𝐀 𝐃𝐄 𝐀𝐂𝐄𝐒𝐒𝐎 〕
『 🛡️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐂𝐄𝐒𝐒𝐀́𝐑𝐈𝐀 』
└─ Preciso ser administrador do grupo
para poder rebaixar usuários.
━━━━━━━━━━━━━━
«👑 𝐀𝐂̧𝐀̃𝐎 𝐈𝐌𝐏𝐄𝐃𝐈𝐃𝐀
└─ Conceda ao bot privilégios de
administrador e tente novamente.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mencionado || mencionado.length === 0) {
            const aviso = `
〔 ⚠️ 𝐒𝐄𝐋𝐄𝐂𝐈𝐎𝐍𝐄 𝐀𝐋𝐆𝐔𝐄́𝐌 〕
『 👤 𝐌𝐄𝐌𝐁𝐑𝐎 𝐍𝐀̃𝐎 𝐒𝐄𝐋𝐄𝐂𝐈𝐎𝐍𝐀𝐃𝐎 』
└─ Você precisa marcar ou responder
à mensagem de quem deseja rebaixar.
━━━━━━━━━━━━━━
«⚠️ 𝐀𝐂̧𝐀̃𝐎 𝐈𝐍𝐕𝐀́𝐋𝐈𝐃𝐀
└─ Selecione um membro para continuar.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        await sock.groupParticipantsUpdate(from, mencionado, "demote");
        
        const sucesso = `
〔 ✅ 𝐂𝐀𝐑𝐆𝐎 𝐀𝐋𝐓𝐄𝐑𝐀𝐃𝐎 〕
『 👤 𝐌𝐄𝐌𝐁𝐑𝐎 𝐂𝐎𝐌𝐔𝐌 』
└─ @${normalize(mencionado[0])}
└─ Voltou a ser 𝐌𝐄𝐌𝐁𝐑𝐎 𝐂𝐎𝐌𝐔𝐌 do grupo.
━━━━━━━━━━━━━━
«🔄 𝐂𝐀𝐑𝐆𝐎 𝐑𝐄𝐒𝐓𝐀𝐔𝐑𝐀𝐃𝐎
└─ As permissões administrativas foram removidas.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
        await sock.sendMessage(from, { text: sucesso, mentions: mencionado }, { quoted: msg });
        break;
    }


    // ✅ BANIR / EXPULSAR
    case "ban":
    case "kick": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐆𝐀𝐃𝐀 〕
『 🚫 𝐀𝐂̧𝐀̃𝐎 𝐑𝐄𝐒𝐓𝐑𝐈𝐓𝐀 』
└─ Apenas administradores podem
remover participantes do grupo.
━━━━━━━━━━━━━━
«🛡️ 𝐀𝐂𝐄𝐒𝐒𝐎 𝐃𝐄 𝐀𝐃𝐌𝐈𝐍𝐈𝐒𝐓𝐑𝐀𝐂̧𝐀̃𝐎
└─ Você não possui permissão para
executar esta ação.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        if (!botAdmin) {
            const aviso = `
〔 ⚠️ 𝐅𝐀𝐋𝐓𝐀 𝐃𝐄 𝐀𝐂𝐄𝐒𝐒𝐎 〕
『 🛡️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐂𝐄𝐒𝐒Á𝐑𝐈𝐀 』
└─ Preciso ser administrador do grupo
para realizar remoções.
━━━━━━━━━━━━━━
«🚫 𝐀𝐂̧𝐀̃𝐎 𝐈𝐌𝐏𝐄𝐃𝐈𝐃𝐀
└─ Conceda ao bot privilégios de
administrador e tente novamente.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        const citado = msg.message?.extendedTextMessage?.contextInfo?.participant;
        const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
        const alvo = mencionado?.length > 0 ? mencionado : (citado ? [citado] : null);

        if (!alvo) {
            const aviso = `
〔 ⚠️ 𝐃𝐄𝐒𝐓𝐈𝐍𝐎 𝐍𝐀̃𝐎 𝐃𝐄𝐅𝐈𝐍𝐈𝐃𝐎 〕
『 👤 𝐔𝐒𝐔𝐀́𝐑𝐈𝐎 𝐍𝐀̃𝐎 𝐒𝐄𝐋𝐄𝐂𝐈𝐎𝐍𝐀𝐃𝐎 』
└─ Marque o usuário ou responda
diretamente à mensagem dele.
━━━━━━━━━━━━━━
«📌 𝐂𝐎𝐌𝐎 𝐒𝐄𝐋𝐄𝐂𝐈𝐎𝐍𝐀𝐑
└─ Use uma menção ou responda à
mensagem do usuário desejado.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        const alvoEhAdmin = await isAdmin(sock, from, alvo[0]);
        if (alvoEhAdmin) {
            const aviso = `
〔 ⚠️ 𝐎𝐏𝐄𝐑𝐀𝐂̧𝐀̃𝐎 𝐏𝐑𝐎𝐈𝐁𝐈𝐃𝐀 〕
『 🛡️ 𝐀𝐂̧𝐀̃𝐎 𝐁𝐋𝐎𝐐𝐔𝐄𝐀𝐃𝐀 』
└─ Não é permitido remover um
administrador usando este comando.
━━━━━━━━━━━━━━
«🚫 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐑𝐄𝐒𝐓𝐑𝐈𝐓𝐀
└─ Administradores não podem ser
removidos por esta função.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        await sock.groupParticipantsUpdate(from, alvo, "remove");
        
        const sucesso = `
〔 ✅ 𝐔𝐒𝐔𝐀́𝐑𝐈𝐎 𝐑𝐄𝐌𝐎𝐕𝐈𝐃𝐎 〕
『 🚫 𝐑𝐄𝐌𝐎𝐂̧𝐀̃𝐎 𝐂𝐎𝐍𝐂𝐋𝐔𝐈́𝐃𝐀 』
└─ ❌ @${normalize(alvo[0])}
└─ Foi removido permanentemente
deste grupo.
━━━━━━━━━━━━━━
«🛡️ 𝐀𝐂̧𝐀̃𝐎 𝐄𝐗𝐄𝐂𝐔𝐓𝐀𝐃𝐀
└─ O participante não faz mais parte
deste grupo.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
        await sock.sendMessage(from, { text: sucesso, mentions: alvo }, { quoted: msg });
        break;
    }


    // ✅ ANTI-LINK
    case "antilink": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ 𝐏𝐄𝐑𝐌𝐈𝐒𝐒𝐀̃𝐎 𝐍𝐄𝐆𝐀𝐃𝐀 〕
『 🛡️ 𝐂𝐎𝐍𝐅𝐈𝐆𝐔𝐑𝐀𝐂̧𝐀̃𝐎 𝐑𝐄𝐒𝐓𝐑𝐈𝐓𝐀 』
└─ Apenas administradores podem
alterar a configuração de segurança.
━━━━━━━━━━━━━━
«🔐 𝐀𝐂𝐄𝐒𝐒𝐎 𝐁𝐋𝐎𝐐𝐔𝐄𝐀𝐃𝐎
└─ Você não possui autorização para
modificar as configurações do grupo.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━»
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        db[from].antilink = !db[from].antilink;
        saveDB(db);
        
        const status = db[from].antilink ? `✅ ATIVADO` : `❌ DESATIVADO`;
        const mensagem = `
〔 ⚙️ ᴀɴᴛɪ-ʟɪɴᴋ 〕

🔒 Estado atual: *${status}*

❀ Links externos agora serão
${db[from].antilink ? `bloqueados automaticamente e o usuário removido!` : `permitidos normalmente.`}

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }


    // ✅ ANTI-NOTA DE VOZ
    case "antinota": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕

❌ Apenas administradores podem
alterar configuração de mídia!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        db[from].antinota = !db[from].antinota;
        saveDB(db);
        
        const status = db[from].antinota ? `✅ ATIVADO` : `❌ DESATIVADO`;
        const mensagem = `
〔 ⚙️ ᴀɴᴛɪ-ɴᴏᴛᴀ 〕

🔒 Estado atual: *${status}*

❀ Mensagens de áudio/nota
estão ${db[from].antinota ? `PROIBIDAS e apagadas ao serem enviadas!` : `LIBERADAS para todos.`}

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }


    // 📍 ANTI-LOCALIZAÇÃO — apaga localização e remove quem enviou
    case "antiloc": {
        if (!userAdmin) {
            return sock.sendMessage(from, { text: `〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕\n\n❌ Apenas administradores podem\nalterar a proteção contra localização!\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}` }, { quoted: msg });
        }
        db[from].antiloc = !db[from].antiloc;
        saveDB(db);
        const ligado = db[from].antiloc;
        const aviso = !ligado ? "" : (await isBotAdmin(sock, from) ? "" : "\n\n⚠️ Me dê *administrador* no grupo, senão não consigo apagar nem remover!");
        await sock.sendMessage(from, { text: `〔 📍 ᴀɴᴛɪ-ʟᴏᴄᴀʟɪᴢᴀᴄ̧ᴀ̃ᴏ 〕\n\n🔒 Estado atual: *${ligado ? "✅ ATIVADO" : "❌ DESATIVADO"}*\n\n❀ Localização enviada no grupo\n${ligado ? "será APAGADA e o usuário REMOVIDO!" : "está LIBERADA para todos."}${aviso}\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}` }, { quoted: msg });
        break;
    }

    // 📄 ANTI-DOCUMENTO — apaga, adverte na 1ª vez e remove se repetir
    case "antidoc": {
        if (!userAdmin) {
            return sock.sendMessage(from, { text: `〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕\n\n❌ Apenas administradores podem\nalterar a proteção contra documentos!\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}` }, { quoted: msg });
        }
        db[from].antidoc = !db[from].antidoc;
        if (!db[from].antidoc) delete db[from].antidocAvisos;
        saveDB(db);
        const ligado = db[from].antidoc;
        const aviso = !ligado ? "" : (await isBotAdmin(sock, from) ? "" : "\n\n⚠️ Me dê *administrador* no grupo, senão não consigo apagar nem remover!");
        await sock.sendMessage(from, { text: `〔 📄 ᴀɴᴛɪ-ᴅᴏᴄᴜᴍᴇɴᴛᴏ 〕\n\n🔒 Estado atual: *${ligado ? "✅ ATIVADO" : "❌ DESATIVADO"}*\n\n❀ Documentos enviados no grupo\n${ligado ? "serão APAGADOS. 1ª vez: advertência.\nSe repetir: usuário REMOVIDO!" : "estão LIBERADOS para todos."}${aviso}\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}` }, { quoted: msg });
        break;
    }


    // ✅ CONTROLES AUTOMÁTICOS — todos começam desligados
    case "antispam":
    case "antiflood":
    case "somenteadm": {
        if (!userAdmin) return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });
        const recurso = command;
        const estado = String(args[0] || "").toLowerCase();
        if (!["on", "off", "ativar", "desativar"].includes(estado)) {
            return sock.sendMessage(from, { text: `Use: ${config.PREFIX}${recurso} on ou ${config.PREFIX}${recurso} off\nEstado atual: ${db[from]?.[recurso] === true ? "ativado" : "desativado"}.` }, { quoted: msg });
        }
        db[from][recurso] = estado === "on" || estado === "ativar";
        saveDB(db);
        return sock.sendMessage(from, { text: `🛡️ ${recurso} ${db[from][recurso] ? "ativado" : "desativado"}.` }, { quoted: msg });
    }

    // ✅ SAÍDA VOLUNTÁRIA — envia a provocação e depois o bot sai do grupo
    case "sair": {
        const remetente = msg.key.participant || msg.key.remoteJid;
        const nome = normalize(remetente);
        if (!from.endsWith("@g.us")) return;
        const frases = [
            `@${nome}, pediu para eu sair? Finalmente uma decisão sensata da minha parte. Adeus e boa sorte com o silêncio.`,
            `@${nome}, já que você não me quer aqui, vou embora antes que mude de ideia. Não sentirá minha falta — talvez.`,
            `@${nome}, seu desejo foi atendido: estou saindo. Agora tente manter o grupo funcionando sem mim.`
        ];
        const mensagem = frases[Math.floor(Math.random() * frases.length)];
        await sock.sendMessage(from, { text: mensagem, mentions: [remetente] }, { quoted: msg }).catch(() => {});
        await new Promise(resolve => setTimeout(resolve, 1200));
        try { await sock.groupLeave(from); } catch (erro) { console.error("Erro ao sair do grupo:", erro); }
        return;
    }

    // ✅ SAUDAÇÕES AUTOMÁTICAS — desligadas por padrão
    case "saudacao": {
        if (!userAdmin) return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });
        const estado = String(args[0] || "").toLowerCase();
        if (!["on", "off", "ativar", "desativar"].includes(estado)) {
            return sock.sendMessage(from, { text: `Use: ${config.PREFIX}saudacao on ou ${config.PREFIX}saudacao off\nEstado atual: ${db[from]?.saudacao === true ? "ativada" : "desativada"}.` }, { quoted: msg });
        }
        db[from].saudacao = estado === "on" || estado === "ativar";
        saveDB(db);
        return sock.sendMessage(from, { text: `🔊 Saudações automáticas ${db[from].saudacao ? "ativadas" : "desativadas"}.` }, { quoted: msg });
    }

    // 💘 ANTI-AMOR — desligado por padrão (liga/desliga por grupo)
    case "antiamor": {
        if (!userAdmin) return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });
        const estadoAA = String(args[0] || "").toLowerCase();
        if (!["on", "off", "ativar", "desativar", "1", "0"].includes(estadoAA)) {
            return sock.sendMessage(from, { text: `Use: ${config.PREFIX}antiamor on ou ${config.PREFIX}antiamor off\nEstado atual: ${db[from]?.antiamor === true ? "ativado" : "desativado"}.` }, { quoted: msg });
        }
        db[from].antiamor = ["on", "ativar", "1"].includes(estadoAA);
        saveDB(db);
        return sock.sendMessage(from, { text: `💘 Anti-amor ${db[from].antiamor ? "ativado" : "desativado"} neste grupo.` }, { quoted: msg });
    }

    // ✅ BOAS-VINDAS / SAÍDA — agora com liga/desliga de verdade
    // (.bemvindo 1 ativa, .bemvindo 0 desativa). Fica ATIVADO por padrão
    // pra não mudar o comportamento de quem nunca mexeu nisso.
    case "bemvindo": {
        if (!userAdmin) return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });

        const argumento = String(args[0] || "").toLowerCase();
        const ligarPalavras = ["1", "on", "ativar", "ativado"];
        const desligarPalavras = ["0", "off", "desativar", "desativado"];

        if (!ligarPalavras.includes(argumento) && !desligarPalavras.includes(argumento)) {
            const estadoAtual = db[from]?.bemvindo !== false; // ativado por padrão
            const mensagem = `
〔 👋 ʙᴏᴀs-ᴠɪɴᴅᴀs / sᴀɪ́ᴅᴀ 〕

📊 Estado atual: ${estadoAtual ? "🟢 ATIVADO" : "🔴 DESATIVADO"}

❀ Use:
${config.PREFIX}bemvindo 1  → ativa
${config.PREFIX}bemvindo 0  → desativa

🧣 ${config.BOT_NAME}
`;
            return sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        }

        const novoEstado = ligarPalavras.includes(argumento);
        if (!db[from]) db[from] = {};
        db[from].bemvindo = novoEstado;
        saveDB(db);

        const mensagem = novoEstado ? `
✅ SISTEMA ATIVADO ✅

👋 BOAS-VINDAS E SAÍDA: *ATIVADO*

❀ Agora quando alguém entrar ou sair,
o card será gerado e enviado. 🎴✨

❀ ${config.BOT_NAME}
` : `
❌ SISTEMA DESATIVADO ❌

👋 BOAS-VINDAS E SAÍDA: *DESATIVADO*

❀ Nenhuma mensagem será enviada quando
alguém entrar ou sair do grupo.

❀ ${config.BOT_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }

    // ✅ ACEITAR AUTOMÁTICO — liga/desliga (só admin). Quando ATIVADO,
    // toda solicitação de entrada nova é aceita automaticamente e segue
    // o fluxo normal (o "group-participants.update" dispara sozinho e
    // manda o card de boas-vindas de sempre). Quando DESATIVADO (padrão),
    // continua como sempre foi: só mostra o card de solicitação, sem
    // aceitar nada — um admin precisa aprovar manualmente pelo WhatsApp.
    case "aceitar": {
        if (!userAdmin) return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });

        const argumento = String(args[0] || "").toLowerCase();
        const ligarPalavras = ["1", "on", "ativar", "ativado"];
        const desligarPalavras = ["0", "off", "desativar", "desativado"];

        if (!ligarPalavras.includes(argumento) && !desligarPalavras.includes(argumento)) {
            const estadoAtual = db[from]?.aceitarAuto === true; // desativado por padrão
            const mensagem = `
〔 🙋 ᴀᴄᴇɪᴛᴀʀ ᴀᴜᴛᴏᴍᴀ́ᴛɪᴄᴏ 〕

📊 Estado atual: ${estadoAtual ? "🟢 ATIVADO" : "🔴 DESATIVADO"}

❀ Quando ativado, toda solicitação de
entrada nova é aceita na hora, sem
precisar de um admin aprovar manualmente.

❀ Use:
${config.PREFIX}aceitar 1  → ativa
${config.PREFIX}aceitar 0  → desativa

🧣 ${config.BOT_NAME}
`;
            return sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        }

        const novoEstado = ligarPalavras.includes(argumento);
        if (!db[from]) db[from] = {};
        db[from].aceitarAuto = novoEstado;
        saveDB(db);

        const mensagem = novoEstado ? `
✅ SISTEMA ATIVADO ✅

🙋 ACEITAR AUTOMÁTICO: *ATIVADO*

❀ Agora toda solicitação de entrada é
aceita na hora e a pessoa já entra
normalmente no grupo. 🎴✨

❀ ${config.BOT_NAME}
` : `
❌ SISTEMA DESATIVADO ❌

🙋 ACEITAR AUTOMÁTICO: *DESATIVADO*

❀ As solicitações de entrada voltam a
precisar de aprovação manual de um
admin, como sempre foi.

❀ ${config.BOT_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }

    // ✅ MENÇÃO NO STATUS — liga/desliga (só admin). Quando ATIVADO, o
    // bot avisa dentro do grupo quando alguém menciona/marca esse grupo
    // ao postar um status.
    case "mencao": {
        if (!userAdmin) return sock.sendMessage(from, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });

        const argumento = String(args[0] || "").toLowerCase();
        const ligarPalavras = ["1", "on", "ativar", "ativado"];
        const desligarPalavras = ["0", "off", "desativar", "desativado"];

        if (!ligarPalavras.includes(argumento) && !desligarPalavras.includes(argumento)) {
            const estadoAtual = db[from]?.mencaoStatus === true; // desativado por padrão
            const mensagem = `
╭─── 🌸 ───
📢 MENÇÃO NO STATUS
╰─── 🌸 ───

📊 Estado atual: ${estadoAtual ? "🟢 ATIVADO" : "🔴 DESATIVADO"}

🌷 Quando ativado, o bot avisa aqui no
grupo sempre que alguém marcar este
grupo ao postar um status.

🌷 Use:
${config.PREFIX}mencao 1  → ativa
${config.PREFIX}mencao 0  → desativa

🌸────────────────────🌸
🤍 ${config.BOT_NAME}
🌸────────────────────🌸
`;
            return sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        }

        const novoEstado = ligarPalavras.includes(argumento);
        if (!db[from]) db[from] = {};
        db[from].mencaoStatus = novoEstado;
        saveDB(db);

        const mensagem = novoEstado ? `
✅ SISTEMA ATIVADO ✅

📢 MENÇÃO NO STATUS: *ATIVADO*

🌷 Agora, sempre que alguém marcar este
grupo num status, o bot avisa aqui. 🌸✨

🌷 ${config.BOT_NAME}
` : `
❌ SISTEMA DESATIVADO ❌

📢 MENÇÃO NO STATUS: *DESATIVADO*

🌷 O bot não vai mais avisar quando
alguém mencionar este grupo num status.

🌷 ${config.BOT_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }


    // ✅ VERIFICAR PERMISSÕES
    case "statusadm": {
        const botId = normalize(sock.user?.id || "");
        const senderId = normalize(sender);
        
        const mensagem = `
〔 📊 ᴘᴀɪɴᴇʟ ᴅᴇ ᴘᴇʀᴍɪssᴏ̃ᴇs 〕

❀ 🤖 SITUAÇÃO DO BOT ❀
❀ É Administrador: ${botAdmin ? "✅ SIM" : "❌ NÃO"}

❀ 👤 SITUAÇÃO DO USUÁRIO ❀
❀ Você é Admin: ${userAdmin ? "✅ SIM" : "❌ NÃO"}
❀ Seu ID: ${senderId}

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }


    // ✅ ABRIR GRUPO
    case "abrir": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕

❌ Apenas administradores podem
alterar modo de conversa!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
        if (!botAdmin) {
            const aviso = `
〔 ⚠️ ꜰᴀʟᴛᴀ ᴅᴇ ᴀᴄᴇssᴏ 〕

❌ Eu preciso ser administrador
para alterar configurações gerais!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
        
        await sock.groupSettingUpdate(from, "not_announcement");
        
        const mensagem = `
〔 🔓 ɢʀᴜᴘᴏ ᴀʙᴇʀᴛᴏ 〕

🌐 Modo alterado: *LIBERADO*

❀ Todos os membros agora podem
enviar mensagens, fotos e vídeos! 💬📸

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }


    // ✅ FECHAR GRUPO
    case "fechar": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕

❌ Apenas administradores podem
alterar modo de conversa!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
        if (!botAdmin) {
            const aviso = `
〔 ⚠️ ꜰᴀʟᴛᴀ ᴅᴇ ᴀᴄᴇssᴏ 〕

❌ Eu preciso ser administrador
para alterar configurações gerais!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
        
        await sock.groupSettingUpdate(from, "announcement");
        
        const mensagem = `
〔 🔒 ɢʀᴜᴘᴏ ꜰᴇᴄʜᴀᴅᴏ 〕

🛡️ Modo alterado: *RESTRITO*

❀ Apenas administradores têm
permissão para enviar mensagens! 📢👑

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
        await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
        break;
    }


    // ✅ AVISO GERAL
    case "aviso": {
        if (!userAdmin) {
            const aviso = `
〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕

❌ Apenas administradores podem
enviar avisos para todos!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        const textoAviso = args.join(" ").trim();
        if (!textoAviso) {
            const aviso = `
〔 ⚠️ ꜰᴀʟᴛᴀ ᴄᴏɴᴛᴇᴜ́ᴅᴏ 〕

❌ Você deve escrever o texto
do aviso logo após o comando!

❀ 📌 Exemplo:
   ${config.PREFIX}aviso Não haverá reunião hoje!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }
        
        const meta = await sock.groupMetadata(from);
        const participantes = meta.participants.map(p => p.id);
        
        const mensagem = `
〔 📢 ᴀᴠɪsᴏ ɪᴍᴘᴏʀᴛᴀɴᴛᴇ 〕

💬 ${textoAviso}

🧣 Mensagem enviada pela Administração
🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
        await sock.sendMessage(from, { text: mensagem, mentions: participantes }, { quoted: msg });
        break;
    }


    // ✅ LISTA DE ADMINS
    case "admins": {
        const meta = await sock.groupMetadata(from);
        const administradores = meta.participants.filter(p => p.admin === "admin" || p.admin === "superadmin");
        
        let listaTexto = `
〔 👑 ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs 〕

❀ 📋 LISTA GERAL ❀
`;

        if (administradores.length === 0) {
            listaTexto += `❌ Nenhum administrador encontrado!`;
        } else {
            administradores.forEach((adm, indice) => {
                listaTexto += `❀ ${indice + 1}. @${normalize(adm.id)}\n`;
            });
        }

        listaTexto += `
🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;

        await sock.sendMessage(from, { 
            text: listaTexto, 
            mentions: administradores.map(a => a.id) 
        }, { quoted: msg });
        break;
    }


    // 📰 ÚLTIMAS SAÍDAS DO GRUPO (vem do botão "MAIS NO JORNAL")
    case "saidas":
    case "jornal": {
        const g = lerJornal()[from];
        const lista = (g?.saidas || []).slice(0, 10);
        if (!lista.length) {
            return sock.sendMessage(from, {
                text: `〔 📰 ᴜ́ʟᴛɪᴍᴀs sᴀɪ́ᴅᴀs 〕\n\n🎉 Nenhuma saída registrada por aqui ainda!\n\n🧣 ${config.BOT_NAME} • 👑 ${config.OWNER_NAME}`
            }, { quoted: msg });
        }
        const mencoes = [];
        const linhas = lista.map((s, i) => {
            if (s.jid) mencoes.push(s.jid);
            const quando = formatarDuracao(Date.now() - s.ts) || "agora";
            const tempo = s.tempoMs != null ? ` • ficou ${formatarDuracao(s.tempoMs)}` : "";
            const como = s.motivo === "removido" ? "🔨 removido(a)" : "🚪 saiu";
            return `${i + 1}. @${s.numero}\n    ${como} há ${quando}${tempo}`;
        });
        return sock.sendMessage(from, {
            text: `〔 📰 ᴜ́ʟᴛɪᴍᴀs sᴀɪ́ᴅᴀs 〕\n\n${linhas.join("\n\n")}\n\n🧣 ${config.BOT_NAME} • 👑 ${config.OWNER_NAME}`,
            mentions: mencoes
        }, { quoted: msg });
    }

    // ✅ REGRAS DO GRUPO
    case "regras": {
        if (args.length > 0) { 
            // 📝 CADASTRAR / ALTERAR
            if (!userAdmin) {
                const aviso = `
〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕

❌ Apenas administradores podem
editar ou cadastrar as regras!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
                return sock.sendMessage(from, { text: aviso }, { quoted: msg });
            }
            
            const novasRegras = args.join(" ").trim();
            db[from].regras = novasRegras;
            saveDB(db);
            
            const sucesso = `
〔 ✅ ʀᴇɢʀᴀs ᴀᴛᴜᴀʟɪᴢᴀᴅᴀs 〕
 📜 As regras de convivência foram
 definidas e salvas com sucesso!
🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
 `;
             await sock.sendMessage(from, { text: sucesso }, { quoted: msg });
         } else { 
             // 👀 EXIBIR REGRAS ATUAIS
             const mensagem = `
〔 📜 ʀᴇɢʀᴀs ᴅᴏ ɢʀᴜᴘᴏ 〕
 📖 CONVIVÊNCIA E DIRETRIZES:
 ${db[from].regras}
 🧣 Respeite para ser respeitado!
 🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
 `;
             await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
         }
         break;
     }
     // ✅ LINK DO GRUPO
     case "grupo":
     case "convite": {
         if (!botAdmin) {
             // 🔎 Diagnóstico embutido: mostra o que foi encontrado, pra
             // não precisar ficar rodando .meuid toda vez que isso falhar.
             let diagnostico = "não consegui nem ler os dados do grupo";
             try {
                 const metaDiag = metaAtual || await sock.groupMetadata(from);
                 const botNoGrupoDiag = metaDiag.participants.find(p => souEuNoGrupo(p, sock));
                 diagnostico = botNoGrupoDiag
                     ? `me achei no grupo (id: ${botNoGrupoDiag.id}), mas o campo admin veio: "${botNoGrupoDiag.admin || 'null (membro comum)'}"`
                     : "não me encontrei na lista de participantes desse grupo";
             } catch (e) { diagnostico = `erro ao buscar: ${e.message}`; }

             const aviso = `
〔 ⚠️ ꜰᴀʟᴛᴀ ᴅᴇ ᴀᴄᴇssᴏ 〕
 ❌ Eu preciso ser administrador
 para poder gerar o link de convite!
 🔎 Diagnóstico: ${diagnostico}
🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
 `;
             return sock.sendMessage(from, { text: aviso }, { quoted: msg });
         }
         
         try {
             const codigoConvite = await sock.groupInviteCode(from);
             const mensagem = `
〔 🔗 ʟɪɴᴋ ᴅᴇ ᴄᴏɴᴠɪᴛᴇ 〕
 📌 Compartilhe esse link para
 convidar novas pessoas:
 🔗 https://chat.whatsapp.com/${codigoConvite}
 ⚠️ *Aviso:* Compartilhe apenas
 com pessoas confiáveis!
🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
 `;
             await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
         } catch (erro) {
             console.error("Erro Link:", erro);
             const erroMsg = `
〔 ❌ ꜰᴀʟʜᴀ ᴀᴏ ɢᴇʀᴀʀ 〕
 ❌ Não foi possível obter o link!
 Verifique permissões ou privacidade.
🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
 `;
             await sock.sendMessage(from, { text: erroMsg }, { quoted: msg });
         }
         break;
     }

     // ✅ INFORMAÇÕES DO GRUPO
     case "info": {
         try {
             const groupMeta = await sock.groupMetadata(from);
             const members = groupMeta.participants.length;
             const admins = groupMeta.participants.filter(p => p.admin === "admin" || p.admin === "superadmin").length;
             const criadorJid = groupMeta.owner || groupMeta.founder;
             const criador = criadorJid ? normalize(criadorJid) : "Desconhecido";

             const infoMsg = `
〔 ℹ️ ɪɴꜰᴏʀᴍᴀᴄ̧ᴏ̃ᴇs ᴅᴏ ɢʀᴜᴘᴏ 〕

📌 *NOME:* ${groupMeta.subject}
👥 *MEMBROS:* ${members}
👑 *ADMINISTRADORES:* ${admins}
👨‍💼 *CRIADOR:* @${criador}

⏰ *CRIADO EM:* ${new Date(groupMeta.creation * 1000).toLocaleDateString('pt-BR')}

📝 *DESCRIÇÃO:*
${groupMeta.desc || "Sem descrição"}

╭═══❀════════════════
✨ *COMANDOS DO GRUPO:*
❀ ${config.PREFIX}regras - Ver/alterar regras
❀ ${config.PREFIX}antilink - On/off anti-link
❀ ${config.PREFIX}antinota - On/off anti-nota
❀ ${config.PREFIX}antiloc - On/off anti-localização
❀ ${config.PREFIX}antidoc - On/off anti-documento
❀ ${config.PREFIX}fixar - Fixa a mensagem marcada
❀ ${config.PREFIX}antinudes - On/off anti-nudes
❀ Boas-vindas/despedida: 🎴 automático!
╰═══❀════════════════

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;

             await sock.sendMessage(from, { text: infoMsg });
         } catch (erro) {
             console.error("Erro Info:", erro);
             await sock.sendMessage(from, { text: "❌ Erro ao obter informações do grupo!" }, { quoted: msg });
         }
         break;
     }

     // ✅ ANTI-NUDES
     case "antinudes": {
         if (!userAdmin) {
             return sock.sendMessage(from, { text: `
〔 ⚠️ ᴘᴇʀᴍɪssᴀ̃ᴏ ɴᴇɢᴀᴅᴀ 〕

❌ Apenas administradores podem
ativar/desativar o anti-nudes!

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
` }, { quoted: msg });
         }

         const estado = !db[from].antinudes;
         db[from].antinudes = estado;
         saveDB(db);

         const mensagem = estado ? `
〔 ✅ ᴀɴᴛɪ-ɴᴜᴅᴇs ᴀᴛɪᴠᴀᴅᴏ 〕

🚫 Fotos proibidas serão bloqueadas!
👤 Quem enviar será removido do grupo.

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
` : `
〔 ❌ ᴀɴᴛɪ-ɴᴜᴅᴇs ᴅᴇsᴀᴛɪᴠᴀᴅᴏ 〕

✅ Sistema desativado com sucesso.

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;

         await sock.sendMessage(from, { text: mensagem }, { quoted: msg });
         break;
     }

   } // FIM DO SWITCH DE COMANDOS
 } // FIM DO grupoHandler
 /* =========================
    🚫 SISTEMAS AUTOMÁTICOS DE SEGURANÇA
 ========================= */
 async function verificarAntis(sock, msg) {
   const from = msg.key.remoteJid;
   if (!from || !from.endsWith("@g.us")) return;
   
   const db = getDB();
   if (!db[from]) return;
   
   const sender = msg.key.participant || msg.key.remoteJid;
   if (!sender) return;
   
   const isAdm = await isAdmin(sock, from, sender);
   if (isAdm) return; // ✅ ADMIN NÃO SOFRE BLOQUEIOS
   
   const botIsAdmin = await isBotAdmin(sock, from);
   if (!botIsAdmin) return; // ❌ SEM CARGO NÃO FAZ AÇÃO
   
   const corpoTexto = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
   const ehAudio = msg.message?.audioMessage;
   const ehImagem = msg.message?.imageMessage;
   const ehVideo = msg.message?.videoMessage;

   // ✅ SOMENTE-ADM — apaga e remove não-administrador quando ativado
   if (db[from].somenteadm) {
     try {
       await sock.sendMessage(from, { delete: msg.key });
       await sock.groupParticipantsUpdate(from, [sender], "remove");
       await sock.sendMessage(from, { text: `⚠️ @${normalize(sender)}, este grupo está no modo somente administradores. Sua mensagem foi removida e você também.`, mentions: [sender] });
     } catch (erro) { console.error("Erro somente-admin:", erro); }
     return;
   }

   // ✅ ANTIFLOOD — apaga rajadas de mensagens sem remover por padrão
   if (db[from].antiflood) {
     const chaveFlood = `${from}:${sender}`;
     const agoraFlood = Date.now();
     const recentes = (rastreadorFlood.get(chaveFlood) || []).filter(t => agoraFlood - t < 10000);
     recentes.push(agoraFlood);
     rastreadorFlood.set(chaveFlood, recentes);
     if (recentes.length >= 6) {
       try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
       return;
     }
   }

   // ✅ ANTISPAM — apaga repetição exata em janela curta
   if (db[from].antispam && corpoTexto.trim()) {
     const chaveSpam = `${from}:${sender}`;
     const atual = corpoTexto.trim().toLowerCase();
     const anterior = rastreadorSpam.get(chaveSpam);
     rastreadorSpam.set(chaveSpam, { texto: atual, quando: Date.now() });
     if (anterior && anterior.texto === atual && Date.now() - anterior.quando < 15000) {
       try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
       return;
     }
   }
   
   // 🔎 Conteúdo "de verdade" da mensagem (desembrulha efêmera / visualização única /
   // documento com legenda) para achar localização e documento.
   const conteudoReal = (() => {
     let m = msg.message || {};
     for (let i = 0; i < 5; i++) {
       const interno = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message
         || m.viewOnceMessageV2Extension?.message || m.documentWithCaptionMessage?.message || m.editedMessage?.message;
       if (!interno) break;
       m = interno;
     }
     return m;
   })();

   // 📍 ANTI-LOCALIZAÇÃO — APAGA E REMOVE O USUÁRIO
   if (db[from].antiloc && (conteudoReal.locationMessage || conteudoReal.liveLocationMessage)) {
     try {
       await sock.sendMessage(from, { delete: msg.key });
       await sock.groupParticipantsUpdate(from, [sender], "remove");
       await sock.sendMessage(from, {
         text: `〔 🚫 ᴀɴᴛɪ-ʟᴏᴄᴀʟɪᴢᴀᴄ̧ᴀ̃ᴏ 〕\n\n❌ @${normalize(sender)} foi removido do grupo!\n\n📌 MOTIVO: Enviou uma localização\n📍 Localizações não são permitidas aqui.\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}`,
         mentions: [sender]
       });
     } catch (erro) {
       console.error("Erro Anti-loc:", erro);
     }
     return;
   }

   // 📄 ANTI-DOCUMENTO — APAGA, ADVERTE NA 1ª VEZ E REMOVE NA REINCIDÊNCIA
   if (db[from].antidoc && conteudoReal.documentMessage) {
     try {
       await sock.sendMessage(from, { delete: msg.key });

       const avisos = db[from].antidocAvisos || {};
       const chaveUsuario = normalize(sender);
       const jaAdvertido = (avisos[chaveUsuario] || 0) >= 1;

       if (jaAdvertido) {
         delete avisos[chaveUsuario];
         db[from].antidocAvisos = avisos;
         saveDB(db);
         await sock.groupParticipantsUpdate(from, [sender], "remove");
         await sock.sendMessage(from, {
           text: `〔 🚫 ᴀɴᴛɪ-ᴅᴏᴄᴜᴍᴇɴᴛᴏ 〕\n\n❌ @${chaveUsuario} foi removido do grupo!\n\n📌 MOTIVO: Reincidência — enviou documento de novo\n📄 Documentos não são permitidos aqui.\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}`,
           mentions: [sender]
         });
       } else {
         avisos[chaveUsuario] = 1;
         db[from].antidocAvisos = avisos;
         saveDB(db);
         await sock.sendMessage(from, {
           text: `〔 ⚠️ ᴀᴅᴠᴇʀᴛᴇ̂ɴᴄɪᴀ 〕\n\n@${chaveUsuario}, documentos não são permitidos neste grupo. Sua mensagem foi apagada.\n\n🚨 Se enviar outro documento, você será *removido*.\n\n🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}`,
           mentions: [sender]
         });
       }
     } catch (erro) {
       console.error("Erro Anti-doc:", erro);
     }
     return;
   }

   // ✅ ANTI-LINK — REMOVE MENSAGEM E USUÁRIO
   if (db[from].antilink && (corpoTexto.includes("http://") || corpoTexto.includes("https://") || corpoTexto.includes("www."))) {
     try {
       await sock.sendMessage(from, { delete: msg.key });
       
       // Remove o usuário
       const nomeUsuario = normalize(sender);
       await sock.groupParticipantsUpdate(from, [sender], "remove");
       
       const aviso = `
〔 🚫 ᴀɴᴛɪ-ʟɪɴᴋ ᴀᴛɪᴠᴀᴅᴏ 〕

❌ @${nomeUsuario} foi removido do grupo!

📌 MOTIVO: Compartilhou link externo
⚠️  Violação das regras do grupo

🔗 Links não são permitidos neste grupo
para manter a segurança e a qualidade.

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
       await sock.sendMessage(from, { text: aviso, mentions: [sender] });
     } catch (erro) {
       console.error("Erro Anti-link:", erro);
     }
     return;
   }
   
   // ✅ ANTI-NOTA — REMOVE MENSAGEM E USUÁRIO
   if (db[from].antinota && ehAudio) {
     try {
       await sock.sendMessage(from, { delete: msg.key });
       
       // Remove o usuário
       const nomeUsuario = normalize(sender);
       await sock.groupParticipantsUpdate(from, [sender], "remove");
       
       const aviso = `
〔 🚫 ᴀɴᴛɪ-ɴᴏᴛᴀ ᴀᴛɪᴠᴀᴅᴏ 〕

❌ @${nomeUsuario} foi removido do grupo!

📌 MOTIVO: Enviou nota de voz proibida
⚠️  Violação das regras do grupo

🎤 Notas de voz/áudio não são permitidas
neste grupo para manter a qualidade.

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
       await sock.sendMessage(from, { text: aviso, mentions: [sender] });
     } catch (erro) {
       console.error("Erro Anti-nota:", erro);
     }
     return;
   }

   // ✅ ANTI-NUDES — REMOVE IMAGENS PROIBIDAS (análise real de conteúdo)
   if (db[from].antinudes && (ehImagem || ehVideo)) {
     try {
       // 🔧 ANTES: qualquer imagem sem legenda ou qualquer vídeo que não
       // fosse gif já era tratado como "nude" e a pessoa era EXPULSA — ou
       // seja, qualquer foto/vídeo normal do dia a dia disparava isso.
       // Agora é uma análise de verdade (mesma API do .antinsfw), só
       // apagando/expulsando quando o conteúdo É realmente explícito.
       const conteudoMsg = ehImagem ? msg.message.imageMessage : msg.message.videoMessage;
       const impropria = await ehConteudoImproprio(conteudoMsg, ehVideo);

       if (impropria) {
         await sock.sendMessage(from, { delete: msg.key });
         
         // Remove o usuário
         const nomeUsuario = normalize(sender);
         await sock.groupParticipantsUpdate(from, [sender], "remove");
         
         const aviso = `
〔 🚫 ᴀɴᴛɪ-ɴᴜᴅᴇs ᴀᴛɪᴠᴀᴅᴏ 〕

❌ @${nomeUsuario} foi removido do grupo!

📌 MOTIVO: Enviou conteúdo proibido
⚠️  Violação das regras do grupo

🚫 Conteúdo adulto é terminantemente
proibido neste grupo.

🧣 ${config.BOT_NAME} • 🌹 ${config.OWNER_NAME}
`;
         await sock.sendMessage(from, { text: aviso, mentions: [sender] });
       }
     } catch (erro) {
       console.error("Erro Anti-nudes:", erro);
     }
   }
 }
/* =========================================
/* =========================================
   (Sistema de apresentação obrigatória de 5 minutos foi removido
   a pedido — a mensagem de boas-vindas agora só dá boas-vindas,
   sem exigir apresentação nem remover ninguém por tempo.)
========================================= */

/* =========================================
   ✨ EVENTOS DE ENTRADA E SAÍDA — AUTOMÁTICO, COM CARD GERADO
   (sem toggle — sempre ativo pra todos os grupos)
========================================= */
/* =========================================
   ✨ EVENTOS DE ENTRADA E SAÍDA — AUTOMÁTICO, COM CARD GERADO
   (sem toggle — sempre ativo pra todos os grupos)
========================================= */

// 🖼️ Fundo RESERVA dos cards de entrada/saída — usado só se a foto do
// grupo não estiver disponível (grupo sem foto, ou busca falhou).
const fundoPath = path.join(__dirname, "../midias/imagens/fundo.png");
const menuPath = path.join(__dirname, "../midias/imagens/menu.png");
const botConfigPath = path.join(__dirname, "../../database/botconfig.json");
function carregarFundoFixo() {
  try {
    let db = {};
    if (fs.existsSync(botConfigPath)) db = JSON.parse(fs.readFileSync(botConfigPath, "utf8")) || {};
    const configurado = db.BOT_FUNDO ? resolverCaminhoSalvo(db.BOT_FUNDO) : null;
    const candidatos = [configurado, fundoPath, menuPath].filter(Boolean);
    const caminho = candidatos.find(c => fs.existsSync(c));
    if (caminho) return fs.readFileSync(caminho);
  } catch (erro) {
    console.error("Erro ao carregar fundo configurado:", erro);
  }
  return null;
}

async function groupEvents(sock) {
  // 🙋 SOLICITAÇÃO DE ENTRADA (grupos com aprovação de admin ativada)
  sock.ev.on("group.join-request", async (dadosEvento) => {
    console.log("🙋 group.join-request recebido:", JSON.stringify(dadosEvento));
    try {
      const { id: grupoId, participant, action, author } = dadosEvento;
      if (!participant) return;

      // (Sem trava de aluguel: funciona em qualquer grupo.)

      let nomeGrupo = "o grupo";
      try { nomeGrupo = (await sock.groupMetadata(grupoId)).subject; } catch {}

      // 🔧 Antes exigia action === "created" exatamente. Se o WhatsApp
      // mandar esse campo com outro valor (ou nem mandar), a solicitação
      // nova nunca era detectada e ficava tudo em silêncio. Agora: só é
      // "recusa" quando dá pra confirmar que foi OUTRA pessoa (author
      // diferente do participant) que mexeu no pedido — qualquer outro
      // caso (author ausente, igual ao participant, ou action="created")
      // é tratado como pedido novo.
      const foiOutraPessoaQueResolveu = author && normalize(author) !== normalize(participant);

      // ── PEDIDO NOVO ──────────────────────────────
      if (!foiOutraPessoaQueResolveu) {
        // 🙋 ACEITAR AUTOMÁTICO — se estiver ativado nesse grupo, aceita
        // a solicitação na hora e deixa o resto do fluxo acontecer
        // sozinho (o "group-participants.update" já dispara o card de
        // boas-vindas normalmente quando a pessoa realmente entra).
        const aceitarAutoAtivo = getDB()[grupoId]?.aceitarAuto === true;
        if (aceitarAutoAtivo) {
          try {
            await sock.groupRequestParticipantsUpdate(grupoId, [participant], "approve");
            console.log(`✅ Solicitação de ${participant} aceita automaticamente em ${grupoId}`);
          } catch (erroAceitar) {
            console.error("❌ Erro ao aceitar automaticamente:", erroAceitar.message);
          }
          return; // não manda o card de "solicitação" — já foi aceito
        }

        const nomeSolicitante = normalize(participant);

        let fotoSolicitanteBuffer = null;
        try {
          const url = await sock.profilePictureUrl(participant, "image");
          fotoSolicitanteBuffer = await baixarBuffer(url);
        } catch { fotoSolicitanteBuffer = null; }

        const textoSolicitacao = gerarMensagemSolicitacao(nomeSolicitante);

        try {
          const png = await criarCardSolicitacao({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer });
          await enviarCardJornal(sock, grupoId, png,
            `〔 🙋 sᴏʟɪᴄɪᴛᴀᴄ̧ᴀ̃ᴏ ᴅᴇ ᴇɴᴛʀᴀᴅᴀ 〕\n\n${textoSolicitacao}\n\n🧣 ${config.BOT_NAME} • 👑 ${config.OWNER_NAME}`,
            [participant], false);
        } catch (erroCard) {
          console.error("❌ Erro ao gerar card de solicitação de entrada:", erroCard);
          await enviarComRetentativa(sock, grupoId, {
            text: `〔 🙋 sᴏʟɪᴄɪᴛᴀᴄ̧ᴀ̃ᴏ ᴅᴇ ᴇɴᴛʀᴀᴅᴀ 〕\n\n${textoSolicitacao}`,
            mentions: [participant]
          }).catch(() => {});
        }
        return;
      }

      // ── PEDIDO RESOLVIDO por outra pessoa (admin recusou) ──
      if (foiOutraPessoaQueResolveu) {
        const nomeSolicitante = normalize(participant);
        const nomeQuemRecusou = normalize(author);

        let fotoSolicitanteBuffer = null, fotoQuemRecusouBuffer = null;
        try { fotoSolicitanteBuffer = await baixarBuffer(await sock.profilePictureUrl(participant, "image")); } catch {}
        try { fotoQuemRecusouBuffer = await baixarBuffer(await sock.profilePictureUrl(author, "image")); } catch {}

        const textoRecusa = gerarMensagemRecusa(nomeSolicitante, nomeQuemRecusou);

        try {
          const png = await criarCardSolicitacaoRecusada({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer, nomeQuemRecusou });
          await enviarCardJornal(sock, grupoId, png,
            `〔 ❌ sᴏʟɪᴄɪᴛᴀᴄ̧ᴀ̃ᴏ ʀᴇᴄᴜsᴀᴅᴀ 〕\n\n${textoRecusa}\n\n🧣 ${config.BOT_NAME} • 👑 ${config.OWNER_NAME}`,
            [participant, author], false);
        } catch (erroCard) {
          console.error("❌ Erro ao gerar card de solicitação recusada:", erroCard);
          await enviarComRetentativa(sock, grupoId, {
            text: `〔 ❌ sᴏʟɪᴄɪᴛᴀᴄ̧ᴀ̃ᴏ ʀᴇᴄᴜsᴀᴅᴀ 〕\n\n${textoRecusa}`,
            mentions: [participant, author]
          }).catch(() => {});
        }
      }
    } catch (erro) {
      console.error("❌ Erro ao avisar solicitação de entrada:", erro);
    }
  });

  // 👥 Processa UMA pessoa por vez (o evento original pode trazer várias).
  const processarEventoParticipante = async (dadosEvento) => {
    console.log("📥 group-participants.update recebido:", JSON.stringify(dadosEvento));

    // 🛟 ÚLTIMA CAMADA DE SEGURANÇA: guarda o essencial ANTES de qualquer
    // coisa que possa falhar, pra que — não importa o que dê errado lá
    // embaixo — a gente sempre consiga tentar mandar UMA mensagem mínima
    // no fim. Antes, se algo desse errado bem no início (ex: ao montar o
    // usuarioJid), o catch geral só logava no console e NADA era enviado.
    let grupoIdSeguranca = null, usuarioJidSeguranca = null, acaoSeguranca = null;
    try {
        grupoIdSeguranca = dadosEvento?.id || null;
        const p0 = dadosEvento?.participants?.[0];
        usuarioJidSeguranca = typeof p0 === "string" ? p0 : (p0?.id || null);
        acaoSeguranca = dadosEvento?.action || null;
    } catch {}

    try {
      const grupoId = dadosEvento.id;
      const { participants, action, author } = dadosEvento;
      const participanteRaw = participants?.[0];

      if (!participanteRaw) return;
      if (action !== "add" && action !== "remove") return;

      // 🔌 Respeita o liga/desliga do .bemvindo (ativado por padrão pra
      // não mudar o comportamento de quem nunca mexeu na configuração)
      // (Sem trava de aluguel: funciona em qualquer grupo.)
      const dbBemvindo = getDB();
      const bemvindoAtivo = dbBemvindo[grupoId]?.bemvindo !== false;
      if (!bemvindoAtivo) {
        console.log(`🔕 Boas-vindas/saída desativado nesse grupo (${grupoId}) — ignorando evento.`);
        return;
      }

      // ✅ Baileys v7 manda os participantes como OBJETO { id, phoneNumber, admin }
      //    por causa do sistema LID — não é mais uma string JID pura.
      //    Aqui aceitamos os dois formatos pra não quebrar se algum dia voltar a ser string.
      const usuarioJid = typeof participanteRaw === "string" ? participanteRaw : participanteRaw.id;
      const numeroTelefone = typeof participanteRaw === "string" ? null : participanteRaw.phoneNumber;

      if (!usuarioJid) return;

      let nomeGrupo, totalMembros;
      let regrasDoGrupo = "Respeite o ambiente, os participantes e as regras do grupo.";
      try {
        const grupoDados = await sock.groupMetadata(grupoId);
        nomeGrupo = grupoDados.subject;
        totalMembros = grupoDados.participants.length;
        const descricaoGrupo = String(grupoDados.desc || grupoDados.description || "").trim();
        if (descricaoGrupo) regrasDoGrupo = descricaoGrupo;
        else {
          const regrasSalvas = String(getDB()[grupoId]?.regras || "");
          if (regrasSalvas && !regrasSalvas.startsWith("⚠️ Nenhuma regra")) regrasDoGrupo = regrasSalvas;
        }
      } catch (erroMetadata) {
        console.error("Erro ao buscar metadados do grupo:", erroMetadata);
        nomeGrupo = "Grupo";
        totalMembros = participants.length;
      }

      // ✅ Pra exibir, prioriza o número de telefone (mais legível que o LID)
      const nomeUsuario = (numeroTelefone || usuarioJid).split('@')[0];

      // 🖼️ BUSCA FOTO DO PERFIL DO USUÁRIO (buffer, pra desenhar no card)
      // No Baileys v7 (sistema LID), o "usuarioJid" pode vir no formato
      // "xxxxx@lid" em vez do JID de telefone tradicional ("55...@s.whatsapp.net").
      // A busca de foto de perfil do WhatsApp nem sempre funciona com @lid —
      // então tentamos o JID original E o JID de telefone (quando disponível),
      // e agora LOGAMOS o motivo real de cada falha (antes era engolido em
      // silêncio, por isso nunca aparecia erro nenhum no console).
      let fotoBuffer = null;
      // 🔧 CORREÇÃO: o "phoneNumber" que o Baileys v7 manda já vem como JID
      // completo (ex: "5516998761099@s.whatsapp.net"), não como número puro.
      // O código antigo concatenava "@s.whatsapp.net" de novo em cima disso,
      // gerando um JID inválido tipo "...@s.whatsapp.net@s.whatsapp.net" —
      // que nunca vai encontrar foto nenhuma (URL sempre vinha vazia).
      const numeroTelefoneJid = numeroTelefone
        ? (numeroTelefone.includes("@") ? numeroTelefone : `${numeroTelefone}@s.whatsapp.net`)
        : null;
      const candidatosJid = [usuarioJid];
      if (numeroTelefoneJid && !candidatosJid.includes(numeroTelefoneJid)) {
        candidatosJid.push(numeroTelefoneJid);
      }

      for (const jidTentativa of candidatosJid) {
        try {
          const fotoUrl = await sock.profilePictureUrl(jidTentativa, "image");
          fotoBuffer = await baixarBuffer(fotoUrl);
          if (fotoBuffer) {
            console.log(`✅ Foto de perfil obtida via ${jidTentativa} (${fotoBuffer.length} bytes)`);
            break;
          }
        } catch (erroFoto) {
          console.error(`⚠️ Não consegui buscar a foto de perfil via ${jidTentativa}:`, erroFoto?.message || erroFoto);
        }
      }

      const numeroLimpo = String(nomeUsuario).replace(/\D/g, "") || nomeUsuario;
      if (fotoBuffer && action === "add") guardarFotoMembro(numeroLimpo, fotoBuffer);
      // quem já saiu quase nunca devolve a foto — usa a que guardamos na entrada
      if (!fotoBuffer && action === "remove") fotoBuffer = lerFotoMembro(numeroLimpo);

      if (!fotoBuffer) {
        console.error(`❌ Nenhuma foto de perfil encontrada pra ${usuarioJid} (${numeroTelefone || "sem número"}) — provável causa: a pessoa esconde a foto de perfil pra quem não é contato salvo, ou o JID/LID não bateu com nenhuma tentativa. O card vai usar o número/nome no lugar da foto.`);
      }

      // 🖼️ FUNDO: usa sempre a mídia definida no painel de configuração.
      // A troca no painel vale automaticamente nos próximos cards.
      // 🏞️ FOTO DO GRUPO — aparece no cantinho do card de entrada e de saída
      const fotoContextoBuffer = await buscarFotoContexto(sock, grupoId).catch(() => null);

      const fotoFundoBuffer = carregarFundoFixo();
      const variante = Math.floor(Math.random() * 4);

      if (action === "add") {
        try {
          // Se quem processou a entrada foi um admin (aprovou solicitação ou
          // adicionou direto), avisamos quem aprovou. Senão, é entrada normal.
          const autorDiferente = author && normalize(author) !== normalize(usuarioJid);
          const chamadaEntrada = gerarChamadaEntrada();

          registrarEntradaJornal(grupoId, numeroLimpo);

          const { legenda, regrasExtra } = montarBemVindoPartes({
            chamada: chamadaEntrada,
            nomeUsuario,
            nomeGrupo,
            totalMembros,
            regras: regrasDoGrupo,
            autorAceite: autorDiferente ? normalize(author) : null,
            semFoto: !fotoBuffer,
            nomeBot: config.BOT_NAME,
            nomeDono: config.OWNER_NAME
          });

          const png = await criarCardBoasVindas({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, fotoFundoBuffer, variante, fotoContextoBuffer });
          await enviarCardJornal(sock, grupoId, png, legenda, autorDiferente ? [usuarioJid, author] : [usuarioJid]);

          // 📜 Regras completas (quando não cabem na legenda do card)
          if (regrasExtra) {
            await new Promise(r => setTimeout(r, 800));
            await enviarComRetentativa(sock, grupoId, { text: regrasExtra }).catch(() => {});
          }
        } catch (erroCard) {
          console.error("❌ Erro ao gerar/enviar card de boas-vindas:", erroCard);
          // 🛟 REDE DE SEGURANÇA: mesmo se o CARD (imagem) falhar por
          // qualquer motivo, o bot TEM que continuar dando boas-vindas —
          // só que em texto puro, sem imagem. Antes disso, uma falha no
          // card fazia o bot simplesmente não dar boas-vindas nenhuma.
          try {
            await enviarComRetentativa(sock, grupoId, {
              text: `👋 Bem-vindo(a), @${nomeUsuario}, ao *${nomeGrupo}*! Agora somos *${totalMembros}* membros. 💫\n\n🤍 ${config.BOT_NAME}`,
              mentions: [usuarioJid]
            });
          } catch {}
        }

        // 🔊 ÁUDIO DE ENTRADA — puxa um áudio aleatório de src/audios/entrada
        // (se a pasta tiver algum arquivo; se não tiver, simplesmente não
        // manda nada e não quebra o fluxo de boas-vindas).
        try {
          await enviarAudioDaPasta(sock, grupoId, "entrada", { mentions: [usuarioJid] });
        } catch (erroAudioEntrada) {
          console.warn("⚠️ Áudio de entrada indisponível:", erroAudioEntrada?.message || erroAudioEntrada);
        }
      }
      else if (action === "remove") {
        try {
          const zoeira = gerarZoeiraSaida(nomeUsuario);
          const autorSaida = author && ![usuarioJid, numeroTelefoneJid].filter(Boolean).some(j => normalize(j) === normalize(author));
          const motivo = autorSaida ? "removido" : "saiu";
          const tempoMs = registrarSaidaJornal(grupoId, {
            numero: numeroLimpo,
            jid: numeroTelefoneJid || usuarioJid,
            motivo,
            autor: autorSaida ? normalize(author) : null
          });
          const tempoNoGrupo = formatarDuracao(tempoMs);

          const mensagemSaida = montarMensagemSaida({
            zoeira,
            nomeGrupo,
            totalMembros,
            nomeBot: config.BOT_NAME,
            nomeDono: config.OWNER_NAME,
            nomeUsuario,
            tempoNoGrupo,
            motivo,
            autor: autorSaida ? normalize(author) : null
          });

          const png = await criarCardDespedida({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, variante, tempoNoGrupo, motivo });
          await enviarCardJornal(sock, grupoId, png, mensagemSaida, autorSaida ? [usuarioJid, author] : [usuarioJid]);
        } catch (erroCard) {
          console.error("❌ Erro ao gerar/enviar card de despedida:", erroCard);
          try {
            await enviarComRetentativa(sock, grupoId, {
              text: `🥀 @${nomeUsuario} saiu do grupo *${nomeGrupo}*. Restam *${totalMembros}* membros.\n\n🤍 ${config.BOT_NAME}`,
              mentions: [usuarioJid]
            });
          } catch {}
        }

        // 🔊 ÁUDIO DE SAÍDA — puxa um áudio aleatório de src/audios/saida
        // (mesmo padrão do áudio de entrada: se a pasta tiver algum arquivo,
        // manda; se estiver vazia, não manda nada e não quebra o fluxo).
        try {
          await enviarAudioDaPasta(sock, grupoId, "saida", { mentions: [usuarioJid] });
        } catch (erroAudioSaida) {
          console.warn("⚠️ Áudio de saída indisponível:", erroAudioSaida?.message || erroAudioSaida);
        }
      }
    } catch (erroGeral) {
      console.error("❌ Falha no Evento de Grupo:", erroGeral);
      // 🛟 ÚLTIMO RECURSO: se chegou até aqui é porque algo MUITO
      // inesperado quebrou antes mesmo das proteções normais. Ainda
      // assim, tenta mandar uma mensagem mínima em vez de ficar mudo.
      if (grupoIdSeguranca && usuarioJidSeguranca && acaoSeguranca === "add") {
        try {
          await enviarComRetentativa(sock, grupoIdSeguranca, {
            text: `👋 Bem-vindo(a) ao grupo, @${normalize(usuarioJidSeguranca)}!`,
            mentions: [usuarioJidSeguranca]
          });
        } catch (erroUltimoRecurso) {
          console.error("❌ Até o último recurso de boas-vindas falhou:", erroUltimoRecurso);
        }
      }
    }
  };

  // 👥 Se entrarem/saírem várias pessoas de uma vez (ex: admin adiciona 5,
  // ou aprova várias solicitações), TODAS recebem a própria mensagem —
  // antes o bot só olhava a primeira da lista. Um pequeno intervalo entre
  // elas evita flood e bloqueio do WhatsApp.
  sock.ev.on("group-participants.update", async (dadosEvento) => {
    const lista = Array.isArray(dadosEvento?.participants) ? dadosEvento.participants : [];
    if (lista.length <= 1) return processarEventoParticipante(dadosEvento);

    for (let i = 0; i < lista.length; i++) {
      try {
        await processarEventoParticipante({ ...dadosEvento, participants: [lista[i]] });
      } catch (erroLote) {
        console.error("❌ Falha ao processar um participante do lote:", erroLote?.message || erroLote);
      }
      if (i < lista.length - 1) await new Promise(r => setTimeout(r, 1500));
    }
  });
}
 // ✅ EXPORTAÇÃO COMPLETA — NÃO ALTERAR!
 module.exports = { 
     grupoHandler, 
     verificarAntis, 
     groupEvents, 
     isAdmin,
     isBotAdmin,
     checarAdminDeUsuarioComMeta,
     checarBotAdminComMeta,
     normalize,
     getDB,      
     saveDB      
 };

