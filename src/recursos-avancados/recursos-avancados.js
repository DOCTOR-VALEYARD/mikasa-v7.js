const fs = require('fs');
const path = require('path');
const axios = require('axios');
const config = require('../../config');
const { isAdmin, isBotAdmin } = require('../grupo/grupo');
const { loadDB, saveDB } = require('../level/level');

const DB_DIR = path.join(__dirname, "../../database");
const DB_PATH = path.join(DB_DIR, 'recursos-avancados.json');
const MEDIAFIRE_PATH = path.join(DB_DIR, 'mediafire.json');
const BACKUP_DIR = path.join(DB_DIR, 'backups');

const APPS_PADRAO = [
  ['Free Fire', ''], ['WhatsApp', ''], ['YouTube', ''], ['Instagram', ''],
  ['TikTok', ''], ['Telegram', ''], ['Facebook', ''], ['CapCut', ''],
  ['Spotify', ''], ['Discord', ''], ['KineMaster', ''], ['Termux', ''],
  ['InShot', ''], ['SnapTube', ''], ['MX Player', ''], ['Canva', '']
];

const ENQUETES = [
  ['Qual é a melhor comida para uma resenha?', ['Pizza 🍕','Churrasco 🥩','Hambúrguer 🍔','Lasanha 🍝']],
  ['Quem é mais provável de sumir e voltar como se nada tivesse acontecido?', ['O ADM 😂','O mais quieto 👀','O mais ativo 🔥','Todo mundo 🤣']],
  ['Qual horário é melhor para a resenha?', ['Manhã 🌅','Tarde ☀️','Noite 🌙','Madrugada 🌌']],
  ['Qual superpoder você escolheria?', ['Voar 🪽','Ficar invisível 🫥','Teletransporte ⚡','Ler mentes 🧠']],
  ['Qual estilo de música domina a resenha?', ['Rap 🎤','Funk 🔥','Sertanejo 🤠','Pagode 🥁']],
  ['O que não pode faltar no grupo?', ['Memes 😂','Resenha 🤣','Notícia 📰','Caos controlado 😈']],
  ['Quem sobreviveria mais tempo em um apocalipse?', ['O ADM 🛡️','O mais inteligente 🧠','O mais sortudo 🍀','Ninguém 😂']],
  ['Qual seria o nome do filme do grupo?', ['A Resenha Final 🎬','Caos no WhatsApp 💥','Os Sobreviventes 👀','Grupo Sem Limites 🔥']],
  ['Qual animal representa melhor a turma?', ['Lobo 🐺','Leão 🦁','Gato 🐱','Capivara 🦫']],
  ['Qual prêmio você preferiria ganhar?', ['Gold 🪙','Presente 🎁','Cargo 👑','Pizza 🍕']]
];

async function interpretarEnquete(tema) {
  const texto = String(tema || '').trim();
  const normalizado = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (/\b(idade|anos de idade|quantos anos|ano de nascimento|nasc(?:eu|imento))\b/.test(normalizado)) {
    return [texto, ['Até 20', '21 a 30', '31 a 40', 'Mais de 40']];
  }

  if (/\b(preco|preço|valor|custa|custo|dinheiro|salario|salário)\b/.test(normalizado)) {
    return [texto, ['Até R$ 50', 'R$ 51 a R$ 200', 'R$ 201 a R$ 500', 'Mais de R$ 500']];
  }

  if (/\b(nota|avaliacao|avaliação|de 0 a 10|0 a 10)\b/.test(normalizado)) {
    return [texto, ['0 a 2', '3 a 5', '6 a 8', '9 a 10']];
  }

  if (/\b(quantidade|quantos|quantas|numero|número|tem quantos|possui quantos)\b/.test(normalizado)) {
    return [texto, ['0 a 5', '6 a 10', '11 a 20', '21 ou mais']];
  }

  if (/\b(hora|horario|horário|quando|dia|data|mes|mês)\b/.test(normalizado)) {
    return [texto, ['Hoje', 'Amanhã', 'Esta semana', 'Outro dia']];
  }

  if (/\b(onde|lugar|cidade|bairro|pais|país)\b/.test(normalizado)) {
    return [texto, ['Na minha cidade', 'Em outra cidade', 'Em outro estado', 'Fora do Brasil']];
  }

  if (/\b(qual|quais|quem|onde|como|quando|voce|você)\b/.test(normalizado)) {
    return [texto, ['Opção 1', 'Opção 2', 'Opção 3', 'Outra opção']];
  }

  return [texto, ['Sim ✅', 'Não ❌', 'Talvez 🤔', 'Depende 😏']];
}

async function cmdEnquete(sock,msg,args){
  const from=msg.key.remoteJid;
  const tema=args.join(' ').trim();
  const item=tema ? interpretarEnquete(tema) : ENQUETES[Math.floor(Math.random()*ENQUETES.length)];

  try {
    return sock.sendMessage(
      from,
      {poll:{name:`📊 ${item[0]}`,values:item[1],selectableCount:1}},
      {quoted:msg}
    );
  } catch {
    return sock.sendMessage(
      from,
      {text:`📊 *ENQUETE*\n\n${item[0]}\n\n${item[1].map((x,i)=>`${i+1}. ${x}`).join('\n')}\n\nResponda com 1, 2, 3 ou 4.`},
      {quoted:msg}
    );
  }
}

async function cmdBanco(sock,msg,command,args){
  const from=msg.key.remoteJid,id=remetente(msg),alvo=mencionado(msg); const {db,u}=obterUsuarioGold(id);
  if(command==='transferir'){
    if(!alvo) return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}transferir @pessoa quantidade`},{quoted:msg});
    const q=Math.floor(Number(args.find(x=>/^\d+$/.test(x)))||0); if(q<=0||u.ouro<q) return sock.sendMessage(from,{text:'❌ Quantidade inválida ou saldo insuficiente.'},{quoted:msg});
    removeGold(id,q); addGold(alvo,q); return sock.sendMessage(from,{text:`💸 @${nomeId(id)} transferiu 🪙 *${q} Gold* para @${nomeId(alvo)}.`,mentions:[id,alvo]},{quoted:msg});
  }
  db.banco ||= {}; db.banco[id] ||= {depositado:0};
  if(command==='depositar'||command==='sacar'){
    const q=Math.floor(Number(args[0])||0); if(q<=0) return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}${command} quantidade`},{quoted:msg});
    if(command==='depositar'){const r=removeGold(id,q);db.banco[id].depositado+=r;saveDB(db);return sock.sendMessage(from,{text:`🏦 Depósito concluído: 🪙 *${r} Gold* guardado.`},{quoted:msg});}
    const r=Math.min(q,db.banco[id].depositado);db.banco[id].depositado-=r;addGold(id,r);saveDB(db);return sock.sendMessage(from,{text:`🏦 Saque concluído: 🪙 *${r} Gold* retirado.`},{quoted:msg});
  }
  if(command==='extrato') return sock.sendMessage(from,{text:`🏦 *EXTRATO*\n\n🪙 Na carteira: ${u.ouro}\n🏦 No banco: ${db.banco[id].depositado}`},{quoted:msg});
}

