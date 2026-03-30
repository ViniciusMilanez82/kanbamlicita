# VPS Hostinger — Postgres + app (guia completo)

Eu não acesso sua VPS daqui; siga os passos **por SSH** na máquina.

## O que o GitHub já documenta (sem dados sensíveis)

No repositório [ViniciusMilanez82/kanbamlicita](https://github.com/ViniciusMilanez82/kanbamlicita), a spec **SP-1** descreve a arquitetura alvo:

- **PostgreSQL** e **Node.js** em **VPS Hostinger**
- App com **PM2**
- **`DATABASE_URL`** em arquivo de ambiente **não versionado** (`.env` / `.env.local`)

Arquivo no GitHub: [docs/superpowers/specs/2026-03-24-sp1-kanban-base-design.md](https://github.com/ViniciusMilanez82/kanbamlicita/blob/main/docs/superpowers/specs/2026-03-24-sp1-kanban-base-design.md) (seção *Stack Técnica*).

Lá **não aparecem** IP da VPS, usuário SSH, senha do banco ou domínio — isso fica só no painel da Hostinger / nos seus `.env` locais (e não deve ir para o Git).

## O que este repositório já traz

| Item | Descrição |
|------|-----------|
| `docker-compose.postgres.yml` | PostgreSQL 16 só em `127.0.0.1:5432` |
| `deploy/vps-install-docker.sh` | Instala Docker (script oficial get.docker.com) |
| `deploy/vps-postgres-up.sh` | Sobe o banco e espera ficar saudável |
| `deploy/vps-full-deploy.sh` | Postgres + `npm ci` + Prisma + build + PM2 |
| `deploy/vps-app.env.example` | Modelo de `.env` de produção |
| `deploy/postgres.env.example` | Modelo de credenciais do Postgres no Docker |
| `deploy/nginx-kanbamlicita.example.conf` | Exemplo de proxy reverso com HTTPS |

## 1. SSH e pasta do projeto

No hPanel da Hostinger, pegue IP e usuário SSH. No seu computador:

```bash
ssh usuario@IP_DA_VPS
```

Instale Git e clone (ou envie o código com `rsync`/`scp`):

```bash
sudo apt update && sudo apt install -y git
cd /var/www   # ou $HOME/apps
git clone https://github.com/SEU_USUARIO/kanbamlicita.git
cd kanbamlicita
```

## 2. Node.js 20+

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
node -v
```

## 3. Docker

```bash
sudo bash deploy/vps-install-docker.sh
```

Saia do SSH e entre de novo (ou `newgrp docker`) para usar `docker` sem `sudo`.

## 4. Arquivos de ambiente

```bash
cp deploy/postgres.env.example deploy/postgres.env
nano deploy/postgres.env   # senha forte em POSTGRES_PASSWORD

cp deploy/vps-app.env.example .env
nano .env
```

No `.env`:

- `DATABASE_URL` — use **o mesmo usuário, senha e banco** que em `deploy/postgres.env`, host **`127.0.0.1`**, porta **5432**.
- `AUTH_SECRET` — gere com: `openssl rand -base64 32`
- `AUTH_URL` — URL **pública** do site, ex.: `https://seu-dominio.com` (obrigatório para login em produção)

## 5. Deploy automático (recomendado)

```bash
chmod +x deploy/*.sh
./deploy/vps-full-deploy.sh
```

Isso sobe o Postgres, roda `npm ci`, `prisma migrate deploy`, `prisma db seed`, `npm run build` e inicia o **PM2**.

PM2 no boot do sistema:

```bash
sudo npm i -g pm2
pm2 startup
# execute o comando que o PM2 mostrar (sudo env ...)
```

## 6. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # ou 80, 443 manualmente
sudo ufw enable
```

**Não** libere a porta **5432** para a internet — o Postgres fica só em localhost.

## 7. HTTPS e domínio (Nginx)

Instale Nginx e Certbot, copie e ajuste `deploy/nginx-kanbamlicita.example.conf`, depois:

```bash
sudo certbot --nginx -d seu-dominio.com
```

## 8. Atualizar o app depois (git pull)

```bash
cd /caminho/do/kanbamlicita
git pull
./deploy/vps-postgres-up.sh   # garante Postgres no ar
npm ci
npx prisma migrate deploy
npm run build
pm2 reload kanbamlicita
```

## Problemas comuns

- **Login / sessão em produção:** `AUTH_URL` e `AUTH_SECRET` corretos; cookie seguro precisa de **HTTPS** ou ajuste de domínio.
- **Prisma não conecta:** Postgres rodando (`docker compose -f docker-compose.postgres.yml ps`), `DATABASE_URL` igual às credenciais do `deploy/postgres.env`.
