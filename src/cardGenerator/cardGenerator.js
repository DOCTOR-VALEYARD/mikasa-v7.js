/* =================================================
   🎨 MIKASA BOT — GERADOR DE CARDS (Canvas)
   📁 Arquivo: cardGenerator.js
   👑 DOCTOR VALEYARD
   Cards: Boas-vindas (alegre) / Despedida (macabro) / Música
================================================= */

const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const { resolverCaminhoSalvo } = require("../caminhos/caminhos");
const https = require("https");
const fs = require("fs");
const path = require("path");
const config = require("../../config");

// 🔧 config.BOT_NAME agora é "ao vivo" (ver config.js) — sempre reflete
// o que foi salvo com ".configurar-bot nome", sem precisar reiniciar.
function obterNomeMarca() {
    // sem asteriscos nem riscos/arcos combinados do nome estilizado (viravam quadradinhos nos cards)
    const limpo = String(config.BOT_NAME || "MIKASA").normalize("NFKD").replace(/[\u0300-\u036f*_~`]/g, "").replace(/\s+/g, " ").trim();
    return (limpo || "MIKASA").toUpperCase();
}

// ── FUNDO PADRÃO DOS CARDS ──
// Antes usava src/fundo.png (uma imagem genérica). Agora usa a MESMA foto
// do card do menu (config.BOT_PHOTO / src/menu.png), pra manter o visual
// profissional do menu em todo card que precisa de uma foto de fundo
// (casal, música, etc) — tudo com a cara do bot, de forma consistente.
// (cache removido — ver comentário dentro de carregarFundoPadrao)
function carregarFundoPadrao() {
    // 🔧 Sem cache permanente agora — antes, uma vez carregada, a imagem
    // ficava presa em memória pra sempre, então trocar a foto pelo painel
    // de configuração só fazia efeito depois de reiniciar o bot. Ler o
    // arquivo de novo a cada card é barato e garante que a troca valha
    // na hora.
    try {
        // Prioridade: BOT_FUNDO (foto de fundo dedicada, trocável pelo
        // painel) > BOT_PHOTO (foto do menu) > menu.png (padrão de fábrica)
        const candidatos = [config.BOT_FUNDO, config.BOT_PHOTO]
            .filter(Boolean)
            .map(p => resolverCaminhoSalvo(p));
        candidatos.push(path.join(__dirname, "../midias/imagens/menu.png"));

        const caminhoFinal = candidatos.find(c => fs.existsSync(c));

        if (caminhoFinal) {
            return fs.readFileSync(caminhoFinal);
        }
        console.error(`❌ Nenhuma foto padrão dos cards encontrada (tentei: ${candidatos.join(", ")})`);
        return null;
    } catch (e) {
        console.error("❌ Erro ao carregar a foto padrão dos cards:", e.message);
        return null;
    }
}

async function desenharFundoPadrao(ctx, W, H, overrideBuffer) {
    const buffer = overrideBuffer || carregarFundoPadrao();
    if (!buffer) return false;
    const img = await carregarImagemComDiagnostico(buffer, "fundo.png (fundo padrão)");
    if (!img) return false;
    const escala = Math.max(W / img.width, H / img.height);
    const w = img.width * escala;
    const h = img.height * escala;
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
    return true;
}

// ==================================================
// 🎬 FUNDO ANIMADO — quando o fundo salvo é um vídeo/gif (BOT_FUNDO_ANIMADO),
// os cards saem como VÍDEO (com gifPlayback, roda em loop) em vez de
// imagem parada. A ideia: gera o mesmo card várias vezes, uma pra cada
// frame do fundo, e junta tudo num vídeo curto no final.
// ==================================================
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// 🎞️ Quantos frames o fundo animado usa e por quantos segundos ele se
// estende. Antes eram só 6 frames espalhados em 2.4s (~3 FPS de saída),
// o que fazia o "gif" do card rodar engasgado/em soluços. Com 16 frames
// em 2s (8 FPS) o loop fica visivelmente mais fluido sem pesar demais no
// processamento (cada frame ainda precisa ser redesenhado no canvas).
const FPS_ANIMACAO = 8;
const DURACAO_ANIMACAO = 2; // segundos
const FRAMES_ANIMACAO = Math.round(FPS_ANIMACAO * DURACAO_ANIMACAO); // 16

function lerFundoAnimadoConfig() {
    try {
        const dbPath = path.join(__dirname, "../../database/botconfig.json");
        const caminhoVideo = path.join(__dirname, "../midias/videos/fundo_animado.mp4");
        if (!fs.existsSync(dbPath) || !fs.existsSync(caminhoVideo)) return { animado: false, caminho: null };
        const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
        return { animado: !!db.BOT_FUNDO_ANIMADO, caminho: caminhoVideo };
    } catch {
        return { animado: false, caminho: null };
    }
}

// ✅ Chame isso antes de gerar o card pra saber se deve montar a versão animada
function estaFundoAnimado() {
    return lerFundoAnimadoConfig().animado;
}

// 💾 CACHE dos frames extraídos: o vídeo/gif configurado é sempre o
// mesmo até o dono trocar ele — então não faz sentido rodar o ffmpeg de
// extração TODA VEZ que alguém pede um card (música, perfil, level,
// casal, menu...). Isso sozinho é boa parte do tempo de geração de
// qualquer card animado. Guardamos os frames em memória e só extraímos
// de novo se o arquivo do fundo mudou (mtime diferente).
let _cacheFramesFundo = { caminho: null, mtimeMs: null, quantidade: null, frames: null };

async function extrairFramesFundoAnimadoComCache(caminhoVideo, quantidade, duracaoSegundos) {
    let mtimeMs = null;
    try {
        mtimeMs = fs.statSync(caminhoVideo).mtimeMs;
    } catch {
        mtimeMs = null;
    }

    if (
        _cacheFramesFundo.caminho === caminhoVideo &&
        _cacheFramesFundo.mtimeMs === mtimeMs &&
        _cacheFramesFundo.quantidade === quantidade &&
        _cacheFramesFundo.frames &&
        _cacheFramesFundo.frames.length > 0
    ) {
        return _cacheFramesFundo.frames;
    }

    const frames = await extrairFramesFundoAnimado(caminhoVideo, quantidade, duracaoSegundos);
    if (frames.length) {
        _cacheFramesFundo = { caminho: caminhoVideo, mtimeMs, quantidade, frames };
    }
    return frames;
}

// 🔧 Usa exec ASSÍNCRONO (execAsync) em vez de execSync — o execSync
// trava a thread principal do Node inteira enquanto o ffmpeg roda, então
// o bot ficava sem responder pra QUALQUER pessoa/grupo durante a geração
// do card animado. Com exec assíncrono o ffmpeg roda num processo à
// parte e o event loop do bot continua livre pra atender outras mensagens.
async function extrairFramesFundoAnimado(caminhoVideo, quantidade = FRAMES_ANIMACAO, duracaoSegundos = DURACAO_ANIMACAO) {
    const pastaTemp = path.join(__dirname, `frames_fundo_${Date.now()}_${Math.floor(Math.random() * 9999)}`);
    fs.mkdirSync(pastaTemp, { recursive: true });
    try {
        const fps = (quantidade / duracaoSegundos).toFixed(2);
        await execAsync(`ffmpeg -y -t ${duracaoSegundos} -i "${caminhoVideo}" -vf "fps=${fps}" -frames:v ${quantidade} "${path.join(pastaTemp, "f_%03d.png")}"`);
        const arquivos = fs.readdirSync(pastaTemp).filter(f => f.endsWith(".png")).sort();
        return arquivos.map(f => fs.readFileSync(path.join(pastaTemp, f)));
    } catch (erro) {
        console.error("❌ Erro ao extrair frames do fundo animado:", erro.message);
        return [];
    } finally {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    }
}

/**
 * Monta a versão ANIMADA de um card, redesenhando ele uma vez por frame
 * do fundo (vídeo/gif salvo) e juntando tudo num .mp4 curto no final.
 * @param {(fundoBuffer: Buffer) => Promise<Buffer>} fnGerarFrame — deve gerar o PNG do card usando esse frame de fundo
 * @returns {Promise<Buffer|null>} buffer do vídeo pronto, ou null se não tiver fundo animado / algo falhar
 */
async function gerarCardAnimadoComFundo(fnGerarFrame, quantidadeFrames = FRAMES_ANIMACAO) {
    const { animado, caminho } = lerFundoAnimadoConfig();
    if (!animado) return null;

    const frames = await extrairFramesFundoAnimadoComCache(caminho, quantidadeFrames, DURACAO_ANIMACAO);
    if (!frames.length) return null;

    const pastaTemp = path.join(__dirname, `card_anim_${Date.now()}_${Math.floor(Math.random() * 9999)}`);
    fs.mkdirSync(pastaTemp, { recursive: true });
    try {
        for (let i = 0; i < frames.length; i++) {
            const bufferCard = await fnGerarFrame(frames[i]);
            if (!bufferCard) return null;
            fs.writeFileSync(path.join(pastaTemp, `c_${String(i).padStart(3, "0")}.png`), bufferCard);
        }
        const saida = path.join(pastaTemp, "saida.mp4");
        // 🔧 Mesma fps usada na extração (frames.length / DURACAO_ANIMACAO),
        // sem arredondar separado — antes o arredondamento (2.5 → 3) fazia
        // a saída rodar um pouco mais rápido/travado que a extração.
        const fpsSaida = Math.max(1, frames.length / DURACAO_ANIMACAO);
        // -profile:v baseline -level 3.1 = perfil mais compatível pro
        // WhatsApp reproduzir o vídeo com gifPlayback sem engasgar/falhar
        // em mais aparelhos.
        await execAsync(`ffmpeg -y -framerate ${fpsSaida} -i "${path.join(pastaTemp, "c_%03d.png")}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -profile:v baseline -level 3.1 -pix_fmt yuv420p -movflags faststart "${saida}"`);
        return fs.existsSync(saida) ? fs.readFileSync(saida) : null;
    } catch (erro) {
        console.error("❌ Erro ao montar card animado:", erro.message);
        return null;
    } finally {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    }
}

// ── FOTO DE CONTEXTO (canto do card) ──
// Desenha, num círculo pequeno no canto superior direito, a foto de quem
// chamou o comando — no PV é a foto da própria pessoa, em grupo é a foto
// do grupo. Isso entra em CIMA de qualquer card (menu, perfil, casal,
// música, level-up...), além da foto de fundo/avatar principal que cada
// card já tenha. Se não tiver foto nenhuma, simplesmente não desenha nada
// (não quebra o card).
async function desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer) {
    if (!fotoContextoBuffer) return false;
    const img = await carregarImagemComDiagnostico(fotoContextoBuffer, "foto de contexto (canto do card)");
    if (!img) return false;

    const tam = 118, margem = 24;
    const cx = W - margem - tam / 2, cy = margem + tam / 2;

    ctx.save();
    // sombra suave atrás do círculo
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, tam / 2 + 5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(10,10,10,0.55)";
    ctx.fill();
    ctx.shadowBlur = 0;

    // recorte circular da foto
    ctx.beginPath();
    ctx.arc(cx, cy, tam / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const escala = Math.max(tam / img.width, tam / img.height);
    const w = img.width * escala, h = img.height * escala;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();

    // aro em volta do círculo
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, tam / 2, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    return true;
}

// ───────────────────────────────────────────────
// 🔤 FONTES — tenta registrar fontes do sistema/projeto
// (em Termux normalmente não existe fonte instalada por padrão,
// então tentamos várias rotas conhecidas antes de desistir)
// ───────────────────────────────────────────────
let FONTE_PRINCIPAL = "sans-serif";
let FONTE_TITULO = "sans-serif";

// 📰 Fontes do JORNAL (cards do menu): o texto do jornal usa "Times New Roman". No Termux/hospedagem essa fonte
// NÃO existe e o papel ficava em branco (só números minúsculos). Por isso a Liberation Serif — idêntica em tamanho —
// vai junto no projeto (src/midias/assets/fonts) e é registrada com esse nome.
(function registrarFontesJornal() {
    const pasta = path.join(__dirname, "../midias/assets/fonts");
    for (const arq of ["LiberationSerif-Regular.ttf", "LiberationSerif-Bold.ttf", "LiberationSerif-Italic.ttf", "LiberationSerif-BoldItalic.ttf"]) {
        try {
            const p = path.join(pasta, arq);
            if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, "Times New Roman");
        } catch (e) { /* segue sem essa */ }
    }
})();

