/* =================================================
   🎵 ZARA BOT — YTAPI
   📁 src/ytapi.js
   👑 DOCTOR VALEYARD

   Download de ÁUDIO por API (único método do /play para áudio).
   Sem yt-dlp: cada provedor tem tempo de sobra e é tentado de novo
   antes de passar pro próximo.

   Provedores, nesta ordem:
     1) Savetube  (media.savetube.vip)
     2) Vreden    (api.vreden.my.id)

   ✅ Só usa axios + crypto (já fazem parte do projeto)
   ✅ Não depende da versão do pacote @vreden/youtube_scraper
   ✅ Valida o arquivo baixado (tamanho e tipo) antes de aceitar
   ✅ Nunca ignora certificado SSL: se expirar, o provedor falha e passa pro próximo
================================================= */

const axios = require('axios');
const fs = require('fs');
const { createDecipheriv } = require('crypto');

const QUALIDADES_AUDIO = [92, 128, 256, 320];
const QUALIDADES_VIDEO = [144, 240, 360, 480, 720, 1080];

const UA_MOBILE =
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36';

// Tempo máximo de cada etapa (ms). Generoso: hospedagem com internet lenta
// precisa de tempo, então a API NÃO é abandonada por demorar uns segundos.
const TIMEOUT_INFO = 25000;
const TIMEOUT_ARQUIVO = 120000;
// Prazo TOTAL pra um provedor entregar o link (somando todas as etapas).
const PRAZO_LINK_MS = 60000;
// Áudios MUITO longos (horas): a API precisa converter tudo antes de entregar, então o prazo é bem maior.
const TIMEOUT_ARQUIVO_LONGO = 20 * 60000;
const PRAZO_LINK_LONGO_MS = 12 * 60000;
// Quantas vezes cada provedor é tentado quando falha por lentidão/queda de conexão.
const TENTATIVAS_POR_PROVEDOR = 2;

// =================================================
// 🩺 SAÚDE DOS PROVEDORES (evita perder tempo toda música)
// =================================================
// Se um provedor falhou agora há pouco, ele é PULADO por um tempo.
//   • Fora do ar de vez (domínio não existe, recusou conexão, certificado):  5 min
//   • Lento / estourou o tempo / erro 5xx:                                    não pausa (tenta de novo)
// Erros ligados ao vídeo específico (4xx, "sem link") não pausam nada.
const emPausa = new Map(); // nome -> timestamp até quando fica pausado

const ERROS_DEFINITIVOS = new Set([
    'ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN',
    'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID'
]);
const ERROS_LENTIDAO = new Set(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE']);

function minutosDePausa(erro) {
    const codigo = erro?.code;
    const status = Number(erro?.response?.status || 0);
    if (ERROS_DEFINITIVOS.has(codigo)) return 5;
    return 0;
}

function comPrazo(promessa, ms, nome) {
    let timer;
    const limite = new Promise((_, rejeitar) => {
        timer = setTimeout(() => {
            const e = new Error(`${nome} demorou mais de ${Math.round(ms / 1000)}s`);
            e.code = 'ETIMEDOUT';
            rejeitar(e);
        }, ms);
    });
    return Promise.race([promessa, limite]).finally(() => clearTimeout(timer));
}

// Chave pública usada pelo Savetube para criptografar a resposta de /v2/info
const SAVETUBE_CHAVE_HEX = 'C5D58EF67A7584E4A29F6C35BBC4EB12';

// =================================================
// 🔧 UTILITÁRIOS
// =================================================

function extrairIdYoutube(entrada) {
    const texto = String(entrada || '');
    const m = texto.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/|live\/))([A-Za-z0-9_-]{11})/i
    );
    if (m) return m[1];
    return /^[A-Za-z0-9_-]{11}$/.test(texto) ? texto : null;
}

function escolherQualidade(q, tipo = 'audio') {
    if (tipo === 'video') return QUALIDADES_VIDEO.includes(Number(q)) ? Number(q) : 360;
    return QUALIDADES_AUDIO.includes(Number(q)) ? Number(q) : 128;
}

