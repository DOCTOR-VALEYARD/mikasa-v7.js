// src/validar-dono.js ✅ agora reaproveita a checagem única e robusta de utils-validacao.js
const config = require("../../config");
const { ehDono: ehDonoRobusto, soNumeros, lerDB } = require("../utils-validacao/utils-validacao");

// Mantido com o mesmo nome/assinatura de sempre pra não quebrar quem já importa
// daqui — mas por baixo já usa a versão que lida com @lid corretamente.
function validarDono(userId) {
    return ehDonoRobusto(userId, config.OWNER_NUMBER);
}

module.exports = { validarDono, soNumeros, lerDB };

