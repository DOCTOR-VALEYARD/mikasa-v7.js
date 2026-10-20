// src/bu.js - MENSAGEM ALEATÓRIA (usada pelo comando de disparo "bu")
const mensagens = [
    "Buuu! 👻",
    "Te assustei? 😈",
    "Olha atrás de você... 👀",
    "Calma, é só o bot passando por aqui! 🤖",
    "Bu! Agora você vai ficar pensando nisso. 😂"
];

const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];

module.exports = { mensagem };
