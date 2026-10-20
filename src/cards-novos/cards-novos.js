/* =================================================
   🎨 MIKASA BOT — CARDS NOVOS (canvas)
   • Menu principal  → card roxo/neon da Mikasa
   • Menu por tema   → mesmo estilo, com a cor + emblema de cada categoria
   • Saída           → cartaz "DESAPARECIDO(A) / RECOMPENSA" (foto livre, sem carimbo em cima)
   • Solicitação     → passe/crachá "PEDIDO DE ENTRADA" (estilo diferente do jornal)
   Tudo desenhado com fontes que vão junto no projeto (src/midias/assets/fonts).
================================================= */
const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");
const fs = require("fs");
const path = require("path");

const PASTA_FONTES = path.join(__dirname, "../midias/assets/fonts");
(function fontes() {
    const reg = (arq, fam) => { try { const p = path.join(PASTA_FONTES, arq); if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, fam); } catch {} };
    reg("Poppins-Bold.ttf", "MK Poppins");
    reg("Poppins-Regular.ttf", "MK Poppins Reg");
    reg("LiberationSerif-Bold.ttf", "MK Serif");
    reg("LiberationSerif-Italic.ttf", "MK Serif It");
    reg("LiberationSerif-Regular.ttf", "MK Serif Reg");
})();
const B = "MK Poppins, DejaVu Sans, sans-serif";
const R = "MK Poppins Reg, DejaVu Sans, sans-serif";
const SB = "MK Serif, Times New Roman, DejaVu Serif, serif";
const SI = "MK Serif It, Times New Roman, DejaVu Serif, serif";
const SR = "MK Serif Reg, Times New Roman, DejaVu Serif, serif";

