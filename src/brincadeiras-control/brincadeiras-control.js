const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, "../../database/botconfig.json");

const COMANDOS_BRINCADEIRAS = new Set([
  'forca','adivinha','quiz','jogodavelha','aleatory','roleta','sortear','signo','enquete',
  'tapa','matar','beijar','abracar','amizade','compatibilidade','dupla','casal','familia',
  'familias','casamento','meucasal','divorcio','topcasais','missao','missoes','conquistas',
  'xp','nivel','topxp','checkin','trabalhar','roubar','bonus','transferir','presente',
  'inventario','topgold','topamizade'
]);

function lerDB() {
  try {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return {};
  }
}

function salvarDB(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

function estaAtiva() {
  return lerDB().BRINCADEIRAS_ATIVA === true;
}

function status() {
  return estaAtiva() ? '🟢 ATIVADAS' : '🔴 DESATIVADAS';
}

function ehBrincadeira(command) {
  return COMANDOS_BRINCADEIRAS.has(String(command || '').toLowerCase());
}

function alterarAtivacao(ativa) {
  const db = lerDB();
  db.BRINCADEIRAS_ATIVA = !!ativa;
  salvarDB(db);
  return !!ativa;
}

module.exports = {
  COMANDOS_BRINCADEIRAS,
  lerDB,
  salvarDB,
  estaAtiva,
  status,
  ehBrincadeira,
  alterarAtivacao
};
