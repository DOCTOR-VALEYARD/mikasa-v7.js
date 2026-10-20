// Compatibilidade: o comando continua sendo carregado pelo entrypoint antigo,
// mas agora usa o resumo diário completo do módulo de relatórios.
const { resumo } = require("../relatorio/relatorio");
module.exports = { resumo };
