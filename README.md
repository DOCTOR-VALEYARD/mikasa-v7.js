<div align="center">

<img src="https://capsule-render.vercel.app/api?type=venom&color=gradient&customColorList=12,20,24&height=260&section=header&text=MIKASA%20BOT&fontSize=78&fontColor=ffffff&animation=twinkling&fontAlignY=40&desc=%E2%9C%A6%20Bot%20de%20WhatsApp%20multifuncional%20%E2%9C%A6&descAlignY=62&descSize=20" alt="Mikasa Bot" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3200&pause=900&color=F72585&center=true&vCenter=true&width=700&lines=%F0%9F%8C%B9+Eleg%C3%A2ncia+e+atitude+no+seu+WhatsApp;%F0%9F%A4%96+Menus+com+bot%C3%B5es+e+listas+interativas;%F0%9F%9B%A1%EF%B8%8F+Antilink%2C+antifake%2C+antidelete+e+mais;%F0%9F%8E%B5+M%C3%BAsica+com+%C3%81udio%2C+V%C3%ADdeo+e+Documento;%F0%9F%8E%AE+Jogos%2C+economia%2C+n%C3%ADvel+e+casamentos;%F0%9F%93%B1+Feito+pra+rodar+no+Termux" alt="Digitando..." />
</a>

<br/>

