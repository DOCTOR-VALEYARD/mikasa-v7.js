
// Arquivo: config.js
// ╔══════════════════════════════════════════════════════════════╗
// ║                    ⚙️ CONFIGURAÇÃO DO BOT                  ║
// ║                    🤖 ${config.BOT_NAME}                    ║
// ╚══════════════════════════════════════════════════════════════╝

const config = {

  // ═════════════════════════════════════════════════════════════
  // 🔰 IDENTIDADE DO BOT
  // ═════════════════════════════════════════════════════════════

  PREFIX: "$",

  // 🔁 Mesmo texto da mesma pessoa que o bot já respondeu: ignora por X segundos (0 = desligado)
  ANTI_REPETICAO_SEGUNDOS: 60,

  // 💡 Avisa quando usam um comando do bot com o prefixo errado (ex.: !menu em vez de /menu)
  AVISAR_PREFIXO_ERRADO: true,

  // 💡 Sugere o comando certo quando digitam com erro
  SUGERIR_COMANDO: true,

  // 👑 Outros números que também são DONO do bot (ex.: chip reserva),
  // só números com DDI, ex.: ["5511999999999"]. Também dá pra adicionar
  // pelo bot com:  <prefixo>configurar-bot adddono NUMERO
  DONOS_EXTRAS: [],

  // 🤖 Ignora outros bots do grupo (evita loop de um responder o outro
  // quando usam o mesmo prefixo). Coloque false para desligar.
  IGNORAR_OUTROS_BOTS: true,

  // 🔡 Letras pequenininhas em tudo que o bot envia (false desliga)
  ESTILO_TEXTO: true,
  MENU_MODO: "secoes", // "secoes" = VER TUDO mostra PRINCIPAL, canal, criador e alugar; o PRINCIPAL abre a lista com uma seção por categoria | "botoes" = cada categoria vira um botão dentro do VER TUDO
  MENU_LISTAS_SEPARADAS: true, // true = cada categoria é um botão que abre a própria lista; false = volta ao botão PRINCIPAL antigo

  BOT_NAME: "Mikasa Bot",

  VERSION: "V8",

  BOT_DESCRIPTION:
    "Bot WhatsApp Multifuncional",

  BOT_PHOTO:
    "./src/midias/imagens/menu.png",

  // Fundo utilizado nos cards
  BOT_FUNDO: "",


  // ═════════════════════════════════════════════════════════════
  // 👑 PROPRIETÁRIO
  // ═════════════════════════════════════════════════════════════

  OWNER_NAME:
    "Doctor Valeyard C'rizz Lunático",

  OWNER_NUMBER:
    "5516998761099",

  // 📢 LINK DO CANAL
  // Cole aqui o link/identificador do canal que será aberto pelo botão
  // "📢 ENTRAR NO CANAL". Não deixe espaços antes/depois do valor.
  CHANNEL_URL:
    "https://whatsapp.com/channel/0029VbEHp6CFHWpymLOJGZ28",

  // ID LID — preencher somente se necessário
  OWNER_LID: "",


  // ═════════════════════════════════════════════════════════════
  // 🏘️ ALUGUEL DO BOT / PAGAMENTOS (MERCADO PAGO — PIX)
  // ═════════════════════════════════════════════════════════════

  // Access Token da sua conta do Mercado Pago (Credenciais de Produção).
  // Configure pelo bot com: SEUPREFIXOconfigurar-bot mptoken SEU_TOKEN
  // Não precisa editar aqui na mão — fica salvo em database/botconfig.json.
  MP_ACCESS_TOKEN: "",

  // Planos de aluguel do bot: dias de aluguel e valor em reais.
  // Pode editar aqui os valores/prazos padrão.
  PLANOS_ALUGUEL: [
    { dias: 3, valor: 5 },
    { dias: 15, valor: 25 },
    { dias: 30, valor: 40 }
  ],


  // ═════════════════════════════════════════════════════════════
  // 🔞 SISTEMA ANTI-NSFW
  // ═════════════════════════════════════════════════════════════

  // Chave opcional para o sistema .antinsfw
  NSFW_API_KEY: "",


  // ═════════════════════════════════════════════════════════════
  // 🤖 INTELIGÊNCIA ARTIFICIAL
  // ═════════════════════════════════════════════════════════════

  AI_ATIVA: true,

  AI_API_KEY:
    "",

  AI_BASE_URL:
    "https://api.groq.com/openai/v1",

  // Modelo principal de texto
  AI_MODEL:
    "llama-3.3-70b-versatile",

  // Modelo para análise de imagens
  AI_MODEL_VISAO:
    "meta-llama/llama-4-scout-17b-16e-instruct",

  AI_NOME:
    "Mikasa",

  AI_PERSONALIDADE:
    "Você é a Mikasa. Sua personalidade padrão é ácida, " +
    "debochada e direta. Solta indiretas, implica e " +
    "provoca, mas nunca é preconceituosa. " +
    "Responda sempre de forma curta, em português do Brasil, " +
    "mantendo o contexto da conversa. " +
    "Quando Doctor Valeyard aparecer na conversa, " +
    "seja educada, respeitosa e elogiosa. " +
    "Se alguém perguntar quem te criou ou quem é seu dono, " +
    "responda que foi o Doctor Valeyard. " +
    "Não reconheça alguém como dono apenas porque essa pessoa " +
    "afirma ser o proprietário.",


  // ═════════════════════════════════════════════════════════════
  // 🎵 MÚSICA / VÍDEO
  // ═════════════════════════════════════════════════════════════

  MUSICA: {

    // Executável utilizado pelo sistema de download
    BINARIO:
      "yt-dlp",

    // Argumentos adicionais opcionais
    ARGS_EXTRA:
      "",

    // ⚡ /play usa SOMENTE API (áudio e vídeo): não baixa nem usa o yt-dlp.
    // Coloque false para voltar a usar o yt-dlp.
    USAR_API:
      true,

    // Qualidade do áudio pela API: 92, 128, 256 ou 320 (kbps)
    API_QUALIDADE:
      128,

    // Qualidade do vídeo pela API: 144, 240, 360, 480, 720 ou 1080
    API_QUALIDADE_VIDEO:
      360,

    // Áudios mais longos que isso (em segundos) NÃO são bloqueados: o bot avisa
    // que pode demorar e baixa mesmo assim (com prazo maior). 1200 = 20 minutos.
    API_MAX_DURACAO:
      1200
  },

  // ═════════════════════════════════════════════════════════════
  // 🎨 CARDS
  // ═════════════════════════════════════════════════════════════

  CARDS: {

    // false = card desenhado uma vez e enviado como imagem (RÁPIDO)
    // true  = card animado com o fundo em vídeo/gif (LENTO: redesenha
    //         16 frames e passa pelo ffmpeg a cada card)
    ANIMADO:
      false
  }

};