async function cmdInventario(sock,msg){
  const from=msg.key.remoteJid,id=remetente(msg),db=ler(); const inv=db.inventarios?.[id]||[]; return sock.sendMessage(from,{text:`🎒 *SEU INVENTÁRIO*\n\n${inv.length?inv.map((x,i)=>`${i+1}. ${x}`).join('\n'):'Seu inventário está vazio.'}`},{quoted:msg});
}

async function cmdTopSocial(sock,msg,command){
  const from=msg.key.remoteJid,db=ler(); let arr=[];
  if(command==='topamizade') arr=Object.values(db.amizades||{}).filter(x=>x.grupo===from).map(x=>({ids:[x.a,x.b],score:Date.now()-x.data}));
  else arr=Object.values(db.casamentos||{}).filter(x=>x.grupo===from).map(x=>({ids:[x.a,x.b],score:Date.now()-x.dataInicio}));
  arr.sort((a,b)=>b.score-a.score); const top=arr.slice(0,10); return sock.sendMessage(from,{text:`🏆 *${command==='topamizade'?'TOP AMIZADES':'TOP CASAIS'}*\n\n${top.map((x,i)=>`${i+1}º @${nomeId(x.ids[0])} ❤️ @${nomeId(x.ids[1])}\n   ⏳ ${diffTexto(Date.now()-x.score)}`).join('\n\n')||'Nenhum registro.'}`,mentions:top.flatMap(x=>x.ids)},{quoted:msg});
}

async function cmdXpNivel(sock,msg,command){
  const from=msg.key.remoteJid,id=remetente(msg),{u}=obterUsuarioGold(id); if(command==='xp') return sock.sendMessage(from,{text:`⭐ @${nomeId(id)} tem *${u.xp} XP*.`,mentions:[id]},{quoted:msg}); return sock.sendMessage(from,{text:`🏆 @${nomeId(id)} está no *nível ${u.nivel}* e possui ${u.xp} XP.`,mentions:[id]},{quoted:msg});
}

async function cmdBonus(sock,msg,command){
  const from=msg.key.remoteJid,id=remetente(msg),db=ler(); db.bonus ||= {}; const hojeStr=hoje(); if(command==='bonus'){if(db.bonus[id]===hojeStr)return sock.sendMessage(from,{text:'⏳ Você já pegou o bônus hoje.'},{quoted:msg});db.bonus[id]=hojeStr;salvar(db);const q=200;addGold(id,q);return sock.sendMessage(from,{text:`🎁 BÔNUS RECEBIDO!\n\n🪙 +${q} Gold`},{quoted:msg});} return sock.sendMessage(from,{text:`🏆 Use ${config.PREFIX}bonus para retirar seu bônus diário.`},{quoted:msg});
}

async function processarMute(sock,msg){
  const from=msg.key.remoteJid; if(!from?.endsWith('@g.us')) return false; const db=ler(); const id=remetente(msg); if(!db.mutes?.[from]?.[id]) return false; try{await sock.sendMessage(from,{delete:msg.key});}catch{} return true;
}

async function cmdMute(sock,msg,command){
  const from=msg.key.remoteJid,id=remetente(msg),alvo=mencionado(msg); if(!from?.endsWith('@g.us'))return; if(!(await isAdmin(sock,from,id).catch(()=>false)))return sock.sendMessage(from,{text:'🚫 Apenas administradores podem usar esse comando.'},{quoted:msg}); if(!alvo)return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}${command} @pessoa`},{quoted:msg}); const db=ler();db.mutes||={};db.mutes[from]||={}; if(command==='mute'){db.mutes[from][alvo]=true;salvar(db);return sock.sendMessage(from,{text:`🔇 @${nomeId(alvo)} foi colocado no modo silêncio. As mensagens dele serão apagadas enquanto durar o mute.`,mentions:[alvo]},{quoted:msg});} delete db.mutes[from][alvo];salvar(db);return sock.sendMessage(from,{text:`🔊 @${nomeId(alvo)} foi desmutado.`,mentions:[alvo]},{quoted:msg});
}


function garantir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}
function ler() {
  garantir();
  if (!fs.existsSync(DB_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')) || {}; } catch { return {}; }
}
function salvar(db) {
  garantir();
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_PATH);
}
function lerMediaFire() {
  garantir();
  if (!fs.existsSync(MEDIAFIRE_PATH)) {
    const db = {};
    APPS_PADRAO.forEach(([nome, link], i) => db[String(i + 1)] = { nome, link });
    fs.writeFileSync(MEDIAFIRE_PATH, JSON.stringify(db, null, 2));
    return db;
  }
  try { return JSON.parse(fs.readFileSync(MEDIAFIRE_PATH, 'utf8')) || {}; } catch { return {}; }
}
function salvarMediaFire(db) { garantir(); fs.writeFileSync(MEDIAFIRE_PATH, JSON.stringify(db, null, 2)); }

function remetente(msg) {
  return msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJid;
}
function mencionado(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || null;
}
function nomeId(id) { return String(id || '').split('@')[0].split(':')[0]; }
function hoje() { return new Date().toISOString().slice(0, 10); }
function fmtData(d) { return new Date(d).toLocaleDateString('pt-BR'); }
function fmtDataHora(d) { return new Date(d).toLocaleString('pt-BR'); }
function diffTexto(inicio, fim = Date.now()) {
  let ms = Math.max(0, fim - inicio);
  const dias = Math.floor(ms / 86400000); ms %= 86400000;
  const horas = Math.floor(ms / 3600000); ms %= 3600000;
  const minutos = Math.floor(ms / 60000);
  return `${dias} dia(s), ${horas} hora(s) e ${minutos} minuto(s)`;
}
function alvoOuErro(msg) { return mencionado(msg) || null; }

function obterUsuarioGold(id) {
  const db = loadDB();
  if (!db[id]) db[id] = { nome: 'Usuário', nivel: 1, xp: 0, ouro: 0 };
  if (!Number.isFinite(db[id].ouro)) db[id].ouro = Number(db[id].gold || 0) || 0;
  if (!Number.isFinite(db[id].xp)) db[id].xp = 0;
  if (!Number.isFinite(db[id].nivel)) db[id].nivel = 1;
  return { db, u: db[id] };
}

function addGold(id, amount) {
  const { db, u } = obterUsuarioGold(id);
  u.ouro += Math.max(0, Math.floor(amount));
  saveDB(db);
  return u.ouro;
}
function removeGold(id, amount) {
  const { db, u } = obterUsuarioGold(id);
  const v = Math.min(u.ouro, Math.max(0, Math.floor(amount)));
  u.ouro -= v;
  saveDB(db);
  return v;
}

async function processarPrimeiraMensagem(sock, msg, body) {
  const from = msg.key.remoteJid;
  if (!from?.endsWith('@g.us') || !body) return false;
  const id = remetente(msg);
  if (!id) return false;

  const db = ler();
  db.checkin ||= {};
  db.checkinAtivo ||= {};

  // 🔒 DESLIGADO POR PADRÃO.
  // O próprio usuário precisa ativar o check-in automático pelo botão.
  if (db.checkinAtivo[id] !== true) return false;

  // ⏱️ 24 HORAS EXATAS desde a última recompensa.
  const ultimo = Number(db.checkin[id]);
  if (Number.isFinite(ultimo) && ultimo > 0 && Date.now() - ultimo < 86400000) {
    return false;
  }

  db.checkin[id] = Date.now();
  salvar(db);

  const ganho = Math.floor(Math.random() * 51) + 50;
  addGold(id, ganho);
  await sock.sendMessage(from, {
    text: `🎁 *CHECK-IN DIÁRIO*

