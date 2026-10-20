/* =================================================
   📊 MIKASA BOT — ENQUETE (também funciona como /esquete)
   📁 Arquivo: enquete.js

   <prefixo>esquete                     → o bot cria uma enquete ALEATÓRIA
   <prefixo>esquete quantos anos você tem
        → o bot cria a enquete com a SUA pergunta e 4 opções que fazem sentido
          (ex.: 18 a 24 anos / 25 a 34 anos / ...). As opções são geradas pela IA;
          se a IA estiver fora do ar, usa um jeito local de montar as opções.
   <prefixo>esquete Qual a melhor pizza? | Calabresa | Frango | Portuguesa | 4 queijos
        → com "|" (ou ";") você escolhe as opções, e o bot usa exatamente elas.

   Aceita também: enquete, poll. Qualquer pessoa pode usar.
================================================= */

const config = require("../../config");

const COOLDOWN_MS = 5000;
const ultimoUso = new Map();
const ultimasAleatorias = new Map(); // chat -> índices usados recentemente

// ───────────── enquetes aleatórias ─────────────
const ALEATORIAS = [
    ["Qual é a melhor comida para uma resenha?", ["Pizza 🍕", "Churrasco 🥩", "Hambúrguer 🍔", "Lasanha 🍝"]],
    ["Quem é mais provável de sumir e voltar como se nada tivesse acontecido?", ["O ADM 😂", "O mais quieto 👀", "O mais ativo 🔥", "Todo mundo 🤣"]],
    ["Qual horário é melhor para a resenha?", ["Manhã 🌅", "Tarde ☀️", "Noite 🌙", "Madrugada 🌌"]],
    ["Qual superpoder você escolheria?", ["Voar 🪽", "Ficar invisível 🫥", "Teletransporte ⚡", "Ler mentes 🧠"]],
    ["Qual estilo de música domina a resenha?", ["Rap 🎤", "Funk 🔥", "Sertanejo 🤠", "Pagode 🥁"]],
    ["O que não pode faltar no grupo?", ["Memes 😂", "Resenha 🤣", "Notícia 📰", "Caos controlado 😈"]],
    ["Quem sobreviveria mais tempo em um apocalipse?", ["O ADM 🛡️", "O mais inteligente 🧠", "O mais sortudo 🍀", "Ninguém 😂"]],
    ["Qual seria o nome do filme do grupo?", ["A Resenha Final 🎬", "Caos no WhatsApp 💥", "Os Sobreviventes 👀", "Grupo Sem Limites 🔥"]],
    ["Qual animal representa melhor a turma?", ["Lobo 🐺", "Leão 🦁", "Gato 🐱", "Capivara 🦫"]],
    ["Qual prêmio você preferiria ganhar?", ["Gold 🪙", "Presente 🎁", "Cargo 👑", "Pizza 🍕"]],
    ["Quantos anos você tem?", ["Até 17 anos", "18 a 24 anos", "25 a 34 anos", "35 anos ou mais"]],
    ["Quanto tempo você passa no celular por dia?", ["Menos de 2 horas", "2 a 4 horas", "5 a 8 horas", "Nem sei, vivo nele 📱"]],
    ["Qual é o seu horário de dormir?", ["Antes das 22h 😴", "22h à meia-noite", "Meia-noite às 3h 🦉", "Quando o sol nasce 🌅"]],
    ["Café ou energético pra acordar?", ["Café ☕", "Energético ⚡", "Os dois 😵", "Eu não acordo 💀"]],
    ["Qual a melhor viagem?", ["Praia 🏖️", "Montanha 🏔️", "Cidade grande 🏙️", "Ficar em casa 🛋️"]],
    ["Qual app você mais usa?", ["WhatsApp 💬", "Instagram 📸", "TikTok 🎵", "YouTube ▶️"]],
    ["Qual a melhor hora do dia?", ["Manhã", "Tarde", "Noite", "Madrugada"]],
    ["Gato ou cachorro?", ["Cachorro 🐶", "Gato 🐱", "Os dois 🐾", "Nenhum 🙅"]],
    ["O que você faz no fim de semana?", ["Durmo 😴", "Saio com os amigos 🍻", "Jogo 🎮", "Trabalho 💼"]],
    ["Qual tipo de filme você prefere?", ["Ação 💥", "Comédia 😂", "Terror 👻", "Romance 💕"]],
    ["Qual é o seu maior defeito?", ["Preguiça 🦥", "Teimosia 🐂", "Ciúmes 👀", "Fico no vácuo 📵"]],
    ["Você responde mensagem em quanto tempo?", ["Na hora ⚡", "Em algumas horas 🕐", "No outro dia 📅", "Só quando lembro 💤"]],
    ["Qual a melhor bebida?", ["Refrigerante 🥤", "Suco 🧃", "Cerveja 🍺", "Água 💧"]],
    ["Qual a pior coisa de segunda-feira?", ["Acordar cedo ⏰", "Trabalho/escola 📚", "O trânsito 🚗", "Tudo 😩"]],
    ["Você é de qual time?", ["Time A ⚽", "Time B ⚽", "Não ligo pra futebol 🙄", "Só vejo a Copa 🏆"]],
    ["Qual a melhor sobremesa?", ["Pudim 🍮", "Bolo 🎂", "Sorvete 🍦", "Brigadeiro 🍫"]],
    ["Quantas horas de sono você dorme?", ["Menos de 5", "5 a 6 horas", "7 a 8 horas", "Mais de 8"]],
    ["O que mais irrita no grupo?", ["Áudio gigante 🎙️", "Sticker demais 🤡", "Figurinha repetida 🔁", "Gente que some 👻"]],
    ["Pizza com ou sem borda recheada?", ["Com borda 🧀", "Sem borda 🍕", "Só a borda 😋", "Prefiro hambúrguer 🍔"]],
    ["Qual o melhor dia da semana?", ["Sexta 🎉", "Sábado 🍻", "Domingo 😴", "Nenhum 😩"]]
];

