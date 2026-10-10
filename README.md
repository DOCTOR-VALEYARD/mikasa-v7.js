Mikasa Bot  Digitando...
Node.js   Baileys   Termux   Licença   Versão

✨ Recursos •
📲 Instalação •
👑 Primeira execução •
⚙️ Configuração •
📜 Comandos •
❓ Problemas


---

💫 Sobre

A Mikasa Bot é um bot de WhatsApp multifuncional feito em Node.js com a biblioteca Baileys. Ela traz menus interativos com botões e listas, ferramentas de administração de grupo, sistema de nível e moedas, jogos, download de música, figurinhas e uma IA com personalidade própria.

Todos os recursos são gratuitos: não existe sistema de VIP nem de pagamento.


---

✨ Recursos

Categoria	O que tem

🤖	IA	Mikasa responde conversas com personalidade própria (precisa de uma chave de API, veja Configuração)
📋	Menus interativos	Menu principal com botões e listas do WhatsApp, separado por categorias
🛡️	Proteções de grupo	Antilink, antifake, antinota, anti-NSFW, antidelete, antiloop e x9 (visualização única)
👋	Boas-vindas	Mensagens de entrada e saída, com áudios e figurinhas
🎮	Jogos	Forca, adivinha, quiz, jogo da velha, duelo, roleta e mais
💰	Economia e nível	XP, nível, gold, perfil, ranking, loja e missões
🎵	Música e mídia	Download de áudio, conversão para MP3, figurinhas e GIFs
📊	Relatórios	Ranking de ativos e inativos, relatório diário de atividade
⚙️	Painel de configuração	Troca de prefixo, nome, criador e chaves direto pelo WhatsApp


---

📲 Instalação no Termux

> [!NOTE]
O instalador abaixo é para o Termux (Android). Ele atualiza os pacotes, instala o que precisa, cria a pasta, baixa o bot, instala as dependências e já inicia.



🚀 Instalação em um comando

Copie, cole no Termux e aperte ENTER:

pkg update -y && pkg install -y nodejs-lts wget unzip ffmpeg && mkdir -p ~/MIKASA-V7 && cd ~/MIKASA-V7 && wget -O bot-v7.zip https://github.com/DOCTOR-VALEYARD/mikasa-v7.js/raw/refs/heads/main/bot-v7.zip && unzip -o bot-v7.zip && npm install && node mikasabot.js

O que esse comando faz:

Etapa	O que acontece

1️⃣	Atualiza o Termux e instala nodejs-lts, wget, unzip e ffmpeg
2️⃣	Cria a pasta ~/MIKASA-V7 e entra nela
3️⃣	Baixa o bot-v7.zip do GitHub e extrai os arquivos
4️⃣	Instala as dependências com npm install
5️⃣	Inicia o bot com node mikasabot.js

▶️ Para ligar o bot nas próximas vezes

cd ~/MIKASA-V7 && node mikasabot.js

🔄 Para atualizar o bot

Rode o comando de instalação de novo. Ele sobrescreve os arquivos do bot (unzip -o). A sessão do WhatsApp (auth_info/) fica guardada, mas os arquivos da pasta database/ também são substituídos pelos do ZIP. Se quiser manter seus dados e configurações, faça uma cópia antes: cp -r ~/MIKASA-V7/database ~/database-backup.

> [!TIP]
Quer baixar músicas com o yt-dlp como reserva? Instale com pkg install -y python && pip install yt-dlp. É opcional.




---

👑 Primeira execução

Na primeira vez que você iniciar o bot, ele faz uma configuração rápida direto no terminal:

1. 👑 Número do criador: o bot pergunta qual número será o criador. Esse número pode ser diferente do número que vai conectar o bot ao WhatsApp. Ele aparece nos menus e no botão "Falar com o criador".
2. 📛 Nome do criador (opcional): digite um nome ou aperte ENTER para manter o padrão.
3. 🔗 Forma de conexão: escolha entre QR Code ou Código de pareamento.

➜ 5511999998888
✅ O criador será +5511999998888. Está certo? [S/n]

Depois disso, o bot guarda tudo em database/botconfig.json e não pergunta de novo.
🔄 Quero trocar o número do criador depois

- Pelo WhatsApp, use o comando configurar-bot numero SEU_NUMERO.   - Ou apague a linha OWNER_CONFIGURADO do arquivo database/botconfig.json e reinicie o bot para ele perguntar de novo.        ---
  ⚙️ Configuração

As configurações padrão ficam no config.js. O que for alterado pelo bot fica salvo em database/botconfig.json e tem prioridade.

Opção	Descrição

PREFIX	Prefixo dos comandos (também dá para mudar com configurar-bot prefixo)
BOT_NAME	Nome do bot nos menus e mensagens
OWNER_NUMBER / OWNER_NAME	Número e nome do criador (preenchidos na primeira execução)
OPEN_ACCESS	true = qualquer pessoa usa qualquer comando. false = comandos de dono só para o criador
AI_ATIVA / AI_API_KEY	Liga a IA e define a chave da API
MUSICA	Binário de download (yt-dlp), qualidade e duração máxima

🤖 Ativando a IA

A chave não vem no projeto. Defina de uma destas formas:

opção 1: variável de ambiente

export AI_API_KEY="sua_chave_aqui"

// opção 2: database/botconfig.json
{ "AI_API_KEY": "sua_chave_aqui" }

Sem chave, o bot funciona normalmente, apenas sem as respostas de IA.

> [!WARNING]
Nunca publique sua chave de API nem a pasta auth_info/ (ela guarda a sessão do seu WhatsApp). O .gitignore do projeto já ignora auth_info/.



🔓 Sobre o OPEN_ACCESS

Por padrão o modo aberto vem ligado, ou seja, qualquer pessoa que falar com o bot pode usar todos os comandos, inclusive restart, desligar e broadcast. Se você hospeda o bot para um grupo grande, considere colocar OPEN_ACCESS como false no config.js.


---

📜 Comandos

> 🚧 A lista completa de comandos será adicionada aqui em breve.




---

❓ Problemas comuns
🔌 A conexão cai ou pede para apagar a sessão
Apague a pasta auth_info/ e inicie o bot de novo para conectar do zero.          🧩 Erro ao instalar o @napi-rs/canvas no Termux
É uma dependência nativa e pode falhar em algumas configurações de Termux/ARM64. Atualize os pacotes (pkg update && pkg upgrade), confira se está usando Node.js 20+ e tente npm install novamente. Se continuar, abra uma issue com o erro completo.          🎵 Música não baixa
Confira se o ffmpeg está instalado (ffmpeg -version). Se usa o yt-dlp como reserva, confira com yt-dlp --version e mantenha atualizado com pip install -U yt-dlp.        ---
👨‍💻 Criador

Doctor Valeyard C'rizz Lunático
Canal no WhatsApp


---

📄 Licença

Distribuído sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

⭐ Se o projeto te ajudou, deixe uma estrela no repositório! ⭐
