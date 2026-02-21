#!/bin/bash
set -e

# 1. System Update
apt-get update
# DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# 2. Install Dependencies
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx postgresql postgresql-contrib certbot python3-certbot-nginx

# 3. Install PM2
npm install -g pm2 yarn

# 4. Clone Repo
git clone https://github.com/1fcult/telegram-store-miniapp.git /var/www/miniapp || { echo "Repo already exists, pulling..."; cd /var/www/miniapp && git pull; }

# 5. Database Setup
sudo -u postgres psql -c "CREATE DATABASE miniapp_db;" || echo "DB already exists"
sudo -u postgres psql -c "CREATE USER miniapp_user WITH ENCRYPTED PASSWORD 'Selectel2026!';" || echo "User already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE miniapp_db TO miniapp_user;" || true
sudo -u postgres psql -c "ALTER DATABASE miniapp_db OWNER TO miniapp_user;" || true

# 6. Backend Setup
cd /var/www/miniapp/backend
echo "DATABASE_URL=\"postgresql://miniapp_user:Selectel2026!@localhost:5432/miniapp_db\"" > .env
echo "PORT=3000" >> .env
echo "BOT_TOKEN=\"8550097764:AAE8_avqxS8VC4fu85CmTmw6uQaMtPSBNvQ\"" >> .env
echo "DEV_MODE=false" >> .env

npm install
npx prisma generate
npx prisma db push --accept-data-loss # Warning: pushes schema and resets if needed. This is initial.

pm2 delete backend || true
pm2 start server.js --name "backend"
pm2 save
pm2 startup | tail -n 1 | bash || true

# 7. Frontend Setup
cd /var/www/miniapp/frontend
echo "VITE_DEV_MODE=false" > .env
npm install
npm run build

echo "Setup done."
