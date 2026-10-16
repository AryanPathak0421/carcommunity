#!/usr/bin/env bash
# CarCommunity deploy for carcommunity.in  (Ubuntu/Debian, run as root on the server)
#
#   1. Point DNS first:  A record  carcommunity.in  ->  145.223.21.188   (and www)
#   2. On the server:    bash deploy-carcommunity-in.sh
#   3. The first run stops after creating the .env templates. Fill them in, then run it again.
#
# It only touches its own folder, its own nginx site file and its own pm2 process,
# so anything else already running on this server is left alone.
set -euo pipefail

DOMAIN="${DOMAIN:-carcommunity.in}"
APP_DIR="${APP_DIR:-/var/www/carcommunity}"
REPO="${REPO:-https://github.com/AryanPathak0421/carcommunity.git}"
API_PORT="${API_PORT:-5005}"
PM2_NAME="carcommunity-api"
BACKEND_DIR="$APP_DIR/backend-labourchouck"
FRONTEND_DIR="$APP_DIR/frontend"

echo "==> packages"
apt-get update -y
apt-get install -y git nginx curl ca-certificates certbot python3-certbot-nginx
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2

if ss -ltn "( sport = :$API_PORT )" | grep -q LISTEN && ! pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  echo "Port $API_PORT is already used by something else. Re-run with API_PORT=<free port>." >&2
  exit 1
fi

echo "==> code ($APP_DIR)"
mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone "$REPO" "$APP_DIR"
fi
[ -d "$BACKEND_DIR" ] && [ -d "$FRONTEND_DIR" ] || {
  echo "Expected $BACKEND_DIR and $FRONTEND_DIR in the repo — check the repository layout." >&2
  exit 1
}

echo "==> env files"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  JWT="$(head -c 48 /dev/urandom | base64 | tr -d '/+=\n' | head -c 48)"
  cat >"$BACKEND_DIR/.env" <<ENV
NODE_ENV=production
PORT=$API_PORT
TRUST_PROXY=1
CORS_ORIGIN=https://$DOMAIN,https://www.$DOMAIN
JWT_SECRET=$JWT

# --- REQUIRED: fill these in ---
MONGODB_URI=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GOOGLE_MAPS_API_KEY=
SMS_API_KEY=
SMS_SENDER_ID=
SMS_PE_ID=
OTP_TEMPLATE_ID=
# Firebase push: copy the service-account JSON to src/config/labourchowck.json by hand (never commit it)

# --- must stay OFF in production ---
ENABLE_TEST_ACCOUNTS=false
RATE_LIMIT_DISABLED=false
ALLOW_MOCK_PAYMENTS=false
ENV
  chmod 600 "$BACKEND_DIR/.env"
  NEED_ENV=1
fi
if [ ! -f "$FRONTEND_DIR/.env" ]; then
  cat >"$FRONTEND_DIR/.env" <<ENV
VITE_API_URL=/api/v1
VITE_GOOGLE_MAPS_API_KEY=
# VITE_FIREBASE_* values as in frontend/.env.example
ENV
  NEED_ENV=1
fi
if [ "${NEED_ENV:-0}" = 1 ]; then
  echo
  echo "Created .env templates. Fill in:"
  echo "  $BACKEND_DIR/.env"
  echo "  $FRONTEND_DIR/.env"
  echo "then run this script again."
  exit 0
fi
grep -Eq '^MONGODB_URI=.+' "$BACKEND_DIR/.env" || { echo "MONGODB_URI is empty in $BACKEND_DIR/.env" >&2; exit 1; }
# the API refuses to boot in production with any of these on; fail early with a clear message
if grep -Eq '^(ENABLE_TEST_ACCOUNTS|OTP_BYPASS_LAST6)=true|^OTP_FIXED_CODE=.+' "$BACKEND_DIR/.env"; then
  echo "Remove ENABLE_TEST_ACCOUNTS / OTP_BYPASS_LAST6 / OTP_FIXED_CODE from the production .env." >&2
  exit 1
fi

echo "==> backend"
cd "$BACKEND_DIR"
npm ci --omit=dev
pm2 delete "$PM2_NAME" >/dev/null 2>&1 || true
NODE_ENV=production pm2 start src/server.js --name "$PM2_NAME"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "==> frontend build"
cd "$FRONTEND_DIR"
npm ci
npm run build

echo "==> nginx"
cat >/etc/nginx/sites-available/carcommunity <<NGINX
server {
  listen 80;
  server_name $DOMAIN www.$DOMAIN;
  root $FRONTEND_DIR/dist;
  index index.html;
  client_max_body_size 60m;   # KYC video uploads are up to 50 MB

  location /api/ {
    proxy_pass http://127.0.0.1:$API_PORT;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  location /socket.io/ {
    proxy_pass http://127.0.0.1:$API_PORT;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host \$host;
    proxy_read_timeout 86400;
  }
  location / {
    try_files \$uri \$uri/ /index.html;
  }
}
NGINX
ln -sf /etc/nginx/sites-available/carcommunity /etc/nginx/sites-enabled/carcommunity
nginx -t && systemctl reload nginx

echo "==> HTTPS (needs the DNS A record to already point here)"
if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --redirect -m "admin@$DOMAIN"; then
  echo "HTTPS enabled."
else
  echo "Certbot failed — check DNS has propagated, then run:  certbot --nginx -d $DOMAIN -d www.$DOMAIN" >&2
fi

echo
echo "==> done"
echo "  site:   https://$DOMAIN"
echo "  health: curl -s localhost:$API_PORT/health"
echo "  logs:   pm2 logs $PM2_NAME"
echo "Create the first admin once:  cd $BACKEND_DIR && SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='<strong>' node src/scripts/seedAdmin.js"
echo "Seed the service catalog once: npm run seed:mechanic-catalog"
