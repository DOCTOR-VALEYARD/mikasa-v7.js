/* =================================================
   🙋 MIKASA BOT — MENSAGENS DE SOLICITAÇÃO DE ENTRADA
   📁 Arquivo: solicitacao-mensagens.js

   Duas categorias:
   - pendente: quando alguém pede pra entrar (agradável, mas debochada)
   - recusada: quando um admin recusa (bem mais debochada/afiada)
================================================= */

const pendentes = [
    "Ó, gente, temos visita! @{nome} tá batendo na porta 🚪✨ Algum admin com boa vontade hoje pra deixar entrar?",
    "Chegou pedido de entrada de @{nome}! Vai que é gente boa, né? Um admin aí libera 🙏😏",
    "@{nome} quer entrar no grupo. Alguém vote de admin aí, com carinho (ou não) 😅",
    "Solicitação fresquinha de @{nome}! Bora decidir o destino dessa pessoa, admins 👀",
    "Mais um(a) querendo entrar: @{nome}. Aprova aí antes que ela desista, admin 😌",
    "Batendo na campainha: @{nome}! Vai deixar esperando ou vai liberar, admin? 🔔",
    "Peraí, @{nome} quer entrar! Algum admin de bom humor hoje? 🎲",
    "Solicitação na fila: @{nome}. O júri (admins) já pode dar o veredito 👨‍⚖️",
    "@{nome} tá do lado de fora batendo palma. Deixa entrar, vai! 👏",
    "Chegou gente nova pedindo pra entrar: @{nome}! Aceita com moderação 😏",
    "@{nome} apostou todas as fichas nesse pedido de entrada. Boa sorte! 🎰",
    "Ih rapaz, @{nome} quer entrar. Confia? Admin decide! 🤔",
    "@{nome} tá na sala de espera. Passa ou não passa, admin? 🚦",
    "Nova solicitação chegando quentinha: @{nome}! Aprova rapidinho aí 🔥",
    "@{nome} pediu pra entrar igual quem pede desconto: com esperança. Libera aí, admin 😂",
    "Fila do VIP tem @{nome} esperando. Abre o cordão, admin! 🎗️",
    "@{nome} apareceu pedindo passagem. Só o admin tem o carimbo de aprovado ✅",
    "Solicitação recebida: @{nome}! Espero que seja gente boa (ou pelo menos engraçada) 😆",
    "@{nome} quer entrar nessa bagunça. Admin, a decisão é sua!",
    "Rufem os tambores: @{nome} pediu pra entrar! 🥁",
    "@{nome} tá ali, olhando pela fresta da porta. Deixa entrar, admin! 🚪👀",
    "Chegou proposta de entrada de @{nome}. Aceita, recusa ou pensa? 🤷",
    "@{nome} apertou o botãozinho de pedir pra entrar. Alguém aperta o de aprovar? 🔘",
    "Visitante na área: @{nome}! Admin, seu momento de poder chegou 👑",
    "@{nome} bateu o pedido. Agora é só esperar a boa vontade de algum admin 🙏",
    "@{nome} tá implorando pra entrar (metaforicamente). Um admin com dó hoje? 😩",
    "Chegou mais um currículo pra vaga de \"membro do grupo\": @{nome}! Analisa aí, admin 📋",
    "@{nome} tocou a buzina lá fora. Alguém libera o portão? 🚗📣",
    "Solicitação do dia: @{nome}. Se for pra recusar, pelo menos façam bonito 😏",
    "@{nome} colocou o pé na porta pra não fechar. Deixa entrar logo, admin! 🦶🚪",
];