(function registrarFontes() {
    const candidatos = [
        // fontes que o próprio dev pode colocar em src/assets/fonts
        path.join(__dirname, "../midias/assets/fonts/Poppins-Bold.ttf"),
        path.join(__dirname, "../midias/assets/fonts/Poppins-Regular.ttf"),
        // fontes comuns de sistema Android (acessíveis sem root na maioria dos aparelhos)
        "/system/fonts/Roboto-Bold.ttf",
        "/system/fonts/Roboto-Regular.ttf",
        "/system/fonts/NotoSans-Regular.ttf",
        // fontes instaladas via "pkg install fontconfig" / "pkg install font-noto" no Termux
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
        "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans.ttf",
    ];

    let achouNegrito = false;
    let achouRegular = false;

    for (const arquivo of candidatos) {
        try {
            if (fs.existsSync(arquivo)) {
                const familia = arquivo.toLowerCase().includes("bold") ? "DVCL-Bold" : "DVCL-Regular";
                GlobalFonts.registerFromPath(arquivo, familia);
                if (familia === "DVCL-Bold") achouNegrito = true;
                if (familia === "DVCL-Regular") achouRegular = true;
            }
        } catch (e) {
            // ignora e segue tentando as próximas
        }
    }

    if (achouNegrito) FONTE_TITULO = "DVCL-Bold";
    if (achouRegular) FONTE_PRINCIPAL = "DVCL-Regular";
    if (!achouNegrito && achouRegular) FONTE_TITULO = "DVCL-Regular";

    if (!achouNegrito && !achouRegular) {
        console.log("⚠️ Nenhuma fonte .ttf encontrada para os cards. Usando fallback do sistema.");
        console.log("💡 Dica: coloque um arquivo .ttf em src/midias/assets/fonts/ (ex: Poppins-Bold.ttf) para garantir texto bonito nos cards.");
    }
})();

// ───────────────────────────────────────────────
// 🌐 HELPERS
// ───────────────────────────────────────────────
function baixarBuffer(url, redirecionamentosRestantes = 3) {
    return new Promise((resolve, reject) => {
        if (!url) return reject(new Error("URL vazia"));
        https.get(url, (res) => {
            // 🔁 CDNs do WhatsApp às vezes redirecionam (301/302/307) — sem isso,
            // a promise rejeitava com um "erro" que na real era só um redirect.
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirecionamentosRestantes > 0) {
                res.resume(); // descarta o corpo da resposta atual
                return resolve(baixarBuffer(res.headers.location, redirecionamentosRestantes - 1));
            }
            if (res.statusCode !== 200) return reject(new Error(`Falha ao baixar imagem: HTTP ${res.statusCode} (${url})`));
            const chunks = [];
            res.on("data", (c) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks)));
        }).on("error", (e) => reject(new Error(`Erro de rede ao baixar imagem (${url}): ${e.message}`)));
    });
}

// ───────────────────────────────────────────────
// 🔎 DETECTA O FORMATO REAL DA IMAGEM PELOS BYTES
// (não pela extensão do arquivo — um arquivo pode se chamar "menu.png" e
// ter, por dentro, bytes de JPEG/WEBP/GIF/etc. Isso é normal quando a foto
// vem direto do WhatsApp e é só salva com nome fixo, sem converter.)
// ───────────────────────────────────────────────
function detectarFormatoImagem(buffer) {
    if (!buffer || buffer.length < 12) return "desconhecido (arquivo vazio ou muito pequeno)";
    const b = buffer;
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "PNG";
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "JPEG";
    if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "GIF";
    if (b[0] === 0x42 && b[1] === 0x4d) return "BMP";
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b.length > 11 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "WEBP";
    if (b.length > 12 && b.slice(4, 8).toString("ascii") === "ftyp") {
        const marca = b.slice(8, 12).toString("ascii").toLowerCase();
        if (marca.includes("avif")) return "AVIF";
        if (marca.includes("heic") || marca.includes("heix") || marca.includes("hevc") || marca.includes("mif1")) {
            return "HEIC/HEIF (foto de iPhone sem conversão — normalmente o WhatsApp converte pra JPEG antes de enviar; se chegou assim, esse formato pode não ser suportado)";
        }
    }
    return `desconhecido (primeiros bytes em hex: ${buffer.slice(0, 4).toString("hex")})`;
}

// ───────────────────────────────────────────────
// 🖼️ CARREGADOR ROBUSTO DE IMAGEM — tenta de TODAS as formas antes de
// desistir, e se mesmo assim falhar, explica no console exatamente o
// tamanho do arquivo, o formato real detectado e o motivo do erro.
// Use esta função em vez de chamar loadImage() direto em qualquer lugar
// novo do código.
// ───────────────────────────────────────────────
async function carregarImagemComDiagnostico(buffer, label) {
    if (!buffer) {
        console.error(`❌ [${label}] nenhum buffer de imagem foi passado (nulo/indefinido).`);
        return null;
    }
    if (!Buffer.isBuffer(buffer)) {
        try { buffer = Buffer.from(buffer); } catch { /* deixa cair na checagem de baixo */ }
    }
    if (!buffer || !buffer.length) {
        console.error(`❌ [${label}] o buffer da imagem está vazio (0 bytes) — o download ou a leitura do arquivo falhou antes de chegar aqui.`);
        return null;
    }

    const formato = detectarFormatoImagem(buffer);
    const tentativas = [
        () => loadImage(buffer),
        () => loadImage(new Uint8Array(buffer)),
        () => loadImage(Buffer.from(buffer)), // cópia nova do buffer, evita buffers "compartilhados"/views estranhas
    ];

    let ultimoErro = null;
    for (const tentativa of tentativas) {
        try {
            return await tentativa();
        } catch (e) {
            ultimoErro = e;
        }
    }

    console.error(
        `❌ [${label}] não consegui carregar a imagem em NENHUMA tentativa.\n` +
        `   📦 Tamanho do arquivo: ${buffer.length} bytes\n` +
        `   🔍 Formato real detectado pelos bytes (não pela extensão): ${formato}\n` +
        `   ⚠️ Último erro: ${ultimoErro?.message}\n` +
        `   💡 Se o formato acima não for PNG/JPEG/WEBP/GIF/BMP, esse é o motivo — ` +
        `reenvie a imagem original (sem editar/renomear) ou converta pra JPEG antes de salvar.`
    );
    return null;
}

function quebrarTexto(ctx, texto, maxLargura) {
    const palavras = texto.split(" ");
    const linhas = [];
    let linhaAtual = "";

    for (const palavra of palavras) {
        const teste = linhaAtual ? `${linhaAtual} ${palavra}` : palavra;
        if (ctx.measureText(teste).width > maxLargura && linhaAtual) {
            linhas.push(linhaAtual);
            linhaAtual = palavra;
        } else {
            linhaAtual = teste;
        }
    }
    if (linhaAtual) linhas.push(linhaAtual);
    return linhas;
}

// Marca sempre "DVCL" — o nome do criador aparece à parte, dentro do texto
// de cada card (ex: "criado por ${ownerName}"), não na marca d'água.
function desenharAssinaturaDVCL(ctx, largura, altura, corDestaque = "#ff1744") {
    ctx.save();
    const texto = obterNomeMarca();
    ctx.font = `bold 18px ${FONTE_PRINCIPAL}`;
    const paddingX = 14, paddingY = 8;
    const larguraTexto = ctx.measureText(texto).width;
    const boxW = larguraTexto + paddingX * 2;
    const boxH = 30;
    const x = largura - boxW - 16;
    const y = altura - boxH - 14;

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(10,4,4,0.6)";
    desenharRetanguloArredondado(ctx, x, y, boxW, boxH, 14);
    ctx.fill();
    ctx.strokeStyle = corDestaque;
    ctx.lineWidth = 1.5;
    desenharRetanguloArredondado(ctx, x, y, boxW, boxH, 14);
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffe0e0";
    ctx.fillText(texto, x + paddingX, y + boxH / 2 + 1);
    ctx.restore();
}

// 💀 Caveirinha/marca decorativa simples no canto — reaproveitada em vários cards
function marcaCantoDestaque(ctx, largura, altura, cor = "#ff1744") {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.globalAlpha = 0.9;
    ctx.fillText("💀", 18, 16);
    ctx.restore();
}

async function desenharAvatarCircular(ctx, fotoBuffer, cx, cy, raio, corAnel = "#ffffff", textoFallback = null) {
    // anel decorativo
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 8, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = corAnel;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 18;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const img = fotoBuffer ? await carregarImagemComDiagnostico(fotoBuffer, "avatar circular") : null;
    if (img) {
        // cobre o círculo mantendo proporção (cover)
        const escala = Math.max((raio * 2) / img.width, (raio * 2) / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    } else {
        if (textoFallback) {
            // sem foto -> mostra o número/nome da pessoa dentro do círculo
            const grad = ctx.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio);
            grad.addColorStop(0, "#3a1c71");
            grad.addColorStop(1, "#6a3de8");
            ctx.fillStyle = grad;
            ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            // ajusta o tamanho da fonte conforme o tamanho do texto, pra caber no círculo
            let tamanhoFonte = Math.round(raio * 0.5);
            ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
            let largura = ctx.measureText(textoFallback).width;
            const larguraMax = raio * 1.7;
            while (largura > larguraMax && tamanhoFonte > 10) {
                tamanhoFonte -= 2;
                ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
                largura = ctx.measureText(textoFallback).width;
            }
            ctx.fillText(textoFallback, cx, cy);
        } else {
            // sem foto e sem texto -> desenha um avatar padrão (silhueta simples)
            ctx.fillStyle = "#999999";
            ctx.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
            ctx.fillStyle = "#666666";
            ctx.beginPath();
            ctx.arc(cx, cy - raio * 0.15, raio * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy + raio * 1.15, raio * 0.85, Math.PI, 0);
            ctx.fill();
        }
    }
    ctx.restore();
}

// ── Avatar QUADRADO (com cantos levemente arredondados) ──
// x,y = canto superior esquerdo do quadrado. tamanho = lado do quadrado.
async function desenharAvatarQuadrado(ctx, fotoBuffer, x, y, tamanho, corBorda = "#ffffff", textoFallback = null, raioCanto = 22, iconeFallback = null) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + raioCanto, y);
    ctx.arcTo(x + tamanho, y, x + tamanho, y + tamanho, raioCanto);
    ctx.arcTo(x + tamanho, y + tamanho, x, y + tamanho, raioCanto);
    ctx.arcTo(x, y + tamanho, x, y, raioCanto);
    ctx.arcTo(x, y, x + tamanho, y, raioCanto);
    ctx.closePath();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#1a1a1a";
    ctx.fill();
    ctx.clip();
    ctx.shadowBlur = 0;

    const img = fotoBuffer ? await carregarImagemComDiagnostico(fotoBuffer, "avatar quadrado") : null;
    if (img) {
        const escala = Math.max(tamanho / img.width, tamanho / img.height);
        const w = img.width * escala;
        const h = img.height * escala;
        ctx.drawImage(img, x + (tamanho - w) / 2, y + (tamanho - h) / 2, w, h);
    } else {
        if (iconeFallback) {
            // ícone genérico (ex: robô/coroa) — usado quando NÃO faz sentido mostrar
            // silhueta de pessoa (ex: foto do menu do bot)
            const grad = ctx.createLinearGradient(x, y, x + tamanho, y + tamanho);
            grad.addColorStop(0, "#210505");
            grad.addColorStop(1, "#3a0a0a");
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, tamanho, tamanho);
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.font = `${Math.round(tamanho * 0.4)}px ${FONTE_PRINCIPAL}`;
            ctx.fillText(iconeFallback, x + tamanho / 2, y + tamanho / 2);
        } else if (textoFallback) {
            const grad = ctx.createLinearGradient(x, y, x + tamanho, y + tamanho);
            grad.addColorStop(0, "#3a1c71");
            grad.addColorStop(1, "#6a3de8");
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, tamanho, tamanho);

            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            let tamanhoFonte = Math.round(tamanho * 0.22);
            ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
            let largura = ctx.measureText(textoFallback).width;
            const larguraMax = tamanho * 0.85;
            while (largura > larguraMax && tamanhoFonte > 10) {
                tamanhoFonte -= 2;
                ctx.font = `bold ${tamanhoFonte}px ${FONTE_TITULO}`;
                largura = ctx.measureText(textoFallback).width;
            }
            ctx.fillText(textoFallback, x + tamanho / 2, y + tamanho / 2);
        } else {
            ctx.fillStyle = "#999999";
            ctx.fillRect(x, y, tamanho, tamanho);
            ctx.fillStyle = "#666666";
            ctx.beginPath();
            ctx.arc(x + tamanho / 2, y + tamanho * 0.38, tamanho * 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + tamanho / 2, y + tamanho * 1.05, tamanho * 0.4, Math.PI, 0);
            ctx.fill();
        }
    }
    ctx.restore();

    // borda colorida em volta do quadrado
    ctx.save();
    ctx.strokeStyle = corBorda;
    ctx.lineWidth = 5;
    desenharRetanguloArredondado(ctx, x, y, tamanho, tamanho, raioCanto);
    ctx.stroke();
    ctx.restore();
}

