# X3 API x402 Backend — Complete Setup Guide

**Status:** Ready to deploy  
**Payment Model:** x402 micropayments ($0.12/call USDC on Base)  
**Framework:** Hono + Stripe + Coinbase CDP

---

## **Overview**

This guide covers:
1. Prerequisites & Approvals
2. Local Setup & Testing
3. Deployment to Production
4. Monitoring & Troubleshooting

---

## **Part 1: Prerequisites (Do These First)**

### **1.1 Stripe Account Setup**

You should have already done this, but verify:

✅ Stripe account created: https://dashboard.stripe.com  
✅ Requested "Stablecoins and Crypto" payment method:
   - Go to: Settings → Payment Methods
   - Click: Request "Stablecoins and Crypto"
   - Status should be: **Active** (not Pending)

If still Pending, **wait for Stripe email approval** (24-48 hours).

### **1.2 Get Your Stripe Secret Key**

```bash
# Go to: https://dashboard.stripe.com/apikeys
# Copy your "Secret key (live)" (starts with sk_live_)
# Save as STRIPE_SECRET_KEY in .env
```

### **1.3 Create Stripe Deposit Address**

This is where agents send USDC to pay for API calls.

```bash
curl https://api.stripe.com/v1/crypto/deposit_addresses \
  -u "sk_live_YOUR_SECRET_KEY:" \
  -H "Stripe-Version: 2026-05-27.preview" \
  -d network=base
```

Response:
```json
{
  "id": "cda_...",
  "address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "network": "base",
  "chain": "eip155:8453"
}
```

**Save the address as `DEPOSIT_ADDRESS` in .env**

### **1.4 Create Coinbase Developer Platform Account**

x402 payments are settled via CDP facilitator.

1. **Sign up:** https://portal.cdp.coinbase.com/
2. **Create API keys:**
   - Click: "API Keys"
   - Create: New API key
   - Copy: `API_KEY_ID` and `API_KEY_SECRET`
3. **Save to .env:**
   ```
   CDP_API_KEY_ID=organizations/.../apiKeys/...
   CDP_API_KEY_SECRET=your_secret_key
   ```

---

## **Part 2: Local Setup & Testing**

### **2.1 Install Dependencies**

```bash
# Clone or create project directory
mkdir x3-api-x402
cd x3-api-x402

# Copy files:
# - x3-api-x402-server.js (main server)
# - package.json (dependencies)
# - .env.example (template)

# Install Node dependencies
npm install

# Create .env with your actual values
cp .env.example .env.local
# Edit .env.local and fill in:
# - STRIPE_SECRET_KEY
# - DEPOSIT_ADDRESS
# - CDP_API_KEY_ID
# - CDP_API_KEY_SECRET
```

### **2.2 Verify Environment Variables**

```bash
# Check that .env.local is properly configured
cat .env.local

# Make sure you see:
# STRIPE_SECRET_KEY=sk_live_...
# DEPOSIT_ADDRESS=0x...
# CDP_API_KEY_ID=...
# CDP_API_KEY_SECRET=...
```

### **2.3 Start Server Locally**

```bash
npm run dev
# or:
npm start

# You should see:
# 🚀 X3 API x402 Server running on port 4242
# 📍 Endpoint: POST http://localhost:4242/api/v1/x402/analyze
# 💰 Price: $0.12 per call (USDC on Base)
```

### **2.4 Test Payment Flow (Locally)**

#### **Step 1: Test without payment (should return 402)**

```bash
curl -iv -X POST http://localhost:4242/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}
    ]
  }'

# Expected response:
# HTTP/1.1 402 Payment Required
# payment-required: eyJ4NDAyVmVyc2lvbiI6...
```

#### **Step 2: Use `purl` to test with payment**

`purl` is Stripe's CLI tool for testing x402 payments locally.

```bash
# Install purl
npm install -g purl

# Make request with payment handling
purl http://localhost:4242/api/v1/x402/analyze \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}
    ]
  }'

# purl will:
# 1. Detect HTTP 402
# 2. Show payment address
# 3. Simulate payment on Base testnet
# 4. Retry request with proof
# 5. Return trade analysis
```

#### **Step 3: Verify in Stripe Dashboard**

Once payment is tested:
- Go to: https://dashboard.stripe.com/payments
- Look for new PaymentIntent
- Status should be: **Succeeded**
- Amount: $0.12

---

## **Part 3: Deployment to Production**

### **3.1 Prepare Repository**

```bash
# Structure your GitHub repo:
x3-api-x402/
├── x3-api-x402-server.js      # Main server
├── package.json               # Dependencies
├── .env.example              # Template (no secrets!)
├── .gitignore               # Add: .env, .env.local, node_modules
├── README.md                # Documentation
└── vercel.json             # Vercel deployment config

# Create .gitignore
cat > .gitignore << EOF
node_modules/
.env
.env.local
.DS_Store
*.log
EOF
```

### **3.2 Create vercel.json**

```json
{
  "buildCommand": "npm install",
  "installCommand": "npm install",
  "env": {
    "STRIPE_SECRET_KEY": "@stripe_secret_key",
    "DEPOSIT_ADDRESS": "@deposit_address",
    "CDP_API_KEY_ID": "@cdp_api_key_id",
    "CDP_API_KEY_SECRET": "@cdp_api_key_secret"
  }
}
```

