const config = require("../../config");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const pino = require("pino");


// =================================================
// 🎨 TABELA DE EFEITOS DE IMAGEM (ImageMagick)
// Pra criar um efeito novo é só acrescentar uma linha: o menu e a validação
// se ajustam sozinhos. "args" vai entre a imagem de entrada e a de saída.
// =================================================
const EFEITOS_IMAGEM = [
    /* 1  */ { nome: "Banner",                 args: `-resize 850x480^ -gravity center -extent 850x480 -bordercolor "#1a1a1a" -border 12 -quality 92` },
    /* 2  */ { nome: "Pixelado",               args: `-scale 6% -scale 1600% -quality 100` },
    /* 3  */ { nome: "Foco / Nitidez",         args: `-normalize -sharpen 0x2.0 -contrast-stretch 2x2%` },
    /* 4  */ { nome: "Recorte Circular ✅",     especial: "circulo" },
    /* 5  */ { nome: "Preto & Branco",         args: `-colorspace Gray -auto-level` },
    /* 6  */ { nome: "Tom Sépia / Antigo",     args: `-colorspace Gray -sepia-tone 65% -brightness-contrast +5x10` },
    /* 7  */ { nome: "Negativo",               args: `-negate` },
    /* 8  */ { nome: "Espelhado",              args: `-flop` },
    /* 9  */ { nome: "De ponta-cabeça",        args: `-flip` },
    /* 10 */ { nome: "Desfoque",               args: `-blur 0x8` },
    /* 11 */ { nome: "Cartoon",                args: `-paint 3 -posterize 6 -modulate 100,150` },
    /* 12 */ { nome: "Desenho a lápis",        args: `-colorspace Gray \\( +clone -negate -blur 0x8 \\) -compose ColorDodge -composite` },
    /* 13 */ { nome: "Pintura a óleo",         args: `-paint 5 -modulate 100,120` },
    /* 14 */ { nome: "Vintage",                args: `-modulate 100,70 -fill "#704214" -colorize 15% -background black -vignette 0x50` },
    /* 15 */ { nome: "Neon",                   args: `-edge 2 -modulate 100,300,100 -auto-level` },
    /* 16 */ { nome: "Alto contraste (HDR)",   args: `-sigmoidal-contrast 8,50% -modulate 100,140` },
    /* 17 */ { nome: "Tom frio (azul)",        args: `-fill "#0044ff" -colorize 20%` },
    /* 18 */ { nome: "Tom quente (laranja)",   args: `-fill "#ff6600" -colorize 20%` },
    /* 19 */ { nome: "Relevo",                 args: `-colorspace Gray -emboss 2 -auto-level` },
    /* 20 */ { nome: "Redemoinho",             args: `-swirl 140` },
    /* 21 */ { nome: "Ondas",                  args: `-background black -wave 12x120` },
    /* 22 */ { nome: "Frito (meme)",           args: `-modulate 100,400 -contrast -contrast -sharpen 0x5 -quality 8` },
    /* 23 */ { nome: "Espelho duplo",          args: `\\( +clone -flop \\) +append` },
    /* 24 */ { nome: "Moldura dourada",        args: `-bordercolor "#d4af37" -border 25 -bordercolor "#8b6914" -border 6` },
    /* 25 */ { nome: "Raio-X",                 args: `-negate -colorspace Gray -contrast-stretch 5%` },
    /* 26 */ { nome: "Mais brilho",            args: `-modulate 130,110` },
    /* 27 */ { nome: "Mais escuro",            args: `-modulate 70` },
    /* 28 */ { nome: "Cores vibrantes",        args: `-modulate 100,250` },
    /* 29 */ { nome: "Girar 90°",              args: `-rotate 90` },
    /* 30 */ { nome: "P&B puro (1-bit)",       args: `-colorspace Gray -monochrome` }
];

function montarComandoEfeito(numero, entrada, saida) {
    const ef = EFEITOS_IMAGEM[numero - 1];
    if (!ef) return null;
    if (ef.especial === "circulo") {
        return `convert -size 550x550 xc:none -fill "${entrada}" -draw "circle 275,275 275,2" "${saida}"`;
    }
    return `convert "${entrada}" ${ef.args} "${saida}"`;
}

