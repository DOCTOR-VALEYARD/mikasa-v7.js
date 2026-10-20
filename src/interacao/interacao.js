const path = require('path');
const fs = require('fs');
const { normalize } = require('../grupo/grupo');

// 🎲 Escolhe um gif aleatório entre todos os que já foram subidos pra
// essa categoria (matar/tapa/chute) via ".configurar-bot subirgif". Não
// tem limite de quantos podem existir na pasta.
function escolherGifAleatorio(tipo) {
    const pasta = path.join(__dirname, "../midias/gifs", tipo);
    try {
        const arquivos = fs.readdirSync(pasta).filter(f => /\.(mp4|gif)$/i.test(f));
        if (!arquivos.length) return null;
        const escolhido = arquivos[Math.floor(Math.random() * arquivos.length)];
        return path.join(pasta, escolhido);
    } catch {
        return null;
    }
}

async function interacao(sock, from, msg, command, args) {
    const citado = msg.message?.extendedTextMessage?.contextInfo?.participant;
    const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    const alvo = mencionado || citado;

    if (!alvo) {
        return sock.sendMessage(from, { text: `❌ Você precisa marcar alguém para usar o comando ${command}!` }, { quoted: msg });
    }

    const remetente = msg.key.participant || msg.key.remoteJid;
    const nomeRemetente = normalize(remetente);
    const nomeAlvo = normalize(alvo);

    const midias = {
        beijar: 'beijar.mp4',
        abracar: 'abracar.mp4',
        matar: 'matar.mp4',
        tapa: 'tapa.mp4',
        chute: 'chute.mp4'
    };

    const verbos = {
        matar: 'matou',
        tapa: 'deu um tapa em',
        chute: 'chutou',
        beijar: 'deu um beijo em',
        abracar: 'deu um abraço em'
    };

    const emojis = {
        matar: '💀',
        tapa: '🖐️',
        chute: '🦵',
        beijar: '💋',
        abracar: '🫂'
    };

    const texto = `✨ *INTERAÇÃO* ✨\n\n@${nomeRemetente} ${verbos[command]} @${nomeAlvo} ${emojis[command]}`;

    // 🎬 Todas as 5 (matar/tapa/chute/beijar/abraçar) escolhem um gif
    // aleatório entre os que foram subidos pra essa categoria via
    // ".configurar-bot subirgif <categoria> nome...". Sem limite de
    // quantos podem existir em cada pasta.
    const caminhoGif = escolherGifAleatorio(command);

    if (caminhoGif) {
        try {
            return await sock.sendMessage(from, {
                video: fs.readFileSync(caminhoGif),
                gifPlayback: true,
                caption: texto,
                mentions: [remetente, alvo]
            }, { quoted: msg });
        } catch (erroEnvio) {
            console.error(`❌ Erro ao enviar gif de ${command}:`, erroEnvio.message);
        }
    }

    // ainda não tem nenhum gif subido pra essa categoria (ou falhou) —
    // beijar/abraçar caem pro vídeo fixo antigo, se ainda existir
    const arquivo = midias[command];
    const caminhoFixo = arquivo ? path.join(__dirname, "../../media", arquivo) : null;

    if (caminhoFixo && fs.existsSync(caminhoFixo)) {
        return await sock.sendMessage(from, {
            video: fs.readFileSync(caminhoFixo),
            caption: texto,
            gifPlayback: true,
            mentions: [remetente, alvo]
        }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: texto, mentions: [remetente, alvo] }, { quoted: msg });
}

module.exports = { interacao };
