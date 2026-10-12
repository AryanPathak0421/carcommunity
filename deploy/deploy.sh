#!/usr/bin/env bash
# CarCommunity one-shot deploy for a fresh Ubuntu/Debian server (run as root).
#   bash deploy.sh
# Prerequisite: fill /var/www/carcommunity/backend-labourchouck/.env and
# /var/www/carcommunity/frontend/.env BEFORE the build steps (see templates at the bottom).
set -euo pipefail

APP_DIR=/var/www/carcommunity
REPO=https://github.com/appzetogit/CarCommunity.git
SERVER_NAME="${SERVER_NAME:-145.223.21.188}"   # domain or IP
API_PORT=5005

echo "==> packages"
apt-get update -y
apt-get install -y git nginx curl ca-certificates
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

echo "==> code"
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi

echo "==> env files"
[ -f "$APP_DIR/backend-labourchouck/.env" ] || { echo "MISSING $APP_DIR/backend-labourchouck/.env (template below)"; exit 1; }
[ -f "$APP_DIR/frontend/.env" ]             || { echo "MISSING $APP_DIR/frontend/.env (template below)"; exit 1; }

echo "==> backend"
cd "$APP_DIR/backend-labourchouck"
npm ci --omit=dev
pm2 delete carcommunity-api >/dev/null 2>&1 || true
NODE_ENV=production pm2 start src/server.js --name carcommunity-api
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> frontend build"
cd "$APP_DIR/frontend"
npm ci
npm run build

echo "==> nginx"
cat >/etc/nginx/sites-available/carcommunity <<NGINX
server {
  listen 80;
  server_name ${SERVER_NAME};
  root ${APP_DIR}/frontend/dist;
  index index.html;
  client_max_body_size 20m;

  location /api/ {
    proxy_pass http://127.0.0.1:${API_PORT};
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  location /socket.io/ {
    proxy_pass http://127.0.0.1:${API_PORT};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
  }
  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/carcommunity /etc/nginx/sites-enabled/carcommunity
nginx -t && systemctl reload nginx

echo "==> done: http://${SERVER_NAME}/   (health: curl localhost:${API_PORT}/health)"

: <<'TEMPLATES'
# --- backend-labourchouck/.env ---
NODE_ENV=production
PORT=5005
MONGODB_URI=<Atlas non-SRV URI>
JWT_SECRET=<long random string, >= 32 chars>
CORS_ORIGIN=http://145.223.21.188
TRUST_PROXY=1
ENABLE_TEST_ACCOUNTS=false
GOOGLE_MAPS_API_KEY=<key>
# Razorpay live/test keys, SMS keys, Firebase service account path as in .env.example
# Also place src/config/labourchowck.json (Firebase service account) on the server manually.

# --- frontend/.env (read at build time) ---
VITE_API_URL=/api/v1
VITE_GOOGLE_MAPS_API_KEY=<key>
# VITE_FIREBASE_* values as in .env.example
TEMPLATES
