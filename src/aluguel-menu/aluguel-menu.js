/* =================================================
   💎 ALUGUEL DO BOT (MENU) — fluxo de compra: escolher plano,
   gerar o Pix, esperar confirmar e liberar o aluguel.
   📁 Arquivo: aluguel-menu.js
================================================= */

const config = require("../../config");
const { enviarListaWhatsApp, enviarNativeFlow, linhaLista, obterLinkCanalConfig } = require("../menuBotoes/menuBotoes");
const vip = require("../aluguel-planos/aluguel-planos");
const pix = require("../pagamento-pix/pagamento-pix");

function remetente(msg) {
    return msg?.key?.participant || msg?.key?.remoteJid;
}

// 💎 Botão "ALUGAR O BOT" → mostra a lista com os planos.
async function enviarPlanosVip(sock, jid, msg) {
    const planos = vip.listarPlanos();
    const rows = planos.map(p => {
        const grupos = vip.limiteGruposPorDias(p.dias);
        const textoGrupos = grupos > 0 ? `${grupos} grupo${grupos > 1 ? 's' : ''}` : 'só no PV (teste)';
        return linhaLista(`vip_plano:${p.dias}`, `🏘️ ${p.dias} dias — R$ ${p.valor}`, `Aluguel por ${p.dias} dias • ${textoGrupos}`);
    });

    return enviarListaWhatsApp(sock, jid, {
        text: `『 ✦ 』ALUGAR O BOT『 ✦ 』\n> Escolha um plano de aluguel abaixo.\n> O Pix é gerado na hora e o aluguel libera automático assim que cair o pagamento.\n\n『 ✦ 』 ${config.BOT_NAME || 'Mikasa Bot'} 『 ✦ 』`,
        title: '🏘️ PLANOS DE ALUGUEL',
        quoted: msg,
        sections: [{ title: 'PLANOS DISPONÍVEIS', rows }]
    });
}

