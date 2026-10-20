// src/tra.js - MENSAGEM ALEATÓRIA LEGAL
const mensagens = [
    "Trapos não servem para nada! 😂",
    "Que comentário mais fraco hein! 💀",
    "Tá bom, tá bom, acalmem os ânimos! 🤐",
    "Isso é um ataque pessoal? 😱",
    "Vocês acreditam nisso? Hilário! 🤣",
    "Fala sério agora, vocês são amadores! 🎭"
];

const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];
module.exports = { mensagem };
