// src/menu.js - MENU COM SUPORTE A FOTO/VÍDEO E ÁUDIO
const config = require("../../config");
const { resolverCaminhoSalvo } = require("../caminhos/caminhos");
const fs = require("fs");
const path = require("path");
const { criarCardMenu } = require("../cardGenerator/cardGenerator");
const { buscarFotoContexto } = require("../foto-contexto/foto-contexto");
const { enviarAudioDaPasta } = require("../audio-pastas/audio-pastas");
const { enviarNativeFlow, botao, botaoUrl } = require("../menuBotoes/menuBotoes");

function lerDB() {
    const dbPath = path.join(__dirname, "../../database/botconfig.json");
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
        return {
            PREFIX: config.PREFIX,
            BOT_NAME: config.BOT_NAME,
            OWNER_NAME: config.OWNER_NAME,
            BOT_AUDIO: null,
            BOT_PHOTO: null
        };
    }
    return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

async function menu(sock, from, opcoes = {}) {
  try {
    const db = lerDB();
    const prefix = db.PREFIX || config.PREFIX || "/";
    const botName = db.BOT_NAME || config.BOT_NAME || "BOT";
    const ownerName = db.OWNER_NAME || config.OWNER_NAME || "Desconhecida";

    // 🔊 ÁUDIO DO MENU — agora puxa aleatoriamente de src/audios/menu/
    // (pode colocar quantos áudios quiser lá, sempre toca um diferente).
    // Se a pasta estiver vazia, cai no áudio único configurado pelo painel
    // (.configurar-bot), mantendo compatibilidade com quem já usava isso.
    let audioDoMenuEnviado = false;
    try {
        audioDoMenuEnviado = await enviarAudioDaPasta(sock, from, "menu");
    } catch (e) {
        console.log("Áudio da pasta 'menu' indisponível, tentando áudio configurado...");
    }

    const audioConfigurado = db.BOT_AUDIO ? resolverCaminhoSalvo(db.BOT_AUDIO) : null;
    if (!audioDoMenuEnviado && audioConfigurado && fs.existsSync(audioConfigurado)) {
        try {
            const audioBuffer = fs.readFileSync(audioConfigurado);
            await sock.sendMessage(from, { audio: audioBuffer, mimetype: "audio/mp4" });
        } catch (e) {
            console.log("Áudio não encontrado, pulando...");
        }
    }

    const text = ` 🧣┈┈┈┈┈┈┈┈┈┈┈┈┈┈🧣
🧣 『 ${botName} 』🧣
🧣┈┈┈┈┈┈┈┈┈┈┈┈┈┈🧣

👑 ${ownerName}
🤖 ${botName}
💡 ${prefix}ᵖⁱⁿᵍ • ${prefix}ᵃᵗⁱᵛᵃʳ

🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
⚙️ ᴄᴏɴꜰɪɢs
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ᵖⁱⁿᵍ
🧣 ${prefix}ᶜᵒⁿᶠⁱᵍᵘʳᵃʳ-ᵇᵒᵗ
🧣 ${prefix}ᵃᵗⁱᵛᵃʳ
🧣 ${prefix}ⁱᵃ / ⁱⁿᵗᵉˡⁱᵍᵉⁿᶜⁱᵃ 🧠✨
🧣 ${prefix}ᵇᵉᵐᵛⁱⁿᵈᵒ
🧣 ${prefix}ᵃᶜᵉⁱᵗᵃʳ
🧣 ${prefix}ᵐᵉⁿᶜᵃᵒ
🧣 ${prefix}ᶜᵒⁿᶠⁱᵍᵍˡᵒᵇᵃˡ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
💻 ᴍᴇɴᴜs
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ᵐᵉⁿᵘᵈᵒⁿᵒ
🧣 ${prefix}ᵐᵉⁿᵘᵃᵈᵐ
🧣 ${prefix}ᵐᵉⁿᵘᵖʳᵉᵐⁱᵘᵐ
🧣 ${prefix}ᵐᵉⁿᵘᵍᵒˡᵈ
🧣 ${prefix}ᵐᵉⁿᵘᵐⁱᵈⁱᵃˢ
🧣 ${prefix}ᵉᶠᵉⁱᵗᵒˢ
🧣 ${prefix}ˡᵒᵍᵒˢ
🧣 ${prefix}ᵇʳⁱⁿᶜᵃᵈᵉⁱʳᵃˢ
🧣 ${prefix}ᵐᵉⁿᵘᵇʳⁱⁿᵠᵘᵉᵈᵒˢ
🧣 ${prefix}ᵐᵉᵈⁱᵃᶠⁱʳᵉ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🎭 ʙʀɪɴᴄᴀᴅᴇɪʀᴀs 
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ᵉⁿᑫᵘᵉᵗᵉ
🧣 ${prefix}ᵃᵐⁱᶻᵃᵈᵉ
🧣 ${prefix}ᶜᵒᵐᵖᵃᵗⁱᵇⁱˡⁱᵈᵃᵈᵉ
🧣 ${prefix}ᵈᵘᵖˡᵃ
🧣 ${prefix}ᶠᵃᵐⁱˡⁱᵃ
🧣 ${prefix}ᶠᵃᵐⁱˡⁱᵃˢ
🧣 ${prefix}ᶜᵃˢᵃᵐᵉⁿᵗᵒ
🧣 ${prefix}ᵐᵉᵘᶜᵃˢᵃˡ
🧣 ${prefix}ᵈⁱᵛᵒʳᶜⁱᵒ
🧣 ${prefix}ᵖʳᵉˢᵉⁿᵗᵉ
🧣 ${prefix}ᵐⁱˢˢᵒᵉˢ
🧣 ${prefix}ᵐⁱˢˢᵃᵒ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
👥 ᴍᴇᴍʙʀᴏs
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ʳᵉᵍⁱˢᵗʳᵃʳ
🧣 ${prefix}ᵈᵉˡʳᵉᵍⁱˢᵗʳᵒ
🧣 ${prefix}ᵖᵉʳᶠⁱˡ
🧣 ${prefix}ⁱⁿᶠᵒʳᵉᵍⁱˢᵗʳᵃʳ
🧣 ${prefix}ⁱⁿᶠᵒᵖᵉʳᶠⁱˡ
🧣 ${prefix}ᵃᵈᵛᵉʳᵗⁱᵈᵒˢ
🧣 ${prefix}ᵐᵘᵗᵃᵈᵒˢ
🧣 ${prefix}ⁱⁿᶠᵒᵃᵈᵛ
🧣 ${prefix}ⁱⁿᶠᵒᵐᵘᵗᵉ
🧣 ${prefix}ⁱⁿᶠᵒᵇᵒᵗ
🧣 ${prefix}ᵇᵘᵍ
🧣 ${prefix}ˢᵘᵍᵉˢᵗᵃᵒ
🧣 ${prefix}ᵃᵛᵃˡⁱᵉ
🧣 ${prefix}ʳᵉᵃᵍⁱʳ
🧣 ${prefix}ᵃᵈᵐˢ
🧣 ${prefix}ᶜᵒⁿᵛⁱᵗᵉ
🧣 ${prefix}ᶠᵒʳᶜᵃ
🧣 ${prefix}ᵃᵈⁱᵛⁱⁿʰᵃ
🧣 ${prefix}ᑫᵘⁱᶻ
🧣 ${prefix}ʲᵒᵍᵒᵈᵃᵛᵉˡʰᵃ
🧣 ${prefix}ᵃˡᵉᵃᵗᵒʳʸ
🧣 ${prefix}ʳᵉˢᵘᵐᵒ
🧣 ${prefix}ʰⁱˢᵗᵒʳⁱᶜᵒ
🧣 ${prefix}ᶜᵒⁿᑫᵘⁱˢᵗᵃˢ
🧣 ${prefix}ᵇᵒᵗˢᵗᵃᵗᵘˢ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
💰 ᴇᴄᴏɴᴏᴍɪᴀ / ɢᴏʟᴅ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ᵍᵒˡᵈ
🧣 ${prefix}ˢᵃˡᵈᵒ
🧣 ${prefix}ᵐᵒᵉᵈᵃˢ
🧣 ${prefix}ᶜʰᵉᶜᵏⁱⁿ
🧣 ${prefix}ᵈᵃⁱˡʸ
🧣 ${prefix}ᵗʳᵃᵇᵃˡʰᵃʳ
🧣 ${prefix}ʳᵒᵘᵇᵃʳ @pessoa
🧣 ${prefix}ᵇᵒⁿᵘˢ
🧣 ${prefix}ᵗʳᵃⁿˢᶠᵉʳⁱʳ @pessoa <gold>
🧣 ${prefix}ᵈᵉᵖᵒˢⁱᵗᵃʳ <gold>
🧣 ${prefix}ˢᵃᶜᵃʳ <gold>
🧣 ${prefix}ᵉˣᵗʳᵃᵗᵒ
🧣 ${prefix}ⁱⁿᵛᵉⁿᵗᵃʳⁱᵒ
🧣 ${prefix}ᵖʳᵉˢᵉⁿᵗᵉ @pessoa
🧣 ${prefix}ᵗᵒᵖᵍᵒˡᵈ
🧣 ${prefix}ᵗᵒᵖˣᵖ
🧣 ${prefix}ᵗᵒᵖᵃᵐⁱᶻᵃᵈᵉ
🧣 ${prefix}ˣᵖ
🧣 ${prefix}ⁿⁱᵛᵉˡ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
📚 ɪɴꜰᴏs
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ʳᵃⁿᵏ
🧣 ${prefix}ᵗᵃᵇᵉˡᵃ
🧣 ${prefix}ʳᵃⁿᵏᵃᵗⁱᵛᵒ
🧣 ${prefix}ʳᵃⁿᵏⁱⁿᵃᵗⁱᵛᵒˢ
🧣 ${prefix}ᵃᵗⁱᵛⁱᵈᵃᵈᵉˢ
🧣 ${prefix}ᵐᵒᵉᵈᵃˢ
🧣 ${prefix}ᵉˢᵖᵒʳᵗᵉ_ⁿᵒᵗⁱᶜⁱᵃˢ
🧣 ${prefix}ᶜᵉˡᵘˡᵃʳ (ex: Xiaomi)
🧣 ${prefix}ᵗᵉᵐᵖᵒ (cidade)
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
⚡ ᴄᴏᴍᴀɴᴅᴏs
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ᵍᵗᵗˢ (idioma+texto)
🧣 ${prefix}ᵃʳᵗᵉⁿᵒᵐᵉ (nome na foto)
🧣 ${prefix}ᵃʳᵗᵉⁿᵒᵐᵉᵍⁱᶠ (nome animado na foto)
🧣 ${prefix}ᵐᵉᵐᵉ (busca meme por descrição)
🧣 ${prefix}ᵗᵒᵐᵖ³
🧣 ${prefix}ᵍⁱᶠ / ᶠ / ᵗᵒⁱᵐᵍ
🧣 ${prefix}ˢ / ˢᵗⁱᶜᵏᵉʳ / ᶠⁱᵍᵘʳⁱⁿʰᵃ
🧣 ${prefix}ʳᵒᵘᵇᵃʳ
🧣 ${prefix}ˢⁱᵍⁿᵒ
🧣 ${prefix}ᶜᵃˢᵃˡ
🧣 ${prefix}ˢᵃˡᵈᵒ
🧣 ${prefix}ˡᵒʲᵃ
🧣 ${prefix}ᵈᵘᵉˡᵒ
🧣 ${prefix}ʳᵒˡᵉᵗᵃ
🧣 ${prefix}ᵖˡᵃʸ / ᵐᵘˢⁱᶜᵃ
🧣 ${prefix}ˢᵒʳᵗᵉᵃʳ
🧣 ${prefix}ˢᵖᵃᵐ
🧣 ${prefix}ʳᵉˢᵍᵃᵗᵃʳ
🧣 ${prefix}ᵐᵉᵈⁱᵃᶠⁱʳᵉ
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🛡️ ᴍᴏᴅᴇʀᴀᴄ̧ᴀ̃ᴏ 
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🧣 ${prefix}ʷᵃʳⁿ @pessoa
🧣 ${prefix}ᵘⁿʷᵃʳⁿ @pessoa
🧣 ${prefix}ᵃᵘᵗᵒᵇᵃⁿ 1/0
🧣 ${prefix}ᵐᵘᵗᵉ @pessoa
🧣 ${prefix}ᵘⁿᵐᵘᵗᵉ @pessoa
🧣 ${prefix}ᵐᵃⁿᵘᵗᵉⁿᶜᵃᵒ 1/0
🧣 ${prefix}ᵇᵃᶜᵏᵘᵖ
🧣 ${prefix}ᶜᵒⁿᶠⁱᵍᵃⁿⁱᵛᵉʳˢᵃʳⁱᵒ <mensagem>
🧣 ${prefix}ᶜᵒⁿᑫᵘⁱˢᵗᵃˢ
🧣 ${prefix}ᵇᵒᵗˢᵗᵃᵗᵘˢ
🧣 ${prefix}ʳᵉˢᵗᵃʳᵗ (dono)
🧣 ${prefix}ᵇʳᵒᵃᵈᶜᵃˢᵗ <mensagem> (dono)
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
✨ sᴛᴀᴛᴜs
🖤┈┈┈┈┈┈┈┈┈┈┈┈┈┈🖤
🖤 ${botName}
🖤 • ᴏɴʟɪɴᴇ ✅`;

    // 📋 MODO TEXTO — usado somente para "menu" sem prefixo.
    // Mantém o conteúdo existente do menu e acrescenta apenas o botão
    // do canal já configurado no bot.
    if (opcoes?.texto) {
        await sock.sendMessage(from, { text }, { quoted: opcoes.quoted });

        const linkCanal = [
            db.CHANNEL_URL,
            db.CHANNEL_LINK,
            db.CHANNEL,
            db.CANAL_URL,
            db.CANAL_LINK,
            db.CANAL,
            config.CHANNEL_URL
        ].find(v => typeof v === "string" && v.trim());

        if (linkCanal) {
            const link = /^https?:\/\//i.test(linkCanal.trim())
                ? linkCanal.trim()
                : `https://${linkCanal.trim()}`;

            await enviarNativeFlow(sock, from, {
                text: " ",
                footer: config.BOT_NAME || "Mikasa Bot",
                quoted: opcoes.quoted,
                buttons: [
                    botao("BY : DOCTOR VALEYARD", "zoar_dono"),
                    botaoUrl("📢 ENTRAR NO CANAL", link)
                ]
            });
        } else {
            await enviarNativeFlow(sock, from, {
                text: " ",
                footer: config.BOT_NAME || "Mikasa Bot",
                quoted: opcoes.quoted,
                buttons: [botao("BY : DOCTOR VALEYARD", "zoar_dono")]
            });
        }
        return;
    }

    // Mídia do menu SEMPRE vem direto de src/menu.png (ou menu.mp4 pra vídeo),
    // não depende mais do botconfig.json — assim nunca fica "sem achar a foto"
    // mesmo que ela exista fisicamente na pasta.
    const caminhoFotoMenu = path.join(__dirname, "../midias/imagens/menu.png");
    const caminhoVideoMenu = path.join(__dirname, "../midias/videos/menu.mp4");
    const ehVideo = fs.existsSync(caminhoVideoMenu);

    if (ehVideo) {
        const mediaBuffer = fs.readFileSync(caminhoVideoMenu);
        // 🎞️ Se a mídia salva veio de um GIF (BOT_PHOTO_GIF), manda com
        // gifPlayback pra tocar em loop igual gif, em vez de vídeo comum.
        await sock.sendMessage(from, {
            video: mediaBuffer,
            caption: text,
            mimetype: "video/mp4",
            gifPlayback: db.BOT_PHOTO_GIF === true
        });
    } else {
        let fotoBuffer = null;
        if (fs.existsSync(caminhoFotoMenu)) {
            try {
                fotoBuffer = fs.readFileSync(caminhoFotoMenu);
                console.log(`✅ menu.png encontrado (${fotoBuffer.length} bytes) em: ${caminhoFotoMenu}`);
            } catch (erroLeitura) {
                console.error(`❌ menu.png existe mas não consegui LER o arquivo em ${caminhoFotoMenu}:`, erroLeitura.message);
                fotoBuffer = null;
            }
        } else {
            console.error(`❌ menu.png NÃO EXISTE nesse caminho: ${caminhoFotoMenu}`);
        }

        try {
            // 📸 foto de quem chamou (grupo, ou a própria pessoa no PV)
            const fotoContextoBuffer = await buscarFotoContexto(sock, from);
            const card = await criarCardMenu({ fotoBuffer, botName, ownerName, fotoContextoBuffer });
            await sock.sendMessage(from, { image: card, caption: text });
        } catch (erroCard) {
            console.error("❌ Erro ao gerar card do menu:", erroCard);
            await sock.sendMessage(from, { text }); // fallback só em texto se o card falhar
        }
    }

  } catch (error) {
    console.error("❌ ERRO AO ENVIAR MENU:", error);
    await sock.sendMessage(from, { text: "😥 Erro ao gerar o menu." });
  }
}

module.exports = { menu };