Bom dia, @${nomeId(id)}! 🌅
Você enviou sua primeira mensagem após o intervalo de 24 horas e recebeu:

🪙 *+${ganho} Gold*

💰 Continue participando para acumular mais!`,
    mentions: [id]
  }).catch(() => {});
  return true;
}

function mesesEntre(inicio, fim) {
  const a = new Date(inicio), b = new Date(fim);
  let n = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < Math.min(a.getDate(), new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate())) n--;
  return Math.max(0, n);
}
function aniversarioHoje(inicio, agora = new Date()) {
  const a = new Date(inicio), b = agora;
  if (b < a) return false;
  const ultimoDia = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  return b.getDate() === Math.min(a.getDate(), ultimoDia) && mesesEntre(a, b) > 0;
}

async function verificarAniversarios(sock, from) {
  if (!from?.endsWith('@g.us')) return;
  const db = ler();
  if (!db.casamentos) return;
  const hojeStr = hoje();
  const cfg = db.config || {};
  for (const [chave, c] of Object.entries(db.casamentos)) {
    if (c.grupo !== from || !aniversarioHoje(c.dataInicio)) continue;
    const meses = mesesEntre(c.dataInicio, Date.now());
    const marca = `${hojeStr}:${meses}`;
    if (c.ultimoParabens === marca) continue;
    c.ultimoParabens = marca;
    salvar(db);
    const mensagem = (cfg.mensagemAniversario || `🎉💍 *FELIZ ANIVERSÁRIO DE CASAMENTO!* 💍🎉\n\nParabéns, @A e @B! ❤️\nHoje vocês completam *{meses} mês(es)* de casamento!\n\nQue o amor continue crescendo, que nunca falte cumplicidade e que venham muitos outros meses e anos juntos! 🥂❤️\n\n🤖 {bot}`).replace('{meses}', String(meses)).replace('{bot}', config.BOT_NAME);
    const texto = mensagem.replace('@A', '@' + nomeId(c.a)).replace('@B', '@' + nomeId(c.b));
    await sock.sendMessage(from, { text: texto, mentions: [c.a, c.b] }).catch(() => {});
  }
}

async function cmdEconomia(sock, msg, command, args) {
  const from = msg.key.remoteJid, id = remetente(msg);
  if (!id) return;
  if (command === 'gold' || command === 'saldo') {
    const { u } = obterUsuarioGold(id);
    return sock.sendMessage(from, { text: `💰 *SALDO DE ${msg.pushName || 'VOCÊ'}*\n\n🪙 Gold: *${u.ouro}*\n⭐ XP: *${u.xp}*\n🏆 Nível: *${u.nivel}*` }, { quoted: msg });
  }
  if (command === 'checkinauto' || command === 'checkin-auto') {
    const db = ler();
    db.checkinAtivo ||= {};
    const ativo = db.checkinAtivo[id] === true;
    db.checkinAtivo[id] = !ativo;
    salvar(db);

    return sock.sendMessage(from, {
      text: db.checkinAtivo[id]
        ? `🟢 *CHECK-IN AUTOMÁTICO ATIVADO!*

⏱️ A recompensa automática será enviada no máximo uma vez a cada *24 horas* para você.
🔘 Use o mesmo botão novamente para desligar.`
        : `🔴 *CHECK-IN AUTOMÁTICO DESATIVADO!*

