// ================================================================
// MENU INTERATIVO MIKASA — Native Flow / Quick Reply
// Compatível com @whiskeysockets/baileys 7.0.0-rc.9+
// Não usa API externa. O clique volta como mensagem interativa.
// ================================================================
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const { resolverCaminhoSalvo } = require('../caminhos/caminhos');

const baileys = require('@whiskeysockets/baileys');
const {
  generateWAMessageFromContent,
  normalizeMessageContent,
  prepareWAMessageMedia,
  isJidGroup,
  generateMessageIDV2,
  generateMessageID,
} = baileys;

function botao(displayText, id) {
  return {
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({ display_text: displayText, id })
  };
}

function botaoUrl(displayText, url) {
  return {
    name: 'cta_url',
    buttonParamsJson: JSON.stringify({ display_text: displayText, url })
  };
}

function getButtonNode(message) {
  const nativeFlow = message?.interactiveMessage?.nativeFlowMessage;
  const firstName = nativeFlow?.buttons?.[0]?.name;

  if (nativeFlow && (firstName === 'review_and_pay' || firstName === 'payment_info')) {
    return {
      tag: 'biz',
      attrs: { native_flow_name: firstName === 'review_and_pay' ? 'order_details' : firstName }
    };
  }

  if (nativeFlow) {
    return {
      tag: 'biz',
      attrs: {},
      content: [{
        tag: 'interactive',
        attrs: { type: 'native_flow', v: '1' },
        content: [{
          tag: 'native_flow',
          attrs: { v: '9', name: 'mixed' }
        }]
      }]
    };
  }

  return null;
}

function patchInteractiveMessage(message) {
  // Mantém a mensagem interativa dentro do wrapper aceito pelo WhatsApp
  // em clientes que exigem o formato MD patch.
  if (!message || message.documentWithCaptionMessage?.message) return message;
  if (message.interactiveMessage) {
    return { documentWithCaptionMessage: { message } };
  }
  return message;
}

async function enviarNativeFlow(sock, jid, { text, footer, buttons, imageBuffer, videoBuffer, gifPlayback = false, quoted, mentions, messageParamsJson = '' }) {
  if (typeof generateWAMessageFromContent !== 'function' || typeof sock.relayMessage !== 'function') {
    throw new Error('Baileys não expôs generateWAMessageFromContent/relayMessage.');
  }

  const nativeButtons = buttons.map(b => ({
    name: b.name,
    buttonParamsJson: b.buttonParamsJson
  }));

  const interactive = {
    body: { text },
    footer: { text: footer || config.BOT_NAME || 'Mikasa Bot' },
    nativeFlowMessage: {
      buttons: nativeButtons,
      messageParamsJson: messageParamsJson || ''
    },
    ...(Array.isArray(mentions) && mentions.length ? { contextInfo: { mentionedJid: mentions } } : {})
  };

  if ((imageBuffer || videoBuffer) && typeof prepareWAMessageMedia === 'function') {
    const media = await prepareWAMessageMedia(
      videoBuffer ? { video: videoBuffer, gifPlayback } : { image: imageBuffer },
      { upload: sock.waUploadToServer }
    );
    interactive.header = {
      title: config.BOT_NAME || 'Mikasa Bot',
      hasMediaAttachment: true,
      ...media
    };
  } else {
    interactive.header = {
      title: config.BOT_NAME || 'Mikasa Bot',
      hasMediaAttachment: false
    };
  }

  const content = {
    interactiveMessage: interactive
  };

  const userJid = sock.authState?.creds?.me?.id || sock.user?.id;
  const makeId = generateMessageIDV2 || generateMessageID;
  const messageId = typeof makeId === 'function'
    ? makeId(userJid)
    : undefined;

  const generated = generateWAMessageFromContent(jid, content, {
    logger: sock.logger,
    userJid,
    messageId,
    timestamp: new Date(),
    quoted
  });

  const normalized = typeof normalizeMessageContent === 'function'
    ? normalizeMessageContent(generated.message)
    : generated.message;

  const buttonNode = getButtonNode(normalized);
  const additionalNodes = [];
  if (buttonNode) additionalNodes.push(buttonNode);

  // Conversas privadas precisam do nó bot/biz_bot para o fluxo interativo.
  if (typeof isJidGroup === 'function' ? !isJidGroup(jid) : !String(jid).endsWith('@g.us')) {
    additionalNodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
  }

  generated.message = patchInteractiveMessage(generated.message);

  await sock.relayMessage(jid, generated.message, {
    messageId: generated.key.id,
    additionalNodes
  });

  return generated;
}

// ================================================================
// 🧭 MENU HIERÁRQUICO — todos os comandos existentes, por categoria
// ================================================================
const INTERACTIVE_PENDING = new Map();
const COMMAND_CACHE = new Map();
const PAGE_SIZE = 10;

function getPendingKey(msg) {
  const jid = msg?.key?.remoteJid || '';
  const user = msg?.key?.participant || msg?.key?.participantAlt || jid;
  return `${jid}|${user}`;
}

function setInteractivePending(msg, data) {
  INTERACTIVE_PENDING.set(getPendingKey(msg), { ...data, at: Date.now() });
}

