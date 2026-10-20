/* =================================================
   🔌 MIKASA BOT — LIGA / DESLIGA GERAL
   📁 Arquivo: ligado.js

   Quando "desligado", o bot ignora completamente qualquer eventos/comando
   (exceto o comando de ligar, e só o dono pode usá-lo). Quando ligar de
   novo, ele NÃO processa nada do que aconteceu enquanto estava desligado —
   só volta a agir a partir da próxima mensagem que chegar depois de ligado.
================================================= */

const fs = require("fs");
const path = require("path");

const estadoPath = path.join(__dirname, "../dados/ligado-estado.json");

let ligado = true; // padrão: ligado
try {
    if (fs.existsSync(estadoPath)) {
        const salvo = JSON.parse(fs.readFileSync(estadoPath, "utf8"));
        if (typeof salvo.ligado === "boolean") ligado = salvo.ligado;
    }
} catch (e) {
    console.error("❌ Erro ao carregar estado de ligado/desligado:", e);
}

function salvar() {
    try { fs.writeFileSync(estadoPath, JSON.stringify({ ligado }, null, 2), "utf8"); } catch {}
}

function estaLigado() { return ligado; }
function ligar() { ligado = true; salvar(); }
function desligar() { ligado = false; salvar(); }

module.exports = { estaLigado, ligar, desligar };