function escolherAleatoria(chat) {
    const usados = ultimasAleatorias.get(chat) || [];
    let candidatos = ALEATORIAS.map((_, i) => i).filter(i => !usados.includes(i));
    if (!candidatos.length) candidatos = ALEATORIAS.map((_, i) => i);
    const i = candidatos[Math.floor(Math.random() * candidatos.length)];
    ultimasAleatorias.set(chat, [...usados, i].slice(-12));
    return ALEATORIAS[i];
}

// ───────────── utilidades ─────────────
function semAcento(t) {
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function limparOpcoes(lista) {
    const vistos = new Set();
    const saida = [];
    for (const bruta of lista || []) {
        // tira só numeração/marcadores do tipo "1. ", "2) ", "- ", "• " (e preserva "18 a 24 anos", "4 queijos")
        const op = String(bruta ?? "").replace(/^\s*(?:[-–•*]+|\d+[.)])\s+/, "").trim().slice(0, 100);
        const chave = semAcento(op);
        if (!op || vistos.has(chave)) continue;
        vistos.add(chave);
        saida.push(op);
    }
    return saida;
}

function arrumarPergunta(texto) {
    let p = String(texto || "").trim().replace(/\s+/g, " ");
    if (!p) return p;
    p = p.charAt(0).toUpperCase() + p.slice(1);
    const pergunta = /^(qual|quais|quem|quanto|quantos|quantas|quando|onde|como|por que|porque|o que|que|vc|voc[eê]|tu|j[aá]|tem|gosta|acha|[eé]|vai|pode|sabe|quer|prefere)\b/i.test(p);
    if (pergunta && !/[?!.]$/.test(p)) p += "?";
    return p.slice(0, 250);
}

// "pergunta | opção | opção" → { pergunta, opcoes }
function lerOpcoesDigitadas(texto) {
    const partes = String(texto).split(/\s*[|;\n]\s*/).map(s => s.trim()).filter(Boolean);
    if (partes.length < 3) return null; // pergunta + pelo menos 2 opções
    const opcoes = limparOpcoes(partes.slice(1)).slice(0, 12);
    return opcoes.length >= 2 ? { pergunta: partes[0], opcoes } : null;
}

// ───────────── opções pela IA ─────────────
function extrairListaJson(resposta) {
    if (!resposta) return null;
    const m = String(resposta).match(/\[[\s\S]*?\]/);
    if (!m) return null;
    try {
        const lista = JSON.parse(m[0]);
        return Array.isArray(lista) ? lista : null;
    } catch {
        return null;
    }
}

async function opcoesPelaIA(pergunta) {
    try {
        const { chamarIA } = require("../mikasa-ia/mikasa-ia");
        const resposta = await chamarIA([
            {
                role: "system",
                content:
                    "Você cria opções para enquetes de WhatsApp em português do Brasil. " +
                    "Dada a pergunta, responda SOMENTE com um array JSON de exatamente 4 strings curtas " +
                    "(até 35 caracteres cada), que sejam respostas possíveis e coerentes com a pergunta, " +
                    "todas diferentes entre si. Se a pergunta pede um número, idade, quantidade ou valor, " +
                    "use 4 faixas realistas e distintas (ex.: \"18 a 24 anos\"). Se for sim/não, use " +
                    "variações como \"Sim\", \"Não\", \"Às vezes\". Pode usar 1 emoji por opção. " +
                    "Não escreva nada fora do array JSON."
            },
            { role: "user", content: pergunta }
        ], config.AI_MODEL);
        const opcoes = limparOpcoes(extrairListaJson(resposta));
        return opcoes.length >= 3 ? opcoes.slice(0, 4) : null;
    } catch {
        return null;
    }
}

