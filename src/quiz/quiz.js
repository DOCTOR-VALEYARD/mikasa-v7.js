
const perguntasQuiz = [
    { pergunta: "Qual é o único metal que permanece líquido em temperatura ambiente?", resposta: "MERCÚRIO", dica: "Seu símbolo químico é Hg." },
    { pergunta: "Quem é o autor da obra 'A Divina Comédia'?", resposta: "DANTE ALIGHIERI", dica: "Ele descreveu os nove círculos do inferno." },
    { pergunta: "Qual é a montanha mais alta do sistema solar?", resposta: "MONTE OLIMPO", dica: "Não fica na Terra, mas sim no planeta vermelho." },
    { pergunta: "Em que ano ocorreu a queda do Muro de Berlim?", resposta: "1989", dica: "Final da década de 80." },
    { pergunta: "Qual é o elemento mais abundante na crosta terrestre?", resposta: "OXIGÊNIO", dica: "Essencial para a nossa respiração." },
    { pergunta: "Quem formulou a Teoria da Relatividade Geral?", resposta: "ALBERT EINSTEIN", dica: "Famoso pela equação E=mc²." },
    { pergunta: "Qual é o país com o maior número de fusos horários no mundo?", resposta: "FRANÇA", dica: "Considere seus territórios ultramarinos espalhados pelo globo." },
    { pergunta: "Qual é o nome do algoritmo de consenso utilizado pelo Bitcoin?", resposta: "PROOF OF WORK", dica: "Prova de Trabalho (em inglês)." },
    { pergunta: "Qual é a capital do Cazaquistão?", resposta: "ASTANA", dica: "Já foi chamada de Nur-Sultan recentemente." },
    { pergunta: "Qual é o maior satélite natural do sistema solar?", resposta: "GANIMEDES", dica: "Orbita o gigante gasoso Júpiter." }
];

let jogosAtivos = {};

async function quiz(sock, from, msg, args) {
    if (args[0] === "start") {
        if (jogosAtivos[from]) {
            return sock.sendMessage(from, { text: "⚠️ Desafio pendente. Responda-o primeiro." }, { quoted: msg });
        }

        const item = perguntasQuiz[Math.floor(Math.random() * perguntasQuiz.length)];
        jogosAtivos[from] = {
            pergunta: item.pergunta,
            resposta: item.resposta.toUpperCase(),
            dica: item.dica,
            tentativas: 2
        };

        const jogo = jogosAtivos[from];
        let texto = `🧠 *DESAFIO INTELECTUAL*\n\n`;
        texto += `❓ *QUESTÃO:* ${jogo.pergunta}\n`;
        texto += `💡 *PISTA:* ${jogo.dica}\n`;
        texto += `❤️ *RESISTÊNCIA:* ${jogo.tentativas}\n\n`;
        texto += `Responda com: *!quiz [resposta]*`;

        return sock.sendMessage(from, { text: texto }, { quoted: msg });
    }

    if (!jogosAtivos[from]) {
        return sock.sendMessage(from, { text: "❌ Sem quiz ativo. Inicie com *!quiz start*." }, { quoted: msg });
    }

    const jogo = jogosAtivos[from];
    const tentativa = args.join(" ").toUpperCase().trim();

    if (!tentativa) {
        return sock.sendMessage(from, { text: "❌ Insira sua resposta para o desafio." }, { quoted: msg });
    }

    if (tentativa === jogo.resposta) {
        const respostaFinal = jogo.resposta;
        delete jogosAtivos[from];
        return sock.sendMessage(from, { text: `🎯 *PRECISÃO!* Resposta correta: *${respostaFinal}*!` }, { quoted: msg });
    } else {
        jogo.tentativas--;

        if (jogo.tentativas === 0) {
            const respostaCerta = jogo.resposta;
            delete jogosAtivos[from];
            return sock.sendMessage(from, { text: `🌑 *IGNORÂNCIA!* A resposta correta era: *${respostaCerta}*.` }, { quoted: msg });
        }

        let texto = `❌ *ERRADO!* Sua resposta carece de exatidão.\n\n`;
        texto += `❓ *QUESTÃO:* ${jogo.pergunta}\n`;
        texto += `💡 *PISTA:* ${jogo.dica}\n`;
        texto += `❤️ *RESISTÊNCIA:* ${jogo.tentativas}`;

        return sock.sendMessage(from, { text: texto }, { quoted: msg });
    }
}

module.exports = { quiz };
