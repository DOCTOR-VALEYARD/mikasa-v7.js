// src/celular.js
const config = require("../../config");
const fs = require("fs");
const path = require("path");

// ✅ BANCO DE DADOS — ORGANIZADO E COMPLETO
const smartphones = {
    "xiaomi": { 
        nome: "Xiaomi 🟠", 
        especificacoes: `• Processadores potentes e equilibrados
• Interfaces MIUI / HyperOS cheias de funções
• Baterias geralmente acima de 5000mAh
• Carregamento rápido de 33W a 120W
• Boa relação custo-benefício
• Variedade desde entrada até linha premium` 
    },
    "iphone": { 
        nome: "iPhone 🍎", 
        especificacoes: `• Sistema operacional iOS estável e fluido
• Processadores série A — alto desempenho
• Otimização excelente com pouca memória RAM
• Câmeras com processamento de imagem avançado
• Atualizações garantidas por muitos anos
• Integração total com ecossistema Apple` 
    },
    "samsung": { 
        nome: "Samsung Galaxy 🔵", 
        especificacoes: `• Telas tecnologia AMOLED / Dynamic AMOLED
• Cores vibrantes e alto brilho
• Linhas S — alto padrão | Linhas A — custo benefício
• Suporte ao S Pen em modelos específicos
• Versões com 5G, resistência à água IP67/IP68
• Processadores Exynos ou Snapdragon` 
    },
    "motorola": { 
        nome: "Motorola 🤍", 
        especificacoes: `• Sistema Android mais próximo do original
• Poucos aplicativos pré-instalados
• Desempenho equilibrado
• Linhas G — intermediários | Linhas Edge — premium
• Recursos como Moto Gestos práticos
• Baterias duradouras com carregamento rápido` 
    },
    "poco": { 
        nome: "POCO ⚡", 
        especificacoes: `• Focados em desempenho e jogos
• Processadores top de linha ou intermediários fortes
• Telas com alta taxa de atualização 90Hz / 120Hz
• Baterias grandes + carregamento ultrarrápido
• Resfriamento eficiente
• Design moderno e arrojado` 
    },
    "redmi": { 
        nome: "Redmi 🔴", 
        especificacoes: `• Foco principal: Custo-benefício
• Baterias de grande capacidade
• Construção sólida
• Tamanhos de tela variados
• Versões com armazenamento inicial amplo
• Ideal para uso diário sem gastar muito` 
    }
};

async function celular(sock, msg, args) {
    const from = msg.key.remoteJid;
    const caminhoImagem = path.join(__dirname, "../midias/imagens/menu.png");
    const marcaEntrada = args[0] ? args[0].toLowerCase().trim() : "";

    // 🚫 NÃO INFORMOU NENHUMA MARCA
    if (!marcaEntrada) {
        const aviso = `
╭─── ❀ ───╮
    ⚠️ GUIA DE CELULARES ⚠️
╰─── ❀ ───╯

❀ Você precisa informar a marca!

❀ 📌 Forma correta:
   ${config.PREFIX}celular [marca]

❀ 📋 Marcas disponíveis:
   ✦ xiaomi
   ✦ iphone
   ✦ samsung
   ✦ motorola
   ✦ poco
   ✦ redmi

❀ 💡 Exemplo:
   ${config.PREFIX}celular samsung

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        return sock.sendMessage(from, { text: aviso }, { quoted: msg });
    }

    try {
        const dados = smartphones[marcaEntrada];

        // ❌ MARCA NÃO ENCONTRADA
        if (!dados) {
            const erro = `
╭─── ❀ ───╮
       ❌ NÃO LOCALIZADO ❌
╰─── ❀ ───╯

❀ A marca *${marcaEntrada}* não está cadastrada!

❀ ✅ Escolha entre as opções:
   • xiaomi   • iphone
   • samsung  • motorola
   • poco     • redmi

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
            return sock.sendMessage(from, { text: erro }, { quoted: msg });
        }

        // ✅ INFORMAÇÕES COMPLETAS E BEM ESTRUTURADAS
        const mensagemFinal = `
╭─── ❀ ───╮
    📱 INFORMAÇÕES TÉCNICAS 📱
╰─── ❀ ───╯

❀ 🔖 MARCA ❀
${dados.nome}

❀ 📋 CARACTERÍSTICAS PRINCIPAIS ❀
${dados.especificacoes}

❀────────────────────❀
ℹ️ Dados gerais por linha — modelos específicos podem variar!
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;

        // ✅ ENVIO COM IMAGEM OU TEXTO PURO
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
        console.error("Erro Celular:", erro);
        const mensagemErro = `
╭─── ❀ ───╮
       ❌ FALHA NO SISTEMA ❌
╰─── ❀ ───╯

❀ Não foi possível carregar os dados agora!
❀ Tente novamente em instantes.

❀────────────────────❀
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
❀────────────────────❀
`;
        await sock.sendMessage(from, { text: mensagemErro }, { quoted: msg });
    }
}

module.exports = { celular };

