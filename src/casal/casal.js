/* =========================================
   💖 MÓDULO DE FORMAÇÃO DE CASAIS 💖
   📁 Arquivo: casal.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ========================================= */

const config = require("../../config");
const { criarCardCasal, baixarBuffer } = require("../cardGenerator/cardGenerator");
const { enviarCardOuAnimado } = require("../card-envio/card-envio");
const { buscarFotoContexto } = require("../foto-contexto/foto-contexto");

/**
 * Seleciona aleatoriamente dois membros do grupo e calcula compatibilidade.
 * @param {object} sock - Conexão Baileys
 * @param {object} msg - Dados da mensagem
 */
async function formarCasal(sock, msg) {
    const from = msg.key.remoteJid;

    // ❌ SÓ FUNCIONA EM GRUPO
    if (!from.endsWith("@g.us")) {
        return sock.sendMessage(from, {
            text: `╭━🚫━━━━━━━━━━━━━━━━━━🚫━╮
   ❌ COMANDO RESTRITO
╰━🚫━━━━━━━━━━━━━━━━━━🚫━╯

💞 Esse recurso funciona apenas
dentro de grupos de conversa!

🤖 ${config.BOT_NAME}`
        }, { quoted: msg });
    }

    try {
        // 💬 LISTA COMPLETA DE NÍVEIS E FRASES — MAIS OPÇÕES E MAIS DIVERTIDO!
        const niveisCompatibilidade = [
            { min: 0, max: 20, frase: "Essa combinação tem mais chance de dar briga do que namoro... melhor manter distância! 💥", emoji: "💔" },
            { min: 21, max: 40, frase: "Quase amigos... mas ainda falta muita sintonia para virar amor.", emoji: "😐" },
            { min: 41, max: 55, frase: "Talvez role uma amizade... com alguns benefícios, quem sabe? 🤫", emoji: "🤔" },
            { min: 56, max: 70, frase: "Existe uma conexão legal, basta um empurrãozinho para esquentar esse clima! 🔥", emoji: "🥰" },
            { min: 71, max: 85, frase: "Uau! Sinto uma energia muito forte entre vocês... cuidado, corações podem ser flechados! 💘", emoji: "😍" },
            { min: 86, max: 95, frase: "Que química incrível! Se não se gostarem, é quase um crime contra o amor! ✨", emoji: "💞" },
            { min: 96, max: 99, frase: "É quase destino escrito! Vocês foram feitos para se encontrar, não tem erro.", emoji: "💍✨" },
            { min: 100, max: 100, frase: "💥 É O CASAL PERFEITO DA VIDA REAL! PODEM CORRER FAZER O PEDIDO, O CUPIDO JÁ ABENÇOOU! 💍💒", emoji: "💖🔥💯" }
        ];

        // 📋 PEGA TODOS OS PARTICIPANTES
        const dadosGrupo = await sock.groupMetadata(from);
        let membros = dadosGrupo.participants;

        // ⚠️ MÍNIMO DE PESSOAS
        if (membros.length < 2) {
            return sock.sendMessage(from, {
                text: `╭━⚠️━━━━━━━━━━━━━━━━━━⚠️━╮
      ⚠️ GRUPO MUITO PEQUENO
╰━⚠️━━━━━━━━━━━━━━━━━━⚠️━╯

💞 Preciso de pelo menos *2 pessoas*
cadastradas aqui para sortear
um novo casal!

🤖 ${config.BOT_NAME}`
            }, { quoted: msg });
        }

        // 🎲 EMBARALHA E PEGA DOIS DIFERENTES
        membros.sort(() => Math.random() - 0.5);
        const pessoa1 = membros[0];
        let pessoa2 = membros[1];

        // Garante que não vai sortear a mesma pessoa duas vezes
        if (!pessoa2) pessoa2 = membros[0];

        // 📊 GERA PORCENTAGEM
        const porcentagem = Math.floor(Math.random() * 101);

        // 🔍 BUSCA A FRASE CORRESPONDENTE
        let resultado = niveisCompatibilidade[0];
        for (const item of niveisCompatibilidade) {
            if (porcentagem >= item.min && porcentagem <= item.max) {
                resultado = item;
                break;
            }
        }

        // 💌 MENSAGEM FINAL — VISUAL PADRÃO DO SEU BOT
        const mensagemCasal = `╭━💞━━━━━━━━━━━━━━━━━━━━💞━╮
    ✨ CASAL DO DIA SORTEADO ✨
╰━💞━━━━━━━━━━━━━━━━━━━━💞━╯

🏹 O cupido do ${config.BOT_NAME}
acertou em cheio nesses dois:

💘  PRIMEIRO: @${pessoa1.id.split("@")[0]}
💘  SEGUNDO: @${pessoa2.id.split("@")[0]}

╭━📊━━━━━━━━━━━━━━━━━━━━📊━╮
💓 *COMPATIBILIDADE:* ${porcentagem}% ${resultado.emoji}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

💬 *O que diz a sorte:*
_"${resultado.frase}"_

╭━💍━━━━━━━━━━━━━━━━━━━━💍━╮
✨ Aproveitem a sintonia! ✨
🤖 ${config.BOT_NAME} • CUPIDO OFICIAL
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        // 🖼️ Busca as fotos de perfil dos dois pra gerar o card visual
        let fotoBuffer1 = null, fotoBuffer2 = null;
        try {
            const url1 = await sock.profilePictureUrl(pessoa1.id, "image").catch(() => null);
            if (url1) fotoBuffer1 = await baixarBuffer(url1).catch(() => null);
        } catch { fotoBuffer1 = null; }
        try {
            const url2 = await sock.profilePictureUrl(pessoa2.id, "image").catch(() => null);
            if (url2) fotoBuffer2 = await baixarBuffer(url2).catch(() => null);
        } catch { fotoBuffer2 = null; }

        try {
            const fotoContextoBuffer = await buscarFotoContexto(sock, from);
            await enviarCardOuAnimado(sock, from, (fundoBuffer) => criarCardCasal({
                fotoBuffer1,
                nomeUsuario1: pessoa1.id.split("@")[0],
                fotoBuffer2,
                nomeUsuario2: pessoa2.id.split("@")[0],
                porcentagem,
                fotoContextoBuffer,
                fundoBuffer
            }), { caption: mensagemCasal, mentions: [pessoa1.id, pessoa2.id] });
        } catch (erroCard) {
            console.error("❌ Erro ao gerar card de casal:", erroCard);
            await sock.sendMessage(from, {
                text: mensagemCasal,
                mentions: [pessoa1.id, pessoa2.id]
            });
        }

    } catch (erro) {
        console.error("[COMANDO CASAL] ERRO:", erro);
        return sock.sendMessage(from, {
            text: `╭━😥━━━━━━━━━━━━━━━━━━😥━╮
   ❤️‍🩹 CUPIDO COM PROBLEMAS
╰━😥━━━━━━━━━━━━━━━━━━😥━╯

O cupido ficou confuso,
mas promete tentar novamente
em instantes! Tente de novo.

🤖 ${config.BOT_NAME}`
        }, { quoted: msg });
    }
}

module.exports = { formarCasal };