// ── Raios elétricos decorativos (tema "vermelho com raios/quebradura") ──
function raiosEletricos(ctx, largura, altura, qtd = 5, cor = "rgba(255,60,60,0.55)") {
    ctx.save();
    ctx.strokeStyle = cor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.shadowColor = cor;
    ctx.shadowBlur = 10;
    for (let i = 0; i < qtd; i++) {
        let x = Math.random() * largura;
        let y = 0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segmentos = 5 + Math.floor(Math.random() * 4);
        for (let s = 0; s < segmentos; s++) {
            x += (Math.random() - 0.5) * 70;
            y += altura / segmentos;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function confete(ctx, largura, altura, qtd = 60) {
    const cores = ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#ffffff"];
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const r = 2 + Math.random() * 4;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.random() * 0.35;
        ctx.fillStyle = cores[i % cores.length];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 💕 coraçõezinhos flutuantes decorativos — usados no card de casal pra
// ficar mais romântico (substitui as rachaduras que ficavam meio sinistras).
function coracoesFlutuantes(ctx, largura, altura, qtd = 22) {
    const cores = ["#ff5c8a", "#ff8fab", "#ff1744", "#ffc2d1", "#ffffff"];
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const tam = 8 + Math.random() * 14;
        ctx.save();
        ctx.globalAlpha = 0.25 + Math.random() * 0.35;
        ctx.fillStyle = cores[i % cores.length];
        ctx.font = `${tam}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♥", x, y);
        ctx.restore();
    }
}

function neblinaMacabra(ctx, largura, altura, qtd = 8) {
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = altura * 0.55 + Math.random() * altura * 0.45;
        const r = 60 + Math.random() * 120;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(80,0,20,0.35)");
        grad.addColorStop(1, "rgba(80,0,20,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
}

function rachaduras(ctx, largura, altura, qtd = 6) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 2;
    for (let i = 0; i < qtd; i++) {
        let x = Math.random() * largura;
        let y = Math.random() * altura * 0.3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        const segmentos = 4 + Math.floor(Math.random() * 3);
        for (let s = 0; s < segmentos; s++) {
            x += (Math.random() - 0.5) * 60;
            y += 25 + Math.random() * 35;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function notasMusicais(ctx, largura, altura, qtd = 16) {
    const simbolos = ["♪", "♫", "♬", "♩"];
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const tamanho = 16 + Math.random() * 28;
        ctx.save();
        ctx.globalAlpha = 0.10 + Math.random() * 0.16;
        ctx.fillStyle = "#ffffff";
        ctx.font = `${tamanho}px ${FONTE_TITULO}`;
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.6);
        ctx.fillText(simbolos[i % simbolos.length], 0, 0);
        ctx.restore();
    }
    ctx.restore();
}

function marcaDaguaDVCL() {
    // marca d'água removida a pedido — intencionalmente vazio
}

// ───────────────────────────────────────────────
// ✨ CARD DE BOAS-VINDAS (ALEGRE) — com variações de cor
// ───────────────────────────────────────────────
// Paletas diferentes pra cada card não sair sempre igual (sorteio por membro)
const PALETAS_BOASVINDAS = [
    { nome: "Royal",  cores: ["#1b1035", "#3a1c71", "#6a3de8"], anel: "#ffd166", titulo: "#ffd166" },
    { nome: "Neon",   cores: ["#03122e", "#0a3d62", "#00c2cb"], anel: "#00e5ff", titulo: "#00e5ff" },
    { nome: "Ouro",   cores: ["#241503", "#5c3a00", "#d98e04"], anel: "#ffe08a", titulo: "#ffe08a" },
    { nome: "Esmeralda", cores: ["#04120c", "#0b3d2e", "#12a86b"], anel: "#7CFFC4", titulo: "#7CFFC4" },
];

async function criarCardBoasVindas({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros }) {
    // 📰 mesmo estilo do cartaz de saída (jornal), só que "BEM-VINDO(A)" — ver src/cards-novos
    return require("../cards-novos/cards-novos").criarCartazBoasVindas({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros });
}

// (layout antigo, guardado só como reserva)
async function criarCardBoasVindasAntigo({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, fotoFundoBuffer, variante, fundoBuffer, fotoContextoBuffer }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const paleta = PALETAS_BOASVINDAS[
        Number.isInteger(variante) ? variante % PALETAS_BOASVINDAS.length : Math.floor(Math.random() * PALETAS_BOASVINDAS.length)
    ];

    // ── fundo: foto configurada (nítida) ou gradiente da paleta ──
    let usouFotoFundo = false;
    const bufferFundoParaUsar = fundoBuffer || fotoFundoBuffer;
    if (bufferFundoParaUsar) {
        const imgFundo = await carregarImagemComDiagnostico(bufferFundoParaUsar, "fundo.png (card boas-vindas)");
        if (imgFundo) {
            const escala = Math.max(W / imgFundo.width, H / imgFundo.height);
            const w = imgFundo.width * escala, h = imgFundo.height * escala;
            ctx.drawImage(imgFundo, (W - w) / 2, (H - h) / 2, w, h);
            usouFotoFundo = true;
        }
    }
    if (!usouFotoFundo) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, paleta.cores[0]);
        grad.addColorStop(0.55, paleta.cores[1]);
        grad.addColorStop(1, paleta.cores[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    // escurece com degradê (garante leitura em qualquer foto de fundo)
    const veu = ctx.createLinearGradient(0, 0, W, 0);
    veu.addColorStop(0, "rgba(0,0,0,0.55)");
    veu.addColorStop(1, "rgba(0,0,0,0.30)");
    ctx.fillStyle = veu;
    ctx.fillRect(0, 0, W, H);

    // ── painel de vidro ──
    const px = 40, py = 40, pw = W - 80, ph = H - 80;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 30;
    desenharRetanguloArredondado(ctx, px, py, pw, ph, 28);
    ctx.fillStyle = "rgba(12,12,20,0.62)";
    ctx.fill();
    ctx.restore();
    ctx.save();
    desenharRetanguloArredondado(ctx, px, py, pw, ph, 28);
    ctx.strokeStyle = paleta.anel;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.restore();

    // ── avatar circular com anel duplo ──
    const cx = 235, cy = H / 2, raio = 128;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, raio + 22, 0, Math.PI * 2);
    ctx.strokeStyle = paleta.anel;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    await desenharAvatarCircular(ctx, fotoBuffer, cx, cy, raio, paleta.anel, nomeUsuario);

    // ── coluna de texto ──
    const tx = 430, larg = W - tx - 80;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    // etiqueta "NOVO MEMBRO"
    const etiqueta = "NOVO MEMBRO";
    ctx.font = `bold 20px ${FONTE_TITULO}`;
    const ew = ctx.measureText(etiqueta).width + 36;
    desenharRetanguloArredondado(ctx, tx, 118, ew, 38, 19);
    ctx.fillStyle = paleta.anel;
    ctx.fill();
    ctx.fillStyle = "#101010";
    ctx.textBaseline = "middle";
    ctx.fillText(etiqueta, tx + 18, 138);
    ctx.textBaseline = "alphabetic";

    // "Bem-vindo(a)"
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 54px ${FONTE_TITULO}`;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    ctx.fillText("Bem-vindo(a)!", tx, 222);

    // nome (número) — reduz a fonte se for grande
    let tam = 36;
    ctx.font = `bold ${tam}px ${FONTE_TITULO}`;
    const nomeTxt = `@${nomeUsuario}`;
    while (ctx.measureText(nomeTxt).width > larg && tam > 18) { tam -= 2; ctx.font = `bold ${tam}px ${FONTE_TITULO}`; }
    ctx.fillStyle = paleta.titulo;
    ctx.fillText(nomeTxt, tx, 276);
    ctx.shadowBlur = 0;

    // divisor
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(tx, 300, larg, 2);

    // grupo
    ctx.font = `22px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText("Você entrou em", tx, 340);
    ctx.font = `bold 28px ${FONTE_TITULO}`;
    ctx.fillStyle = "#ffffff";
    let yy = 376;
    for (const linha of quebrarTexto(ctx, nomeGrupo, larg).slice(0, 2)) { ctx.fillText(linha, tx, yy); yy += 34; }

    // selo de membros
    const selo = `${totalMembros} membros no grupo`;
    ctx.font = `bold 22px ${FONTE_PRINCIPAL}`;
    const sw = ctx.measureText(selo).width + 36;
    desenharRetanguloArredondado(ctx, tx, H - 128, sw, 40, 20);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.fillText(selo, tx + 18, H - 107);
    ctx.textBaseline = "alphabetic";

    // foto do grupo (selo no canto do painel) + marca do bot
    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);
    desenharAssinaturaDVCL(ctx, W, H, paleta.titulo);

    return canvas.encode("png");
}


// ───────────────────────────────────────────────
// 🥀 CARD DE DESPEDIDA (MACABRO — MAIS AGRESSIVO)
// ───────────────────────────────────────────────
const TITULOS_DESPEDIDA = ["ATÉ NUNCA MAIS... 🥀", "FOI EXPULSO(A)! 💀", "SUMIU DO MAPA... ☠️"];

function respingosSangue(ctx, largura, altura, qtd = 14) {
    ctx.save();
    for (let i = 0; i < qtd; i++) {
        const x = Math.random() * largura;
        const y = Math.random() * altura;
        const r = 3 + Math.random() * 9;
        ctx.globalAlpha = 0.5 + Math.random() * 0.4;
        ctx.fillStyle = "#a30016";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

// ───────────────────────────────────────────────
// 📰 CARD DE SAÍDA — JORNAL "PROCURA-SE / DESAPARECIDO(A)"
// ───────────────────────────────────────────────
const MANCHETES_SAIDA = ["PROCURA-SE!", "DESAPARECIDO(A)!", "FUGIU DO GRUPO!"];
const MANCHETES_REMOVIDO = ["EXPULSO(A) DO GRUPO!", "BANIDO(A) SEM DÓ!"];
const FRASES_JORNAL = [
    "“Ninguém viu, ninguém sentiu.”",
    "“Testemunhas dizem que saiu sem se despedir.”",
    "“O grupo segue de pé. Por enquanto.”",
    "“Última mensagem: nenhuma. Típico.”",
    "“Polícia investiga... mas ninguém ligou.”"
];
const FRASES_JORNAL_REMOVIDO = [
    "“Foi retirado(a) sem direito a defesa.”",
    "“O regulamento falou mais alto.”",
    "“A porta da rua é serventia da casa.”",
    "“Justiça feita, dizem os admins.”"
];

// foto em preto e branco com contraste e tom de papel antigo
async function fotoJornal(fotoBuffer, tam, simbolo = "?") {
    const img = fotoBuffer ? await carregarImagemComDiagnostico(fotoBuffer, "foto jornal (saída)") : null;
    const c = createCanvas(tam, tam);
    const g = c.getContext("2d");
    if (img) {
        const escala = Math.max(tam / img.width, tam / img.height);
        const w = img.width * escala, h = img.height * escala;
        g.drawImage(img, (tam - w) / 2, (tam - h) / 2, w, h);
        const dados = g.getImageData(0, 0, tam, tam);
        const d = dados.data;
        for (let i = 0; i < d.length; i += 4) {
            let l = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            l = Math.max(0, Math.min(255, (l - 128) * 1.3 + 128));
            d[i] = Math.min(255, l * 1.04 + 6);
            d[i + 1] = l * 0.97;
            d[i + 2] = l * 0.82;
        }
        g.putImageData(dados, 0, 0);
        // retícula (meio-tom) bem sutil
        g.fillStyle = "rgba(0,0,0,0.10)";
        for (let y = 0; y < tam; y += 4) for (let x = (y / 4) % 2 ? 2 : 0; x < tam; x += 4) g.fillRect(x, y, 1.4, 1.4);
    } else {
        // silhueta "?" quando não há foto
        g.fillStyle = "#b9b2a0";
        g.fillRect(0, 0, tam, tam);
        g.fillStyle = "#7f7869";
        g.beginPath(); g.arc(tam / 2, tam * 0.38, tam * 0.17, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(tam / 2, tam * 1.02, tam * 0.36, Math.PI, 0); g.fill();
        g.fillStyle = "rgba(255,255,255,0.75)";
        g.font = `bold ${Math.round(tam * 0.22)}px ${FONTE_TITULO}`;
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillText(simbolo, tam / 2, tam * 0.40);
    }
    return c;
}

async function renderJornal({ fotoBuffer, nomeGrupo, manchete, subtitulo, carimbo, carimboTam = 54, tituloRelatorio = "RELATÓRIO DO CASO", fatos = [], frase = "", faixa = "", legenda = "", nomeJornal = "O JORNAL DO GRUPO", edicao = "EDIÇÃO EXTRA", simboloFoto = "?", decorarFoto = null }) {
    const W = 1000, H = 775;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const SERIF = `"Times New Roman", "DejaVu Serif", Georgia, serif`;
    const INK = "#1b1a17", VERMELHO = "#b3121c";

    // ── papel ──
    ctx.fillStyle = "#e9e0c9";
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85);
    vig.addColorStop(0, "rgba(255,250,235,0)");
    vig.addColorStop(1, "rgba(120,95,50,0.35)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 3500; i++) {
        ctx.fillStyle = `rgba(90,70,40,${Math.random() * 0.12})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    // dobra no meio
    const dobra = ctx.createLinearGradient(W / 2 - 14, 0, W / 2 + 14, 0);
    dobra.addColorStop(0, "rgba(0,0,0,0)"); dobra.addColorStop(0.5, "rgba(0,0,0,0.09)"); dobra.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = dobra;
    ctx.fillRect(W / 2 - 14, 0, 28, H);

    // ── molduras ──
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4; ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.lineWidth = 1.2; ctx.strokeRect(26, 26, W - 52, H - 52);

    // ── cabeçalho (nome do jornal) ──
    const data = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).toUpperCase();
    ctx.fillStyle = INK;
    ctx.font = `bold 15px ${SERIF}`;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";   ctx.fillText(`${edicao}  •  Nº ${1000 + Math.floor(Math.random() * 8999)}`, 44, 56);
    ctx.textAlign = "right";  ctx.fillText(data, W - 44, 56);
    ctx.fillRect(44, 64, W - 88, 2);

    ctx.textAlign = "center";
    let tamJ = 66;
    ctx.font = `bold ${tamJ}px ${SERIF}`;
    while (ctx.measureText(nomeJornal).width > W - 120 && tamJ > 28) { tamJ -= 2; ctx.font = `bold ${tamJ}px ${SERIF}`; }
    ctx.fillText(nomeJornal, W / 2, 128);
    let tamG = 22;
    const subt = `— ${nomeGrupo} —`;
    ctx.font = `italic ${tamG}px ${SERIF}`;
    while (ctx.measureText(subt).width > W - 160 && tamG > 12) { tamG--; ctx.font = `italic ${tamG}px ${SERIF}`; }
    ctx.fillText(subt, W / 2, 158);
    ctx.fillRect(44, 170, W - 88, 4);
    ctx.fillRect(44, 178, W - 88, 1.5);

    // ── manchete ──
    ctx.fillStyle = VERMELHO;
    let tamM = 76;
    ctx.font = `bold ${tamM}px ${SERIF}`;
    while (ctx.measureText(manchete).width > W - 120 && tamM > 30) { tamM -= 2; ctx.font = `bold ${tamM}px ${SERIF}`; }
    ctx.fillText(manchete, W / 2, 255);
    ctx.fillStyle = INK;
    ctx.font = `italic 21px ${SERIF}`;
    ctx.fillText(subtitulo, W / 2, 288);
    ctx.fillRect(44, 302, W - 88, 1.5);

    // ── foto estilo polaroide (inclinada) ──
    const fotoTam = 250;
    const foto = await fotoJornal(fotoBuffer, fotoTam, simboloFoto);
    ctx.save();
    ctx.translate(215, 506);
    ctx.rotate(-0.05);
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.fillStyle = "#fbf8ef";
    ctx.fillRect(-150, -180, 300, 350);
    ctx.shadowColor = "transparent";
    ctx.drawImage(foto, -fotoTam / 2, -165, fotoTam, fotoTam);
    ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = 2;
    ctx.strokeRect(-fotoTam / 2, -165, fotoTam, fotoTam);
    // 🏷️ emblema do tema (ex.: escudo do ADMIN) por cima da foto
    if (typeof decorarFoto === "function") { try { decorarFoto(ctx, fotoTam); } catch {} }
    // legenda da foto
    ctx.fillStyle = INK; ctx.textAlign = "center";
    let tamN = 24;
    ctx.font = `bold ${tamN}px ${SERIF}`;
    while (ctx.measureText(legenda).width > 270 && tamN > 12) { tamN--; ctx.font = `bold ${tamN}px ${SERIF}`; }
    ctx.fillText(legenda, 0, 130);
    // fitas adesivas
    ctx.fillStyle = "rgba(235,225,170,0.85)";
    ctx.save(); ctx.translate(-120, -176); ctx.rotate(-0.6); ctx.fillRect(-45, -13, 90, 26); ctx.restore();
    ctx.save(); ctx.translate(120, -176); ctx.rotate(0.6); ctx.fillRect(-45, -13, 90, 26); ctx.restore();
    // carimbo
    ctx.save();
    ctx.translate(35, 50); ctx.rotate(-0.38);
    ctx.font = `bold ${carimboTam}px ${SERIF}`;
    const cw = ctx.measureText(carimbo).width + 36;
    ctx.strokeStyle = "rgba(190,15,30,0.88)"; ctx.lineWidth = 6;
    ctx.strokeRect(-cw / 2, -42, cw, 74);
    ctx.fillStyle = "rgba(190,15,30,0.88)";
    ctx.fillText(carimbo, 0, 14);
    ctx.restore();
    ctx.restore();

    // ── reportagem (coluna à direita) ──
    const cx0 = 420, cw0 = W - cx0 - 50;
    ctx.textAlign = "left";
    ctx.fillStyle = INK;
    ctx.font = `bold 27px ${SERIF}`;
    ctx.fillText(tituloRelatorio, cx0, 340);
    ctx.fillRect(cx0, 348, cw0, 2);

    let y = 382;
    for (const [rotulo, valor] of fatos) {
        ctx.font = `bold 19px ${SERIF}`;
        ctx.fillStyle = INK;
        ctx.fillText(rotulo, cx0, y);
        const rw = ctx.measureText(rotulo).width + 8;
        ctx.font = `19px ${SERIF}`;
        let txt = String(valor);
        while (ctx.measureText(txt).width > cw0 - rw && txt.length > 4) txt = txt.slice(0, -2);
        if (txt !== String(valor)) txt = txt.trimEnd() + "…";
        ctx.fillText(txt, cx0 + rw, y);
        y += 30;
    }

    // citação
    ctx.fillStyle = VERMELHO;
    ctx.font = `italic bold 21px ${SERIF}`;
    y += 14;
    for (const l of quebrarTexto(ctx, frase, cw0).slice(0, 3)) { ctx.fillText(l, cx0, y); y += 27; }

    // linhas de texto falso (efeito de coluna de jornal)
    ctx.fillStyle = "rgba(27,26,23,0.30)";
    y += 8;
    for (let i = 0; i < 4 && y < 600; i++, y += 15) {
        const lw = i === 3 ? cw0 * 0.55 : cw0 - Math.random() * 18;
        ctx.fillRect(cx0, y, lw, 4);
    }

    // ── faixa inferior ──
    ctx.fillStyle = INK;
    ctx.fillRect(26, H - 86, W - 52, 60);
    ctx.fillStyle = "#f3ead2";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 26px ${SERIF}`;
    ctx.fillText(faixa, W / 2, H - 56);
    ctx.textBaseline = "alphabetic";

    return canvas.encode("png");
}

async function criarCardDespedida({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, variante, tempoNoGrupo, motivo }) {
    // 📰 cartaz "DESAPARECIDO(A) / RECOMPENSA" (foto livre, sem carimbo em cima) — ver src/cards-novos
    return require("../cards-novos/cards-novos").criarCartazDesaparecido({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, tempoNoGrupo, motivo });
}

// 🙋 Solicitação de entrada — versão jornal
async function criarCardSolicitacao({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer }) {
    return require("../cards-novos/cards-novos").criarCartazSolicitacao({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer });
}

// 📰 Card do MENU — versão jornal (usa só dados do próprio bot/chat)
async function criarCardMenuJornal({ botName, ownerName, prefix, totalComandos, categorias, fotoContextoBuffer, arteBuffer }) {
    // (nome mantido por compatibilidade) agora é o card roxo/neon do MENU PRINCIPAL
    return require("../cards-novos/cards-novos").criarCardMenuPrincipal({ botName, ownerName, prefix, totalComandos, categorias, arteBuffer });
}

// ─────────────────────────────────────────────
// 🏷️ CARD DE MENU POR TEMA (ADMIN, DONO, GOLD, MÍDIAS...) — mesmo jornal do menu,
// com a foto do bot + um emblema que representa aquele menu.
// ─────────────────────────────────────────────
function desenharEmblemaTema(ctx, icone, cx, cy, r, cor = "#b3121c") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 5; ctx.strokeStyle = "#fbf8ef";
    ctx.beginPath(); ctx.arc(0, 0, r - 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#fbf8ef"; ctx.strokeStyle = "#fbf8ef"; ctx.lineWidth = r * 0.1; ctx.lineJoin = "round"; ctx.lineCap = "round";
    const u = r * 0.62;
    const poli = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * u, y * u) : ctx.moveTo(x * u, y * u)); ctx.closePath(); ctx.fill(); };
    switch (icone) {
        case "escudo":
            ctx.beginPath(); ctx.moveTo(0, -u); ctx.lineTo(u * 0.85, -u * 0.55); ctx.lineTo(u * 0.75, u * 0.2);
            ctx.quadraticCurveTo(u * 0.55, u * 0.75, 0, u); ctx.quadraticCurveTo(-u * 0.55, u * 0.75, -u * 0.75, u * 0.2);
            ctx.lineTo(-u * 0.85, -u * 0.55); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = cor; ctx.lineWidth = r * 0.12; ctx.beginPath();
            ctx.moveTo(-u * 0.35, 0); ctx.lineTo(-u * 0.05, u * 0.3); ctx.lineTo(u * 0.4, -u * 0.25); ctx.stroke();
            break;
        case "coroa":
            poli([[-0.9, 0.55], [-1, -0.5], [-0.4, 0.05], [0, -0.8], [0.4, 0.05], [1, -0.5], [0.9, 0.55]]);
            break;
        case "moeda":
            ctx.beginPath(); ctx.arc(0, 0, u, 0, Math.PI * 2); ctx.stroke();
            ctx.font = `bold ${Math.round(u * 1.5)}px "Times New Roman", "DejaVu Serif", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("$", 0, u * 0.08);
            break;
        case "play":
            poli([[-0.5, -0.8], [0.9, 0], [-0.5, 0.8]]);
            break;
        case "dado": {
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-u, -u, u * 2, u * 2, u * 0.3) : ctx.rect(-u, -u, u * 2, u * 2); ctx.fill();
            ctx.fillStyle = cor;
            for (const [x, y] of [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]]) { ctx.beginPath(); ctx.arc(x * u, y * u, u * 0.16, 0, Math.PI * 2); ctx.fill(); }
            break;
        }
        case "estrela": {
            const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.45 : 1; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
            poli(pts); break;
        }
        case "pessoa":
            ctx.beginPath(); ctx.arc(0, -u * 0.45, u * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-u * 0.9, u * 0.9); ctx.quadraticCurveTo(0, -u * 0.35, u * 0.9, u * 0.9); ctx.closePath(); ctx.fill();
            break;
        case "engrenagem":
            for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-u * 0.16, -u * 1.02, u * 0.32, u * 0.45); ctx.restore(); }
            ctx.beginPath(); ctx.arc(0, 0, u * 0.78, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(0, 0, u * 0.32, 0, Math.PI * 2); ctx.fill();
            break;
        case "raio":
            poli([[0.2, -1], [-0.7, 0.15], [-0.05, 0.15], [-0.25, 1], [0.75, -0.2], [0.05, -0.2]]);
            break;
        case "info":
            ctx.font = `bold ${Math.round(u * 1.9)}px "Times New Roman", "DejaVu Serif", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("i", 0, u * 0.05); break;
        case "power":
            ctx.beginPath(); ctx.arc(0, u * 0.1, u * 0.8, -Math.PI * 0.32, Math.PI * 1.32, false); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, -u * 0.95); ctx.lineTo(0, u * 0.1); ctx.stroke();
            break;
        case "nota":
            ctx.beginPath(); ctx.ellipse(-u * 0.4, u * 0.6, u * 0.4, u * 0.3, -0.4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-u * 0.05, u * 0.55); ctx.lineTo(-u * 0.05, -u * 0.9); ctx.lineTo(u * 0.8, -u * 0.6); ctx.lineTo(u * 0.8, -u * 0.25); ctx.lineTo(-u * 0.05, -u * 0.55); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-u * 0.05, 0.55 * u); ctx.lineTo(-u * 0.05, -u * 0.9); ctx.stroke();
            break;
        default:
            poli([[0, -1], [0.9, 0.7], [-0.9, 0.7]]);
    }
    ctx.restore();
}

async function criarCardMenuTema({ tema = {}, botName, ownerName, prefix, total, fotoBuffer, amostra, secoesTitulos }) {
    return require("../cards-novos/cards-novos").criarCardMenuCategoria({ tema, botName, prefix, total, amostra, secoesTitulos, arteBuffer: fotoBuffer, desenharEmblema: desenharEmblemaTema });
}

async function criarCardSolicitacaoRecusada({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer, nomeQuemRecusou }) {
    return require("../cards-novos/cards-novos").criarCartazSolicitacao({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer, recusado: true, nomeQuemRecusou });
}


// ───────────────────────────────────────────────
// 🎵 CARD DE MÚSICA
// ───────────────────────────────────────────────
async function criarCardMusica({ capaBuffer, titulo, artista, duracao, fotoContextoBuffer, nomeSolicitante, fundoBuffer, nomeGrupo, visualizacoes, dataPublicacao, canal, resultadoPorArtista }) {
    const W = 1000, H = 520;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // fundo: mesma foto do menu (nítida, sem blur)
    const usouFundoPadrao = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundoPadrao) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#1a1a1a");
        grad.addColorStop(1, "#0a0a0a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = usouFundoPadrao ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, W, H);

    marcaDaguaDVCL(ctx, W, H);
    marcaCantoDestaque(ctx, W, H, "#ff1744");

    // ── DUAS FOTOS QUADRADAS EMPILHADAS DO LADO ESQUERDO ──
    // Em cima: foto de quem pediu a música (ou do grupo) + o nome dela
    // Embaixo: capa da música + o nome da música
    const tamQuadrado = 168, xQuad = 50, raioCanto = 20, gap = 46;
    const yTopo = 46;
    const yBase = yTopo + tamQuadrado + gap;

    async function desenharQuadradoComLegenda(imgBuffer, y, legenda, corLegenda) {
        const img = imgBuffer ? await carregarImagemComDiagnostico(imgBuffer, "quadrado do card de música") : null;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xQuad + raioCanto, y);
        ctx.arcTo(xQuad + tamQuadrado, y, xQuad + tamQuadrado, y + tamQuadrado, raioCanto);
        ctx.arcTo(xQuad + tamQuadrado, y + tamQuadrado, xQuad, y + tamQuadrado, raioCanto);
        ctx.arcTo(xQuad, y + tamQuadrado, xQuad, y, raioCanto);
        ctx.arcTo(xQuad, y, xQuad + tamQuadrado, y, raioCanto);
        ctx.closePath();
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#222";
        ctx.fill();
        ctx.clip();
        ctx.shadowBlur = 0;

        if (img) {
            const escala = Math.max(tamQuadrado / img.width, tamQuadrado / img.height);
            const w = img.width * escala, h = img.height * escala;
            ctx.drawImage(img, xQuad + (tamQuadrado - w) / 2, y + (tamQuadrado - h) / 2, w, h);
        } else {
            ctx.fillStyle = "#333";
            ctx.fillRect(xQuad, y, tamQuadrado, tamQuadrado);
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.font = `bold 20px ${FONTE_PRINCIPAL}`;
            ctx.textAlign = "center";
            ctx.fillText("?", xQuad + tamQuadrado / 2, y + tamQuadrado / 2 + 8);
        }
        ctx.restore();

        // aro colorido em volta do quadrado
        ctx.save();
        ctx.strokeStyle = corLegenda;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xQuad + raioCanto, y);
        ctx.arcTo(xQuad + tamQuadrado, y, xQuad + tamQuadrado, y + tamQuadrado, raioCanto);
        ctx.arcTo(xQuad + tamQuadrado, y + tamQuadrado, xQuad, y + tamQuadrado, raioCanto);
        ctx.arcTo(xQuad, y + tamQuadrado, xQuad, y, raioCanto);
        ctx.arcTo(xQuad, y, xQuad + tamQuadrado, y, raioCanto);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // legenda (nome) logo abaixo do quadrado, cabendo na largura dele
        if (legenda) {
            ctx.save();
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 6;
            ctx.font = `bold 16px ${FONTE_PRINCIPAL}`;
            const linhas = quebrarTexto(ctx, legenda, tamQuadrado + 10);
            ctx.fillText(linhas[0] || legenda, xQuad + tamQuadrado / 2, y + tamQuadrado + 22);
            ctx.restore();
        }
    }

    await desenharQuadradoComLegenda(fotoContextoBuffer, yTopo, nomeSolicitante ? `👤 ${nomeSolicitante}` : null, "#ff1744");
    await desenharQuadradoComLegenda(capaBuffer, yBase, titulo ? `🎵 ${titulo}` : null, "#ffd166");

    // ── TEXTO CENTRAL/DIREITA: tocando agora + artista + duração ──
    const xTexto = xQuad + tamQuadrado + 60;
    let yTexto = 130;

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 8;
    ctx.font = `bold 24px ${FONTE_PRINCIPAL}`;
    ctx.fillText("🎵 TOCANDO AGORA", xTexto, yTexto);

    yTexto += 54;
    ctx.font = `bold 40px ${FONTE_TITULO}`;
    const linhasTitulo = quebrarTexto(ctx, titulo || "Título desconhecido", W - xTexto - 60);
    for (const linha of linhasTitulo.slice(0, 2)) {
        ctx.fillText(linha, xTexto, yTexto);
        yTexto += 46;
    }

    yTexto += 14;
    ctx.font = `28px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(artista || "Artista desconhecido", xTexto, yTexto);

    if (duracao) {
        yTexto += 38;
        ctx.font = `22px ${FONTE_PRINCIPAL}`;
        ctx.fillStyle = "rgba(255,255,255,0.65)";
        ctx.fillText(`⏱ ${duracao}`, xTexto, yTexto);
    }

    // ── DETALHES EXTRA: grupo, canal, visualizações/data, resultado por artista ──
    ctx.font = `19px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";

    if (nomeGrupo) {
        yTexto += 34;
        const linhasGrupo = quebrarTexto(ctx, `📍 ${nomeGrupo}`, W - xTexto - 60);
        ctx.fillText(linhasGrupo[0], xTexto, yTexto);
    }

    if (canal && canal !== artista) {
        yTexto += 30;
        const linhasCanal = quebrarTexto(ctx, `📺 ${canal}`, W - xTexto - 60);
        ctx.fillText(linhasCanal[0], xTexto, yTexto);
    }

    const detalhesExtra = [
        visualizacoes ? `👁 ${visualizacoes}` : null,
        dataPublicacao ? `📅 ${dataPublicacao}` : null
    ].filter(Boolean).join("   ");
    if (detalhesExtra) {
        yTexto += 30;
        ctx.fillText(detalhesExtra, xTexto, yTexto);
    }

    if (resultadoPorArtista) {
        yTexto += 30;
        ctx.fillStyle = "rgba(255,209,102,0.85)";
        ctx.font = `italic 18px ${FONTE_PRINCIPAL}`;
        ctx.fillText("🎤 resultado por artista", xTexto, yTexto);
    }

    desenharAssinaturaDVCL(ctx, W, H);

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🏆 CARD DE LEVEL UP (PERSONALIZADO — PERFIL + NÍVEL)
// ───────────────────────────────────────────────
async function criarCardLevelUp({ fotoBuffer, nomeUsuario, novoNivel, ouroGanho, fotoContextoBuffer, fundoBuffer }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // fundo: mesma foto usada no menu, com véu dourado por cima pra manter
    // a identidade festiva do card (antes era só gradiente dourado liso)
    const usouFundoPadrao = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundoPadrao) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#1a1102");
        grad.addColorStop(0.5, "#4a2f00");
        grad.addColorStop(1, "#a86a00");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    } else {
        ctx.fillStyle = "rgba(74,47,0,0.55)"; // véu dourado translúcido sobre a foto
        ctx.fillRect(0, 0, W, H);
    }

    confete(ctx, W, H, 90);

    // moldura decorativa dourada
    ctx.save();
    ctx.strokeStyle = "rgba(255,215,100,0.9)";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    // 📸 foto de quem chamou (ou do grupo) no canto
    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);

    // avatar QUADRADO (foto do perfil, ou nome/número se não tiver foto)
    const avTam = 200, avX = W / 2 - avTam / 2, avY = 90;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, "#ffd166", nomeUsuario);

    // selo de nível sobre o avatar (canto inferior direito do quadrado)
    const selX = avX + avTam - 10, selY = avY + avTam - 10;
    ctx.save();
    ctx.beginPath();
    ctx.arc(selX, selY, 38, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#3a1c00";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText(novoNivel, selX, selY + 2);
    ctx.restore();

    // título
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 12;
    ctx.font = `bold 52px ${FONTE_TITULO}`;
    ctx.fillText("LEVEL UP! 🎉", W / 2, 345);

    // nome do usuário
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 36px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, W / 2, 395);

    // nível e recompensa
    ctx.shadowBlur = 0;
    ctx.font = `30px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`📈 Novo nível: ${novoNivel}`, W / 2, 450);
    ctx.font = `26px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,230,150,0.95)";
    ctx.fillText(`🪙 +${ouroGanho} de Ouro`, W / 2, 486);

    marcaCantoDestaque(ctx, W, H, "#ffd166");
    desenharAssinaturaDVCL(ctx, W, H, "#ffd166");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🪪 CARD DE PERFIL — foto, patente, nível, barra de progresso
// ───────────────────────────────────────────────
async function criarCardPerfil({ fotoBuffer, nomeUsuario, numero, patente, nivel, exp, expNecessario, moedas, vitorias, derrotas, fotoContextoBuffer, fundoBuffer, comentario }) {
    const W = 1000, H = 600;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // paleta reaproveitada (mesma família visual dos outros cards)
    const paleta = PALETAS_BOASVINDAS[nivel % PALETAS_BOASVINDAS.length];

    // fundo: mesma foto usada no menu (config.BOT_PHOTO/menu.png), igual
    // já é feito na música/casal — antes aqui só tinha gradiente de cor.
    const usouFundoPadrao = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundoPadrao) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, paleta.cores[0]);
        grad.addColorStop(0.5, paleta.cores[1]);
        grad.addColorStop(1, paleta.cores[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    } else {
        // véu leve só pra dar contraste no texto, sem esconder a foto
        ctx.fillStyle = "rgba(0,0,0,0.30)";
        ctx.fillRect(0, 0, W, H);
    }

    // moldura decorativa
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    // avatar QUADRADO na LATERAL ESQUERDA (não fica mais centralizado)
    const avTam = 260, avX = 70, avY = (H - avTam) / 2;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, paleta.anel, nomeUsuario);

    // ── INFORMAÇÕES ocupando o espaço do lado direito ──
    const xInfo = avX + avTam + 55;
    const larguraInfo = W - xInfo - 50;
    let y = 105;

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.font = `bold 40px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, xInfo, y);

    // número explícito, numa linha própria (antes só "aparecia" embutido
    // no @nome — agora fica separado e claro)
    if (numero && numero !== nomeUsuario) {
        y += 32;
        ctx.shadowBlur = 0;
        ctx.font = `22px ${FONTE_PRINCIPAL}`;
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(`📱 ${numero}`, xInfo, y);
    }

    y += 42;
    ctx.shadowBlur = 0;
    ctx.fillStyle = paleta.titulo;
    ctx.font = `bold 28px ${FONTE_TITULO}`;
    ctx.fillText(patente, xInfo, y);

    y += 38;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`⭐ Nível ${nivel}`, xInfo, y);

    // barra de progresso desenhada (não em texto)
    y += 26;
    const barW = larguraInfo, barH = 24, barX = xInfo;
    const progresso = Math.max(0, Math.min(1, exp / expNecessario));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    desenharRetanguloArredondado(ctx, barX, y, barW, barH, 12);
    ctx.fill();
    if (progresso > 0) {
        ctx.fillStyle = paleta.anel;
        desenharRetanguloArredondado(ctx, barX, y, barW * progresso, barH, 12);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    desenharRetanguloArredondado(ctx, barX, y, barW, barH, 12);
    ctx.stroke();
    ctx.restore();

    y += barH + 30;
    ctx.fillStyle = "#ffffff";
    ctx.font = `19px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`${exp} / ${expNecessario} EXP (${Math.floor(progresso * 100)}%)`, xInfo, y);

    // recursos (moedas / vitórias / derrotas)
    y += 36;
    ctx.font = `23px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`💸 ${Number(moedas).toLocaleString("pt-BR")}   ✅ ${vitorias}   ❌ ${derrotas}`, xInfo, y);

    // comentário gerado (antes só vinha no texto da mensagem — agora fica
    // tudo dentro do card, a mensagem em si vira só a marcação da pessoa)
    if (comentario) {
        y += 38;
        ctx.font = `italic 19px ${FONTE_PRINCIPAL}`;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        const linhasComentario = quebrarTexto(ctx, comentario, larguraInfo);
        for (const linha of linhasComentario.slice(0, 2)) {
            ctx.fillText(linha, xInfo, y);
            y += 25;
        }
    }

    marcaCantoDestaque(ctx, W, H, paleta.titulo);
    desenharAssinaturaDVCL(ctx, W, H, paleta.titulo);

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 😏 CARD DO BLOQUEIO DE MENU NO PV — avatar quadrado na LATERAL
// (não mais centralizado), SEM a bolinha de contexto no canto (redundante
// aqui, já que é a mesma pessoa), e as informações ocupando o espaço
// que sobrou do lado oposto ao quadrado.
// ───────────────────────────────────────────────
async function criarCardBloqueioPV({ fotoBuffer, nomeUsuario, patente, nivel, exp, expNecessario, moedas, vitorias, derrotas, fundoBuffer }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const paleta = PALETAS_BOASVINDAS[nivel % PALETAS_BOASVINDAS.length];

    const usouFundoPadrao = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundoPadrao) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, paleta.cores[0]);
        grad.addColorStop(0.5, paleta.cores[1]);
        grad.addColorStop(1, paleta.cores[2]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    } else {
        ctx.fillStyle = "rgba(0,0,0,0.30)";
        ctx.fillRect(0, 0, W, H);
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    // avatar QUADRADO na lateral ESQUERDA (antes ficava centralizado)
    const avTam = 260, avX = 70, avY = (H - avTam) / 2;
    await desenharAvatarQuadrado(ctx, fotoBuffer, avX, avY, avTam, paleta.anel, nomeUsuario);

    // ── INFORMAÇÕES ocupando o espaço do lado direito ──
    const xInfo = avX + avTam + 60;
    let y = 150;

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    ctx.font = `bold 40px ${FONTE_TITULO}`;
    ctx.fillText(`@${nomeUsuario}`, xInfo, y);

    y += 46;
    ctx.fillStyle = paleta.titulo;
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText(patente, xInfo, y);

    y += 44;
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `26px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`⭐ Nível ${nivel}`, xInfo, y);

    // barra de progresso
    y += 30;
    const barW = W - xInfo - 70, barH = 26, barX = xInfo;
    const progresso = Math.max(0, Math.min(1, exp / expNecessario));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    desenharRetanguloArredondado(ctx, barX, y, barW, barH, 13);
    ctx.fill();
    if (progresso > 0) {
        ctx.fillStyle = paleta.anel;
        desenharRetanguloArredondado(ctx, barX, y, barW * progresso, barH, 13);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    desenharRetanguloArredondado(ctx, barX, y, barW, barH, 13);
    ctx.stroke();
    ctx.restore();

    y += barH + 34;
    ctx.fillStyle = "#ffffff";
    ctx.font = `20px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`${exp} / ${expNecessario} EXP (${Math.floor(progresso * 100)}%)`, xInfo, y);

    y += 50;
    ctx.font = `24px ${FONTE_PRINCIPAL}`;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`💸 ${Number(moedas).toLocaleString("pt-BR")}   ✅ ${vitorias}   ❌ ${derrotas}`, xInfo, y);

    marcaCantoDestaque(ctx, W, H, paleta.titulo);
    desenharAssinaturaDVCL(ctx, W, H, paleta.titulo);

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🙋 CARD DE SOLICITAÇÃO DE ENTRADA — foto de fundo (menu.png), nome do
// grupo num selo no canto, foto (se tiver) e nome de quem pediu pra entrar.
// ───────────────────────────────────────────────