Você não receberá mais check-in automático.
🔘 Use o mesmo botão novamente para ligar.`
    }, { quoted: msg });
  }

  if (command === 'checkin' || command === 'daily') {
    const db = ler();
    db.checkin ||= {};
    const ultimo = Number(db.checkin[id]);

    if (Number.isFinite(ultimo) && ultimo > 0 && Date.now() - ultimo < 86400000) {
      const restante = 86400000 - (Date.now() - ultimo);
      const h = Math.floor(restante / 3600000);
      const min = Math.floor((restante % 3600000) / 60000);
      return sock.sendMessage(from, {
        text: `⏳ Você já recebeu seu Gold.\n\n🕐 Próximo check-in em aproximadamente *${h}h ${min}min*.`
      }, { quoted: msg });
    }

    db.checkin[id] = Date.now();
    salvar(db);
    const ganho = Math.floor(Math.random() * 51) + 50;
    addGold(id, ganho);
    return sock.sendMessage(from, {
      text: `🎁 *CHECK-IN CONCLUÍDO!*\n\n🌅 Recompensa liberada após 24 horas:\n🪙 *+${ganho} Gold*`
    }, { quoted: msg });
  }
  if (command === 'trabalhar') {
    const db = ler(); db.trabalho ||= {};
    const ultimo = db.trabalho[id] || 0;
    if (Date.now() - ultimo < 3600000) return sock.sendMessage(from, { text: `⏳ Você já trabalhou recentemente. Volte em ${Math.ceil((3600000 - (Date.now()-ultimo))/60000)} minuto(s).` }, { quoted: msg });
    const ganho = Math.floor(Math.random() * 301) + 100; db.trabalho[id] = Date.now(); salvar(db); addGold(id, ganho);
    return sock.sendMessage(from, { text: `💼 *DIA DE TRABALHO CONCLUÍDO*\n\nVocê trabalhou duro e recebeu 🪙 *+${ganho} Gold*!` }, { quoted: msg });
  }
  if (command === 'roubar' && mencionado(msg)) {
    const alvo = mencionado(msg); if (alvo === id) return sock.sendMessage(from, { text: '😂 Você não pode roubar você mesmo.' }, { quoted: msg });
    const { u: alvoU } = obterUsuarioGold(alvo);
    if (alvoU.ouro < 20) return sock.sendMessage(from, { text: `😂 @${nomeId(alvo)} está tão pobre que nem vale a pena.`, mentions: [alvo] }, { quoted: msg });
    const sucesso = Math.random() < 0.55;
    if (!sucesso) { const multa = Math.min(alvoU.ouro, Math.floor(Math.random()*50)+10); removeGold(id, multa); return sock.sendMessage(from, { text: `🚔 *ROUBO FRACASSADO!*\n\n@${nomeId(id)} tentou roubar @${nomeId(alvo)} e levou multa de 🪙 *${multa} Gold*. 😂`, mentions:[id,alvo] }, { quoted: msg }); }
    const valor = Math.min(alvoU.ouro, Math.floor(Math.random()*101)+20); removeGold(alvo, valor); addGold(id, valor);
    return sock.sendMessage(from, { text: `🥷 *ROUBO REALIZADO!*\n\n@${nomeId(id)} acabou de roubar 🪙 *${valor} Gold* de @${nomeId(alvo)}. 💸`, mentions:[id,alvo] }, { quoted: msg });
  }
}

function dataEntrada(args) {
  if (!args.length) return new Date();
  const raw = args.join(' ').replace(/^(dia|data)\s+/i, '');
  const d = new Date(raw.includes('/') ? raw.split('/').reverse().join('-') : raw);
  return isNaN(d) ? null : d;
}

async function cmdSocial(sock, msg, command, args) {
  const from = msg.key.remoteJid, id = remetente(msg);
  if (!from?.endsWith('@g.us')) return sock.sendMessage(from, { text: '❌ Esse comando funciona somente em grupos.' }, { quoted: msg });
  const db = ler(); db.familias ||= {}; db.casamentos ||= {}; db.amizades ||= {}; db.duplas ||= {};
  const alvo = mencionado(msg);
  if (['amizade','compatibilidade','dupla'].includes(command) && !alvo) return sock.sendMessage(from, { text: `❌ Marque alguém. Ex.: ${config.PREFIX}${command} @pessoa` }, { quoted: msg });
  if (command === 'amizade') {
    const chave = [id, alvo].sort().join('|'); db.amizades[chave] ||= { a:id,b:alvo,data:Date.now(),grupo:from }; salvar(db);
    return sock.sendMessage(from,{text:`🤝 *NOVA AMIZADE REGISTRADA!*\n\n@${nomeId(id)} 🤝 @${nomeId(alvo)}\n📅 Desde: ${fmtData(db.amizades[chave].data)}\n⏳ Há ${diffTexto(db.amizades[chave].data)}`,mentions:[id,alvo]},{quoted:msg});
  }
  if (command === 'compatibilidade') {
    const p = Math.floor(Math.random()*101); return sock.sendMessage(from,{text:`💞 *TESTE DE COMPATIBILIDADE*\n\n@${nomeId(id)} ❤️ @${nomeId(alvo)}\n\n💘 Compatibilidade: *${p}%*\n${p>=80?'🔥 Isso aí tá perigoso!':'😏 Ainda dá para melhorar!'}`,mentions:[id,alvo]},{quoted:msg});
  }
  if (command === 'dupla') {
    const chave=[id,alvo].sort().join('|'); db.duplas[chave] ||= {a:id,b:alvo,data:Date.now(),grupo:from}; salvar(db);
    return sock.sendMessage(from,{text:`👥 *DUPLA REGISTRADA!*\n\n@${nomeId(id)} + @${nomeId(alvo)}\n🎯 Agora vocês são oficialmente uma dupla.\n📅 Desde: ${fmtData(db.duplas[chave].data)}`,mentions:[id,alvo]},{quoted:msg});
  }
  if (command === 'familia') {
    const data = dataEntrada(args.filter(x => !/^@/.test(x)));
    const membros = [id, ...((msg.message?.extendedTextMessage?.contextInfo?.mentionedJid)||[])];
    const chave = from + ':' + id;
    if (!db.familias[chave]) {
      db.familias[chave] = { dono:id, membros:[...new Set(membros)], data:(data||new Date()).getTime(), grupo:from };
      salvar(db);
      return sock.sendMessage(from,{text:`👨‍👩‍👧‍👦 *FAMÍLIA REGISTRADA!*\n\n${db.familias[chave].membros.map(x=>'👤 @'+nomeId(x)).join('\n')}\n\n📅 Início: ${fmtData(db.familias[chave].data)}\n⏳ Há ${diffTexto(db.familias[chave].data)}`,mentions:db.familias[chave].membros},{quoted:msg});
    }
    const f=db.familias[chave];
    if (alvo || args.some(x=>x.startsWith('@'))) { for(const m of membros) if(!f.membros.includes(m)) f.membros.push(m); if(data) f.data=data.getTime(); salvar(db); }
    return sock.sendMessage(from,{text:`👨‍👩‍👧‍👦 *SUA FAMÍLIA*\n\n${f.membros.map(x=>'👤 @'+nomeId(x)).join('\n')}\n\n📅 Desde: ${fmtData(f.data)}\n⏳ Há ${diffTexto(f.data)}`,mentions:f.membros},{quoted:msg});
  }
  if (command === 'familias') {
    const fsList=Object.values(db.familias).filter(x=>x.grupo===from); if(!fsList.length) return sock.sendMessage(from,{text:'👨‍👩‍👧‍👦 Ainda não há famílias registradas neste grupo.'},{quoted:msg});
    return sock.sendMessage(from,{text:`👨‍👩‍👧‍👦 *FAMÍLIAS DO GRUPO*\n\n${fsList.map((f,i)=>`${i+1}. ${f.membros.map(x=>'@'+nomeId(x)).join(', ')}\n   📅 ${fmtData(f.data)} • ⏳ ${diffTexto(f.data)}`).join('\n\n')}`,mentions:fsList.flatMap(f=>f.membros)},{quoted:msg});
  }
  if (command === 'casamento') {
    if(!alvo || alvo===id) return sock.sendMessage(from,{text:`💍 Marque a pessoa com quem deseja se casar.`},{quoted:msg});
    const a=[id,alvo].sort(); const chave=a.join('|'); const data=dataEntrada(args.filter(x=>!x.startsWith('@')))||new Date();
    db.casamentos[chave] ||= {a:a[0],b:a[1],dataInicio:data.getTime(),grupo:from};
    if (db.casamentos[chave].grupo!==from) db.casamentos[chave].grupo=from;
    salvar(db);
    const c=db.casamentos[chave];
    return sock.sendMessage(from,{text:`💒 *CERIMÔNIA DE CASAMENTO* 💒\n\n👰 @${nomeId(c.a)}\n🤵 @${nomeId(c.b)}\n\n🔔 Eu, ${config.BOT_NAME}, declaro aberta a cerimônia!\n\n💍 Vocês aceitam permanecer juntos e cuidar um do outro?\n❤️ O casamento foi registrado!\n\n📅 Data do casamento: *${fmtData(c.dataInicio)}*\n⏳ Tempo de casamento: *${diffTexto(c.dataInicio)}*\n\n🎉 Felicidades ao casal!`,mentions:[c.a,c.b]},{quoted:msg});
  }
  if (command === 'meucasal') {
    const c=Object.values(db.casamentos).find(x=>x.grupo===from && (x.a===id||x.b===id)); if(!c) return sock.sendMessage(from,{text:'💔 Você não possui casamento registrado neste grupo.'},{quoted:msg});
    const parceiro=c.a===id?c.b:c.a; return sock.sendMessage(from,{text:`💍 *SEU CASAMENTO*\n\n❤️ Você: @${nomeId(id)}\n💞 Parceiro(a): @${nomeId(parceiro)}\n📅 Desde: ${fmtData(c.dataInicio)}\n⏳ ${diffTexto(c.dataInicio)}`,mentions:[id,parceiro]},{quoted:msg});
  }
  if (command === 'divorcio') {
    const c=Object.values(db.casamentos).find(x=>x.grupo===from && (x.a===id||x.b===id));
    if(!c) return sock.sendMessage(from,{text:'💔 Não encontrei um casamento seu registrado neste grupo.'},{quoted:msg});
    const parceiro=c.a===id?c.b:c.a;
    if(alvo && alvo!==parceiro) return sock.sendMessage(from,{text:`❌ Você está casado(a) com @${nomeId(parceiro)}, não com @${nomeId(alvo)}.`,mentions:[parceiro,alvo]},{quoted:msg});
    delete db.casamentos[[c.a,c.b].sort().join('|')]; salvar(db);
    return sock.sendMessage(from,{text:`💔 *DIVÓRCIO REGISTRADO*\n\n@${nomeId(id)} e @${nomeId(parceiro)} não estão mais casados.\n📅 Casamento encerrado em ${fmtDataHora(Date.now())}.\n⏳ Duração: ${diffTexto(c.dataInicio)}\n\n🤖 ${config.BOT_NAME}: a certidão foi atualizada.`,mentions:[id,parceiro]},{quoted:msg});
  }
}

async function cmdRank(sock,msg,command) {
  const from=msg.key.remoteJid; const db=loadDB(); const arr=Object.entries(db).map(([id,u])=>({id,ouro:Number(u.ouro)||0,xp:Number(u.xp)||0,nivel:Number(u.nivel)||1}));
  const field=command==='topgold'?'ouro':'xp'; arr.sort((a,b)=>b[field]-a[field]); const top=arr.slice(0,10);
  return sock.sendMessage(from,{text:`🏆 *${command==='topgold'?'TOP GOLD':'TOP XP'}*\n\n${top.map((x,i)=>`${i+1}º @${nomeId(x.id)} — ${x[field]} ${field==='ouro'?'🪙':'⭐'}`).join('\n')||'Nenhum dado.'}`,mentions:top.map(x=>x.id)},{quoted:msg});
}

async function cmdPresentes(sock,msg,args) {
  const from=msg.key.remoteJid,id=remetente(msg),alvo=mencionado(msg); if(!alvo) return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}presente @pessoa <nome do presente>`},{quoted:msg});
  const nome=args.filter(x=>!x.startsWith('@')).join(' ')||'Presente misterioso'; const custo=50; const {u}=obterUsuarioGold(id); if(u.ouro<custo) return sock.sendMessage(from,{text:`💸 Você precisa de ${custo} Gold para enviar um presente.`},{quoted:msg}); removeGold(id,custo); const db=ler(); db.inventarios ||= {}; db.inventarios[alvo] ||= []; db.inventarios[alvo].push(`${nome} — recebido de @${nomeId(id)} em ${fmtDataHora(Date.now())}`); salvar(db);
  return sock.sendMessage(from,{text:`🎁 *PRESENTE ENVIADO!*\n\n@${nomeId(id)} enviou *${nome}* para @${nomeId(alvo)}. 💖\n🪙 Custo: ${custo} Gold`,mentions:[id,alvo]},{quoted:msg});
}

