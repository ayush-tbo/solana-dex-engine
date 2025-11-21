#!/bin/bash

# Solana DEX Deployment Script
# This script helps deploy to Railway + Vercel

set -e

echo "🚀 Solana DEX Deployment Helper"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found${NC}"
    echo "Install it with: npm install -g vercel"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"
echo -e "${GREEN}✅ Vercel CLI found${NC}"
echo ""

# Ask what to deploy
echo "What would you like to deploy?"
echo "1) Backend only (Railway)"
echo "2) Frontend only (Vercel)"
echo "3) Both (Backend + Frontend)"
read -p "Enter choice [1-3]: " choice

case $choice in
    1)
        echo ""
        echo "📦 Deploying Backend to Railway..."
        cd backend
        railway up
        echo ""
        echo -e "${GREEN}✅ Backend deployed!${NC}"
        echo "Get your URL with: railway domain"
        ;;
    2)
        echo ""
        read -p "Enter your Railway backend URL (e.g., https://xxx.up.railway.app): " backend_url

        if [ -z "$backend_url" ]; then
            echo -e "${RED}❌ Backend URL is required${NC}"
            exit 1
        fi

        echo "📦 Updating frontend environment..."
        cd frontend-react
        echo "VITE_API_URL=$backend_url" > .env.production

        echo "📦 Deploying Frontend to Vercel..."
        vercel --prod
        echo ""
        echo -e "${GREEN}✅ Frontend deployed!${NC}"
        ;;
    3)
        echo ""
        echo "📦 Step 1: Deploying Backend to Railway..."
        cd backend
        railway up
        echo ""
        echo -e "${GREEN}✅ Backend deployed!${NC}"
        echo ""

        read -p "Enter your Railway backend URL (from 'railway domain'): " backend_url

        if [ -z "$backend_url" ]; then
            echo -e "${RED}❌ Backend URL is required${NC}"
            exit 1
        fi

        echo ""
        echo "📦 Step 2: Updating frontend environment..."
        cd ../frontend-react
        echo "VITE_API_URL=$backend_url" > .env.production

        echo "📦 Step 3: Deploying Frontend to Vercel..."
        vercel --prod
        echo ""
        echo -e "${GREEN}✅ Both deployed successfully!${NC}"
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test your backend: curl https://your-backend.up.railway.app/health"
echo "2. Visit your frontend URL"
echo "3. Submit a test order"
echo "4. Check deployment logs if anything fails"
