/* =================================================
   ⚙️ CONFIGURAR BOT • SISTEMA COMPLETO FUNCIONAL
   📁 Arquivo: configurar-bot.js
   ✅ ALTERAÇÕES APLICADAS IMEDIATAMENTE
================================================= */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const config = require("../../config");
const { caminhoSalvo, destinoDaMidiaDoMenu } = require("../caminhos/caminhos");
const { validarDono, lerDB, soNumeros } = require("../validar-dono/validar-dono");
const { isAdmin } = require("../grupo/grupo");
const { enviarListaWhatsApp, enviarBotoesNavegacao } = require("../menuBotoes/menuBotoes");

const dbPath = path.join(__dirname, "../../database/botconfig.json");

function lerDBLocal() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function salvarDB(db) {
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
}

// 📥 BAIXA MÍDIA
async function baixarMidia(msg, tipo) {
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const quotedParticipant = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const quotedStanzaId = msg.message?.extendedTextMessage?.contextInfo?.stanzaId;

    if (msg.message?.[tipo]) return await downloadMediaMessage(msg, "buffer", {});
    if (quotedMsg?.[tipo]) {
        const msgFake = { 
            key: { remoteJid: msg.key.remoteJid, id: quotedStanzaId || msg.key.id, participant: quotedParticipant || msg.key.participant, fromMe: false }, 
            message: quotedMsg 
        };
        return await downloadMediaMessage(msgFake, "buffer", {});
    }
    return null;
}

// 🎞️ EXTRAI UM FRAME DE VÍDEO/GIF PRA VIRAR IMAGEM DE FUNDO
// (os cards são desenhados em canvas, então o fundo precisa ser sempre
// uma imagem estática — se a pessoa mandar vídeo ou gif, pegamos um
// frame de dentro dele em vez de rejeitar o envio)
async function extrairFrameDoVideo(bufferVideo, destinoFinal) {
    const nomeTemp = Date.now() + "_" + Math.floor(Math.random() * 9999);
    const tempEntrada = path.join(__dirname, `fundo_entrada_${nomeTemp}.tmp`);
    try {
        fs.writeFileSync(tempEntrada, bufferVideo);
        // -ss 0.3 evita pegar um primeiro frame preto/em branco em alguns vídeos
        const comando = `ffmpeg -y -ss 0.3 -i "${tempEntrada}" -frames:v 1 -q:v 2 "${destinoFinal}"`;
        await execAsync(comando);
        return fs.existsSync(destinoFinal) && fs.statSync(destinoFinal).size > 0;
    } catch (erro) {
        console.error("❌ Erro ao extrair frame do vídeo/gif de fundo:", erro.message);
        return false;
    } finally {
        if (fs.existsSync(tempEntrada)) fs.unlinkSync(tempEntrada);
    }
}

// 🎞️ CONVERTE UM GIF (enviado como arquivo/documento) EM MP4, PARA
// PODER SER ENVIADO DEPOIS COM gifPlayback (roda em loop igual gif)
async function converterGifParaMp4(bufferGif, destinoFinal) {
    const nomeTemp = Date.now() + "_" + Math.floor(Math.random() * 9999);
    const tempEntrada = path.join(__dirname, `gif_entrada_${nomeTemp}.tmp`);
    try {
        fs.writeFileSync(tempEntrada, bufferGif);
        const comando = `ffmpeg -y -i "${tempEntrada}" -movflags faststart -pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" "${destinoFinal}"`;
        await execAsync(comando);
        return fs.existsSync(destinoFinal) && fs.statSync(destinoFinal).size > 0;
    } catch (erro) {
        console.error("❌ Erro ao converter gif para mp4:", erro.message);
        return false;
    } finally {
        if (fs.existsSync(tempEntrada)) fs.unlinkSync(tempEntrada);
    }
}

// 🔐 CONTROLE DE ACESSO

