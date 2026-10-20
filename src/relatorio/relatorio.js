/* =================================================
   MIKASA BOT — RELATÓRIO E RESUMO DIÁRIO DO GRUPO
   Mantém um retrato do dia por grupo para o comando .resumo e para o
   relatório automático. O histórico é separado por data e sobrevive a
   reinícios do processo.
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { getDB, saveDB } = require("../grupo/grupo");
const { criarCardResumo, criarCardTop10 } = require("../cardGenerator/cardGenerator");
const { enviarCardOuAnimado } = require("../card-envio/card-envio");
const { buscarFotoContexto } = require("../foto-contexto/foto-contexto");

const HORA_RELATORIO = 23;
const MINUTO_RELATORIO = 59;
const dadosPath = path.join(__dirname, "../dados/relatorio-dados.json");
const marcadorPath = path.join(__dirname, "../dados/relatorio-ultimo-envio.json");

function hojeISO() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function dataBR(iso = hojeISO()) {
    const [ano, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${ano}`;
}

function lerDados() {
    try {
        if (fs.existsSync(dadosPath)) return JSON.parse(fs.readFileSync(dadosPath, "utf8"));
    } catch (erro) {
        console.error("⚠️ Não foi possível ler os dados do relatório:", erro.message);
    }
    return {};
}

let dados = lerDados();
function salvarDados() {
    try { fs.writeFileSync(dadosPath, JSON.stringify(dados, null, 2), "utf8"); } catch (erro) {
        console.error("⚠️ Não foi possível salvar os dados do relatório:", erro.message);
    }
}

function statsVazias() {
    return { data: hojeISO(), mensagens: 0, usuarios: {}, comandos: {}, tipos: {}, recentes: [] };
}

function obterStats(grupoId) {
    const atual = dados[grupoId];
    if (!atual || atual.data !== hojeISO()) {
        dados[grupoId] = statsVazias();
        return dados[grupoId];
    }
    atual.usuarios ||= {};
    atual.comandos ||= {};
    atual.tipos ||= {};
    atual.recentes ||= [];
    return atual;
}

function registrarMensagemRelatorio(grupoId, participanteId, detalhes = {}) {
    if (!grupoId || !grupoId.endsWith("@g.us")) return;
    const stats = obterStats(grupoId);
    const autor = participanteId || "desconhecido";
    const body = String(detalhes.body || "").trim();
    stats.mensagens++;
    stats.usuarios[autor] = (stats.usuarios[autor] || 0) + 1;

    const tipo = detalhes.tipo || (detalhes.msg?.message?.imageMessage ? "imagem" : detalhes.msg?.message?.videoMessage ? "vídeo" : detalhes.msg?.message?.stickerMessage ? "figurinha" : body ? "texto" : "mídia");
    stats.tipos[tipo] = (stats.tipos[tipo] || 0) + 1;
    if (body.startsWith(config.PREFIX)) {
        const comando = body.slice(config.PREFIX.length).trim().split(/\s+/)[0].toLowerCase();
        if (comando) stats.comandos[comando] = (stats.comandos[comando] || 0) + 1;
    }
    if (body && !body.startsWith(config.PREFIX)) {
        stats.recentes.push({ autor, texto: body.slice(0, 100), hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) });
        if (stats.recentes.length > 12) stats.recentes.shift();
    }
    salvarDados();
}

// Extrai o número puro só de um jid "de verdade" (telefone), nunca de um
// @lid (identificador interno do WhatsApp que não é o número da pessoa).
function numeroExtraido(valor) {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    if (!/@(s\.whatsapp\.net|c\.us)$/i.test(texto)) return "";
    const numero = texto.split("@")[0].replace(/\D/g, "");
    return /^\d{8,16}$/.test(numero) ? numero : "";
}

// Resolve o nome/número correto de quem mandou a mensagem, batendo o jid
// registrado contra TODOS os campos que o WhatsApp pode usar pra
// identificar a mesma pessoa (id, lid, jid, participantAlt, telefone) —
// antes só comparava id/lid, então em grupos que usam @lid a pessoa não
// era encontrada e aparecia um número/id bagunçado em vez do nome real.
function nomeParticipante(meta, jid) {
    const valor = String(jid || "");
    const participante = (meta?.participants || []).find(p =>
        [p.id, p.lid, p.jid, p.participantAlt, p.phoneNumber, p.phoneNumberJid]
            .filter(Boolean)
            .some(id => String(id) === valor)
    );

    const nome = String(participante?.notify || participante?.name || participante?.verifiedName || "").trim();
    if (nome) return nome;

    const jidTelefone = [
        participante?.phoneNumber,
        participante?.phoneNumberJid,
        participante?.id,
        participante?.jid,
        participante?.participantAlt,
        jid,
    ].find(id => numeroExtraido(id));

    const numero = numeroExtraido(jidTelefone);
    return numero ? `+${numero}` : `@${valor.split("@")[0] || "desconhecido"}`;
}

async function montarResumoGrupo(sock, grupoId) {
    const stats = obterStats(grupoId);
    let meta = null;
    try { meta = await sock.groupMetadata(grupoId); } catch (erro) { console.error("⚠️ Falha nos metadados do resumo:", erro.message); }
    const ranking = Object.entries(stats.usuarios).sort((a, b) => b[1] - a[1]);
    const comandos = Object.entries(stats.comandos).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const tipos = Object.entries(stats.tipos).sort((a, b) => b[1] - a[1]);
    const recentes = stats.recentes.slice(-5).reverse();
    const nomeGrupo = meta?.subject || "Grupo";
    const linhasRanking = ranking.length ? ranking.slice(0, 10).map((item, i) => `│ ${i + 1}. ${nomeParticipante(meta, item[0])} — ${item[1]} msg`).join("\n") : "│ Ainda não há mensagens registradas hoje.";
    const linhasComandos = comandos.length ? comandos.map(([nome, qtd]) => `${config.PREFIX}${nome} (${qtd})`).join(" • ") : "Nenhum comando usado";
    const linhasTipos = tipos.length ? tipos.map(([nome, qtd]) => `${nome}: ${qtd}`).join(" • ") : "Sem dados de mídia";
    const linhasRecentes = recentes.length ? recentes.map(item => `│ ${item.hora} — ${nomeParticipante(meta, item.autor)}: ${item.texto.replace(/\n/g, " ")}`).join("\n") : "│ Nenhuma conversa comum registrada hoje.";

    return `╭━━〔 📊 *RESUMO DE HOJE* 〕━━╮
│ 🏷️ *${nomeGrupo}*
│ 📅 ${dataBR(stats.data)}
│
│ 💬 Mensagens: *${stats.mensagens}*
│ 👥 Pessoas que participaram: *${ranking.length}*
│ 👤 Membros atuais: *${meta?.participants?.length ?? "n/d"}*
│
│ 🏆 *MAIS ATIVOS*
${linhasRanking}
│
│ 🧰 *COMANDOS MAIS USADOS*
│ ${linhasComandos}
│
│ 📦 *CONTEÚDOS*
│ ${linhasTipos}
│
│ 📝 *ÚLTIMAS CONVERSAS REGISTRADAS*
${linhasRecentes}
╰━━━━━━━━━━━━━━━━━━━━╯
🤖 ${config.BOT_NAME} • um retrato simpático do que rolou hoje`;
}

// Monta os dados já prontos (nome/número resolvidos) pra alimentar os
// cards de resumo e de top 10 — em vez do texto cru em caixinha ASCII.
async function montarDadosResumo(sock, grupoId) {
    const stats = obterStats(grupoId);
    let meta = null;
    try { meta = await sock.groupMetadata(grupoId); } catch (erro) { console.error("⚠️ Falha nos metadados do resumo:", erro.message); }
    const ranking = Object.entries(stats.usuarios)
        .sort((a, b) => b[1] - a[1])
        .map(([jid, qtd]) => ({ nome: nomeParticipante(meta, jid), qtd }));
    const comandosTop = Object.entries(stats.comandos)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([nome, qtd]) => ({ nome: `${config.PREFIX}${nome}`, qtd }));
    const tiposTop = Object.entries(stats.tipos)
        .sort((a, b) => b[1] - a[1])
        .map(([nome, qtd]) => ({ nome, qtd }));

    return {
        nomeGrupo: meta?.subject || "Grupo",
        dataTexto: dataBR(stats.data),
        totalMensagens: stats.mensagens,
        totalParticipantes: ranking.length,
        totalMembros: meta?.participants?.length ?? 0,
        ranking,
        comandosTop,
        tiposTop,
    };
}

async function resumo(sock, msg) {
    const from = msg?.key?.remoteJid;
    if (!from?.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ O resumo de hoje só funciona dentro de grupos." }, { quoted: msg });
    try {
        const dados = await montarDadosResumo(sock, from);
        const fotoContextoBuffer = await buscarFotoContexto(sock, from);
        return await enviarCardOuAnimado(sock, from, (fundoBuffer) => criarCardResumo({ ...dados, fotoContextoBuffer, fundoBuffer }), { caption: `📊 *Resumo de hoje* — ${dados.nomeGrupo}` }, msg);
    } catch (erro) {
        console.error("❌ Erro ao gerar o card de resumo, enviando em texto:", erro.message);
        return sock.sendMessage(from, { text: await montarResumoGrupo(sock, from) }, { quoted: msg });
    }
}

// Ranking isolado dos 10 mais ativos do dia.
// ⚡ Agora é só TEXTO: não desenha mais card (era isso que demorava).
// Não precisa nem buscar foto — a resposta sai na hora.
function montarTextoTop10(dados) {
    const medalhas = ["🥇", "🥈", "🥉"];
    const lista = (dados.ranking || []).slice(0, 10);
    const linhas = lista.length
        ? lista.map((item, i) => `${medalhas[i] || `*${i + 1}º*`} ${item.nome} — *${item.qtd}* msg`).join("\n")
        : "Ainda não há mensagens registradas hoje.";

    return `╭━━〔 🏆 *TOP 10 DE HOJE* 〕━━╮\n` +
        `│ 🏷️ *${dados.nomeGrupo}*\n` +
        `│ 📅 ${dados.dataTexto}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n\n` +
        `${linhas}\n\n` +
        `🤖 ${config.BOT_NAME}`;
}

async function topAtivos(sock, msg) {
    const from = msg?.key?.remoteJid;
    if (!from?.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ O top 10 só funciona dentro de grupos." }, { quoted: msg });
    try {
        const dados = await montarDadosResumo(sock, from);
        return await sock.sendMessage(from, { text: montarTextoTop10(dados) }, { quoted: msg });
    } catch (erro) {
        console.error("❌ Erro ao montar o top 10, enviando o resumo em texto:", erro.message);
        return sock.sendMessage(from, { text: await montarResumoGrupo(sock, from) }, { quoted: msg });
    }
}

async function toggleRelatorio(sock, msg) {
    const from = msg.key.remoteJid;
    if (!from.endsWith("@g.us")) return sock.sendMessage(from, { text: "❌ Esse comando só funciona dentro de grupos!" }, { quoted: msg });
    const meta = await sock.groupMetadata(from).catch(() => null);
    const autor = msg.key.participant || msg.key.remoteJid;
    const admin = meta?.participants?.some(p => (p.id === autor || p.lid === autor) && p.admin);
    if (!admin) return sock.sendMessage(from, { text: "❌ Apenas administradores podem ativar ou desativar o relatório diário." }, { quoted: msg });
    const db = getDB();
    if (!db[from]) db[from] = {};
    db[from].relatorioDiario = !db[from].relatorioDiario;
    saveDB(db);
    const estado = db[from].relatorioDiario;
    await sock.sendMessage(from, { text: estado ? `✅ *RELATÓRIO DIÁRIO ATIVADO*\n\nVou enviar o resumo do grupo todos os dias às ${HORA_RELATORIO}:${String(MINUTO_RELATORIO).padStart(2, "0")}.\nVocê também pode consultar agora com *${config.PREFIX}resumo*.` : "❌ *RELATÓRIO DIÁRIO DESATIVADO*\n\nO comando .resumo continua disponível para consulta manual." }, { quoted: msg });
}

async function enviarRelatorioGrupo(sock, grupoId) {
    try { await sock.sendMessage(grupoId, { text: await montarResumoGrupo(sock, grupoId) }); } catch (erro) { console.error(`❌ Falha no relatório de ${grupoId}:`, erro.message); }
}

function lerUltimoEnvio() { try { return fs.existsSync(marcadorPath) ? JSON.parse(fs.readFileSync(marcadorPath, "utf8")) : {}; } catch { return {}; } }
function salvarUltimoEnvio(data) { try { fs.writeFileSync(marcadorPath, JSON.stringify({ ultimoEnvio: data }, null, 2)); } catch {} }

async function enviarRelatorioDiario(sock) {
    const db = getDB();
    for (const grupoId of Object.keys(db).filter(id => db[id]?.relatorioDiario)) {
        await enviarRelatorioGrupo(sock, grupoId);
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}

function iniciarAgendadorDiario(sock) {
    return setInterval(async () => {
        const agora = new Date();
        const hoje = hojeISO();
        if (agora.getHours() === HORA_RELATORIO && agora.getMinutes() === MINUTO_RELATORIO && lerUltimoEnvio().ultimoEnvio !== hoje) {
            salvarUltimoEnvio(hoje);
            await enviarRelatorioDiario(sock);
        }
    }, 60 * 1000);
}

module.exports = { registrarMensagemRelatorio, resumo, topAtivos, toggleRelatorio, iniciarAgendadorDiario, enviarRelatorioDiario, montarResumoGrupo, montarDadosResumo };
