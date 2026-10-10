<div align="center"><img src="https://capsule-render.vercel.app/api?type=waving&color=0:050505,50:24243e,100:00C9FF&height=230&section=header&text=MIKASA%20BOT&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Bot%20de%20WhatsApp%20Multifuncional&descAlignY=60&descSize=18" width="100%"><a href="https://git.io/typing-svg">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2500&pause=900&color=00C9FF&center=true&vCenter=true&width=800&lines=MIKASA+BOT;Node.js+%7C+Baileys+%7C+Termux;Automação+Inteligente+para+WhatsApp;Tecnologia+%7C+Diversão+%7C+Inovação" alt="MIKASA BOT - Animação de digitação">
</a><br><br>

<img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white">
<img src="https://img.shields.io/badge/Baileys-00C9FF?style=for-the-badge">
<img src="https://img.shields.io/badge/Termux-000000?style=for-the-badge&logo=terminal&logoColor=white">
<img src="https://img.shields.io/badge/Licen%C3%A7a-MIT-blueviolet?style=for-the-badge">
<img src="https://img.shields.io/badge/Vers%C3%A3o-V7-ff0055?style=for-the-badge"><br><br>

<a href="#recursos"><img src="https://img.shields.io/badge/✨_Recursos-00C9FF?style=for-the-badge"></a>
<a href="#instalacao"><img src="https://img.shields.io/badge/📲_Instalação-25D366?style=for-the-badge"></a>
<a href="#primeira-execucao"><img src="https://img.shields.io/badge/👑_Primeira_execução-FFD700?style=for-the-badge"></a>
<a href="#configuracao"><img src="https://img.shields.io/badge/⚙️_Configuração-9370DB?style=for-the-badge"></a>
<a href="#comandos"><img src="https://img.shields.io/badge/📜_Comandos-FF6347?style=for-the-badge"></a>
<a href="#problemas"><img src="https://img.shields.io/badge/❓_Problemas-708090?style=for-the-badge"></a>

</div>---

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&duration=2500&pause=900&color=00C9FF&center=true&vCenter=true&width=600&lines=💫+SOBRE+A+MIKASA;Uma+experiência+multifuncional;Automação+para+WhatsApp" alt="Sobre a Mikasa">
</a></div>A Mikasa Bot é um bot de WhatsApp multifuncional feito em Node.js com a biblioteca Baileys. Ela traz menus interativos com botões e listas, ferramentas de administração de grupo, sistema de nível e moedas, jogos, download de música, figurinhas e uma IA com personalidade própria.

Todos os recursos são gratuitos: não existe sistema de VIP nem de pagamento.

---

<a id="recursos"></a>

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2200&pause=800&color=00C9FF&center=true&vCenter=true&width=600&lines=✨+RECURSOS;Explore+as+funcionalidades;Tudo+em+um+só+bot" alt="Recursos da Mikasa">
</a></div>Categoria| Recurso| Descrição
🤖| IA| Mikasa responde conversas com personalidade própria (precisa de uma chave de API, veja Configuração).
📋| Menus interativos| Menu principal com botões e listas do WhatsApp, separado por categorias.
🛡️| Proteções de grupo| Antilink, antifake, antinota, anti-NSFW, antidelete, antiloop e x9 (visualização única).
👋| Boas-vindas| Mensagens de entrada e saída, com áudios e figurinhas.
🎮| Jogos| Forca, adivinha, quiz, jogo da velha, duelo, roleta e mais.
💰| Economia e nível| XP, nível, gold, perfil, ranking, loja e missões.
🎵| Música e mídia| Download de áudio, conversão para MP3, figurinhas e GIFs.
📊| Relatórios| Ranking de ativos e inativos, relatório diário de atividade.
⚙️| Painel de configuração| Troca de prefixo, nome, criador e chaves direto pelo WhatsApp.

---

<a id="instalacao"></a>

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2200&pause=800&color=25D366&center=true&vCenter=true&width=650&lines=📲+INSTALAÇÃO+NO+TERMUX;Instalação+em+um+comando;Configure+e+inicie+a+MIKASA" alt="Instalação no Termux">
</a></div>«[!NOTE]
O instalador abaixo é para o Termux (Android). Ele atualiza os pacotes, instala o que precisa, cria a pasta, baixa o bot, instala as dependências e já inicia.»