function getInteractivePending(msg) {
  const key = getPendingKey(msg);
  const item = INTERACTIVE_PENDING.get(key);
  if (!item) return null;
  if (Date.now() - item.at > 5 * 60 * 1000) {
    INTERACTIVE_PENDING.delete(key);
    return null;
  }
  return item;
}

function clearInteractivePending(msg) {
  INTERACTIVE_PENDING.delete(getPendingKey(msg));
}

function extrairComandosDoBot() {
  if (COMMAND_CACHE.has('all')) return COMMAND_CACHE.get('all');
  try {
    const arquivo = fs.readFileSync(path.join(__dirname, "../../mikasabot.js"), 'utf8');
    const encontrados = new Set();
    const re = /case\s+["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(arquivo))) {
      const cmd = String(m[1]).trim().toLowerCase();
      if (!cmd || cmd.startsWith('menu_') || ['menu','menubotoes','menudono','menuadm','menupremium','menugold','menumidias','menubrinquedos'].includes(cmd)) continue;
      if (/^[\p{L}0-9_-]+$/u.test(cmd)) encontrados.add(cmd);
    }
    const lista = [...encontrados];
    COMMAND_CACHE.set('all', lista);
    return lista;
  } catch (e) {
    console.error('⚠️ Não consegui montar a lista dinâmica de comandos:', e.message);
    return [];
  }
}

const CATEGORIAS = {
  '🎵 MÚSICAS': ['musica-aleatoria','play','dvcl-yt','video','tiktok','instagram','kwai','pinterest','mediafire','gtts','tomp3','voz','esquilo','grave','demonio','robo','eco','nightcore','rapido','lento','radio','s','attp','attp2','attp3','attp4','attp5','sf','addfigurinha','gif','toimg','artenome','artenomegif','meme'],
  '🛠️ FERRAMENTAS': ['calc','calculadora','base64','md5','hashmd5','spoiler','encurtar','encurtador','encurtarlink','qrcode','qr','qr-code','wiki','traduzir','tradutor','celular','tempo','esporte_noticias','me','tang','info','reagir','avalie','bug','sugestao','ping','meuid'],
  '👤 MEMBROS': ['alugarbot','meualuguel','membros','registrar','delregistro','perfil','inforegistrar','infoperfil','advertidos','mutados','infoadv','infomute','infobot','atividades','resumo','historico','conquistas','botstatus','top10','rankativo','rank'],
  '💰 ECONOMIA': ['saldo','moedas','checkin','checkinauto','trabalhar','roubar','transferir','depositar','sacar','extrato','inventario','bonus','premio','xp','nivel','loja','duelo','resgatar','token','gastar','topgold','topxp','topamizade','topcasais','casal','amizade','compatibilidade','dupla','familia','familias','casamento','meucasal','divorcio','presente','presentes','missoes','missao'],
  '🎮 BRINCADEIRAS': ['forca','adivinha','quiz','jogodavelha','aleatory','roleta','sortear','signo','enquete','tapa','matar','beijar','abracar','amizade','compatibilidade','dupla','casal','familia','familias','casamento','meucasal','divorcio','topcasais'],
  '🛡️ ADMIN': ['mute','unmute','warn','unwarn','autoban','marcar','hidetag','citar','regras','grupo','convite','promover','rebaixar','antilink','antinota','antiloc','antidoc','fixar','antinudes','antifake','ban','kick','abrir','fechar','aviso','bemvindo','sair','saudacao','antiamor','aceitar','mencao','adms','antipalavrao','dvcl-antipalavrao','dvcl-auto','dvcl1','dvcl0','lista','listra','blacklist','dvcl-lista','tirarlista','removerlista','delblacklist','add','mikasa-add','modulos','limparbot','logban','historico-ban','relatorio','relatoriodiario','manutencao'],
  '👑 DONO': ['ligar','desligar','restart','broadcast','boot','backup','configaniversario','configaniversario-reset','alugar']
};

const SUBCATEGORIAS = {
  '🛠️ FERRAMENTAS': {
    '⚙️ CONFIGURAÇÕES': ['configurar-bot','ativar','ia','inteligencia','x9','viewonce','vo','antinsfw','menudono','menuadm','menupremium','menugold','menumidias']
  }
};

function lerComandosValidos() {
  return new Set(extrairComandosDoBot());
}

function montarCategorias() {
  const todos = lerComandosValidos();
  const usados = new Set();
  const resultado = {};

  for (const [nome, lista] of Object.entries(CATEGORIAS)) {
    const presentes = [];
    for (const c of lista) {
      if (todos.has(c) && !usados.has(c)) {
        presentes.push(c);
        usados.add(c);
      }
    }
    if (presentes.length || SUBCATEGORIAS[nome]) resultado[nome] = presentes;
  }

  // Configurações ficam dentro de FERRAMENTAS, mas continuam protegidas
  // pelo mesmo roteador original.
  return resultado;
}

function montarSubcategorias(nome) {
  const todos = lerComandosValidos();
  const sub = SUBCATEGORIAS[nome] || {};
  const resultado = {};
  for (const [titulo, lista] of Object.entries(sub)) {
    resultado[titulo] = lista.filter(c => todos.has(c));
  }
  return resultado;
}

function lerBotConfigAtual() {
  try {
    const dbPath = path.join(__dirname, "../../database/botconfig.json");
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, 'utf8')) || {};
  } catch {
    return {};
  }
}