// 🧾 A pessoa escolheu um plano → gera o Pix e manda o QR Code.
async function processarEscolhaVip(sock, msg, idBotao) {
    const id = String(idBotao || '');
    if (!id.startsWith('vip_plano:')) return false;

    const from = msg.key.remoteJid;
    const comprador = remetente(msg);
    const dias = Number(id.split(':')[1]);
    const plano = vip.planoPorDias(dias);

    if (!plano) {
        await sock.sendMessage(from, { text: '❌ Esse plano não existe mais. Peça o menu de aluguel de novo.' }, { quoted: msg });
        return true;
    }

    if (!pix.tokenConfigurado()) {
        await sock.sendMessage(from, {
            text: `⚠️ O sistema de pagamento ainda não foi configurado pelo criador do bot. Fala com ele pelo botão "FALAR COM O CRIADOR" no menu.`
        }, { quoted: msg });
        return true;
    }

    try {
        const cobranca = await pix.criarCobrancaPix({
            valor: plano.valor,
            descricao: `Aluguel do bot ${plano.dias} dias — ${config.BOT_NAME || 'Mikasa Bot'}`,
            referencia: `${comprador}|${plano.dias}|${Date.now()}`
        });

        pix.registrarPendente(cobranca.id, {
            comprador,
            jid: from,
            dias: plano.dias,
            valor: plano.valor
        });

        const legenda =
            `『 ✦ 』PIX GERADO『 ✦ 』\n` +
            `> 🏘️ Plano de aluguel: *${plano.dias} dias*\n` +
            `> 💰 Valor: *R$ ${plano.valor}*\n` +
            `> ⏳ Pague em até 30 minutos\n` +
            `> ✅ O aluguel libera *automático* assim que o pagamento cair — não precisa mandar comprovante\n\n` +
            `『 ✦ 』 ${config.BOT_NAME || 'Mikasa Bot'} 『 ✦ 』`;

        if (cobranca.qrCodeBase64) {
            await sock.sendMessage(from, {
                image: Buffer.from(cobranca.qrCodeBase64, 'base64'),
                caption: legenda
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, { text: legenda }, { quoted: msg });
        }

        // Copia-e-cola em mensagem separada, sem formatação em volta,
        // pra facilitar copiar certinho.
        await sock.sendMessage(from, { text: cobranca.copiaECola }, { quoted: msg });

        iniciarEsperaPagamento(sock, cobranca.id, { comprador, from, dias: plano.dias, valor: plano.valor });
    } catch (erro) {
        console.error('❌ Erro ao gerar Pix:', erro.message);
        await sock.sendMessage(from, {
            text: `❌ Não consegui gerar o Pix agora.\n${erro.message}`
        }, { quoted: msg });
    }

    return true;
}

function iniciarEsperaPagamento(sock, paymentId, dados) {
    pix.iniciarPolling(paymentId, {
        onPago: () => confirmarPagamentoVip(sock, dados),
        onExpirado: (motivo) => {
            if (motivo === 'tempo_esgotado') {
                sock.sendMessage(dados.from, {
                    text: `⏳ @${String(dados.comprador).split('@')[0]}, o tempo desse Pix acabou. Peça o menu de aluguel de novo se ainda quiser alugar.`,
                    mentions: [dados.comprador]
                }).catch(() => {});
            }
        }
    });
}

// ✅ Libera o aluguel e avisa cliente + dono. Chamada tanto pelo fluxo normal
// (pagou na hora) quanto pela retomada (bot reiniciou e o Pix caiu
// enquanto ele estava desligado).
async function confirmarPagamentoVip(sock, { comprador, from, dias, valor }) {
    const registro = vip.ativarVip(comprador, dias);
    const canal = obterLinkCanalConfig();

    const mensagemCliente =
        `『 ✦ 』PAGAMENTO CONFIRMADO『 ✦ 』\n` +
        `> @${String(comprador).split('@')[0]}, seu aluguel tá ativo! 🎉\n` +
        `> 🏘️ Plano: *${dias} dias*\n` +
        `> ⏳ Válido até: *${vip.formatarData(registro.expiraEm)}*\n\n` +
        `『 ✦ 』 ${config.BOT_NAME || 'Mikasa Bot'} 『 ✦ 』`;

    if (canal) {
        await enviarNativeFlow(sock, from, {
            text: mensagemCliente,
            footer: config.BOT_NAME || 'Mikasa Bot',
            mentions: [comprador],
            buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: '📢 ENTRAR NO CANAL', url: canal }) }]
        });
    } else {
        await sock.sendMessage(from, { text: mensagemCliente, mentions: [comprador] });
    }

    // Avisa o criador também, pra ele ter controle de quem pagou.
    const numeroDono = String(config.OWNER_NUMBER || '').replace(/\D/g, '');
    if (numeroDono) {
        await sock.sendMessage(`${numeroDono}@s.whatsapp.net`, {
            text: `💰 Novo aluguel confirmado!\n👤 @${String(comprador).split('@')[0]}\n🏘️ Plano: ${dias} dias — R$ ${valor}`,
            mentions: [comprador]
        }).catch(() => {});
    }
}

// 📄 Comando pra pessoa ver o status do próprio aluguel.
async function statusVip(sock, msg) {
    const from = msg.key.remoteJid;
    const id = remetente(msg);
    const restante = vip.tempoRestante(id);

    if (!restante) {
        return sock.sendMessage(from, {
            text: `『 ✦ 』ALUGUEL DO BOT『 ✦ 』\n> Você ainda não tem um plano de aluguel ativo.\n> Use o menu → "ALUGAR O BOT" pra contratar.\n\n『 ✦ 』 ${config.BOT_NAME || 'Mikasa Bot'} 『 ✦ 』`
        }, { quoted: msg });
    }

    const dias = Math.ceil(restante / (24 * 60 * 60 * 1000));
    const limiteGrupos = vip.limiteGruposAtual(id);
    const linhaGrupos = limiteGrupos > 0
        ? `> 🏘️ Pode ativar o bot em *${limiteGrupos} grupo${limiteGrupos > 1 ? 's' : ''}* (use ${config.PREFIX}alugar 1 dentro do grupo)`
        : `> 🏘️ Seu plano atual não inclui ativar o bot em grupos`;

    return sock.sendMessage(from, {
        text: `『 ✦ 』ALUGUEL DO BOT『 ✦ 』\n> ✅ Seu aluguel está ativo!\n> ⏳ Faltam *${dias} dia(s)* pra vencer.\n${linhaGrupos}\n\n『 ✦ 』 ${config.BOT_NAME || 'Mikasa Bot'} 『 ✦ 』`
    }, { quoted: msg });
}

module.exports = { enviarPlanosVip, processarEscolhaVip, statusVip, iniciarEsperaPagamento, confirmarPagamentoVip };
