// src/signo.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");
const mensagens = require('../dvcld/dvcld'); // Importa frases do arquivo na mesma pasta

class Cassi {
    static async getHoroscope(sock, from, msg, sign) {
        const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");
        const signEntrada = sign ? sign.trim() : "";

        // 🚫 NÃO INFORMOU O SIGNO
        if (!signEntrada) {
            const aviso = `
╭─── ❀ ───╮
     ⚠️ HORÓSCOPO ⚠️
╰─── ❀ ───╯

❀ Você precisa informar seu signo!

❀ 📌 Forma correta:
   ${config.PREFIX}signo [seu signo]

❀ 📋 Signos disponíveis:
   ♈ Áries      ♉ Touro
   ♊ Gêmeos     ♋ Câncer
   ♌ Leão       ♍ Virgem
   ♎ Libra      ♏ Escorpião
   ♐ Sagitário  ♑ Capricórnio
   ♒ Aquário    ♓ Peixes

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
            return sock.sendMessage(from, { text: aviso }, { quoted: msg });
        }

        // ✅ TRATA NOME — REMOVE ACENTOS E DEIXA MINÚSCULO
        const signNormalizado = signEntrada.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // ✅ VERIFICA SE EXISTE PREVISÃO
        const dadosSigno = mensagens[signNormalizado];
        if (!dadosSigno) {
            const erro = `
╭─── ❀ ───╮
    ❌ SIGNO NÃO ENCONTRADO ❌
╰─── ❀ ───╯

❀ *${signEntrada}* não é um signo válido!

❀ 💡 Verifique a escrita
ou escolha da lista acima.

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
            return sock.sendMessage(from, { text: erro }, { quoted: msg });
        }

        // ✅ SORTEIA UMA PREVISÃO DAS DISPONÍVEIS
        const previsao = dadosSigno[Math.floor(Math.random() * dadosSigno.length)];

        // 📊 TABELAS DE ATRIBUTOS — ORGANIZADAS E MANTIDAS COMO ANTES
        const numeros = {
            aries: 15, touro: 7, gemeos: 23, cancer: 9, leao: 18,
            virgem: 4, libra: 11, escorpiao: 29, sagitario: 3, capricornio: 20,
            aquario: 14, peixes: 27
        };

        const cores = {
            aries: '🔴 Vermelho', touro: '🟢 Verde', gemeos: '🟡 Amarelo', cancer: '🔵 Azul', leao: '🟠 Dourado',
            virgem: '⚪ Bege', libra: '🩷 Rosa', escorpiao: '🟣 Violeta', sagitario: '🟠 Laranja',
            capricornio: '⚫ Cinza', aquario: '🔵 Turquesa', peixes: '🟣 Lilás'
        };

        const horas = {
            aries: '11:21', touro: '09:15', gemeos: '14:30', cancer: '08:45',
            leao: '17:05', virgem: '13:40', libra: '10:10', escorpiao: '20:20',
            sagitario: '07:50', capricornio: '12:00', aquario: '16:16', peixes: '19:19'
        };

        const simbolos = {
            'aries': '♈', 'touro': '♉', 'gemeos': '♊', 'cancer': '♋',
            'leao': '♌', 'virgem': '♍', 'libra': '♎', 'escorpiao': '♏',
            'sagitario': '♐', 'capricornio': '♑', 'aquario': '♒', 'peixes': '♓'
        };

        // ✅ DADOS DO USUÁRIO E DATA
        const simbolo = simbolos[signNormalizado] || '✨';
        const hoje = new Date();
        const dataFormatada = `${hoje.getDate()}/${hoje.getMonth() + 1}/${hoje.getFullYear()}`;
        const remetente = msg.key.participant || msg.key.remoteJid;
        const idUsuario = remetente.split('@')[0];

        // ✅ MENSAGEM FINAL NO PADRÃO BONITO
        const mensagemFinal = `
╭─── ❀ ───╮
    ✨ HORÓSCOPO DO DIA ✨
╰─── ❀ ───╯

❀ 🔮 SEU PERFIL ❀
❀ Signo: ${simbolo} ${signNormalizado.toUpperCase()}
❀ Data: ${dataFormatada}
❀ Consultado por: @${idUsuario}

❀ 📜 PREVISÃO DE HOJE ❀
${previsao}

❀ 🍀 SORTE E ENERGIA ❀
❀ Número da Sorte: *${numeros[signNormalizado]}*
❀ Cor do Dia: ${cores[signNormalizado]}
❀ Hora Favorável: ⏰ ${horas[signNormalizado]}

❀────────────────────❀
🤍 Base: Dados Astrológicos
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;

        // ✅ ENVIA COM IMAGEM E MENÇÃO FUNCIONANDO
        if (fs.existsSync(caminhoImagem)) {
            const bufferImagem = fs.readFileSync(caminhoImagem);
            await sock.sendMessage(from, {
                image: bufferImagem,
                caption: mensagemFinal,
                mentions: [remetente]
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                text: mensagemFinal,
                mentions: [remetente]
            }, { quoted: msg });
        }
    }
}

module.exports = { Cassi };

