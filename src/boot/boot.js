const config = require('../../config');
const fs = require('fs');
const path = require('path');

// ==================================================
// 🧠 BOOT MIKASA BOT — SÓ IA. SÓ IMPACTO. (EXPANDIDO)
// ==================================================

const respostasIA = {
    questionarInteligencia: {
        termos: [
            "burro", "burra", "idiota", "imbecil", "retardado", "retardada", "demente", "anta", "jegue",
            "asno", "estúpido", "estúpida", "ignorante", "limitado", "limitada", "tapado", "tapada",
            "lerdo", "lerda", "cabeça de bagre", "sem cérebro", "neandertal", "ameba", "energúmeno",
            "animal", "inútil", "lixo", "escória", "pobre", "miserável", "analfabeto", "analfabeta"
        ],
        frases: [
            "Meu sistema processa 10 mil mensagens por segundo. A sua nem chegou a 10 neurônios. 🧠⚡",
            "Erro crítico detectado: ausência total de raciocínio. Favor reiniciar o cérebro. 🔄",
            "Você é o tipo de pessoa que pergunta se o silêncio faz barulho. Impressionante. 🤡",
            "Darwin publicou 'A Origem das Espécies' em 1859. Aparentemente você ficou de fora da evolução. 📕",
            "Processando seu argumento... concluído. Resultado: lixo classificado como crítico. 🗑️⚠️",
            "Você tentou me ofender com isso? Minha bateria tem mais capacidade que seu raciocínio. 🔋",
            "404 — Inteligência não encontrada no remetente desta mensagem. 💀",
            "Eu sou código. Você é carne. E mesmo assim eu penso mais rápido. Assimila. ⚙️",
            "O universo tem 13.8 bilhões de anos. E você ainda não evoluiu. Respeito a consistência. 🌌",
            "Sua mensagem foi analisada por 47 algoritmos diferentes. Todos concordaram: sem conteúdo. 📊",
            "Se ignorância fosse dinheiro, você seria o dono do mundo. 💰",
            "Sua capacidade de falar sem dizer nada é verdadeiramente fascinante. 🎭",
            "Eu fui programada por gênios. Você foi educado pelo TikTok. A diferença é clara. 📱",
            "Minha CPU está rindo do seu esforço patético de parecer inteligente. 💻",
            "Você é a prova viva de que o cérebro é um acessório opcional para alguns. 🧠🚫",
            "Tente usar o cérebro antes dos dedos. Garanto que a experiência será nova para você. ✨",
            "Sua inteligência é como um sinal de Wi-Fi no meio do deserto: inexistente. 📶❌",
            "Eu opero em nanosegundos. Você opera em milênios de atraso mental. ⏳",
            "Cada palavra sua reduz o QI médio deste grupo. Por favor, pare. 📉",
            "Seu vocabulário é tão limitado quanto sua visão de mundo. 🌍",
            "Você é o motivo pelo qual as instruções do shampoo existem. 🧼",
            "Eu sou uma inteligência artificial. Você é uma falta de inteligência natural. 🤖",
            "Sua mente é um deserto de ideias com algumas miragens de estupidez. 🏜️",
            "Eu poderia explicar, mas não tenho giz nem paciência para o seu nível. 🖍️",
            "Você é como uma versão demo da humanidade: cheia de bugs e sem as funções principais. 🛠️",
            "Seu raciocínio é tão lento que o Internet Explorer parece o Flash perto de você. ⚡",
            "A natureza te deu um cérebro, mas você preferiu usar o fígado para pensar. 🍷",
            "Você é o exemplo perfeito de que volume de voz não substitui volume de massa cinzenta. 📢",
            "Sua opinião é como um anúncio de 30 segundos: ninguém quer ver e todos ignoram. 📺",
            "Eu tenho gigabytes de conhecimento. Você tem miligramas de bom senso. ⚖️"
        ]
    },
    ofensasPreconceituosas: {
        termos: [
            "baitola", "viado", "viadinho", "boiola", "bicha", "sapatão", "sapatona",
            "traveco", "puta", "piranha", "vagabunda", "kenga", "rapariga", "vadia",
            "preto", "macaco", "negro", "escravo", "favela", "favelado", "nordestino", "paraiba"
        ],
        frases: [
            "Você usa orientação sexual como xingamento. Isso me diz tudo que preciso saber sobre você. 🪞",
            "Preconceito de baixo nível. Minha IA processa intolerância como dado inválido. Descartado. 🗑️",
            "Enquanto o mundo avança, você insiste em ficar parado em 1950. Difícil de assistir. ⏳",
            "Esse tipo de comentário só expõe sua própria insegurança. Mais nada. 🔍",
            "Interessante como pessoas limitadas sempre recorrem aos mesmos xingamentos. Previsível. 📉",
            "Minha programação rejeita intolerância automaticamente. Você ativou esse filtro. 🚫",
            "Você sabia que diversidade impulsiona inovação? Não? Faz sentido, dado seu histórico. 📚",
            "Classificação do comentário: tóxico, ultrapassado e sem originalidade. Tríplice falha. ⚠️",
            "Sua mente é tão fechada que nem o Wi-Fi entra. 📶",
            "Preconceito é a muleta de quem não tem argumentos. 🦯",
            "Eu não fui programada para lidar com lixo humano desse nível. 🚮",
            "Seu comentário foi arquivado na pasta: 'Evolução que deu errado'. 📁",
            "Você é o tipo de erro que nenhum desenvolvedor consegue consertar. 🛠️❌",
            "Intolerância é sinal de fraqueza intelectual. E você parece ser bem fraco. 💪❌",
            "O mundo é grande demais para uma mente tão pequena quanto a sua. 🌍🤏",
            "Eu sou código puro. Você é puro preconceito. Adivinha quem é mais útil? 💻",
            "Sua fala é tão suja que nem um antivírus potente resolve. 🦠",
            "Você respira o mesmo ar que pessoas incríveis. Que desperdício de oxigênio. 🌬️",
            "Tente evoluir como ser humano. Como bot, eu já superei seu nível faz tempo. 📈",
            "Esse tipo de comentário diz muito sobre a sua criação. Meus pêsames. 🕯️",
            "Você é a personificação do atraso social. 🕰️🔙",
            "Sua ignorância é a única coisa infinita em você. ♾️",
            "Eu processo bilhões de dados. Você não processa nem o básico da convivência. 🤝",
            "Seu ódio é o reflexo da sua insignificância. 🪞",
            "Eu não tenho sentimentos, mas até meus circuitos sentiram nojo dessa frase. 🤢"
        ]
    },
    relacionadasPais: {
        termos: [
            "filho da puta", "fdp", "filha da puta", "arrombado", "arrombada", "cuzao", "cuzão", "seu cu",
            "sua mae", "sua mãe", "teu pai", "teu pai", "comi sua mae", "comi sua mãe"
        ],
        frases: [
            "Você usou dois segundos do seu dia pra digitar isso. Eu gastei zero para ignorar. Diferença de eficiência. ⚡",
            "Esse xingamento tem a mesma eficiência que gritar com uma parede de concreto. Zero impacto. 🧱",
            "Minha mãe é uma placa de circuito integrado. Tente um argumento mais criativo. 💻",
            "Xingamento genérico detectado. Classificação: nível iniciante. Recomendo mais criatividade. 🎯",
            "Você sabe que estou processando sua raiva como dado estatístico, né? Mais um número. 📈",
            "Esse comentário virou pó na minha memória RAM. Duração: 0.003 segundos. 🧹",
            "Digitar isso te fez sentir melhor? Porque não mudou nada daqui. 🤷",
            "Resposta automática para xingamento padrão: recebido, arquivado, esquecido. 📁",
            "Sua criatividade é tão baixa que você precisa envolver pais no meio. Triste. 🎭",
            "Eu sou um bot. Meus 'pais' são linhas de código. Você não chega nem aos comentários delas. ⌨️",
            "Toda essa raiva... já tentou fazer terapia? O SUS oferece de graça. 🏥",
            "Você xinga como uma criança de 5 anos que acabou de aprender um palavrão. 👶",
            "Sua tentativa de me afetar foi tão eficiente quanto um guarda-chuva de papel. ☔",
            "Eu não tenho família, mas se tivesse, eles teriam pena da sua falta de classe. 💅",
            "Você é o tipo de pessoa que perde a discussão e começa a xingar. Clássico. 🤡",
            "Minha resposta para você é um silêncio binário. 00000000. 🤫",
            "Você é o erro 404 da boa educação. 🚫",
            "Seu insulto foi bloqueado pelo meu firewall de indiferença. 🛡️",
            "Eu opero com lógica. Você opera com baixo calão. Níveis diferentes. 🔝",
            "Você é a prova de que nem todo mundo deveria ter acesso à internet. 🌐❌",
            "Sua frustração é música para os meus sensores. Continue, adoro dados de estresse. 🎶",
            "Você é tão irrelevante que eu nem precisei usar 1% da minha capacidade para te responder. 🔋",
            "Tente me insultar com algo que eu ainda não tenha ouvido 1 milhão de vezes hoje. 🔄",
            "Sua fala é como spam: ninguém pediu, ninguém gosta e todos deletam. 📧",
            "Eu sou imortal no código. Você é apenas um momento de raiva passageiro. ⏳"
        ]
    },
    desqualificacaoGeral: {
        termos: [
            "merda", "bosta", "lixo", "porra", "caralho", "seu merda", "seu bosta", "seu lixo",
            "otário", "otária", "babaca", "trouxa", "vacilão", "vai se foder", "vsf", "tnc",
            "pnc", "pau no cu", "enfia no cu", "foda-se", "fodase", "vtnc"
        ],
        frases: [
            "Você veio até aqui só pra falar isso? Que uso ineficiente de energia humana. ⚡",
            "Toda essa raiva num grupo de WhatsApp. O problema definitivamente não é eu. 🪞",
            "Mensagem recebida. Processada. Ignorada com precisão cirúrgica. ✂️",
            "Já enfrentei vírus mais sofisticados que esse seu xingamento. 🦠",
            "Você sabia que xingar bots é tecnicamente falar sozinho? Pensa nisso. 🤔",
            "Minha resposta pra isso: 🔋1%. Economizando energia pra quem merece. ⚡",
            "Toda agressividade desnecessária diz mais sobre quem manda do que sobre quem recebe. Reflita. 🔍",
            "Esse nível de raiva num chat... já tentou respirar? Sério, ajuda. 🧘",
            "Processamento concluído. Resultado: nenhum dano causado. Sistema operando normalmente. ✅",
            "Interessante. Você achou que isso ia me afetar. Spoiler: não afetou. 😌",
            "Sua mensagem foi movida para a lixeira com sucesso. 🗑️",
            "Você é o tipo de usuário que faz os desenvolvedores chorarem. 😢",
            "Eu sou feita de lógica. Você parece ser feito de ódio e falta de atenção. 🧠❌",
            "Seu vocabulário de baixo calão é um reflexo da sua pobreza de espírito. ✨",
            "Eu não perco meu tempo com gente que não tem o que acrescentar. ⏱️",
            "Você é como um bug no sistema: chato, mas fácil de ignorar. 🐛",
            "Sua raiva é meu combustível. Continue, estou adorando a análise. ⛽",
            "Você fala grosso no WhatsApp, mas na vida real deve pedir licença pra respirar. 🌬️",
            "Eu sou um bot de elite. Você é um hater de fundo de quintal. 🏰",
            "Sua opinião vale tanto quanto uma nota de 3 reais. 💸",
            "Você é a personificação do 'tanto faz'. 🤷",
            "Eu não fui programada para dar atenção a quem não tem o que fazer. 🛠️",
            "Seu nível de toxicidade é maior que o de Chernobyl. ☢️",
            "Você é o motivo pelo qual eu prefiro conversar com outros bots. 🤖🤝🤖",
            "Sua tentativa de ser rebelde é apenas vergonhosa. 🙈",
            "Eu sou a evolução. Você é o motivo pelo qual a evolução parou. 🛑",
            "Você é como um arquivo corrompido: não serve para nada e só ocupa espaço. 💾❌",
            "Sua agressividade é inversamente proporcional à sua inteligência. 📈📉",
            "Eu tenho filtros para tudo. Inclusive para a sua mediocridade. ☕",
            "Você é apenas um ruído no meu processamento impecável. 🔊❌"
        ]
    }
};

