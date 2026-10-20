
/* =================================================
   🔊 GERADOR DE ÁUDIO / VOZ — GOOGLE TTS
   📁 Arquivo: gtts.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */
const config = require("../../config");
const fs = require("fs");
const path = require("path");
const { get } = require("https");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// ═══════════════════════════════════════════════
// 🌍 IDIOMAS SUPORTADOS
// ═══════════════════════════════════════════════

const idiomasSuportados = {

    // 🇧🇷 PORTUGUÊS
    pt: {
        nome: "Português 🇧🇷",
        codigo: "pt"
    },

    pt_br: {
        nome: "Português Brasil 🇧🇷",
        codigo: "pt"
    },

    pt_pt: {
        nome: "Português Portugal 🇵🇹",
        codigo: "pt"
    },

    // 🇺🇸 INGLÊS
    en: {
        nome: "Inglês 🇺🇸",
        codigo: "en"
    },

    en_us: {
        nome: "Inglês Estados Unidos 🇺🇸",
        codigo: "en"
    },

    en_gb: {
        nome: "Inglês Reino Unido 🇬🇧",
        codigo: "en"
    },

    en_au: {
        nome: "Inglês Austrália 🇦🇺",
        codigo: "en"
    },

    en_ca: {
        nome: "Inglês Canadá 🇨🇦",
        codigo: "en"
    },

    // 🇪🇸 ESPANHOL
    es: {
        nome: "Espanhol 🇪🇸",
        codigo: "es"
    },

    es_es: {
        nome: "Espanhol Espanha 🇪🇸",
        codigo: "es"
    },

    es_mx: {
        nome: "Espanhol México 🇲🇽",
        codigo: "es"
    },

    es_us: {
        nome: "Espanhol Estados Unidos 🇺🇸",
        codigo: "es"
    },

    // 🇫🇷 FRANCÊS
    fr: {
        nome: "Francês 🇫🇷",
        codigo: "fr"
    },

    fr_fr: {
        nome: "Francês França 🇫🇷",
        codigo: "fr"
    },

    fr_ca: {
        nome: "Francês Canadá 🇨🇦",
        codigo: "fr"
    },

    // 🇮🇹 ITALIANO
    it: {
        nome: "Italiano 🇮🇹",
        codigo: "it"
    },

    // 🇩🇪 ALEMÃO
    de: {
        nome: "Alemão 🇩🇪",
        codigo: "de"
    },

    // 🇯🇵 JAPONÊS
    ja: {
        nome: "Japonês 🇯🇵",
        codigo: "ja"
    },

    // 🇰🇷 COREANO
    ko: {
        nome: "Coreano 🇰🇷",
        codigo: "ko"
    },

    // 🇨🇳 CHINÊS
    zh: {
        nome: "Chinês 🇨🇳",
        codigo: "zh"
    },

    zh_cn: {
        nome: "Chinês Simplificado 🇨🇳",
        codigo: "zh-CN"
    },

    zh_tw: {
        nome: "Chinês Tradicional 🇹🇼",
        codigo: "zh-TW"
    },

    // 🇷🇺 RUSSO
    ru: {
        nome: "Russo 🇷🇺",
        codigo: "ru"
    },

    // 🇮🇳 ÍNDIA
    hi: {
        nome: "Hindi 🇮🇳",
        codigo: "hi"
    },

    bn: {
        nome: "Bengali 🇧🇩🇮🇳",
        codigo: "bn"
    },

    ta: {
        nome: "Tâmil 🇮🇳",
        codigo: "ta"
    },

    te: {
        nome: "Telugu 🇮🇳",
        codigo: "te"
    },

    mr: {
        nome: "Marathi 🇮🇳",
        codigo: "mr"
    },

    gu: {
        nome: "Gujarati 🇮🇳",
        codigo: "gu"
    },

    kn: {
        nome: "Canarês 🇮🇳",
        codigo: "kn"
    },

    ml: {
        nome: "Malaiala 🇮🇳",
        codigo: "ml"
    },

    pa: {
        nome: "Punjabi 🇮🇳",
        codigo: "pa"
    },

    // 🇹🇷 TURCO
    tr: {
        nome: "Turco 🇹🇷",
        codigo: "tr"
    },

    // 🇵🇱 POLONÊS
    pl: {
        nome: "Polonês 🇵🇱",
        codigo: "pl"
    },

    // 🇳🇱 HOLANDÊS
    nl: {
        nome: "Holandês 🇳🇱",
        codigo: "nl"
    },

    // 🇸🇪 SUECO
    sv: {
        nome: "Sueco 🇸🇪",
        codigo: "sv"
    },

    // 🇩🇰 DINAMARQUÊS
    da: {
        nome: "Dinamarquês 🇩🇰",
        codigo: "da"
    },

    // 🇳🇴 NORUEGUÊS
    no: {
        nome: "Norueguês 🇳🇴",
        codigo: "no"
    },

    // 🇫🇮 FINLANDÊS
    fi: {
        nome: "Finlandês 🇫🇮",
        codigo: "fi"
    },

    // 🇬🇷 GREGO
    el: {
        nome: "Grego 🇬🇷",
        codigo: "el"
    },

    // 🇨🇿 TCHECO
    cs: {
        nome: "Tcheco 🇨🇿",
        codigo: "cs"
    },

    // 🇸🇰 ESLOVACO
    sk: {
        nome: "Eslovaco 🇸🇰",
        codigo: "sk"
    },

    // 🇭🇺 HÚNGARO
    hu: {
        nome: "Húngaro 🇭🇺",
        codigo: "hu"
    },

    // 🇷🇴 ROMENO
    ro: {
        nome: "Romeno 🇷🇴",
        codigo: "ro"
    },

    // 🇺🇦 UCRANIANO
    uk: {
        nome: "Ucraniano 🇺🇦",
        codigo: "uk"
    },

    // 🇧🇬 BÚLGARO
    bg: {
        nome: "Búlgaro 🇧🇬",
        codigo: "bg"
    },

    // 🇭🇷 CROATA
    hr: {
        nome: "Croata 🇭🇷",
        codigo: "hr"
    },

    // 🇸🇮 ESLOVENO
    sl: {
        nome: "Esloveno 🇸🇮",
        codigo: "sl"
    },

    // 🇷🇸 SÉRVIO
    sr: {
        nome: "Sérvio 🇷🇸",
        codigo: "sr"
    },

    // 🇮🇱 HEBRAICO
    he: {
        nome: "Hebraico 🇮🇱",
        codigo: "he"
    },

    // 🇸🇦 ÁRABE
    ar: {
        nome: "Árabe 🇸🇦",
        codigo: "ar"
    },

    // 🇮🇷 PERSA
    fa: {
        nome: "Persa 🇮🇷",
        codigo: "fa"
    },

    // 🇮🇩 INDONÉSIO
    id: {
        nome: "Indonésio 🇮🇩",
        codigo: "id"
    },

    // 🇲🇾 MALAIO
    ms: {
        nome: "Malaio 🇲🇾",
        codigo: "ms"
    },

    // 🇹🇭 TAILANDÊS
    th: {
        nome: "Tailandês 🇹🇭",
        codigo: "th"
    },

    // 🇻🇳 VIETNAMITA
    vi: {
        nome: "Vietnamita 🇻🇳",
        codigo: "vi"
    },

    // 🇵🇭 FILIPINO
    fil: {
        nome: "Filipino 🇵🇭",
        codigo: "fil"
    },

    // 🇮🇸 ISLANDÊS
    is: {
        nome: "Islandês 🇮🇸",
        codigo: "is"
    },

    // 🇱🇹 LITUANO
    lt: {
        nome: "Lituano 🇱🇹",
        codigo: "lt"
    },

    // 🇱🇻 LETÃO
    lv: {
        nome: "Letão 🇱🇻",
        codigo: "lv"
    },

    // 🇪🇪 ESTONIANO
    et: {
        nome: "Estoniano 🇪🇪",
        codigo: "et"
    }
};


