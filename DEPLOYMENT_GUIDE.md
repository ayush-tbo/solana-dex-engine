# 🚀 Deployment Guide - Railway + Vercel

Complete guide to deploy your Solana DEX app for FREE using Railway (backend) and Vercel (frontend).

**Total Time**: ~15 minutes
**Cost**: $0/month (free tier)

---

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ GitHub account
- ✅ Git installed locally
- ✅ Node.js installed (v20+)
- ✅ Your Solana devnet wallet private key

---

## 🔐 Step 0: Prepare Your Private Key

Your backend needs a Solana wallet to sign transactions. You have two options:

### Option A: Use Your Current Devnet Wallet
```bash
# Your current wallet private key is in backend/.env
# Copy this value - you'll need it for Railway
cat backend/.env | grep SOLANA_PRIVATE_KEY
```

### Option B: Create a New Devnet Wallet (Recommended for deployment)
```bash
# Install Solana CLI if not installed
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create new wallet
solana-keygen new --outfile ~/solana-devnet-deploy.json

# Get the private key (it's a JSON array)
cat ~/solana-devnet-deploy.json

# Get the public address
solana-keygen pubkey ~/solana-devnet-deploy.json

# Airdrop 2 SOL to new wallet
solana airdrop 2 <YOUR_PUBLIC_ADDRESS> --url https://api.devnet.solana.com
```

**⚠️ Important**: The private key is the JSON array like `[123,45,67,...]`. You'll need this for Railway.

---

## 📦 Step 1: Push Code to GitHub

```bash
# 1. Make sure you're in the project root
cd /home/ayush/Desktop/Solana_dex

# 2. Add all files
git add .

# 3. Commit
git commit -m "feat: ready for deployment with Railway + Vercel"

# 4. Create GitHub repo (if not exists)
# Go to github.com and create a new repository named "solana-dex"

# 5. Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/solana-dex.git
git branch -M main
git push -u origin main
```

---

## 🚂 Step 2: Deploy Backend to Railway (10 minutes)

### 2.1 Install Railway CLI
```bash
npm install -g @railway/cli
```

### 2.2 Login to Railway
```bash
railway login
```
This will open a browser. Sign up/login using your GitHub account.

### 2.3 Initialize Railway Project
```bash
# Go to backend folder
cd backend

# Initialize Railway
railway init

# Choose:
# - "Create new project"
# - Name: "solana-dex-backend" (or any name you like)
```

### 2.4 Add PostgreSQL Database
```bash
railway add

# Select: PostgreSQL
```

### 2.5 Add Redis
```bash
railway add

# Select: Redis
```

### 2.6 Set Environment Variables

**Option A: Using CLI** (Recommended)
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set WS_PORT=3001
railway variables set USE_REAL_DEX=true
railway variables set RPC_URL=https://api.devnet.solana.com
railway variables set DEFAULT_SLIPPAGE=0.01
railway variables set PRIORITY_FEE_MICRO_LAMPORTS=1000
railway variables set ORDER_TIMEOUT_MS=120000
railway variables set ORDER_RETRY_ATTEMPTS=3
railway variables set COMPUTE_UNIT_LIMIT=400000
railway variables set BULL_BOARD_USERNAME=admin
railway variables set BULL_BOARD_PASSWORD=admin123

# IMPORTANT: Set your Solana private key
railway variables set SOLANA_PRIVATE_KEY="your_private_key_here"
```

**Option B: Using Railway Dashboard**
1. Go to https://railway.app/dashboard
2. Select your project
3. Go to Variables tab
4. Add all variables above manually

### 2.7 Link GitHub Repository (Optional but Recommended)

This enables auto-deploy on git push:

```bash
# In Railway dashboard:
# 1. Go to your project
# 2. Click "Settings"
# 3. Click "Connect GitHub Repo"
# 4. Select your "solana-dex" repository
# 5. Set root directory to "backend"
```

### 2.8 Deploy!
```bash
railway up
```

Wait 2-5 minutes for deployment to complete.

### 2.9 Get Your Backend URL
```bash
railway domain
```

This will output something like: `solana-dex-backend.up.railway.app`

**Save this URL** - you'll need it for the frontend!

### 2.10 Verify Backend is Running
```bash
# Test health endpoint
curl https://YOUR_RAILWAY_URL.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":...}
```

---

## ⚡ Step 3: Deploy Frontend to Vercel (5 minutes)

### 3.1 Install Vercel CLI
```bash
npm install -g vercel
```

### 3.2 Update Frontend Environment Variable
```bash
# Go to frontend folder
cd ../frontend-react

# Update .env.production with your Railway URL
echo "VITE_API_URL=https://YOUR_RAILWAY_URL.up.railway.app" > .env.production
```

**Replace `YOUR_RAILWAY_URL.up.railway.app` with your actual Railway backend URL from Step 2.9**

### 3.3 Login to Vercel
```bash
vercel login
```

### 3.4 Deploy to Vercel
```bash
vercel
```

**Follow the prompts**:
- Set up and deploy? → `Y`
- Which scope? → (Select your account)
- Link to existing project? → `N`
- What's your project's name? → `solana-dex-frontend`
- In which directory is your code located? → `./`
- Want to override the settings? → `N`

### 3.5 Deploy to Production
```bash
vercel --prod
```

### 3.6 Get Your Frontend URL

Vercel will output: `https://solana-dex-frontend.vercel.app`

