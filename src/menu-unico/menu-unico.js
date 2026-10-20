/* =================================================
   📋 MIKASA BOT — MENU ÚNICO
   REGRA: todo menu aparece com UM botão só ("VER TUDO"). Ao tocar, abre a
   lista (com seções = lista dentro de lista) e a pessoa escolhe só o que
   quer executar. Nada de mensagem nova com outro botão no meio do caminho.
   Cada menu sai com o SEU card (jornal + foto do bot + emblema do tema).
================================================= */
const config = require("../../config");

// ───────────── TEMAS (um card para cada menu) ─────────────
const TEMAS = {
    admin:        { chave: "admin", titulo: "🛡️ MENU ADMIN", icone: "escudo", cor: "#1d4ed8", carimbo: "ADMIN", manchete: "SÓ ADMIN ENTRA", subtitulo: "Ferramentas para manter o grupo em ordem", area: "Administração", acesso: "Administradores", frase: "“Quem manda no grupo usa estes comandos.”", faixa: "ÁREA EXCLUSIVA DOS ADMINISTRADORES", edicao: "EDIÇÃO DOS ADMINS" },
    dono:         { chave: "dono", titulo: "👑 MENU DO DONO", icone: "coroa", cor: "#a16207", carimbo: "DONO", manchete: "COFRE DO DONO", subtitulo: "Comandos que só o chefe pode usar", area: "Controle total", acesso: "Dono do bot", frase: "“Aqui só entra quem manda no bot.”", faixa: "ÁREA EXCLUSIVA DO DONO", edicao: "EDIÇÃO DO DONO" },
    gold:         { chave: "gold", titulo: "💰 MENU GOLD", icone: "moeda", cor: "#b45309", carimbo: "GOLD", manchete: "BANCO DO GOLD", subtitulo: "Ganhe, gaste, roube e suba no ranking", area: "Economia", acesso: "Todos", frase: "“1000 Gold = 1 Premium.”", faixa: "ECONOMIA DO GRUPO EM ALTA", edicao: "EDIÇÃO ECONÔMICA" },
    midias:       { chave: "midias", titulo: "🎵 MENU DE MÍDIAS", icone: "play", cor: "#7c3aed", carimbo: "MÍDIA", manchete: "CENTRAL DE MÍDIAS", subtitulo: "Músicas, vídeos, figurinhas e conversões", area: "Mídias", acesso: "Todos", frase: "“Peça o que quiser e eu entrego.”", faixa: "MÚSICA, VÍDEO E FIGURINHA", edicao: "EDIÇÃO MULTIMÍDIA" },
    musicas:      { chave: "musicas", titulo: "🎵 MÚSICAS", icone: "nota", cor: "#7c3aed", carimbo: "MÚSICA", manchete: "HORA DA MÚSICA", subtitulo: "Baixe, converta e crie do seu jeito", area: "Músicas e mídias", acesso: "Todos", frase: "“Toque em VER TUDO e peça.”", faixa: "MÚSICA, VÍDEO E FIGURINHA", edicao: "EDIÇÃO MUSICAL" },
    brincadeiras: { chave: "brincadeiras", titulo: "🎮 BRINCADEIRAS", icone: "dado", cor: "#15803d", carimbo: "JOGO", manchete: "HORA DA RESENHA", subtitulo: "Jogos, interações e diversão no grupo", area: "Brincadeiras", acesso: "Todos", frase: "“Quem não joga, não ganha.”", faixa: "DIVERSÃO LIBERADA", edicao: "EDIÇÃO DA RESENHA" },
    premium:      { chave: "premium", titulo: "⭐ MENU PREMIUM", icone: "estrela", cor: "#be185d", carimbo: "VIP", manchete: "CLUBE PREMIUM", subtitulo: "Recursos exclusivos para quem quer mais", area: "Premium", acesso: "Todos", frase: "“Sem anúncios, com prioridade.”", faixa: "ALUGUE O BOT NO SEU GRUPO", edicao: "EDIÇÃO VIP" },
    membros:      { chave: "membros", titulo: "👤 MEMBROS", icone: "pessoa", cor: "#0e7490", carimbo: "MEMBRO", manchete: "ÁREA DOS MEMBROS", subtitulo: "Seu perfil, registro e informações", area: "Membros", acesso: "Todos", frase: "“Registre-se e apareça no ranking.”", faixa: "FEITO PARA OS MEMBROS", edicao: "EDIÇÃO DOS MEMBROS" },
    economia:     { chave: "economia", titulo: "💰 ECONOMIA", icone: "moeda", cor: "#b45309", carimbo: "GOLD", manchete: "BANCO DO GOLD", subtitulo: "Ganhe, gaste, roube e suba no ranking", area: "Economia", acesso: "Todos", frase: "“Trabalhe, junte e gaste.”", faixa: "ECONOMIA DO GRUPO EM ALTA", edicao: "EDIÇÃO ECONÔMICA" },
    ferramentas:  { chave: "ferramentas", titulo: "🛠️ FERRAMENTAS", icone: "engrenagem", cor: "#475569", carimbo: "ÚTIL", manchete: "CAIXA DE FERRAMENTAS", subtitulo: "Utilidades e configurações do bot", area: "Ferramentas", acesso: "Todos", frase: "“Para tudo tem uma ferramenta.”", faixa: "FERRAMENTAS PARA O DIA A DIA", edicao: "EDIÇÃO TÉCNICA" },
    infos:        { chave: "infos", titulo: "📚 INFOS", icone: "info", cor: "#0369a1", carimbo: "INFO", manchete: "PLANTÃO DE INFOS", subtitulo: "Rankings, tabelas e notícias", area: "Informações", acesso: "Todos", frase: "“Fique por dentro de tudo.”", faixa: "INFORMAÇÃO EM PRIMEIRA MÃO", edicao: "EDIÇÃO INFORMATIVA" },
    comandos:     { chave: "comandos", titulo: "⚡ COMANDOS", icone: "raio", cor: "#c2410c", carimbo: "RÁPIDO", manchete: "COMANDOS NA HORA", subtitulo: "Os atalhos mais usados", area: "Comandos", acesso: "Todos", frase: "“Um toque e já está pronto.”", faixa: "RÁPIDO, FÁCIL E PRÁTICO", edicao: "EDIÇÃO RELÂMPAGO" },
    moderacao:    { chave: "moderacao", titulo: "🛡️ MODERAÇÃO", icone: "escudo", cor: "#b91c1c", carimbo: "ORDEM", manchete: "LEI E ORDEM", subtitulo: "Moderação avançada do grupo", area: "Moderação", acesso: "Administradores", frase: "“Regras são para todos.”", faixa: "MODERAÇÃO EM AÇÃO", edicao: "EDIÇÃO DA ORDEM" },
    controle:     { chave: "controle", titulo: "🔌 LIGAR / DESLIGAR", icone: "power", cor: "#b91c1c", carimbo: "POWER", manchete: "PAINEL DE ENERGIA", subtitulo: "Ligue ou desligue com um toque", area: "Controle do bot", acesso: "Dono do bot", frase: "“Escolheu, executou.”", faixa: "CONTROLE DO BOT", edicao: "EDIÇÃO DE CONTROLE" }
};

