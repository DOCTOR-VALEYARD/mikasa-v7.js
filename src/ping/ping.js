// src/ping.js

const config = require("../../config");


// ═══════════════════════════════════════════════════════════════
// 🏓 PING / STATUS DO BOT
// ═══════════════════════════════════════════════════════════════

async function ping(sock, msg) {

    const from =
        msg?.key?.remoteJid;

    if (!from) {
        return;
    }


    try {

        // ═══════════════════════════════════════════════════════
        // ⏱️ TESTE DE LATÊNCIA
        // ═══════════════════════════════════════════════════════

        const inicio =
            Date.now();


        const respostaInicial =
            await sock.sendMessage(
                from,
                {
                    text: "⏳"
                },
                {
                    quoted: msg
                }
            );


        const latencia =
            Date.now() - inicio;


        // ═══════════════════════════════════════════════════════
        // 📊 CLASSIFICAÇÃO DA VELOCIDADE
        // ═══════════════════════════════════════════════════════

        let velocidade;
        let indicador;

        if (latencia <= 100) {

            velocidade = "⚡ ULTRA RÁPIDA";
            indicador = "🟢";

        } else if (latencia <= 250) {

            velocidade = "🚀 MUITO RÁPIDA";
            indicador = "🟢";

        } else if (latencia <= 500) {

            velocidade = "✨ ESTÁVEL";
            indicador = "🟡";

        } else if (latencia <= 1000) {

            velocidade = "🐢 MODERADA";
            indicador = "🟠";

        } else {

            velocidade = "🔴 LENTA";
            indicador = "🔴";
        }


        // ═══════════════════════════════════════════════════════
        // 🖥️ INFORMAÇÕES DO PROCESSO
        // ═══════════════════════════════════════════════════════

        const memoria =
            process.memoryUsage();

        const memoriaMB =
            (
                memoria.rss /
                1024 /
                1024
            ).toFixed(1);


        const uptimeSegundos =
            Math.floor(
                process.uptime()
            );


        const dias =
            Math.floor(
                uptimeSegundos / 86400
            );

        const horas =
            Math.floor(
                (uptimeSegundos % 86400) / 3600
            );

        const minutos =
            Math.floor(
                (uptimeSegundos % 3600) / 60
            );

        const segundos =
            uptimeSegundos % 60;


        const uptime =
            `${dias}d ${horas}h ${minutos}m ${segundos}s`;


        // ═══════════════════════════════════════════════════════
        // 🎨 RESPOSTA
        // ═══════════════════════════════════════════════════════

        const mensagem = `
〔 🏓 𝐏𝐈𝐍𝐆 𝐃𝐎 𝐒𝐈𝐒𝐓𝐄𝐌𝐀 〕
『 ⚡ 𝐃𝐄𝐒𝐄𝐌𝐏𝐄𝐍𝐇𝐎 』
   └─ ${indicador} ${velocidade}
━━━━━━━━━━━━━━━━━━━━
> ⚡ 𝐋𝐀𝐓𝐄̂𝐍𝐂𝐈𝐀
   └─ ${latencia}ms
> 🟢 𝐒𝐓𝐀𝐓𝐔𝐒
   └─ Online
> 🧠 𝐌𝐄𝐌𝐎́𝐑𝐈𝐀
   └─ ${memoriaMB} MB
> ⏱️ 𝐔𝐏𝐓𝐈𝐌𝐄
   └─ ${uptime}
> 💻 𝐀𝐌𝐁𝐈𝐄𝐍𝐓𝐄
   └─ Node.js
> 🔗 𝐂𝐎𝐍𝐄𝐗𝐀̃𝐎
   └─ Operacional
〔 🤖 𝐒𝐈𝐒𝐓𝐄𝐌𝐀 𝐎𝐍𝐋𝐈𝐍𝐄 〕
│
├─ 🤍 ${config.BOT_NAME}
├─ 🌹 ${config.OWNER_NAME}
└─ ⚡ Resposta: ${latencia}ms
━━━━━━━━━━━━━━━━━━━━`;


        // ═══════════════════════════════════════════════════════
        // ✏️ EDITA A MENSAGEM INICIAL
        // ═══════════════════════════════════════════════════════

        try {

            await sock.sendMessage(
                from,
                {
                    text: mensagem,
                    edit: respostaInicial.key
                }
            );

        } catch {

            // Caso a edição não esteja disponível,
            // envia uma nova mensagem.
            await sock.sendMessage(
                from,
                {
                    text: mensagem
                },
                {
                    quoted: msg
                }
            );
        }


    } catch (erro) {

        console.error(
            "❌ Erro no comando ping:",
            erro
        );


        try {

            await sock.sendMessage(
                from,
                {
                    text: `
〔 ❌ 𝐏𝐈𝐍𝐆 𝐅𝐀𝐋𝐇𝐎𝐔 〕
『 ⚠️ 𝐒𝐈𝐒𝐓𝐄𝐌𝐀 』
    └─ Não foi possível obter
         a resposta do servidor.
━━━━━━━━━━━━━━━━━━━━
🤍 ${config.BOT_NAME}
🌹 ${config.OWNER_NAME}
━━━━━━━━━━━━━━━━━━━━`
                },
                {
                    quoted: msg
                }
            );

        } catch (erroEnvio) {

            console.error(
                "❌ Erro ao enviar resposta do ping:",
                erroEnvio
            );
        }
    }
}


// ═══════════════════════════════════════════════════════════════
// 📦 EXPORTAÇÃO
// ═══════════════════════════════════════════════════════════════

module.exports = {
    ping
};