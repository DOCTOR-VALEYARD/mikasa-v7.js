// ==================================================
// 🤖 PAINEL TELEGRAM — conecta o Mikasa Bot no número de cada pessoa
// Cada pessoa ganha uma CÓPIA da pasta ./modelo (sessão, banco e config só dela).
// ==================================================
const sairDeVerdade = process.exit.bind(process);   // o bot principal bloqueia process.exit; o painel usa este
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { Telegraf, Markup } = require("telegraf");

// ╔══════════════════════════════════════════════╗
// ║  ⚙️ CONFIGURE AQUI (sem .env)                 ║
// ╚══════════════════════════════════════════════╝
const CONFIG = {
    TELEGRAM_TOKEN: "COLE_SEU_TOKEN_AQUI",
    ADMIN_IDS: ["8279770190"],            // seu ID do Telegram entre aspas, ex.: ["123456789"] (mande /meuid pro painel)
    TROCAS_POR_MES: 3,        // quantas vezes o cliente pode trocar o número do bot por mês (sem pagar de novo)
    MAX_INSTANCIAS: 20,       // quantos bots no máximo (cada um gasta memória)
    ARQUIVO_PRINCIPAL: "",    // só se o painel não achar sozinho o arquivo do bot (ex.: "mikasabot.js")
    MODELO_DIR: "",           // só se o Mikasa modelo estiver em outra pasta
    CANAL_URL: "",            // link do seu canal (aparece como botão; deixe "" para esconder)
    COBRAR: true,             // true = só usa quem tiver plano pago (Pix Mercado Pago). false = grátis
    PLANOS: [                 // preço em reais; dias = quanto tempo o plano dura
        { id: "p30",  nome: "30 dias",  dias: 30,  preco: 9 },
        { id: "p90",  nome: "90 dias",  dias: 90,  preco: 24 },
        { id: "p180", nome: "180 dias", dias: 180, preco: 45 }
    ],
    SUPORTE_URL: ""           // link de suporte/contato, ex.: "https://wa.me/5511999998888" ou "https://t.me/seuuser"
};

const TOKEN = (CONFIG.TELEGRAM_TOKEN || "").trim().startsWith("COLE") ? "" : (CONFIG.TELEGRAM_TOKEN || "").trim();
if (!TOKEN) {
    console.log("ℹ️ Painel Telegram desligado: falta o token no topo do painel.js (o bot segue normal).");
    if (require.main === module) process.exit(1);
    return; // quando carregado pelo bot, só não sobe o painel
}
process.env.PAINEL_ATIVO = "1";   // avisa o bot principal: o painel está de pé, não deixe o processo morrer
const ADMINS = CONFIG.ADMIN_IDS.map(String);
const MAX = CONFIG.MAX_INSTANCIAS;

// Pasta do Mikasa que serve de modelo (padrão: ./modelo). Se o Mikasa já está em outra pasta da hospedagem,
// use CONFIG.MODELO_DIR.
const MODELO = path.resolve(CONFIG.MODELO_DIR || (fs.existsSync(path.join(__dirname, "modelo")) ? path.join(__dirname, "modelo") : __dirname));
const PASTA = path.join(__dirname, "instancias");
const ESTADO = path.join(PASTA, "estado.json");
// arquivo principal do bot: o que carregou o painel (ex.: mikasa.js) ou CONFIG.ARQUIVO_PRINCIPAL
const PRINCIPAL = CONFIG.ARQUIVO_PRINCIPAL ||
    (require.main && path.basename(require.main.filename) !== "painel.js" ? path.basename(require.main.filename) : "mikasabot.js");
fs.mkdirSync(PASTA, { recursive: true });

// ── estado persistente: { [telegramId]: { numero, ligado, nome } } ──
let estado = {};
try { estado = JSON.parse(fs.readFileSync(ESTADO, "utf8")); } catch {}
const salvar = () => fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2));

// ── processos em memória ──
const procs = new Map();      // id -> { child, status, tentativas, parando }
const aguardando = new Map(); // id -> true (esperando o número)

const pastaDe = id => path.join(PASTA, String(id));
const ehAdmin = id => ADMINS.includes(String(id));
const bot = new Telegraf(TOKEN);

// ── cópia do modelo para a pasta da pessoa ──
const IGNORAR = new Set(["node_modules", "auth_info", "temp", "instalacao.log", "usuarios.json", "database.json", "site",
    "instancias", "painel.js", ".env", "painel", "modelo", ".git", "bot.log"]);