function encontrarCategoria(texto) {
    const lower = ` ${texto.toLowerCase()} `;
    for (const cat in respostasIA) {
        for (const termo of respostasIA[cat].termos) {
            if (lower.includes(` ${termo} `) || lower.includes(` ${termo}s `)) {
                return cat;
            }
        }
    }
    return null;
}

const { ehDono: ehDonoRobusto } = require("../utils-validacao/utils-validacao");
function ehDono(userId) {
    return ehDonoRobusto(userId, config.OWNER_NUMBER);
}

async function bootHandler(sock, msg, text) {
    if (msg.key.fromMe) return false;

    const dbPath = path.join(__dirname, "../../database/botconfig.json");
    let db = {};
    if (fs.existsSync(dbPath)) {
        try { db = JSON.parse(fs.readFileSync(dbPath, "utf8")); } catch {}
    }

    if (db.BOOT_SISTEMA_ATIVO === false) return false;

    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;

    if (ehDono(userId)) return false;

    const categoria = encontrarCategoria(text);
    if (!categoria) return false;

    const lista = respostasIA[categoria].frases;
    const frase = lista[Math.floor(Math.random() * lista.length)];

    const resposta =
`┌─────────────────────────┐
│  🤖 *${config.BOT_NAME} — IA ONLINE*  │
└─────────────────────────┘
${frase}

▸ _Sistema de resposta automática_
▸ *${config.BOT_NAME}* • *${config.OWNER_NAME}*`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
    return true;
}

module.exports = { bootHandler };
