const config = require("../../config");
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, "../../database/usuarios.json"); // 🔧 CORRIGIDO: agora usa o banco real de usuários

// ✅ LEITURA E GRAVAÇÃO — IGUAL ANTES
function getDB() {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function normalize(id) {
    if (!id) return "";
    return id.split('@')[0];
}

// =================================
// 🏪 CATÁLOGO DE PRODUTOS — 100% ORIGINAL
// =================================
const ITENS_DA_LOJA = {
    // Armas (aumentam ataque)
    '1': { nome: 'Adaga de Ferro', tipo: 'arma', preco: 150, atributo: 10 },
    '2': { nome: 'Espada Curta', tipo: 'arma', preco: 300, atributo: 25 },
    '3': { nome: 'Machado de Batalha', tipo: 'arma', preco: 650, atributo: 50 },
    
    // Armaduras (aumentam defesa)
    '4': { nome: 'Escudo de Madeira', tipo: 'armadura', preco: 200, atributo: 15 },
    '5': { nome: 'Peitoral de Couro', tipo: 'armadura', preco: 400, atributo: 35 },
    '6': { nome: 'Elmo de Aço', tipo: 'armadura', preco: 700, atributo: 60 },
};

// =================================
// ⚙️ FUNÇÃO PRINCIPAL — PADRONIZADA E SEGURA
// =================================
async function loja(sock, msg, args) {
    // ✅ PROTEÇÃO FUNDAMENTAL: nunca deixa args indefinido
    args = args || [];

    const sender = msg.key.participant || msg.key.remoteJid;
    const senderId = normalize(sender);
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const dataAtual = new Date().toLocaleString("pt-BR");
    let ambiente = "Privado";
    if (isGroup) ambiente = `Grupo`;

    const comando = args[0] ? args[0].toLowerCase().trim() : null;
    const db = getDB();


    // ✅ GARANTE ESTRUTURA DO USUÁRIO NO BANCO — NÃO CRIA ERRO DE PROPRIEDADE
    if (!db[senderId]) {
        db[senderId] = { 
            xp: 0, level: 1, gold: 0, 
            inventario: {}, 
            arma_equipada: null, 
            armadura_equipada: null 
        };
    }
    // Garante existência das chaves mesmo se registro antigo
    if (!db[senderId].inventario) db[senderId].inventario = {};
    if (db[senderId].arma_equipada === undefined) db[senderId].arma_equipada = null;
    if (db[senderId].armadura_equipada === undefined) db[senderId].armadura_equipada = null;


    try {
        switch (comando) {

            // 🛒 COMPRAR ITEM
            case 'comprar': {
                const idItem = args[1];
                const itemEscolhido = ITENS_DA_LOJA[idItem];

                if (!itemEscolhido) {
                    return await sock.sendMessage(from, {
                        text: `
╭─「 ❌ ITEM INVÁLIDO 」
│ 📅 ${dataAtual}
╰─
│ Esse ID não existe!
│ Use apenas !loja para ver a lista.
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
                    }, { quoted: msg });
                }

                if (db[senderId].ouro < itemEscolhido.preco) {
                    return await sock.sendMessage(from, {
                        text: `
╭─「 💸 SALDO INSUFICIENTE 」
│ 📅 ${dataAtual}
╰─
│ Você tem: *${db[senderId].ouro} Ouro*
│ Preço do item: *${itemEscolhido.preco} Ouro*
│
│ 😣 Falta pouco! Gire a roleta ou jogue mais!
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
                    }, { quoted: msg });
                }

                // ✅ CONFIRMAÇÃO DA COMPRA
                db[senderId].ouro -= itemEscolhido.preco;
                if (!db[senderId].inventario[idItem]) db[senderId].inventario[idItem] = 0;
                db[senderId].inventario[idItem]++;
                saveDB(db);

                return await sock.sendMessage(from, {
                    text: `
╭─「 ✅ COMPRA REALIZADA 」
│ 📅 ${dataAtual}
╰─
│ 📦 Produto: *${itemEscolhido.nome}*
│ 💲 Pago: ${itemEscolhido.preco} Gold
│
│ 📥 Adicionado ao seu inventário!
│ Use: !loja equipar ${idItem}
│
├────────────────────
│ By | ${config.OWNER_NAME}
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
                }, { quoted: msg });
            }


            // ⚙️ EQUIPAR ITEM
            case 'equipar': {
                const idItem = args[1];
                const itemEscolhido = ITENS_DA_LOJA[idItem];

                if (!itemEscolhido) {
                    return await sock.sendMessage(from, {
                        text: `╭─「 ❌ ID INVÁLIDO 」
│ Esse item não existe na loja!
╰─「 🎶 ${config.BOT_NAME} 🎶 」`
                    }, { quoted: msg });
                }

                if (!db[senderId].inventario[idItem] || db[senderId].inventario[idItem] < 1) {
                    return await sock.sendMessage(from, {
                        text: `
╭─「 📦 NÃO TEM NO INVENTÁRIO 」
│ 📅 ${dataAtual}
╰─
│ Você ainda não comprou esse item!
│ Primeiro use: !loja comprar ${idItem}
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
                    }, { quoted: msg });
                }

                // ✅ EQUIPAMENTO CONFIRMADO
                if (itemEscolhido.tipo === 'arma') {
                    db[senderId].arma_equipada = idItem;
                    saveDB(db);
                    return await sock.sendMessage(from, {
                        text: `
╭─「 ⚔️ ARMA EQUIPADA 」
│ 📅 ${dataAtual}
╰─
│ ✅ Agora você usa: *${itemEscolhido.nome}*
│ ⚔️ Ataque: +${itemEscolhido.atributo}
│
│ Pronto para os duelos! ⚔️💥
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
                    }, { quoted: msg });
                } 
                else if (itemEscolhido.tipo === 'armadura') {
                    db[senderId].armadura_equipada = idItem;
                    saveDB(db);
                    return await sock.sendMessage(from, {
                        text: `
╭─「 🛡️ ARMADURA EQUIPADA 」
│ 📅 ${dataAtual}
╰─
│ ✅ Agora você veste: *${itemEscolhido.nome}*
│ 🛡️ Defesa: +${itemEscolhido.atributo}
│
│ Mais protegido nas batalhas! 🛡️✨
│
├────────────────────
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`
                    }, { quoted: msg });
                }
                break;
            }


            // 📋 MOSTRAR CATÁLOGO PRINCIPAL — PADRÃO
            default: {
                let menuLoja = `
╭─「 🏪 LOJA DE EQUIPAMENTOS 」
│ 📅 ${dataAtual}
╰─
📖 *COMO USAR:*
│ • ${config.PREFIX}loja comprar ID
│ • ${config.PREFIX}loja equipar ID

⚔️ *ARMAS DE ATAQUE:*
`;
                // Lista armas
                for (const id in ITENS_DA_LOJA) {
                    if (ITENS_DA_LOJA[id].tipo === 'arma') {
                        const item = ITENS_DA_LOJA[id];
                        menuLoja += `│ 🆔 ${id} • ${item.nome} ➜ +${item.atributo} ATK\n│    💲 ${item.preco} Gold\n\n`;
                    }
                }

                menuLoja += `🛡️ *ARMADURAS DE DEFESA:*\n`;
                // Lista armaduras
                for (const id in ITENS_DA_LOJA) {
                    if (ITENS_DA_LOJA[id].tipo === 'armadura') {
                        const item = ITENS_DA_LOJA[id];
                        menuLoja += `│ 🆔 ${id} • ${item.nome} ➜ +${item.atributo} DEF\n│    💲 ${item.preco} Gold\n\n`;
                    }
                }

                menuLoja += `
├────────────────────
💰 Seu saldo atual: *${db[senderId].ouro} Ouro*
│
│ 💡 Jogue roleta, duelo ou envie mensagens
│ para ganhar mais moedas!
│
├────────────────────
│ By | ${config.OWNER_NAME}
│ 📍 ${ambiente}
╰─「 🎶 ${config.BOT_NAME} 🎶 」
`;

                return await sock.sendMessage(from, { text: menuLoja }, { quoted: msg });
            }

        } // ✅ FECHAMENTO CORRETO DO SWITCH QUE ESTAVA FALTANDO

    } catch (erroTotal) {
        console.log("⚠️ ERRO NO SISTEMA DE LOJA:", erroTotal.message);
        await sock.sendMessage(from, {
            text: `╭─「 ❌ FALHA NO SISTEMA 」
│ Houve um erro temporário!
│ Tente novamente em instantes.
╰─「 🎶 ${config.BOT_NAME} 🎶 」`
        }, { quoted: msg });
    }
}

module.exports = { loja, ITENS_DA_LOJA };