function fotoMenuBuffer() {
  const db = lerBotConfigAtual();
  const configurada = db.BOT_PHOTO ? resolverCaminhoSalvo(db.BOT_PHOTO) : null;
  const candidatos = [
    configurada,
    path.join(__dirname, "../midias/imagens/menu.png"),
    path.join(__dirname, "../midias/imagens/menu_backup.png"),
    path.join(__dirname, "../midias/imagens/fundo.png")
  ].filter(Boolean);
  for (const arquivo of candidatos) {
    try {
      if (fs.existsSync(arquivo)) return fs.readFileSync(arquivo);
    } catch {}
  }
  return null;
}

// Usa exatamente a mídia atualmente registrada no banco.
// Se for GIF/vídeo, o Native Flow recebe vídeo; se for imagem, recebe imagem.
function obterMidiaMenuAtual() {
  const db = lerBotConfigAtual();
  const caminho = db.BOT_PHOTO ? resolverCaminhoSalvo(db.BOT_PHOTO) : null;
  if (caminho && fs.existsSync(caminho)) {
    const dados = fs.readFileSync(caminho);
    const ehVideo = /\.(mp4|webm|mov|m4v)$/i.test(caminho) || db.BOT_PHOTO_GIF === true;
    return ehVideo
      ? { videoBuffer: dados, gifPlayback: db.BOT_PHOTO_GIF === true }
      : { imageBuffer: dados };
  }
  const imagem = fotoMenuBuffer();
  return imagem ? { imageBuffer: imagem } : {};
}

// 📰 No lugar da foto fixa do menu, gera um card de JORNAL na hora, só com dados
// do próprio bot/chat (nome, dono, prefixo, total de comandos e a foto do grupo).
async function obterMidiaMenuJornal(sock, jid) {
  try {
    const { criarCardMenuJornal } = require('../cardGenerator/cardGenerator');
    let fotoContextoBuffer = null;
    try {
      const { buscarFotoContexto } = require('../foto-contexto/foto-contexto');
      fotoContextoBuffer = await buscarFotoContexto(sock, jid);
    } catch {}
    const db = lerBotConfigAtual();
    const cats = montarCategorias();
    const total = Object.values(cats).reduce((n, lista) => n + lista.length, 0);
    let categorias = [];
    try {
      const mu = require('../menu-unico/menu-unico');
      categorias = Object.keys(cats).map(nome => ({ nome, qtd: (cats[nome] || []).length, cor: mu.temaDaCategoria(nome).cor }));
    } catch {}
    let arteBuffer = null;
    try { arteBuffer = require('../menu-unico/menu-unico').fotoDoBot(); } catch {}
    const imageBuffer = await criarCardMenuJornal({
      categorias,
      arteBuffer,
      botName: db.BOT_NAME || config.BOT_NAME || 'Mikasa Bot',
      ownerName: db.OWNER_NAME || config.OWNER_NAME || '',
      prefix: db.PREFIX || config.PREFIX || '/',
      totalComandos: total,
      fotoContextoBuffer
    });
    return { imageBuffer };
  } catch (e) {
    console.error('⚠️ Card jornal do menu falhou, enviando sem imagem:', e?.message || e);
    return {};
  }
}

function linhaLista(id, titulo, descricao = '') {
  return {
    id,
    title: String(titulo).slice(0, 24),
    description: String(descricao || '').slice(0, 72)
  };
}

function botaoLista(displayText, sections, id = 'lista_principal') {
  return {
    name: 'single_select',
    buttonParamsJson: JSON.stringify({
      title: displayText,
      sections
    })
  };
}

async function enviarListaWhatsApp(sock, jid, {
  text,
  title = '📋 LISTA',
  sections = [],
  footer,
  quoted,
  mentions,
  extraButtons = [],
  messageParamsJson = '',
  midia
} = {}) {
  const buttons = [botaoLista(title, sections), ...extraButtons];
  return enviarNativeFlow(sock, jid, {
    text: text || `〔 ${title} 〕`,
    footer: footer || config.BOT_NAME || 'Mikasa Bot',
    buttons,
    ...(midia || obterMidiaMenuAtual()),
    quoted,
    mentions,
    messageParamsJson
  });
}

// 📋 Só 1 botão "VER TUDO" na conversa; o resto abre na folha (igual ao /play).
function messageParamsVerTudo(totalBotoes, tituloLista = '🎶 OPÇÕES DO MENU') {
  const divisores = [];
  for (let i = 1; i < totalBotoes; i++) divisores.push(i);
  divisores.push(999);
  return JSON.stringify({
    bottom_sheet: {
      in_thread_buttons_limit: 1,
      divider_indices: divisores,
      list_title: tituloLista,
      button_title: '📋 VER TUDO'
    }
  });
}

function descricaoComando(command) {
  const mapa = {
    'musica-aleatoria': 'Escolha estilo e cantor sem repetir o que já foi baixado.',
    play: 'Pesquisar e baixar música ou vídeo.',
    video: 'Pesquisar e baixar vídeo.',
    gtts: 'Transformar texto em áudio.',
    s: 'Criar figurinha.',
    attp: 'Texto vira figurinha piscando (cores sorteadas).',
    attp2: 'Texto em figurinha arco-íris.',
    attp3: 'Texto em figurinha neon pulsante.',
    attp4: 'Texto em figurinha digitando.',
    attp5: 'Texto em figurinha onda.',
    sf: 'Figurinha sem fundo (apaga fundo preto/branco).',
    gif: 'Criar/enviar GIF.',
    calc: 'Fazer cálculos.',
    tempo: 'Consultar o clima.',
    ping: 'Verificar resposta do bot.',
    configurar: 'Abrir configuração do bot.'
  };
  return mapa[command] || `Executar ${config.PREFIX}${command}`;
}

