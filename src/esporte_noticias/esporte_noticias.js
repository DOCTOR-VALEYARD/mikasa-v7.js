/* =================================================
   ⚽ NOTÍCIAS ESPORTIVAS — COM DADOS REAIS ONLINE
   📁 Arquivo: esporte_noticias.js
   🤖 ${config.BOT_NAME} • ${config.OWNER_NAME}
   ================================================= */

const config = require("../../config");

// 📡 FUNÇÃO PARA BUSCAR NOTÍCIAS — FONTE: ESPN BRASIL / G1 ESPORTES
async function buscarNoticias() {
    try {
        // Usamos fonte pública e leve, sem necessidade de cadastro
        const res = await fetch("https://g1.globo.com/esportes/feed/rss2.xml");
        const texto = await res.text();

        // Extrai os 5 primeiros títulos e links (funciona como leitura simples)
        const titulos = texto.match(/<title>(.*?)<\/title>/g)?.slice(2, 7) || [];
        const links = texto.match(/<link>(.*?)<\/link>/g)?.slice(2, 7) || [];

        return titulos.map((t, i) => ({
            titulo: t.replace(/<[^>]+>/g, ""),
            link: links[i]?.replace(/<[^>]+>/g, "") || "#"
        }));
    } catch {
        return null;
    }
}

async function esporte_noticias(sock, msg) {
    const from = msg.key.remoteJid;

    const noticias = await buscarNoticias();

    if (!noticias || noticias.length === 0) {
        const semConexao = `╭━⚽━━━━━━━━━━━━━━━━━⚽━╮
     📰 NOTÍCIAS DO ESPORTE ⚡
╰━⚽━━━━━━━━━━━━━━━━━⚽━╯

⚠️ *SEM CONEXÃO COM FONTE DE DADOS!*
Verifique a internet ou tente novamente em instantes.

🏆 *O QUE COBERTAMOS:*
• Brasileirão • Copa do Brasil
• Libertadores • Sul-Americana
• Futebol Internacional e mais...

✨ *${config.BOT_NAME} — Sempre atualizando!* ✨`;
        return sock.sendMessage(from, { text: semConexao }, { quoted: msg });
    }

    let listaNoticias = "";
    noticias.forEach((n, i) => {
        listaNoticias += `${i + 1}. 📌 *${n.titulo}*\n🔗 Leia mais: ${n.link}\n\n`;
    });

    const resposta = `╭━⚽━━━━━━━━━━━━━━━━━⚽━╮
     📰 ÚLTIMAS DO ESPORTE ⚡
╰━⚽━━━━━━━━━━━━━━━━━⚽━╯

${listaNoticias}
⏱️ Atualizado: Agora mesmo!

💡 *Comandos futuros:*
🔹 ${config.PREFIX}tabela ➜ Classificação do Brasileirão
🔹 ${config.PREFIX}jogos ➜ Partidas da rodada

✨ *${config.BOT_NAME} — Informação Rápida e Fiel!* ✨`;

    await sock.sendMessage(from, { text: resposta }, { quoted: msg });
}

module.exports = { esporte_noticias };

