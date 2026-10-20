const fs = require('fs');
const path = require('path');
const config = require('../../config');
const dbPath = path.join(__dirname, "../../database/recursos-avancados.json");
function ler(){try{return fs.existsSync(dbPath)?JSON.parse(fs.readFileSync(dbPath,'utf8'))||{}:{};}catch{return {};}}
async function advertidos(sock,msg){
 const from=msg.key.remoteJid, db=ler(), warns=db.warns?.[from]||{};
 const ids=Object.entries(warns).filter(([,n])=>n>0);
 const text=`⚠️ *ADVERTIDOS DO GRUPO*\n\n${ids.length?ids.map(([id,n],i)=>`${i+1}. @${String(id).split('@')[0]} — *${n}/3*`).join('\n'):'Nenhum membro possui advertência registrada.'}`;
 await sock.sendMessage(from,{text,mentions:ids.map(([id])=>id)},{quoted:msg});
}
module.exports={advertidos};