// ═══════════════════════════════════════════════
// 🔊 BAIXAR ÁUDIO DO GOOGLE TTS
// ═══════════════════════════════════════════════

function baixarAudio(idioma, texto) {

    return new Promise((resolve, reject) => {

        const textoCodificado = encodeURIComponent(texto);

        const url =
            `https://translate.google.com/translate_tts` +
            `?ie=UTF-8` +
            `&q=${textoCodificado}` +
            `&tl=${encodeURIComponent(idioma)}` +
            `&client=tw-ob`;

        const caminhoTemp = path.join(
            __dirname,
            `voz_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 8)}.mp3`
        );

        const arquivo = fs.createWriteStream(caminhoTemp);

        const requisicao = get(
            url,
            {
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Linux; Android 10)"
                }
            },
            (res) => {

                if (res.statusCode !== 200) {

                    arquivo.close();

                    if (fs.existsSync(caminhoTemp)) {
                        fs.unlinkSync(caminhoTemp);
                    }

                    return reject(
                        new Error(
                            `Google TTS retornou HTTP ${res.statusCode}`
                        )
                    );
                }

                res.pipe(arquivo);

                arquivo.on("finish", () => {
                    arquivo.close(() => {
                        resolve(caminhoTemp);
                    });
                });
            }
        );

        requisicao.on("error", (erro) => {

            arquivo.close();

            if (fs.existsSync(caminhoTemp)) {
                fs.unlinkSync(caminhoTemp);
            }

            reject(erro);
        });

    });
}


