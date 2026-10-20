/* =================================================
   🗑️ MIKASA BOT — GERENCIAR MÍDIA (APAGAR ÁUDIO / GIF)
   📁 Arquivo: gerenciar-midia.js
   👑 DOCTOR VALEYARD

   Apaga áudios e GIFs direto pelo WhatsApp, sem abrir arquivo nenhum:

     Configurações → 🗑️ APAGAR GIF / 🗑️ APAGAR ÁUDIO
       → escolhe a categoria
       → vê a lista dos arquivos (mais novos primeiro)
       → toca no arquivo: o bot MANDA ELE de volta (prévia) para você
         conferir e pergunta se quer mesmo apagar
       → confirma e o arquivo é removido

   Também aparece um botão "🗑️ APAGAR ESTE" logo depois de subir um
   áudio/GIF, para desfazer na hora quando subir na categoria errada.

   🔒 Segurança
   ✅ Só admin do grupo (ou o dono, no privado) pode apagar
   ✅ Só apaga arquivo que realmente está na lista da categoria
      (nome vindo do botão nunca vira caminho livre no disco)
   ✅ Sempre pede confirmação antes de apagar
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const { enviarListaWhatsApp, enviarBotoesNavegacao } = require("../menuBotoes/menuBotoes");
const { ehDono } = require("../utils-validacao/utils-validacao");

// =================================================
// 📂 TIPOS E CATEGORIAS (iguais às do "subir")
// =================================================

const TIPOS = {
    gif: {
        nome: "GIF",
        plural: "GIFs",
        emoji: "🎬",
        pasta: path.join(__dirname, "../midias/gifs"),
        extensoes: /\.(mp4|gif)$/i,
        categorias: [
            { id: "matar", titulo: "💀 MATAR" },
            { id: "tapa", titulo: "🖐️ TAPA" },
            { id: "chute", titulo: "🦵 CHUTE" },
            { id: "beijar", titulo: "💋 BEIJAR" },
            { id: "abracar", titulo: "🫂 ABRAÇAR" }
        ],
        aviso: "Quando a categoria fica sem GIF, o comando responde só com o texto (ou com o vídeo padrão, se existir)."
    },
    audio: {
        nome: "ÁUDIO",
        plural: "áudios",
        emoji: "🎵",
        pasta: path.join(__dirname, "../midias/audios"),
        extensoes: /\.(mp3|ogg|m4a|opus|wav)$/i,
        categorias: [
            { id: "menu", titulo: "🏠 MENU" },
            { id: "menupv", titulo: "💬 MENU PV" },
            { id: "entrada", titulo: "🟢 ENTRADA" },
            { id: "saida", titulo: "🔴 SAÍDA" },
            { id: "prefixo", titulo: "🔑 PREFIXO" },
            { id: "bomdia", titulo: "🌅 BOM DIA" },
            { id: "boatarde", titulo: "☀️ BOA TARDE" },
            { id: "boanoite", titulo: "🌙 BOA NOITE" },
            { id: "antiamor", titulo: "💘 ANTI-AMOR" }
        ],
        aviso: "Quando a categoria fica sem áudio, o bot simplesmente não manda áudio nessa situação."
    }
};

const ITENS_POR_PAGINA = 8; // + "anterior" + "próxima" = 10 linhas (limite da lista)

// =================================================
// 🔧 UTILITÁRIOS
// =================================================

function tipoValido(tipo) {
    return Object.prototype.hasOwnProperty.call(TIPOS, tipo) ? TIPOS[tipo] : null;
}

function categoriaValida(tipo, categoria) {
    const t = tipoValido(tipo);
    return t ? t.categorias.find(c => c.id === categoria) || null : null;
}

function pastaDaCategoria(tipo, categoria) {
    return path.join(TIPOS[tipo].pasta, categoria);
}

// Arquivos da categoria, do mais novo para o mais antigo.
function listarArquivos(tipo, categoria) {
    const t = tipoValido(tipo);
    if (!t || !categoriaValida(tipo, categoria)) return [];
    const pasta = pastaDaCategoria(tipo, categoria);
    let nomes = [];
    try {
        nomes = fs.readdirSync(pasta).filter(n => t.extensoes.test(n));
    } catch {
        return [];
    }
    return nomes
        .map(nome => {
            let stat = null;
            try { stat = fs.statSync(path.join(pasta, nome)); } catch {}
            return { nome, tamanho: stat?.size || 0, data: stat?.mtimeMs || 0 };
        })
        .sort((a, b) => b.data - a.data || a.nome.localeCompare(b.nome));
}

// Só devolve o caminho se o nome estiver MESMO na lista da categoria.
function resolverArquivo(tipo, categoria, nome) {
    if (!nome || nome !== path.basename(nome)) return null;
    const existe = listarArquivos(tipo, categoria).some(a => a.nome === nome);
    if (!existe) return null;
    const pasta = pastaDaCategoria(tipo, categoria);
    const caminho = path.join(pasta, nome);
    if (path.dirname(caminho) !== pasta) return null;
    return caminho;
}

function formatarTamanho(bytes) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatarData(ms) {
    if (!ms) return "";
    try {
        return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
    } catch {
        return "";
    }
}

function codificar(nome) {
    return encodeURIComponent(nome);
}

function decodificar(texto) {
    try { return decodeURIComponent(texto); } catch { return null; }
}

// =================================================
// 🔒 PERMISSÃO (mesma regra do .configurar-bot)
// =================================================

async function podeApagar(sock, msg) {
    const from = msg?.key?.remoteJid;
    const ehGrupo = String(from || "").endsWith("@g.us");
    // No grupo, "from" é o id do grupo (não é uma pessoa) — só entra no PV.
    const autores = [msg?.key?.participant, msg?.key?.participantAlt, ehGrupo ? null : from].filter(Boolean);
    const dono = ehDono(autores, config.OWNER_NUMBER);
    if (dono) return true;

    // No privado só o dono. Em grupo, admin também pode.
    if (!ehGrupo) return false;
    try {
        const { isAdmin } = require("../grupo/grupo");
        const autor = msg.key.participant || msg.key.participantAlt || from;
        return !!(await isAdmin(sock, from, autor));
    } catch {
        return false;
    }
}

// =================================================
// 📋 TELAS
// =================================================

// 1) Escolher a categoria
async function enviarCategorias(sock, from, tipo, msg) {
    const t = TIPOS[tipo];
    const rows = t.categorias.map(c => {
        const total = listarArquivos(tipo, c.id).length;
        return {
            id: `cfg_del_cat:${tipo}:${c.id}:0`,
            title: c.titulo.slice(0, 24),
            description: `${total} ${total === 1 ? t.nome.toLowerCase() : t.plural}`.slice(0, 72)
        };
    });

    return enviarListaWhatsApp(sock, from, {
        text: `〔 🗑️ APAGAR ${t.nome} 〕\n\nEscolha a categoria para ver os ${t.plural} que foram subidos.\n\n🔎 Você vai poder ouvir/ver o arquivo antes de apagar.`,
        title: `${t.emoji} CATEGORIAS`,
        sections: [{ title: "CATEGORIAS", rows }],
        quoted: msg
    });
}

// 2) Lista de arquivos da categoria (com páginas)
async function enviarArquivos(sock, from, tipo, categoria, pagina, msg) {
    const t = TIPOS[tipo];
    const cat = categoriaValida(tipo, categoria);
    const arquivos = listarArquivos(tipo, categoria);

    if (!arquivos.length) {
        return enviarBotoesNavegacao(sock, from, {
            text: `〔 📂 ${cat.titulo} 〕\n\nNenhum ${t.nome.toLowerCase()} salvo nessa categoria.`,
            footer: `${t.emoji} Gerenciador de ${t.plural} • MIKASA`,
            buttons: [{ id: `cfg_del_tipo:${tipo}`, text: "『 🔙 』 OUTRA CATEGORIA" }],
            quoted: msg
        });
    }

    const totalPaginas = Math.ceil(arquivos.length / ITENS_POR_PAGINA);
    const paginaAtual = Math.min(Math.max(Number(pagina) || 0, 0), totalPaginas - 1);
    const inicio = paginaAtual * ITENS_POR_PAGINA;
    const fatia = arquivos.slice(inicio, inicio + ITENS_POR_PAGINA);

    const rows = [];
    if (paginaAtual > 0) {
        rows.push({
            id: `cfg_del_cat:${tipo}:${categoria}:${paginaAtual - 1}`,
            title: "⬅️ PÁGINA ANTERIOR",
            description: `Voltar para a página ${paginaAtual}`
        });
    }
    fatia.forEach((a, i) => {
        rows.push({
            id: `cfg_del_arq:${tipo}:${categoria}:${codificar(a.nome)}`,
            title: `${inicio + i + 1}. ${a.nome}`.slice(0, 24),
            description: `${formatarTamanho(a.tamanho)}${a.data ? ` • ${formatarData(a.data)}` : ""} • ${a.nome}`.slice(0, 72)
        });
    });
    if (paginaAtual < totalPaginas - 1) {
        rows.push({
            id: `cfg_del_cat:${tipo}:${categoria}:${paginaAtual + 1}`,
            title: "➡️ PRÓXIMA PÁGINA",
            description: `Ir para a página ${paginaAtual + 2}`
        });
    }

    return enviarListaWhatsApp(sock, from, {
        text: `〔 🗑️ APAGAR ${t.nome} • ${cat.titulo} 〕\n\n📦 ${arquivos.length} ${arquivos.length === 1 ? t.nome.toLowerCase() : t.plural} nessa categoria (mais novos primeiro).\n📄 Página ${paginaAtual + 1}/${totalPaginas}\n\nToque em um para conferir e apagar.`,
        title: `${t.emoji} ESCOLHER ARQUIVO`,
        sections: [{ title: `${cat.titulo}`.slice(0, 24), rows }],
        quoted: msg
    });
}

// 3) Prévia + confirmação
async function enviarConfirmacao(sock, from, tipo, categoria, nome, msg) {
    const t = TIPOS[tipo];
    const cat = categoriaValida(tipo, categoria);
    const caminho = resolverArquivo(tipo, categoria, nome);

    if (!caminho) {
        return sock.sendMessage(from, {
            text: `⚠️ Esse ${t.nome.toLowerCase()} não existe mais (talvez já tenha sido apagado).`
        }, { quoted: msg });
    }

    // Prévia: manda o próprio arquivo para a pessoa conferir antes de apagar.
    try {
        const buffer = fs.readFileSync(caminho);
        if (tipo === "gif") {
            await sock.sendMessage(from, { video: buffer, gifPlayback: true, caption: `👀 Prévia: ${nome}` }, { quoted: msg });
        } else {
            const ext = path.extname(nome).toLowerCase();
            const mimetypes = { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg; codecs=opus", ".opus": "audio/ogg; codecs=opus" };
            await sock.sendMessage(from, { audio: buffer, mimetype: mimetypes[ext] || "audio/mpeg", ptt: false }, { quoted: msg });
        }
    } catch (erro) {
        console.error("⚠️ Não consegui mandar a prévia:", erro.message);
    }

    let tamanho = 0;
    try { tamanho = fs.statSync(caminho).size; } catch {}

    return enviarBotoesNavegacao(sock, from, {
        text: `〔 🗑️ CONFIRMAR EXCLUSÃO 〕\n\n${t.emoji} *${t.nome}*\n📂 Categoria: *${cat.id}*\n🏷️ Arquivo: \`${nome}\`\n📦 Tamanho: ${formatarTamanho(tamanho)}\n\n⚠️ Quer apagar esse arquivo? Isso não tem volta.`,
        footer: `${t.emoji} Gerenciador de ${t.plural} • MIKASA`,
        buttons: [
            { id: `cfg_del_ok:${tipo}:${categoria}:${codificar(nome)}`, text: "『 🗑️ 』 SIM, APAGAR" },
            { id: "cfg_del_no", text: "『 ↩️ 』 CANCELAR" }
        ],
        quoted: msg
    });
}

// 4) Apagar de verdade
async function apagarArquivo(sock, from, tipo, categoria, nome, msg) {
    const t = TIPOS[tipo];
    const caminho = resolverArquivo(tipo, categoria, nome);

    if (!caminho) {
        return sock.sendMessage(from, {
            text: `⚠️ Esse ${t.nome.toLowerCase()} não existe mais (talvez já tenha sido apagado).`
        }, { quoted: msg });
    }

    try {
        fs.unlinkSync(caminho);
    } catch (erro) {
        return sock.sendMessage(from, {
            text: `❌ Não consegui apagar:\n${erro.message}`
        }, { quoted: msg });
    }

    const restantes = listarArquivos(tipo, categoria).length;
    const aviso = restantes === 0 ? `\n\n⚠️ A categoria *${categoria}* ficou vazia.\n${t.aviso}` : "";

    return enviarBotoesNavegacao(sock, from, {
        text: `〔 ✅ APAGADO 〕\n\n${t.emoji} \`${nome}\` foi removido da categoria *${categoria}*.\n📦 Restam ${restantes} ${restantes === 1 ? t.nome.toLowerCase() : t.plural}.${aviso}`,
        footer: `${t.emoji} Gerenciador de ${t.plural} • MIKASA`,
        buttons: [
            { id: `cfg_del_cat:${tipo}:${categoria}:0`, text: "『 🗑️ 』 APAGAR OUTRO" },
            { id: `cfg_del_tipo:${tipo}`, text: "『 🔙 』 CATEGORIAS" }
        ],
        quoted: msg
    });
}

// =================================================
// 🎯 ENTRADA ÚNICA — chamada pelo mikasabot.js a cada clique de botão
// Retorna true se o clique era daqui (e já foi tratado).
// =================================================

async function processarBotaoApagar(sock, msg, idBotao) {
    const id = String(idBotao || "");
    if (!id.startsWith("cfg_del_")) return false;

    const from = msg?.key?.remoteJid;
    if (!from) return true;

    if (!(await podeApagar(sock, msg))) {
        await sock.sendMessage(from, {
            text: "🚫 Só *administradores do grupo* (ou o dono, no privado) podem apagar áudios e GIFs."
        }, { quoted: msg });
        return true;
    }

    try {
        if (id === "cfg_del_no") {
            await sock.sendMessage(from, { text: "↩️ Cancelado. Nada foi apagado." }, { quoted: msg });
            return true;
        }

        const partes = id.split(":");
        const acao = partes[0];
        const tipo = partes[1];

        if (!tipoValido(tipo)) return true;

        if (acao === "cfg_del_tipo") {
            await enviarCategorias(sock, from, tipo, msg);
            return true;
        }

        const categoria = partes[2];
        if (!categoriaValida(tipo, categoria)) return true;

        if (acao === "cfg_del_cat") {
            await enviarArquivos(sock, from, tipo, categoria, partes[3], msg);
            return true;
        }

        const nome = decodificar(partes.slice(3).join(":"));

        if (acao === "cfg_del_arq") {
            await enviarConfirmacao(sock, from, tipo, categoria, nome, msg);
            return true;
        }

        if (acao === "cfg_del_ok") {
            await apagarArquivo(sock, from, tipo, categoria, nome, msg);
            return true;
        }
    } catch (erro) {
        console.error("❌ Erro no gerenciador de mídia:", erro);
        await sock.sendMessage(from, { text: `❌ Erro ao gerenciar a mídia:\n${erro.message}` }, { quoted: msg }).catch(() => {});
    }

    return true;
}

module.exports = {
    processarBotaoApagar,
    listarArquivos,
    codificar
};