// categoria do menu principal → tema
function temaDaCategoria(nome) {
    const n = String(nome || "").toUpperCase();
    if (n.includes("ADMIN")) return TEMAS.admin;
    if (n.includes("DONO")) return TEMAS.dono;
    if (n.includes("BRINCADEIRA")) return TEMAS.brincadeiras;
    if (n.includes("ECONOMIA") || n.includes("GOLD")) return TEMAS.economia;
    if (n.includes("MÚSICA") || n.includes("MUSICA")) return TEMAS.musicas;
    if (n.includes("MEMBRO")) return TEMAS.membros;
    if (n.includes("FERRAMENTA")) return TEMAS.ferramentas;
    if (n.includes("INFO")) return TEMAS.infos;
    if (n.includes("MODERA")) return TEMAS.moderacao;
    if (n.includes("COMANDO")) return TEMAS.comandos;
    return { ...TEMAS.comandos, titulo: nome };
}

// descrições curtas (aparecem embaixo do nome de cada opção)
const DESC = {
    resumo: "Resumo do grupo.", atividades: "Atividade dos membros.", top10: "Top 10 do grupo.", rankativo: "Quem mais fala.", tempo: "Clima de uma cidade.", relatorio: "Relatório do grupo.",
    ban: "Remover e banir alguém.", kick: "Remover alguém do grupo.", promover: "Tornar administrador.", rebaixar: "Tirar de administrador.", aviso: "Mandar aviso no grupo.", marcar: "Marcar todo mundo.", hidetag: "Marcar sem mostrar.", citar: "Citar mensagem.", sair: "Bot sai do grupo.", abrir: "Liberar mensagens.", fechar: "Só admins falam.", fixar: "Fixar mensagem.",
    antilink: "Liga/desliga bloqueio de links.", antinota: "Liga/desliga bloqueio de nota de voz.", antiloc: "Liga/desliga bloqueio de localização.", antidoc: "Liga/desliga bloqueio de documento.", antifake: "Liga/desliga bloqueio de números fake.", antipalavrao: "Liga/desliga filtro de palavrão.", antiamor: "Liga/desliga o anti-amor.", antinsfw: "Liga/desliga bloqueio de conteúdo +18.",
    bemvindo: "Mensagem de boas-vindas.", aceitar: "Aceitar pedidos de entrada.", mencao: "Configurar menções.", saudacao: "Saudações automáticas.", blacklist: "Lista negra do grupo.", lista: "Ver a lista negra.", limparbot: "Limpar mensagens do bot.", ativar: "Ativar recursos.", add: "Adicionar alguém.", tirarlista: "Tirar da lista negra.", logban: "Histórico de banidos.", modulos: "Ver módulos do bot.",
    play: "Pesquisar e baixar música ou vídeo.", s: "Criar figurinha.", attp: "Texto vira figurinha piscando (cores sorteadas).", attp2: "Texto em figurinha arco-íris.", attp3: "Texto em figurinha neon pulsante.", attp4: "Texto em figurinha digitando.", attp5: "Texto em figurinha onda.", sf: "Figurinha sem fundo (apaga fundo preto/branco).", gif: "Figurinha para GIF.", toimg: "Figurinha para imagem.", f: "Figurinha para GIF.",
    saldo: "Ver seu saldo.", roubar: "Roubar Gold de alguém.", loja: "Comprar itens.", gastar: "Gastar Gold.", duelo: "Apostar Gold em duelo.", resgatar: "Resgatar token.", rank: "Ver o ranking.", perfil: "Ver seu perfil.",
    forca: "Jogo da forca.", adivinha: "Jogo de adivinhar.", quiz: "Perguntas e respostas.", roleta: "Roleta da sorte.", jogodavelha: "Jogo da velha.",
    configurar: "Abrir configuração do bot.", "configurar-bot": "Abrir o painel de configuração do bot.", restart: "Reiniciar o bot.", broadcast: "Mandar mensagem para todos os grupos.", backup: "Fazer backup.", boot: "Conversar com o bot.", alugar: "Planos de aluguel do bot.", alugarbot: "Planos de aluguel do bot.", meualuguel: "Ver o seu aluguel."
};