async function cmdMissoes(sock,msg,command) {
  const from=msg.key.remoteJid,id=remetente(msg),db=ler(); db.missoes ||= {}; db.missoes[id] ||= {data:hoje(),progresso:0,concluidas:[]}; const m=db.missoes[id]; if(m.data!==hoje()){m.data=hoje();m.progresso=0;m.concluidas=[];salvar(db);}
  const lista=[['Enviar 10 mensagens',10,100],['Enviar 30 mensagens',30,250],['Participar de uma brincadeira',1,150]];
  if(command==='missoes') return sock.sendMessage(from,{text:`🎯 *MISSÕES DE HOJE*\n\n${lista.map((x,i)=>`${i+1}. ${x[0]} — +${x[2]} Gold\n   Progresso: ${Math.min(m.progresso,x[1])}/${x[1]}`).join('\n\n')}`},{quoted:msg});
  if(command==='missao') return sock.sendMessage(from,{text:`🎯 Seu progresso hoje: *${m.progresso} mensagens*\n🪙 Recompensas disponíveis conforme as metas forem atingidas.`},{quoted:msg});
}

async function cmdPunição(sock,msg,command,args) {
  const from=msg.key.remoteJid,id=remetente(msg),alvo=mencionado(msg); if(!from?.endsWith('@g.us')) return;
  if(!(await isAdmin(sock,from,id).catch(()=>false))) return sock.sendMessage(from,{text:'🚫 Apenas administradores podem usar esse comando.'},{quoted:msg});
  if(!alvo) return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}${command} @pessoa`},{quoted:msg});
  const meta=await sock.groupMetadata(from); const p=meta.participants.find(x=>x.id===alvo||x.lid===alvo); if(p?.admin) return sock.sendMessage(from,{text:'❌ Não vou aplicar punição a outro administrador.'},{quoted:msg});
  const db=ler(); db.warns ||= {}; db.warns[from] ||= {}; db.warns[from][alvo] ||= 0;
  if(command==='unwarn'){db.warns[from][alvo]=Math.max(0,db.warns[from][alvo]-1);salvar(db);return sock.sendMessage(from,{text:`✅ Advertência removida de @${nomeId(alvo)}.\n⚠️ Total atual: ${db.warns[from][alvo]}`,mentions:[alvo]},{quoted:msg});}
  db.warns[from][alvo]++; const n=db.warns[from][alvo]; salvar(db);
  if(n>=3){
    const botAdm=await isBotAdmin(sock,from).catch(()=>false); if(!botAdm) return sock.sendMessage(from,{text:`🚨 @${nomeId(alvo)} chegou à 3ª advertência, mas não fui ADM para remover.`,mentions:[alvo]},{quoted:msg});
    try { await sock.groupParticipantsUpdate(from,[alvo],'remove'); } catch { return sock.sendMessage(from,{text:`🚨 3ª advertência para @${nomeId(alvo)}, mas o WhatsApp não permitiu a remoção.`,mentions:[alvo]},{quoted:msg}); }
    return sock.sendMessage(from,{text:`🚨 *3ª ADVERTÊNCIA!*\n\n@${nomeId(alvo)} conseguiu a façanha de colecionar 3 warns. 😂\n👢 ${config.BOT_NAME} encerrou a participação no grupo.\n\n🚫 Usuário removido automaticamente.`,mentions:[alvo]},{quoted:msg});
  }
  return sock.sendMessage(from,{text:`⚠️ *ADVERTÊNCIA ${n}/3*\n\n@${nomeId(alvo)}, você recebeu uma advertência.\n${n===2?'🚨 Mais uma e a próxima vira remoção automática.':''}`,mentions:[alvo]},{quoted:msg});
}

async function cmdAutoban(sock,msg,args) {
  const from=msg.key.remoteJid,id=remetente(msg); if(!from?.endsWith('@g.us')) return;
  if(!(await isAdmin(sock,from,id).catch(()=>false))) return sock.sendMessage(from,{text:'🚫 Apenas administradores podem configurar o AutoBan.'},{quoted:msg});
  const db=ler(); db.autoban ||= {}; if(!args[0]) return sock.sendMessage(from,{text:`🛡️ *AUTOBAN*\n\nEstado: ${db.autoban[from]?'🟢 ATIVADO':'🔴 DESATIVADO'}\n\nUse ${config.PREFIX}autoban 1 ou ${config.PREFIX}autoban 0`},{quoted:msg});
  db.autoban[from]=['1','on','ativar'].includes(String(args[0]).toLowerCase()); salvar(db);
  return sock.sendMessage(from,{text:`🛡️ AutoBan ${db.autoban[from]?'🟢 ATIVADO':'🔴 DESATIVADO'}\n
