# CyberPay - Donate Bot

FastAPI + aiogram + React (Vite) donate bot for PUBG Mobile UC and Free Fire Diamonds.

## Project Structure

- `backend/` - FastAPI backend with payment webhooks (Click, Payme)
- `frontend/` - React (Vite) frontend for Telegram Mini App

## Environment Variables

### Backend (.env)
- `BOT_TOKEN` - Telegram bot token
- `CLICK_SECRET_KEY` - Click payment gateway secret
- `PAYME_MERCHANT_KEY` - Payme payment gateway merchant key
- `DATABASE_URL` - SQLite database path
- `REDIS_URL` - Redis connection string
- `WEBAPP_URL` - Frontend URL for Telegram WebApp

### Frontend (.env / .env.production)
- `VITE_API_URL` - Backend API URL (IMPORTANT: Must be set at build time for production)

**CRITICAL**: Vite inlines `VITE_API_URL` at build time. For production deployments (Vercel, etc.), set this as a build-time environment variable before running `npm run build`. The production build will fail silently with network errors if this is not set.

Example `.env.production`:
```
VITE_API_URL=https://your-backend-domain.com/api
```

## Installation

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m app.main
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Development
npm run build  # Production build
```

## Recent Bug Fixes

All critical bugs have been fixed:

1. **Click Webhook Signature Bug** - Fixed f-string format error in `backend/app/api/payments.py` that caused all Click payments to fail
2. **Database Transaction Race Condition** - Removed unsafe `BEGIN TRANSACTION` pattern in `backend/app/services/referral.py` and `backend/app/bot/telegram_bot.py`
3. **Frontend Localhost Hardcoding** - Centralized `VITE_API_URL` usage and added `.env.production` placeholder; no localhost fallbacks remain in codebase
4. **Admin Panel Referral Cashback** - Added referral cashback trigger to admin approval endpoint in `backend/app/api/admin.py`

## Payment Webhooks

- Click: `/api/payments/click`
- Payme: `/api/payments/payme`

## Admin Panel

Accessible via Telegram Mini App for admin user (ID: 6709001451).
