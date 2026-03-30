#!/usr/bin/env bash
# Na VPS: deploy completo — Postgres (Docker) + dependências + Prisma + build + PM2.
# Pré-requisitos: Node.js 20+, Git, projeto clonado na pasta atual.
# Uso (na raiz do repositório):
#   chmod +x deploy/*.sh
#   cp deploy/postgres.env.example deploy/postgres.env   # edite a senha
#   cp deploy/vps-app.env.example .env                   # edite DATABASE_URL, AUTH_*
#   ./deploy/vps-full-deploy.sh
#
# Se ainda não tem Docker: sudo bash deploy/vps-install-docker.sh
# (depois faça logout/login e rode este script de novo.)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
err() { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }
ok() { echo -e "${GREEN}[ok]${NC} $*"; }
warn() { echo -e "${YELLOW}[aviso]${NC} $*"; }

command -v docker >/dev/null || err "Docker não encontrado. Rode: sudo bash deploy/vps-install-docker.sh"
command -v node >/dev/null || err "Instale Node.js 20 LTS (ex.: nvm ou NodeSource)."
command -v npm >/dev/null || err "npm não encontrado."

[[ -f deploy/postgres.env ]] || err "Falta deploy/postgres.env (copie de deploy/postgres.env.example)."
[[ -f .env ]] || err "Falta .env na raiz (copie de deploy/vps-app.env.example). DATABASE_URL e AUTH_SECRET são obrigatórios."

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
[[ "${NODE_MAJOR}" -ge 20 ]] || err "Use Node.js 20 ou superior (atual: $(node -v))."

ok "Subindo Postgres..."
bash deploy/vps-postgres-up.sh

ok "Instalando dependências (npm ci)..."
npm ci

ok "Prisma migrate + seed..."
npx prisma migrate deploy
npx prisma db seed

ok "Build Next.js..."
npm run build

if command -v pm2 >/dev/null; then
  ok "PM2: iniciando ou recarregando..."
  pm2 delete kanbamlicita 2>/dev/null || true
  pm2 start ecosystem.config.js
  pm2 save
  warn "Configure PM2 no boot: pm2 startup  (siga o comando que aparecer)"
else
  warn "PM2 não instalado. Instale: sudo npm i -g pm2"
  warn "Depois: pm2 start ecosystem.config.js && pm2 save"
fi

ok "Deploy concluído. App em http://127.0.0.1:3000 (use Nginx/Caddy na frente para HTTPS)."
