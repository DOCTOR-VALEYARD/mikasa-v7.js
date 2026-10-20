/* =================================================
   🧭 MIKASA BOT — CAMINHOS (onde ficam as mídias e os dados)
   📁 Arquivo: caminhos.js

   Mapa único de onde cada coisa mora dentro da pasta src:

     src/midias/audios/<categoria>/   → áudios (menu, entrada, saida, bomdia, antiamor...)
     src/midias/gifs/<categoria>/     → GIFs dos comandos (matar, tapa, beijar...)
     src/midias/stickers/             → figurinhas
     src/midias/imagens/              → menu.png, fundo.png...
     src/midias/videos/               → menu.mp4, fundo_animado.mp4
     src/midias/sons/                 → play.mp3, menu_audio.mp3
     src/dados/                       → arquivos .json de dados do bot

   Também traduz caminhos antigos que ficaram salvos no
   database/botconfig.json (ex.: "./src/menu.png") para o lugar novo.
================================================= */

const path = require("path");

// src/caminhos → src → raiz do projeto
const RAIZ = path.dirname(path.dirname(__dirname));
const SRC = path.join(RAIZ, "src");
const MIDIAS = path.join(SRC, "midias");
const DADOS = path.join(SRC, "dados");

const EXT_IMAGEM = [".png", ".jpg", ".jpeg", ".webp"];
const EXT_VIDEO = [".mp4", ".webm", ".mov", ".m4v"];
const EXT_SOM = [".mp3", ".ogg", ".m4a", ".opus", ".wav"];

// Dado um arquivo/pasta do layout ANTIGO (relativo à pasta src antiga),
// devolve onde ele fica no layout novo.
function novoLugarDoAntigo(relativoNaSrc) {
    const rel = String(relativoNaSrc || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const [primeiro, ...resto] = rel.split("/");

    if (["audios", "gifs", "stickers", "assets"].includes(primeiro)) return path.join(MIDIAS, rel);
    if (resto.length) return path.join(SRC, rel); // dentro de outra subpasta: não mexe

    const ext = path.extname(rel).toLowerCase();
    if (rel === "vip.json") return path.join(DADOS, "aluguel-planos.json");
    if (EXT_IMAGEM.includes(ext)) return path.join(MIDIAS, "imagens", rel);
    if (EXT_VIDEO.includes(ext)) return path.join(MIDIAS, "videos", rel);
    if (EXT_SOM.includes(ext)) return path.join(MIDIAS, "sons", rel);
    if (ext === ".json" && rel !== "package.json") return path.join(DADOS, rel);
    return path.join(SRC, rel);
}

// Transforma o que está salvo no botconfig ("./src/menu.png", ou já o
// caminho novo) num caminho absoluto que existe de verdade.
function resolverCaminhoSalvo(valor) {
    const bruto = String(valor || "").trim();
    if (!bruto) return "";
    if (path.isAbsolute(bruto)) return bruto;
    const v = bruto.replace(/\\/g, "/").replace(/^\.\//, "");
    if (v.startsWith("src/midias/") || v.startsWith("src/dados/")) return path.join(RAIZ, v);
    if (v.startsWith("src/")) return novoLugarDoAntigo(v.slice(4));
    return path.join(RAIZ, v);
}

// Caminho absoluto → formato salvo no botconfig ("./src/midias/...").
function caminhoSalvo(absoluto) {
    return "./" + path.relative(RAIZ, absoluto).replace(/\\/g, "/");
}

// Onde guardar a foto/vídeo do menu pelo nome do arquivo (menu.png / menu.mp4).
function destinoDaMidiaDoMenu(nomeArquivo) {
    const ext = path.extname(nomeArquivo).toLowerCase();
    const pasta = EXT_VIDEO.includes(ext) ? "videos" : "imagens";
    return path.join(MIDIAS, pasta, nomeArquivo);
}

module.exports = {
    RAIZ, SRC, MIDIAS, DADOS,
    novoLugarDoAntigo,
    resolverCaminhoSalvo,
    caminhoSalvo,
    destinoDaMidiaDoMenu
};
