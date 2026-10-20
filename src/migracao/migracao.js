/* =================================================
   📦 MIKASA BOT — MIGRAÇÃO DO LAYOUT ANTIGO
   📁 Arquivo: migracao.js

   Roda sozinha, uma vez a cada inicialização, ANTES de tudo.
   Se sobrou coisa do jeito antigo dentro de src (arquivos soltos,
   áudios, gifs, jsons de dados), ela puxa pro lugar novo:

     src/audios, src/gifs, src/stickers  → src/midias/...
     src/*.png / *.mp4 / *.mp3           → src/midias/imagens | videos | sons
     src/*.json (dados)                  → src/dados
     src/vip.json                        → src/dados/aluguel-planos.json
     BOT_PHOTO / BOT_FUNDO / BOT_AUDIO   → corrigidos no database/botconfig.json

   Nada é apagado: se o mesmo arquivo existir nos dois lugares, o mais
   recente fica no lugar novo e o outro vai pra src/_antigos.
   Se não tiver nada pra migrar, ela não faz nada.
================================================= */

const fs = require("fs");
const path = require("path");
const { SRC, RAIZ, novoLugarDoAntigo, resolverCaminhoSalvo, caminhoSalvo } = require("../caminhos/caminhos");

const PASTAS_DE_MIDIA_ANTIGAS = ["audios", "gifs", "stickers", "assets"];
const ANTIGOS = path.join(SRC, "_antigos");

let movidos = 0;

function garantirPasta(p) {
    fs.mkdirSync(p, { recursive: true });
}

// Guarda um arquivo em src/_antigos sem sobrescrever nada.
function guardarNosAntigos(abs) {
    garantirPasta(ANTIGOS);
    const ext = path.extname(abs);
    const base = path.basename(abs, ext);
    let destino = path.join(ANTIGOS, base + ext);
    let n = 1;
    while (fs.existsSync(destino)) destino = path.join(ANTIGOS, `${base}.${n++}${ext}`);
    fs.renameSync(abs, destino);
}

function arquivosIguais(a, b) {
    try {
        if (fs.statSync(a).size !== fs.statSync(b).size) return false;
        return fs.readFileSync(a).equals(fs.readFileSync(b));
    } catch {
        return false;
    }
}

function moverArquivo(origem, destino) {
    if (origem === destino) return;
    garantirPasta(path.dirname(destino));
    if (!fs.existsSync(destino)) {
        fs.renameSync(origem, destino);
        movidos++;
        return;
    }
    // Cópia idêntica nos dois lugares: só descarta a antiga.
    if (arquivosIguais(origem, destino)) {
        fs.unlinkSync(origem);
        return;
    }
    // Existe nos dois lugares e são diferentes: o mais recente fica no lugar novo.
    if (fs.statSync(origem).mtimeMs > fs.statSync(destino).mtimeMs) {
        guardarNosAntigos(destino);
        fs.renameSync(origem, destino);
        movidos++;
    } else {
        guardarNosAntigos(origem);
    }
}

function moverPastaMesclando(origemDir, destinoDir) {
    for (const nome of fs.readdirSync(origemDir)) {
        const o = path.join(origemDir, nome);
        const d = path.join(destinoDir, nome);
        if (fs.statSync(o).isDirectory()) moverPastaMesclando(o, d);
        else moverArquivo(o, d);
    }
    try { fs.rmdirSync(origemDir); } catch {} // só remove se ficou vazia
}

function migrarArquivosDaSrc() {
    if (!fs.existsSync(SRC)) return;
    for (const nome of fs.readdirSync(SRC)) {
        if (nome === "_antigos") continue;
        const abs = path.join(SRC, nome);
        const stat = fs.statSync(abs);

        if (stat.isDirectory()) {
            if (PASTAS_DE_MIDIA_ANTIGAS.includes(nome)) {
                moverPastaMesclando(abs, novoLugarDoAntigo(nome));
            } else if (nome === "auth_info_users") {
                // sessões extras: agora ficam junto do módulo multisessao
                const destino = path.join(SRC, "multisessao", "auth_info_users");
                if (!fs.existsSync(destino)) {
                    garantirPasta(path.dirname(destino));
                    fs.renameSync(abs, destino);
                    movidos++;
                }
            }
            continue;
        }

        if (nome === "package.json") continue;

        // .js solto na raiz da src = módulo da versão antiga (agora cada um tem pasta)
        if (nome.endsWith(".js")) {
            guardarNosAntigos(abs);
            continue;
        }

        const destino = novoLugarDoAntigo(nome);
        if (destino !== abs) moverArquivo(abs, destino);
    }
}

function corrigirCaminhosDoBotConfig() {
    const arquivo = path.join(RAIZ, "database", "botconfig.json");
    if (!fs.existsSync(arquivo)) return;
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(arquivo, "utf8")); } catch { return; }
    if (!cfg || typeof cfg !== "object") return;

    let mudou = false;
    for (const chave of ["BOT_PHOTO", "BOT_FUNDO", "BOT_AUDIO"]) {
        const valor = cfg[chave];
        if (typeof valor !== "string") continue;
        if (!/^\.?\/?src\//.test(valor) || /src\/(midias|dados)\//.test(valor)) continue;
        const novo = caminhoSalvo(resolverCaminhoSalvo(valor));
        if (novo !== valor) {
            cfg[chave] = novo;
            mudou = true;
        }
    }
    if (mudou) fs.writeFileSync(arquivo, JSON.stringify(cfg, null, 2), "utf8");
}

function migrar() {
    try {
        migrarArquivosDaSrc();
        corrigirCaminhosDoBotConfig();
        if (movidos > 0) console.log(`📦 Migração: ${movidos} arquivo(s) do layout antigo foram para as pastas novas.`);
    } catch (erro) {
        // Nunca derruba o bot por causa disso.
        console.error("⚠️ Migração do layout antigo falhou (o bot segue normalmente):", erro?.message || erro);
    }
}

module.exports = { migrar };