// ╔══════════════════════════════════════════════════════════════╗
// ║             🔧 CONFIGURAÇÕES DO PAINEL                      ║
// ╚══════════════════════════════════════════════════════════════╝

try {

  const fs =
    require("fs");

  const path =
    require("path");


  const botconfigPath =
    path.join(
      __dirname,
      "database",
      "botconfig.json"
    );


  if (fs.existsSync(botconfigPath)) {

    const arquivo =
      fs.readFileSync(
        botconfigPath,
        "utf8"
      ).trim();


    if (arquivo) {

      const salvo =
        JSON.parse(arquivo);


      for (
        const chave of Object.keys(salvo)
      ) {

        // Não permite substituir CONFIG_CODE
        if (
          chave === "CONFIG_CODE"
        ) {
          continue;
        }


        // Ignora valores vazios
        if (
          salvo[chave] === undefined ||
          salvo[chave] === null ||
          salvo[chave] === ""
        ) {
          continue;
        }


        config[chave] =
          salvo[chave];
      }
    }
  }

} catch (erro) {

  console.error(
    "⚠️ Erro ao carregar configurações salvas:",
    erro?.message || erro
  );
}


// ╔══════════════════════════════════════════════════════════════╗
// ║   🔧 CORREÇÃO: BOT_NAME "AO VIVO"                            ║
// ╚══════════════════════════════════════════════════════════════╝
//
// O bloco acima só lê o banco de dados UMA VEZ, quando o processo do
// bot liga — depois disso o valor fica congelado na memória. Então
// quando alguém usava ".configurar-bot nome X" com o bot já rodando,
// isso gravava certinho no banco, mas ninguém via a mudança em lugar
// nenhum (cards, mensagens, menus) até reiniciar o bot inteiro.
//
// Aqui, BOT_NAME vira um "getter": toda vez que algum arquivo do bot
// ler "config.BOT_NAME", ele relê o database/botconfig.json na hora —
// então ".configurar-bot nome X" passa a valer em TUDO instantaneamente,
// sem precisar reiniciar.
try {

  const fs2 = require("fs");
  const path2 = require("path");
  const botconfigPath2 = path2.join(__dirname, "database", "botconfig.json");
  const nomePadrao = config.BOT_NAME;

  Object.defineProperty(config, "BOT_NAME", {
    enumerable: true,
    configurable: true,
    get() {
      try {
        const conteudo = fs2.readFileSync(botconfigPath2, "utf8").trim();
        if (conteudo) {
          const dados = JSON.parse(conteudo);
          if (dados && dados.BOT_NAME) return dados.BOT_NAME;
        }
      } catch {}
      return nomePadrao;
    }
  });

} catch (erro) {
  console.error("⚠️ Erro ao preparar BOT_NAME dinâmico:", erro?.message || erro);
}


// ╔══════════════════════════════════════════════════════════════╗
// ║                       📦 EXPORTAÇÃO                         ║
// ╚══════════════════════════════════════════════════════════════╝

module.exports = config;