async function _configurarBotInterno(sock, msg, args) {
    args = args || [];
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    let db = lerDBLocal();

    // ✅ VALORES PADRÃO — SEMPRE GARANTE ALGO
    if (!db.PREFIX) db.PREFIX = config.PREFIX;
    if (!db.BOT_NAME) db.BOT_NAME = config.BOT_NAME;
    if (!db.OWNER_NAME) db.OWNER_NAME = config.OWNER_NAME;
    if (!db.OWNER_NUMBER) db.OWNER_NUMBER = config.OWNER_NUMBER;
    salvarDB(db);

    // ✅ VERIFICAÇÃO OFICIAL
    const ehRealmenteDono = validarDono(userId);
    const NOME_DONO_ATUAL = db.OWNER_NAME || config.OWNER_NAME;
    const NUMERO_DONO_ATUAL = soNumeros(db.OWNER_NUMBER || config.OWNER_NUMBER);

    // 👮 SÓ ADMIN (OU DONO) PODE MEXER NA CONFIGURAÇÃO, QUANDO USADO DENTRO DE GRUPO
    let usuarioEhAdmin = false;
    if (from.endsWith("@g.us")) {
        usuarioEhAdmin = ehRealmenteDono || await isAdmin(sock, from, userId).catch(() => false);
        if (!usuarioEhAdmin) {
            return await sock.sendMessage(from, {
                text: `╭━🚫━━━━━━━━━━━━🚫━╮\n   ❌ ACESSO NEGADO\n╰━🚫━━━━━━━━━━━━🚫━╯\n\nSó *administradores do grupo* podem mexer na configuração do bot.`
            }, { quoted: msg });
        }
    }

    // 📸 FOTO E EXIBIÇÃO
    let fotoUsuario = "https://i.imgur.com/3n8CwUl.png";
    try { fotoUsuario = await sock.profilePictureUrl(userId, "image"); } catch {}
    const exibeNumero = soNumeros(userId);

    // ==================================================
    // 🔓 SEM SENHA NENHUMA — só precisa ser admin (em grupo) ou dono (no PV)
    // ==================================================
    // Antes existia um código/senha extra pra quem não fosse admin/dono.
    // Isso foi removido de vez: quem chegou até aqui (passou pela checagem
    // de admin/dono lá em cima) já entra direto no painel.
    if (!from.endsWith("@g.us") && !ehRealmenteDono) {
        return await sock.sendMessage(from, {
            text: `🚫 Só o dono do bot pode acessar essa configuração no privado.`
        }, { quoted: msg });
    }


    // ==================================================
    // ✅ TELA PRINCIPAL — LIBERADO
    // ==================================================
    const PFX = db.PREFIX || config.PREFIX;
    const CB = `${PFX}configurar-bot`;

    if (!args.length) {
        // 🎛️ PAINEL PRINCIPAL DE CONFIGURAÇÃO
        // Tudo que pode ser alterado pelo painel fica disponível aqui,
        // sem abrir outra tela de "CONFIGURAÇÕES" no meio do caminho.
        return await enviarListaWhatsApp(sock, from, {
            text: `〔 ⚙️ CONFIGURAÇÕES DO BOT 〕\n\nEscolha diretamente o que deseja alterar.\n\n💾 As alterações são salvas em database/botconfig.json e aplicadas ao bot.`,
            title: '⚙️ CONFIGURAÇÕES',
            sections: [{
                title: 'IDENTIDADE E ACESSO',
                rows: [
                    { id: 'cfg_prefixo', title: '🔑 MUDAR PREFIXO', description: `Atual: ${PFX}` },
                    { id: 'cfg_nome', title: '🤖 MUDAR NOME DO BOT', description: `Atual: ${db.BOT_NAME || config.BOT_NAME}` },
                    { id: 'cfg_criador', title: '👑 MUDAR NOME DO CRIADOR', description: `Atual: ${db.OWNER_NAME || config.OWNER_NAME}` },
                    { id: 'cfg_numero', title: '📱 MUDAR NÚMERO DO CRIADOR', description: `Atual: +${NUMERO_DONO_ATUAL}` }
                ]
            }, {
                title: 'MÍDIA DO BOT',
                rows: [
                    { id: 'cfg_upload_menu', title: '🖼️ SUBIR FOTO MENU', description: 'Imagem, GIF ou vídeo do menu' },
                    { id: 'cfg_upload_fundo', title: '🌌 SUBIR FOTO FUNDO', description: 'Imagem, GIF ou vídeo do fundo dos cards' },
                    { id: 'cfg_upload_gif', title: '🎬 SUBIR GIF', description: 'Cadastrar GIF por categoria' },
                    { id: 'cfg_upload_audio', title: '🎵 SUBIR ÁUDIO', description: 'Cadastrar áudio por categoria' },
                    { id: 'cfg_del_tipo:gif', title: '🗑️ APAGAR GIF', description: 'Ver e apagar GIFs por categoria' },
                    { id: 'cfg_del_tipo:audio', title: '🗑️ APAGAR ÁUDIO', description: 'Ver e apagar áudios por categoria' }
                ]
            }],
            quoted: msg
        });
    }

    const opcao = args[0].toLowerCase();
    const valor = args.slice(1).join(" ").trim();

    // ──────────────────────────────────────────────────────────────────────
    // ✅ COMANDO: PREFIXO → TROCA IMEDIATAMENTE, SEM REINICIAR
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "prefixo") {
        if (!valor) return await sock.sendMessage(from, { text: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Exemplo correto:\n▫️ ${CB} prefixo !\n▫️ ${CB} prefixo .\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        
        db.PREFIX = valor;
        salvarDB(db);

        await sock.sendMessage(from, { 
            image: { url: fotoUsuario }, 
            caption: `╭━✅━━━━━━━━✅━╮\n🔁 PREFIXO ALTERADO COM SUCESSO!\n🔑 NOVO: *${valor}*\n⚡ Aplicado imediatamente — sem reiniciar o bot.\n╰━━━━━━━━━━━━━━━╯` 
        }, { quoted: msg });

        // O mikasabot.js recarrega o prefixo do banco a cada mensagem.
        // Não encerramos o processo: o bot continua conectado e funcionando.
        config.PREFIX = valor;
        return;
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ COMANDO: NOME DO BOT
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "nome") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Digite o novo nome!\nEx: nome MeuBot\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        
        db.BOT_NAME = valor;
        salvarDB(db);
        config.BOT_NAME = valor;
        return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n🤖 NOME DO BOT ALTERADO:\n✨ *${valor}*\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ COMANDO: NOME DO CRIADOR / DONO
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "criador" || opcao === "dono" || opcao === "criadora") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Digite o nome completo!\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        
        db.OWNER_NAME = valor;
        salvarDB(db);
        config.OWNER_NAME = valor;
        const { enviarMensagemPadrao } = require('../menuBotoes/menuBotoes');
        return enviarMensagemPadrao(sock, from, {
            titulo: 'NOME DO CRIADOR',
            linhas: [`👑 ATUALIZADO:`, `✨ *${valor}*`],
            quoted: msg
        });
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ COMANDOS: OUTROS NÚMEROS DE DONO (adddono / deldono / donos)
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "adddono" || opcao === "deldono" || opcao === "donos") {
        const extras = Array.isArray(db.DONOS_EXTRAS) ? db.DONOS_EXTRAS : [];
        if (opcao === "donos") {
            return await sock.sendMessage(from, { text: `👑 *DONOS*\n\n• Principal: +${db.OWNER_NUMBER || config.OWNER_NUMBER}\n${extras.length ? extras.map(n => `• Extra: +${n}`).join("\n") : "• Nenhum número extra cadastrado."}\n\n➕ Adicionar: configurar-bot adddono NUMERO\n➖ Remover: configurar-bot deldono NUMERO` }, { quoted: msg });
        }
        const numeroExtra = soNumeros(valor);
        if (numeroExtra.length < 11) {
            return await sock.sendMessage(from, { text: `❌ Digite o número completo com DDI e DDD.\nEx: configurar-bot ${opcao} 5516994306634` }, { quoted: msg });
        }
        db.DONOS_EXTRAS = opcao === "adddono"
            ? [...new Set([...extras, numeroExtra])]
            : extras.filter(n => n !== numeroExtra);
        salvarDB(db);
        return await sock.sendMessage(from, { text: opcao === "adddono" ? `✅ +${numeroExtra} agora também é *DONO* do bot.` : `✅ +${numeroExtra} não é mais dono do bot.` }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ COMANDO: TROCAR NÚMERO DO DONO — O MAIS IMPORTANTE
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "numero") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Digite número completo com DDD!\nEx: numero 5516994306634\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        
        const novoNumeroLimpo = soNumeros(valor);
        if (novoNumeroLimpo.length < 11) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ Número inválido! Faltam dígitos.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        db.OWNER_NUMBER = novoNumeroLimpo;
        salvarDB(db);
        config.OWNER_NUMBER = novoNumeroLimpo;

        await sock.sendMessage(from, { 
            image: { url: fotoUsuario }, 
            caption: `╭━✅━━━━━━━━✅━╮\n📱 NÚMERO DE DONO SALVO!\n🔢 +${novoNumeroLimpo}\n💡 Agora só esse número tem acesso direto.\n╰━━━━━━━━━━━━━━━╯` 
        }, { quoted: msg });
        return;
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ COMANDO: SALVAR O "LID" DO DONO (sistema de identidade oculta do
    // WhatsApp). Use quando o bot não reconhece o dono mesmo com o número
    // certo salvo — rode antes ".meuid" na PV pra pegar o valor de
    // "Participante" e cole aqui.
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "lid") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Digite o lid! Use .meuid antes pra pegar o valor.\nEx: lid 123456789012345\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        const lidLimpo = soNumeros(valor);
        if (!lidLimpo) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ Lid inválido!\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        db.OWNER_LID = lidLimpo;
        salvarDB(db);

        await sock.sendMessage(from, {
            image: { url: fotoUsuario },
            caption: `╭━✅━━━━━━━━✅━╮\n🆔 LID DO DONO SALVO!\n🔢 ${lidLimpo}\n💡 Agora o bot reconhece esse identificador também.\n╰━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        return;
    }

    // ──────────────────────────────────────────────────────────────────────
    // 💳 COMANDO: TOKEN DO MERCADO PAGO (sistema de aluguel do bot via Pix)
    // Use: .configurar-bot mptoken SEU_ACCESS_TOKEN
    // Pega esse token no painel do Mercado Pago em:
    // Seu negócio → Configurações → Credenciais → Credenciais de produção
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "mptoken") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Cole o Access Token do Mercado Pago!\nEx: mptoken APP_USR-1234...\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        db.MP_ACCESS_TOKEN = valor.trim();
        salvarDB(db);
        config.MP_ACCESS_TOKEN = valor.trim();

        await sock.sendMessage(from, {
            image: { url: fotoUsuario },
            caption: `╭━✅━━━━━━━━✅━╮\n💳 TOKEN DO MERCADO PAGO SALVO!\n💎 O sistema de aluguel do bot via Pix já está ativo.\n╰━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
        return;
    }


    // ──────────────────────────────────────────────────────────────────────
    // 💍 MENSAGEM DE ANIVERSÁRIO DO CASAMENTO
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "aniversario") {
        if (!valor) return await sock.sendMessage(from, { text: `Uso: ${CB} aniversario sua mensagem\nMarcadores: {meses}, @A, @B, {bot}` }, { quoted: msg });
        const rpath = path.join(__dirname, "../../database/recursos-avancados.json");
        let rdb = {};
        try { rdb = fs.existsSync(rpath) ? JSON.parse(fs.readFileSync(rpath, "utf8")) : {}; } catch {}
        rdb.config ||= {};
        rdb.config.mensagemAniversario = valor;
        fs.writeFileSync(rpath, JSON.stringify(rdb, null, 2));
        return await sock.sendMessage(from, { text: `✅ Mensagem de aniversário salva com sucesso!\n\n💍 Ela será usada automaticamente nos aniversários mensais dos casais.` }, { quoted: msg });
    }

    if (opcao === "aniversario-reset") {
        const rpath = path.join(__dirname, "../../database/recursos-avancados.json");
        let rdb = {};
        try { rdb = fs.existsSync(rpath) ? JSON.parse(fs.readFileSync(rpath, "utf8")) : {}; } catch {}
        rdb.config ||= {};
        delete rdb.config.mensagemAniversario;
        fs.writeFileSync(rpath, JSON.stringify(rdb, null, 2));
        return await sock.sendMessage(from, { text: `✅ Mensagem padrão de aniversário restaurada.` }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────────────
    // 📦 16 LINKS DO MEDIAFIRE
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "mediafire" || opcao === "mediafirename") {
        const numero = Number(args[1]);
        if (!Number.isInteger(numero) || numero < 1 || numero > 16 || !args[2]) {
            return await sock.sendMessage(from, { text: `Uso:\n${CB} mediafire 1 https://mediafire.com/...\n${CB} mediafirename 1 Free Fire\n\nOs números válidos são de 1 a 16.` }, { quoted: msg });
        }
        const rpath = path.join(__dirname, "../../database/mediafire.json");
        let mf = {};
        try { mf = fs.existsSync(rpath) ? JSON.parse(fs.readFileSync(rpath, "utf8")) : {}; } catch {}
        mf[String(numero)] ||= { nome: `Aplicativo ${numero}`, link: "" };
        if (opcao === "mediafire") mf[String(numero)].link = args.slice(2).join(" ").trim();
        else mf[String(numero)].nome = args.slice(2).join(" ").trim();
        fs.writeFileSync(rpath, JSON.stringify(mf, null, 2));
        return await sock.sendMessage(from, { text: `✅ ${opcao === "mediafire" ? "Link" : "Nome"} do item ${numero} atualizado.` }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ CHAVES DE API PRO COMANDO .meme (Tenor / Giphy)
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "tenorkey") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Exemplo correto:\n▫️ ${CB} tenorkey SUA_CHAVE_AQUI\n\n💡 Pegue grátis em: developers.google.com/tenor\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        db.TENOR_API_KEY = valor;
        salvarDB(db);

        return await sock.sendMessage(from, {
            image: { url: fotoUsuario },
            caption: `╭━✅━━━━━━━━✅━╮\n🔑 CHAVE DO TENOR SALVA!\n💡 O comando ${PFX}meme já vai poder usar.\n╰━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
    }

    if (opcao === "giphykey") {
        if (!valor) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Exemplo correto:\n▫️ ${CB} giphykey SUA_CHAVE_AQUI\n\n💡 Pegue grátis em: developers.giphy.com\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        db.GIPHY_API_KEY = valor;
        salvarDB(db);

        return await sock.sendMessage(from, {
            image: { url: fotoUsuario },
            caption: `╭━✅━━━━━━━━✅━╮\n🔑 CHAVE DO GIPHY SALVA!\n💡 O comando ${PFX}meme já vai poder usar.\n╰━━━━━━━━━━━━━━━╯`
        }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ SALVAR FOTO DE FUNDO (diferente da foto do menu)
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "fundo") {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const temImagem = msg.message?.imageMessage || quotedMsg?.imageMessage;
        const temVideo = msg.message?.videoMessage || quotedMsg?.videoMessage;
        const docMsg = msg.message?.documentMessage || quotedMsg?.documentMessage;
        const temGifDocumento = docMsg && (docMsg.mimetype || "").includes("gif");

        if (!temImagem && !temVideo && !temGifDocumento) {
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━🖼️━━━━━━🖼️━╮\n📸 Envie ou marque uma IMAGEM, VÍDEO ou GIF!\n(essa mídia vira o fundo usado nos cards\nde música, casal, perfil, etc)\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }

        try {
            const tipoMsg = temImagem ? "imageMessage" : temVideo ? "videoMessage" : "documentMessage";
            const dados = await baixarMidia(msg, tipoMsg);
            if (!dados || !dados.length) {
                return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ O DOWNLOAD DA MÍDIA VEIO VAZIO!\n💡 Tente reenviar a mídia original (sem editar) e marque de novo.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
            }

            const destinoFundo = path.join(__dirname, "../midias/imagens/fundo.png");
            const destinoFundoAnimado = path.join(__dirname, "../midias/videos/fundo_animado.mp4");

            if (temImagem) {
                // 🖼️ Imagem: salva direto, sem precisar converter nada.
                fs.writeFileSync(destinoFundo, dados);
                if (fs.existsSync(destinoFundoAnimado)) fs.unlinkSync(destinoFundoAnimado);
                db.BOT_FUNDO_ANIMADO = false;
            } else {
                // 🎥 Vídeo/GIF: além de extrair um frame (fallback de segurança),
                // guardamos o vídeo/gif ORIGINAL também — é ele que os cards vão
                // usar de verdade pra rodar animado em vez de ficar parado.
                const conseguiu = await extrairFrameDoVideo(dados, destinoFundo);
                if (!conseguiu) {
                    return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ NÃO CONSEGUI LER ESSE VÍDEO/GIF!\n💡 Tente reenviar em outro formato.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
                }

                if (temGifDocumento) {
                    const conseguiuMp4 = await converterGifParaMp4(dados, destinoFundoAnimado);
                    if (!conseguiuMp4) {
                        return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ NÃO CONSEGUI CONVERTER ESSE GIF!\n💡 Tente reenviar em outro formato.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
                    }
                } else {
                    fs.writeFileSync(destinoFundoAnimado, dados);
                }
                db.BOT_FUNDO_ANIMADO = true;
            }

            db.BOT_FUNDO = caminhoSalvo(destinoFundo);
            salvarDB(db);
            const avisoAnimado = db.BOT_FUNDO_ANIMADO ? "\n🎬 É vídeo/gif — os cards agora vão RODAR de verdade (não fica mais parado)." : "";
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n🖼️ FOTO DE FUNDO ATUALIZADA!\n💡 Já vale pros próximos cards gerados.${avisoAnimado}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        } catch (erro) {
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ ERRO AO SALVAR:\n${erro.message}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ SUBIR GIF PRA MATAR / TAPA / CHUTE — sem limite de quantidade, com
    // nome livre (sempre salvo terminando em .gif). Nunca apaga os
    // anteriores — na hora de usar .matar/.tapa/.chute o bot escolhe um
    // aleatório entre todos os que tiverem sido subidos pra aquele tipo.
    // ──────────────────────────────────────────────────────────────────────
    // ──────────────────────────────────────────────────────────────────────
    // ✅ SUBIR ÁUDIO PRA MENU / MENUPV / ENTRADA / SAÍDA / PREFIXO /
    // BOMDIA / BOATARDE / BOANOITE / ANTIAMOR — sem limite de quantidade. Se tiver
    // mais de um na mesma categoria, o bot escolhe aleatório (sem repetir
    // o mesmo dois seguidos) toda vez que precisar. Nunca apaga os que
    // já tem.
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "subiraudio") {
        const partesAudio = valor.split(/\s+/).filter(Boolean);
        const categoriaAudio = (partesAudio[0] || "").toLowerCase();
        const nomeAudioPartes = partesAudio.slice(1);
        const categoriasValidas = ["menu", "menupv", "entrada", "saida", "prefixo", "bomdia", "boatarde", "boanoite", "antiamor"];

        if (!categoriasValidas.includes(categoriaAudio)) {
            return await sock.sendMessage(from, {
                image: { url: fotoUsuario },
                caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Categoria de áudio inválida.\n\n📂 Categorias: menu, menupv, entrada, saida, prefixo, bomdia, boatarde, boanoite, antiamor\n\n📎 Depois de escolher a categoria, envie ou marque o ÁUDIO.\n💡 O nome do arquivo é criado automaticamente e os áudios anteriores são preservados.\n╰━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        const quotedMsgAudio = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const temAudioSubir = msg.message?.audioMessage || quotedMsgAudio?.audioMessage;

        if (!temAudioSubir) {
            return await sock.sendMessage(from, {
                image: { url: fotoUsuario },
                caption: `╭━🎵━━━━━━🎵━╮\n📎 Marque ou envie um ÁUDIO junto com o comando!\n╰━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        try {
            const dadosAudio = await baixarMidia(msg, "audioMessage");

            if (!dadosAudio || !dadosAudio.length) {
                return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ O DOWNLOAD VEIO VAZIO!\n💡 Tente reenviar o áudio original e marque de novo.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
            }

            let nomeAudioSeguro = nomeAudioPartes.join("_").replace(/[^a-zA-Z0-9_\-]/g, "");
            if (!nomeAudioSeguro) nomeAudioSeguro = `audio_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

            const pastaCategoria = path.join(__dirname, "../midias/audios", categoriaAudio);
            fs.mkdirSync(pastaCategoria, { recursive: true });

            // formato original não importa — o audio-pastas.js já converte
            // tudo pro formato certo de voz na hora de enviar.
            let destinoAudio = path.join(pastaCategoria, `${nomeAudioSeguro}.mp3`);
            let contadorAudio = 1;
            while (fs.existsSync(destinoAudio)) {
                destinoAudio = path.join(pastaCategoria, `${nomeAudioSeguro}_${contadorAudio}.mp3`);
                contadorAudio++;
            }

            fs.writeFileSync(destinoAudio, dadosAudio);

            const totalNaCategoria = fs.readdirSync(pastaCategoria).filter(f => /\.(mp3|ogg|m4a|opus|wav)$/i.test(f)).length;

            return await enviarBotoesNavegacao(sock, from, {
                text: `╭━✅━━━━━━━━━━━━━━━╮\n🎵 *ÁUDIO SALVO COM SUCESSO!*\n╰━━━━━━━━━━━━━━━━━╯\n\n📂 Categoria: *${categoriaAudio}*\n🏷️ Arquivo: \`${path.basename(destinoAudio)}\`\n📊 Total nesta categoria: *${totalNaCategoria}*\n\n💾 O áudio foi salvo automaticamente e entrou no sorteio da categoria.`,
                footer: '🎵 Gerenciador de Áudios • MIKASA',
                buttons: [
                    { id: `cfg_audio_outro:${categoriaAudio}`, text: '『 ➕ 』 SUBIR OUTRO' },
                    { id: 'cfg_upload_audio', text: '『 🔙 』 TROCAR CATEGORIA' },
                    { id: `cfg_del_arq:audio:${categoriaAudio}:${encodeURIComponent(path.basename(destinoAudio))}`, text: '『 🗑️ 』 APAGAR ESTE' }
                ],
                quoted: undefined
            });

        } catch (erro) {
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ ERRO AO SALVAR:\n${erro.message}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
    }

    if (opcao === "subirgif") {
        const partesValor = valor.split(/\s+/).filter(Boolean);
        const tipoGif = (partesValor[0] || "").toLowerCase();
        const nomePartes = partesValor.slice(1);
        const tiposValidos = ["matar", "tapa", "chute", "beijar", "abracar"];

        if (!tiposValidos.includes(tipoGif)) {
            return await sock.sendMessage(from, {
                image: { url: fotoUsuario },
                caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Categoria de GIF inválida.\n\n📂 Categorias: matar, tapa, chute, beijar, abracar\n\n📎 Depois de escolher a categoria, envie ou marque o GIF/vídeo.\n💡 O nome do arquivo é criado automaticamente e os GIFs anteriores são preservados.\n╰━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        const quotedMsgGif = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const temVideoGif = msg.message?.videoMessage || quotedMsgGif?.videoMessage;
        const docMsgGif = msg.message?.documentMessage || quotedMsgGif?.documentMessage;
        const temGifDocumentoGif = docMsgGif && (docMsgGif.mimetype || "").includes("gif");

        if (!temVideoGif && !temGifDocumentoGif) {
            return await sock.sendMessage(from, {
                image: { url: fotoUsuario },
                caption: `╭━🎬━━━━━━🎬━╮\n📎 Marque ou envie um VÍDEO ou GIF junto com o comando!\n╰━━━━━━━━━━━━━━━╯`
            }, { quoted: msg });
        }

        try {
            const tipoMsgGif = temVideoGif ? "videoMessage" : "documentMessage";
            const dadosGif = await baixarMidia(msg, tipoMsgGif);

            if (!dadosGif || !dadosGif.length) {
                return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ O DOWNLOAD VEIO VAZIO!\n💡 Tente reenviar a mídia original e marque de novo.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
            }

            // nome de arquivo seguro — livre, mas sempre termina em .gif
            let nomeSeguro = nomePartes.join("_").replace(/[^a-zA-Z0-9_\-]/g, "");
            nomeSeguro = nomeSeguro.replace(/\.gif$/i, "");
            if (!nomeSeguro) nomeSeguro = `gif_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

            const pastaTipo = path.join(__dirname, "../midias/gifs", tipoGif);
            fs.mkdirSync(pastaTipo, { recursive: true });

            let destinoGif = path.join(pastaTipo, `${nomeSeguro}.mp4`);
            // evita sobrescrever sem querer se já existir um com esse nome
            let contador = 1;
            while (fs.existsSync(destinoGif)) {
                destinoGif = path.join(pastaTipo, `${nomeSeguro}_${contador}.mp4`);
                contador++;
            }

            if (temGifDocumentoGif) {
                const conseguiuMp4 = await converterGifParaMp4(dadosGif, destinoGif);
                if (!conseguiuMp4) {
                    return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ NÃO CONSEGUI CONVERTER ESSE GIF!\n💡 Tente reenviar em outro formato.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
                }
            } else {
                fs.writeFileSync(destinoGif, dadosGif);
            }

            const totalNaCategoria = fs.readdirSync(pastaTipo).filter(f => /\.(mp4|gif)$/i.test(f)).length;

            return await enviarBotoesNavegacao(sock, from, {
                text: `╭━✅━━━━━━━━━━━━━━━╮\n🎬 *GIF SALVO COM SUCESSO!*\n╰━━━━━━━━━━━━━━━━━╯\n\n📂 Categoria: *${tipoGif}*\n🏷️ Arquivo: \`${path.basename(destinoGif)}\`\n📊 Total nesta categoria: *${totalNaCategoria}*\n\n💾 O GIF foi salvo automaticamente e entrou no sorteio da categoria.`,
                footer: '🎬 Gerenciador de GIFs • MIKASA',
                buttons: [
                    { id: `cfg_gif_outro:${tipoGif}`, text: '『 ➕ 』 SUBIR OUTRO' },
                    { id: 'cfg_upload_gif', text: '『 🔙 』 TROCAR CATEGORIA' },
                    { id: `cfg_del_arq:gif:${tipoGif}:${encodeURIComponent(path.basename(destinoGif))}`, text: '『 🗑️ 』 APAGAR ESTE' }
                ],
                quoted: undefined
            });

        } catch (erro) {
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ ERRO AO SALVAR:\n${erro.message}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ SALVAR FOTO / VÍDEO DO MENU
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "foto") {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imagemMsg = msg.message?.imageMessage || quotedMsg?.imageMessage;
        const videoMsg = msg.message?.videoMessage || quotedMsg?.videoMessage;
        const docMsg = msg.message?.documentMessage || quotedMsg?.documentMessage;
        const temImagem = !!imagemMsg;
        const temVideo = !!videoMsg;
        // 🎞️ GIF pode chegar de dois jeitos: como vídeo com gifPlayback=true
        // (jeito normal do WhatsApp) ou como arquivo/documento .gif.
        const temGifDocumento = !!docMsg && (docMsg.mimetype || "").includes("gif");
        const ehGifPlayback = !!videoMsg?.gifPlayback;

        if (!temImagem && !temVideo && !temGifDocumento) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━🖼️━━━━━━🖼️━╮\n📸 Envie ou marque uma IMAGEM, VÍDEO ou GIF!\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        try {
            const ehAnimadoComoGif = ehGifPlayback || temGifDocumento;
            const nomeArquivo = (temVideo || temGifDocumento) ? "menu.mp4" : "menu.png";
            const tipoMsg = temImagem ? "imageMessage" : temVideo ? "videoMessage" : "documentMessage";
            const dados = await baixarMidia(msg, tipoMsg);

            // ✅ Checa ANTES de salvar se o download realmente veio com dados
            // (se vier vazio/corrompido, o card só ia falhar depois, sem
            // explicação nenhuma pro dono do bot — agora avisa na hora).
            if (!dados || !dados.length) {
                return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ O DOWNLOAD DA MÍDIA VEIO VAZIO!\n💡 Tente reenviar a imagem/vídeo/gif original (sem editar) e marque de novo.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
            }

            const destino = destinoDaMidiaDoMenu(nomeArquivo);

            // Remove a mídia anterior para a nova realmente substituir o menu.
            const destinoImagemAntiga = path.join(__dirname, "../midias/imagens/menu.png");
            const destinoVideoAntigo = path.join(__dirname, "../midias/videos/menu.mp4");
            if (temImagem) {
                if (fs.existsSync(destinoVideoAntigo)) fs.unlinkSync(destinoVideoAntigo);
            } else {
                if (fs.existsSync(destinoImagemAntiga)) fs.unlinkSync(destinoImagemAntiga);
            }

            if (temImagem) {
                const { detectarFormatoImagem } = require("../cardGenerator/cardGenerator");
                console.log(`🔍 Foto do menu recebida: ${dados.length} bytes, formato real detectado: ${detectarFormatoImagem(dados)}`);
                fs.writeFileSync(destino, dados);
            } else if (temVideo) {
                fs.writeFileSync(destino, dados);
            } else {
                // 🎞️ Arquivo .gif enviado como documento — converte pra mp4
                // (o WhatsApp precisa de um vídeo internamente pra tocar
                // com gifPlayback, mesmo quando a origem é um .gif de verdade).
                const conseguiu = await converterGifParaMp4(dados, destino);
                if (!conseguiu) {
                    return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ NÃO CONSEGUI LER ESSE GIF!\n💡 Tente reenviar em outro formato.\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
                }
            }

            db.BOT_PHOTO = caminhoSalvo(destino);
            db.BOT_PHOTO_GIF = ehAnimadoComoGif; // controla se envia com gifPlayback (loop) ou vídeo normal
            salvarDB(db);
            const sufixoGif = ehAnimadoComoGif ? "\n🎞️ Detectado como GIF — vai rodar em loop." : "";
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n📤 MÍDIA DO MENU SALVA COM SUCESSO!${sufixoGif}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        } catch (erro) {
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ ERRO AO SALVAR:\n${erro.message}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ SALVAR ÁUDIO PERSONALIZADO
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "audio") {
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const temAudio = msg.message?.audioMessage || quotedMsg?.audioMessage;

        if (!temAudio) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━🎵━━━━━━🎵━╮\n🎤 Envie ou marque um ARQUIVO DE ÁUDIO!\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });

        try {
            const dados = await baixarMidia(msg, "audioMessage");
            const destinoAudioMenu = path.join(__dirname, "../midias/sons/menu_audio.mp3");
            fs.writeFileSync(destinoAudioMenu, dados);
            db.BOT_AUDIO = caminhoSalvo(destinoAudioMenu);
            salvarDB(db);
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n🎶 ÁUDIO PERSONALIZADO SALVO!\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        } catch (erro) {
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n❌ ERRO AO SALVAR:\n${erro.message}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ VER TODAS AS INFORMAÇÕES SALVAS
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "info") {
        const listaEmojis = (db.EMOJIS_REACAO || []).join(" ") || "❌ Nenhum cadastrado";
        const statusReacao = db.REACAO_ATIVA !== false ? "✅ ATIVADO" : "❌ DESATIVADO";

        return await sock.sendMessage(from, {
            image: { url: fotoUsuario },
            caption: `╭━📊━━━━━━━━📊━╮
 📋 DADOS GERAIS DO SISTEMA
╰━━━━━━━━━━━━━━━╯

🔹 PREFIXO ATUAL: ${db.PREFIX}
🔹 NOME DO BOT: ${db.BOT_NAME}
🔹 CRIADOR/DONO: ${db.OWNER_NAME}
🔹 NÚMERO DONO: +${NUMERO_DONO_ATUAL}

🖼️ FOTO/VÍDEO MENU: ${db.BOT_PHOTO ? "✅ SALVO" : "❌ PADRÃO"}
🎵 ÁUDIO MENU: ${db.BOT_AUDIO ? "✅ SALVO" : "❌ PADRÃO"}

🎭 REAÇÕES EM STATUS: ${statusReacao}
${listaEmojis}

━━━━━━━━━━━━━━━━━
🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
━━━━━━━━━━━━━━━━━`
        }, { quoted: msg });
    }

    // ──────────────────────────────────────────────────────────────────────
    // ✅ SISTEMA COMPLETO DE REAÇÕES
    // ──────────────────────────────────────────────────────────────────────
    if (opcao === "reacao") {
        const subComando = args[1] || "status";

        if (subComando === "status") {
            const lista = (db.EMOJIS_REACAO || []).join(" ") || "❌ Nenhum cadastrado";
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━🎭━━━━━━🎭━╮\n📊 SITUAÇÃO: ${db.REACAO_ATIVA !== false ? "✅ LIGADO" : "❌ DESLIGADO"}\n🎭 EMOJIS:\n${lista}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }

        if (subComando === "ativar" || subComando === "ligar") {
            db.REACAO_ATIVA = true; salvarDB(db);
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n🎭 REAÇÕES EM STATUS: *LIGADAS!*\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }

        if (subComando === "desativar" || subComando === "desligar") {
            db.REACAO_ATIVA = false; salvarDB(db);
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━❌━━━━━━━━❌━╮\n🎭 REAÇÕES EM STATUS: *DESLIGADAS!*\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }

        if (subComando === "adicionar") {
            const novosEmojis = args.slice(2);
            if (!novosEmojis.length) return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ Exemplo: reacao adicionar 😂🔥💖\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
            
            if (!db.EMOJIS_REACAO) db.EMOJIS_REACAO = [];
            db.EMOJIS_REACAO.push(...novosEmojis);
            db.EMOJIS_REACAO = [...new Set(db.EMOJIS_REACAO)]; // Não deixa repetir
            salvarDB(db);
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n🎭 ADICIONADO COM SUCESSO:\n${novosEmojis.join(" ")}\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }

        if (subComando === "resetar") {
            db.EMOJIS_REACAO = ["👍","❤️","😂","🤔","👏","🎉","🔥","✨","💯","🌟","😍","🚀","⭐","💪","🎊","👌","🌸","💖","😎","🤩"];
            salvarDB(db);
            return await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━✅━━━━━━━━✅━╮\n🔄 LISTA DE EMOJIS PADRÃO RESTAURADA!\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
        }
    }

    // ❌ COMANDO NÃO EXISTE
    await sock.sendMessage(from, { image: { url: fotoUsuario }, caption: `╭━⚠️━━━━━━━━⚠️━╮\n❌ OPÇÃO INVÁLIDA!\nDigite apenas: ${db.PREFIX}configurar-bot\n╰━━━━━━━━━━━━━━━╯` }, { quoted: msg });
}

// 🚪 PORTA DE ENTRADA PÚBLICA — só administradores do grupo (ou o dono real)
// podem usar esse comando, e nenhum erro interno derruba o bot.
async function configurarBot(sock, msg, args) {
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    try {
        if (from.endsWith("@g.us")) {
            const souAdmin = await isAdmin(sock, from, userId);
            const souDono = validarDono(userId);
            if (!souAdmin && !souDono) {
                return await sock.sendMessage(from, {
                    text: `🔒 Esse comando só pode ser usado por *administradores do grupo*.`
                }, { quoted: msg });
            }
        }
        return await _configurarBotInterno(sock, msg, args || []);
    } catch (erro) {
        console.error("❌ Erro no configurar-bot:", erro);
        return sock.sendMessage(from, {
            text: "❌ Ocorreu um erro ao processar esse comando. Tenta de novo."
        }, { quoted: msg }).catch(() => {});
    }
}

module.exports = { configurarBot };