---

## ✅ Step 4: Verify Deployment

### 4.1 Test Backend
```bash
# Health check
curl https://YOUR_RAILWAY_URL.up.railway.app/health

# Create test order
curl -X POST https://YOUR_RAILWAY_URL.up.railway.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "So11111111111111111111111111111111111111112",
    "tokenOut": "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    "amount": "10000000",
    "slippage": 0.01
  }'
```

### 4.2 Test Frontend
1. Visit: `https://solana-dex-frontend.vercel.app`
2. Submit an order using the form
3. Check Active Orders section
4. Verify transaction appears
5. Click on transaction hash to see it on Solscan devnet

### 4.3 Check Logs

**Railway Logs**:
```bash
railway logs
```

**Vercel Logs**:
```bash
vercel logs
```

---

## 🔧 Troubleshooting

### Backend Issues

**Problem**: Database connection error
```bash
# Check if DATABASE_URL is set
railway variables

# If missing, Railway should auto-set it. Try redeploying:
railway up --detach
```

**Problem**: Redis connection error
```bash
# Check if REDIS_URL is set
railway variables

# Railway should auto-set this too
```

**Problem**: Build fails
```bash
# Check logs
railway logs

# Common issue: missing Prisma
railway run npx prisma generate
railway run npx prisma migrate deploy
```

### Frontend Issues

**Problem**: Can't connect to backend
```bash
# Check VITE_API_URL is set correctly
cat frontend-react/.env.production

# Update it:
echo "VITE_API_URL=https://YOUR_RAILWAY_URL.up.railway.app" > .env.production

# Redeploy
vercel --prod
```

**Problem**: CORS errors
- Make sure backend CORS is configured for your Vercel domain
- Backend already has `origin: true` which allows all origins

---

## 🎯 Post-Deployment

### Set Custom Domain (Optional)

**For Backend (Railway)**:
1. Go to Railway dashboard
2. Select your project
3. Settings → Domains
4. Add custom domain: `api.yourdomain.com`
5. Follow DNS instructions

**For Frontend (Vercel)**:
1. Go to Vercel dashboard
2. Select your project
3. Settings → Domains
4. Add custom domain: `yourdomain.com`
5. Follow DNS instructions

### Enable Auto-Deploy

**Railway**: Already enabled if you linked GitHub repo

**Vercel**: Already enabled by default
- Every push to `main` branch will auto-deploy
- Preview deployments for pull requests

### Monitor Your App

**Railway Dashboard**:
- https://railway.app/dashboard
- View logs, metrics, database

**Vercel Dashboard**:
- https://vercel.com/dashboard
- View deployments, analytics, logs

**Bull Board (Queue Monitoring)**:
- https://YOUR_RAILWAY_URL.up.railway.app:3030
- Username: `admin`
- Password: `admin123`

---

## 💰 Free Tier Limits

### Railway
- $5 credit per month (resets monthly)
- ~500 hours of uptime
- Enough for: Demo, portfolio, low-traffic apps

### Vercel
- Unlimited deployments
- 100GB bandwidth per month
- Enough for: Most hobby projects

**If you exceed limits**: Railway will pause your app until next month

---

## 🔄 Update Deployment

### Update Backend
```bash
cd backend

# Make your changes, then:
git add .
git commit -m "Update backend"
git push

# Railway will auto-deploy (if GitHub linked)
# OR manually:
railway up
```

### Update Frontend
```bash
cd frontend-react

# Make your changes, then:
git add .
git commit -m "Update frontend"
git push

# Vercel will auto-deploy
# OR manually:
vercel --prod
```

---

## 📊 Your Deployed URLs

After deployment, you'll have:

- **Frontend**: `https://solana-dex-frontend.vercel.app`
- **Backend API**: `https://YOUR_RAILWAY_URL.up.railway.app`
- **Bull Board**: `https://YOUR_RAILWAY_URL.up.railway.app:3030`
- **WebSocket**: `wss://YOUR_RAILWAY_URL.up.railway.app`

**Share your frontend URL** to showcase your project! 🎉

---

## ⚠️ Important Notes

1. **Private Key Security**:
   - Never commit `.env` files
   - Use Railway's environment variables
   - Rotate keys if exposed

2. **Database Backups**:
   - Railway doesn't auto-backup free tier
   - Manually export data if needed

3. **Devnet vs Mainnet**:
   - Currently using devnet (free SOL)
   - To switch to mainnet: Change `RPC_URL` and add real SOL to wallet

4. **Monitoring**:
   - Check Railway logs regularly
   - Monitor wallet balance
   - Watch for errors in Vercel logs

---

## 🆘 Need Help?

**Railway Issues**:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

**Vercel Issues**:
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

**Project Issues**:
- Check logs first
- Verify environment variables
- Test locally before deploying

---

## ✅ Deployment Complete!

Your Solana DEX is now live and accessible worldwide! 🚀

Next steps:
- Share your frontend URL
- Add it to your portfolio/resume
- Monitor usage and logs
- Consider custom domain for professional look