🚀 Instalação em um comando

Copie, cole no Termux e aperte ENTER:

pkg update -y && pkg install -y nodejs-lts wget unzip ffmpeg && mkdir -p ~/MIKASA-V7 && cd ~/MIKASA-V7 && wget -O bot-v7.zip https://github.com/DOCTOR-VALEYARD/mikasa-v7.js/raw/refs/heads/main/bot-v7.zip && unzip -o bot-v7.zip && npm install && node mikasabot.js

🔍 O que esse comando faz?

Etapa| O que acontece
1️⃣| Atualiza o Termux e instala nodejs-lts, wget, unzip e ffmpeg.
2️⃣| Cria a pasta "~/MIKASA-V7" e entra nela.
3️⃣| Baixa o "bot-v7.zip" do GitHub e extrai os arquivos.
4️⃣| Instala as dependências com "npm install".
5️⃣| Inicia o bot com "node mikasabot.js".

▶️ Para ligar o bot nas próximas vezes

cd ~/MIKASA-V7 && node mikasabot.js

🔄 Para atualizar o bot

Rode o comando de instalação de novo. Ele sobrescreve os arquivos do bot ("unzip -o"). A sessão do WhatsApp ("auth_info/") fica guardada, mas os arquivos da pasta "database/" também são substituídos pelos do ZIP.

Se quiser manter seus dados e configurações, faça uma cópia antes:

cp -r ~/MIKASA-V7/database ~/database-backup

«[!TIP]
Quer baixar músicas com o yt-dlp como reserva? Instale com:

pkg install -y python && pip install yt-dlp

É opcional.»

---

<a id="primeira-execucao"></a>

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2200&pause=800&color=FFD700&center=true&vCenter=true&width=650&lines=👑+PRIMEIRA+EXECUÇÃO;Configure+o+criador;Escolha+como+conectar" alt="Primeira execução">
</a></div>Na primeira vez que você iniciar o bot, ele faz uma configuração rápida direto no terminal:

1. 👑 Número do criador: o bot pergunta qual número será o criador. Esse número pode ser diferente do número que vai conectar o bot ao WhatsApp. Ele aparece nos menus e no botão "Falar com o criador".
2. 📛 Nome do criador (opcional): digite um nome ou aperte ENTER para manter o padrão.
3. 🔗 Forma de conexão: escolha entre QR Code ou Código de pareamento.

Exemplo:

➜ 5511999998888

✅ O criador será +5511999998888.
Está certo? [S/n]

Depois disso, o bot guarda tudo em "database/botconfig.json" e não pergunta de novo.

🔄 Quero trocar o número do criador depois

- Pelo WhatsApp, use o comando "configurar-bot numero SEU_NUMERO".
- Ou apague a linha "OWNER_CONFIGURADO" do arquivo "database/botconfig.json" e reinicie o bot para ele perguntar de novo.

---

<a id="configuracao"></a>

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2200&pause=800&color=9370DB&center=true&vCenter=true&width=650&lines=⚙️+CONFIGURAÇÃO;Personalize+a+MIKASA;Ajuste+as+opções+do+bot" alt="Configuração">
</a></div>As configurações padrão ficam no "config.js". O que for alterado pelo bot fica salvo em "database/botconfig.json" e tem prioridade.

Opção| Descrição
"PREFIX"| Prefixo dos comandos (também dá para mudar com "configurar-bot prefixo").
"BOT_NAME"| Nome do bot nos menus e mensagens.
"OWNER_NUMBER" / "OWNER_NAME"| Número e nome do criador (preenchidos na primeira execução).
"OPEN_ACCESS"| "true" = qualquer pessoa usa qualquer comando. "false" = comandos de dono só para o criador.
"AI_ATIVA" / "AI_API_KEY"| Liga a IA e define a chave da API.
"MUSICA"| Binário de download (yt-dlp), qualidade e duração máxima.

