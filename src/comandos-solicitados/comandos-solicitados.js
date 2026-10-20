const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const { getDB, saveDB } = require("../grupo-db/grupo-db");
const { soNumeros } = require("../utils-validacao/utils-validacao");
const config = require("../../config");

const PALAVROES = ["porra", "caralho", "foda-se", "fudeu", "puta", "puto", "viado", "merda", "buceta", "cacete"];
const dbPath = path.join(__dirname, "../dados/solicitados.json");
const remocoesPath = path.join(__dirname, "../dados/historico-remocoes.json");
function lerLocal() { try { return fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf8")) : {}; } catch { return {}; } }
function salvarLocal(db) { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); }
function lerRemocoes() { try { return fs.existsSync(remocoesPath) ? JSON.parse(fs.readFileSync(remocoesPath, "utf8")) : {}; } catch { return {}; } }
function registrarRemocao(grupoId, alvo, responsavel, motivo = "") { const db = lerRemocoes(); db[grupoId] ||= []; db[grupoId].push({ alvo, responsavel, motivo, data: new Date().toISOString() }); if (db[grupoId].length > 100) db[grupoId] = db[grupoId].slice(-100); fs.writeFileSync(remocoesPath, JSON.stringify(db, null, 2)); }
function historicoRemocoes(grupoId) { return (lerRemocoes()[grupoId] || []).slice(-20).reverse(); }
function grupo(msg) { return msg?.key?.remoteJid?.endsWith("@g.us") ? msg.key.remoteJid : null; }
function remetente(msg) { return msg?.key?.participant || msg?.key?.remoteJid; }
async function ehAdmin(sock, msg) {
    const id = remetente(msg), from = grupo(msg);
    if (!from) return false;
    const meta = await sock.groupMetadata(from);
    return meta.participants.some(p => (p.id === id || p.lid === id) && !!p.admin);
}
async function exigirAdmin(sock, msg) {
    if (await ehAdmin(sock, msg)) return true;
    await sock.sendMessage(msg.key.remoteJid, { text: "❌ Este comando é exclusivo para administradores." }, { quoted: msg });
    return false;
}
function texto(msg) { return msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || ""; }

async function processarBlacklist(sock, msg) {
    const from = grupo(msg); const id = soNumeros(remetente(msg));
    const acompanhamento = lerLocal(); acompanhamento.grupos ||= {}; acompanhamento.grupos[from] ||= {};
    acompanhamento.grupos[from][remetente(msg)] ||= { primeiraMensagem: Date.now() };
    salvarLocal(acompanhamento);
    const lista = from ? (getDB()[from]?.blacklist || []) : [];
    if (!from || !id || !lista.some(numero => id.endsWith(numero))) return false;
    try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
    return true;
}

async function processarAntiPalavrao(sock, msg, body) {
    const from = grupo(msg);
    if (!from || !body || !(getDB()[from]?.antiPalavrao)) return false;
    const encontrado = PALAVROES.find(p => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(body));
    if (!encontrado) return false;
    try { await sock.sendMessage(from, { delete: msg.key }); } catch {}
    const avisos = ["🚨 Mensagem removida: vamos manter o respeito por aqui.", "🧹 Apaguei o palavrão. Bora conversar numa boa?", "⚠️ A moderação automática entrou em ação."];
    await sock.sendMessage(from, { text: avisos[Math.floor(Math.random() * avisos.length)] }, { quoted: msg });
    return true;
}

async function comandosAdmin(sock, msg, command, args) {
    const from = grupo(msg);
    if (!from) return sock.sendMessage(msg.key.remoteJid, { text: "❌ Este comando só funciona em grupos." }, { quoted: msg });
    if (!(await exigirAdmin(sock, msg))) return;
    const db = getDB(); db[from] ||= {};
    if (command === "antipalavrao") {
        db[from].antiPalavrao = !db[from].antiPalavrao; saveDB(db);
        return sock.sendMessage(from, { text: `${db[from].antiPalavrao ? "✅" : "❌"} Anti-palavrão ${db[from].antiPalavrao ? "ativado" : "desativado"}.` }, { quoted: msg });
    }
    if (command === "dvcl-auto") {
        db[from].figurinhaAutomatica = !db[from].figurinhaAutomatica; saveDB(db);
        return sock.sendMessage(from, { text: `${db[from].figurinhaAutomatica ? "✅" : "❌"} Figurinha automática ${db[from].figurinhaAutomatica ? "ativada" : "desativada"}.` }, { quoted: msg });
    }
    // dvcl1 liga e dvcl0 desliga a figurinha automática do grupo (sem
    // depender de saber o estado atual, diferente do dvcl-auto que alterna).
    if (command === "dvcl1") {
        db[from].figurinhaAutomatica = true; saveDB(db);
        return sock.sendMessage(from, { text: "✅ Figurinha automática ativada." }, { quoted: msg });
    }
    if (command === "dvcl0") {
        db[from].figurinhaAutomatica = false; saveDB(db);
        return sock.sendMessage(from, { text: "❌ Figurinha automática desativada." }, { quoted: msg });
    }
    if (["lista", "blacklist", "dvcl-lista", "listra"].includes(command)) {
        const numero = soNumeros(args[0]); db[from].blacklist ||= [];
        if (!numero) return sock.sendMessage(from, { text: db[from].blacklist.length ? `🚫 *LISTA NEGRA*\n\n${db[from].blacklist.map((n, i) => `${i + 1}. ${n}`).join("\n")}` : "✅ A lista negra está vazia." }, { quoted: msg });
        if (!db[from].blacklist.includes(numero)) db[from].blacklist.push(numero); saveDB(db);
        return sock.sendMessage(from, { text: `🚫 Número *${numero}* adicionado à lista negra.` }, { quoted: msg });
    }
    if (["tirarlista", "removerlista", "delblacklist"].includes(command)) {
        const numero = soNumeros(args[0]); db[from].blacklist = (db[from].blacklist || []).filter(n => n !== numero); saveDB(db);
        return sock.sendMessage(from, { text: `✅ Número *${numero || "informado"}* retirado da lista negra.` }, { quoted: msg });
    }
    if (command === "add" || command === "mikasa-add") {
        const numero = soNumeros(args[0]); if (numero.length < 10) return sock.sendMessage(from, { text: `Uso: ${config.PREFIX}add 5511999999999` }, { quoted: msg });
        try { await sock.groupParticipantsUpdate(from, [`${numero}@s.whatsapp.net`], "add"); return sock.sendMessage(from, { text: `✅ Solicitação de adição enviada para *${numero}*.` }, { quoted: msg }); } catch (erro) { return sock.sendMessage(from, { text: `❌ Não consegui adicionar: ${erro.message}` }, { quoted: msg }); }
    }
    if (command === "modulos") {
        const flags = db[from]; const on = v => v ? "✅ ativo" : "❌ inativo";
        return sock.sendMessage(from, { text: `╭─〔 ⚙️ MÓDULOS DO GRUPO 〕\n│ Anti-palavrão: ${on(flags.antiPalavrao)}\n│ Figurinha automática: ${on(flags.figurinhaAutomatica)}\n│ Relatório diário: ${on(flags.relatorioDiario)}\n╰────────────────────` }, { quoted: msg });
    }
    if (command === "limparbot") return sock.sendMessage(from, { text: "ℹ️ Para apagar uma mensagem do bot, responda à mensagem e use .limpar. O WhatsApp não fornece ao bot um histórico completo para apagar todas as mensagens antigas de uma só vez." }, { quoted: msg });
    if (command === "historico-ban" || command === "logban") { const itens = historicoRemocoes(from); return sock.sendMessage(from, { text: itens.length ? `📜 *HISTÓRICO DE REMOÇÕES*\n\n${itens.map((i, n) => `${n + 1}. ${i.alvo} — ${new Date(i.data).toLocaleString("pt-BR")}\n   Responsável: ${i.responsavel}\n   Motivo: ${i.motivo || "não informado"}`).join("\n")}` : "📜 Ainda não há remoções registradas neste grupo." }, { quoted: msg }); }
}

async function tempoGrupo(sock, msg) {
    const from = grupo(msg); if (!from) return sock.sendMessage(msg.key.remoteJid, { text: "❌ Este comando só funciona em grupos." }, { quoted: msg });
    const alvo = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || msg.message?.extendedTextMessage?.contextInfo?.participant || remetente(msg);
    const db = lerLocal(); const registro = db.grupos?.[from]?.[alvo];
    if (!registro?.primeiraMensagem) return sock.sendMessage(from, { text: "ℹ️ Ainda não tenho a primeira atividade dessa pessoa registrada. O contador começa na próxima mensagem dela." }, { quoted: msg });
    const dias = Math.max(0, Math.floor((Date.now() - registro.primeiraMensagem) / 86400000));
    return sock.sendMessage(from, { text: `⏱️ @${String(alvo).split("@")[0]} está sendo acompanhado há aproximadamente *${dias} dia(s)* desde a primeira atividade registrada.`, mentions: [alvo] }, { quoted: msg });
}

async function processarFigurinhaAutomatica(sock, msg) {
    const from = grupo(msg); const media = msg.message?.imageMessage || msg.message?.videoMessage;
    if (!from || !media || texto(msg).startsWith(config.PREFIX)) return false;
    if (!getDB()[from]?.figurinhaAutomatica) return false;
    try { const { criarFigurinha } = require("../figurinha/figurinha"); await criarFigurinha(sock, msg, true); return true; } catch { return false; }
}

async function comandosUtil(sock, msg, command, args) {
    const from = msg.key.remoteJid; const entrada = args.join(" ").trim();
    if (command === "dvcl-prt" || command === "dvcl-ptr" || command === "pinterest") { if (!entrada) return sock.sendMessage(from, { text: `Uso: ${config.PREFIX}dvcl-Prt link do Pinterest` }, { quoted: msg }); const solicitante = msg.key.participantAlt || msg.key.participant || from; try { await sock.sendMessage(from, { text: `📥 @${String(solicitante).split("@")[0]} estou baixando a mídia do Pinterest...`, mentions: [solicitante] }, { quoted: msg }); } catch {} try { if (await require("../pinterest-video/pinterest-video").baixarPinterest(sock, msg, entrada)) return; const pagina = await axios.get(entrada, { timeout: 20000, headers: { "User-Agent": "Mozilla/5.0" } }); const achado = pagina.data.match(/<meta[^>]+property=[\"']og:image[\"'][^>]+content=[\"']([^\"']+)/i) || pagina.data.match(/<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+property=[\"']og:image/i); if (!achado?.[1]) throw new Error("imagem não encontrada"); const imagem = await axios.get(achado[1].replace(/&amp;/g, "&"), { responseType: "arraybuffer", timeout: 30000 }); return sock.sendMessage(from, { image: Buffer.from(imagem.data), caption: "✅ Mídia do Pinterest baixada." }, { quoted: msg }); } catch { return sock.sendMessage(from, { text: "❌ Não consegui localizar a imagem desse link do Pinterest." }, { quoted: msg }); } }
    if (command === "me") return sock.sendMessage(from, { text: `👤 *SEU PERFIL*\n\n🆔 ID: ${remetente(msg)}\n📱 Número: ${String(remetente(msg)).split("@")[0]}\n💬 Grupo: ${from.endsWith("@g.us") ? "sim" : "não"}` }, { quoted: msg });
    if (command === "atividades" || command === "atividade") { const { montarResumoGrupo } = require("../relatorio/relatorio"); return sock.sendMessage(from, { text: await montarResumoGrupo(sock, from) }, { quoted: msg }); }
    if (command === "calculadora" || command === "calc") {
        if (!entrada || !/^[0-9+\-*/().,%\s]+$/.test(entrada)) return sock.sendMessage(from, { text: `Uso: ${config.PREFIX}calc 2 + 2 * 5` }, { quoted: msg });
        try { const resultado = Function(`"use strict"; return (${entrada.replace(/%/g, "/100")})`)(); return sock.sendMessage(from, { text: `🧮 ${entrada} = *${resultado}*` }, { quoted: msg }); } catch { return sock.sendMessage(from, { text: "❌ Não consegui calcular essa expressão." }, { quoted: msg }); }
    }
    if (command === "base64") { const op = args.shift()?.toLowerCase(); const valor = args.join(" "); if (!valor) return sock.sendMessage(from, { text: `Uso: ${config.PREFIX}base64 codificar texto` }, { quoted: msg }); const resultado = op === "decodificar" || op === "decode" ? Buffer.from(valor, "base64").toString("utf8") : Buffer.from(valor, "utf8").toString("base64"); return sock.sendMessage(from, { text: `🔐 Resultado: ${resultado}` }, { quoted: msg }); }
    if (command === "md5" || command === "hashmd5") return sock.sendMessage(from, { text: `🔏 MD5: ${crypto.createHash("md5").update(entrada).digest("hex")}` }, { quoted: msg });
    if (command === "spoiler") return sock.sendMessage(from, { text: `||${entrada || "texto oculto"}||` }, { quoted: msg });
    if (["encurtar", "encurtador", "encurtarlink"].includes(command)) { try { const r = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(entrada)}`); return sock.sendMessage(from, { text: `🔗 Link encurtado:\n${r.data}` }, { quoted: msg }); } catch { return sock.sendMessage(from, { text: "❌ Não consegui encurtar esse link agora." }, { quoted: msg }); } }
    if (command === "wiki") { try { const r = await axios.get(`https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(entrada)}`); return sock.sendMessage(from, { text: `📚 *${r.data.title}*\n\n${r.data.extract}\n\n${r.data.content_urls?.desktop?.page || ""}` }, { quoted: msg }); } catch { return sock.sendMessage(from, { text: "❌ Termo não encontrado na Wikipédia." }, { quoted: msg }); } }
    if (["traduzir", "tradutor"].includes(command)) { const [idioma = "en", ...resto] = args; const frase = resto.join(" "); try { const r = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${idioma}&dt=t&q=${encodeURIComponent(frase)}`); return sock.sendMessage(from, { text: `🌐 Tradução (${idioma}):\n${r.data[0].map(x => x[0]).join("")}` }, { quoted: msg }); } catch { return sock.sendMessage(from, { text: "❌ Não consegui traduzir agora." }, { quoted: msg }); } }
    if (["qrcode", "qr", "qr-code"].includes(command)) { if (!entrada) return sock.sendMessage(from, { text: `Uso: ${config.PREFIX}qrcode texto ou link` }, { quoted: msg }); try { const r = await axios.get(`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(entrada)}`, { responseType: "arraybuffer" }); return sock.sendMessage(from, { image: Buffer.from(r.data), caption: `✅ QR Code criado para:\n${entrada}` }, { quoted: msg }); } catch { return sock.sendMessage(from, { text: "❌ Não consegui criar o QR Code agora." }, { quoted: msg }); } }
    if (command === "caca" || command === "caça" || command === "daily") { const db = lerLocal(); const id = remetente(msg); db[id] ||= { moedas: 0, ultimoDaily: "" }; const hoje = new Date().toISOString().slice(0, 10); if (command === "daily") { if (db[id].ultimoDaily === hoje) return sock.sendMessage(from, { text: "⏳ Você já recebeu sua recompensa diária hoje." }, { quoted: msg }); db[id].ultimoDaily = hoje; db[id].moedas += 100; salvarLocal(db); return sock.sendMessage(from, { text: "🎁 Recompensa diária recebida: *+100 moedas*!" }, { quoted: msg }); } const ganho = Math.floor(Math.random() * 51) + 10; db[id].moedas += ganho; salvarLocal(db); return sock.sendMessage(from, { text: `🔎 Você caçou e encontrou *${ganho} moedas*!` }, { quoted: msg }); }
    if (command === "tang") { const meta = from.endsWith("@g.us") ? await sock.groupMetadata(from) : null; const candidatos = meta?.participants?.filter(p => p.id !== remetente(msg)) || []; const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]; const alvo = mencionado || candidatos[Math.floor(Math.random() * candidatos.length)]?.id; const resposta = alvo ? { text: `👉 Ei, @${alvo.split("@")[0]}!`, mentions: [alvo] } : { text: "❌ Marque alguém para usar o comando." }; return sock.sendMessage(from, resposta, { quoted: msg }); }
}

module.exports = { comandosAdmin, comandosUtil, tempoGrupo, registrarRemocao, processarAntiPalavrao, processarBlacklist, processarFigurinhaAutomatica };
