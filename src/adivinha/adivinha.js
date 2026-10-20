
const enigmas = [
    { palavra: "SILÊNCIO", dica: "Aquele que me quebra ao dizer o meu nome." },
    { palavra: "FUTURO", dica: "Eu sempre estou chegando, mas nunca estou aqui hoje." },
    { palavra: "PIANO", dica: "Tenho oitenta e oito teclas, mas não abro nenhuma porta." },
    { palavra: "RELÓGIO", dica: "Tenho mãos, mas não posso segurar nada; corro, mas não tenho pernas." },
    { palavra: "ECO", dica: "Falo sem boca e ouço sem ouvidos. Não tenho corpo, mas ganho vida com o vento." },
    { palavra: "ESTRELA", dica: "Saímos à noite sem sermos chamadas, e nos perdemos de dia sem sermos roubadas." },
    { palavra: "PROMESSA", dica: "Sou algo que você pode fazer, mas ninguém mais pode ver. Se me quebrar, perco o valor." },
    { palavra: "IDADE", dica: "O que é que sobe, sobe, sobe e nunca mais desce?" },
    { palavra: "DÚVIDA", dica: "Quanto mais você tem de mim, menos você sabe." },
    { palavra: "TEMPO", dica: "Eu devoro todas as coisas: pássaros, feras, árvores, flores; róio o ferro, mordo o aço; mato reis, destruo cidades e esmago montanhas." }
];

let jogosAtivos = {};

async function adivinha(sock, from, msg, args) {
    if (args[0] === "start") {
        if (jogosAtivos[from]) {
            return sock.sendMessage(from, { text: "⚠️ Enigma pendente. Resolva-o primeiro." }, { quoted: msg });
        }

        const item = enigmas[Math.floor(Math.random() * enigmas.length)];
        jogosAtivos[from] = {
            palavra: item.palavra.toUpperCase(),
            dica: item.dica,
            tentativas: 3
        };

        const jogo = jogosAtivos[from];
        let texto = `🧩 *ENIGMA DO MESTRE*\n\n`;
        texto += `🤔 *CHARADA:* "${jogo.dica}"\n`;
        texto += `📝 *TAMANHO:* ${jogo.palavra.length} caracteres\n`;
        texto += `❤️ *VIDAS:* ${jogo.tentativas}\n\n`;
        texto += `Responda com: *!adivinha [palavra]*`;

        return sock.sendMessage(from, { text: texto }, { quoted: msg });
    }

    if (!jogosAtivos[from]) {
        return sock.sendMessage(from, { text: "❌ Nenhum enigma ativo. Use *!adivinha start*." }, { quoted: msg });
    }

    const jogo = jogosAtivos[from];
    const tentativa = args.join(" ").toUpperCase().trim();

    if (!tentativa) {
        return sock.sendMessage(from, { text: "❌ Insira seu palpite para o enigma." }, { quoted: msg });
    }

    if (tentativa === jogo.palavra) {
        const palavraFinal = jogo.palavra;
        delete jogosAtivos[from];
        return sock.sendMessage(from, { text: `✨ *SABEDORIA!* Você desvendou o enigma: *${palavraFinal}*!` }, { quoted: msg });
    } else {
        jogo.tentativas--;

        if (jogo.tentativas === 0) {
            const palavraCerta = jogo.palavra;
            delete jogosAtivos[from];
            return sock.sendMessage(from, { text: `🌑 *OBSCURIDADE!* Você falhou. A resposta era: *${palavraCerta}*.` }, { quoted: msg });
        }

        let texto = `❌ *EQUÍVOCO!* Pense melhor.\n\n`;
        texto += `🤔 *CHARADA:* "${jogo.dica}"\n`;
        texto += `❤️ *RESISTÊNCIA:* ${jogo.tentativas}`;

        return sock.sendMessage(from, { text: texto }, { quoted: msg });
    }
}

module.exports = { adivinha };