function _mb() { return require("../menuBotoes/menuBotoes"); }
const _validos = () => new Set(_mb().extrairComandosDoBot());

function _desc(c) {
    return DESC[c] || (typeof _mb().descricaoComando === "function" ? _mb().descricaoComando(c) : `Executar ${config.PREFIX}${c}`);
}
function _rowCmd(c) { return _mb().linhaLista(`cmd:${c}`, `${config.PREFIX}${c}`, _desc(c)); }

// monta seções a partir de definições [{ titulo, comandos:[...] }], só com comandos que existem
function secoesDe(defs, { sobras = [] } = {}) {
    const validos = _validos();
    const usados = new Set();
    const out = [];
    for (const d of defs) {
        const rows = [];
        for (const r of d.linhas || []) rows.push(r); // linhas prontas (ex.: ligar/desligar)
        for (const c of d.comandos || []) {
            if (validos.has(c) && !usados.has(c)) { usados.add(c); rows.push(_rowCmd(c)); }
        }
        if (rows.length) out.push({ title: d.titulo.slice(0, 24), rows });
    }
    const resto = sobras.filter(c => validos.has(c) && !usados.has(c));
    if (resto.length) out.push({ title: "➕ MAIS OPÇÕES", rows: resto.map(_rowCmd) });
    return out;
}

