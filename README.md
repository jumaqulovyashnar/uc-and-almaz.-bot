# CyberPay - Donate Bot

FastAPI + aiogram + React (Vite) donate bot for PUBG Mobile UC and Free Fire Diamonds.

## Project Structure

- `backend/` - FastAPI backend with payment webhooks (Paylov, Payme)
- `frontend/` - React (Vite) frontend for Telegram Mini App

## Environment Variables

### Backend (.env)
- `BOT_TOKEN` - Telegram bot token
- `PAYLOV_USERNAME` - Paylov Merchant username
- `PAYLOV_PASSWORD` - Paylov Merchant password
- `PAYLOV_MERCHANT_ID` - Paylov Merchant ID
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

## Payment Webhooks

- Paylov: `/api/payments/paylov`
- Payme: `/api/payments/payme`

## Admin Panel

Accessible via Telegram Mini App for admin user (ID: 6709001451).
