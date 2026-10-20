#!/data/data/com.termux/files/usr/bin/bash
# =============================================================================
#  🌹 MIKASA BOT — INICIAR (com reinício automático se cair)
#  Uso: bash iniciar.sh
#  Para parar: Ctrl + C duas vezes seguidas.
# =============================================================================
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js não está instalado. Rode primeiro:  bash instalar.sh"
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "📦 Módulos não instalados — rodando o instalador..."
  bash instalar.sh || exit 1
fi

# Mantém o celular acordado com o Termux em segundo plano
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

PARAR=0
trap 'if [ $PARAR -eq 1 ]; then echo; echo "🛑 Encerrado."; exit 0; fi; PARAR=1; echo; echo "⚠️ Aperte Ctrl+C de novo em 3s para encerrar o bot."; sleep 3; PARAR=0' INT

QUEDAS=0
while true; do
  INICIO=$(date +%s)
  node mikasabot.js
  CODIGO=$?
  DURACAO=$(( $(date +%s) - INICIO ))

  # Saída limpa pedida pelo próprio bot (ex.: desligar)
  [ "$CODIGO" -eq 0 ] && { echo "✅ Bot encerrado normalmente."; break; }

  # Se caiu em menos de 20s várias vezes seguidas, espera mais (evita loop de erro)
  if [ "$DURACAO" -lt 20 ]; then QUEDAS=$((QUEDAS+1)); else QUEDAS=0; fi
  ESPERA=5; [ "$QUEDAS" -ge 3 ] && ESPERA=30
  [ "$QUEDAS" -ge 10 ] && { echo "❌ O bot caiu 10 vezes seguidas. Veja o erro acima e rode: bash instalar.sh"; break; }
  echo "⚠️ Bot caiu (código $CODIGO). Reiniciando em ${ESPERA}s..."
  sleep "$ESPERA"
done
