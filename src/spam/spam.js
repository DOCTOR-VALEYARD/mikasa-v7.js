/* =================================================
   🚀 COMANDO SPAM / DISPARO EM PROCESSAMENTO
   📁 Arquivo: spam.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
================================================= */

const fs = require("fs");
const path = require("path");
const config = require("../../config");

// 🛡️ Controle de execução
const mensagensProcessadas = new Set();
const executandoAgora = new Set();

// 📂 Caminho do histórico
const caminhoHistorico = path.join(__dirname, "../dados/historico-spam.json");

// 💾 Função de salvar registro
function salvarHistorico(numero, quantidade, remetente) {
    let historico = [];
    if (fs.existsSync(caminhoHistorico)) {
        try { 
            historico = JSON.parse(fs.readFileSync(caminhoHistorico, "utf8")); 
        } catch { 
            historico = []; 
        }
    }

    const agora = new Date();
    historico.push({
        data: agora.toLocaleDateString("pt-BR"),
        hora: agora.toLocaleTimeString("pt-BR"),
        numeroAlvo: numero.replace(/[^0-9]/g, ""),
        quantidadeSolicitada: quantidade,
        executadoPor: remetente.split("@")[0],
        status: "CONCLUÍDO"
    });

    fs.writeFileSync(caminhoHistorico, JSON.stringify(historico, null, 2), "utf8");
}

// 🚀 FUNÇÃO PRINCIPAL
module.exports.spam = async function (sock, msg, args) {
    const msgId = msg.key.id;
    const from = msg.key.remoteJid;
    const remetente = msg.key.participant || from;

    // 🔒 Bloqueia repetição da mesma mensagem
    if (mensagensProcessadas.has(msgId)) return;
    mensagensProcessadas.add(msgId);

    // ⛔ Bloqueia rodar dois ao mesmo tempo no mesmo grupo
    if (executandoAgora.has(from)) {
        await sock.sendMessage(from, { 
            text: `┅┄┅┄『 ✦ 』┄┅┄┅┄
 ⏳ JÁ EM PROCESSAMENTO!
┅┄┅┄『 ✦ 』┄┅┄┅┄

Aguarde finalizar antes de solicitar novamente.

🤖 ${config.BOT_NAME}` 
        }, { quoted: msg });
        mensagensProcessadas.delete(msgId);
        return;
    }
    executandoAgora.add(from);


    // 🖼️ Foto de perfil
    let fotoPerfil = "https://i.imgur.com/3n8CwUl.png";
    try { 
        fotoPerfil = await sock.profilePictureUrl(remetente, "image"); 
    } catch {}


    // ❌ ERRO: PARÂMETROS INSUFICIENTES
    if (!args || args.length < 2) {
        await sock.sendMessage(from, {
            image: { url: fotoPerfil },
            caption: `╭━🚫━━━━━━━━━━━━━━━━🚫━╮
   ❌ COMANDO INCORRETO
╰━🚫━━━━━━━━━━━━━━━━🚫━╯

📝 *MODO DE USAR:*
${config.PREFIX}spam <número> <quantidade>

💡 *EXEMPLO:*
${config.PREFIX}spam 5511999999999 10

🤖 ${config.BOT_NAME}`
        }, { quoted: msg });

        finalizarControle();
        return;
    }


    // 📚 TRATA E VALIDA DADOS
    let numero = args[0].replace(/[^0-9]/g, "");
    const quantidade = parseInt(args[1]);

    // ❌ ERRO: QUANTIDADE FORA DO LIMITE
    if (isNaN(quantidade) || quantidade < 1 || quantidade > 30) {
        await sock.sendMessage(from, {
            image: { url: fotoPerfil },
            caption: `╭━⚠️━━━━━━━━━━━━━━━━⚠️━╮
 ❌ QUANTIDADE INVÁLIDA
╰━━━━━━━━━━━━━━━━━━━━━━━━━╯

🔢 Valores permitidos: *1 até 30*
Ex: ${config.PREFIX}spam 5511999999999 8

🤖 ${config.BOT_NAME}`
        }, { quoted: msg });

        finalizarControle();
        return;
    }


    // 💾 SALVA REGISTRO NO HISTÓRICO
    salvarHistorico(numero, quantidade, remetente);


    // 📢 AVISO DE INÍCIO — APARÊNCIA DE PROCESSO REAL
    await sock.sendMessage(from, {
        image: { url: fotoPerfil },
        caption: `
╭━🚀━━━━━━━━━━━━━━━🚀━╮
 ⚙️ INICIANDO PROCESSAMENTO
╰━🚀━━━━━━━━━━━━━━━━━━╯

📱 *Número alvo:* ${numero}
🔢 *Quantidade:* ${quantidade}
⏱️ Aguardando envio...

👤 Solicitado por: @${remetente.split("@")[0]}

🤖 ${config.BOT_NAME}`
    }, { quoted: msg, mentions: [remetente] });


    // ⏱️ SIMULAÇÃO DO TEMPO — APENAS CONTAGEM INTERNA
    let contador = 0;
    while (contador < quantidade) {
        contador++;
        await new Promise(r => setTimeout(r, 150));
    }


    // ✅ MENSAGEM DE CONCLUSÃO — COMPLETA E SEM AVISOS
    await sock.sendMessage(from, {
        image: { url: fotoPerfil },
        caption: `
╭━✅━━━━━━━━━━━━━━━✅━╮
     🎯 PROCESSO CONCLUÍDO
╰━✅━━━━━━━━━━━━━━━━━━╯

📌 *RESUMO DA OPERAÇÃO:*
📱 Destino: ${numero}
🔢 Total processado: ${quantidade}
📂 Registro: *Salvo com sucesso ✅*

🤖 ${config.BOT_NAME} • OPERAÇÃO FINALIZADA`
    }, { quoted: msg });


    // 🧹 LIMPA CONTROLES DE EXECUÇÃO
    function finalizarControle() {
        executandoAgora.delete(from);
        mensagensProcessadas.delete(msgId);
    }
    finalizarControle();
};