function copiar(origem, destino) {
    fs.mkdirSync(destino, { recursive: true });
    for (const nome of fs.readdirSync(origem)) {
        if (IGNORAR.has(nome)) continue;
        const o = path.join(origem, nome), d = path.join(destino, nome);
        if (fs.statSync(o).isDirectory()) copiar(o, d);
        else fs.copyFileSync(o, d);
    }
}
function prepararPasta(id, numero, nome) {
    const dir = pastaDe(id);
    if (!fs.existsSync(path.join(dir, PRINCIPAL))) {
        copiar(MODELO, dir);
        fs.mkdirSync(path.join(dir, "temp"), { recursive: true });
    }
    // banco de usuários começa vazio (não herda os dados do modelo)
    const uj = path.join(dir, "database", "usuarios.json");
    fs.mkdirSync(path.dirname(uj), { recursive: true });
    if (!fs.existsSync(uj)) fs.writeFileSync(uj, "{}");
    // node_modules compartilhado (instalado uma vez em ./modelo)
    const nm = path.join(dir, "node_modules");
    if (!fs.existsSync(nm)) fs.symlinkSync(path.join(MODELO, "node_modules"), nm, "dir");
    // a pessoa vira DONA do próprio bot
    const cfgPath = path.join(dir, "database", "botconfig.json");
    let cfg = {}; try { cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8")); } catch {}
    Object.assign(cfg, { OWNER_NUMBER: numero, OWNER_NAME: nome || "Dono", OWNER_LID: "", MP_ACCESS_TOKEN: "" }); // token do MP é só seu: não vai pras cópias
    fs.mkdirSync(path.dirname(cfgPath), { recursive: true });
    fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
}

// ==================================================
// 🎨 VISUAL — uma tela só: sempre apaga a anterior pra mandar a nova
// ==================================================
const esc = t => String(t).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const esperar = ms => new Promise(r => setTimeout(r, ms));
const FOTO = path.join(MODELO, "src", "midias", "imagens", "fundo.png");
const TELAS = path.join(PASTA, "telas.json");              // { telegramId: message_id da tela atual }
let ultima = {}; try { ultima = JSON.parse(fs.readFileSync(TELAS, "utf8")); } catch {}
const salvarTelas = () => { try { fs.writeFileSync(TELAS, JSON.stringify(ultima)); } catch {} };
let fotoId = null;                                          // file_id da foto (reenvio instantâneo)
const filas = new Map();                                    // uma fila por pessoa: nada de corrida entre apagar/enviar
const naFila = (id, fn) => { const p = (filas.get(id) || Promise.resolve()).then(fn, fn); filas.set(id, p.catch(() => {})); return p; };

const ICONE = { conectado: "🟢", "aguardando pareamento": "🟡", iniciando: "🟡", reiniciando: "🟠", desligado: "🔴", deslogado: "🔴", caiu: "🔴", erro: "🔴" };
const NOME_STATUS = { conectado: "Conectado", "aguardando pareamento": "Aguardando pareamento", iniciando: "Iniciando…", reiniciando: "Reiniciando…", desligado: "Desligado", deslogado: "Sessão encerrada", caiu: "Caiu", erro: "Erro" };
const statusDe = id => procs.get(id)?.status || "desligado";
const duracao = ms => { const m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? `${d}d ${h % 24}h` : h ? `${h}h ${m % 60}min` : `${Math.max(m, 0)}min`; };
const lerCfg = id => { try { return JSON.parse(fs.readFileSync(path.join(pastaDe(id), "database", "botconfig.json"), "utf8")); } catch { return {}; } };
function gravarCfg(id, campos) {
    const f = path.join(pastaDe(id), "database", "botconfig.json"), c = lerCfg(id); Object.assign(c, campos);
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(c, null, 2));
}
function prefixoPadrao() { try { return fs.readFileSync(path.join(MODELO, "config.js"), "utf8").match(/PREFIX:\s*["'`](.+?)["'`]/)?.[1] || "—"; } catch { return "—"; } }
const LINHA = "━━━━━━━━━━━━━━━━━━━━";
const TITULO = `╭${LINHA}╮\n   🌹 <b>MIKASA BOT</b> 🌹\n╰${LINHA}╯`;
const AVISO_NET = "🌐 <b>Internet:</b> você só precisa de internet na hora de conectar. Depois o bot fica <b>online 24h no nosso servidor</b>, mesmo com seu celular sem internet ou desligado — a internet do bot já está no plano.\n<i>(Só abra o WhatsApp no celular de vez em quando, para o WhatsApp não desconectar o aparelho.)</i>";
const AVISO_GARANTIA = "🛡 <b>Sem perder nada:</b> se o seu número cair, é só pedir um <b>novo código</b> no painel, quando quiser, <b>sem pagar de novo</b>. Seu plano e seus dados ficam guardados. Se precisar mudar de número, dá para <b>trocar</b> (até 3x por mês).";
const barra = p => { const n = Math.round(p / 10); return "▰".repeat(n) + "▱".repeat(10 - n) + `  <b>${p}%</b>`; };
const B = Markup.button;
const tecVoltar = (txt = "⬅️ Voltar ao painel") => Markup.inlineKeyboard([[B.callback(txt, "painel")]]);
const tecCancelar = Markup.inlineKeyboard([[B.callback("✖️ Cancelar", "painel")]]);

// ── envio: apaga a tela anterior (e a mensagem clicada) e manda a nova com a foto ──
function enviar(id, texto, tec, extraApagar) {
    return naFila(id, async () => {
        // 1º manda a tela nova, 2º apaga a velha: o chat nunca fica vazio (vazio = Telegram mostra o botão "Iniciar Bot")
        const apagar = new Set([ultima[id], extraApagar].filter(Boolean));
        delete ultima[id];
        const base = { parse_mode: "HTML", ...tec };
        let msg = null;
        if (fs.existsSync(FOTO)) {
            for (const fonte of [fotoId, { source: FOTO }]) {
                if (!fonte) continue;
                try { msg = await bot.telegram.sendPhoto(id, fonte, { caption: texto.slice(0, 1024), ...base }); break; }
                catch (e) { if (fonte === fotoId) fotoId = null; }
            }
            if (msg && !fotoId) fotoId = msg.photo?.[msg.photo.length - 1]?.file_id || null;
        }
        if (!msg) msg = await bot.telegram.sendMessage(id, texto, base).catch(e => { console.error("Envio falhou:", e.message); return null; });
        if (msg) { ultima[id] = msg.message_id; salvarTelas(); }
        for (const m of apagar) if (!msg || m !== msg.message_id) await bot.telegram.deleteMessage(id, m).catch(() => {});
    });
}
// edita a tela atual (barra de carregamento); se não existir, cria
function editar(id, texto, tec) {
    return naFila(id, async () => {
        if (!ultima[id]) return;
        try { await bot.telegram.editMessageCaption(id, ultima[id], undefined, texto.slice(0, 1024), { parse_mode: "HTML", ...tec }); }
        catch (e) { if (!/not modified/i.test(e.message)) { try { await bot.telegram.editMessageText(id, ultima[id], undefined, texto, { parse_mode: "HTML", ...tec }); } catch {} } }
    });
}
const telaBarra = (titulo, p, etapa) => `${TITULO}\n\n⏳ <b>${titulo}</b>\n\n${barra(p)}\n<i>${etapa}</i>`;
async function progresso(id, titulo, etapas, ms = 550) {
    for (let i = 0; i < etapas.length; i++) { await editar(id, telaBarra(titulo, Math.round(((i + 1) / etapas.length) * 100), etapas[i])); await esperar(ms); }
}
// barra "esperando": sobe sozinha até o código/conexão chegar
function iniciarBarraEspera(id, titulo) {
    const info = procs.get(id); if (!info) return;
    pararBarra(id);
    const etapas = ["Copiando arquivos…", "Iniciando o bot…", "Conectando ao WhatsApp…", "Gerando seu código…"];
    let p = 4, i = 0;
    editar(id, telaBarra(titulo, p, etapas[0]));
    info.barra = setInterval(() => { p = Math.min(94, p + 5 + Math.floor(Math.random() * 6)); i = Math.min(etapas.length - 1, Math.floor(p / 25)); editar(id, telaBarra(titulo, p, etapas[i])); }, 1600);
}
function pararBarra(id) { const info = procs.get(id); if (info?.barra) { clearInterval(info.barra); info.barra = null; } }

// ── assinaturas (planos pagos) ──
const ASSIN = path.join(PASTA, "assinaturas.json"), PEND = path.join(PASTA, "pendentes.json");
let assin = {}, pendentes = {};
try { assin = JSON.parse(fs.readFileSync(ASSIN, "utf8")); } catch {}
try { pendentes = JSON.parse(fs.readFileSync(PEND, "utf8")); } catch {}
const salvarAssin = () => fs.writeFileSync(ASSIN, JSON.stringify(assin, null, 2));
const salvarPend = () => fs.writeFileSync(PEND, JSON.stringify(pendentes, null, 2));
const temAcesso = id => !CONFIG.COBRAR || ehAdmin(id) || (assin[id]?.ate || 0) > Date.now();
const diasRestantes = id => Math.max(0, Math.ceil(((assin[id]?.ate || 0) - Date.now()) / 86400000));
const dataBR = ts => new Date(ts).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const reais = v => "R$ " + Number(v).toFixed(2).replace(".", ",");
const planoDe = pid => CONFIG.PLANOS.find(p => p.id === pid);
function conceder(id, dias, paymentId) {
    const a = assin[id] || (assin[id] = { ate: 0, pagos: [] });
    a.ate = Math.max(a.ate || 0, Date.now()) + dias * 86400000; a.avisoEm = ""; if (paymentId) a.pagos.push(String(paymentId));
    salvarAssin(); return a.ate;
}
// token do Mercado Pago: o MESMO do Mikasa (database/botconfig.json do modelo, senão config.js)
function tokenMP() {
    try { const t = JSON.parse(fs.readFileSync(path.join(MODELO, "database", "botconfig.json"), "utf8")).MP_ACCESS_TOKEN; if (t) return t; } catch {}
    try { return fs.readFileSync(path.join(MODELO, "config.js"), "utf8").match(/MP_ACCESS_TOKEN:\s*["'`](.+?)["'`]/)?.[1] || ""; } catch { return ""; }
}
const axios = (() => { try { return require("axios"); } catch { return null; } })();
async function criarPix(id, plano) {
    const token = tokenMP();
    if (!token || !axios) throw new Error("Pagamento indisponível no momento (token do Mercado Pago não configurado).");
    const ref = `painel:${id}:${plano.id}`;
    const r = await axios.post("https://api.mercadopago.com/v1/payments", {
        transaction_amount: Number(plano.preco), description: `Mikasa Bot — plano ${plano.nome}`, payment_method_id: "pix",
        external_reference: ref, payer: { email: "cliente@painel.com" }
    }, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": `${ref}-${Date.now()}` }, timeout: 20000 });
    const pix = r.data?.point_of_interaction?.transaction_data;
    if (!pix?.qr_code) throw new Error("O Mercado Pago não devolveu o código Pix.");
    pendentes[r.data.id] = { id, planoId: plano.id, criado: Date.now() }; salvarPend();
    vigiar(String(r.data.id));
    return { pagamento: r.data.id, copiaECola: pix.qr_code, link: pix.ticket_url };
}
async function consultarMP(pid) {
    const r = await axios.get(`https://api.mercadopago.com/v1/payments/${pid}`, { headers: { Authorization: `Bearer ${tokenMP()}` }, timeout: 15000 });
    return r.data;
}
const vigias = new Map();
function pararVigia(pid) { clearInterval(vigias.get(String(pid))); vigias.delete(String(pid)); }
async function checarPagamento(pid) {
    const pend = pendentes[pid]; if (!pend) return pararVigia(pid);
    let d; try { d = await consultarMP(pid); } catch (e) { console.error("Checar Pix:", e.message); return null; }
    const planoPago = planoDe(pend.planoId);
    if (d.status === "approved" && planoPago && (Number(d.transaction_amount) < Number(planoPago.preco) || (d.external_reference && d.external_reference !== `painel:${pend.id}:${pend.planoId}`))) {
        console.error("Pix aprovado com valor/referência diferente — ignorado:", pid); pararVigia(pid); delete pendentes[pid]; salvarPend(); return "fim";
    }
    if (d.status === "approved") {
        pararVigia(pid); delete pendentes[pid]; salvarPend();
        if (assin[pend.id]?.pagos?.includes(String(pid))) return "ok";            // já creditado antes
        const plano = planoDe(pend.planoId); if (!plano) return "ok";
        const ate = conceder(pend.id, plano.dias, pid);
        const aviso = `✅ <b>Pagamento aprovado!</b> 💎\nPlano <b>${esc(plano.nome)}</b> ativo até <b>${dataBR(ate)}</b>.\n🛡 Se seu número cair, peça novo código no painel, sem pagar de novo.`;
        if (!estado[pend.id]) { aguardando.set(pend.id, "conectar"); const t = telaPedido("conectar", "", aviso); enviar(pend.id, t.texto, t.tec); }
        else { const t = telaPainel(pend.id, aviso); enviar(pend.id, t.texto, t.tec); if (!procs.get(pend.id)?.child) acaoLigar(pend.id, "Ligando seu bot"); }
        return "ok";
    }
    if (["cancelled", "rejected"].includes(d.status) || Date.now() - pend.criado > 30 * 60 * 1000) {
        pararVigia(pid); delete pendentes[pid]; salvarPend();
        const t = telaPlanos(pend.id, "⌛ <b>O Pix expirou ou foi cancelado.</b> Escolha um plano para gerar outro."); enviar(pend.id, t.texto, t.tec); return "fim";
    }
    return "pendente";
}
function vigiar(pid) { pararVigia(pid); vigias.set(String(pid), setInterval(() => checarPagamento(String(pid)), 10000)); }

// ── telas ──
function telaPainel(id, aviso = "") {
    const reg = estado[id];
    if (!reg) return { texto: `${TITULO}\n\n✨ <b>Tenha o seu próprio bot no WhatsApp!</b>\n\n⚡ Conecta em 1 minuto\n👑 Você é o dono do bot\n🛡 Admin de grupo, figurinhas, músicas e +250 comandos\n🔒 Sessão e dados só seus\n🌐 Roda no nosso servidor: sem gastar sua internet\n${CONFIG.COBRAR && CONFIG.PLANOS.length ? `💎 Planos a partir de <b>${reais(Math.min(...CONFIG.PLANOS.map(p => p.preco)))}</b>/mês\n` : ""}\n${temAcesso(id) ? "👇 Toque em <b>CONECTAR</b> para começar." : "🔒 <b>Só conecta quem tem plano ativo</b> — o bot roda no nosso servidor, que tem custo.\n👇 Escolha um <b>plano</b> (Pix, liberação na hora)."}`, tec: tecInicio(id) };
    const info = procs.get(id), cfg = lerCfg(id), st = statusDe(id);
    const plano = !CONFIG.COBRAR || ehAdmin(id) ? "♾ Ilimitado" : temAcesso(id) ? `✅ até ${dataBR(assin[id].ate)} (${diasRestantes(id)}d)` : "❌ Vencido";
    const on = st === "conectado" && info?.inicio ? `\n⏱ <b>Online há:</b> ${duracao(Date.now() - info.inicio)}` : "";
    return {
        texto: `${TITULO}\n\n${aviso ? aviso + "\n\n" : ""}📱 <b>Número:</b> +${reg.numero}\n📡 <b>Status:</b> ${ICONE[st] || "⚪"} ${NOME_STATUS[st] || st}${on}\n💎 <b>Plano:</b> ${plano}\n🏷 <b>Nome:</b> ${esc(cfg.BOT_NAME || "Mikasa Bot")}\n🔣 <b>Prefixo:</b> <code>${esc(cfg.PREFIX || prefixoPadrao())}</code>`,
        tec: tecInicio(id)
    };
}
function tecInicio(id) {
    const rodape = [];
    if (CONFIG.CANAL_URL) rodape.push(B.url("📢 Canal", CONFIG.CANAL_URL));
    if (CONFIG.SUPORTE_URL) rodape.push(B.url("💬 Suporte", CONFIG.SUPORTE_URL));
    let k;
    if (!estado[id] && !temAcesso(id)) k = [[B.callback("💎  ESCOLHER UM PLANO", "planos")], [B.callback("📖 Como funciona", "ajuda")]];
    else if (!estado[id]) k = [[B.callback("📲  CONECTAR MEU NÚMERO", "conectar")], [B.callback("💎 Meu plano", "planos"), B.callback("📖 Como funciona", "ajuda")]];
    else if (!temAcesso(id)) k = [[B.callback("💎  RENOVAR MEU PLANO", "planos")], [B.callback("📊 Atualizar", "painel"), B.callback("🗑 Apagar meu bot", "apagar")]];
    else {
        const on = !!procs.get(id)?.child;
        const caiu = ["deslogado", "caiu", "erro"].includes(statusDe(id)) || (!on && !fs.existsSync(path.join(pastaDe(id), "auth_info", "creds.json")));
        k = [...(procs.get(id)?.banido ? [[B.callback("📱  TROCAR DE NÚMERO (SEM PAGAR DE NOVO)", "trocar")]] : []),
            ...(caiu ? [[B.callback("🔑  RECONECTAR (NOVO CÓDIGO, SEM PAGAR DE NOVO)", "novocodigo")]] : []),
            [on ? B.callback("⏹ Desligar", "desligar") : B.callback("▶️ Ligar", "ligar"), B.callback("🔄 Reiniciar", "reiniciar")],
            [B.callback("📊 Atualizar", "painel"), B.callback("📜 Logs", "logs")],
            [B.callback("⚙️ Configurar meu bot", "config"), B.callback("💎 Plano", "planos")],
            [B.callback("🔑 Novo código", "novocodigo"), B.callback("📱 Trocar número", "trocar")],
            [B.callback("🚪 Apagar sessão", "sessao")],
            [B.callback("🗑 Apagar meu bot", "apagar")]];
    }
    if (rodape.length) k.push(rodape);
    return Markup.inlineKeyboard(k);
}
const PEDIDOS = {
    trocar: "📱 <b>TROCAR NÚMERO</b>\n\nEnvie o <b>novo número</b> do WhatsApp (DDI + DDD). Seu plano e suas configurações continuam, e eu gero um código novo.\n<i>Exemplo: 5511999998888</i>",
    conectar: "📝 <b>CONECTAR MEU NÚMERO</b>\n\nEnvie o número do WhatsApp onde o bot vai ficar, com <b>DDI + DDD</b>.\n<i>Exemplo: 5511999998888</i>",
    nome: "🏷 <b>NOME DO BOT</b>\n\nEnvie o <b>novo nome</b> do seu bot (até 30 letras).",
    prefixo: "🔣 <b>PREFIXO</b>\n\nEnvie o <b>novo prefixo</b> dos comandos (1 a 3 caracteres, ex.: <code>/</code>  <code>.</code>  <code>!</code>)."
};
const numeroEmUso = (id, numero) => Object.entries(estado).some(([i, r]) => i !== String(id) && r.numero === numero);
const telaPedido = (tipo, erro = "", ok = "") => ({ texto: `${TITULO}\n\n${ok ? ok + "\n\n" : ""}${erro ? "❌ " + erro + "\n\n" : ""}${PEDIDOS[tipo]}`, tec: tecCancelar });
function telaPlanos(id, aviso = "") {
    const linhas = CONFIG.PLANOS.map(p => `💎 <b>${esc(p.nome)}</b> — ${reais(p.preco)}`).join("\n");
    const meu = assin[id]?.ate > Date.now() ? `\n\n✅ Seu plano vai até <b>${dataBR(assin[id].ate)}</b> (${diasRestantes(id)} dias). O novo tempo é somado.` : "";
    return {
        texto: `${TITULO}\n\n${aviso ? aviso + "\n\n" : ""}💎 <b>PLANOS</b>\n\n${linhas}\n\n💳 Pagamento por <b>Pix</b> (Mercado Pago), liberação automática em segundos.\n🛡 Se o seu número cair, pede <b>novo código sem pagar de novo</b>.${meu}\n\n👇 Escolha o seu plano:`,
        tec: Markup.inlineKeyboard([...CONFIG.PLANOS.map(p => [B.callback(`💎 ${p.nome} — ${reais(p.preco)}`, "plano:" + p.id)]), [B.callback("⬅️ Voltar", "painel")]])
    };
}
function telaPix(plano, pix) {
    const k = [[B.callback("✅ Já paguei — verificar", "chk:" + pix.pagamento)]];
    if (pix.link) k.push([B.url("🔗 Abrir no Mercado Pago", pix.link)]);
    k.push([B.callback("✖️ Cancelar", "cancelpix:" + pix.pagamento)]);
    return { texto: `${TITULO}\n\n💳 <b>PAGAR COM PIX</b>\n\n💎 Plano: <b>${esc(plano.nome)}</b>\n💰 Valor: <b>${reais(plano.preco)}</b>\n\n<b>Pix copia e cola</b> (toque para copiar):\n<code>${esc(pix.copiaECola)}</code>\n\n⏳ Vale por 30 minutos. Assim que pagar, libero sozinho!`, tec: Markup.inlineKeyboard(k) };
}
const telaConfirmar = (titulo, aviso, sim) => ({ texto: `${TITULO}\n\n${titulo}\n\n${aviso}\n\n<b>Confirma?</b>`, tec: Markup.inlineKeyboard([[B.callback("✅ Sim", sim), B.callback("✖️ Cancelar", "painel")]]) });

// ── reinício com barra ──
async function acaoLigar(id, titulo) {
    if (!temAcesso(id)) return;
    estado[id].ligado = true; salvar();
    const info = procs.get(id); if (info) info.tentativas = 0;
    procs.delete(id); ligar(id, true);
    iniciarBarraEspera(id, titulo);
}
async function acaoReiniciar(id) {
    await progresso(id, "Reiniciando seu bot", ["Parando…", "Limpando…"], 500);
    desligar(id); await esperar(2500);
    acaoLigar(id, "Reiniciando seu bot");
}

// ==================================================
// 🤖 LIGA / DESLIGA O BOT DE CADA PESSOA
// ==================================================
function ligar(id, avisar = false) {
    const reg = estado[id]; if (!reg) return;
    if (!temAcesso(id)) { reg.ligado = false; salvar(); return; }   // 🔒 sem plano pago, nada sobe
    if (procs.get(id)?.child) return;
    const dir = pastaDe(id);
    try { if (!fs.existsSync(path.join(dir, PRINCIPAL))) prepararPasta(id, reg.numero, reg.nome); }
    catch (e) { console.error("Erro preparando", id, e.message); return; }
    const antigo = procs.get(id);
    const info = { child: null, status: "iniciando", tentativas: antigo?.tentativas || 0, parando: false, avisar, barra: null, inicio: null };
    procs.set(id, info);
    const log = fs.createWriteStream(path.join(dir, "bot.log"), { flags: "a" });
    const child = spawn(process.execPath, [PRINCIPAL], {
        cwd: dir,
        env: { ...process.env, TELEGRAM_TOKEN: "", ADMIN_IDS: "", PAINEL_NUMERO: reg.numero, PAINEL_SITE: "0", FORCE_COLOR: "0" },
        stdio: ["ignore", "pipe", "pipe"]
    });
    info.child = child;
    child.on("error", e => { console.error("Erro ao iniciar bot de", id, e.message); pararBarra(id); info.child = null; info.status = "erro"; });
    const ler = buf => {
        const txt = buf.toString(); log.write(txt);
        for (const l of txt.split(/\r?\n/)) {
            const c = l.match(/PAINEL_CODIGO:(\S+)/);
            if (c) {
                info.status = "aguardando pareamento"; pararBarra(id);
                enviar(id, `${TITULO}\n\n🔑 <b>SEU CÓDIGO DE PAREAMENTO</b>\n\n      <code>${c[1]}</code>\n<i>(toque no código para copiar)</i>\n\n1️⃣ WhatsApp ➜ <b>Dispositivos conectados</b>\n2️⃣ <b>Conectar um dispositivo</b>\n3️⃣ <b>Conectar com número de telefone</b>\n4️⃣ Digite o código\n\n⏳ Vale por ~2 minutos.\n\n🌐 Depois de conectar, pode ficar sem internet: o bot roda no nosso servidor.\n🛡 Se o código vencer ou o número cair, gere outro quando quiser — sem pagar de novo.`,
                    Markup.inlineKeyboard([[B.callback("🔄 Gerar outro código", "novocodigo")], [B.callback("⬅️ Painel", "painel")]]));
            }
            if (l.includes("PAINEL_CONECTADO") && info.status !== "conectado") {
                info.status = "conectado"; info.tentativas = 0; info.inicio = Date.now(); pararBarra(id);
                if (info.avisar) { info.avisar = false; (async () => { await editar(id, telaBarra("Conectando", 100, "Conectado!")); await esperar(700); const t = telaPainel(id, "✅ <b>Seu bot conectou com sucesso!</b> 🎉"); enviar(id, t.texto, t.tec); })(); }
            }
            if (l.includes("PAINEL_BANIDO")) {
                info.status = "deslogado"; info.deslogado = true; info.banido = true; pararBarra(id);
                const t = telaPainel(id, "🚫 <b>O WhatsApp bloqueou este número.</b>\nSeu plano e seus dados estão <b>guardados</b>. Toque em <b>TROCAR DE NÚMERO</b> e use outro número, sem pagar de novo."); enviar(id, t.texto, t.tec);
            }
            if (l.includes("PAINEL_EXPIROU") || l.includes("PAINEL_CAIU")) {
                info.status = "caiu"; info.parou = true; pararBarra(id);
                const t = telaPainel(id, l.includes("PAINEL_EXPIROU")
                    ? "⌛ <b>O código de pareamento expirou</b> sem ser usado.\nToque em <b>RECONECTAR</b> para gerar outro."
                    : "⚠️ <b>Seu bot não conseguiu conectar</b> ao WhatsApp (várias tentativas).\nConfira a internet do celular e toque em <b>RECONECTAR</b>."); enviar(id, t.texto, t.tec);
            }
            if (l.includes("PAINEL_DESLOGADO")) {
                info.status = "deslogado"; info.deslogado = true; pararBarra(id);
                const t = telaPainel(id, "🚫 <b>O WhatsApp desconectou o seu bot.</b>\nSeu plano e seus dados estão <b>guardados</b>. Toque em <b>RECONECTAR</b> para gerar um código novo — sem pagar de novo."); enviar(id, t.texto, t.tec);
            }
        }
    };
    child.stdout.on("data", ler); child.stderr.on("data", b => log.write(b));
    child.on("exit", () => {
        log.end(); info.child = null; pararBarra(id);
        if (info.deslogado) { fs.rmSync(path.join(dir, "auth_info"), { recursive: true, force: true }); estado[id].ligado = false; salvar(); info.status = "desligado"; return; }
        if (info.parou) { estado[id].ligado = false; salvar(); info.status = "caiu"; return; }   // não fica tentando em loop
        if (info.parando || !estado[id]?.ligado) { info.status = "desligado"; return; }
        info.tentativas++;
        if (info.tentativas > 5) {
            info.status = "caiu"; estado[id].ligado = false; salvar();
            const t = telaPainel(id, "⚠️ <b>Seu bot caiu várias vezes seguidas</b> e foi desligado.\nToque em <b>Ligar</b> para tentar de novo."); enviar(id, t.texto, t.tec); return;
        }
        info.status = "reiniciando"; setTimeout(() => ligar(id, info.avisar), 5000);
    });
}
function desligar(id) {
    const info = procs.get(id);
    if (estado[id]) { estado[id].ligado = false; salvar(); }
    if (info) pararBarra(id);
    if (info?.child) { info.parando = true; info.child.kill("SIGTERM"); setTimeout(() => info.child?.kill("SIGKILL"), 5000); }
}

// ==================================================
// 💬 COMANDOS E BOTÕES
// ==================================================
bot.use((ctx, next) => (ctx.chat?.type === "private" ? next() : undefined)); // só no privado
const idDe = ctx => String(ctx.from.id);
const apagarMsg = ctx => { const m = ctx.message?.message_id; if (m) ctx.telegram.deleteMessage(ctx.chat.id, m).catch(() => {}); };
// mostra uma tela; apaga também a mensagem em que a pessoa clicou, se for diferente da tela atual
const mostrar = (ctx, t) => { const id = idDe(ctx); const clicada = ctx.callbackQuery?.message?.message_id; return enviar(id, t.texto, t.tec, clicada && clicada !== ultima[id] ? clicada : undefined); };
const aguardando2 = aguardando; // id -> "conectar" | "nome" | "prefixo"

bot.start(ctx => { apagarMsg(ctx); aguardando.delete(idDe(ctx)); mostrar(ctx, telaPainel(idDe(ctx))); });
bot.command("menu", ctx => { apagarMsg(ctx); aguardando.delete(idDe(ctx)); mostrar(ctx, telaPainel(idDe(ctx))); });
bot.command("meuid", ctx => { apagarMsg(ctx); mostrar(ctx, { texto: `${TITULO}\n\n🆔 <b>Seu ID do Telegram:</b>\n<code>${ctx.from.id}</code>`, tec: tecVoltar() }); });

const acao = (nome, fn, exigeBot = true) => bot.action(nome, async ctx => {
    ctx.answerCbQuery().catch(() => {});
    const id = idDe(ctx);
    if (exigeBot && !estado[id]) { aguardando.delete(id); return mostrar(ctx, telaPainel(id)); }
    try { await fn(ctx, id); } catch (e) { console.error("Erro na ação", nome, e.message); }
});

acao("planos", (ctx, id) => mostrar(ctx, telaPlanos(id)), false);
bot.action(/^plano:(\w+)$/, async ctx => {
    ctx.answerCbQuery().catch(() => {}); const id = idDe(ctx), plano = planoDe(ctx.match[1]); if (!plano) return;
    await enviar(id, telaBarra("Gerando seu Pix", 40, "Falando com o Mercado Pago…"), undefined, ctx.callbackQuery?.message?.message_id !== ultima[id] ? ctx.callbackQuery?.message?.message_id : undefined);
    try { const pix = await criarPix(id, plano); await editar(id, telaBarra("Gerando seu Pix", 100, "Pronto!")); await esperar(500); const t = telaPix(plano, pix); enviar(id, t.texto, t.tec); }
    catch (e) { console.error("Pix:", e.response?.data || e.message); const t = telaPlanos(id, `❌ ${esc(e.message.startsWith("Pagamento") || e.message.startsWith("O Mercado") ? e.message : "Não consegui gerar o Pix agora. Tente de novo em instantes.")}`); enviar(id, t.texto, t.tec); }
});
bot.action(/^chk:(\d+)$/, async ctx => {
    ctx.answerCbQuery("Verificando…").catch(() => {}); const pid = ctx.match[1];
    if (!pendentes[pid] || pendentes[pid].id !== idDe(ctx)) return;
    const r = await checarPagamento(pid);
    if (r === "pendente") ctx.answerCbQuery("Ainda não caiu. Pague e toque de novo em alguns segundos.", { show_alert: true }).catch(() => {});
});
bot.action(/^cancelpix:(\d+)$/, ctx => {
    ctx.answerCbQuery().catch(() => {}); const pid = ctx.match[1], id = idDe(ctx);
    if (pendentes[pid]?.id === id) { pararVigia(pid); delete pendentes[pid]; salvarPend(); }
    mostrar(ctx, telaPlanos(id));
});
const semPlano = (ctx, id) => mostrar(ctx, telaPlanos(id, "🔒 <b>Você precisa de um plano ativo</b> para usar o bot."));

acao("painel", (ctx, id) => { aguardando.delete(id); return mostrar(ctx, telaPainel(id)); }, false);
acao("ajuda", ctx => mostrar(ctx, { texto: `${TITULO}\n\n📖 <b>COMO FUNCIONA</b>\n\n<b>1️⃣</b> Toque em <b>Conectar meu número</b>\n<b>2️⃣</b> Envie seu número com DDI+DDD\n      <i>ex.: 5511999998888</i>\n<b>3️⃣</b> Eu te mando um código de 8 letras\n<b>4️⃣</b> No WhatsApp: <b>Dispositivos conectados ➜ Conectar com número de telefone</b> e digite o código\n\n✅ Pronto! O bot é seu, e você é o dono.\n\n${AVISO_NET}\n\n${AVISO_GARANTIA}`, tec: tecVoltar() }), false);

acao("conectar", (ctx, id) => {
    if (!temAcesso(id)) return semPlano(ctx, id);
    if (estado[id] && fs.existsSync(path.join(pastaDe(id), "auth_info", "creds.json"))) return mostrar(ctx, telaPainel(id));
    if (!estado[id] && Object.keys(estado).length >= MAX) return mostrar(ctx, { texto: `${TITULO}\n\n⚠️ O painel está <b>lotado</b> no momento.\nTente novamente mais tarde.`, tec: tecVoltar() });
    aguardando.set(id, "conectar"); return mostrar(ctx, telaPedido("conectar"));
}, false);

bot.on("text", async ctx => {
    const id = idDe(ctx), tipo = aguardando.get(id);
    if (!tipo) return apagarMsg(ctx);          // texto solto: some, a tela continua limpa
    apagarMsg(ctx);
    const txt = ctx.message.text.trim();
    if (tipo === "conectar") {
        const numero = txt.replace(/[^0-9]/g, "");
        if (numero.length < 10 || numero.length > 15) return mostrar(ctx, telaPedido("conectar", "Número inválido. Envie só DDI+DDD+número."));
        if (numeroEmUso(id, numero)) return mostrar(ctx, telaPedido("conectar", "Esse número já está em uso por outra conta."));
        aguardando.delete(id);
        if (!temAcesso(id)) return semPlano(ctx, id);
        if (!fs.existsSync(path.join(MODELO, "node_modules"))) return mostrar(ctx, { texto: `${TITULO}\n\n⚠️ O painel ainda não está pronto (módulos não instalados). Avise o administrador.`, tec: tecVoltar() });
        try {
            estado[id] = { numero, ligado: true, nome: ctx.from.first_name || "Dono" };
            prepararPasta(id, numero, estado[id].nome); salvar();
            await enviar(id, telaBarra("Preparando seu bot", 3, "Começando…"), undefined);
            acaoLigar(id, "Preparando seu bot");
        } catch (e) { console.error(e); mostrar(ctx, { texto: `${TITULO}\n\n❌ Erro ao preparar seu bot: ${esc(e.message)}`, tec: tecVoltar() }); }
        return;
    }
    if (!estado[id]) { aguardando.delete(id); return mostrar(ctx, telaPainel(id)); }
    if (tipo === "trocar") {
        const numero = txt.replace(/[^0-9]/g, "");
        if (numero.length < 10 || numero.length > 15) return mostrar(ctx, telaPedido("trocar", "Número inválido. Envie só DDI+DDD+número."));
        if (numeroEmUso(id, numero)) return mostrar(ctx, telaPedido("trocar", "Esse número já está em uso por outra conta."));
        if (!temAcesso(id)) { aguardando.delete(id); return semPlano(ctx, id); }
        aguardando.delete(id);
        if (numero !== estado[id].numero) {
            const a = assin[id] || (assin[id] = { ate: 0, pagos: [] }); a.trocas = (a.trocas || []).filter(t => Date.now() - t < 30 * 86400000);
            if (!ehAdmin(id) && a.trocas.length >= CONFIG.TROCAS_POR_MES) return mostrar(ctx, telaPainel(id, `⚠️ Você já trocou de número ${CONFIG.TROCAS_POR_MES}x neste mês. Fale com o suporte se precisar de mais uma troca.`));
            a.trocas.push(Date.now()); salvarAssin();
            estado[id].numero = numero; salvar(); gravarCfg(id, { OWNER_NUMBER: numero, OWNER_LID: "" });
        }
        await enviar(id, telaBarra("Trocando o número", 5, "Parando o bot…"), undefined);
        desligar(id); await esperar(2500);
        fs.rmSync(path.join(pastaDe(id), "auth_info"), { recursive: true, force: true });
        acaoLigar(id, "Gerando código do novo número"); return;
    }
    if (tipo === "nome") {
        if (!txt || txt.length > 30) return mostrar(ctx, telaPedido("nome", "Nome inválido (de 1 a 30 letras)."));
        gravarCfg(id, { BOT_NAME: txt });
    } else if (tipo === "prefixo") {
        if (!txt || txt.length > 3 || /\s/.test(txt)) return mostrar(ctx, telaPedido("prefixo", "Prefixo inválido (1 a 3 caracteres, sem espaço)."));
        gravarCfg(id, { PREFIX: txt });
    }
    aguardando.delete(id);
    if (procs.get(id)?.child) { await enviar(id, telaBarra("Aplicando", 5, "Salvando…"), undefined); await acaoReiniciar(id); }
    else mostrar(ctx, telaPainel(id, "✅ <b>Salvo!</b>"));
});

acao("ligar", async (ctx, id) => { if (!temAcesso(id)) return semPlano(ctx, id); await progresso(id, "Ligando seu bot", ["Preparando…", "Abrindo…"], 450); await acaoLigar(id, "Ligando seu bot"); });
acao("desligar", async (ctx, id) => {
    await progresso(id, "Desligando seu bot", ["Avisando…", "Parando…", "Finalizando…"], 500);
    desligar(id); await esperar(1500); mostrar(ctx, telaPainel(id, "⏹ <b>Bot desligado.</b>"));
});
acao("reiniciar", async (ctx, id) => { if (!temAcesso(id)) return semPlano(ctx, id); return acaoReiniciar(id); });
acao("logs", (ctx, id) => {
    let t = ""; try { t = fs.readFileSync(path.join(pastaDe(id), "bot.log"), "utf8"); } catch {}
    t = t.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").split("\n").filter(l => l.trim() && !l.includes("PAINEL_")).slice(-8).map(l => l.slice(0, 80)).join("\n").slice(-620);
    return mostrar(ctx, { texto: `${TITULO}\n\n📜 <b>ÚLTIMOS LOGS</b>\n${t ? "<pre>" + esc(t) + "</pre>" : "<i>Sem logs ainda.</i>"}`, tec: Markup.inlineKeyboard([[B.callback("🔄 Atualizar", "logs"), B.callback("⬅️ Voltar", "painel")]]) });
});
acao("config", (ctx, id) => {
    const cfg = lerCfg(id);
    return mostrar(ctx, { texto: `${TITULO}\n\n⚙️ <b>CONFIGURAR MEU BOT</b>\n\n🏷 Nome: <b>${esc(cfg.BOT_NAME || "Mikasa Bot")}</b>\n🔣 Prefixo: <code>${esc(cfg.PREFIX || prefixoPadrao())}</code>\n\n<i>Ao mudar, o bot reinicia sozinho.</i>`,
        tec: Markup.inlineKeyboard([[B.callback("🏷 Mudar nome", "cfg_nome"), B.callback("🔣 Mudar prefixo", "cfg_prefixo")], [B.callback("⬅️ Voltar", "painel")]]) });
});
for (const t of ["nome", "prefixo"]) acao("cfg_" + t, (ctx, id) => { aguardando.set(id, t); return mostrar(ctx, telaPedido(t)); });

acao("trocar", (ctx, id) => { if (!temAcesso(id)) return semPlano(ctx, id); aguardando.set(id, "trocar"); return mostrar(ctx, telaPedido("trocar")); });
acao("novocodigo", async (ctx, id) => {
    if (!temAcesso(id)) return semPlano(ctx, id);
    await progresso(id, "Gerando novo código", ["Parando o bot…", "Apagando a sessão antiga…"], 600);
    desligar(id); await esperar(2500);
    fs.rmSync(path.join(pastaDe(id), "auth_info"), { recursive: true, force: true });
    acaoLigar(id, "Gerando novo código");
});
acao("sessao", (ctx) => mostrar(ctx, telaConfirmar("🚪 <b>APAGAR SESSÃO</b>", "Isso desconecta o bot do seu WhatsApp. Seus dados e configurações <b>ficam</b>.", "sessao_sim")));
acao("sessao_sim", async (ctx, id) => {
    await progresso(id, "Apagando a sessão", ["Parando o bot…", "Desconectando…", "Apagando…"], 600);
    desligar(id); await esperar(2500);
    fs.rmSync(path.join(pastaDe(id), "auth_info"), { recursive: true, force: true });
    mostrar(ctx, telaPainel(id, "🚪 <b>Sessão apagada.</b>\nToque em <b>Ligar</b> para conectar de novo (gera um código novo)."));
});
acao("apagar", (ctx) => mostrar(ctx, telaConfirmar("🗑 <b>APAGAR MEU BOT</b>", "⚠️ Apaga a sessão, os dados e a pasta do seu bot. <b>Não tem volta.</b>", "apagar_sim")));
acao("apagar_sim", async (ctx, id) => {
    await progresso(id, "Apagando seu bot", ["Parando o bot…", "Apagando dados…", "Limpando…"], 600);
    desligar(id); await esperar(2500);
    fs.rmSync(pastaDe(id), { recursive: true, force: true }); delete estado[id]; procs.delete(id); salvar();
    mostrar(ctx, telaPainel(id));
});

// ── admin ──
bot.command("admin", ctx => {
    apagarMsg(ctx); if (!ehAdmin(ctx.from.id)) return;
    const l = Object.entries(estado).map(([id, r]) => `${ICONE[statusDe(id)] || "⚪"} ${id} • +${r.numero}`);
    let corpo = l.slice(0, 14).join("\n"); if (l.length > 14) corpo += `\n… e mais ${l.length - 14}`;
    mostrar(ctx, { texto: `${TITULO}\n\n👑 <b>ADMIN</b> — ${l.length}/${MAX} bots\n\n<pre>${esc(corpo || "Nenhum bot ainda.")}</pre>\n/parar &lt;id&gt;  •  /iniciar &lt;id&gt;`, tec: tecVoltar("⬅️ Painel") });
});
bot.command("parar", ctx => { apagarMsg(ctx); if (!ehAdmin(ctx.from.id)) return; const id = ctx.message.text.split(/\s+/)[1]; if (estado[id]) { desligar(id); mostrar(ctx, { texto: `${TITULO}\n\n⏹ Bot <code>${esc(id)}</code> desligado.`, tec: tecVoltar("⬅️ Painel") }); } });
bot.command("iniciar", ctx => { apagarMsg(ctx); if (!ehAdmin(ctx.from.id)) return; const id = ctx.message.text.split(/\s+/)[1]; if (estado[id]) { estado[id].ligado = true; salvar(); ligar(id); mostrar(ctx, { texto: `${TITULO}\n\n▶️ Bot <code>${esc(id)}</code> iniciado.`, tec: tecVoltar("⬅️ Painel") }); } });

bot.command("dar", ctx => {
    apagarMsg(ctx); if (!ehAdmin(ctx.from.id)) return;
    const [, alvo, dias] = ctx.message.text.split(/\s+/);
    if (!alvo || !(parseInt(dias) > 0)) return mostrar(ctx, { texto: `${TITULO}\n\nUso: <code>/dar ID DIAS</code>`, tec: tecVoltar("⬅️ Painel") });
    const ate = conceder(String(alvo), parseInt(dias), null);
    bot.telegram.sendMessage(alvo, `🎁 Você ganhou <b>${parseInt(dias)} dias</b> de plano! Vale até <b>${dataBR(ate)}</b>. Mande /start.`, { parse_mode: "HTML" }).catch(() => {});
    mostrar(ctx, { texto: `${TITULO}\n\n🎁 <code>${esc(alvo)}</code> ganhou ${parseInt(dias)} dias (até ${dataBR(ate)}).`, tec: tecVoltar("⬅️ Painel") });
});

// ⏰ vencimento: desliga quem venceu e avisa 3 dias antes
setInterval(() => {
    for (const id of Object.keys(estado)) {
        if (!temAcesso(id)) {
            if (estado[id].ligado || procs.get(id)?.child) { desligar(id); const t = telaPlanos(id, "⛔ <b>Seu plano venceu</b> e o bot foi desligado.\nRenove para ele voltar a funcionar."); enviar(id, t.texto, t.tec); }
        } else if (CONFIG.COBRAR && !ehAdmin(id) && diasRestantes(id) <= 3 && assin[id].avisoEm !== dataBR(Date.now()) && !aguardando.has(id) && !procs.get(id)?.barra) {
            assin[id].avisoEm = dataBR(Date.now()); salvarAssin();
            const t = telaPainel(id, `⏰ <b>Seu plano vence em ${diasRestantes(id)} dia(s)!</b> Toque em <b>Plano</b> para renovar.`); enviar(id, t.texto, t.tec);
        }
    }
}, 60000);

bot.catch(e => console.error("Erro no painel:", e.message));
if (require.main === module) { process.on("uncaughtException", e => console.error("⚠️ erro contido:", e)); process.on("unhandledRejection", e => console.error("⚠️ promessa contida:", e)); }
// 📡 Telegram: se cair a internet/conflito (409), tenta de novo sozinho — o painel NUNCA fica parado
let tentativasTg = 0;
function iniciarTelegram() {
    bot.launch({ dropPendingUpdates: false }).catch(e => {
        tentativasTg++; const espera = Math.min(60000, 5000 * tentativasTg);
        console.error(`⚠️ Painel Telegram caiu (${e.message}). Tentando de novo em ${Math.round(espera / 1000)}s…`);
        setTimeout(iniciarTelegram, espera);
    });
}
iniciarTelegram();
console.log("✅ Painel no ar.");
// não depende de o launch() terminar: já religa quem estava ligado e está em dia, e volta a vigiar Pix pendentes
setTimeout(() => {
    for (const id of Object.keys(estado)) if (estado[id].ligado && temAcesso(id)) ligar(id);
    for (const pid of Object.keys(pendentes)) vigiar(pid);
}, 1500);
const sair = () => { for (const [, i] of procs) { i.parando = true; i.child?.kill("SIGTERM"); } try { bot.stop(); } catch {} setTimeout(() => sairDeVerdade(0), 1500); };
process.once("SIGINT", sair); process.once("SIGTERM", sair);