![Node.js](https://img.shields.io/badge/Node.js-LTS-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-7.0.0--rc.9-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Termux](https://img.shields.io/badge/Termux-Android-000000?style=for-the-badge&logo=android&logoColor=3DDC84)
![Versão](https://img.shields.io/badge/Vers%C3%A3o-8.0.0-9B5DE5?style=for-the-badge)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-F72585?style=for-the-badge)
![Gratuito](https://img.shields.io/badge/100%25-Gratuito-FFB703?style=for-the-badge)

<br/>

**[✨ Recursos](#-recursos)** •
**[📲 Instalação](#-instalação-no-termux)** •
**[👑 Primeira execução](#-primeira-execução)** •
**[⚙️ Configuração](#️-configuração)** •
**[📜 Comandos](#-comandos)** •
**[❓ Problemas](#-problemas-comuns)**

</div>

---

## 💫 Sobre

A **Mikasa Bot** é um bot de WhatsApp multifuncional feito em **Node.js** com a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys). Ela junta menus interativos com botões e listas, administração de grupo, economia e nível, jogos, download de música, figurinhas e uma IA com personalidade própria.

> [!IMPORTANT]
> Tudo é **gratuito**. Não existe sistema de VIP nem de pagamento.

<div align="center">

| 🎴 | 🛡️ | 🎵 | 🎮 | 💰 |
|:-:|:-:|:-:|:-:|:-:|
| Menus com botões | Proteções de grupo | Música em 3 formatos | Jogos e brincadeiras | Economia e nível |

</div>

---

## ✨ Recursos

| | Categoria | O que tem |
|:-:|---|---|
| 🤖 | **IA** | A Mikasa responde conversas com personalidade própria (precisa de chave de API, veja [Configuração](#️-configuração)) |
| 📋 | **Menus interativos** | Menu principal com botões e listas nativas do WhatsApp, separado por categorias |
| 🛡️ | **Proteções de grupo** | Antilink, antifake, antinota, anti-NSFW, antidelete, antiloop, antipalavrão e x9 (visualização única) |
| 👋 | **Boas-vindas** | Mensagens de entrada e saída, com áudios e figurinhas |
| 🔊 | **Respostas com áudio** | Áudios aleatórios no menu, na entrada de membros e quando alguém pede o prefixo |
| 🎮 | **Jogos** | Forca, adivinha, quiz, jogo da velha, duelo, roleta e mais |
| 💰 | **Economia e nível** | XP, nível, gold, banco, perfil, ranking, loja e missões |
| 💍 | **Brincadeiras sociais** | Casamento, família, amizade, compatibilidade, dupla e presentes |
| 🎵 | **Música e mídia** | Busca por nome e escolha entre **Áudio**, **Vídeo** ou **Documento**, além de MP3, figurinhas e GIFs |
| 📊 | **Relatórios** | Ranking de ativos e inativos e relatório diário de atividade |
| ⚙️ | **Painel de configuração** | Troca de prefixo, nome, criador, foto, fundo e áudio direto pelo WhatsApp |

---

## 📲 Instalação no Termux

> [!NOTE]
> O instalador abaixo é para o **Termux** (Android). Ele atualiza os pacotes, instala o que precisa, cria a pasta, baixa o bot, instala as dependências e já inicia.

### 🚀 Instalação em um comando

Copie, cole no Termux e aperte `ENTER`:

```bash
pkg update -y && pkg install -y nodejs-lts wget unzip ffmpeg && mkdir -p ~/MIKASA-V7 && cd ~/MIKASA-V7 && wget -O bot-v7.zip https://github.com/DOCTOR-VALEYARD/mikasa-v7.js/raw/refs/heads/main/bot-v7.zip && unzip -o bot-v7.zip && npm install && node mikasabot.js
```

<details>
<summary><b>🔍 O que esse comando faz, etapa por etapa</b></summary>

<br/>

| Etapa | O que acontece |
|:-:|---|
| 1️⃣ | Atualiza o Termux e instala `nodejs-lts`, `wget`, `unzip` e `ffmpeg` |
| 2️⃣ | Cria a pasta `~/MIKASA-V7` e entra nela |
| 3️⃣ | Baixa o `bot-v7.zip` do GitHub e extrai os arquivos |
| 4️⃣ | Instala as dependências com `npm install` |
| 5️⃣ | Inicia o bot com `node mikasabot.js` |

</details>

### ▶️ Ligar nas próximas vezes

```bash
cd ~/MIKASA-V7 && node mikasabot.js
```

### 🔄 Atualizar o bot

Rode o comando de instalação de novo. Ele sobrescreve os arquivos do bot (`unzip -o`). A sessão do WhatsApp (`auth_info/`) fica guardada, mas a pasta `database/` também é substituída pela do ZIP. Para manter seus dados e configurações, faça uma cópia antes:

```bash
cp -r ~/MIKASA-V7/database ~/database-backup
```

> [!TIP]
> **Vídeo e documento na música** precisam do `yt-dlp`. O áudio funciona por API e usa o `yt-dlp` só como reserva. Para instalar: `pkg install -y python && pip install yt-dlp`.

---

## 👑 Primeira execução

Na primeira vez que você iniciar o bot, ele faz uma configuração rápida **direto no terminal**:

| Passo | O que acontece |
|:-:|---|
| 👑 | **Número do criador.** O bot pergunta qual número será o **criador**. Pode ser **diferente** do número que conecta o bot ao WhatsApp. Ele aparece nos menus e no botão "Falar com o criador". |
| 📛 | **Nome do criador (opcional).** Digite um nome ou aperte `ENTER` para manter o padrão. |
| 🔗 | **Forma de conexão.** Escolha entre **QR Code** ou **Código de pareamento**. |

```text
➜ 5511999998888
✅ O criador será +5511999998888. Está certo? [S/n]
```

Depois disso o bot guarda tudo em `database/botconfig.json` e **não pergunta de novo**.

<details>
<summary><b>🔄 Quero trocar o número do criador depois</b></summary>

<br/>

- Pelo WhatsApp, use o comando `/configurar-bot numero SEU_NUMERO`.
- Ou apague a linha `OWNER_CONFIGURADO` do arquivo `database/botconfig.json` e reinicie o bot para ele perguntar de novo.

</details>

---

## ⚙️ Configuração

As configurações padrão ficam no `config.js`. O que for alterado pelo bot fica salvo em `database/botconfig.json` e **tem prioridade**.

| Opção | Descrição |
|---|---|
| `PREFIX` | Prefixo dos comandos. Também dá para mudar com `/configurar-bot prefixo` |
| `BOT_NAME` | Nome do bot nos menus e mensagens |
| `OWNER_NUMBER` / `OWNER_NAME` | Número e nome do criador (preenchidos na primeira execução) |
| `OPEN_ACCESS` | `true`: qualquer pessoa usa qualquer comando. `false`: comandos de dono só para o criador |
| `AI_ATIVA` / `AI_API_KEY` | Liga a IA e define a chave da API |
| `PREFIXO_COOLDOWN_SEG` | Tempo mínimo (em segundos) para o bot responder "prefixo" de novo à mesma pessoa. Padrão: 60 |
| `MUSICA.USAR_API` | `true`: áudio pela API (rápido). Se falhar, cai no `yt-dlp` |
| `MUSICA.API_QUALIDADE` | Qualidade do áudio pela API: `92`, `128`, `256` ou `320` |
| `MUSICA.API_MAX_DURACAO` | Acima dessa duração (segundos) o bot pula a API e usa o `yt-dlp` |

### 🤖 Ativando a IA

A chave **não vem no projeto**. Defina de uma destas formas:

```bash
# opção 1: variável de ambiente
export AI_API_KEY="sua_chave_aqui"
```

```json
// opção 2: database/botconfig.json
{ "AI_API_KEY": "sua_chave_aqui" }
```

Sem chave, o bot funciona normalmente, só sem as respostas de IA.

> [!WARNING]
> **Nunca publique sua chave de API nem a pasta `auth_info/`**. Ela guarda a sessão do seu WhatsApp. O `.gitignore` do projeto já ignora `auth_info/`.

### 🔓 Sobre o `OPEN_ACCESS`

Por padrão o modo aberto vem **ligado**: qualquer pessoa que falar com o bot pode usar todos os comandos, inclusive `restart` e `broadcast`. Se você hospeda o bot para um grupo grande, considere colocar `OPEN_ACCESS` como `false` no `config.js`.

---

## 📜 Comandos

> [!NOTE]
> Os exemplos usam o prefixo `/`. Se você trocou o prefixo, use o seu. Digite **`/menu`** para abrir o menu com botões ou apenas **`menu`** (sem prefixo) para a versão em texto.

<details open>
<summary><b>⚙️ Configurações</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/ping` | Testa se o bot está respondendo |
| `/configurar-bot` | Painel de configuração (prefixo, nome, criador, foto, fundo, áudio) |
| `/ativar` | Ativa o bot no grupo |
| `/ia` ou `/inteligencia` | Liga ou desliga a IA |
| `/bemvindo` | Configura as boas-vindas |
| `/aceitar` | Aceita pedidos de entrada |
| `/mencao` | Configura menções |
| `/configglobal` | Configurações globais |

</details>

<details>
<summary><b>💻 Menus</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/menu` | Menu principal com botões |
| `/menudono` | Menu do dono |
| `/menuadm` | Menu dos administradores |
| `/menupremium` | Menu premium |
| `/menugold` | Menu de gold e economia |
| `/menumidias` | Menu de downloads e mídias |
| `/efeitos` | Efeitos para imagens |
| `/logos` | Cria logos com o seu texto |
| `/brincadeiras` | Lista de brincadeiras |
| `/menubrinquedos` | Menu de brinquedos |
| `/mediafire` | Baixa arquivos do MediaFire |

</details>

<details>
<summary><b>🎭 Brincadeiras</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/enquete` | Cria uma enquete |
| `/amizade` | Nível de amizade entre duas pessoas |
| `/compatibilidade` | Compatibilidade entre duas pessoas |
| `/dupla` | Forma uma dupla |
| `/familia` · `/familias` | Sua família e a lista de famílias |
| `/casamento` · `/meucasal` · `/divorcio` | Casar, ver seu casal e se divorciar |
| `/presente` | Dá um presente a alguém |
| `/missoes` · `/missao` | Missões do dia |

</details>

<details>
<summary><b>👥 Membros</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/registrar` · `/delregistro` | Cria ou apaga o seu registro |
| `/perfil` | Mostra o seu perfil |
| `/inforegistrar` · `/infoperfil` | Explica o registro e o perfil |
| `/advertidos` · `/mutados` | Listas de advertidos e mutados |
| `/infoadv` · `/infomute` | Explica advertências e mute |
| `/infobot` · `/botstatus` | Informações e status do bot |
| `/bug` · `/sugestao` · `/avalie` | Reporta bug, envia sugestão ou avalia |
| `/reagir` | Reage a uma mensagem |
| `/adms` | Chama os administradores |
| `/convite` | Link de convite do grupo |
| `/forca` · `/adivinha` · `/quiz` · `/jogodavelha` | Jogos |
| `/aleatory` | Algo aleatório |
| `/resumo` · `/historico` | Resumo e histórico da conversa |
| `/conquistas` | Suas conquistas |

</details>

<details>
<summary><b>💰 Economia e gold</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/gold` · `/saldo` · `/moedas` | Mostra o seu dinheiro |
| `/checkin` · `/daily` · `/bonus` | Recompensas diárias |
| `/trabalhar` | Trabalha para ganhar gold |
| `/roubar @pessoa` | Tenta roubar alguém |
| `/transferir @pessoa <gold>` | Transfere gold |
| `/depositar <gold>` · `/sacar <gold>` | Guarda ou saca do banco |
| `/extrato` · `/inventario` | Extrato e inventário |
| `/presente @pessoa` | Presenteia alguém |
| `/topgold` · `/topxp` · `/topamizade` | Rankings |
| `/xp` · `/nivel` | Seu XP e nível |

</details>

<details>
<summary><b>📚 Informações</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/rank` | Ranking do grupo |
| `/tabela` | Tabela de classificação |
| `/rankativo` · `/rankinativos` · `/atividades` | Atividade dos membros |
| `/esporte_noticias` | Notícias de esporte |
| `/celular Xiaomi` | Busca celulares por marca |
| `/tempo cidade` | Previsão do tempo |

</details>

<details>
<summary><b>⚡ Comandos gerais</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/play nome` ou `/musica nome` | Busca a música e mostra os botões **🎵 Áudio · 🎬 Vídeo · 📄 Documento** |
| `/musica-aleatoria` | Sorteia uma música por estilo e cantor |
| `/gtts idioma texto` | Transforma texto em áudio |
| `/tomp3` | Converte vídeo ou áudio em MP3 |
| `/s` · `/sticker` · `/figurinha` | Cria figurinha |
| `/gif` · `/f` · `/toimg` | Converte figurinha, imagem ou vídeo |
| `/artenome` · `/artenomegif` | Escreve um nome na foto (parado ou animado) |
| `/meme` | Busca meme por descrição |
| `/signo` | Horóscopo |
| `/casal` | Forma um casal |
| `/loja` | Abre a loja |
| `/duelo` · `/roleta` | Jogos de disputa |
| `/sortear` | Sorteia entre opções |
| `/spam` | Envia mensagens repetidas |
| `/resgatar` | Resgata um token |

</details>

<details>
<summary><b>🛡️ Moderação e dono</b></summary>

<br/>

| Comando | Descrição |
|---|---|
| `/warn @pessoa` · `/unwarn @pessoa` | Dá ou tira advertência |
| `/mute @pessoa` · `/unmute @pessoa` | Silencia ou libera alguém |
| `/autoban 1/0` | Liga ou desliga o banimento automático |
| `/manutencao 1/0` | Liga ou desliga o modo manutenção |
| `/backup` | Faz backup dos dados |
| `/configaniversario <mensagem>` | Mensagem de aniversário do grupo |
| `/restart` | Reinicia o bot (dono) |
| `/broadcast <mensagem>` | Envia um aviso a todos (dono) |

</details>

<details>
<summary><b>🔊 Respostas automáticas (sem comando)</b></summary>

<br/>

| Quando | O que a Mikasa faz |
|---|---|
| Alguém diz **"menu"** | Envia o menu em texto, com áudio |
| Alguém diz **"prefixo"** | Responde com um áudio e o prefixo atual. Só **uma vez por pessoa** dentro do tempo configurado, sem repetir |
| Entram no grupo | Boas-vindas com áudio |
| Saem do grupo | Mensagem de despedida |

</details>

---

## 🗂️ Estrutura do projeto

```text
MIKASA-V7/
├── mikasabot.js        # arquivo principal (inicia o bot)
├── config.js           # configurações padrão
├── database/           # configurações salvas e dados
├── auth_info/          # sessão do WhatsApp (não publique!)
└── src/
    ├── audios/         # áudios (menu, entrada, saída, prefixo)
    ├── menuBotoes.js   # menus com botões e listas
    ├── musica.js       # busca e download de música
    ├── ytapi.js        # download de áudio por API
    └── ...             # um arquivo por sistema/comando
```

---

## ❓ Problemas comuns

<details>
<summary><b>🔌 A conexão cai ou pede para apagar a sessão</b></summary>

<br/>

Apague a pasta `auth_info/` e inicie o bot de novo para conectar do zero.

</details>

<details>
<summary><b>🔘 Os botões não aparecem ou o clique não responde</b></summary>

<br/>

Os botões usam um recurso **não oficial** do WhatsApp e dependem da versão do app. Use `menu` (sem prefixo) para abrir o menu em texto, que funciona em qualquer versão.

</details>

<details>
<summary><b>🧩 Erro ao instalar o <code>@napi-rs/canvas</code> no Termux</b></summary>

<br/>

É uma dependência nativa e pode falhar em algumas configurações de Termux/ARM64. Atualize os pacotes (`pkg update && pkg upgrade`), confira se está usando Node.js 20+ e rode `npm install` de novo. Se continuar, abra uma issue com o erro completo.

</details>

<details>
<summary><b>🎵 A música não baixa</b></summary>

<br/>

Confira se o `ffmpeg` está instalado (`ffmpeg -version`). Para **vídeo** e **documento**, e como reserva do áudio, confira o `yt-dlp` com `yt-dlp --version` e mantenha atualizado com `pip install -U yt-dlp`.

</details>

<details>
<summary><b>🔁 O bot respondeu "prefixo" só uma vez</b></summary>

<br/>

É proposital: para não virar spam, ele responde uma vez por pessoa e só responde de novo depois do tempo definido em `PREFIXO_COOLDOWN_SEG` (padrão: 60 segundos).

</details>

---

## 👨‍💻 Criador

<div align="center">

**Doctor Valeyard C'rizz Lunático**

[![Canal no WhatsApp](https://img.shields.io/badge/Canal-WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://whatsapp.com/channel/0029VbEHp6CFHWpymLOJGZ28)

</div>

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

<div align="center">

<br/>

⭐ **Se o projeto te ajudou, deixe uma estrela no repositório!** ⭐

<img src="https://capsule-render.vercel.app/api?type=venom&color=gradient&customColorList=12,20,24&height=120&section=footer" alt="" />

</div>