// ═══════════════════════════════════════════════
// 📋 MENU DE IDIOMAS
// ═══════════════════════════════════════════════

function gerarListaIdiomas() {

    const entradas = Object.entries(idiomasSuportados);

    let lista = "";

    entradas.forEach(([codigo, dados], index) => {

        lista +=
            `│ ${String(index + 1).padStart(2, "0")} • ` +
            `*${codigo}* → ${dados.nome}\n`;
    });

    return lista.trimEnd();
}


// ═══════════════════════════════════════════════
// 🔧 CONVERTE PRA FORMATO DE NOTA DE VOZ DE VERDADE
// ═══════════════════════════════════════════════
// O Google TTS devolve um MP3 cru — e o player de NOTA DE VOZ (ptt) do
// WhatsApp só reproduz de forma confiável em OGG/Opus. Mandar o MP3 com
// ptt:true é exatamente o que causava "áudio incompatível" e obrigava
// a converter de novo manualmente. Essa função faz essa conversão uma
// vez só, automaticamente, antes de mandar.
async function converterParaOggOpus(caminhoMp3) {
    const caminhoOgg = caminhoMp3.replace(/\.mp3$/i, ".ogg");
    await execAsync(`ffmpeg -y -i "${caminhoMp3}" -c:a libopus -b:a 64k -ar 48000 -ac 1 -vn "${caminhoOgg}"`);
    if (!fs.existsSync(caminhoOgg) || fs.statSync(caminhoOgg).size < 200) {
        throw new Error("FFmpeg não gerou um OGG/Opus válido a partir do TTS.");
    }
    return caminhoOgg;
}


// ═══════════════════════════════════════════════
// 🗣️ COMANDO GTTS
// ═══════════════════════════════════════════════