const recusadas = [
    "😂 Toma essa, @{nome}! @{quemRecusou} chegou e disse: NÃO. Sem choro.",
    "🚫 @{quemRecusou} bateu o martelo: @{nome} fica de fora mesmo!",
    "🤡 Foi pro vinagre, @{nome}! @{quemRecusou} não quis nem saber.",
    "🎯 Recusado na cara dura: @{quemRecusou} disse que @{nome} não entra hoje... nem amanhã.",
    "🧊 Gelo puro: @{quemRecusou} congelou o pedido de @{nome} sem dó.",
    "🥊 Nocaute! @{quemRecusou} derrubou o pedido de @{nome} logo de cara.",
    "🛑 Pare tudo! @{quemRecusou} bloqueou a entrada de @{nome} sem pestanejar.",
    "😬 Que vexame, @{nome}... @{quemRecusou} recusou igual quem já esperava isso.",
    "🚪 Porta na cara: @{quemRecusou} não deixou @{nome} nem chegar perto.",
    "🙅 Nem começou e já acabou: @{quemRecusou} disse não pra @{nome}.",
    "💔 Sofreu, @{nome}! @{quemRecusou} recusou sem nem ler direito.",
    "🎬 Corta! @{quemRecusou} encerrou a cena de @{nome} antes de começar.",
    "🐢 Nem devagar entrou: @{quemRecusou} já cortou @{nome} de cara.",
    "🧨 Explodiu o sonho, @{nome}: @{quemRecusou} não deixou passar.",
    "🎭 Aplausos pra decisão de @{quemRecusou}, que mandou @{nome} de volta.",
    "🐍 Traição? Não, só @{quemRecusou} fazendo o trabalho e recusando @{nome}.",
    "📉 Ação de @{nome} despencou: @{quemRecusou} recusou o pedido na hora.",
    "🥶 Recusa gelada: @{quemRecusou} nem esquentou pra dizer não pra @{nome}.",
    "🎪 Show de recusa: @{quemRecusou} não deixou @{nome} nem tirar o chapéu.",
    "🐐 Bode expiatório da vez: @{nome}, recusado por @{quemRecusou} sem dó.",
    "🎲 Rolou o dado e deu recusa: @{quemRecusou} baniu a chance de @{nome} entrar.",
    "🍂 Caiu como folha de outono: pedido de @{nome} recusado por @{quemRecusou}.",
    "🐌 Nem deu tempo de tentar de novo: @{quemRecusou} já recusou @{nome}.",
    "🎈 Estourou o balão: @{quemRecusou} furou o sonho de @{nome} de entrar.",
    "🚷 Acesso negado igual catraca emperrada: @{quemRecusou} barrou @{nome}.",
    "🪦 RIP pedido de entrada de @{nome}. Causa da morte: @{quemRecusou}.",
    "🧻 @{quemRecusou} usou o pedido de @{nome} igual papel de rascunho: jogou fora.",
    "🐒 @{quemRecusou} não pensou duas vezes e chutou o pedido de @{nome} pra escanteio.",
    "🎟️ Ingresso negado: @{quemRecusou} não deixou @{nome} nem chegar na catraca.",
    "🧯 @{quemRecusou} apagou de vez a esperança de @{nome} entrar nesse grupo.",
    "🐙 @{quemRecusou} usou todos os braços pra empurrar @{nome} pra fora da fila.",
    "🎢 Que decepção, @{nome}: @{quemRecusou} não deixou nem a montanha-russa começar.",
    "🐦 Voou a esperança de @{nome} — @{quemRecusou} espantou igual quem afasta pombo.",
    "🥔 @{quemRecusou} tratou o pedido de @{nome} igual batata quente: largou na hora.",
    "🛎️ Ding dong, mas ninguém abriu: @{quemRecusou} deixou @{nome} do lado de fora.",
];

function preencher(texto, valores) {
    let resultado = texto;
    for (const chave of Object.keys(valores)) {
        resultado = resultado.replace(new RegExp(`\\{${chave}\\}`, "g"), valores[chave]);
    }
    return resultado;
}

function gerarMensagemSolicitacao(nome) {
    const escolhida = pendentes[Math.floor(Math.random() * pendentes.length)];
    return preencher(escolhida, { nome });
}

function gerarMensagemRecusa(nome, quemRecusou) {
    const escolhida = recusadas[Math.floor(Math.random() * recusadas.length)];
    return preencher(escolhida, { nome, quemRecusou });
}

module.exports = { gerarMensagemSolicitacao, gerarMensagemRecusa };
