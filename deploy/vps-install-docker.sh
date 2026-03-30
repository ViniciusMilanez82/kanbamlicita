#!/usr/bin/env bash
# Instala Docker Engine + Compose (Ubuntu/Debian — VPS Hostinger e similares).
# Uso: sudo bash deploy/vps-install-docker.sh
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Execute com sudo: sudo bash deploy/vps-install-docker.sh"
  exit 1
fi

curl -fsSL https://get.docker.com | sh

RUN_USER="${SUDO_USER:-$USER}"
if [[ -n "$RUN_USER" && "$RUN_USER" != "root" ]]; then
  usermod -aG docker "$RUN_USER"
  echo ""
  echo "Docker instalado. O usuário '$RUN_USER' foi adicionado ao grupo docker."
  echo "Faça logout e login de novo (ou: newgrp docker) antes de rodar docker sem sudo."
fi

docker compose version
echo "OK."
