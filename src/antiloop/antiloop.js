/* =================================================
   🔁 MIKASA BOT — ANTI-LOOP (detecta repetição / outro bot)
   📁 Arquivo: antiloop.js

   Se a MESMA mensagem chegar 3 vezes seguidas da mesma pessoa
   no mesmo chat, o bot assume que não é uma pessoa de verdade
   digitando (é outro bot, ou algum eco/automatização) e para
   de responder pra aquele remetente naquele chat — evitando o
   clássico loop de "dois bots" ficando se respondendo pra
   sempre (ex: os dois falando a palavra que dispara alguma
   resposta automática um do outro).

   Assim que o remetente manda algo DIFERENTE do que repetiu,
   o bloqueio é liberado automaticamente.
================================================= */

const estados = new Map(); // chave: `${chatId}::${remetente}` -> { ultimo, contagem, ignorado }

function chave(chatId, remetente) {
    return `${chatId}::${remetente}`;
}

/**
 * Chamar pra toda mensagem de texto recebida.
 * Retorna:
 *   { ignorar: true,  avisar: true  } -> é a 3ª repetição: manda aviso e para de responder
 *   { ignorar: true,  avisar: false } -> já estava ignorando esse remetente: fica em silêncio
 *   { ignorar: false, avisar: false } -> segue o processamento normal
 */
function verificarRepeticao(chatId, remetente, textoOriginal) {
    const texto = (textoOriginal || "").toLowerCase().trim();
    if (!texto) return { ignorar: false, avisar: false }; // mídia sem legenda etc — não entra nessa checagem

    const k = chave(chatId, remetente);
    let estado = estados.get(k);
    if (!estado) {
        estado = { ultimo: "", contagem: 0, ignorado: false };
        estados.set(k, estado);
    }

    // Já estava ignorando esse remetente — só libera se ele mandar algo diferente
    if (estado.ignorado) {
        if (texto === estado.ultimo) {
            return { ignorar: true, avisar: false };
        }
        estado.ignorado = false;
        estado.ultimo = texto;
        estado.contagem = 1;
        return { ignorar: false, avisar: false };
    }

    if (texto === estado.ultimo) {
        estado.contagem++;
    } else {
        estado.ultimo = texto;
        estado.contagem = 1;
    }

    if (estado.contagem >= 3) {
        estado.ignorado = true;
        return { ignorar: true, avisar: true };
    }

    return { ignorar: false, avisar: false };
}

module.exports = { verificarRepeticao };
