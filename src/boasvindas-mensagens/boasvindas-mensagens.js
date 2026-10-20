/* =================================================
   🎉 MIKASA BOT — MENSAGENS DE ENTRADA E SAÍDA DO GRUPO
   📁 Arquivo: boasvindas-mensagens.js
================================================= */

// 🎉 Chamadas de entrada — chamativas, animadas, dão vontade de participar
const chamadasEntrada = [
    "🎉 SEGURA QUE CHEGOU MAIS UM(A)!",
    "🚀 POUSOU MAIS UM(A) POR AQUI!",
    "✨ OLHA QUEM CHEGOU!",
    "🔥 REFORÇO NOVO NO GRUPO!",
    "💫 ABRAM ALAS, CHEGOU GENTE BOA!",
    "🎊 A FESTA SÓ COMEÇA AGORA!",
    "🥳 MAIS UM PRA ANIMAR ESSA BAGUNÇA!",
    "🌟 UMA ESTRELA ACABOU DE CHEGAR!",
    "🎆 ENTRADA TRIUNFAL NO GRUPO!",
    "💥 EXPLODIU DE ANIMAÇÃO POR AQUI!",
    "🏆 GANHAMOS UM NOVO MEMBRO TOP!",
    "🎯 MAIS UM NA MIRA DA DIVERSÃO!",
    "🎈 SOLTA OS FOGOS, CHEGOU GENTE!",
    "🦄 RARIDADE CHEGANDO NO GRUPO!",
    "👑 REALEZA ACABOU DE ENTRAR!",
    "🌈 O GRUPO FICOU MAIS COLORIDO!",
    "⚡ ENERGIA NOVA NO PEDAÇO!",
    "🎬 E A CENA GANHOU UM NOVO PERSONAGEM!",
    "🍾 BORA COMEMORAR ESSA CHEGADA!",
    "🎁 PRESENTE DO DIA ACABOU DE CHEGAR!",
];

// 🥀 Zoeiras de saída — bem debochadas, no tom de brincadeira
const zoeirasSaida = [
    "😂 @{nome} saiu correndo — deve ter cansado de perder toda hora.",
    "🚪 @{nome} apertou o \"sair\" mais rápido que resposta em prova.",
    "👋 @{nome} foi embora... calma, ninguém vai atrás não.",
    "🥲 @{nome} saiu. Aposto que nem vão sentir falta.",
    "🤡 @{nome} desistiu. Nem chegou a fazer diferença mesmo.",
    "🍃 @{nome} sumiu no vento — típico.",
    "🎭 @{nome} bateu em retirada. Fim de carreira por aqui.",
    "🐌 @{nome} demorou, mas foi embora igual todo mundo já esperava.",
    "🧹 Varreram @{nome} pra fora... ou ele(a) que se varreu, tanto faz.",
    "📉 A audiência caiu: @{nome} saiu do ar.",
    "🎈 @{nome} murchou e saiu de fininho.",
    "🥶 Nem se despediu direito, @{nome} já sumiu.",
    "🚶 @{nome} deu no pé antes que alguém percebesse.",
    "🎬 Corta! @{nome} saiu de cena sem nem reclamar.",
    "🐔 @{nome} fugiu igual galinha assustada.",
    "🧯 Apagaram o @{nome} do grupo — ou ele(a) apagou sozinho(a).",
    "🎯 Alvo abatido: @{nome} não aguentou e saiu.",
    "🥊 Nocaute! @{nome} bateu asas e sumiu do ringue.",
    "🍂 Mais uma folha caiu: @{nome} saiu do grupo.",
    "🛸 @{nome} foi abduzido(a)... ou só cansou e saiu mesmo.",
];

function preencher(texto, nome) {
    return texto.replace(/\{nome\}/g, nome);
}

function gerarChamadaEntrada() {
    return chamadasEntrada[Math.floor(Math.random() * chamadasEntrada.length)];
}

function gerarZoeiraSaida(nome) {
    const escolhida = zoeirasSaida[Math.floor(Math.random() * zoeirasSaida.length)];
    return preencher(escolhida, nome);
}

// ─────────────────────────────────────────────────
// 📐 MONTAGEM DAS MENSAGENS (visual compacto, letrinhas pequenas + 🧣)
// ─────────────────────────────────────────────────