function descriptografarSavetube(base64) {
    const dados = Buffer.from(base64, 'base64');
    const iv = dados.subarray(0, 16);
    const conteudo = dados.subarray(16);
    const chave = Buffer.from(SAVETUBE_CHAVE_HEX, 'hex');
    const decipher = createDecipheriv('aes-128-cbc', chave, iv);
    const aberto = Buffer.concat([decipher.update(conteudo), decipher.final()]);
    return JSON.parse(aberto.toString());
}

function motivoDoErro(erro) {
    return erro?.code || erro?.response?.status || erro?.message || 'erro desconhecido';
}

// =================================================
// 1️⃣ SAVETUBE → devolve { url, titulo }
// =================================================

async function obterLinkSavetube(videoUrl, qualidade, tipo = 'audio') {
    const cdn = (await axios.get('https://media.savetube.vip/api/random-cdn', {
        timeout: TIMEOUT_INFO,
        headers: { 'User-Agent': UA_MOBILE }
    })).data?.cdn;

    if (!cdn) throw new Error('Savetube não informou o servidor (cdn).');

    const info = (await axios.post(`https://${cdn}/v2/info`, { url: videoUrl }, {
        timeout: TIMEOUT_INFO,
        headers: {
            'User-Agent': UA_MOBILE,
            'Referer': 'https://media.savetube.vip/1kejjj1?id=362796039'
        }
    })).data;

    if (!info?.data) throw new Error('Savetube não retornou informações do vídeo.');
    const detalhes = descriptografarSavetube(info.data);
    if (!detalhes?.key) throw new Error('Savetube não retornou a chave de download.');

    const resposta = (await axios.post(`https://${cdn}/download`, {
        downloadType: tipo === 'video' ? 'video' : 'audio',
        quality: String(qualidade),
        key: detalhes.key
    }, {
        timeout: TIMEOUT_INFO,
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': UA_MOBILE,
            'Referer': 'https://media.savetube.vip/start-download?from=1kejjj1%3Fid%3D362796039'
        }
    })).data;

    const url = resposta?.data?.downloadUrl;
    if (!url) throw new Error('Savetube não gerou o link de download.');

    return { url, titulo: detalhes.title || null };
}

// =================================================
// 2️⃣ VREDEN → devolve { url, titulo }
// =================================================

function acharUrlNaResposta(r) {
    if (!r || typeof r !== 'object') return null;
    const candidatos = [
        r.download?.url,
        r.download?.downloadUrl,
        r.download_url,
        r.downloadUrl,
        r.url,
        r.link,
        r.data?.download?.url,
        r.data?.url
    ];
    return candidatos.find(v => typeof v === 'string' && /^https?:\/\//i.test(v)) || null;
}

async function obterLinkVreden(videoUrl, qualidade, tipo = 'audio') {
    const resposta = await axios.get(
        `https://api.vreden.my.id/api/v1/download/youtube/${tipo === 'video' ? 'video' : 'audio'}`,
        {
            timeout: TIMEOUT_INFO,
            params: { url: videoUrl, quality: qualidade },
            headers: {
                'user-agent':
                    'VredenCloud/1.0 (+https://api.vreden.my.id; vreden@stayhome.li)'
            }
        }
    );

    const resultado = resposta.data?.result;
    const url = acharUrlNaResposta(resultado);
    if (!url) throw new Error('Vreden não retornou link de download.');

    return {
        url,
        titulo: resultado?.metadata?.title || resultado?.title || null
    };
}

// =================================================
// ⬇️ BAIXA O ARQUIVO DO LINK E SALVA NO DISCO
// =================================================

async function baixarParaArquivo(url, destino, longo = false) {
    const resposta = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: longo ? TIMEOUT_ARQUIVO_LONGO : TIMEOUT_ARQUIVO,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        maxRedirects: 5,
        headers: { 'User-Agent': UA_MOBILE },
        validateStatus: s => s >= 200 && s < 300
    });

    const tipo = String(resposta.headers?.['content-type'] || '').toLowerCase();
    if (tipo.includes('text/html') || tipo.includes('application/json')) {
        throw new Error(`O link devolveu "${tipo}" em vez de mídia.`);
    }

    const buffer = Buffer.from(resposta.data);
    if (buffer.length < 10000) {
        throw new Error('O arquivo baixado veio vazio ou incompleto.');
    }

    fs.writeFileSync(destino, buffer);
    return buffer.length;
}

