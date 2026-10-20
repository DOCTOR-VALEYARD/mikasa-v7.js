
const palavras = [
    { palavra: "CRIPTOANÁLISE", dica: "A arte de decifrar códigos e comunicações protegidas." },
    { palavra: "EFÊMERO", dica: "Aquilo que dura apenas um breve momento, passageiro." },
    { palavra: "MISANTROPO", dica: "Aquele que evita o convívio social ou nutre aversão à humanidade." },
    { palavra: "ESTOICISMO", dica: "Escola filosófica que prega a resiliência e o controle das emoções." },
    { palavra: "ENTROPIA", dica: "Medida da desordem ou aleatoriedade em um sistema termodinâmico." },
    { palavra: "PARADIGMA", dica: "Um modelo ou padrão que define como algo é compreendido em certa época." },
    { palavra: "QUIMÉRICO", dica: "Algo que é puramente imaginário, fantástico ou impossível." },
    { palavra: "HEGEMONIA", dica: "Supremacia ou influência dominante de uma entidade sobre outras." },
    { palavra: "SINESTESIA", dica: "Fenômeno onde um sentido evoca a percepção de outro simultaneamente." },
    { palavra: "PROSOPAGNOSIA", dica: "Condição neurológica que impede o reconhecimento de rostos familiares." }
];

let jogosAtivos = {};

async function forca(sock, from, msg, args) {
    if (args[0] === "start") {
        if (jogosAtivos[from]) {
            return sock.sendMessage(from, { text: "⚠️ Já existe uma execução em curso. Termine-a antes de iniciar nova rodada." }, { quoted: msg });
        }

        const item = palavras[Math.floor(Math.random() * palavras.length)];
        jogosAtivos[from] = {
            palavra: item.palavra.toUpperCase(),
            dica: item.dica,
            letrasDescobertas: Array(item.palavra.length).fill("_"),
            tentativas: 6,
            letrasErradas: []
        };

        const jogo = jogosAtivos[from];
        let texto = `💀 *DESAFIO DA FORCA - NÍVEL HARD*\n\n`;
        texto += `🔍 *PISTA:* ${jogo.dica}\n`;
        texto += `🧩 *ESTRUTURA:* ${jogo.letrasDescobertas.join(" ")}\n`;
        texto += `❤️ *RESISTÊNCIA:* ${jogo.tentativas}\n\n`;
        texto += `Comando: *!forca [letra]*`;

        return sock.sendMessage(from, { text: texto }, { quoted: msg });
    }

    if (!jogosAtivos[from]) {
        return sock.sendMessage(from, { text: "❌ Sem jogos ativos. Inicie com *!forca start*." }, { quoted: msg });
    }

    const jogo = jogosAtivos[from];
    const letra = args[0]?.toUpperCase();

    if (!letra || letra.length !== 1 || !/[A-Z]/.test(letra)) {
        return sock.sendMessage(from, { text: "❌ Insira um caractere alfabético único." }, { quoted: msg });
    }

    if (jogo.letrasDescobertas.includes(letra) || jogo.letrasErradas.includes(letra)) {
        return sock.sendMessage(from, { text: `⚠️ A letra *${letra}* já foi testada.` }, { quoted: msg });
    }

    if (jogo.palavra.includes(letra)) {
        for (let i = 0; i < jogo.palavra.length; i++) {
            if (jogo.palavra[i] === letra) jogo.letrasDescobertas[i] = letra;
        }

        if (!jogo.letrasDescobertas.includes("_")) {
            const palavraFinal = jogo.palavra;
            delete jogosAtivos[from];
            return sock.sendMessage(from, { text: `🏆 *VITÓRIA!* Você decifrou: *${palavraFinal}*!` }, { quoted: msg });
        }
    } else {
        jogo.tentativas--;
        jogo.letrasErradas.push(letra);

        if (jogo.tentativas === 0) {
            const palavraCerta = jogo.palavra;
            delete jogosAtivos[from];
            return sock.sendMessage(from, { text: `💀 *FRACASSO!* A palavra era: *${palavraCerta}*.` }, { quoted: msg });
        }
    }

    let texto = `🎮 *FORCA ATIVA*\n\n`;
    texto += `🔍 *PISTA:* ${jogo.dica}\n`;
    texto += `🧩 *ESTRUTURA:* ${jogo.letrasDescobertas.join(" ")}\n`;
    texto += `❤️ *RESISTÊNCIA:* ${jogo.tentativas}\n`;
    texto += `🚫 *FALHAS:* ${jogo.letrasErradas.join(", ")}`;

    return sock.sendMessage(from, { text: texto }, { quoted: msg });
}

module.exports = { forca };
