// src/gp.js - MENSAGEM GRANDE PROFESSOR
const mensagens = [
    "Ouçam bem, alunos! Vou ensinar uma coisa importante! 📚",
    "Como Grande Professor, digo: foco nos estudos! 🎓",
    "Lição do dia: respeitem o conhecimento! 🧠",
    "Tempo de aprender algo novo, pessoal! 💡",
    "Sabedoria é o melhor tesouro! ✨"
];

const mensagem = mensagens[Math.floor(Math.random() * mensagens.length)];
module.exports = { mensagem };