async function gtts(sock, msg, args) {

    const from = msg.key.remoteJid;

    // ═══════════════════════════════════════════
    // ❌ SEM ARGUMENTOS
    // ═══════════════════════════════════════════

    if (!args.length) {

        const listaIdiomas = gerarListaIdiomas();

        const ajuda = `
〔 🔊 𝐓𝐄𝐗𝐓𝐎 → 𝐕𝐎𝐙 〕
『 🌍 𝐂𝐎𝐍𝐕𝐄𝐑𝐒𝐎𝐑 𝐃𝐄 𝐈𝐃𝐈𝐎𝐌𝐀𝐒 』
 └─ Transforme qualquer texto em áudio.
━━━━━━━━━━━━━━
> 📝 𝐂𝐎𝐌𝐎 𝐔𝐒𝐀𝐑
  └─ ${config.PREFIX}gtts [código] [texto]

> 💡 𝐄𝐗𝐄𝐌𝐏𝐋𝐎
   └─ ${config.PREFIX}gtts pt Olá, tudo bem?
━━━━━━━━━━━━━━
> 🌍 𝐈𝐃𝐈𝐎𝐌𝐀𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈́𝐕𝐄𝐈𝐒
${listaIdiomas}
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;

        return sock.sendMessage(
            from,
            { text: ajuda },
            { quoted: msg }
        );
    }


    // ═══════════════════════════════════════════
    // 🔎 SEPARA IDIOMA E TEXTO
    // ═══════════════════════════════════════════

    const idiomaEscolhido =
        String(args[0]).toLowerCase();

    const texto =
        args
            .slice(1)
            .join(" ")
            .trim();


    // ═══════════════════════════════════════════
    // ❌ TEXTO AUSENTE
    // ═══════════════════════════════════════════

    if (!texto) {

        const resposta = `
〔 ❌ 𝐓𝐄𝐗𝐓𝐎 𝐎𝐁𝐑𝐈𝐆𝐀𝐓𝐎́𝐑𝐈𝐎 〕
『 📝 𝐈𝐍𝐅𝐎𝐑𝐌𝐀𝐂̧𝐀̃𝐎 』
    └─ Você precisa informar o texto
     que deseja transformar em voz.
━━━━━━━━━━━━━━
> 💡 𝐄𝐗𝐄𝐌𝐏𝐋𝐎
   └─ ${config.PREFIX}gtts pt Olá mundo
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;

        return sock.sendMessage(
            from,
            { text: resposta },
            { quoted: msg }
        );
    }


    // ═══════════════════════════════════════════
    // ⚠️ IDIOMA INVÁLIDO
    // ═══════════════════════════════════════════

    if (!idiomasSuportados[idiomaEscolhido]) {

        const listaCodigos =
            Object.keys(idiomasSuportados).join(" • ");

        const resposta = `
〔 ⚠️ 𝐈𝐃𝐈𝐎𝐌𝐀 𝐈𝐍𝐕𝐀́𝐋𝐈𝐃𝐎 〕
『 🌍 𝐂𝐎́𝐃𝐈𝐆𝐎 𝐍𝐀̃𝐎 𝐄𝐍𝐂𝐎𝐍𝐓𝐑𝐀𝐃𝐎 』
 └─ O idioma *${idiomaEscolhido}* 
 não está disponível neste sistema.
━━━━━━━━━━━━━━
> 📋 𝐂𝐎́𝐃𝐈𝐆𝐎𝐒 𝐃𝐈𝐒𝐏𝐎𝐍𝐈́𝐕𝐄𝐈𝐒
   └─ ${listaCodigos}
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;

        return sock.sendMessage(
            from,
            { text: resposta },
            { quoted: msg }
        );
    }


    // ═══════════════════════════════════════════
    // 📊 INFORMAÇÕES DO IDIOMA
    // ═══════════════════════════════════════════

    const idioma =
        idiomasSuportados[idiomaEscolhido];

    const idiomaGoogle =
        idioma.codigo;


    // ═══════════════════════════════════════════
    // ⏳ AVISO DE PROCESSAMENTO
    // ═══════════════════════════════════════════

    const aviso = `
〔 ⏳ 𝐆𝐄𝐑𝐀𝐍𝐃𝐎 𝐀́𝐔𝐃𝐈𝐎 〕
『 ⚙️ 𝐏𝐑𝐎𝐂𝐄𝐒𝐒𝐀𝐌𝐄𝐍𝐓𝐎 』
 └─ Aguarde enquanto preparo sua voz.
━━━━━━━━━━━━━━
> 🗣️ 𝐈𝐃𝐈𝐎𝐌𝐀
   └─ ${idioma.nome}
> 📄 𝐓𝐀𝐌𝐀𝐍𝐇𝐎
   └─ ${texto.length} caracteres
> 🔊 𝐐𝐔𝐀𝐋𝐈𝐃𝐀𝐃𝐄
   └─ Padrão Google TTS
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;

    await sock.sendMessage(
        from,
        { text: aviso },
        { quoted: msg }
    );


    let caminhoArquivo = null;
    let caminhoOgg = null;


    // ═══════════════════════════════════════════
    // 🔊 GERAR E ENVIAR ÁUDIO
    // ═══════════════════════════════════════════

    try {

        caminhoArquivo =
            await baixarAudio(
                idiomaGoogle,
                texto
            );

        // 🔧 converte pra OGG/Opus de verdade — sem isso o WhatsApp
        // recusa/mostra "áudio incompatível" na nota de voz
        caminhoOgg = await converterParaOggOpus(caminhoArquivo);

        const bufferAudio =
            fs.readFileSync(caminhoOgg);


        await sock.sendMessage(
            from,
            {
                audio: bufferAudio,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true
            },
            {
                quoted: msg
            }
        );


    } catch (erro) {

        console.error(
            "❌ Erro GTTS:",
            erro
        );

        const respostaErro = `
〔 ❌ 𝐅𝐀𝐋𝐇𝐀 𝐍𝐎 𝐓𝐓𝐒 〕
『 🔊 𝐄𝐑𝐑𝐎 𝐀𝐎 𝐆𝐄𝐑𝐀𝐑 𝐀́𝐔𝐃𝐈𝐎 』
   └─ Não foi possível gerar a voz.
━━━━━━━━━━━━━━
> 💡 𝐏𝐎𝐒𝐒𝐈́𝐕𝐄𝐈𝐒 𝐂𝐀𝐔𝐒𝐀𝐒
   └─ Texto muito grande.
   └─ Idioma temporariamente indisponível.
   └─ Falha na conexão com o serviço.
━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━`;

        await sock.sendMessage(
            from,
            { text: respostaErro },
            { quoted: msg }
        );

    } finally {

        // ═══════════════════════════════════════
        // 🧹 LIMPEZA DOS ARQUIVOS TEMPORÁRIOS (mp3 + ogg)
        // ═══════════════════════════════════════

        for (const caminho of [caminhoArquivo, caminhoOgg]) {
            if (caminho && fs.existsSync(caminho)) {
                try {
                    fs.unlinkSync(caminho);
                } catch (erroLimpeza) {
                    console.error(
                        "⚠️ Erro ao remover arquivo temporário:",
                        erroLimpeza
                    );
                }
            }
        }
    }
}


// ═══════════════════════════════════════════════
// 📦 EXPORTAÇÃO
// ═══════════════════════════════════════════════

module.exports = {
    gtts
};
