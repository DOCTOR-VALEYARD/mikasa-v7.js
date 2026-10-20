/*
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
|                                                                            |
|                          <-- MÓDULO DE DUELO -->                           |
|                                                                            |
|   Este módulo gerencia todas as interações de combate entre jogadores,     |
|   incluindo desafios, aceitação, ataques e resolução de batalhas.          |
|                                                                            |
-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
*/

const fs = require('fs');
const path = require('path');
const { ITENS_DA_LOJA } = require('../loja/loja'); // Importamos os itens para saber seus atributos

// 🔧 CORREÇÃO: antes usava um banco próprio (level.json) que nunca era
// alimentado por ninguém — por isso todo mundo "não existia" e o comando
// sempre quebrava. Agora usa o MESMO banco real do sistema de XP/moedas
// (database/usuarios.json), que já é populado enquanto as pessoas
// conversam no grupo.
const dbPath = path.join(__dirname, "../../database/usuarios.json");

// Objeto para armazenar o estado dos duelos ativos em cada grupo.
// A chave será o JID do grupo (from), e o valor será o objeto do duelo.
const duelosAtivos = {};

// --- Funções de Banco de Dados (DB) ---
function getDB() {
    if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(dbPath));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function normalize(id) {
    if (!id) return "";
    return id.split('@')[0];
}

// =================================
// ⚔️ FUNÇÃO PRINCIPAL DO DUELO
// =================================
async function duelo(sock, msg, args) {
    const from = msg.key.remoteJid;
    const senderJid = msg.key.participant || msg.key.remoteJid;
    const subComando = args[0] ? args[0].toLowerCase() : '';

    // --- GERENCIADOR DE SUB-COMANDOS ---
    switch (subComando) {
        case 'aceitar':
            return aceitarDuelo(sock, msg);

        case 'atacar':
            // Futuramente, aqui entrará a lógica de um duelo por turnos.
            return sock.sendMessage(from, { text: '⚔️ Duelos por turnos ainda em desenvolvimento! Por enquanto, o resultado é instantâneo ao desafiar.' }, { quoted: msg });

        case 'desistir':
        case 'cancelar':
            return cancelarDuelo(sock, msg);

        default:
            // Se não for um sub-comando conhecido, assume-se que é um novo desafio.
            return iniciarDueloInstantaneo(sock, msg);
    }
}