const linhaLigarBrincadeiras = () => [
    _mb().linhaLista("brincadeiras_ligar", "🟢 LIGAR BRINCADEIRAS", "Liberar os comandos de brincadeira."),
    _mb().linhaLista("brincadeiras_desligar", "🔴 DESLIGAR BRINCADEIRAS", "Bloquear os comandos de brincadeira.")
];

// ───────────── DEFINIÇÕES DE CADA MENU ─────────────
function definicao(chave) {
    const M = _mb();
    const cats = M.montarCategorias();
    switch (chave) {
        case "admin":
            return { tema: TEMAS.admin, secoes: secoesDe([
                { titulo: "📊 RESUMO E ATIVIDADE", comandos: ["resumo", "atividades", "top10", "rankativo", "tempo", "relatorio", "relatoriodiario"] },
                { titulo: "⚔️ GRUPO", comandos: ["ban", "kick", "promover", "rebaixar", "aviso", "marcar", "hidetag", "citar", "sair", "abrir", "fechar", "fixar", "add"] },
                { titulo: "🔒 SEGURANÇA", comandos: ["antilink", "antinota", "antiloc", "antidoc", "antifake", "antipalavrao", "antiamor", "antinsfw", "antinudes", "autoban"] },
                { titulo: "🤝 BOAS-VINDAS", comandos: ["bemvindo", "aceitar", "mencao", "saudacao", "regras", "convite"] },
                { titulo: "🚫 LISTAS E PUNIÇÕES", comandos: ["warn", "unwarn", "mute", "unmute", "blacklist", "lista", "tirarlista", "logban", "limparbot"] }
            ], { sobras: cats["🛡️ ADMIN"] || [] }) };
        case "dono":
            return { tema: TEMAS.dono, secoes: secoesDe([
                { titulo: "🔌 CONTROLE DO BOT", linhas: [
                    M.linhaLista("ctl:ligar", "🟢 LIGAR O BOT", "Volta a atender os comandos."),
                    M.linhaLista("ctl:desligar", "🔴 DESLIGAR O BOT", "Para de responder até ligar de novo.") ],
                  comandos: ["restart", "backup", "boot", "broadcast"] },
                { titulo: "⚙️ CONFIGURAÇÕES", comandos: ["configurar-bot", "ativar", "ia", "x9", "viewonce", "configaniversario", "modulos"] },
                { titulo: "🏘️ ALUGUEL", comandos: ["alugar", "alugarbot", "meualuguel"] },
                { titulo: "💻 MÍDIA E FERRAMENTAS", comandos: ["play", "s", "gif", "toimg"] },
                { titulo: "💰 ECONOMIA", comandos: ["saldo", "roubar", "loja", "gastar"] },
                { titulo: "🎮 JOGOS", comandos: ["forca", "adivinha", "quiz", "duelo", "roleta"] }
            ], { sobras: (cats["👑 DONO"] || []).filter(c => !["ligar", "desligar"].includes(c)) }) };
        case "gold":
            return { tema: TEMAS.gold, secoes: secoesDe([
                { titulo: "💸 ECONOMIA E MOEDAS", comandos: ["saldo", "gold", "checkin", "daily", "trabalhar", "roubar", "loja", "duelo", "resgatar", "bonus", "transferir", "depositar", "sacar", "extrato", "inventario", "presente"] },
                { titulo: "🏆 RANKING", comandos: ["rank", "perfil", "topgold", "topxp", "xp", "nivel"] }
            ]) };
        case "midias":
            return { tema: TEMAS.midias, secoes: secoesDe([
                { titulo: "🎶 MÚSICA E ÁUDIO", comandos: ["play", "musica-aleatoria", "dvcl-yt", "tomp3", "gtts", "voz"] },
                { titulo: "🎬 VÍDEOS POR LINK", comandos: ["video", "tiktok", "instagram", "kwai", "pinterest", "mediafire"] },
                { titulo: "🖼️ FIGURINHA/CONVERSÃO", comandos: ["s", "attp", "attp2", "attp3", "attp4", "attp5", "sf", "addfigurinha", "gif", "toimg", "artenome", "artenomegif", "meme"] }
            ], { sobras: cats["🎵 MÚSICAS"] || [] }) };
        case "brincadeiras": {
            let st = "";
            try { st = `Status: ${require("../brincadeiras-control/brincadeiras-control").status()}\n\n`; } catch {}
            return { tema: TEMAS.brincadeiras, texto: st, secoes: secoesDe([
                { titulo: "🔌 LIGAR / DESLIGAR", linhas: linhaLigarBrincadeiras() },
                { titulo: "🎲 INTERAÇÕES", comandos: ["tapa", "matar", "beijar", "abracar", "chute", "amizade", "compatibilidade", "dupla"] },
                { titulo: "💞 RELACIONAMENTOS", comandos: ["casal", "familia", "familias", "casamento", "meucasal", "divorcio", "topcasais"] },
                { titulo: "🎮 JOGOS", comandos: ["forca", "adivinha", "quiz", "jogodavelha", "aleatory", "roleta", "sortear", "signo", "enquete"] },
                { titulo: "🎯 MISSÕES E XP", comandos: ["missao", "missoes", "conquistas", "xp", "nivel", "topxp"] }
            ], { sobras: cats["🎮 BRINCADEIRAS"] || [] }) };
        }
        case "premium":
            return { tema: TEMAS.premium, secoes: secoesDe([
                { titulo: "⭐ PREMIUM E ALUGUEL", comandos: ["alugarbot", "meualuguel", "alugar"], linhas: [M.linhaLista("vip_planos", "🏘️ VER PLANOS", "Alugue o bot para o seu grupo.")] }
            ]) };
        case "controle":
            return { tema: TEMAS.controle, secoes: [{ title: "🔌 ESCOLHA", rows: [
                M.linhaLista("ctl:ligar", "🟢 LIGAR O BOT", "Volta a atender os comandos."),
                M.linhaLista("ctl:desligar", "🔴 DESLIGAR O BOT", "Para de responder até ligar de novo.") ] }] };
        default:
            return null;
    }
}