${db.autoban[from]?'Números que não começarem com 55 serão removidos automaticamente quando eu tiver ADM.':'A entrada automática por número estrangeiro foi desativada.'}`},{quoted:msg});
}

async function processarEntradaAutoban(sock, evento) {
  const { id:from, participants=[], action } = evento || {}; if(action!=='add' || !from) return;
  const db=ler(); if(!db.autoban?.[from]) return;
  const botAdm=await isBotAdmin(sock,from).catch(()=>false); if(!botAdm) return;
  let meta=null; try{meta=await sock.groupMetadata(from);}catch{}
  for(const p of participants){
    const info=meta?.participants?.find(x=>x.id===p||x.lid===p||x.jid===p);
    const telefone=String(info?.id || info?.jid || p).split('@')[0];
    const numero=telefone.replace(/[^0-9]/g,'');
    if(!numero || numero.startsWith('55')) continue;
    try { await sock.groupParticipantsUpdate(from,[p],'remove'); await sock.sendMessage(from,{text:`🛡️ *AUTOBAN ATIVADO*\n\n👤 @${nomeId(p)} entrou com número fora do padrão brasileiro.\n\n🚫 ${config.BOT_NAME} não deixou passar. Até a próxima! 😏\n🌎 Número detectado: +${numero}`,mentions:[p]}); } catch(e){ console.error('AutoBan:',e.message); }
  }
}

function normalizarNome(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
async function cmdMediaFire(sock,msg,args){
  const from=msg.key.remoteJid, db=lerMediaFire();
  if(!args.length){const itens=Object.entries(db).sort((a,b)=>Number(a[0])-Number(b[0]));return sock.sendMessage(from,{text:`📦 *MEDIAFIRE — ESCOLHA O DOWNLOAD*\n\n${itens.map(([n,x])=>`${n}️⃣ ${x.nome}`).join('\n')}\n\nDigite ${config.PREFIX}mediafire <nome ou número>`},{quoted:msg});}
  const busca=normalizarNome(args.join(' ')); const item=Object.entries(db).find(([n,x])=>n===busca || normalizarNome(x.nome)===busca || normalizarNome(x.nome).includes(busca));
  if(!item) return sock.sendMessage(from,{text:'❌ Aplicativo não encontrado. Use o comando sem nome para ver os 16 disponíveis.'},{quoted:msg});
  const [num,x]=item; if(!x.link) return sock.sendMessage(from,{text:`⚠️ *${x.nome}* ainda não possui um link MediaFire cadastrado.\n\nEdite: database/mediafire.json`},{quoted:msg});
  try{
    await sock.sendMessage(from,{text:`📥 Baixando *${x.nome}* pelo MediaFire... ⏳`},{quoted:msg});
    const page=await axios.get(x.link,{timeout:30000,headers:{'User-Agent':'Mozilla/5.0'}}); const html=String(page.data);
    const matches=[...html.matchAll(/href=["']([^"']+)["'][^>]*>(?:\s*<[^>]+>)*\s*Download/ig)].map(m=>m[1]);
    let direct=matches.find(u=>/mediafireusercontent|download/i.test(u));
    if(!direct){ const m=html.match(/https?:\/\/[^"'\\s]+(?:mediafireusercontent|download)[^"'\\s]*/i); direct=m?.[0]; }
    if(direct && direct.startsWith('//')) direct='https:'+direct;
    if(!direct) throw new Error('link direto não encontrado');
    const arq=await axios.get(direct,{responseType:'arraybuffer',timeout:120000,headers:{'User-Agent':'Mozilla/5.0'}}); const ct=arq.headers['content-type']||'application/octet-stream';
    return sock.sendMessage(from,{document:Buffer.from(arq.data),mimetype:ct,fileName:x.nome.replace(/[^a-z0-9_-]+/ig,'_')+'.bin',caption:`✅ *${x.nome}* baixado do MediaFire.`},{quoted:msg});
  }catch(e){return sock.sendMessage(from,{text:`❌ Não consegui baixar *${x.nome}* automaticamente.\n\n🔗 Link cadastrado:\n${x.link}\n\nO MediaFire pode ter exigido uma página/intersticial diferente.`},{quoted:msg});}
}

async function cmdConfigAvancada(sock,msg,args){
  const from=msg.key.remoteJid,id=remetente(msg); if(!(await isAdmin(sock,from,id).catch(()=>false))) return sock.sendMessage(from,{text:'🚫 Apenas administradores podem configurar.'},{quoted:msg});
  const db=ler(); db.config ||= {};
  if(args[0]==='aniversario'){ const texto=args.slice(1).join(' '); if(!texto) return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}configaniversario <mensagem>\nUse {meses}, {bot}, @A e @B como marcadores.`},{quoted:msg}); db.config.mensagemAniversario=texto; salvar(db); return sock.sendMessage(from,{text:'✅ Mensagem de aniversário de casamento salva.'},{quoted:msg}); }
  if(args[0]==='aniversario-reset'){delete db.config.mensagemAniversario;salvar(db);return sock.sendMessage(from,{text:'✅ Mensagem padrão restaurada.'},{quoted:msg});}
  return sock.sendMessage(from,{text:`⚙️ *CONFIGURAÇÃO AVANÇADA*\n\n${config.PREFIX}configaniversario <mensagem>\n${config.PREFIX}configaniversario-reset`},{quoted:msg});
}

