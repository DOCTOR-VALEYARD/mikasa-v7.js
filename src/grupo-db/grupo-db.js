/* =================================================
   📂 MIKASA BOT — BANCO DE DADOS DOS GRUPOS
   📁 Arquivo: grupo-db.js

   Extraído do grupo.js pra evitar dependência circular (grupo.js e
   antinsfw.js precisam ler/escrever o mesmo banco, mas não podem
   depender um do outro diretamente).
================================================= */

const fs = require("fs");
const path = require("path");
const jsonPath = path.join(__dirname, "../dados/grupos.json");

if (!fs.existsSync(jsonPath)) {
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify({}));
}

function getDB() {
    return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function saveDB(data) {
    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
}

module.exports = { getDB, saveDB };
