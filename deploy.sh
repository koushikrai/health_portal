#!/bin/bash
# ==============================================================================
# Health Portal - One-Click Deployment Script for GoDaddy Gen 4 VPS
# ==============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$APP_DIR"

echo "----------------------------------------------------"
echo ">> [1/5] Updating repository (if using git)..."
echo "----------------------------------------------------"
if [ -d ".git" ]; then
    git pull origin main || git pull || echo "Git pull skipped or on custom branch"
fi

echo "----------------------------------------------------"
echo ">> [2/5] Installing & Building Server Backend..."
echo "----------------------------------------------------"
cd "$APP_DIR/server"

# Ensure .env exists
if [ ! -f ".env" ]; then
    echo "WARNING: server/.env not found! Copying from .env.example..."
    cp .env.example .env
    echo "Please edit server/.env with your real DATABASE_URL and JWT_SECRET!"
fi

npm install
npx prisma generate
# Push database schema migrations to PostgreSQL
npx prisma db push
npm run build

echo "----------------------------------------------------"
echo ">> [3/5] Installing & Building Client Frontend..."
echo "----------------------------------------------------"
cd "$APP_DIR/client"
npm install
npm run build

echo "----------------------------------------------------"
echo ">> [4/5] Reloading Backend with PM2..."
echo "----------------------------------------------------"
cd "$APP_DIR"
if pm2 list | grep -q "health-portal-api"; then
    echo "Reloading existing PM2 cluster..."
    pm2 reload ecosystem.config.cjs
else
    echo "Starting PM2 cluster for the first time..."
    pm2 start ecosystem.config.cjs
fi
pm2 save

echo "----------------------------------------------------"
echo ">> [5/5] Reloading Nginx..."
echo "----------------------------------------------------"
sudo nginx -t
sudo systemctl reload nginx

echo "===================================================="
echo ">> Deployment Finished Successfully!"
echo ">> Status: Check PM2 with 'pm2 status'"
echo ">> Logs: Check API logs with 'pm2 logs health-portal-api'"
echo "===================================================="
