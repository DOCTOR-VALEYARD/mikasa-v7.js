// src/ativar.js - ATIVAR/DESATIVAR BOOT (PROTEGIDO POR CÓDIGO)
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../../database/botconfig.json");

function lerDB() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, "utf-8"));
}

function salvarDB(db) {
    if (!fs.existsSync(path.dirname(dbPath))) {
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

const autenticados = new Set();

async function ativar(sock, msg, args) {
    args = args || [];
    const from = msg.key.remoteJid;
    const userId = msg.key.participant || msg.key.remoteJid;
    const db = lerDB();

    if (!db.CONFIG_CODE) {
        db.CONFIG_CODE = "1234";
        salvarDB(db);
    }

    // ─── NÃO AUTENTICADO ─────────────────────────────────────────────────────
    if (!autenticados.has(userId)) {

        if (!args.length) {
            return await sock.sendMessage(from, {
                text: `╭━♡━━━━━━━━━━━━━━━━━━━━♡━╮
        ⚡ ATIVAR/DESATIVAR BOOT ⚡
╰━♡━━━━━━━━━━━━━━━━━━━━♡━╯

🔐 Este painel é protegido por código.

Digite o código para liberar o acesso:
➜ /ativar [código]

━━━━━━━━━━━━━━━━━━━━━━━`
            }, { quoted: msg });
        }

        const tentativa = args[0].trim();

        if (tentativa !== db.CONFIG_CODE) {
            return await sock.sendMessage(from, {
                text: `╭━♡━━━━━━━━━━━━━━━━━━━━♡━╮
        🔐 CÓDIGO INCORRETO 🔐
╰━♡━━━━━━━━━━━━━━━━━━━━♡━╯

❌ Código inválido! Tente novamente.

➜ /ativar [código]

━━━━━━━━━━━━━━━━━━━━━━━`
            }, { quoted: msg });
        }

        autenticados.add(userId);

        const statusBoot = db.BOOT_SISTEMA_ATIVO ? "✅ ATIVO" : "❌ DESATIVADO";
        return await sock.sendMessage(from, {
            text: `╭━♡━━━━━━━━━━━━━━━━━━━━♡━╮
        ✅ ACESSO LIBERADO ✅
╰━♡━━━━━━━━━━━━━━━━━━━━♡━╯

🔓 Código correto! Bem-vindo ao painel.

⚡ Status atual do Boot: ${statusBoot}

Use: /ativar ativar
Use: /ativar desativar

━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: msg });
    }

    // ─── AUTENTICADO ──────────────────────────────────────────────────────────
    if (!args.length) {
        const statusBoot = db.BOOT_SISTEMA_ATIVO ? "✅ ATIVO" : "❌ DESATIVADO";
        return await sock.sendMessage(from, {
            text: `╭━♡━━━━━━━━━━━━━━━━━━━━♡━╮
        ⚡ STATUS DO BOOT ⚡
╰━♡━━━━━━━━━━━━━━━━━━━━♡━╯

Boot: ${statusBoot}

Use: /ativar ativar
Use: /ativar desativar

━━━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: msg });
    }

    const opcao = args[0].toLowerCase();

    if (opcao === "ativar") {
        db.BOOT_SISTEMA_ATIVO = true;
        salvarDB(db);
        return await sock.sendMessage(from, {
            text: `✅ Boot system ATIVADO!\n\n🎯 Respondendo a xingamentos!`
        }, { quoted: msg });
    }

    if (opcao === "desativar") {
        db.BOOT_SISTEMA_ATIVO = false;
        salvarDB(db);
        return await sock.sendMessage(from, {
            text: `⛔ Boot system DESATIVADO!\n\n🔇 Sistema silencioso`
        }, { quoted: msg });
    }

    await sock.sendMessage(from, {
        text: `❌ Use: /ativar ativar\nOu: /ativar desativar`
    }, { quoted: msg });
}

module.exports = { ativar };
