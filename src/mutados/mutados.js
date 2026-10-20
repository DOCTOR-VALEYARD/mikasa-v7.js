const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, "../../database/recursos-avancados.json");
function ler(){try{return fs.existsSync(dbPath)?JSON.parse(fs.readFileSync(dbPath,'utf8'))||{}:{};}catch{return {};}}
async function mutados(sock,msg){
 const from=msg.key.remoteJid, db=ler(), m=db.mutes?.[from]||{}; const ids=Object.keys(m).filter(id=>m[id]);
 await sock.sendMessage(from,{text:`🔇 *MUTADOS DO GRUPO*\n\n${ids.length?ids.map((id,i)=>`${i+1}. @${id.split('@')[0]}`).join('\n'):'Nenhum membro está mutado.'}`,mentions:ids},{quoted:msg});
}
module.exports={mutados};
