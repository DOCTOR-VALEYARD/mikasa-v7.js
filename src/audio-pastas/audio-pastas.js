/* =================================================
   🔊 MIKASA BOT — ÁUDIOS POR PASTA
   📁 Arquivo: audio-pastas.js

   Cada situação (bom dia, boa tarde, boa noite, menu no PV, prefixo) tem
   sua própria pastinha dentro de src/audios/. Coloque um ou mais áudios
   (.mp3/.ogg/.m4a/.opus/.wav) lá dentro — se tiver mais de um, o bot
   escolhe um aleatório toda vez, SEM repetir o mesmo dois seguidos (se
   só tiver 1 áudio na pasta, aí obviamente repete, não tem outra opção).
   Se a pasta estiver vazia, simplesmente não manda áudio nenhum (não
   quebra nada).

   🔧 IMPORTANTE: mensagem de voz do WhatsApp (aquele balãozinho com onda
   sonora) só funciona direito se o arquivo for OGG/Opus. Antes, qualquer
   arquivo (mp3, m4a, wav...) era mandado "fingindo" ser voz — e o
   WhatsApp travava dizendo que o áudio tava corrompido. Agora, não
   importa o formato que você colocar na pasta: o bot converte pro
   formato certo (com ffmpeg, que já é usado pela música) antes de
   enviar, então sempre toca certinho.
================================================= */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");

const extensoesValidas = [".mp3", ".ogg", ".m4a", ".opus", ".wav"];
const pastaBase = path.join(__dirname, "../midias/audios");

// 🔁 Lembra qual foi o último áudio escolhido em cada pasta, pra não
// repetir o mesmo dois seguidos quando tem mais de um disponível.
const ultimoEscolhido = new Map(); // nomePasta -> nome do arquivo

function listarAudios(nomePasta) {
    const pasta = path.join(pastaBase, nomePasta);
    if (!fs.existsSync(pasta)) return [];
    return fs.readdirSync(pasta).filter(arquivo =>
        extensoesValidas.includes(path.extname(arquivo).toLowerCase())
    );
}

function pegarCaminhoAleatorio(nomePasta) {
    let arquivos = listarAudios(nomePasta);
    if (!arquivos.length) return null;

    // Se tiver mais de um áudio, tira o último escolhido da lista de
    // candidatos — assim nunca repete de imediato (com só 1 áudio na
    // pasta, obviamente repete, não tem outra opção).
    const ultimo = ultimoEscolhido.get(nomePasta);
    if (arquivos.length > 1 && ultimo) {
        const semRepetir = arquivos.filter(a => a !== ultimo);
        if (semRepetir.length) arquivos = semRepetir;
    }

    const escolhido = arquivos[Math.floor(Math.random() * arquivos.length)];
    ultimoEscolhido.set(nomePasta, escolhido);
    return path.join(pastaBase, nomePasta, escolhido);
}

// Mantido por compatibilidade (devolve o buffer cru, sem converter)
function pegarAudioAleatorio(nomePasta) {
    const caminho = pegarCaminhoAleatorio(nomePasta);
    if (!caminho) return null;
    try { return fs.readFileSync(caminho); } catch { return null; }
}

// 🔄 Converte qualquer áudio pro formato certo de voz do WhatsApp
// (OGG/Opus, mono, 16kHz) usando ffmpeg.
function converterParaVoz(caminhoOrigem, caminhoDestino) {
    return new Promise((resolve, reject) => {
        exec(`ffmpeg -y -i "${caminhoOrigem}" -ac 1 -ar 16000 -c:a libopus -b:a 32k "${caminhoDestino}"`, (erro) => {
            if (erro) return reject(erro);
            resolve();
        });
    });
}

// 📤 Manda o áudio de uma pasta (se existir algum), opcionalmente marcando alguém.
// Retorna true se mandou, false se a pasta tava vazia (pra quem chamar saber).
async function enviarAudioDaPasta(sock, chatId, nomePasta, { mentions, quoted } = {}) {
    const caminhoOrigem = pegarCaminhoAleatorio(nomePasta);
    if (!caminhoOrigem) return false;

    const caminhoTemp = path.join(os.tmpdir(), `voz_${Date.now()}_${Math.floor(Math.random()*9999)}.ogg`);

    try {
        // Se já for .ogg, tenta converter mesmo assim (garante que o
        // codec interno seja opus de verdade, não só a extensão certa).
        await converterParaVoz(caminhoOrigem, caminhoTemp);
        const buffer = fs.readFileSync(caminhoTemp);

        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
            ...(mentions ? { mentions } : {})
        }, quoted ? { quoted } : {});
        return true;
    } catch (erro) {
        console.error(`❌ Erro ao converter/enviar áudio da pasta "${nomePasta}":`, erro?.message || erro);
        // 🛟 Se a conversão falhar por qualquer motivo, tenta mandar o
        // arquivo original mesmo (sem ser como "voz", só como áudio
        // normal — ainda toca, só não fica no balãozinho de voz).
        try {
            const bufferOriginal = fs.readFileSync(caminhoOrigem);
            const ext = path.extname(caminhoOrigem).toLowerCase();
            const mimetypes = { ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg", ".opus": "audio/ogg" };
            await sock.sendMessage(chatId, {
                audio: bufferOriginal,
                mimetype: mimetypes[ext] || "audio/mpeg",
                ptt: false,
                ...(mentions ? { mentions } : {})
            }, quoted ? { quoted } : {});
            return true;
        } catch (erro2) {
            console.error(`❌ Fallback também falhou pra pasta "${nomePasta}":`, erro2?.message || erro2);
            return false;
        }
    } finally {
        try { fs.unlinkSync(caminhoTemp); } catch {}
    }
}

module.exports = { pegarAudioAleatorio, enviarAudioDaPasta };