// =================================
// ⚔️ LÓGICA PARA INICIAR UM DUELO
// =================================
async function iniciarDueloInstantaneo(sock, msg) {
    const from = msg.key.remoteJid;
    const desafianteJid = msg.key.participant || msg.key.remoteJid;
    
    // Encontra o desafiado (por menção)
    const desafiadoJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    if (!desafiadoJid) {
        return sock.sendMessage(from, { text: '❌ Você precisa marcar alguém para duelar!\n\nUse: `.duelo @oponente`' }, { quoted: msg });
    }

    if (desafianteJid === desafiadoJid) {
        return sock.sendMessage(from, { text: '❌ Você não pode duelar contra si mesmo, seu narcisista!' }, { quoted: msg });
    }

    // Lógica do duelo instantâneo (seu código original, adaptado)
    const db = getDB();
    const desafianteId = normalize(desafianteJid);
    const desafiadoId = normalize(desafiadoJid);

    // 🔧 CORREÇÃO: antes, "desafiante"/"desafiado" eram só valores padrão
    // locais — nunca eram de fato salvos dentro de "db". Isso fazia
    // "db[vencedorId].ouro = ..." quebrar com erro sempre que uma das
    // pessoas nunca tinha duelado antes (o que era quase sempre). Agora
    // garantimos que os dois existam DE VERDADE dentro do banco antes de
    // calcular qualquer coisa — e como é o MESMO banco do sistema de XP,
    // quem já conversa no grupo já chega com nível/ouro reais.
    if (!db[desafianteId]) db[desafianteId] = { nivel: 1, xp: 0, ouro: 0 };
    if (!db[desafiadoId]) db[desafiadoId] = { nivel: 1, xp: 0, ouro: 0 };
    const desafiante = db[desafianteId];
    const desafiado = db[desafiadoId];

    // --- CÁLCULO DOS ATRIBUTOS ---
    let ataqueDesafiante = (desafiante.nivel || 1) * 10;
    let defesaDesafiante = (desafiante.nivel || 1) * 5;
    if (desafiante.arma_equipada && ITENS_DA_LOJA[desafiante.arma_equipada]) {
        ataqueDesafiante += ITENS_DA_LOJA[desafiante.arma_equipada].atributo;
    }
    if (desafiante.armadura_equipada && ITENS_DA_LOJA[desafiante.armadura_equipada]) {
        defesaDesafiante += ITENS_DA_LOJA[desafiante.armadura_equipada].atributo;
    }

    let ataqueDesafiado = (desafiado.nivel || 1) * 10;
    let defesaDesafiado = (desafiado.nivel || 1) * 5;
    if (desafiado.arma_equipada && ITENS_DA_LOJA[desafiado.arma_equipada]) {
        ataqueDesafiado += ITENS_DA_LOJA[desafiado.arma_equipada].atributo;
    }
    if (desafiado.armadura_equipada && ITENS_DA_LOJA[desafiado.armadura_equipada]) {
        defesaDesafiado += ITENS_DA_LOJA[desafiado.armadura_equipada].atributo;
    }

    // --- LÓGICA DO COMBATE ---
    const danoDesafiante = Math.max(1, ataqueDesafiante - defesaDesafiado + Math.floor(Math.random() * 20));
    const danoDesafiado = Math.max(1, ataqueDesafiado - defesaDesafiante + Math.floor(Math.random() * 20));

    let vencedorId, perdedorId, vencedorJid, perdedorJid;
    let premio = 0;

    if (danoDesafiante > danoDesafiado) {
        vencedorId = desafianteId; perdedorId = desafiadoId;
        vencedorJid = desafianteJid; perdedorJid = desafiadoJid;
    } else if (danoDesafiado > danoDesafiante) {
        vencedorId = desafiadoId; perdedorId = desafianteId;
        vencedorJid = desafiadoJid; perdedorJid = desafianteJid;
    } else {
        saveDB(db);
        return sock.sendMessage(from, { 
            text: `⚔️ DUELO EMPATADO! ⚔️\n\n@${desafianteId} e @${desafiadoId} são igualmente fortes! Ninguém levou a melhor.`,
            mentions: [desafianteJid, desafiadoJid]
        }, { quoted: msg });
    }
    
    premio = Math.floor((db[perdedorId]?.ouro || 0) * 0.10) || 10;
    db[vencedorId].ouro = (db[vencedorId].ouro || 0) + premio;
    db[perdedorId].ouro = Math.max(0, (db[perdedorId].ouro || 0) - premio);
    
    saveDB(db);

    const resultadoMsg = `
💥 *RESULTADO DO DUELO* 💥

*Vencedor:* @${vencedorId} 🏆
*Perdedor:* @${perdedorId} 🤕

O vencedor roubou *${premio} de Ouro* do perdedor!
    `.trim();

    await sock.sendMessage(from, {
        text: resultadoMsg,
        mentions: [vencedorJid, perdedorJid]
    }, { quoted: msg });
}

// --- FUNÇÕES PARA DUELOS POR TURNOS (Ainda não implementadas, mas a estrutura está pronta) ---

async function aceitarDuelo(sock, msg) {
    // Lógica para aceitar um desafio pendente
    return sock.sendMessage(msg.key.remoteJid, { text: 'Funcionalidade `.duelo aceitar` em desenvolvimento.' }, { quoted: msg });
}

async function cancelarDuelo(sock, msg) {
    // Lógica para cancelar um desafio feito ou recebido
    return sock.sendMessage(msg.key.remoteJid, { text: 'Funcionalidade `.duelo cancelar` em desenvolvimento.' }, { quoted: msg });
}


module.exports = { duelo };