async function enviarListaPrincipal(sock, jid, msg) {
  const cats = montarCategorias();
  const extras = [
    botao('BY : DOCTOR VALEYARD', 'zoar_dono'),
    botaoUrl('📢 ENTRAR NO CANAL', obterLinkCanalConfig() || config.CHANNEL_URL || ''),
    botaoUrl('💬 FALAR COM O CRIADOR', linkFalarComCriador() || ''),
    botao('🏘️ ALUGAR O BOT', 'vip_planos')
  ].filter(b => b.buttonParamsJson && !b.buttonParamsJson.includes('"url":""'));

  // 📋 LISTA DENTRO DE LISTA: o menu continua com UM botão (VER TUDO → PRINCIPAL, canal, criador...).
  // Ao abrir o PRINCIPAL, a lista já vem com UMA SEÇÃO PARA CADA CATEGORIA, com os comandos dentro
  // (e subgrupos como seções, ex.: Música / Vídeos / Figurinhas). Escolheu o comando, executa.
  if (config.MENU_LISTAS_SEPARADAS !== false) {
    try {
      const mu = require('../menu-unico/menu-unico');
      const { semEmoji } = require('../cards-novos/cards-novos');
      const restritas = ['🛡️ ADMIN', '👑 DONO'];
      // MODO "botoes" (padrão): dentro do VER TUDO, CADA CATEGORIA é um botão que abre a SUA lista
      // (lista dentro de lista, no mesmo nível do antigo PRINCIPAL). ADMIN e DONO dividem um botão.
      if ((config.MENU_MODO || 'secoes') === 'botoes') {
        const botoesCat = [];
        for (const nome of Object.keys(cats)) {
          if (restritas.includes(nome)) continue;
          const secs = mu.secoesDaCategoria(nome);
          if (secs.length) botoesCat.push(botaoLista(nome, secs));
        }
        const secsRestritas = [];
        for (const nome of restritas) {
          if (!cats[nome]) continue;
          const marca = nome.startsWith('🛡️') ? '🛡️' : '👑';
          for (const sc of mu.secoesDaCategoria(nome)) secsRestritas.push({ ...sc, title: `${marca} ${semEmoji(sc.title)}`.slice(0, 24) });
        }
        if (secsRestritas.length) botoesCat.push(botaoLista('🔒 ADMIN E DONO', secsRestritas));
        if (botoesCat.length) {
          const todos = [...botoesCat, ...extras];
          return enviarNativeFlow(sock, jid, {
            text: `〔 📋 MENU — ${config.BOT_NAME || 'MIKASA'} 〕\n\n✦ Toque em *VER TUDO*, escolha a categoria e depois o comando ✦`,
            footer: '👑 ᴅᴏᴄᴛᴏʀ ᴠᴀʟᴇʏᴀʀᴅ',
            quoted: msg,
            ...(await obterMidiaMenuJornal(sock, jid)),
            buttons: todos,
            messageParamsJson: messageParamsVerTudo(todos.length)
          });
        }
      }
      // MODO "secoes": um botão PRINCIPAL cuja lista traz uma seção por categoria
      const secoesTodas = [];
      for (const nome of Object.keys(cats)) {
        if (restritas.includes(nome)) continue;
        for (const sc of mu.secoesDaCategoria(nome)) secoesTodas.push(sc);
      }
      for (const nome of restritas) {
        if (!cats[nome]) continue;
        const marca = nome.startsWith('🛡️') ? '🛡️' : '👑';
        for (const sc of mu.secoesDaCategoria(nome)) secoesTodas.push({ ...sc, title: `${marca} ${semEmoji(sc.title)}`.slice(0, 24) });
      }
      // sem comando repetido na lista inteira (o mesmo comando em duas categorias) e descrições curtas, pra mensagem leve
      const vistos = new Set();
      for (const sc of secoesTodas) {
        sc.rows = sc.rows.filter(r => { if (vistos.has(r.id)) return false; vistos.add(r.id); return true; })
          .map(r => ({ ...r, description: String(r.description || '').slice(0, 48) }));
      }
      for (let k = secoesTodas.length - 1; k >= 0; k--) if (!secoesTodas[k].rows.length) secoesTodas.splice(k, 1);
      if (secoesTodas.length) {
        return enviarListaWhatsApp(sock, jid, {
          text: `〔 📋 PRINCIPAL — ${config.BOT_NAME || 'MIKASA'} 〕\n\n✦ Escolha o que você quer usar ✦`,
          title: '📋 PRINCIPAL',
          midia: await obterMidiaMenuJornal(sock, jid),
          sections: secoesTodas,
          footer: '👑 ᴅᴏᴄᴛᴏʀ ᴠᴀʟᴇʏᴀʀᴅ',
          quoted: msg,
          extraButtons: extras,
          messageParamsJson: messageParamsVerTudo(1 + extras.length)
        });
      }
    } catch (e) {
      console.error('⚠️ Menu com seções por categoria falhou, usando a lista de categorias:', e?.message || e);
    }
  }

  // (modo antigo) uma lista PRINCIPAL com as categorias
  const sections = [{
    title: 'CATEGORIAS',
    rows: Object.keys(cats).map(nome => linhaLista(`cat:${encodeURIComponent(nome)}`, nome,
      nome === '🛡️ ADMIN' ? 'Somente administradores.' :
      nome === '👑 DONO' ? 'Somente o dono do bot.' : 'Abrir opções relacionadas.'))
  }];
  return enviarListaWhatsApp(sock, jid, {
    text: `〔 📋 PRINCIPAL — ${config.BOT_NAME || 'MIKASA'} 〕\n\n✦ Escolha o que você quer usar ✦`,
    title: '📋 PRINCIPAL',
    midia: await obterMidiaMenuJornal(sock, jid),
    sections,
    footer: '👑 ᴅᴏᴄᴛᴏʀ ᴠᴀʟᴇʏᴀʀᴅ',
    quoted: msg,
    extraButtons: extras,
    messageParamsJson: messageParamsVerTudo(1 + extras.length)
  });
}