// 📋 LISTA DE UMA CATEGORIA (usada no menu principal: cada categoria é um botão que abre a SUA lista)
// Se a categoria tem grupos (ex.: Música / Vídeos / Figurinhas) eles viram seções dentro da lista.
function _partir(secoes) {
    const out = [];
    for (const sc of secoes) {
        const n = Math.ceil(sc.rows.length / 10);
        for (let k = 0; k < n; k++) out.push({ title: (n > 1 ? `${sc.title.slice(0, 20)} ${k + 1}/${n}` : sc.title).slice(0, 24), rows: sc.rows.slice(k * 10, k * 10 + 10) });
    }
    return out;
}
function secoesDaCategoria(nome) {
    const M = _mb();
    const tema = temaDaCategoria(nome);
    const mapa = { musicas: "midias", admin: "admin", dono: "dono", brincadeiras: "brincadeiras" };
    let secs = null;
    if (mapa[tema.chave]) { try { const d = definicao(mapa[tema.chave]); if (d && d.secoes && d.secoes.length) secs = d.secoes; } catch {} }
    if (!secs) {
        const cats = M.montarCategorias();
        const rows = [];
        if (tema.chave === "ferramentas") rows.push(M.linhaLista("cmd:configurar-bot", "⚙️ CONFIGURAÇÕES", "Abrir o painel de configuração do bot."));
        for (const c of (cats[nome] || [])) { if (tema.chave === "ferramentas" && c === "configurar-bot") continue; rows.push(_rowCmd(c)); }
        secs = rows.length ? [{ title: nome.slice(0, 24), rows }] : [];
    }
    // "MAIS OPÇÕES" solto não diz de qual categoria é → leva o nome da categoria
    const nomeCurto = String(nome).replace(/[^\p{L}\p{N}\s]/gu, "").trim();
    secs = secs.map(sc => /MAIS OPÇÕES/.test(sc.title) ? { ...sc, title: `➕ ${nomeCurto} (MAIS)`.slice(0, 24) } : sc);
    return _partir(secs);
}

// 🖼️ foto do bot (sempre IMAGEM: se a foto configurada for vídeo/GIF, usa o menu.png)
function fotoDoBot() {
    const fs = require("fs"), path = require("path");
    const ehImagem = b => b && b.length > 12 && ((b[0] === 0x89 && b[1] === 0x50) || (b[0] === 0xff && b[1] === 0xd8) || b.toString("ascii", 0, 4) === "RIFF");
    // sempre a arte da Mikasa que vai junto no projeto (não puxa mais foto antiga salva na configuração)
    const candidatos = [];
    candidatos.push(path.join(__dirname, "../midias/imagens/menu.png"), path.join(__dirname, "../midias/imagens/fundo.png"));
    for (const c of candidatos) {
        try { if (c && fs.existsSync(c)) { const b = fs.readFileSync(c); if (ehImagem(b)) return b; } } catch {}
    }
    return null;
}