// ───────────────────────────────────────────────
// ❌ CARD DE SOLICITAÇÃO RECUSADA — mesma linha visual do card de
// solicitação (mesma foto de fundo, mesmo selo do grupo), mas mostrando
// as DUAS pessoas: quem pediu pra entrar (recusado) e o admin que recusou.
// ───────────────────────────────────────────────

function desenharRetanguloArredondado(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ───────────────────────────────────────────────
// 🖤 CARD DO MENU — a foto do menu.png cobre o card INTEIRO (fundo cheio,
// nítida, sem quadrado pequeno), com uma caixinha no canto inferior
// esquerdo mostrando o nome do bot e o criador (tudo dinâmico).
// Sem foto: fundo escuro liso no lugar (nunca mais aquele vermelho
// gigante com rachaduras/raios cobrindo a tela inteira).
// ───────────────────────────────────────────────
async function criarCardMenu({ fotoBuffer, botName, ownerName, fotoContextoBuffer }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    // ── FUNDO: a foto do menu.png cobrindo o card inteiro, NÍTIDA, sem blur ──
    let temFoto = false;
    if (fotoBuffer) {
        const img = await carregarImagemComDiagnostico(fotoBuffer, "menu.png (card do menu)");
        if (img) {
            const escala = Math.max(W / img.width, H / img.height);
            const w = img.width * escala;
            const h = img.height * escala;
            ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
            temFoto = true;
        }
    } else {
        console.error("❌ Nenhum buffer de foto foi passado pro card do menu (menu.png não encontrado).");
    }

    // Se mesmo assim a foto não carregar, usa só um fundo escuro liso.
    if (!temFoto) {
        ctx.fillStyle = "#0a0303";
        ctx.fillRect(0, 0, W, H);
    }

    // véu bem leve só embaixo, pra dar contraste pro texto do carimbo sem
    // esconder a foto no resto do card
    const veu = ctx.createLinearGradient(0, H * 0.55, 0, H);
    veu.addColorStop(0, "rgba(0,0,0,0)");
    veu.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = veu;
    ctx.fillRect(0, H * 0.55, W, H * 0.45);

    // moldura fina vermelha em volta do card inteiro
    ctx.save();
    ctx.strokeStyle = "rgba(255,23,68,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    // 📸 foto de quem chamou o menu (ou do grupo) no canto superior direito
    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);

    // ── CARTELA/SELO no canto inferior esquerdo com o nome do bot e do criador ──
    const padX = 26;
    ctx.font = `bold 34px ${FONTE_TITULO}`;
    const larguraNome = ctx.measureText(botName.toUpperCase()).width;
    const boxW = Math.max(larguraNome + padX * 2, 300);
    const boxH = 100;
    const boxX = 34;
    const boxY = H - boxH - 34;

    ctx.save();
    ctx.fillStyle = "rgba(10,2,2,0.72)";
    desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.strokeStyle = "#ff1744";
    ctx.lineWidth = 2.5;
    desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.font = `bold 34px ${FONTE_TITULO}`;
    ctx.fillText(botName.toUpperCase(), boxX + padX, boxY + 42);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff5c7a";
    ctx.font = `bold 18px ${FONTE_PRINCIPAL}`;
    ctx.fillText("PAINEL DE COMANDOS ⚡", boxX + padX, boxY + 68);

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `16px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`👑 criado por ${ownerName}`, boxX + padX, boxY + 90);

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 💞 CARD DE CASAL — duas fotos quadradas lado a lado + barra de compatibilidade
// ───────────────────────────────────────────────
async function criarCardCasal({ fotoBuffer1, nomeUsuario1, fotoBuffer2, nomeUsuario2, porcentagem, fotoContextoBuffer, fundoBuffer }) {
    const W = 1000, H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const usouFundo = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundo) {
        const gradBase = ctx.createLinearGradient(0, 0, W, H);
        gradBase.addColorStop(0, "#210510");
        gradBase.addColorStop(0.5, "#3a0a1c");
        gradBase.addColorStop(1, "#0a0305");
        ctx.fillStyle = gradBase;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = usouFundo ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, W, H);

    coracoesFlutuantes(ctx, W, H, 22);

    ctx.save();
    ctx.strokeStyle = "rgba(255,23,90,0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    // 📸 foto de quem chamou (ou do grupo) no canto
    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);

    // título
    ctx.textAlign = "center";
    ctx.fillStyle = "#ff5c8a";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 14;
    ctx.font = `bold 42px ${FONTE_TITULO}`;
    ctx.fillText("💘 TESTE DE CASAL 💘", W / 2, 70);
    ctx.shadowBlur = 0;

    // duas fotos quadradas, lado a lado, com coração no meio
    const tamFoto = 260;
    const yFoto = 120;
    const xFoto1 = W / 2 - tamFoto - 40;
    const xFoto2 = W / 2 + 40;

    await desenharAvatarQuadrado(ctx, fotoBuffer1, xFoto1, yFoto, tamFoto, "#ff1744", nomeUsuario1);
    await desenharAvatarQuadrado(ctx, fotoBuffer2, xFoto2, yFoto, tamFoto, "#ff1744", nomeUsuario2);

    // coração no centro, entre as duas fotos
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `54px ${FONTE_TITULO}`;
    ctx.fillStyle = "#ff1744";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    ctx.fillText("💞", W / 2, yFoto + tamFoto / 2);
    ctx.restore();

    // nomes abaixo das fotos
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold 24px ${FONTE_TITULO}`;
    ctx.shadowBlur = 0;
    ctx.fillText(`@${nomeUsuario1}`, xFoto1 + tamFoto / 2, yFoto + tamFoto + 38);
    ctx.fillText(`@${nomeUsuario2}`, xFoto2 + tamFoto / 2, yFoto + tamFoto + 38);

    // barra de compatibilidade
    const barW = 640, barH = 30, barX = (W - barW) / 2, barY = yFoto + tamFoto + 78;
    const progresso = Math.max(0, Math.min(1, porcentagem / 100));
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    desenharRetanguloArredondado(ctx, barX, barY, barW, barH, 15);
    ctx.fill();
    if (progresso > 0) {
        const gradBar = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        gradBar.addColorStop(0, "#ff1744");
        gradBar.addColorStop(1, "#ff5c8a");
        ctx.fillStyle = gradBar;
        desenharRetanguloArredondado(ctx, barX, barY, barW * progresso, barH, 15);
        ctx.fill();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    desenharRetanguloArredondado(ctx, barX, barY, barW, barH, 15);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = `bold 22px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`${porcentagem}% de compatibilidade`, W / 2, barY + barH + 34);

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 📊 CARD DE RESUMO DO GRUPO — estatísticas do dia + ranking dos mais
// ativos (já com nome/número corretos, resolvidos antes de chegar aqui)
// em vez do texto cru em caixinha ASCII que ficava bagunçado no WhatsApp.
// ───────────────────────────────────────────────
async function criarCardResumo({ nomeGrupo, dataTexto, totalMensagens, totalParticipantes, totalMembros, ranking = [], comandosTop = [], tiposTop = [], fotoContextoBuffer, fundoBuffer }) {
    const W = 1000, H = 720;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const usouFundo = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundo) {
        ctx.fillStyle = "#0a0303";
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(6,2,2,0.72)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = "rgba(255,23,68,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 12;
    ctx.font = `bold 40px ${FONTE_TITULO}`;
    ctx.fillText("📊 RESUMO DO DIA", 40, 68);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff5c7a";
    ctx.font = `bold 24px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`🏷️ ${nomeGrupo}`, 40, 104);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `18px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`📅 ${dataTexto}`, 40, 130);

    // caixinhas de estatística (mensagens / participantes / membros)
    const stats = [
        { label: "MENSAGENS", valor: totalMensagens },
        { label: "PARTICIPARAM", valor: totalParticipantes },
        { label: "MEMBROS", valor: totalMembros },
    ];
    const boxW = 288, boxH = 84, boxGap = 24, boxY = 156;
    stats.forEach((s, i) => {
        const boxX = 40 + i * (boxW + boxGap);
        ctx.save();
        ctx.fillStyle = "rgba(20,6,6,0.65)";
        desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,23,68,0.5)";
        ctx.lineWidth = 2;
        desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 16);
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = "center";
        ctx.fillStyle = "#ffffff";
        ctx.font = `bold 32px ${FONTE_TITULO}`;
        ctx.fillText(String(s.valor), boxX + boxW / 2, boxY + 40);
        ctx.fillStyle = "#ff9aac";
        ctx.font = `bold 14px ${FONTE_PRINCIPAL}`;
        ctx.fillText(s.label, boxX + boxW / 2, boxY + 64);
    });

    // ranking (top 5) com barra proporcional
    let y = 280;
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold 22px ${FONTE_TITULO}`;
    ctx.fillText("🏆 MAIS ATIVOS", 40, y);
    y += 30;

    const medalhas = ["🥇", "🥈", "🥉"];
    const maiorQtd = ranking.length ? Math.max(...ranking.map(r => r.qtd)) : 0;
    if (!ranking.length) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = `18px ${FONTE_PRINCIPAL}`;
        ctx.fillText("Ainda não há mensagens registradas hoje.", 40, y + 10);
        y += 40;
    } else {
        ranking.slice(0, 5).forEach((item, i) => {
            const posicao = medalhas[i] || `${i + 1}º`;
            const barMaxW = 760;
            const barW = maiorQtd ? Math.max(20, (item.qtd / maiorQtd) * barMaxW) : 0;

            ctx.fillStyle = "rgba(255,255,255,0.08)";
            desenharRetanguloArredondado(ctx, 40, y - 20, barMaxW + 60, 30, 10);
            ctx.fill();
            ctx.fillStyle = "rgba(255,23,68,0.55)";
            desenharRetanguloArredondado(ctx, 40, y - 20, barW + 60, 30, 10);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold 17px ${FONTE_PRINCIPAL}`;
            const nomeExibido = item.nome.length > 26 ? item.nome.slice(0, 24) + "…" : item.nome;
            ctx.fillText(`${posicao} ${nomeExibido}`, 50, y + 1);

            ctx.textAlign = "right";
            ctx.fillStyle = "#ffd166";
            ctx.fillText(`${item.qtd} msg`, 780, y + 1);
            ctx.textAlign = "left";

            y += 38;
        });
    }

    // comandos mais usados
    y += 14;
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold 20px ${FONTE_TITULO}`;
    ctx.fillText("🧰 COMANDOS MAIS USADOS", 40, y);
    y += 26;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `16px ${FONTE_PRINCIPAL}`;
    const textoComandos = comandosTop.length ? comandosTop.map(c => `${c.nome} (${c.qtd})`).join("   •   ") : "Nenhum comando usado hoje.";
    quebrarTexto(ctx, textoComandos, 900).slice(0, 2).forEach(linha => { ctx.fillText(linha, 40, y); y += 22; });

    // tipos de conteúdo
    y += 10;
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold 20px ${FONTE_TITULO}`;
    ctx.fillText("📦 CONTEÚDOS", 40, y);
    y += 26;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `16px ${FONTE_PRINCIPAL}`;
    const textoTipos = tiposTop.length ? tiposTop.map(t => `${t.nome}: ${t.qtd}`).join("   •   ") : "Sem dados de mídia hoje.";
    quebrarTexto(ctx, textoTipos, 900).slice(0, 2).forEach(linha => { ctx.fillText(linha, 40, y); y += 22; });

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🏆 CARD DO TOP 10 — ranking isolado dos mais ativos do grupo, com
// medalha nos 3 primeiros e nome/número já resolvidos.
// ───────────────────────────────────────────────
async function criarCardTop10({ nomeGrupo, ranking = [], fotoContextoBuffer, fundoBuffer }) {
    const W = 1000, H = 700;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const usouFundo = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundo) {
        ctx.fillStyle = "#0a0303";
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(6,2,2,0.72)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = "rgba(255,209,102,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd166";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 12;
    ctx.font = `bold 42px ${FONTE_TITULO}`;
    ctx.fillText("🏆 TOP 10 MAIS ATIVOS", W / 2, 70);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `20px ${FONTE_PRINCIPAL}`;
    ctx.fillText(nomeGrupo, W / 2, 100);

    ctx.textAlign = "left";
    let y = 150;
    const medalhas = ["🥇", "🥈", "🥉"];
    const maiorQtd = ranking.length ? Math.max(...ranking.map(r => r.qtd)) : 0;

    if (!ranking.length) {
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = `20px ${FONTE_PRINCIPAL}`;
        ctx.fillText("Ainda não há mensagens registradas hoje.", W / 2, 300);
    } else {
        ranking.slice(0, 10).forEach((item, i) => {
            const posicao = medalhas[i] || `${i + 1}º`;
            const barMaxW = 760;
            const barW = maiorQtd ? Math.max(24, (item.qtd / maiorQtd) * barMaxW) : 0;

            ctx.fillStyle = "rgba(255,255,255,0.08)";
            desenharRetanguloArredondado(ctx, 40, y - 24, barMaxW + 120, 42, 12);
            ctx.fill();
            ctx.fillStyle = i < 3 ? "rgba(255,209,102,0.55)" : "rgba(255,23,68,0.45)";
            desenharRetanguloArredondado(ctx, 40, y - 24, barW + 120, 42, 12);
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.font = `bold 20px ${FONTE_PRINCIPAL}`;
            const nomeExibido = item.nome.length > 30 ? item.nome.slice(0, 28) + "…" : item.nome;
            ctx.fillText(`${posicao}  ${nomeExibido}`, 56, y + 3);

            ctx.textAlign = "right";
            ctx.fillStyle = "#ffd166";
            ctx.font = `bold 18px ${FONTE_PRINCIPAL}`;
            ctx.fillText(`${item.qtd} msg`, 780, y + 3);
            ctx.textAlign = "left";

            y += 52;
        });
    }

    marcaCantoDestaque(ctx, W, H, "#ffd166");
    desenharAssinaturaDVCL(ctx, W, H, "#ffd166");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 🎵 CARD DO MENU DE MÍDIAS — mesma linguagem visual do menu principal
// (foto cobrindo o card + selo no canto inferior), com o nome de quem
// pediu carimbado na própria imagem e a marca do bot sempre presente.
// ───────────────────────────────────────────────
async function criarCardMenuMidias({ fotoBuffer, botName, nomeSolicitante, fotoContextoBuffer, fundoBuffer }) {
    const W = 1000, H = 620;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    let temFoto = false;
    if (fotoBuffer) {
        const img = await carregarImagemComDiagnostico(fotoBuffer, "media_menu_card.png (card do menu de mídias)");
        if (img) {
            const escala = Math.max(W / img.width, H / img.height);
            const w = img.width * escala, h = img.height * escala;
            ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
            temFoto = true;
        }
    }
    if (!temFoto) {
        const usouFundo = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
        if (!usouFundo) {
            ctx.fillStyle = "#0a0303";
            ctx.fillRect(0, 0, W, H);
        }
    }

    const veu = ctx.createLinearGradient(0, H * 0.5, 0, H);
    veu.addColorStop(0, "rgba(0,0,0,0)");
    veu.addColorStop(1, "rgba(0,0,0,0.6)");
    ctx.fillStyle = veu;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    ctx.save();
    ctx.strokeStyle = "rgba(255,23,68,0.55)";
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, W - 32, H - 32);
    ctx.restore();

    await desenharFotoCantoContexto(ctx, W, H, fotoContextoBuffer);

    // selo com "CENTRAL DE MÍDIAS" + nome do bot + quem pediu
    const padX = 26;
    ctx.font = `bold 32px ${FONTE_TITULO}`;
    const larguraTitulo = ctx.measureText("CENTRAL DE MÍDIAS").width;
    const boxW = Math.max(larguraTitulo + padX * 2, 320);
    const boxH = 100;
    const boxX = 34, boxY = H - boxH - 34;

    ctx.save();
    ctx.fillStyle = "rgba(10,2,2,0.72)";
    desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.fill();
    ctx.strokeStyle = "#ff1744";
    ctx.lineWidth = 2.5;
    desenharRetanguloArredondado(ctx, boxX, boxY, boxW, boxH, 18);
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 10;
    ctx.font = `bold 30px ${FONTE_TITULO}`;
    ctx.fillText("🎵 CENTRAL DE MÍDIAS", boxX + padX, boxY + 42);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff5c7a";
    ctx.font = `bold 16px ${FONTE_PRINCIPAL}`;
    ctx.fillText((botName || obterNomeMarca()).toUpperCase(), boxX + padX, boxY + 66);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `16px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`📥 solicitado por ${nomeSolicitante}`, boxX + padX, boxY + 90);

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// 📢 CARD DE MARCAR TODOS / CONVOCAÇÃO — mostra o grupo, quem convocou e
// a mensagem, SEM listar cada membro (a marcação invisível de todo mundo
// continua acontecendo por fora, no array de "mentions" do envio).
// ───────────────────────────────────────────────
async function criarCardMarcarTodos({ nomeGrupo, nomeSolicitante, mensagem, totalMembros, fundoBuffer }) {
    const W = 1000, H = 460;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");

    const usouFundo = await desenharFundoPadrao(ctx, W, H, fundoBuffer);
    if (!usouFundo) {
        const grad = ctx.createLinearGradient(0, 0, W, H);
        grad.addColorStop(0, "#1a0505");
        grad.addColorStop(1, "#3a0a0a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.fillStyle = "rgba(0,0,0,0.42)";
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = "rgba(255,23,68,0.6)";
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, W - 36, H - 36);
    ctx.restore();

    marcaDaguaDVCL(ctx, W, H);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 14;
    ctx.font = `bold 44px ${FONTE_TITULO}`;
    ctx.fillText("📢 CONVOCAÇÃO GERAL", W / 2, 100);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ff5c7a";
    ctx.font = `bold 26px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`🏷️ ${nomeGrupo || "Grupo"}`, W / 2, 150);

    if (nomeSolicitante) {
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.font = `20px ${FONTE_PRINCIPAL}`;
        ctx.fillText(`👤 solicitado por ${nomeSolicitante}`, W / 2, 182);
    }

    // mensagem central, com quebra de linha
    ctx.fillStyle = "#ffffff";
    ctx.font = `26px ${FONTE_PRINCIPAL}`;
    const linhasMsg = quebrarTexto(ctx, mensagem || "Atenção geral a todos os membros!", W - 140);
    let y = 250;
    for (const linha of linhasMsg.slice(0, 4)) {
        ctx.fillText(linha, W / 2, y);
        y += 36;
    }

    // total de membros marcados (sem listar nome por nome)
    y += 20;
    ctx.fillStyle = "#ffd166";
    ctx.font = `bold 24px ${FONTE_PRINCIPAL}`;
    ctx.fillText(`👥 ${totalMembros} membros marcados`, W / 2, y);

    marcaCantoDestaque(ctx, W, H, "#ff1744");
    desenharAssinaturaDVCL(ctx, W, H, "#ff1744");

    return canvas.encode("png");
}

// ───────────────────────────────────────────────
// ⚔️🦵🖐️ ANIMAÇÃO DE INTERAÇÃO (matar / chute / tapa) — usa a FOTO REAL
// de quem apanhou (em vez do gif genérico de antes) com uma animação
// simples desenhada quadro a quadro: espada fatiando o avatar, pé
// chutando ele pra longe, ou mão batendo nele repetidas vezes.
// ───────────────────────────────────────────────
async function criarAnimacaoInteracao({ tipo, fotoBuffer, nomeAlvo }) {
    const W = 700, H = 700;
    const FRAMES = 14;
    const DURACAO = 1.6; // segundos

    const paletas = {
        matar: { c1: "#3a0000", c2: "#0d0000", destaque: "#ff1744" },
        tapa: { c1: "#3a2100", c2: "#140b00", destaque: "#ffb703" },
        chute: { c1: "#001b3a", c2: "#00060f", destaque: "#4cc9f0" }
    };
    const paleta = paletas[tipo] || paletas.matar;

    // decodifica a foto UMA vez só (não a cada quadro, senão fica lento à toa)
    const img = fotoBuffer ? await carregarImagemComDiagnostico(fotoBuffer, `avatar interação (${tipo})`) : null;

    function desenharAvatarBase(ctxAlvo, cx, cy, raio) {
        ctxAlvo.save();
        ctxAlvo.beginPath();
        ctxAlvo.arc(cx, cy, raio, 0, Math.PI * 2);
        ctxAlvo.closePath();
        ctxAlvo.clip();
        if (img) {
            const escala = Math.max((raio * 2) / img.width, (raio * 2) / img.height);
            const w = img.width * escala, h = img.height * escala;
            ctxAlvo.drawImage(img, cx - w / 2, cy - h / 2, w, h);
        } else {
            const grad = ctxAlvo.createLinearGradient(cx - raio, cy - raio, cx + raio, cy + raio);
            grad.addColorStop(0, "#3a1c71");
            grad.addColorStop(1, "#6a3de8");
            ctxAlvo.fillStyle = grad;
            ctxAlvo.fillRect(cx - raio, cy - raio, raio * 2, raio * 2);
            if (nomeAlvo) {
                ctxAlvo.fillStyle = "#ffffff";
                ctxAlvo.textAlign = "center";
                ctxAlvo.textBaseline = "middle";
                ctxAlvo.font = `bold ${Math.round(raio * 0.4)}px ${FONTE_TITULO}`;
                ctxAlvo.fillText(nomeAlvo, cx, cy);
            }
        }
        ctxAlvo.restore();
    }

    const pastaTemp = path.join(__dirname, `interacao_${Date.now()}_${Math.floor(Math.random() * 9999)}`);
    fs.mkdirSync(pastaTemp, { recursive: true });

    // 💥 pedaços do estilhaço do "matar" — definidos UMA vez (fora do loop
    // de frames) pra cada pedaço ter sempre a mesma forma e trajetória em
    // todos os quadros, só avançando com o tempo.
    const NUM_CACOS = 7;
    const cacos = [];
    for (let i = 0; i < NUM_CACOS; i++) {
        const anguloIni = (i / NUM_CACOS) * Math.PI * 2;
        const anguloFim = ((i + 1) / NUM_CACOS) * Math.PI * 2;
        const anguloMeio = (anguloIni + anguloFim) / 2;
        cacos.push({
            anguloIni,
            anguloFim,
            dirX: Math.cos(anguloMeio),
            dirY: Math.sin(anguloMeio),
            velocidade: 0.75 + Math.random() * 0.6,
            rotVel: (Math.random() - 0.5) * 3.5
        });
    }

    try {
        for (let i = 0; i < FRAMES; i++) {
            const t = i / (FRAMES - 1); // 0 → 1
            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext("2d");

            const grad = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, W * 0.75);
            grad.addColorStop(0, paleta.c1);
            grad.addColorStop(1, paleta.c2);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, W, H);

            ctx.save();
            ctx.strokeStyle = paleta.destaque + "aa";
            ctx.lineWidth = 5;
            ctx.strokeRect(14, 14, W - 28, H - 28);
            ctx.restore();

            const cx = W / 2, cy = H / 2, raio = 150;

            if (tipo === "matar") {
                // a foto fica TOTALMENTE PARADA/FIXA enquanto a espada
                // atravessa a tela na diagonal; no momento do corte ela
                // se estilhaça em vários pedaços que voam pra fora e somem
                const tCorte = 0.5;
                if (t < tCorte) {
                    desenharAvatarBase(ctx, cx, cy, raio); // parada, sem nenhum movimento
                    const prog = t / tCorte;
                    const espadaX = -200 + prog * (W + 400);
                    ctx.save();
                    ctx.translate(espadaX, H * 0.15 + prog * H * 0.7);
                    ctx.rotate(-Math.PI / 4);
                    ctx.font = "90px sans-serif";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("🗡️", 0, 0);
                    ctx.restore();
                } else {
                    const prog = (t - tCorte) / (1 - tCorte); // 0 → 1

                    for (const caco of cacos) {
                        const dist = prog * prog * 230 * caco.velocidade;
                        const dx = caco.dirX * dist;
                        const dy = caco.dirY * dist;
                        const rot = prog * caco.rotVel;
                        const alpha = Math.max(0, 1 - prog * 1.15);

                        ctx.save();
                        ctx.globalAlpha = alpha;
                        ctx.translate(cx + dx, cy + dy);
                        ctx.rotate(rot);

                        // recorte em formato de fatia (pedaço do círculo original)
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.arc(0, 0, raio, caco.anguloIni, caco.anguloFim);
                        ctx.closePath();
                        ctx.clip();

                        // desenha a foto "de volta" na posição original, pra esse
                        // pedaço mostrar o trecho certo dela enquanto voa
                        ctx.translate(-dx, -dy);
                        desenharAvatarBase(ctx, cx, cy, raio);
                        ctx.restore();
                    }

                    // flash vermelho do impacto, só no comecinho da quebra
                    if (prog < 0.35) {
                        ctx.save();
                        ctx.globalAlpha = (0.35 - prog) / 0.35 * 0.6;
                        ctx.fillStyle = "#ff1744";
                        ctx.beginPath();
                        ctx.arc(cx, cy, raio + 30, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.restore();
                    }
                }

            } else if (tipo === "chute") {
                // mesmo padrão do tapa: a foto balança de um lado pro outro
                // e o pé vai batendo nela, acompanhando o balanço
                const tremorX = Math.sin(t * Math.PI * 10) * 10 * (1 - t * 0.3);
                ctx.save();
                ctx.translate(cx + tremorX, cy);
                desenharAvatarBase(ctx, 0, 0, raio);
                ctx.restore();

                const batidas = [0.12, 0.45, 0.78];
                for (let b = 0; b < batidas.length; b++) {
                    const centro = batidas[b];
                    const janela = 0.12;
                    const dist = Math.abs(t - centro);
                    if (dist < janela) {
                        const proxImpacto = 1 - dist / janela;
                        const ladoEsquerda = b % 2 === 0;
                        // o pé "persegue" a posição atual da foto (cx + tremorX)
                        const alvoX = cx + tremorX;
                        const peX = ladoEsquerda
                            ? alvoX - raio - 100 + proxImpacto * (raio + 70)
                            : alvoX + raio + 100 - proxImpacto * (raio + 70);
                        ctx.save();
                        ctx.translate(peX, cy + 30);
                        if (ladoEsquerda) ctx.scale(-1, 1);
                        ctx.rotate(-0.3);
                        ctx.font = "100px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("🦵", 0, 0);
                        ctx.restore();

                        if (proxImpacto > 0.7) {
                            ctx.save();
                            ctx.globalAlpha = (proxImpacto - 0.7) / 0.3 * 0.5;
                            ctx.fillStyle = paleta.destaque;
                            ctx.beginPath();
                            ctx.arc(cx + tremorX, cy, raio + 8, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                }

            } else if (tipo === "tapa") {
                // a foto balança de um lado pro outro, e a mão vai batendo
                // nela acompanhando o balanço (não bate num ponto fixo)
                const tremorX = Math.sin(t * Math.PI * 10) * 8 * (1 - t * 0.4);
                ctx.save();
                ctx.translate(cx + tremorX, cy);
                desenharAvatarBase(ctx, 0, 0, raio);
                ctx.restore();

                const batidas = [0.12, 0.45, 0.78];
                for (let b = 0; b < batidas.length; b++) {
                    const centro = batidas[b];
                    const janela = 0.12;
                    const dist = Math.abs(t - centro);
                    if (dist < janela) {
                        const proxImpacto = 1 - dist / janela;
                        const ladoEsquerda = b % 2 === 0;
                        // a mão "persegue" a posição atual da foto (cx + tremorX)
                        const alvoX = cx + tremorX;
                        const maoX = ladoEsquerda
                            ? alvoX - raio - 90 + proxImpacto * (raio + 60)
                            : alvoX + raio + 90 - proxImpacto * (raio + 60);
                        ctx.save();
                        ctx.translate(maoX, cy - 20);
                        if (!ladoEsquerda) ctx.scale(-1, 1);
                        ctx.font = "90px sans-serif";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("🖐️", 0, 0);
                        ctx.restore();

                        if (proxImpacto > 0.7) {
                            ctx.save();
                            ctx.globalAlpha = (proxImpacto - 0.7) / 0.3 * 0.5;
                            ctx.fillStyle = "#ff1744";
                            ctx.beginPath();
                            ctx.arc(cx + tremorX, cy, raio + 8, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.restore();
                        }
                    }
                }
            }

            const bufFrame = await canvas.encode("png");
            fs.writeFileSync(path.join(pastaTemp, `f_${String(i).padStart(3, "0")}.png`), bufFrame);
        }

        const saida = path.join(pastaTemp, "saida.mp4");
        const fps = (FRAMES / DURACAO).toFixed(2);
        await execAsync(`ffmpeg -y -framerate ${fps} -i "${path.join(pastaTemp, "f_%03d.png")}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -profile:v baseline -level 3.1 -pix_fmt yuv420p -movflags faststart "${saida}"`);
        return fs.existsSync(saida) ? fs.readFileSync(saida) : null;

    } catch (erro) {
        console.error("❌ Erro ao gerar animação de interação:", erro.message);
        return null;
    } finally {
        fs.rmSync(pastaTemp, { recursive: true, force: true });
    }
}

module.exports = {
    criarCardBoasVindas,
    criarCardBoasVindasAntigo,
    criarCardDespedida,
    criarCardMusica,
    criarCardLevelUp,
    criarCardPerfil,
    criarCardBloqueioPV,
    criarCardMenu,
    criarCardMenuJornal,
    criarCardMenuTema,
    criarCardCasal,
    criarCardSolicitacao,
    criarCardSolicitacaoRecusada,
    criarCardResumo,
    criarCardTop10,
    criarCardMenuMidias,
    criarCardMarcarTodos,
    criarAnimacaoInteracao,
    baixarBuffer,
    detectarFormatoImagem,
    carregarImagemComDiagnostico,
    estaFundoAnimado,
    gerarCardAnimadoComFundo,
};
