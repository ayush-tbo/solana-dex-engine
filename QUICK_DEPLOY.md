# ⚡ Quick Deploy Instructions

## What I Did For You:

✅ Created `backend/railway.json` - Railway deployment config
✅ Created `backend/.railwayignore` - Files to ignore on Railway
✅ Created `frontend-react/vercel.json` - Vercel deployment config
✅ Created `frontend-react/.env.production` - Production environment template
✅ Created `DEPLOYMENT_GUIDE.md` - Complete step-by-step guide
✅ Created `deploy.sh` - Automated deployment script

---

## 🎯 What YOU Need to Do:

### Step 1: Install CLIs (2 minutes)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Install Vercel CLI
npm install -g vercel
```

### Step 2: Push to GitHub (2 minutes)
```bash
# If you haven't already committed:
git add .
git commit -m "feat: ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/solana-dex.git
git push -u origin main
```

### Step 3: Get Your Solana Private Key (1 minute)
```bash
# Option A: Use existing wallet
cat backend/.env | grep SOLANA_PRIVATE_KEY

# Option B: Create new devnet wallet (recommended)
solana-keygen new --outfile ~/solana-deploy.json
cat ~/solana-deploy.json  # Copy this array
solana-keygen pubkey ~/solana-deploy.json  # Get address
solana airdrop 2 <ADDRESS> --url https://api.devnet.solana.com
```

### Step 4: Deploy Backend to Railway (5 minutes)
```bash
cd backend

# Login
railway login

# Initialize
railway init
# Choose: "Create new project"
# Name: "solana-dex-backend"

# Add PostgreSQL
railway add
# Select: PostgreSQL

# Add Redis
railway add
# Select: Redis

# Set environment variables
railway variables set NODE_ENV=production
railway variables set USE_REAL_DEX=true
railway variables set RPC_URL=https://api.devnet.solana.com
railway variables set SOLANA_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"

# Deploy!
railway up

# Get your URL
railway domain
# Save this URL! Example: solana-dex-backend.up.railway.app
```

### Step 5: Deploy Frontend to Vercel (3 minutes)
```bash
cd ../frontend-react

# Update with YOUR Railway URL
echo "VITE_API_URL=https://YOUR-RAILWAY-URL.up.railway.app" > .env.production

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Step 6: Test It! (2 minutes)
```bash
# Test backend
curl https://YOUR-RAILWAY-URL.up.railway.app/health

# Visit frontend
# Go to: https://YOUR-VERCEL-URL.vercel.app
```

---

## 🤖 Or Use the Automated Script:

```bash
# Make sure you're in project root
./deploy.sh

# Follow the prompts!
```

---

## 📚 Need More Help?

Read the complete guide: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)

---

## 🎉 That's It!

Total time: **~15 minutes**
Total cost: **$0**

Your Solana DEX will be live at:
- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-app.up.railway.app
- **Bull Board**: https://your-app.up.railway.app:3030

Share your frontend URL to showcase your project! 🚀