// ───────────── utilitários ─────────────
function limpar(t) {
    return String(t || "").normalize("NFKD").replace(/[̀-ͯ*_~`]/g, "").replace(/\s+/g, " ").trim();
}
// tira emoji/símbolos do começo ("🎵 MÚSICAS" → "MÚSICAS")
function semEmoji(t) {
    return String(t || "").replace(/[^\p{L}\p{N}\s\-\/&'.]/gu, "").replace(/\s+/g, " ").trim();
}
function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fit(ctx, texto, familia, max, ini, min = 12, estilo = "") {
    let t = ini;
    ctx.font = `${estilo} ${t}px ${familia}`.trim();
    while (ctx.measureText(texto).width > max && t > min) { t -= 2; ctx.font = `${estilo} ${t}px ${familia}`.trim(); }
    return t;
}
function cortar(ctx, texto, max) {
    let t = String(texto);
    if (ctx.measureText(t).width <= max) return t;
    while (t.length > 2 && ctx.measureText(t + "…").width > max) t = t.slice(0, -1);
    return t.trimEnd() + "…";
}
function quebrar(ctx, texto, max, maxLinhas = 2) {
    const pal = String(texto).split(/\s+/), linhas = [];
    let atual = "";
    for (const p of pal) {
        const teste = atual ? atual + " " + p : p;
        if (ctx.measureText(teste).width <= max || !atual) atual = teste; else { linhas.push(atual); atual = p; }
    }
    if (atual) linhas.push(atual);
    if (linhas.length > maxLinhas) { linhas.length = maxLinhas; linhas[maxLinhas - 1] = cortar(ctx, linhas[maxLinhas - 1] + "…", max); }
    return linhas;
}
async function img(buf) {
    if (!buf) return null;
    try { return await loadImage(buf); } catch { return null; }
}
function cobrir(ctx, im, x, y, w, h) {
    const e = Math.max(w / im.width, h / im.height);
    const iw = im.width * e, ih = im.height * e;
    ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}
function brilho(ctx, x, y, r, cor = "255,255,255", a = 0.9) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = `rgba(${cor},${a})`;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) { const ang = i * Math.PI / 4, rad = i % 2 ? r * 0.22 : r; ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad); }
    ctx.closePath(); ctx.fill(); ctx.restore();
}
function escurecer(hex, f) {
    const n = parseInt(hex.replace("#", ""), 16);
    const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function clarear(hex, f) {
    const n = parseInt(hex.replace("#", ""), 16);
    const c = v => Math.round(v + (255 - v) * f);
    return "#" + [c(n >> 16), c((n >> 8) & 255), c(n & 255)].map(v => v.toString(16).padStart(2, "0")).join("");
}
function semente(str) { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return () => ((h = (h * 1664525 + 1013904223) >>> 0) / 4294967296); }


// ⚡ raio e 💀 caveira desenhados à mão (sem emoji, funcionam em qualquer aparelho)
function raio(ctx, cx, cy, h, cor, brilhoCor) {
    ctx.save(); ctx.translate(cx, cy);
    const k = h / 100;
    const pts = [[8, -50], [-26, 6], [-4, 6], [-14, 50], [28, -10], [4, -10], [22, -50]];
    ctx.shadowColor = brilhoCor || cor; ctx.shadowBlur = 24;
    ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)); ctx.closePath();
    const g = ctx.createLinearGradient(0, -50 * k, 0, 50 * k); g.addColorStop(0, "#ffffff"); g.addColorStop(1, cor);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.stroke();
    ctx.restore();
}
function caveira(ctx, cx, cy, t, cor = "#f3ecff", fundo = "#12051f", brilhoCor = "#8b3dff") {
    ctx.save(); ctx.translate(cx, cy);
    const k = t / 100;
    ctx.shadowColor = brilhoCor; ctx.shadowBlur = 26;
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.ellipse(0, -8 * k, 46 * k, 44 * k, 0, 0, Math.PI * 2); ctx.fill();   // crânio
    ctx.beginPath(); ctx.moveTo(-26 * k, 24 * k); ctx.lineTo(26 * k, 24 * k); ctx.lineTo(22 * k, 52 * k); ctx.lineTo(-22 * k, 52 * k); ctx.closePath(); ctx.fill(); // mandíbula
    ctx.shadowBlur = 0;
    ctx.fillStyle = fundo;
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * 18 * k, -6 * k, 13 * k, 15 * k, 0, 0, Math.PI * 2); ctx.fill(); } // olhos
    ctx.beginPath(); ctx.moveTo(0, 8 * k); ctx.lineTo(-7 * k, 24 * k); ctx.lineTo(7 * k, 24 * k); ctx.closePath(); ctx.fill();            // nariz
    ctx.strokeStyle = fundo; ctx.lineWidth = 3.2 * k;                                                                                  // dentes
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 9 * k, 34 * k); ctx.lineTo(i * 9 * k, 52 * k); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-22 * k, 40 * k); ctx.lineTo(22 * k, 40 * k); ctx.stroke();
    ctx.restore();
}

// ───────────── fundo "Mikasa" (roxo escuro + neon) ─────────────
function fundoNeon(ctx, W, H, cor, cor2) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, escurecer(cor, 0.30)); g.addColorStop(0.55, escurecer(cor, 0.14)); g.addColorStop(1, "#06030c");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // luzes
    for (const [x, y, r, c, a] of [[W * 0.15, H * 0.2, 420, cor, 0.38], [W * 0.92, H * 0.95, 460, cor2 || cor, 0.30]]) {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, "0")); rg.addColorStop(1, c + "00");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    // listras diagonais
    ctx.save(); ctx.globalAlpha = 0.045; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    for (let x = -H; x < W; x += 34) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
    ctx.restore();
    // brilhos
    const rnd = semente(cor + W);
    for (let i = 0; i < 26; i++) brilho(ctx, rnd() * W, rnd() * H, 2 + rnd() * 5, "255,255,255", 0.15 + rnd() * 0.5);
}
function moldura(ctx, W, H, cor, cor2) {
    ctx.save();
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, cor2 || "#ff4fd8"); g.addColorStop(0.5, cor); g.addColorStop(1, cor2 || "#ff4fd8");
    ctx.shadowColor = cor; ctx.shadowBlur = 26;
    rr(ctx, 16, 16, W - 32, H - 32, 30); ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.stroke();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.35;
    rr(ctx, 28, 28, W - 56, H - 56, 22); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
}
function barraInferior(ctx, W, H, texto, cor, cor2) {
    ctx.save();
    rr(ctx, 16, H - 92, W - 32, 76, 30); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, cor); g.addColorStop(1, cor2 || cor);
    ctx.fillStyle = g; ctx.fillRect(16, H - 92, W - 32, 76);
    const br = ctx.createLinearGradient(0, H - 92, 0, H - 16);
    br.addColorStop(0, "rgba(255,255,255,0.22)"); br.addColorStop(1, "rgba(0,0,0,0.18)");
    ctx.fillStyle = br; ctx.fillRect(16, H - 92, W - 32, 76);
    ctx.restore();
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    fit(ctx, texto, B, W - 120, 30, 16);
    ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 6;
    ctx.fillText(texto, W / 2, H - 53);
    ctx.shadowBlur = 0; ctx.textBaseline = "alphabetic";
}
function chip(ctx, x, y, w, h, cor, texto, tam = 22) {
    ctx.save();
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = "rgba(255,255,255,0.07)"; ctx.fill();
    ctx.strokeStyle = cor; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(x + h / 2, y + h / 2, h * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    fit(ctx, texto, B, w - h - 12, tam, 12);
    ctx.fillText(texto, x + h * 0.78, y + h / 2 + 1);
    ctx.restore(); ctx.textBaseline = "alphabetic";
}
async function quadroArte(ctx, arte, x, y, w, h, cor, cor2) {
    ctx.save();
    ctx.shadowColor = cor; ctx.shadowBlur = 34;
    rr(ctx, x, y, w, h, 26); ctx.fillStyle = "#0b0614"; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.save(); rr(ctx, x, y, w, h, 26); ctx.clip();
    const im = await img(arte);
    if (im) cobrir(ctx, im, x, y, w, h);
    else { const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, cor); g.addColorStop(1, "#0b0614"); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
    const v = ctx.createLinearGradient(0, y + h * 0.6, 0, y + h);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
    ctx.restore();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, cor2 || "#ff4fd8"); g.addColorStop(1, cor);
    rr(ctx, x, y, w, h, 26); ctx.strokeStyle = g; ctx.lineWidth = 5; ctx.stroke();
    ctx.restore();
}

// ═════════════ 1) MENU PRINCIPAL ═════════════
const COR_MIKASA = "#8b3dff", COR_MIKASA2 = "#ff3fb4";

async function criarCardMenuPrincipal({ botName, ownerName, prefix, totalComandos, arteBuffer }) {
    const W = 1000, H = 640, c = createCanvas(W, H), ctx = c.getContext("2d");
    fundoNeon(ctx, W, H, COR_MIKASA, COR_MIKASA2);
    moldura(ctx, W, H, COR_MIKASA, COR_MIKASA2);

    // arte da Mikasa
    await quadroArte(ctx, arteBuffer, 52, 64, 330, 330, COR_MIKASA, COR_MIKASA2);
    // plaquinha embaixo da arte
    rr(ctx, 52, 418, 330, 100, 22); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = "#fff"; ctx.font = `bold 24px ${B}`; ctx.fillText("BOT DE WHATSAPP", 217, 458);
    ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `17px ${R}`; ctx.fillText("criado por DOCTOR VALEYARD", 217, 488);
    ctx.textAlign = "left";

    // coluna da direita
    const tx = 420, larg = W - tx - 52;
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    // etiqueta
    const et = "MENU PRINCIPAL";
    ctx.font = `bold 20px ${B}`;
    const ew = ctx.measureText(et).width + 44;
    rr(ctx, tx, 58, ew, 38, 19);
    const ge = ctx.createLinearGradient(tx, 0, tx + ew, 0); ge.addColorStop(0, COR_MIKASA); ge.addColorStop(1, COR_MIKASA2);
    ctx.fillStyle = ge; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(et, tx + 22, 78);
    // ONLINE
    ctx.fillStyle = "#3dff9a"; ctx.beginPath(); ctx.arc(tx + ew + 30, 78, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#b8ffd9"; ctx.font = `bold 18px ${B}`; ctx.fillText("NO AR", tx + ew + 46, 79);
    ctx.textBaseline = "alphabetic";

    // título
    const nome = (limpar(botName) || "MIKASA BOT").toUpperCase();
    const tam = fit(ctx, nome, B, larg, 84, 36, "bold");
    const gt = ctx.createLinearGradient(tx, 0, tx + larg, 0); gt.addColorStop(0, "#ffffff"); gt.addColorStop(1, "#e2c8ff");
    ctx.shadowColor = COR_MIKASA; ctx.shadowBlur = 22;
    ctx.fillStyle = gt; ctx.fillText(nome, tx, 98 + tam);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.78)"; ctx.font = `22px ${R}`;
    ctx.fillText("Tudo o que o bot faz, em um toque só.", tx, 98 + tam + 38);

    // ⚡💀 painel de raios e caveiras (no lugar da lista de categorias)
    const py0 = 98 + tam + 62, ph = 462 - py0;
    ctx.save();
    rr(ctx, tx, py0, larg, ph, 26);
    const gp = ctx.createLinearGradient(tx, py0, tx + larg, py0 + ph);
    gp.addColorStop(0, "rgba(139,61,255,0.22)"); gp.addColorStop(1, "rgba(255,63,180,0.14)");
    ctx.fillStyle = gp; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.clip();
    // raios pequenos de fundo
    const rn = semente("raios" + larg);
    for (let n = 0; n < 9; n++) { ctx.globalAlpha = 0.12 + rn() * 0.16; raio(ctx, tx + 30 + rn() * (larg - 60), py0 + 20 + rn() * (ph - 40), 26 + rn() * 30, "#c9a7ff"); }
    ctx.globalAlpha = 1;
    const cx0 = tx + larg / 2, cy0 = py0 + ph / 2;
    raio(ctx, cx0 - 190, cy0, ph * 0.80, "#b58bff", "#8b3dff");
    raio(ctx, cx0 + 190, cy0, ph * 0.80, "#ff7ad1", "#ff3fb4");
    caveira(ctx, cx0 - 92, cy0 + 6, ph * 0.46, "#f3ecff", "#12051f", "#8b3dff");
    caveira(ctx, cx0 + 92, cy0 + 6, ph * 0.46, "#f3ecff", "#12051f", "#ff3fb4");
    caveira(ctx, cx0, cy0 - 4, ph * 0.74, "#ffffff", "#12051f", "#c084fc");
    ctx.restore();

    // estatísticas
    const ys = 500;
    const stats = [[String(totalComandos || 0), "COMANDOS"], [prefix || "!", "PREFIXO"], [(limpar(ownerName) || "DOUTOR").split(" ").slice(0, 2).join(" ").toUpperCase(), "DONO"]];
    const sw = (larg - 20) / 3;
    stats.forEach(([v, l], i) => {
        const x = tx + i * (sw + 10);
        rr(ctx, x, ys - 26, sw, 62, 16); ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
        ctx.textAlign = "center";
        ctx.fillStyle = "#fff"; fit(ctx, v, B, sw - 16, 28, 14, "bold"); ctx.fillText(v, x + sw / 2, ys + 8);
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.font = `bold 12px ${B}`; ctx.fillText(l, x + sw / 2, ys + 26);
    });
    ctx.textAlign = "left";

    barraInferior(ctx, W, H, "TOQUE EM  ABRIR MENU  E ESCOLHA O COMANDO", COR_MIKASA, COR_MIKASA2);
    return c.encode("png");
}
function semeEmoji(ct) { return semEmoji(ct.nome).toUpperCase() + (ct.qtd ? `  ·  ${ct.qtd}` : ""); }

// ═════════════ 2) MENU POR CATEGORIA ═════════════
function hexagono(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
    ctx.closePath();
}
function cantoTecnico(ctx, x, y, dx, dy, cor) {
    ctx.save(); ctx.strokeStyle = cor; ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + dx * 54, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * 54); ctx.stroke(); ctx.restore();
}

async function criarCardMenuCategoria({ tema = {}, botName, prefix, total, amostra = [], secoesTitulos = [], arteBuffer, desenharEmblema }) {
    const W = 1000, H = 640, c = createCanvas(W, H), ctx = c.getContext("2d");
    const cor = tema.cor || COR_MIKASA;
    const cor2 = clarear(cor.length === 7 ? cor : COR_MIKASA, 0.40);
    fundoNeon(ctx, W, H, cor, cor2);

    // malha de hexágonos (marca d'água)
    ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    for (let row = 0; row < 12; row++) for (let col = 0; col < 14; col++) { hexagono(ctx, col * 78 + (row % 2 ? 39 : 0), row * 68, 38); ctx.stroke(); }
    ctx.restore();
    moldura(ctx, W, H, clarear(cor, 0.15), cor2);
    cantoTecnico(ctx, 48, 48, 1, 1, cor2); cantoTecnico(ctx, W - 48, 48, -1, 1, cor2);

    // emblema grande com raios de luz e órbitas
    const ex = 190, ey = 285;
    ctx.save(); ctx.translate(ex, ey);
    for (let i = 0; i < 24; i++) {
        ctx.rotate(Math.PI / 12);
        const g = ctx.createLinearGradient(0, 0, 190, 0); g.addColorStop(0, "rgba(255,255,255,0.20)"); g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(190, -9); ctx.lineTo(190, 9); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    for (const [r, a] of [[150, 0.10], [124, 0.16], [102, 0.26]]) { ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.arc(ex, ey, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 2; ctx.setLineDash([6, 10]); ctx.beginPath(); ctx.arc(ex, ey, 168, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    for (const a of [0.5, 2.2, 4.1]) { ctx.fillStyle = cor2; ctx.shadowColor = cor2; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 168, ey + Math.sin(a) * 168, 8, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; }
    if (typeof desenharEmblema === "function") { try { desenharEmblema(ctx, tema.icone, ex, ey, 100, cor); } catch {} }
    // raios decorativos ao lado do emblema
    raio(ctx, 322, 150, 56, "#ffffff", cor2);

    // arte do bot (canto)
    const im = await img(arteBuffer);
    if (im) {
        ctx.save(); ctx.beginPath(); ctx.arc(W - 100, 100, 52, 0, Math.PI * 2); ctx.clip(); cobrir(ctx, im, W - 152, 48, 104, 104); ctx.restore();
        ctx.strokeStyle = cor2; ctx.lineWidth = 4; ctx.shadowColor = cor2; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(W - 100, 100, 52, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
    }

    const tx = 392;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const nomeBot = (limpar(botName) || "MIKASA").toUpperCase();
    const et = `${nomeBot}  ·  MENU`;
    ctx.font = `bold 18px ${B}`;
    const ew = ctx.measureText(et).width + 36;
    rr(ctx, tx, 58, ew, 34, 17); ctx.fillStyle = "rgba(255,255,255,0.14)"; ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillText(et, tx + 18, 76);
    ctx.textBaseline = "alphabetic";

    const titulo = semEmoji(tema.titulo || "MENU").toUpperCase();
    const tam = fit(ctx, titulo, B, W - tx - 175, 74, 32, "bold");
    ctx.shadowColor = cor; ctx.shadowBlur = 26; ctx.fillStyle = "#fff";
    ctx.fillText(titulo, tx, 104 + tam);
    ctx.shadowBlur = 0;
    const gu = ctx.createLinearGradient(tx, 0, tx + 320, 0); gu.addColorStop(0, cor2); gu.addColorStop(1, cor2 + "00");
    ctx.fillStyle = gu; ctx.fillRect(tx, 112 + tam, 320, 6);
    ctx.fillStyle = "rgba(255,255,255,0.88)"; ctx.font = `23px ${R}`;
    let y = 112 + tam + 46;
    for (const l of quebrar(ctx, tema.subtitulo || "Escolha o que você quer fazer.", W - tx - 70, 2)) { ctx.fillText(l, tx, y); y += 30; }

    // seções (etiquetas)
    const tags = secoesTitulos.map(semEmoji).filter(Boolean).slice(0, 6);
    let tx2 = tx, ty = y + 10;
    ctx.font = `bold 15px ${B}`;
    for (const t of tags) {
        const w = ctx.measureText(t.toUpperCase()).width + 26;
        if (tx2 + w > W - 52) { tx2 = tx; ty += 36; }
        rr(ctx, tx2, ty, w, 28, 14); ctx.fillStyle = "rgba(0,0,0,0.38)"; ctx.fill(); ctx.strokeStyle = cor2; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(t.toUpperCase(), tx2 + 13, ty + 15); ctx.textBaseline = "alphabetic";
        tx2 += w + 8;
    }
    y = ty + 44;

    // exemplos de comandos
    const ex2 = amostra.slice(0, 6);
    const cw = (W - tx - 52 - 12) / 2, ch = 44;
    ex2.forEach((cm, i) => chip(ctx, tx + (i % 2) * (cw + 12), y + Math.floor(i / 2) * (ch + 10), cw, ch, cor2, `${prefix || "!"}${cm}`, 22));

    // selos
    const sel = [`${total || 0} OPÇÕES`, `ACESSO: ${String(tema.acesso || "Todos").toUpperCase()}`];
    ctx.font = `bold 17px ${B}`;
    let sx = 72; const sy = H - 148;
    for (const s2 of sel) {
        const w = Math.min(ctx.measureText(s2).width + 34, 300);
        rr(ctx, sx, sy, w, 36, 18); ctx.fillStyle = "rgba(0,0,0,0.4)"; ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(cortar(ctx, s2, w - 20), sx + 17, sy + 19); ctx.textBaseline = "alphabetic";
        sx += w + 10;
        if (sx > 330) break;
    }

    barraInferior(ctx, W, H, "TOQUE EM  VER TUDO  E ESCOLHA O COMANDO", escurecer(cor, 0.9), clarear(cor, 0.1));
    return c.encode("png");
}

// ═════════════ 3) SAÍDA — CARTAZ DESAPARECIDO / RECOMPENSA ═════════════
const RECOMPENSAS = [
    "UM “OBRIGADO” SINCERO", "1 PACOTE DE BOLACHA RECHEADA", "UM ABRAÇO (NÃO GARANTIDO)", "R$ 0,00 + MUITA GRATIDÃO",
    "UM STICKER EXCLUSIVO", "UMA MENSAGEM NO PRIVADO", "1 CAFEZINHO VIRTUAL", "O PERDÃO DE TODOS OS ADMINISTRADORES"
];
const CARACT = [
    "Sumiu sem se despedir", "Última mensagem: nenhuma", "Visto(a) pela última vez na lista de membros", "Costumava ler e não responder",
    "Desapareceu sem deixar rastros", "Pode estar offline há dias"
];

async function fotoPB(ctx, buf, x, y, tam) {
    const im = await img(buf);
    const t = createCanvas(tam, tam), g = t.getContext("2d");
    if (im) {
        cobrir(g, im, 0, 0, tam, tam);
        const d = g.getImageData(0, 0, tam, tam), p = d.data;
        for (let i = 0; i < p.length; i += 4) {
            let l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
            l = Math.max(0, Math.min(255, (l - 128) * 1.25 + 128));
            p[i] = Math.min(255, l * 1.04 + 6); p[i + 1] = l * 0.97; p[i + 2] = l * 0.84;
        }
        g.putImageData(d, 0, 0);
    } else {
        g.fillStyle = "#b9b2a0"; g.fillRect(0, 0, tam, tam);
        g.fillStyle = "#7f7869";
        g.beginPath(); g.arc(tam / 2, tam * 0.38, tam * 0.17, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(tam / 2, tam * 1.02, tam * 0.36, Math.PI, 0); g.fill();
        g.fillStyle = "rgba(255,255,255,0.8)"; g.font = `bold ${Math.round(tam * 0.2)}px ${SB}`; g.textAlign = "center"; g.fillText("?", tam / 2, tam * 0.45);
    }
    ctx.drawImage(t, x, y);
}

async function criarCartazDesaparecido({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros, tempoNoGrupo, motivo }) {
    const removido = motivo === "removido";
    // formato QUADRADO (nunca mais alto que largo)
    const W = 1000, H = 1000, c = createCanvas(W, H), ctx = c.getContext("2d");
    const INK = "#1b1a17", RED = "#b3121c";
    ctx.fillStyle = "#e8dcc0"; ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vig.addColorStop(0, "rgba(255,250,235,0)"); vig.addColorStop(1, "rgba(120,90,45,0.40)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    const rnd = semente(String(nomeUsuario) + H);
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(90,70,40,${rnd() * 0.12})`; ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.lineWidth = 2; ctx.strokeRect(34, 34, W - 68, H - 68);

    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK; ctx.font = `bold 21px ${SB}`;
    ctx.fillText(removido ? "★  AVISO À POPULAÇÃO  ★" : "★  ATENÇÃO, MORADORES DO GRUPO  ★", W / 2, 80);
    const titulo = removido ? "BANIDO(A)" : "DESAPARECIDO(A)";
    ctx.fillStyle = RED;
    const tam = fit(ctx, titulo, SB, W - 120, 118, 60, "bold");
    ctx.fillText(titulo, W / 2, 80 + tam * 0.92);
    const yr = 80 + tam + 2;
    ctx.fillStyle = INK; ctx.fillRect(60, yr, W - 120, 5); ctx.fillRect(60, yr + 11, W - 120, 2);
    ctx.font = `italic 27px ${SI}`;
    ctx.fillText(removido ? "Foi retirado(a) do grupo. Não deixe voltar!" : "Você viu esta pessoa? O grupo sente a sua falta!", W / 2, yr + 46);

    // foto à esquerda — livre, nada por cima
    const fs = 360, fx = 84, fy = yr + 104;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 7;
    ctx.fillStyle = "#fbf8ef"; ctx.fillRect(fx - 18, fy - 18, fs + 36, fs + 36);
    ctx.restore();
    await fotoPB(ctx, fotoBuffer, fx, fy, fs);
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 3; ctx.strokeRect(fx, fy, fs, fs);
    ctx.fillStyle = "rgba(235,225,170,0.85)";
    for (const [px, py, rot] of [[fx - 16, fy - 16, -0.7], [fx + fs + 16, fy - 16, 0.7]]) { ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillRect(-40, -12, 80, 24); ctx.restore(); }
    // plaquinha com o nome (abaixo da foto)
    const ny = fy + fs + 30;
    ctx.fillStyle = INK; ctx.fillRect(fx - 18, ny, fs + 36, 54);
    ctx.fillStyle = "#f3ead2"; ctx.textBaseline = "middle";
    const nome = `@${limpar(nomeUsuario)}`;
    fit(ctx, nome, SB, fs + 10, 32, 16, "bold"); ctx.fillText(nome, fx + fs / 2, ny + 29);
    ctx.textBaseline = "alphabetic";

    // ficha à direita
    const cx0 = 520, cw0 = W - cx0 - 62;
    ctx.textAlign = "left";
    const itens = [
        ["VISTO(A) POR ÚLTIMO EM", nomeGrupo],
        ["TEMPO DE CASA", tempoNoGrupo || "não informado"],
        ["SITUAÇÃO", removido ? "Removido(a) por um administrador" : "Saiu por conta própria"],
        ["CARACTERÍSTICAS", CARACT[Math.floor(rnd() * CARACT.length)]]
    ];
    let y = fy + 14;
    for (const [r, v] of itens) {
        ctx.fillStyle = RED; ctx.font = `bold 19px ${SB}`; ctx.fillText(r, cx0, y);
        ctx.fillStyle = INK; ctx.font = `26px ${SR}`;
        const ls = quebrar(ctx, String(v), cw0, 2);
        let yy = y + 31;
        for (const l of ls) { ctx.fillText(l, cx0, yy); yy += 30; }
        y = yy + 16;
    }
    // carimbo (na ficha, longe da foto)
    ctx.save(); ctx.translate(cx0 + cw0 / 2, ny + 6); ctx.rotate(-0.12);
    const sel = removido ? "EXPULSO(A)" : "SAIU DO GRUPO";
    ctx.font = `bold 32px ${SB}`; const sw = ctx.measureText(sel).width + 34;
    ctx.strokeStyle = "rgba(179,18,28,0.85)"; ctx.lineWidth = 5; ctx.strokeRect(-sw / 2, -36, sw, 58);
    ctx.fillStyle = "rgba(179,18,28,0.85)"; ctx.textAlign = "center"; ctx.fillText(sel, 0, 8); ctx.restore();

    // recompensa
    const ry = ny + 54 + 26, rh = 100;
    ctx.fillStyle = "rgba(179,18,28,0.08)"; ctx.fillRect(60, ry, W - 120, rh);
    ctx.strokeStyle = RED; ctx.lineWidth = 5; ctx.strokeRect(60, ry, W - 120, rh);
    ctx.lineWidth = 1.5; ctx.strokeRect(69, ry + 9, W - 138, rh - 18);
    ctx.textAlign = "center"; ctx.fillStyle = RED;
    ctx.font = `bold 40px ${SB}`; ctx.fillText("RECOMPENSA", W / 2, ry + 47);
    const premio = removido ? "NUNCA MAIS VER ESSA PESSOA" : RECOMPENSAS[Math.floor(rnd() * RECOMPENSAS.length)];
    ctx.fillStyle = INK; fit(ctx, premio, SB, W - 190, 26, 14, "bold");
    ctx.fillText(premio, W / 2, ry + 82);

    // faixa final
    ctx.fillStyle = INK; ctx.fillRect(34, H - 94, W - 68, 60);
    ctx.fillStyle = "#f3ead2"; ctx.textBaseline = "middle";
    const rodape = `RESTAM ${totalMembros} MEMBROS NO GRUPO  •  INFORMAÇÕES COM OS ADMINISTRADORES`;
    fit(ctx, rodape, SB, W - 110, 22, 12, "bold"); ctx.fillText(rodape, W / 2, H - 63);
    return c.encode("png");
}

// ═════════════ 4) SOLICITAÇÃO — PASSE / CRACHÁ ═════════════
async function criarPasseSolicitacao({ nomeGrupo, nomeSolicitante, fotoSolicitanteBuffer, recusado = false, nomeQuemRecusou = "" }) {
    const W = 1000, H = 560, c = createCanvas(W, H), ctx = c.getContext("2d");
    const cor = recusado ? "#ef3b4f" : "#19c6b7", cor2 = recusado ? "#ff9a5c" : "#4f8cff";
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#07162e"); g.addColorStop(0.6, "#0b2347"); g.addColorStop(1, "#050d1d");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (const [x, y, r, col] of [[W * 0.1, H * 0.1, 380, cor], [W * 0.95, H * 0.9, 420, cor2]]) {
        const rg = ctx.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col + "40"); rg.addColorStop(1, col + "00");
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    }
    // grade sutil
    ctx.save(); ctx.globalAlpha = 0.05; ctx.strokeStyle = "#fff"; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();

    // crachá
    const bx = 44, by = 44, bw = W - 88, bh = H - 88;
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 30;
    rr(ctx, bx, by, bw, bh, 34); ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill(); ctx.restore();
    rr(ctx, bx, by, bw, bh, 34); const gb = ctx.createLinearGradient(bx, by, bx + bw, by + bh); gb.addColorStop(0, cor); gb.addColorStop(1, cor2);
    ctx.strokeStyle = gb; ctx.lineWidth = 4; ctx.stroke();
    // faixa lateral
    ctx.save(); rr(ctx, bx, by, bw, bh, 34); ctx.clip();
    ctx.fillStyle = gb; ctx.fillRect(bx, by, 22, bh);
    // “furo” do crachá
    ctx.restore();
    rr(ctx, W / 2 - 50, by - 6, 100, 22, 11); ctx.fillStyle = "#050d1d"; ctx.fill(); ctx.strokeStyle = gb; ctx.lineWidth = 3; ctx.stroke();

    // avatar
    const ax = 230, ay = 270, ar = 118;
    ctx.save(); ctx.shadowColor = cor; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(ax, ay, ar + 12, 0, Math.PI * 2); ctx.fillStyle = gb; ctx.fill(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
    const im = await img(fotoSolicitanteBuffer);
    if (im) cobrir(ctx, im, ax - ar, ay - ar, ar * 2, ar * 2);
    else {
        ctx.fillStyle = "#16335f"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
        ctx.fillStyle = "#7fa6df"; ctx.beginPath(); ctx.arc(ax, ay - 25, 42, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ax, ay + 120, 78, Math.PI, 0); ctx.fill();
    }
    ctx.restore();

    const tx = 400, larg = bx + bw - tx - 40;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const et = recusado ? "PEDIDO DE ENTRADA  ·  DECIDIDO" : "PEDIDO DE ENTRADA";
    ctx.font = `bold 18px ${B}`; const ew = ctx.measureText(et).width + 36;
    rr(ctx, tx, 96, ew, 34, 17); ctx.fillStyle = gb; ctx.fill();
    ctx.fillStyle = "#04101f"; ctx.fillText(et, tx + 18, 114);
    ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = `22px ${R}`; ctx.fillText("Candidato(a)", tx, 168);
    const nome = `@${limpar(nomeSolicitante)}`;
    ctx.fillStyle = "#fff"; fit(ctx, nome, B, larg, 54, 24, "bold"); ctx.fillText(nome, tx, 222);
    ctx.fillStyle = "rgba(255,255,255,0.65)"; ctx.font = `22px ${R}`; ctx.fillText("quer entrar em", tx, 270);
    ctx.fillStyle = "#fff"; ctx.font = `bold 32px ${B}`;
    let yy = 312;
    for (const l of quebrar(ctx, nomeGrupo, larg, 2)) { ctx.fillText(l, tx, yy); yy += 40; }

    // status
    const st = recusado ? "ENTRADA RECUSADA" : "AGUARDANDO APROVAÇÃO";
    ctx.font = `bold 22px ${B}`; const sw = ctx.measureText(st).width + 64;
    const sy = 396;
    rr(ctx, tx, sy, sw, 48, 24); ctx.fillStyle = recusado ? "rgba(239,59,79,0.18)" : "rgba(25,198,183,0.16)"; ctx.fill();
    ctx.strokeStyle = cor; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(tx + 26, sy + 24, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(st, tx + 46, sy + 25); ctx.textBaseline = "alphabetic";
    if (recusado && nomeQuemRecusou) { ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = `20px ${R}`; ctx.fillText(cortar(ctx, `Decidido por @${limpar(nomeQuemRecusou)}`, larg), tx, sy + 82); }

    // código de barras decorativo
    const rnd = semente(nomeSolicitante + nomeGrupo);
    let bxx = tx + (recusado ? 0 : 0);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    for (let i = 0; i < 46 && bxx < bx + bw - 40; i++) { const w = 2 + Math.floor(rnd() * 5); ctx.fillRect(bxx, by + bh - 62, w, 28); bxx += w + 3; }

    ctx.fillStyle = "rgba(255,255,255,0.55)"; ctx.font = `bold 15px ${B}`; ctx.textAlign = "right";
    ctx.fillText(recusado ? "ADMINISTRADORES • DECISÃO FINAL" : "ADMINISTRADORES • APROVEM OU RECUSEM", bx + bw - 34, by + 54);
    return c.encode("png");
}

// ═════════════ 5) JORNAL GENÉRICO (entrada / solicitação / recusada) — mesmo estilo do cartaz de saída ═════════════
function dataHoraBR() {
    const d = new Date();
    const dia = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });
    const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    return `${dia}, às ${hora}`;
}
async function fotoCor(ctx, buf, x, y, tam) {
    const im = await img(buf);
    const t = createCanvas(tam, tam), g = t.getContext("2d");
    if (im) {
        cobrir(g, im, 0, 0, tam, tam);
        const d = g.getImageData(0, 0, tam, tam), p = d.data;   // leve tom de jornal (quente), mas colorida
        for (let i = 0; i < p.length; i += 4) { p[i] = Math.min(255, p[i] * 1.03 + 4); p[i + 2] = p[i + 2] * 0.93; }
        g.putImageData(d, 0, 0);
    } else {
        g.fillStyle = "#b9b2a0"; g.fillRect(0, 0, tam, tam);
        g.fillStyle = "#7f7869"; g.beginPath(); g.arc(tam / 2, tam * 0.38, tam * 0.17, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(tam / 2, tam * 1.02, tam * 0.36, Math.PI, 0); g.fill();
        g.fillStyle = "rgba(255,255,255,0.8)"; g.font = `bold ${Math.round(tam * 0.2)}px ${SB}`; g.textAlign = "center"; g.fillText("?", tam / 2, tam * 0.45);
    }
    ctx.drawImage(t, x, y);
}

// cfg: { topo, titulo, subtitulo, cor, nome, itens:[[rotulo,valor]], carimbo, caixaTitulo, caixaTexto, rodape, fotoBuffer, fotoPreto }
async function jornalGenerico(cfg) {
    const W = 1000, H = 1000, c = createCanvas(W, H), ctx = c.getContext("2d");
    const INK = "#1b1a17", COR = cfg.cor || "#b3121c";
    ctx.fillStyle = "#e8dcc0"; ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
    vig.addColorStop(0, "rgba(255,250,235,0)"); vig.addColorStop(1, "rgba(120,90,45,0.40)");
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    const rnd = semente(String(cfg.nome) + H);
    for (let i = 0; i < 4000; i++) { ctx.fillStyle = `rgba(90,70,40,${rnd() * 0.12})`; ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2); }
    ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.strokeRect(20, 20, W - 40, H - 40);
    ctx.lineWidth = 2; ctx.strokeRect(34, 34, W - 68, H - 68);

    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK; ctx.font = `bold 21px ${SB}`;
    ctx.fillText(cfg.topo, W / 2, 80);
    ctx.fillStyle = COR;
    const tam = fit(ctx, cfg.titulo, SB, W - 120, 118, 60, "bold");
    ctx.fillText(cfg.titulo, W / 2, 80 + tam * 0.92);
    const yr = 80 + tam + 2;
    ctx.fillStyle = INK; ctx.fillRect(60, yr, W - 120, 5); ctx.fillRect(60, yr + 11, W - 120, 2);
    ctx.font = `italic 27px ${SI}`;
    ctx.fillText(cfg.subtitulo, W / 2, yr + 46);

    const fs = 360, fx = 84, fy = yr + 104;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20; ctx.shadowOffsetY = 7;
    ctx.fillStyle = "#fbf8ef"; ctx.fillRect(fx - 18, fy - 18, fs + 36, fs + 36);
    ctx.restore();
    if (cfg.fotoPreto) await fotoPB(ctx, cfg.fotoBuffer, fx, fy, fs); else await fotoCor(ctx, cfg.fotoBuffer, fx, fy, fs);
    ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = 3; ctx.strokeRect(fx, fy, fs, fs);
    ctx.fillStyle = "rgba(235,225,170,0.85)";
    for (const [px, py, rot] of [[fx - 16, fy - 16, -0.7], [fx + fs + 16, fy - 16, 0.7]]) { ctx.save(); ctx.translate(px, py); ctx.rotate(rot); ctx.fillRect(-40, -12, 80, 24); ctx.restore(); }
    const ny = fy + fs + 30;
    ctx.fillStyle = INK; ctx.fillRect(fx - 18, ny, fs + 36, 54);
    ctx.fillStyle = "#f3ead2"; ctx.textBaseline = "middle";
    const nome = `@${limpar(cfg.nome)}`;
    fit(ctx, nome, SB, fs + 10, 32, 16, "bold"); ctx.fillText(nome, fx + fs / 2, ny + 29);
    ctx.textBaseline = "alphabetic";

    const cx0 = 520, cw0 = W - cx0 - 62;
    ctx.textAlign = "left";
    let y = fy + 14;
    for (const [r, v] of cfg.itens) {
        ctx.fillStyle = COR; ctx.font = `bold 19px ${SB}`; ctx.fillText(r, cx0, y);
        ctx.fillStyle = INK; ctx.font = `26px ${SR}`;
        let yy = y + 31;
        for (const l of quebrar(ctx, String(v), cw0, 2)) { ctx.fillText(l, cx0, yy); yy += 30; }
        y = yy + 14;
    }
    ctx.save(); ctx.translate(cx0 + cw0 / 2, ny + 6); ctx.rotate(-0.12);
    ctx.font = `bold 32px ${SB}`; const sw = ctx.measureText(cfg.carimbo).width + 34;
    ctx.strokeStyle = COR; ctx.globalAlpha = 0.88; ctx.lineWidth = 5; ctx.strokeRect(-sw / 2, -36, sw, 58);
    ctx.fillStyle = COR; ctx.textAlign = "center"; ctx.fillText(cfg.carimbo, 0, 8); ctx.restore();

    const ry = ny + 54 + 26, rh = 100;
    ctx.fillStyle = COR + "14"; ctx.fillRect(60, ry, W - 120, rh);
    ctx.strokeStyle = COR; ctx.lineWidth = 5; ctx.strokeRect(60, ry, W - 120, rh);
    ctx.lineWidth = 1.5; ctx.strokeRect(69, ry + 9, W - 138, rh - 18);
    ctx.textAlign = "center"; ctx.fillStyle = COR;
    ctx.font = `bold 40px ${SB}`; ctx.fillText(cfg.caixaTitulo, W / 2, ry + 47);
    ctx.fillStyle = INK; fit(ctx, cfg.caixaTexto, SB, W - 190, 26, 14, "bold");
    ctx.fillText(cfg.caixaTexto, W / 2, ry + 82);

    ctx.fillStyle = INK; ctx.fillRect(34, H - 94, W - 68, 60);
    ctx.fillStyle = "#f3ead2"; ctx.textBaseline = "middle";
    fit(ctx, cfg.rodape, SB, W - 110, 22, 12, "bold"); ctx.fillText(cfg.rodape, W / 2, H - 63);
    return c.encode("png");
}