// WhatsApp corta legenda de imagem em ~1024 caracteres. Se cabeçalho + regras
// couberem, vai tudo junto; se não, as regras completas vão numa 2ª mensagem.
const LIMITE_LEGENDA = 950;

// Limpa a descrição do grupo SEM cortar nada (agora mostra a regra inteira).
function limparRegras(texto) {
    return String(texto || "")
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function montarTextoRegras(regras, { nomeBot, nomeDono } = {}) {
    const rodape = nomeBot ? `\n\n🧣 ${nomeBot}${nomeDono ? ` • 👑 ${nomeDono}` : ""}` : "";
    return `〔 📜 ʀᴇɢʀᴀs ᴅᴏ ɢʀᴜᴘᴏ 〕\n\n${limparRegras(regras)}${rodape}`;
}

// Devolve { legenda, regrasExtra }:
//  - legenda: texto que vai junto do card
//  - regrasExtra: texto das regras completas (só quando não coube na legenda), senão null
function montarBemVindoPartes({ chamada, nomeUsuario, nomeGrupo, totalMembros, regras, autorAceite, semFoto, nomeBot, nomeDono }) {
    const topo = [
        `〔 🎉 ʙᴇᴍ-ᴠɪɴᴅᴏ(ᴀ) 〕`,
        "",
        chamada,
        "",
        `> 👋 @${nomeUsuario}`,
        `> 🏷️ ${nomeGrupo}`,
        `> 👥 ${totalMembros} membros`
    ];
    if (autorAceite) topo.push(`> ✅ Aceito(a) por @${autorAceite}`);

    const fim = ["", `💬 Mande um “OI” para a galera!`];
    if (semFoto) fim.push(`📸 _Sem foto de perfil visível — que tal colocar uma?_`);
    fim.push("", `🧣 ${nomeBot} • 👑 ${nomeDono}`);

    const regrasLimpas = limparRegras(regras);
    const blocoRegras = regrasLimpas ? ["", `〔 📜 ʀᴇɢʀᴀs ᴅᴏ ɢʀᴜᴘᴏ 〕`, "", regrasLimpas] : [];

    const completo = [...topo, ...blocoRegras, ...fim].join("\n");
    if (completo.length <= LIMITE_LEGENDA || !regrasLimpas) {
        return { legenda: completo, regrasExtra: null };
    }
    return {
        legenda: [...topo, "", `📜 _As regras completas vão logo abaixo_ 👇`, ...fim].join("\n"),
        regrasExtra: montarTextoRegras(regrasLimpas, { nomeBot, nomeDono })
    };
}

// Compatível com o uso antigo (retorna só a legenda).
function montarMensagemBemVindo(dados) {
    return montarBemVindoPartes(dados).legenda;
}

// 📰 Saída em estilo jornal. motivo: "saiu" | "removido"
function montarMensagemSaida({ zoeira, nomeGrupo, totalMembros, nomeBot, nomeDono, nomeUsuario, tempoNoGrupo, motivo, autor }) {
    const removido = motivo === "removido";
    const linhas = [
        `〔 📰 ᴇᴅɪᴄ̧ᴀ̃ᴏ ᴇxᴛʀᴀ 〕`,
        removido ? `🚨 *EXPULSO(A) DO GRUPO!*` : `🚨 *DESAPARECIDO(A)!*`,
        "",
        zoeira,
        ""
    ];
    if (nomeUsuario) linhas.push(`> 👤 @${nomeUsuario}`);
    linhas.push(`> 🏷️ ${nomeGrupo}`);
    if (tempoNoGrupo) linhas.push(`> ⏳ Ficou ${tempoNoGrupo} no grupo`);
    if (removido && autor) linhas.push(`> 🔨 Removido(a) por @${autor}`);
    linhas.push(`> 👥 Restam ${totalMembros} membros`, "", `🧣 ${nomeBot} • 👑 ${nomeDono}`);
    return linhas.join("\n");
}

module.exports = { gerarChamadaEntrada, gerarZoeiraSaida, montarMensagemBemVindo, montarBemVindoPartes, montarTextoRegras, montarMensagemSaida };