async function efeitos(sock, msg, args) {
    args = args || [];

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    const dataAtual = new Date().toLocaleString("pt-BR");
    let ambiente = "Privado";
    if (from.endsWith("@g.us")) ambiente = `Grupo`;


    // 📋 DETECTA: MENSAGEM DIRETA OU RESPONDIDA — ESSENCIAL PARA RC9
    let mensagemParaProcessar = null;
    let imagem = null;

    if (msg.message?.imageMessage) {
        mensagemParaProcessar = msg;
        imagem = msg.message.imageMessage;
    }
    else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const citada = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        mensagemParaProcessar = {
            key: msg.message.extendedTextMessage.contextInfo.quotedKey,
            message: citada,
            messageTimestamp: msg.messageTimestamp,
            pushName: msg.pushName
        };
        imagem = citada.imageMessage;
    }


    const LISTA_MENU = EFEITOS_IMAGEM.map((e, i) => `『 ✦ 』 ${i + 1} — ${e.nome}`).join("\n");

    if (!imagem || !mensagemParaProcessar) {
        const resp = `
┅┄┅┄『 ✦ 』┄┅┄┅┄
『 ✦ 』${config.BOT_NAME}『 ✦ 』
┅┄┅┄『 ✦ 』┄┅┄┅┄

  🎨 EFEITOS DE IMAGEM 🎨
📅 ${dataAtual}

┅┄┅┄『 ✦ 』┄┅┄┅┄
${LISTA_MENU}
┅┄┅┄『 ✦ 』┄┅┄┅┄

💡 COMO USAR:
Responda uma foto com:
${config.PREFIX}efeitos NÚMERO
Exemplo: ${config.PREFIX}efeitos 3

┅┄┅┄『 ✦ 』┄┅┄┅┄
By | ${config.OWNER_NAME}
📍 ${ambiente}
┅┄┅┄『 ✦ 』┄┅┄┅┄
`;
        return await sock.sendMessage(from, { text: resp }, { quoted: msg });
    }


    // 🎨 VALIDA NÚMERO
    const escolha = args[0]?.trim();
    if (!escolha || isNaN(escolha) || escolha < 1 || escolha > EFEITOS_IMAGEM.length) {
        return await sock.sendMessage(from, {
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
⚠️ AVISO
Escolha um número entre 1 e ${EFEITOS_IMAGEM.length}!
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }


    // ⏳ AVISO
    await sock.sendMessage(from, {
        text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
⏳ PROCESSANDO
Aplicando efeito: ${escolha} ...
Aguarde um instante...
┅┄┅┄『 ✦ 』┄┅┄┅┄`
    }, { quoted: msg });


    try {
        // 📂 PASTA TEMP COM PERMISSÕES
        const pastaTemp = path.join(__dirname, "../../temp");
        if (!fs.existsSync(pastaTemp)) fs.mkdirSync(pastaTemp, { recursive: true, mode: 0o777 });

        const caminhoEntrada = path.join(pastaTemp, `entrada_${Date.now()}.jpg`);
        const caminhoSaida = path.join(pastaTemp, `saida_${Date.now()}.png`);


        // ✅ BAIXA CORRETO PARA RC9
        const buffer = await downloadMediaMessage(
            mensagemParaProcessar,
            'buffer',
            {},
            {
                logger: pino({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }
        );

        fs.writeFileSync(caminhoEntrada, buffer);


        // 🎨 COMANDOS — TODOS REESCRITOS, ESPECIALMENTE O NÚMERO 4!
        const comando = montarComandoEfeito(Number(escolha), caminhoEntrada, caminhoSaida);
        if (!comando) throw new Error("Efeito inválido");


        // ⚙️ EXECUÇÃO SEGURA
        execSync(comando, { stdio: ["ignore", "ignore", "ignore"] });


        if (!fs.existsSync(caminhoSaida)) throw new Error("Arquivo não foi criado");


        // 📤 ENVIO PRONTO
        const bufferFinal = fs.readFileSync(caminhoSaida);
        await sock.sendMessage(from, {
            image: bufferFinal,
            caption: `┅┄┅┄『 ✦ 』┄┅┄┅┄
✅ EFEITO APLICADO COM SUCESSO
🎨 Efeito: ${escolha} — ${EFEITOS_IMAGEM[Number(escolha) - 1].nome}
📸 Imagem pronta!
📍 ${ambiente}
┅┄┅┄『 ✦ 』┄┅┄┅┄`,
            mentions: [sender]
        }, { quoted: msg });


        // 🧹 LIMPEZA TOTAL
        try { fs.unlinkSync(caminhoEntrada); } catch (e) {}
        try { fs.unlinkSync(caminhoSaida); } catch (e) {}


    } catch (erro) {
        console.log("\n❌ === ERRO DETALHADO === ❌");
        console.log(erro);
        console.log("===========================\n");

        await sock.sendMessage(from, {
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
❌ FALHA NO PROCESSAMENTO
Tente novamente com outra foto.
┅┄┅┄『 ✦ 』┄┅┄┅┄`
        }, { quoted: msg });
    }
}

module.exports = { efeitos, EFEITOS_IMAGEM, montarComandoEfeito };