const BOASVINDAS_FRASES = ["LEIA AS REGRAS E SE SINTA EM CASA", "PARTICIPE, RESPEITE E DIVIRTA-SE", "A CASA É SUA — MAS RESPEITE OS VIZINHOS", "APRESENTE-SE E CONHEÇA A TURMA"];

async function criarCartazBoasVindas({ fotoBuffer, nomeUsuario, nomeGrupo, totalMembros }) {
    const r = semente(String(nomeUsuario) + Date.now().toString().slice(0, 8));
    return jornalGenerico({
        topo: "★  EXTRA! CHEGOU GENTE NOVA  ★",
        titulo: "BEM-VINDO(A)!",
        subtitulo: "Mais um(a) morador(a) acaba de entrar no grupo!",
        cor: "#1f6b3a",
        nome: nomeUsuario, fotoBuffer,
        itens: [
            ["ENTROU EM", nomeGrupo],
            ["MEMBRO Nº", String(totalMembros)],
            ["CHEGOU EM", dataHoraBR()],
            ["SITUAÇÃO", "Membro novo — seja bem recebido(a)!"]
        ],
        carimbo: "NOVO MEMBRO",
        caixaTitulo: "BOAS-VINDAS",
        caixaTexto: BOASVINDAS_FRASES[Math.floor(r() * BOASVINDAS_FRASES.length)],
        rodape: `AGORA SOMOS ${totalMembros} MEMBROS NO GRUPO  •  SEJA MUITO BEM-VINDO(A)!`
    });
}