### **3.3 Push to GitHub**

```bash
git init
git add .
git commit -m "Initial: X3 API x402 backend"
git branch -M main
git remote add origin https://github.com/xxZavixx/x3-api-x402.git
git push -u origin main
```

### **3.4 Deploy to Vercel**

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# When prompted:
# Set up new project: Yes
# Link to existing project: No
# Name project: x3-api-x402
# Framework: Other
# Command: npm start
```

### **3.5 Set Environment Variables in Vercel**

```bash
# Go to: https://vercel.com/dashboard/x3-api-x402/settings/environment-variables

# Add these (DO NOT paste values yet, use Vercel secrets):
STRIPE_SECRET_KEY        # Paste your sk_live_ key
DEPOSIT_ADDRESS          # Paste your 0x... address
CDP_API_KEY_ID           # Paste your API key ID
CDP_API_KEY_SECRET       # Paste your secret
```

Or via CLI:
```bash
vercel env add STRIPE_SECRET_KEY
vercel env add DEPOSIT_ADDRESS
vercel env add CDP_API_KEY_ID
vercel env add CDP_API_KEY_SECRET

# Re-deploy with env vars
vercel --prod
```

### **3.6 Update Domain**

Once deployed, update your landing page to point to the new endpoint:

```
https://api.x3digitalcapital.com/api/v1/x402/analyze
```

If you need to use a custom domain:
```bash
# In Vercel dashboard:
# Settings → Domains
# Add: api.x3digitalcapital.com
# Add DNS records (Vercel will show instructions)
```

---

## **Part 4: Testing in Production**

### **4.1 Test Live Endpoint**

```bash
# After deployment to Vercel, test the live endpoint
curl -X POST https://api.x3digitalcapital.com/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}
    ]
  }'

# Should return:
# HTTP/1.1 402 Payment Required
```

### **4.2 Test with Real Payment (Optional)**

To test with real USDC on Base:

```bash
# Use x402-fetch library
npm install x402-fetch

# JavaScript test:
import { x402Fetch } from 'x402-fetch';

const result = await x402Fetch(
  'https://api.x3digitalcapital.com/api/v1/x402/analyze',
  {
    walletPrivateKey: process.env.TEST_WALLET_KEY,
    chain: 'base',
    method: 'POST',
    body: {
      trades: [
        {
          symbol: 'XRP',
          direction: 'long',
          entry: 0.5,
          exit: 1.2,
          qty: 100
        }
      ]
    }
  }
);

console.log(result);
```

### **4.3 Monitor in Stripe Dashboard**

- Go to: https://dashboard.stripe.com/payments
- Watch for new PaymentIntents
- Check transaction hashes on Base: https://basescan.org/

---

## **Part 5: Troubleshooting**

### **Error: "Missing required environment variables"**

**Fix:**
```bash
# Verify .env.local has all required vars
cat .env.local

# Must include:
STRIPE_SECRET_KEY=sk_live_...
DEPOSIT_ADDRESS=0x...
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

### **Error: "Payment not settled"**

**Fix:**
- Verify Stripe "Stablecoins and Crypto" is **Active** (not Pending)
- Wait 24-48 hours if still Pending
- Check Stripe Dashboard for approval emails

### **Error: "Invalid CDP credentials"**

**Fix:**
```bash
# Verify CDP API keys are correct
# Go to: https://portal.cdp.coinbase.com/
# Click: API Keys
# Copy exact values (no extra spaces)
# Update .env with exact values
```

### **Error: "Deposit address not found"**

**Fix:**
```bash
# Create deposit address via curl
curl https://api.stripe.com/v1/crypto/deposit_addresses \
  -u "sk_live_YOUR_SECRET_KEY:" \
  -H "Stripe-Version: 2026-05-27.preview" \
  -d network=base

# Save returned address to DEPOSIT_ADDRESS
```

### **Server runs but no payments recorded**

**Fix:**
- Check Vercel logs: `vercel logs`
- Verify Stripe API version is `2026-05-27.preview`
- Check that `onAfterSettle` callback is firing
- Look for PaymentIntent errors in Stripe Dashboard

---

## **Part 6: Monitoring & Metrics**

### **Track Revenue**

```bash
# Get all x402 PaymentIntents from Stripe
curl https://api.stripe.com/v1/payment_intents \
  -u "sk_live_YOUR_SECRET_KEY:" \
  -d "payment_method_types[]=crypto" \
  -d "limit=100"
```

### **Monitor Usage**

Set up alerts in Vercel:
- Go to: Project → Settings → Alerts
- Create alert for: Error rate > 5%
- Create alert for: Request latency > 2s

### **Logs**

```bash
# Real-time logs
vercel logs --tail

# Last 100 log entries
vercel logs
```

---

## **Next Steps**

1. ✅ Complete local testing with `purl`
2. ✅ Deploy to Vercel with env vars
3. ✅ Test live endpoint
4. ✅ Deploy updated landing page
5. ✅ Announce to community
6. ✅ Start receiving x402 payments

---

## **Support**

- Stripe x402 Docs: https://docs.stripe.com/payments/machine/x402
- Coinbase CDP Docs: https://docs.cdp.coinbase.com/x402
- Test transactions on Base: https://basescan.org/
- Stripe Support: support@stripe.com

---

**You're ready to accept x402 payments! 🚀**
