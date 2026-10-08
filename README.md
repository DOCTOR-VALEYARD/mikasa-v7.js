<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=230&section=header&text=MIKASA%20BOT&fontSize=70&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Bot%20de%20WhatsApp%20multifuncional&descAlignY=60&descSize=20" alt="Mikasa Bot" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&duration=3200&pause=900&color=F72585&center=true&vCenter=true&width=640&lines=%F0%9F%8C%B9+Eleg%C3%A2ncia+e+atitude+no+seu+WhatsApp;%F0%9F%A4%96+Menus+com+bot%C3%B5es+e+listas+interativas;%F0%9F%9B%A1%EF%B8%8F+Antilink%2C+antifake%2C+antidelete+e+mais;%F0%9F%8E%B5+M%C3%BAsica%2C+figurinhas%2C+jogos+e+IA;%F0%9F%93%B1+Feito+pra+rodar+no+Termux" alt="Digitando..." />
</a>

<br/>

![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-7.0.0--rc.9-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)
![Termux](https://img.shields.io/badge/Termux-Android-000000?style=for-the-badge&logo=android&logoColor=3DDC84)
![Licença](https://img.shields.io/badge/Licen%C3%A7a-MIT-F72585?style=for-the-badge)
![Versão](https://img.shields.io/badge/Vers%C3%A3o-8.0.0-9B5DE5?style=for-the-badge)

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

A **Mikasa Bot** é um bot de WhatsApp multifuncional feito em **Node.js** com a biblioteca [Baileys](https://github.com/WhiskeySockets/Baileys). Ela traz menus interativos com botões e listas, ferramentas de administração de grupo, sistema de nível e moedas, jogos, download de música, figurinhas e uma IA com personalidade própria.

Todos os recursos são **gratuitos**: não existe sistema de VIP nem de pagamento.

---

## ✨ Recursos

| | Categoria | O que tem |
|:-:|---|---|
| 🤖 | **IA** | Mikasa responde conversas com personalidade própria (precisa de uma chave de API, veja [Configuração](#️-configuração)) |
| 📋 | **Menus interativos** | Menu principal com botões e listas do WhatsApp, separado por categorias |
| 🛡️ | **Proteções de grupo** | Antilink, antifake, antinota, anti-NSFW, antidelete, antiloop e x9 (visualização única) |
| 👋 | **Boas-vindas** | Mensagens de entrada e saída, com áudios e figurinhas |
| 🎮 | **Jogos** | Forca, adivinha, quiz, jogo da velha, duelo, roleta e mais |
| 💰 | **Economia e nível** | XP, nível, gold, perfil, ranking, loja e missões |
| 🎵 | **Música e mídia** | Download de áudio, conversão para MP3, figurinhas e GIFs |
| 📊 | **Relatórios** | Ranking de ativos e inativos, relatório diário de atividade |
| ⚙️ | **Painel de configuração** | Troca de prefixo, nome, criador e chaves direto pelo WhatsApp |

---

## 📲 Instalação no Termux

> [!NOTE]
> Requer **Node.js 20 ou superior**. Os passos abaixo são para o **Termux** (Android), mas o bot também roda em qualquer Linux com Node.js.

**1️⃣ Prepare o Termux**

```bash
pkg update -y && pkg upgrade -y
pkg install -y nodejs git ffmpeg python
pip install yt-dlp
```

**2️⃣ Baixe o projeto**

```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd SEU_REPOSITORIO
```

**3️⃣ Instale as dependências**

```bash
npm install
```

**4️⃣ Inicie o bot**

```bash
npm start
```

---

## 👑 Primeira execução

Na primeira vez que você iniciar o bot, ele faz uma configuração rápida **direto no terminal**:

1. 👑 **Número do criador:** o bot pergunta qual número será o **criador**. Esse número pode ser **diferente** do número que vai conectar o bot ao WhatsApp. Ele aparece nos menus e no botão "Falar com o criador".
2. 📛 **Nome do criador (opcional):** digite um nome ou aperte `ENTER` para manter o padrão.
3. 🔗 **Forma de conexão:** escolha entre **QR Code** ou **Código de pareamento**.

```text
➜ 5511999998888
✅ O criador será +5511999998888. Está certo? [S/n]
```

Depois disso, o bot guarda tudo em `database/botconfig.json` e **não pergunta de novo**.

<details>
<summary><b>🔄 Quero trocar o número do criador depois</b></summary>

<br/>

- Pelo WhatsApp, use o comando `configurar-bot numero SEU_NUMERO`.
- Ou apague a linha `OWNER_CONFIGURADO` do arquivo `database/botconfig.json` e reinicie o bot para ele perguntar de novo.

</details>

---

## ⚙️ Configuração

As configurações padrão ficam no `config.js`. O que for alterado pelo bot fica salvo em `database/botconfig.json` e tem prioridade.

| Opção | Descrição |
|---|---|
| `PREFIX` | Prefixo dos comandos (também dá para mudar com `configurar-bot prefixo`) |
| `BOT_NAME` | Nome do bot nos menus e mensagens |
| `OWNER_NUMBER` / `OWNER_NAME` | Número e nome do criador (preenchidos na primeira execução) |
| `OPEN_ACCESS` | `true` = qualquer pessoa usa qualquer comando. `false` = comandos de dono só para o criador |
| `AI_ATIVA` / `AI_API_KEY` | Liga a IA e define a chave da API |
| `MUSICA` | Binário de download (`yt-dlp`), qualidade e duração máxima |

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

Sem chave, o bot funciona normalmente, apenas sem as respostas de IA.

> [!WARNING]
> **Nunca publique sua chave de API nem a pasta `auth_info/`** (ela guarda a sessão do seu WhatsApp). O `.gitignore` do projeto já ignora `auth_info/`.

### 🔓 Sobre o `OPEN_ACCESS`

Por padrão o modo aberto vem **ligado**, ou seja, qualquer pessoa que falar com o bot pode usar todos os comandos, inclusive `restart`, `desligar` e `broadcast`. Se você hospeda o bot para um grupo grande, considere colocar `OPEN_ACCESS` como `false` no `config.js`.

---

## 📜 Comandos

<!-- ======================================================
     ÁREA DOS COMANDOS
     Cole os comandos aqui, uma categoria por bloco.
     Modelo de tabela (copie e repita para cada categoria):

     ### 🛡️ Administração
     | Comando | Descrição |
     |---|---|
     | `/exemplo` | O que o comando faz |
     ====================================================== -->

> 🚧 A lista completa de comandos será adicionada aqui em breve.

---

## ❓ Problemas comuns

<details>
<summary><b>🔌 A conexão cai ou pede para apagar a sessão</b></summary>

<br/>

Apague a pasta `auth_info/` e inicie o bot de novo para conectar do zero.

</details>

<details>
<summary><b>🧩 Erro ao instalar o <code>@napi-rs/canvas</code> no Termux</b></summary>

<br/>

É uma dependência nativa e pode falhar em algumas configurações de Termux/ARM64. Atualize os pacotes (`pkg update && pkg upgrade`), confira se está usando Node.js 20+ e tente `npm install` novamente. Se continuar, abra uma issue com o erro completo.

</details>

<details>
<summary><b>🎵 Música não baixa</b></summary>

<br/>

Confira se o `yt-dlp` e o `ffmpeg` estão instalados (`yt-dlp --version` e `ffmpeg -version`). Mantenha o `yt-dlp` atualizado com `pip install -U yt-dlp`.

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

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=12,20,24&height=120&section=footer" alt="" />

</div>