🤖 Ativando a IA

A chave não vem no projeto. Defina de uma destas formas:

Opção 1 — Variável de ambiente

export AI_API_KEY="sua_chave_aqui"

Opção 2 — "database/botconfig.json"

{
  "AI_API_KEY": "sua_chave_aqui"
}

Sem chave, o bot funciona normalmente, apenas sem as respostas de IA.

«[!WARNING]
Nunca publique sua chave de API nem a pasta "auth_info/" (ela guarda a sessão do seu WhatsApp). O ".gitignore" do projeto já ignora "auth_info/".»

🔓 Sobre o "OPEN_ACCESS"

Por padrão o modo aberto vem ligado, ou seja, qualquer pessoa que falar com o bot pode usar todos os comandos, inclusive restart, desligar e broadcast.

Se você hospeda o bot para um grupo grande, considere colocar "OPEN_ACCESS" como "false" no "config.js".

---

<a id="comandos"></a>

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2200&pause=800&color=FF6347&center=true&vCenter=true&width=600&lines=📜+COMANDOS;Explore+as+funcionalidades;Mais+comandos+em+breve" alt="Comandos">
</a></div>«[!IMPORTANT]
🚧 A lista completa de comandos será adicionada aqui em breve.»

---

<a id="problemas"></a>

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2200&pause=800&color=FF6347&center=true&vCenter=true&width=650&lines=❓+PROBLEMAS+COMUNS;Soluções+e+orientações;Confira+as+dicas+abaixo" alt="Problemas comuns">
</a></div><details>
<summary>🔌 A conexão cai ou pede para apagar a sessão</summary>Apague a pasta "auth_info/" e inicie o bot de novo para conectar do zero.

Atenção: você precisará autenticar o WhatsApp novamente.

</details><details>
<summary>🧩 Erro ao instalar o @napi-rs/canvas no Termux</summary>É uma dependência nativa e pode falhar em algumas configurações de Termux/ARM64.

Atualize os pacotes:

pkg update && pkg upgrade

Confira se está usando Node.js 20+ e tente novamente:

npm install

Se continuar, abra uma issue com o erro completo.

</details><details>
<summary>🎵 Música não baixa</summary>Confira se o ffmpeg está instalado:

ffmpeg -version

Se usa o yt-dlp como reserva, confira:

yt-dlp --version

Mantenha-o atualizado:

pip install -U yt-dlp

</details>---

<div align="center"><a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=22&duration=2500&pause=900&color=00C9FF&center=true&vCenter=true&width=700&lines=👨‍💻+CRIADOR;Doctor+Valeyard+C%27rizz+Lunático;Desenvolvimento+%7C+Tecnologia+%7C+Automação" alt="Criador da Mikasa">
</a><br><br>

Doctor Valeyard C'rizz Lunático

Canal no WhatsApp

---

<a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=20&duration=2500&pause=900&color=9370DB&center=true&vCenter=true&width=600&lines=📄+LICENÇA+MIT;Projeto+de+código+aberto;Consulte+o+arquivo+LICENSE" alt="Licença">
</a></div>Distribuído sob a licença MIT. Veja o arquivo "LICENSE" para mais detalhes.

<div align="center"><br><a href="https://github.com/DOCTOR-VALEYARD/mikasa-v7.js">
<img src="https://img.shields.io/badge/⭐_Se_o_projeto_te_ajudou%2C_deixe_uma_estrela!-FFD700?style=for-the-badge&logo=github&logoColor=black" alt="Deixe uma estrela no GitHub">
</a><br><br>

<a href="https://readme-typing-svg.demolab.com">
<img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=17&duration=2500&pause=1000&color=00C9FF&center=true&vCenter=true&width=650&lines=Obrigado+por+conhecer+a+MIKASA+BOT;Tecnologia+em+constante+evolução;⭐+Apoie+o+projeto+no+GitHub+⭐" alt="Mensagem final animada">
</a><img src="https://capsule-render.vercel.app/api?type=waving&color=0:050505,50:24243e,100:00C9FF&height=130&section=footer" width="100%"></div>
