// src/kill.js - MENSAGEM AÇÃO
const mensagens = [
    "*Explode em confete* 💥🎉",
    "*Desaparece em pó mágico* ✨💨",
    "*Cai dramaticamente no chão* 🎭",
    "*Vira cinzas e levanta novamente* 🔥",
    "*Faz uma pirueta épica e some* 🌪️"
];

const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];
module.exports = { mensagem };