async function criarCartazSolicitacao({ fotoSolicitanteBuffer, nomeSolicitante, nomeGrupo, recusado = false, nomeQuemRecusou = "" }) {
    const itens = [
        ["QUER ENTRAR EM", nomeGrupo],
        ["PEDIU EM", dataHoraBR()],
        ["SITUAÇÃO", recusado ? "Pedido recusado" : "Aguardando aprovação"]
    ];
    itens.push(recusado ? ["DECIDIDO POR", `@${limpar(nomeQuemRecusou) || "um administrador"}`] : ["QUEM DECIDE", "Os administradores do grupo"]);
    return jornalGenerico({
        topo: recusado ? "★  COMUNICADO OFICIAL  ★" : "★  PLANTÃO — PEDIDO NA PORTA  ★",
        titulo: recusado ? "ENTRADA NEGADA" : "PEDIDO DE ENTRADA",
        subtitulo: recusado ? "A porta continua fechada para este(a) candidato(a)." : "Alguém bateu à porta e aguarda a decisão dos administradores.",
        cor: recusado ? "#b3121c" : "#1c4e8f",
        nome: nomeSolicitante, fotoBuffer: fotoSolicitanteBuffer,
        itens,
        carimbo: recusado ? "RECUSADO" : "AGUARDANDO",
        caixaTitulo: "VEREDITO",
        caixaTexto: recusado ? "PEDIDO ANALISADO E RECUSADO" : "ADMINISTRADORES: APROVEM OU RECUSEM",
        rodape: recusado ? "A DECISÃO DOS ADMINISTRADORES É FINAL" : "FILA DE ESPERA  •  AGUARDE A DECISÃO DOS ADMINISTRADORES"
    });
}

module.exports = { criarCartazBoasVindas, criarCartazSolicitacao, criarCardMenuPrincipal, criarCardMenuCategoria, criarCartazDesaparecido, criarPasseSolicitacao, semEmoji, limpar };