// ───────────── plano B (sem IA) ─────────────
function opcoesLocais(pergunta) {
    const n = semAcento(pergunta);
    const tem = re => re.test(n);

    if (tem(/\b(quantos anos|idade|anos voce tem|anos vc tem|anos tu tem)\b/)) return ["Até 17 anos", "18 a 24 anos", "25 a 34 anos", "35 anos ou mais"];
    if (tem(/\bquant[oa]s? (horas|tempo)\b/)) return ["Menos de 1 hora", "1 a 3 horas", "4 a 6 horas", "Mais de 6 horas"];
    if (tem(/\b(quanto custa|preco|valor|salario|dinheiro|gasta|gasto)\b/)) return ["Até R$ 50", "R$ 51 a R$ 200", "R$ 201 a R$ 500", "Mais de R$ 500"];
    if (tem(/\b(nota|de 0 a 10|0 a 10|avalia)/)) return ["0 a 2", "3 a 5", "6 a 8", "9 a 10"];
    if (tem(/\b(quantos|quantas|quantidade)\b/)) return ["1 a 2", "3 a 5", "6 a 10", "Mais de 10"];
    if (tem(/\b(que horas|horario|hora do dia|de manha|de noite)\b/)) return ["Manhã 🌅", "Tarde ☀️", "Noite 🌙", "Madrugada 🌌"];
    if (tem(/\b(quando|que dia|dia da semana)\b/)) return ["Hoje", "Amanhã", "Neste fim de semana", "Outro dia"];
    if (tem(/\b(onde|cidade|lugar|bairro)\b/)) return ["Na minha cidade", "Em outra cidade", "Em outro estado", "Fora do Brasil"];
    if (tem(/\b(como voce esta|como vai|como ta|como esta)\b/)) return ["Muito bem 😄", "Mais ou menos 😐", "Cansado(a) 😴", "Nem queira saber 😩"];
    if (tem(/^(voce|vc|tu|ja|tem|gosta|acha|e |vai|pode|sabe|quer|prefere|existe|sera)/)) return ["Sim ✅", "Não ❌", "Às vezes 🤔", "Depende 😏"];
    if (tem(/\b(concorda|certo ou errado|verdade)\b/)) return ["Concordo 👍", "Discordo 👎", "Em parte 🤏", "Não sei 🤷"];
    return ["Concordo 👍", "Discordo 👎", "Em parte 🤏", "Tanto faz 🤷"];
}

// ───────────── comando ─────────────
async function enquete(sock, msg, command, args) {
    const from = msg.key.remoteJid;
    const quem = msg.key.participant || from;

    if (Date.now() - (ultimoUso.get(quem) || 0) < COOLDOWN_MS) return;
    ultimoUso.set(quem, Date.now());

    const texto = (args || []).join(" ").trim();
    let pergunta;
    let opcoes;

    if (!texto) {
        [pergunta, opcoes] = escolherAleatoria(from);
    } else {
        const digitadas = lerOpcoesDigitadas(texto);
        if (digitadas) {
            pergunta = arrumarPergunta(digitadas.pergunta);
            opcoes = digitadas.opcoes;
        } else {
            pergunta = arrumarPergunta(texto);
            try { await sock.sendPresenceUpdate("composing", from); } catch {}
            opcoes = (await opcoesPelaIA(pergunta)) || opcoesLocais(pergunta);
        }
    }

    try {
        return await sock.sendMessage(from, {
            poll: { name: `📊 ${pergunta}`.slice(0, 255), values: opcoes, selectableCount: 1 }
        }, { quoted: msg });
    } catch (erro) {
        console.error("Erro ao criar enquete:", erro?.message || erro);
        return sock.sendMessage(from, {
            text: `📊 *ENQUETE*\n\n${pergunta}\n\n${opcoes.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nResponda com o número da opção.`
        }, { quoted: msg });
    }
}

module.exports = { enquete, opcoesLocais, extrairListaJson, lerOpcoesDigitadas, arrumarPergunta, limparOpcoes };