// 📋 Categoria = UM botão só ("VER TUDO") + card do tema (ver menu-unico).
async function enviarListaCategoria(sock, jid, msg, nome, comandos) {
  return require('../menu-unico/menu-unico').abrirCategoria(sock, jid, msg, nome, comandos);
}

async function enviarListaSubcategoria(sock, jid, msg, titulo, comandos) {
  const rows = comandos.map(c => linhaLista(`cmd:${c}`, `${config.PREFIX}${c}`, descricaoComando(c)));
  return enviarListaWhatsApp(sock, jid, {
    text: `〔 ${titulo} 〕\n\nEscolha uma configuração:`,
    title: titulo,
    sections: [{ title: titulo, rows }],
    quoted: msg,
    extraButtons: [
      botaoUrl('📢 ENTRAR NO CANAL', obterLinkCanalConfig() || config.CHANNEL_URL || ''),
      botaoUrl('💬 FALAR COM O CRIADOR', linkFalarComCriador() || '')
    ].filter(b => b.buttonParamsJson && !b.buttonParamsJson.includes('"url":""'))
  });
}

function comandoPrecisaEntrada(command) {
  const c = command.toLowerCase();
  return new Set([
    'play','musica','dvcl-yt','video','baixarvideo','tiktok','instagram','kwai','pinterest','mediafire','media-fire',
    'gtts','tomp3','artenome','artenomegif','meme','signo','tempo','celular','wiki','traduzir','tradutor',
    'calc','calculadora','base64','md5','hashmd5','spoiler','encurtar','encurtador','encurtarlink','qrcode','qr','qr-code',
    'roubar','transferir','depositar','sacar','presente','resgatar','token','gastar','warn','unwarn','mute','unmute',
    'autoban','configaniversario','manutencao','broadcast','spam','add','dvcl-prt','dvcl-ptr','caca','caça','tang',
    'quando','chance','vab','adivinharnmr','configurar-bot','matar','tapa','beijar','abracar','chute'
  ]).has(c);
}

function textoPrompt(command) {
  const c = command.toLowerCase();
  if (['matar','tapa','beijar','abracar','chute'].includes(c)) return `👤 Marque ou responda à mensagem da pessoa para usar *${c}*.`;
  if (['play','musica'].includes(c)) return '🎵 Qual música você deseja baixar?\n\nDigite somente o nome da música.';
  if (['video','baixarvideo'].includes(c)) return '🎬 Qual vídeo você deseja baixar?\n\nDigite o nome ou envie o link.';
  if (['tiktok','instagram','kwai','pinterest','mediafire','media-fire'].includes(c)) return `🔗 Envie o link para *${c}*.`;
  if (c === 'configurar-bot') return '⚙️ Envie a configuração que deseja alterar. Ex.: *prefixo !*';
  return `✍️ Envie agora os dados necessários para *${c}*.`;
}

async function enviarPaginaCategoria(sock, jid, msg, nome, comandos, pagina = 0) {
  return enviarListaCategoria(sock, jid, msg, nome);
}

// 🏠 MENU INICIAL — somente os 4 acessos principais.
// A lógica dos menus internos, categorias e loja permanece intacta.
function botaoMenuInicial(rotulo, id) {
  // Espaçamento fixo para manter o padrão visual das caixinhas mesmo
  // quando o nome do botão possui poucos caracteres.
  const espaco = '\u3000';
  const nomes = {
    principal: '『 ✦ 』 PRINCIPAL 『 ✦ 』',
    lista:     '『 ✦ 』 LISTA 『 ✦ 』',
    canal:     '『 ✦ 』 CANAL 『 ✦ 』',
    criador:   '『 ✦ 』 CRIADOR 『 ✦ 』'
  };
  return botao(nomes[rotulo] || rotulo, id);
}

// MENU DIRETO: UMA mensagem só. O botão "ABRIR MENU" já abre a lista com todas as
// categorias e os comandos de cada uma — tocou no comando, executa. Antes, tocar numa
// categoria mandava OUTRA mensagem com outro botão pra abrir a lista.
// Se a categoria tiver mais comandos que o limite, a última linha "Ver todos" abre
// a lista completa dela. ADMIN e DONO ficam numa área à parte (a permissão é checada).
const MAX_COMANDOS_POR_CATEGORIA = 12;

