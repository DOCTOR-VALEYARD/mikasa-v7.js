
// src/tempo.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");
const https = require("https"); // ✅ Nativo, sem instalar pacote extra

// Função auxiliar para buscar dados
function buscarDados(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let dados = "";
            res.on("data", pedaco => dados += pedaco);
            res.on("end", () => resolve(dados));
        }).on("error", reject);
    });
}

// Função para definir ícone conforme condição
function pegarIcone(condicao) {
    const txt = condicao.toLowerCase();
    if (txt.includes("chuva") || txt.includes("rain")) return "🌧️";
    if (txt.includes("nublado") || txt.includes("cloud")) return "☁️";
    if (txt.includes("nevoa") || txt.includes("fog")) return "🌫️";
    if (txt.includes("neve") || txt.includes("snow")) return "❄️";
    if (txt.includes("vento") || txt.includes("wind")) return "💨";
    return "☀️"; // Padrão ensolarado
}

async function tempo(sock, msg, args) {
    const from = msg.key.remoteJid;
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");
    const entrada = args.join(" ").trim();

    // 🚫 NÃO DIGITOU CIDADE
    if (!entrada) {
        const aviso = `
╭─── ❀ ───╮
    ⚠️ PREVISÃO DO TEMPO ⚠️
╰─── ❀ ───╯

❀ Você precisa informar uma cidade!

❀ 📌 Forma correta:
   ${config.PREFIX}tempo [nome da cidade]

❀ 💡 Exemplos:
   ${config.PREFIX}tempo são paulo
   ${config.PREFIX}tempo rio de janeiro
   ${config.PREFIX}tempo lisboa
   ${config.PREFIX}tempo nova york

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }

    try {
        // ⏳ AVISO DE CONSULTA
        await sock.sendMessage(from, {
            text: `
╭─── ❀ ───╮
       ⏳ CONSULTANDO ⏳
╰─── ❀ ───╯

❀ Local: *${entrada.toUpperCase()}*
❀ Buscando dados meteorológicos... 📡🌍

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀`
        }, { quoted: msg });


        // ✅ API PÚBLICA E GRATUITA — FUNCIONA EM TODO MUNDO
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(entrada)}&units=metric&lang=pt_br&appid=439d4b804bc8187953eb36d2a826a3e6`;
        
        const respostaCrua = await buscarDados(url);
        const dados = JSON.parse(respostaCrua);


        // ❌ CIDADE NÃO ENCONTRADA
        if (dados.cod !== 200) {
            const erro = `
╭─── ❀ ───╮
       ❌ LOCAL NÃO ENCONTRADO ❌
╰─── ❀ ───╯

❀ Não encontrei: *${entrada}*

💡 Dicas para acertar:
   • Escreva o nome correto
   • Adicione estado ou país
   • Ex: ${config.PREFIX}tempo campinas brasil

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
            return sock.sendMessage(from, { text: erro }, { quoted: msg });
        }


        // ✅ EXTRAI E ORGANIZA TODAS AS INFORMAÇÕES
        const icone = pegarIcone(dados.weather[0].description);
        const cidadeNome = dados.name;
        const pais = dados.sys.country;
        const tempAtual = Math.round(dados.main.temp);
        const sensacao = Math.round(dados.main.feels_like);
        const tempMin = Math.round(dados.main.temp_min);
        const tempMax = Math.round(dados.main.temp_max);
        const umidade = dados.main.humidity;
        const pressao = dados.main.pressure;
        const velocVento = dados.wind.speed;
        const descricao = dados.weather[0].description;
        const nascerSol = new Date(dados.sys.sunrise * 1000).toLocaleTimeString("pt-BR", {hour:'2-digit', minute:'2-digit'});
        const porSol = new Date(dados.sys.sunset * 1000).toLocaleTimeString("pt-BR", {hour:'2-digit', minute:'2-digit'});


        // ✅ MENSAGEM FINAL COMPLETA E LINDA
        const mensagemFinal = `
╭─── ❀ ───╮
    📊 PREVISÃO DO TEMPO 📊
╰─── ❀ ───╯

❀ 📍 LOCALIZAÇÃO ❀
❀ ${cidadeNome} / ${pais}
❀ Situação: ${icone} ${descricao.charAt(0).toUpperCase() + descricao.slice(1)}

❀ 🌡️ TEMPERATURAS ❀
❀ Atual: *${tempAtual}°C*
❀ Sensação térmica: ${sensacao}°C
❀ Mínima: ${tempMin}°C   |   Máxima: ${tempMax}°C

❀ 💧 DADOS DO AMBIENTE ❀
❀ Umidade do ar: ${umidade}%
❀ Pressão atmosférica: ${pressao} hPa
❀ Velocidade do vento: ${velocVento} m/s

❀ 🌅 CICLO SOLAR ❀
❀ Nascer do sol: ${nascerSol}
❀ Pôr do sol: ${porSol}

❀────────────────────❀
🤍 Fonte: OpenWeatherMap
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;


        // ✅ ENVIA COM IMAGEM OU TEXTO
        if (fs.existsSync(caminhoImagem)) {
            const buffer = fs.readFileSync(caminhoImagem);
            await sock.sendMessage(from, {
                image: buffer,
                caption: mensagemFinal
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: mensagemFinal }, { quoted: msg });
        }


    } catch (erro) {
        console.error("Erro Tempo:", erro);
        const mensagemErro = `
╭─── ❀ ───╮
       ❌ FALHA NA CONSULTA ❌
╰─── ❀ ───╯

❀ Não foi possível acessar os dados agora!
❀ Verifique conexão ou tente novamente.

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        await sock.sendMessage(from, { text: mensagemErro }, { quoted: msg });
    }
}

module.exports = { tempo };
