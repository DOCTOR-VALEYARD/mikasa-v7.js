/* =================================================
   🆔 MIKASA BOT — MEU ID (diagnóstico de identidade)
   📁 Arquivo: meuid.js

   Mostra todos os identificadores que o WhatsApp está usando pra você
   e pro bot NAQUELE chat. Útil quando o bot não reconhece o dono/admin
   porque o grupo usa o sistema de identidade oculta (lid) do WhatsApp —
   aí é só copiar o ID certo e colar em config.OWNER_LID.
================================================= */

async function meuId(sock, msg) {
    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");
    const participante = msg.key.participant || msg.key.remoteJid;

    let infoGrupo = "";
    if (isGroup) {
        try {
            const meta = await sock.groupMetadata(from);
            const eu = meta.participants.find(p => {
                const alvo = [sock.user?.id, sock.user?.lid].filter(Boolean).map(x => x.split("@")[0].split(":")[0]);
                const cands = [p.id, p.lid].filter(Boolean).map(x => x.split("@")[0].split(":")[0]);
                return cands.some(c => alvo.includes(c));
            });
            infoGrupo = `
┅┄┅┄『 ✦ 』┄┅┄┅┄
🤖 *O BOT NESSE GRUPO*
┅┄┅┄『 ✦ 』┄┅┄┅┄
🆔 id: ${eu?.id || "não achei"}
🆔 lid: ${eu?.lid || "—"}
👮 admin: ${eu?.admin || "não é admin"}`;
        } catch (e) {
            infoGrupo = `\n⚠️ Não consegui ler os dados do grupo: ${e.message}`;
        }
    }

    const texto = `┅┄┅┄『 ✦ 』┄┅┄┅┄
 🆔 *SEUS IDENTIFICADORES AQUI*
┅┄┅┄『 ✦ 』┄┅┄┅┄
📩 Chat (remoteJid): 
${from}
┅┄┅┄『 ✦ 』┄┅┄┅┄
👤 Participante (o que importa):
${participante}
┅┄┅┄『 ✦ 』┄┅┄┅┄
🤖 O BOT (sock.user):
id: ${sock.user?.id || "—"}
lid: ${sock.user?.lid || "—"}
${infoGrupo}
┅┄┅┄『 ✦ 』┄┅┄┅┄
💡 Se o bot não te reconhece como dono/admin
aqui, copia o número de "Participante" acima
e cola em config.OWNER_LID
┅┄┅┄『 ✦ 』┄┅┄┅┄`;

    return sock.sendMessage(from, { text: texto }, { quoted: msg });
}

module.exports = { meuId };
