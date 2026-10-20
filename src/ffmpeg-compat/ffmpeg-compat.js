/* =================================================
   🎞️ MIKASA BOT — COMPATIBILIDADE COM QUALQUER VERSÃO DO FFMPEG
   O ffmpeg novo (7.x, o que vem no Termux) REMOVEU a opção "-vsync"; o antigo (< 5.1) ainda
   não conhece "-fps_mode". Aqui o bot descobre a versão e usa a opção certa.
     semSincronia()       → ["-fps_mode","passthrough"]  ou  ["-vsync","0"]   (lista de argumentos)
     semSincroniaTexto()  → "-fps_mode passthrough"      ou  "-vsync 0"       (pra comandos em texto)
================================================= */
const { execFileSync } = require("child_process");

let usaFpsMode = null;

function detectar() {
    if (usaFpsMode !== null) return usaFpsMode;
    try {
        const saida = execFileSync("ffmpeg", ["-version"], { encoding: "utf8", timeout: 8000 });
        const m = saida.match(/version\D*?(\d+)\.(\d+)/i);
        if (m) {
            const maior = Number(m[1]), menor = Number(m[2]);
            usaFpsMode = maior > 5 || (maior === 5 && menor >= 1);
        } else {
            usaFpsMode = true; // versão de desenvolvimento (git): é nova
        }
    } catch {
        usaFpsMode = true;
    }
    return usaFpsMode;
}

const semSincronia = () => detectar() ? ["-fps_mode", "passthrough"] : ["-vsync", "0"];
const semSincroniaTexto = () => semSincronia().join(" ");

module.exports = { semSincronia, semSincroniaTexto };
