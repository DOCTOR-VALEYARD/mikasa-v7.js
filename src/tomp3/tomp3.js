const config = require("../../config");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const {
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");


// ═══════════════════════════════════════════════════════════════
// ⚙️ CONFIGURAÇÕES
// ═══════════════════════════════════════════════════════════════

const PASTA_TEMP = path.join(
    __dirname,
    "temp_mp3"
);


// Cria a pasta temporária automaticamente.
if (!fs.existsSync(PASTA_TEMP)) {
    fs.mkdirSync(
        PASTA_TEMP,
        {
            recursive: true
        }
    );
}


// ═══════════════════════════════════════════════════════════════
// 🧹 LIMPEZA SEGURA
// ═══════════════════════════════════════════════════════════════

function apagarArquivo(caminho) {

    try {

        if (
            caminho &&
            fs.existsSync(caminho)
        ) {
            fs.unlinkSync(caminho);
        }

    } catch (erro) {

        console.warn(
            "⚠️ Não foi possível remover arquivo temporário:",
            erro.message
        );
    }
}


function limparTemporarios(...arquivos) {

    for (const arquivo of arquivos) {
        apagarArquivo(arquivo);
    }
}


// ═══════════════════════════════════════════════════════════════
// 📥 BAIXAR MÍDIA DO WHATSAPP
// ═══════════════════════════════════════════════════════════════

async function baixarMidia(midia, tipo) {

    const stream =
        await downloadContentFromMessage(
            midia,
            tipo
        );


    const partes = [];


    for await (const parte of stream) {

        partes.push(
            Buffer.from(parte)
        );
    }


    return Buffer.concat(partes);
}


// ═══════════════════════════════════════════════════════════════
// 🎵 CONVERTER PARA MP3
// ═══════════════════════════════════════════════════════════════

function converterParaMP3(
    entrada,
    saida
) {

    return new Promise(
        (resolve, reject) => {

            execFile(
                "ffmpeg",

                [
                    "-y",

                    "-hide_banner",

                    "-loglevel",
                    "error",

                    "-i",
                    entrada,

                    "-vn",

                    "-map",
                    "0:a:0",

                    "-codec:a",
                    "libmp3lame",

                    "-b:a",
                    "192k",

                    "-ar",
                    "44100",

                    "-ac",
                    "2",

                    saida
                ],

                {
                    timeout: 120000,
                    maxBuffer: 1024 * 1024 * 5
                },

                (erro) => {

                    if (erro) {
                        return reject(
                            erro
                        );
                    }

                    resolve();
                }
            );
        }
    );
}


// ═══════════════════════════════════════════════════════════════
// 🎵 COMANDO TOMP3
// ═══════════════════════════════════════════════════════════════

async function tomp3(sock, msg, args = []) {

    const from =
        msg?.key?.remoteJid;


    if (!from) {
        return;
    }


    const remetente =
        msg.key.participant ||
        msg.key.remoteJid;


    const numeroRemetente =
        remetente.split("@")[0];


    // ═══════════════════════════════════════════════════════════
    // 📦 LOCALIZAR MÍDIA
    // ═══════════════════════════════════════════════════════════

    const mensagemAtual =
        msg.message;


    const mensagemRespondida =
        msg.message
            ?.extendedTextMessage
            ?.contextInfo
            ?.quotedMessage;


    let midia = null;
    let tipo = null;


    // ───────────────────────────────────────────────────────────
    // 📎 MÍDIA RESPONDIDA
    // ───────────────────────────────────────────────────────────

    if (mensagemRespondida?.videoMessage) {

        midia =
            mensagemRespondida.videoMessage;

        tipo = "video";

    } else if (
        mensagemRespondida?.audioMessage
    ) {

        midia =
            mensagemRespondida.audioMessage;

        tipo = "audio";
    }


    // ───────────────────────────────────────────────────────────
    // 📎 MÍDIA DIRETA
    // ───────────────────────────────────────────────────────────

    else if (
        mensagemAtual?.videoMessage
    ) {

        midia =
            mensagemAtual.videoMessage;

        tipo = "video";

    } else if (
        mensagemAtual?.audioMessage
    ) {

        midia =
            mensagemAtual.audioMessage;

        tipo = "audio";
    }


    // ═══════════════════════════════════════════════════════════
    // ❌ NENHUMA MÍDIA
    // ═══════════════════════════════════════════════════════════

    if (!midia) {

        const ajuda = `
〔 🎵 𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐎𝐑 𝐌𝐏𝟑 〕
『 🎧 𝐂𝐎𝐌𝐎 𝐔𝐒𝐀𝐑 』┄┅┄┅┄
    └─ Transforme vídeo ou áudio
          em um arquivo MP3.
━━━━━━━━━━━━━━━━━━━━
> 📥 𝐎𝐏𝐂̧𝐀̃𝐎 𝟏
       └─ Envie um vídeo ou áudio
          junto com:
          ${config.PREFIX}tomp3

> 💬 𝐎𝐏𝐂̧𝐀̃𝐎 𝟐
       └─ Responda uma mídia com:
          ${config.PREFIX}tomp3

> 🎬 𝐀𝐑𝐐𝐔𝐈𝐕𝐎𝐒 𝐀𝐂𝐄𝐈𝐓𝐎𝐒
       ├─ 🎥 Vídeo
       └─ 🎵 Áudio
━━━━━━━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━━━━━━━`;


        return sock.sendMessage(
            from,
            {
                text: ajuda
            },
            {
                quoted: msg
            }
        );
    }


    // ═══════════════════════════════════════════════════════════
    // ⏳ AVISO DE PROCESSAMENTO
    // ═══════════════════════════════════════════════════════════

    const aviso =
`〔 ⏳ 𝐏𝐑𝐎𝐂𝐄𝐒𝐒𝐀𝐍𝐃𝐎 〕
┅┄┅┄『 🎵 𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐀̃𝐎 』┄┅┄┅┄
       └─ Extraindo o áudio da mídia...
━━━━━━━━━━━━━━━━━━━━
💬 @${numeroRemetente}, segura aí. 😏

🎧 Preparando seu MP3...
⚙️ Qualidade: 192 kbps
📡 Status: Processando...

━━━━━━━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━━━━━━━`;


    await sock.sendMessage(
        from,
        {
            text: aviso,
            mentions: [remetente]
        },
        {
            quoted: msg
        }
    );


    // ═══════════════════════════════════════════════════════════
    // 📁 ARQUIVOS TEMPORÁRIOS
    // ═══════════════════════════════════════════════════════════

    const idUnico =
        `${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 10)}`;


    const extensaoEntrada =
        tipo === "video"
            ? ".mp4"
            : ".ogg";


    const arquivoEntrada =
        path.join(
            PASTA_TEMP,
            `entrada_${idUnico}${extensaoEntrada}`
        );


    const arquivoSaida =
        path.join(
            PASTA_TEMP,
            `audio_${idUnico}.mp3`
        );


    try {

        // ═══════════════════════════════════════════════════════
        // 📥 DOWNLOAD
        // ═══════════════════════════════════════════════════════

        const buffer =
            await baixarMidia(
                midia,
                tipo
            );


        if (
            !buffer ||
            buffer.length === 0
        ) {

            throw new Error(
                "Arquivo recebido está vazio."
            );
        }


        fs.writeFileSync(
            arquivoEntrada,
            buffer
        );


        // ═══════════════════════════════════════════════════════
        // ⚙️ FFMPEG
        // ═══════════════════════════════════════════════════════

        await converterParaMP3(
            arquivoEntrada,
            arquivoSaida
        );


        // ═══════════════════════════════════════════════════════
        // 🔍 VERIFICAR RESULTADO
        // ═══════════════════════════════════════════════════════

        if (
            !fs.existsSync(arquivoSaida)
        ) {

            throw new Error(
                "FFmpeg não gerou o arquivo MP3."
            );
        }


        const stats =
            fs.statSync(
                arquivoSaida
            );


        if (
            stats.size === 0
        ) {

            throw new Error(
                "O MP3 gerado está vazio."
            );
        }


        const bufferFinal =
            fs.readFileSync(
                arquivoSaida
            );


        // ═══════════════════════════════════════════════════════
        // 📊 TAMANHO DO ARQUIVO
        // ═══════════════════════════════════════════════════════

        const tamanhoMB =
            (
                bufferFinal.length /
                1024 /
                1024
            ).toFixed(2);


        // ═══════════════════════════════════════════════════════
        // 📤 ENTREGA DO MP3
        // ═══════════════════════════════════════════════════════

        await sock.sendMessage(
            from,
            {
                audio: bufferFinal,

                mimetype:
                    "audio/mpeg",

                fileName:
                    `audio_${idUnico}.mp3`,

                ptt:
                    false
            },
            {
                quoted: msg
            }
        );


        // ═══════════════════════════════════════════════════════
        // ✅ CONFIRMAÇÃO
        // ═══════════════════════════════════════════════════════

        const entrega =
`〔 ✅ 𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐀̃𝐎 𝐂𝐎𝐍𝐂𝐋𝐔𝐈́𝐃𝐀 〕
┅┄┅┄『 🎶 𝐌𝐏𝟑 𝐏𝐑𝐎𝐍𝐓𝐎 』┄┅┄┅┄
       └─ @${numeroRemetente}
━━━━━━━━━━━━━━━━━━━━
> 🎵 𝐅𝐎𝐑𝐌𝐀𝐓𝐎
   └─ MP3
> 🎚️ 𝐁𝐈𝐓𝐑𝐀𝐓𝐄
   └─ 192 kbps
> 🔊 𝐅𝐑𝐄𝐐𝐔𝐄̂𝐍𝐂𝐈𝐀
   └─ 44.100 Hz
> 📦 𝐓𝐀𝐌𝐀𝐍𝐇𝐎
   └─ ${tamanhoMB} MB
> 🟢 𝐒𝐓𝐀𝐓𝐔𝐒
   └─ Conversão concluída
━━━━━━━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━━━━━━━`;


        await sock.sendMessage(
            from,
            {
                text: entrega,
                mentions: [remetente]
            },
            {
                quoted: msg
            }
        );


    } catch (erro) {

        console.error(
            "❌ ERRO NO TOMP3:",
            erro
        );


        // ═══════════════════════════════════════════════════════
        // ❌ ERRO
        // ═══════════════════════════════════════════════════════

        const mensagemErro =
`〔 ❌ 𝐅𝐀𝐋𝐇𝐀 𝐍𝐀 𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐀̃𝐎 〕
『 ⚠️ 𝐓𝐎𝐌𝐏𝟑 』
 └─ Não foi possível gerar o MP3.
━━━━━━━━━━━━━━━━━━━━
Possíveis motivos
├─ 📁 Arquivo corrompido
├─ 🔇 Mídia sem faixa de áudio
├─ 📦 Arquivo muito grande
└─ ⚙️ FFmpeg indisponível
━━━━━━━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━━━━━━━`;


        try {

            await sock.sendMessage(
                from,
                {
                    text: mensagemErro
                },
                {
                    quoted: msg
                }
            );

        } catch (erroEnvio) {

            console.error(
                "❌ Erro ao enviar mensagem de falha:",
                erroEnvio
            );
        }


    } finally {

        // ═══════════════════════════════════════════════════════
        // 🧹 LIMPEZA FINAL
        // ═══════════════════════════════════════════════════════

        limparTemporarios(
            arquivoEntrada,
            arquivoSaida
        );
    }
}


// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════

module.exports = {
    tomp3
};