function montarSecoesDoMenuDireto() {
  const cats = montarCategorias();
  const restritas = ['🛡️ ADMIN', '👑 DONO'];
  const sections = [];

  for (const nome of Object.keys(cats)) {
    if (restritas.includes(nome)) continue;
    const comandos = (cats[nome] || []).filter(c => !(nome === '🛠️ FERRAMENTAS' && c === 'configurar-bot'));
    const rows = [];
    if (nome === '🛠️ FERRAMENTAS') {
      rows.push(linhaLista('cmd:configurar-bot', '⚙️ CONFIGURAÇÕES', 'Abrir o painel de configuração do bot.'));
    }
    for (const c of comandos) {
      rows.push(linhaLista(`cmd:${c}`, `${config.PREFIX}${c}`, descricaoComando(c)));
    }
    // tudo dentro da própria lista: seções de até 10 (nada de "ver todos" abrindo outra mensagem com outro botão)
    const paginas = Math.ceil(rows.length / 10);
    for (let k = 0; k < paginas; k++) {
      const titulo = paginas > 1 ? `${nome} ${k + 1}/${paginas}` : nome;
      sections.push({ title: titulo.slice(0, 24), rows: rows.slice(k * 10, k * 10 + 10) });
    }
  }

  // 🏘️ aluguel direto no menu: tocou no plano, gera o Pix
  try {
    const vip = require('../aluguel-planos/aluguel-planos');
    const planos = vip.listarPlanos();
    if (planos.length) {
      sections.push({
        title: '🏘️ ALUGAR O BOT',
        rows: planos.map(p => {
          const grupos = vip.limiteGruposPorDias(p.dias);
          const txt = grupos > 0 ? `${grupos} grupo${grupos > 1 ? 's' : ''}` : 'só no PV (teste)';
          return linhaLista(`vip_plano:${p.dias}`, `🏘️ ${p.dias} dias — R$ ${p.valor}`, `Aluguel por ${p.dias} dias • ${txt}`);
        })
      });
    }
  } catch {}

  const rowsRestritas = restritas.filter(n => cats[n]).map(n =>
    linhaLista(`cat:${encodeURIComponent(n)}`, n, n === '👑 DONO' ? 'Somente o dono do bot.' : 'Somente administradores.'));
  if (rowsRestritas.length) sections.push({ title: '🔒 ÁREAS RESTRITAS', rows: rowsRestritas });

  return sections;
}

async function enviarMenuCategoriasDireto(sock, jid, msg) {
  const canal = obterLinkCanalConfig();
  const linkCriador = linkFalarComCriador();

  const botoes = [botaoLista('📋 ABRIR MENU', montarSecoesDoMenuDireto())];
  botoes.push(botao('BY : DOCTOR VALEYARD', 'zoar_dono'));
  if (canal) botoes.push(botaoUrl('📢 ENTRAR NO CANAL', canal));
  if (linkCriador) botoes.push(botaoUrl('💬 FALAR COM O CRIADOR', linkCriador));

  return enviarNativeFlow(sock, jid, {
    text: `『 ✦ 』 ${config.BOT_NAME || 'Mikasa Bot'} 『 ✦ 』\n\nToque em *ABRIR MENU* e escolha direto o comando:`,
    footer: '👑 ᴅᴏᴄᴛᴏʀ ᴠᴀʟᴇʏᴀʀᴅ',
    quoted: msg,
    ...(await obterMidiaMenuJornal(sock, jid)),
    buttons: botoes,
    messageParamsJson: messageParamsVerTudo(botoes.length)
  });
}

async function sendMenuBotoes(sock, jid, msg) {
  // As categorias que antes ficavam atrás de PRINCIPAL agora aparecem
  // diretamente no primeiro menu. Os callbacks continuam sendo os mesmos.
  return enviarListaPrincipal(sock, jid, msg);
}

async function sendMenuLista(sock, jid, msg) {
  return enviarListaPrincipal(sock, jid, msg);
}

async function enviarListaTexto(sock, jid, msg, nome = null) {
  const cats = montarCategorias();
  const blocos = [];
  const entradas = nome && cats[nome] ? [[nome, cats[nome]]] : Object.entries(cats);
  for (const [titulo, lista] of entradas) {
    blocos.push(`╭─❁「 ${titulo} 」\n${lista.map(c => `❀ ${config.PREFIX}${c}`).join('\n')}\n╰─❁`);
  }
  for (let i = 0; i < blocos.join('\n\n').length; i += 6000) {
    const texto = blocos.join('\n\n');
    await sock.sendMessage(jid, { text: texto.slice(i, i + 6000) }, { quoted: i === 0 ? msg : undefined });
  }
  return enviarListaPrincipal(sock, jid, msg);
}