async function cmdBackup(sock,msg){
  const from=msg.key.remoteJid,id=remetente(msg); if(!(await isAdmin(sock,from,id).catch(()=>false))) return;
  garantir(); if(!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR,{recursive:true}); const destino=path.join(BACKUP_DIR,'backup-'+Date.now()); fs.mkdirSync(destino); for(const f of ['usuarios.json','botconfig.json','grupos.json','recursos-avancados.json','mediafire.json']){const p=path.join(DB_DIR,f);if(fs.existsSync(p))fs.copyFileSync(p,path.join(destino,f));} return sock.sendMessage(from,{text:`💾 *BACKUP CONCLUÍDO*\n\n📁 ${destino}`},{quoted:msg});
}

async function cmdMaintenance(sock,msg,args){
  const from=msg.key.remoteJid,id=remetente(msg); if(!(await isAdmin(sock,from,id).catch(()=>false))) return;
  const db=ler(); db.manutencao ||= {}; if(!args[0]) return sock.sendMessage(from,{text:`🔧 Manutenção: ${db.manutencao[from]?'🟢 ATIVADA':'🔴 DESATIVADA'}`},{quoted:msg}); db.manutencao[from]=['1','on','ativar'].includes(String(args[0]).toLowerCase()); salvar(db); return sock.sendMessage(from,{text:`🔧 Modo manutenção ${db.manutencao[from]?'🟢 ATIVADO':'🔴 DESATIVADO'}.`},{quoted:msg});
}

async function cmdHistorico(sock,msg){
  const from=msg.key.remoteJid,id=remetente(msg),db=ler(); const itens=[]; for(const [g,w] of Object.entries(db.warns||{})) if(w[id]) itens.push(`⚠️ ${w[id]} warn(s) em ${g}`); const cas=Object.values(db.casamentos||{}).find(c=>c.a===id||c.b===id); if(cas) itens.push(`💍 Casamento desde ${fmtData(cas.dataInicio)}`); const fam=Object.values(db.familias||{}).find(f=>f.membros?.includes(id)); if(fam) itens.push(`👨‍👩‍👧‍👦 Família desde ${fmtData(fam.data)}`); return sock.sendMessage(from,{text:`📜 *HISTÓRICO DE @${nomeId(id)}*\n\n${itens.join('\n')||'Nenhum registro especial encontrado.'}`,mentions:[id]},{quoted:msg});
}

function extrairConteudoStatus(sm){
  const achados=[];
  const visitar=(v,prof=0)=>{ if(prof>5||v==null)return; if(typeof v==='string'){ if(v.length>2 && !/@[a-z0-9._-]+$/.test(v) && !/^[A-Za-z0-9+/=]{20,}$/.test(v)) achados.push(v); return;} if(Array.isArray(v)){v.slice(0,20).forEach(x=>visitar(x,prof+1));return;} if(typeof v==='object'){for(const [k,val] of Object.entries(v)){if(/text|caption|conversation|content/i.test(k)) visitar(val,prof+1); else if(prof<3) visitar(val,prof+1);}}};
  visitar(sm); return [...new Set(achados)].slice(0,3).join(' | ');
}