// ───────────── ENVIO ─────────────
async function enviarMenuTema(sock, jid, msg, { tema, secoes, texto = "" }) {
    const M = _mb();
    const total = secoes.reduce((n, s) => n + s.rows.length, 0);
    let midia = {};
    try {
        const { criarCardMenuTema } = require("../cardGenerator/cardGenerator");
        const db = M.lerBotConfigAtual ? M.lerBotConfigAtual() : {};
        const imageBuffer = await criarCardMenuTema({
            tema,
            botName: db.BOT_NAME || config.BOT_NAME || "Mikasa Bot",
            ownerName: db.OWNER_NAME || config.OWNER_NAME || "",
            prefix: db.PREFIX || config.PREFIX || "/",
            total,
            amostra: secoes.flatMap(s => s.rows).map(r => String(r.id || "")).filter(id => id.startsWith("cmd:")).map(id => id.slice(4)).slice(0, 6),
            secoesTitulos: secoes.map(x => x.title),
            fotoBuffer: fotoDoBot()
        });
        midia = { imageBuffer };
    } catch (e) {
        console.error("⚠️ Card do menu falhou, enviando sem imagem:", e?.message || e);
    }
    // 🔘 UM botão só: o próprio "VER TUDO" (a lista abre ao tocar)
    return M.enviarNativeFlow(sock, jid, {
        text: `〔 ${tema.titulo} 〕\n\n${texto}Toque em *VER TUDO* e escolha o que executar.`,
        footer: "👑 ᴅᴏᴄᴛᴏʀ ᴠᴀʟᴇʏᴀʀᴅ",
        quoted: msg,
        ...midia,
        buttons: [M.botaoLista("📋 VER TUDO", secoes)]
    });
}

async function abrirMenu(sock, jid, msg, chave) {
    const def = definicao(chave);
    if (!def) return null;
    return enviarMenuTema(sock, jid, msg, def);
}

// categoria do menu principal (cat:) → mesma regra: 1 botão, card próprio
async function abrirCategoria(sock, jid, msg, nome, comandosExtra) {
    const M = _mb();
    const tema = temaDaCategoria(nome);
    if (tema.chave === "brincadeiras") return abrirMenu(sock, jid, msg, "brincadeiras");
    if (tema.chave === "admin") return abrirMenu(sock, jid, msg, "admin");
    if (tema.chave === "dono") return abrirMenu(sock, jid, msg, "dono");
    const cats = M.montarCategorias();
    const rows = [];
    if (tema.chave === "ferramentas") rows.push(M.linhaLista("cmd:configurar-bot", "⚙️ CONFIGURAÇÕES", "Abrir o painel de configuração do bot."));
    for (const c of (cats[nome] || comandosExtra || [])) {
        if (tema.chave === "ferramentas" && c === "configurar-bot") continue;
        rows.push(_rowCmd(c));
    }
    if (!rows.length) return M.enviarNativeFlow(sock, jid, { text: `〔 ${nome} 〕\n\nSem opções por aqui ainda.`, footer: "👑 ᴅᴏᴄᴛᴏʀ ᴠᴀʟᴇʏᴀʀᴅ", quoted: msg, buttons: [M.botaoLista("📋 VER TUDO", [{ title: nome.slice(0, 24), rows: [M.linhaLista("menu_home", "🏠 VOLTAR AO MENU", "Abrir o menu principal.")] }])] });
    // lista grande vira seções de até 10 (continua UM botão só)
    const secoes = [];
    for (let i = 0; i < rows.length; i += 10) secoes.push({ title: (i ? `${nome} (${Math.floor(i / 10) + 1})` : nome).slice(0, 24), rows: rows.slice(i, i + 10) });
    return enviarMenuTema(sock, jid, msg, { tema: { ...tema, titulo: nome }, secoes });
}

module.exports = { TEMAS, temaDaCategoria, fotoDoBot, secoesDaCategoria, abrirMenu, abrirCategoria, enviarMenuTema, secoesDe, definicao };