function extrairIdBotaoClicado(msg) {
  // O WhatsApp/Baileys pode entregar a resposta do clique dentro de
  // wrappers (ephemeral, viewOnce, documentWithCaption, etc.).
  // O botão já está correto; aqui apenas normalizamos a mensagem recebida
  // antes de procurar o callback.
  try {
    const raiz = msg?.message;
    if (!raiz) return null;

    const visitados = new Set();
    const fila = [raiz];
    const wrappers = [
      'ephemeralMessage',
      'viewOnceMessage',
      'viewOnceMessageV2',
      'viewOnceMessageV2Extension',
      'documentWithCaptionMessage',
      'editedMessage',
      'deviceSentMessage',
      'associatedChildMessage'
    ];

    while (fila.length) {
      const atual = fila.shift();
      if (!atual || typeof atual !== 'object' || visitados.has(atual)) continue;
      visitados.add(atual);

      const response = atual.interactiveResponseMessage;
      const paramsJson = response?.nativeFlowResponseMessage?.paramsJson;
      if (paramsJson) {
        try {
          const dados = JSON.parse(paramsJson);
          return dados.id || dados.row_id || dados.selectedId || null;
        } catch {}
      }

      // Alguns clientes entregam o nativeFlowResponseMessage diretamente.
      const direto = atual.nativeFlowResponseMessage?.paramsJson;
      if (direto) {
        try {
          const dados = JSON.parse(direto);
          return dados.id || dados.row_id || dados.selectedId || null;
        } catch {}
      }

      // Compatibilidade com botões antigos.
      const legacy = atual.buttonsResponseMessage;
      if (legacy?.selectedButtonId) return legacy.selectedButtonId;

      // ✅ Formato que essa conta/versão do WhatsApp realmente usa para
      // responder botões quick_reply de nativeFlowMessage: chega como
      // templateButtonReplyMessage.selectedId (não como
      // buttonsResponseMessage nem interactiveResponseMessage).
      const template = atual.templateButtonReplyMessage;
      if (template?.selectedId) return template.selectedId;

      // Compatibilidade com listas.
      const list = atual.listResponseMessage?.singleSelectReply;
      if (list?.selectedRowId) return list.selectedRowId;

      for (const nome of wrappers) {
        const interno = atual[nome]?.message;
        if (interno && typeof interno === 'object') fila.push(interno);
      }
    }
  } catch (erro) {
    console.error('⚠️ Não consegui ler a interação do botão:', erro.message);
  }
  return null;
}


// ================================================================
// 🧭 NAVEGAÇÃO DOS MENUS — reutiliza o MESMO native-flow/callback
// ================================================================

async function enviarBotoesNavegacao(sock, jid, {
  text,
  footer,
  buttons,
  quoted,
  mentions
} = {}) {
  return enviarNativeFlow(sock, jid, {
    text: text || `〔 ${config.BOT_NAME || 'MIKASA'} 〕`,
    footer: footer || config.BOT_NAME || 'Mikasa Bot',
    buttons: (buttons || []).map(b =>
      typeof b === 'string'
        ? botao(b, b)
        : botao(b.text, b.id)
    ),
    quoted,
    mentions
  });
}

// ================================================================
// 📦 CAIXINHA PADRÃO — visual único pra qualquer mensagem de
// confirmação/aviso do bot: cabeçalho 『 ✦ 』, linhas em citação,
// nome do bot embaixo e (por padrão) botão de entrar no canal.
// Serve pra parar de ter uma moldura ╭━━╮ diferente em cada arquivo.
// ================================================================
function montarMensagemPadrao(titulo, linhas) {
  const corpo = (Array.isArray(linhas) ? linhas : [linhas])
    .filter(Boolean)
    .map(l => `> ${l}`)
    .join('\n');
  const nomeBot = config.BOT_NAME || 'Mikasa Bot';
  return `『 ✦ 』${titulo}『 ✦ 』\n${corpo}\n\n『 ✦ 』 ${nomeBot} 『 ✦ 』`;
}

async function enviarMensagemPadrao(sock, jid, { titulo, linhas, quoted, mentions, comBotaoCanal = true }) {
  const text = montarMensagemPadrao(titulo, linhas);
  const canal = obterLinkCanalConfig();
  if (comBotaoCanal && canal) {
    return enviarNativeFlow(sock, jid, {
      text,
      footer: config.BOT_NAME || 'Mikasa Bot',
      quoted,
      mentions,
      buttons: [botaoUrl('📢 ENTRAR NO CANAL', canal)]
    });
  }
  return sock.sendMessage(jid, { text, mentions }, { quoted });
}