async function processarStatusMencionado(sock,msg){
  const sm=msg?.message?.groupStatusMentionMessage; if(!sm) return false;
  const grupo=sm.groupJid || sm.groupJidAlt || sm.jid || sm.groupId || sm.groupStatusMentionMessage?.groupJid; if(!grupo?.endsWith?.('@g.us')) return false;
  const db=ler(); let grupoDb={}; try { grupoDb=require('../grupo-db/grupo-db').getDB(); } catch {} if(db.mencaoStatusGlobal===false || grupoDb[grupo]?.mencaoStatus !== true) return false;
  const autor=msg.key.participantAlt || msg.key.participant || msg.key.remoteJid; if(!autor) return false;
  let meta; try{meta=await sock.groupMetadata(grupo);}catch{return false;}
  const membro=meta.participants.find(p=>p.id===autor||p.lid===autor||p.jid===autor); if(!membro) return false;
  const botAdm=await isBotAdmin(sock,grupo).catch(()=>false);
  const nomeGrupo=meta.subject||'grupo';
  const conteudo=extrairConteudoStatus(sm);
  let texto=`🚨 *MARCAÇÃO DE GRUPO DETECTADA* 🚨\n\n👤 @${nomeId(autor)} acabou de marcar o grupo *${nomeGrupo}* no Status.\n\n📢 A ${config.BOT_NAME} identificou a marcação.\n\n`;
  texto+=`📜 *Registro da ocorrência:*\n• Autor: @${nomeId(autor)}\n• Grupo: ${nomeGrupo}\n• Horário: ${fmtDataHora(Date.now())}\n`; if(conteudo) texto+=`• Conteúdo detectado: ${conteudo}\n`;
  if(botAdm){try{await sock.groupParticipantsUpdate(grupo,[autor],'remove');texto+=`\n🛡️ Como sou administrador, @${nomeId(autor)} foi removido do grupo.\n😏 ${config.BOT_NAME} não deixou a marcação passar.`; }catch{texto+=`\n⚠️ Detectei a marcação, mas o WhatsApp não permitiu a remoção.`;}}
  else texto+=`\n🔒 @${nomeId(autor)} não foi removido porque eu não sou administrador do grupo.`;
  await sock.sendMessage(grupo,{text:texto,mentions:[autor]});
  try{await sock.sendMessage('status@broadcast',{delete:msg.key});}catch{}
  return true;
}

async function processarManutencao(sock,msg,body){
  const from=msg.key.remoteJid; if(!from?.endsWith('@g.us')||!body?.startsWith(config.PREFIX)) return false; const db=ler(); if(!db.manutencao?.[from]) return false; const id=remetente(msg); if(await isAdmin(sock,from,id).catch(()=>false)) return false; return true;
}


async function cmdConquistas(sock,msg){
  const from=msg.key.remoteJid,id=remetente(msg),{u}=obterUsuarioGold(id),db=ler(); const c=[];
  if((u.nivel||1)>=5)c.push('🏆 Nível 5'); if((u.ouro||0)>=1000)c.push('🪙 Cofre de 1.000 Gold'); if(Object.values(db.casamentos||{}).some(x=>x.a===id||x.b===id))c.push('💍 Casado(a)'); if(Object.values(db.familias||{}).some(x=>x.membros?.includes(id)))c.push('👨‍👩‍👧‍👦 Família registrada'); if(Object.values(db.amizades||{}).some(x=>x.a===id||x.b===id))c.push('🤝 Primeira amizade');
  return sock.sendMessage(from,{text:`🏅 *CONQUISTAS DE @${nomeId(id)}*\n\n${c.length?c.join('\n'):'Ainda não há conquistas desbloqueadas. Continue participando! 🚀'}`,mentions:[id]},{quoted:msg});
}

async function cmdBotStatus(sock,msg){
  const from=msg.key.remoteJid,db=ler(), mem=process.memoryUsage(); return sock.sendMessage(from,{text:`🤖 *STATUS DO ${config.BOT_NAME.toUpperCase()}*\n\n🟢 Processo: ONLINE\n🧠 Memória: ${(mem.rss/1024/1024).toFixed(1)} MB\n👥 Grupos em cache: ${Object.keys(db.manutencao||{}).length || 'vários'}\n🛡️ Recursos avançados: ATIVOS\n📅 ${fmtDataHora(Date.now())}`},{quoted:msg});
}

async function cmdBroadcast(sock,msg,args){
  const from=msg.key.remoteJid,id=remetente(msg); const numeros=String(id||'').split('@')[0]; if(numeros!==String(config.OWNER_NUMBER).replace(/\D/g,'')) return sock.sendMessage(from,{text:'🚫 Apenas o dono do bot pode usar broadcast.'},{quoted:msg}); const texto=args.join(' ').trim(); if(!texto)return sock.sendMessage(from,{text:`Uso: ${config.PREFIX}broadcast sua mensagem`},{quoted:msg}); const db=ler(); let grupos=new Set(Object.keys(db).filter(x=>x.endsWith('@g.us'))); try { const {getDB}=require('../grupo-db/grupo-db'); grupos=new Set([...grupos,...Object.keys(getDB()).filter(x=>x.endsWith('@g.us'))]); } catch {} let ok=0; for(const g of grupos){try{await sock.sendMessage(g,{text:`📢 *COMUNICADO DO ${config.BOT_NAME}*\n\n${texto}`});ok++;}catch{}} return sock.sendMessage(from,{text:`📢 Broadcast concluído. Enviado para ${ok} grupo(s).`},{quoted:msg});
}

module.exports={processarPrimeiraMensagem,verificarAniversarios,cmdEconomia,cmdSocial,cmdRank,cmdPresentes,cmdMissoes,cmdPunição,cmdAutoban,processarEntradaAutoban,cmdMediaFire,cmdConfigAvancada,cmdBackup,cmdMaintenance,cmdHistorico,processarStatusMencionado,processarManutencao,lerMediaFire,salvarMediaFire,APPS_PADRAO,cmdEnquete,cmdBanco,cmdInventario,cmdTopSocial,cmdXpNivel,cmdBonus,processarMute,cmdMute,cmdConquistas,cmdBotStatus,cmdBroadcast};