// =================================================
// 🎯 FUNÇÃO PRINCIPAL
// =================================================
// baixarAudioApi(videoUrlOuId, destinoSemExtensao, { qualidade })
//   → { arquivo, titulo, provedor }   (sucesso)
//   → lança Error com o motivo de cada provedor (falha total)

async function baixarMidiaApi(videoUrlOuId, destinoSemExtensao, opcoes = {}) {
    const tipo = opcoes.tipo === 'video' ? 'video' : 'audio';
    const id = extrairIdYoutube(videoUrlOuId);
    if (!id) throw new Error('Link do YouTube inválido para a API.');

    const videoUrl = `https://www.youtube.com/watch?v=${id}`;
    const qualidade = escolherQualidade(opcoes.qualidade, tipo);
    const destino = `${destinoSemExtensao}.${tipo === 'video' ? 'mp4' : 'mp3'}`;

    const provedores = [
        { nome: 'Savetube', obter: obterLinkSavetube },
        { nome: 'Vreden', obter: obterLinkVreden }
    ];

    const falhas = [];

    for (const p of provedores) {
        const ate = emPausa.get(p.nome) || 0;
        if (ate > Date.now()) {
            falhas.push(`${p.nome}: em pausa (${Math.ceil((ate - Date.now()) / 60000)} min)`);
            continue; // pulado sem perder tempo
        }
        for (let tentativa = 1; tentativa <= TENTATIVAS_POR_PROVEDOR; tentativa++) {
            try {
                console.log(`🎵 [YTAPI] Tentando ${p.nome}${tentativa > 1 ? ` (tentativa ${tentativa})` : ''}...`);
                const { url, titulo } = await comPrazo(p.obter(videoUrl, qualidade, tipo), opcoes.longo ? PRAZO_LINK_LONGO_MS : PRAZO_LINK_MS, p.nome);
                const bytes = await baixarParaArquivo(url, destino, !!opcoes.longo);
                console.log(`🎵 [YTAPI] ✅ ${p.nome} entregou ${(bytes / 1024 / 1024).toFixed(2)} MB`);
                return { arquivo: destino, titulo, provedor: p.nome };
            } catch (erro) {
                const motivo = motivoDoErro(erro);
                const minutos = minutosDePausa(erro);
                try { if (fs.existsSync(destino)) fs.unlinkSync(destino); } catch {}
                // só repete se foi lentidão/queda; erro definitivo ou do vídeo vai pro próximo provedor
                const repetir = tentativa < TENTATIVAS_POR_PROVEDOR
                    && (ERROS_LENTIDAO.has(erro?.code) || Number(erro?.response?.status || 0) >= 500);
                if (repetir) {
                    console.log(`🎵 [YTAPI] ⚠️ ${p.nome} falhou: ${motivo} — tentando de novo...`);
                    continue;
                }
                if (minutos > 0) emPausa.set(p.nome, Date.now() + minutos * 60000);
                console.log(`🎵 [YTAPI] ❌ ${p.nome} falhou: ${motivo}${minutos ? ` (pulando por ${minutos} min)` : ''}`);
                falhas.push(`${p.nome}: ${motivo}`);
                break;
            }
        }
    }

    throw new Error(`API de ${tipo === 'video' ? 'vídeo' : 'áudio'} indisponível (${falhas.join(' | ')})`);
}

const baixarAudioApi = (v, d, o = {}) => baixarMidiaApi(v, d, { ...o, tipo: 'audio' });
const baixarVideoApi = (v, d, o = {}) => baixarMidiaApi(v, d, { ...o, tipo: 'video' });

module.exports = { baixarAudioApi, baixarVideoApi, baixarMidiaApi, extrairIdYoutube };