function obterLinkCanalConfig() {
  // Não inventa nenhum endereço: aceita somente chaves que já possam
  // existir na configuração/banco do bot.
  const candidatos = [
    config.CHANNEL_URL,
    config.CHANNEL_LINK,
    config.CHANNEL,
    config.CANAL_URL,
    config.CANAL_LINK,
    config.CANAL,
    config.CHANNEL_USERNAME,
    config.CANAL_USERNAME
  ];

  const valor = candidatos.find(v => typeof v === 'string' && v.trim());
  if (!valor) return null;

  const limpo = valor.trim();
  if (/^https?:\/\//i.test(limpo)) return limpo;
  if (/^(whatsapp\.com\/channel\/|wa\.me\/)/i.test(limpo)) {
    return `https://${limpo}`;
  }
  // Username/identificador de canal já configurado.
  if (/^[A-Za-z0-9._-]+$/.test(limpo)) {
    return `https://whatsapp.com/channel/${limpo}`;
  }
  return null;
}

// ================================================================
// 💬 LINK "FALAR COM O CRIADOR" — mensagem pré-definida no wa.me,
// pra quem clicar já cair com o texto pronto no campo de digitação.
// Mudar a mensagem AQUI atualiza em todos os botões do bot de uma vez.
// ================================================================
function linkFalarComCriador() {
  const numero = String(config.OWNER_NUMBER || '').replace(/\D/g, '');
  if (!numero) return null;
  const mensagem = 'Olá, Doctor Valeyard! Tenho interesse no Mikasa Bot. Pode me passar os planos e valores disponíveis?';
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

async function sendMenuPrincipal(sock, jid, msg) {
  return enviarListaPrincipal(sock, jid, msg);
}

// ================================================================
// 😈 BOTÃO COM O NOME DO DONO — zoeira aleatória ao clicar
// ================================================================
const FRASES_ZOEIRA_DONO = [
  '👀 curioso(a) pra clicar em cima do meu nome, foi?',
  '🙄 clicou achando que ia rolar alguma coisa, né? não rolou.',
  '😹 parabéns, você clicou num botão. sua mãe deve ter orgulho.',
  '🫵 ei, sim, VOCÊ. clicou à toa de novo.',
  '😏 continua clicando que um dia acontece alguma coisa.',
  '🤡 achou que era mágica? é só um botão bobo mesmo.',
  '📌 seu nome já tá na lista de "gente sem o que fazer".',
  '🐌 clicou rápido, mas a decepção chegou mais rápido ainda.',
  '😴 nem eu sei por que você clicou aqui, sinceramente.',
  '🎯 você errou o alvo, isso aqui não faz nada de mais.',
  '🧃 bebe uma água e clica em outra coisa, vai.',
  '🥲 tava esperando algo épico? que triste pra você.',
  '🔁 clica de novo, quem sabe na próxima é diferente (não é).',
  '🫠 mais um clique perdido na história da humanidade.',
  '🍿 só eu sei o quanto isso aqui não leva a lugar nenhum.'
];

function sortearFraseZoeiraDono() {
  return FRASES_ZOEIRA_DONO[Math.floor(Math.random() * FRASES_ZOEIRA_DONO.length)];
}

async function sendZoeiraDono(sock, jid, msg) {
  const autor = msg?.key?.participant || msg?.key?.participantAlt || jid;
  const frase = sortearFraseZoeiraDono();
  return sock.sendMessage(jid, {
    text: `@${String(autor).split('@')[0]} ${frase}`,
    mentions: [autor]
  }, { quoted: msg });
}

async function enviarMenuCategoria(sock, jid, msg, titulo, conteudo, voltarId = 'menu_lista') {
  const linhas = String(conteudo || '').split(/\n/).map(x => x.trim()).filter(Boolean);
  const comandos = linhas.map(x => x.replace(/^.*?\b([a-z0-9_-]+)(?:\s.*)?$/i, '$1')).filter(x => x && /^[a-z0-9_-]+$/i.test(x));
  return enviarListaCategoria(sock, jid, msg, titulo, comandos);
}

async function sendMenuCanal(sock, jid, msg) {
  const link = obterLinkCanalConfig();
  if (!link) return sock.sendMessage(jid, { text: '⚠️ O canal não está configurado.' }, { quoted: msg });
  return enviarNativeFlow(sock, jid, {
    text: `📢 ${config.BOT_NAME || 'BOT'} — CANAL\n\nToque no botão abaixo para abrir diretamente.`,
    footer: config.BOT_NAME || 'Mikasa Bot',
    quoted: msg,
    ...obterMidiaMenuAtual(),
    buttons: [botaoUrl('📢 ENTRAR NO CANAL', link)]
  });
}

async function sendMenuDonoContato(sock, jid, msg) {
  const link = linkFalarComCriador();
  if (!link) return sock.sendMessage(jid, { text: '⚠️ O número do dono não está configurado.' }, { quoted: msg });
  return enviarNativeFlow(sock, jid, {
    text: `💬 ${config.OWNER_NAME || 'Criador'}\n\nToque no botão abaixo para abrir o PV diretamente.`,
    footer: config.BOT_NAME || 'Mikasa Bot',
    quoted: msg,
    ...obterMidiaMenuAtual(),
    buttons: [botaoUrl('💬 FALAR COM O CRIADOR', link)]
  });
}


module.exports = {
  sendMenuBotoes,
  extrairIdBotaoClicado,
  enviarNativeFlow,
  enviarListaWhatsApp,
  enviarListaPrincipal,
  enviarListaCategoria,
  enviarListaSubcategoria,
  botaoLista,
  botao,
  botaoUrl,
  enviarBotoesNavegacao,
  sendMenuPrincipal,
  sendMenuLista,
  enviarMenuCategoria,
  sendMenuCanal,
  sendMenuDonoContato,
  enviarListaTexto,
  montarCategorias,
  montarSubcategorias,
  extrairComandosDoBot,
  getInteractivePending,
  setInteractivePending,
  clearInteractivePending,
  textoPrompt,
  comandoPrecisaEntrada,
  sendZoeiraDono,
  montarMensagemPadrao,
  enviarMensagemPadrao,
  obterLinkCanalConfig,
  linkFalarComCriador,
  linhaLista,
  descricaoComando,
  lerBotConfigAtual,
  fotoMenuBuffer
};
