# X3 API — Trade Intelligence API with x402 Micropayments

![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Node: v18+](https://img.shields.io/badge/Node-v18%2B-blue)
![Payment: x402](https://img.shields.io/badge/Payment-x402-orange)

**Real-time trade analysis API powered by Claude AI + x402 micropayments on Base network.**

---

## **🚀 Overview**

X3 API analyzes trade data and returns:
- **Deterministic Metrics**: Win rate, profit factor, average win/loss
- **AI Scoring**: 5 dimensions (risk management, consistency, discipline, edge clarity)
- **Risk Flags**: Automatic pattern detection
- **Recommendations**: Prioritized action items

**Payment Model**: $0.12 per API call via x402 (USDC on Base)

---

## **📋 Quick Start**

### Prerequisites
- Node.js v18+
- Stripe account with "Stablecoins and Crypto" approved
- Coinbase Developer Platform account

### Installation

```bash
# Clone repo
git clone https://github.com/xxZavixx/x3-api-x402.git
cd x3-api-x402

# Install dependencies
npm install

# Create .env from template
cp .env.example .env.local

# Fill in your keys:
# STRIPE_SECRET_KEY, DEPOSIT_ADDRESS, CDP_API_KEY_ID, CDP_API_KEY_SECRET

# Start server
npm run dev
```

### First API Call

```bash
curl -X POST http://localhost:4242/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {
        "symbol": "XRP",
        "direction": "long",
        "entry": 0.5,
        "exit": 1.2,
        "qty": 100
      }
    ]
  }'
```

**Expected Response**: `HTTP 402 Payment Required` (normal—means server is working)

---

## **💰 Pricing**

| Metric | Value |
|--------|-------|
| **Price per call** | $0.12 |
| **Network** | Base |
| **Token** | USDC |
| **Settlement** | Real-time (on-chain) |
| **Margin** | ~83% |

**Example**: 1,000 API calls = $120 revenue, $20 Claude cost, $100 profit

---

## **API Documentation**

### Endpoint

```
POST /api/v1/x402/analyze
```

### Request Body

```json
{
  "trades": [
    {
      "symbol": "XRP",           // required: string
      "direction": "long",        // required: "long" | "short"
      "entry": 0.5,               // required: number > 0
      "exit": 1.2,                // required: number > 0
      "qty": 100,                 // required: number > 0
      "date": "2026-08-09",        // optional: YYYY-MM-DD
      "notes": "Breakout trade"    // optional: string
    }
  ]
}
```

### Response (Success)

```json
{
  "success": true,
  "metrics": {
    "netPL": 70.00,
    "winRate": 80.00,
    "profitFactor": 4.00,
    "avgWin": 10.00,
    "avgLoss": 2.50,
    "winCount": 4,
    "lossCount": 1,
    "totalTrades": 5
  },
  "aiAnalysis": {
    "overall": 75,
    "riskManagement": 72,
    "consistency": 78,
    "discipline": 76,
    "edgeClarity": 74,
    "grade": "C+",
    "flags": [
      {
        "severity": "medium",
        "type": "small_sample",
        "message": "Only 5 trades. Need 20+ for reliable analysis."
      }
    ],
    "recommendations": [
      "Increase trade sample size to at least 20 trades",
      "Focus on risk management: tighten stops",
      "Improve trade consistency with defined setups"
    ]
  },
  "payment": {
    "price": "$0.12",
    "network": "base",
    "currency": "USDC"
  },
  "timestamp": "2026-08-20T15:30:45Z"
}
```

### Response (Payment Required)

```
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "error": "payment_required",
  "message": "Send $0.12 USDC to address below, then retry",
  "x402": {
    "price": "$0.12",
    "network": "base",
    "paymentAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "stablecoin": "USDC"
  }
}
```

---

## **🧪 Testing**

### Local Testing (No Real Payment)

```bash
# Should return HTTP 402
npm run dev

# In another terminal
curl -X POST http://localhost:4242/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{"trades":[{"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}]}'
```

### Testing with Simulated Payment

```bash
# Install purl (Stripe's x402 test tool)
npm install -g purl

# Test with payment flow
purl http://localhost:4242/api/v1/x402/analyze \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"trades":[{"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}]}'
```

### Testing in Production

```bash
# After deployment, test live endpoint
curl -X POST https://api.x3digitalcapital.com/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{"trades":[{"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}]}'

# Check Stripe Dashboard for payment
https://dashboard.stripe.com/payments
```

---

## **🚢 Deployment**

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add STRIPE_SECRET_KEY
vercel env add DEPOSIT_ADDRESS
vercel env add CDP_API_KEY_ID
vercel env add CDP_API_KEY_SECRET

# Re-deploy with env vars
vercel --prod
```

### Deploy to Other Platforms

Works with any Node.js host (Railway, Render, Heroku, AWS Lambda, etc.):

```bash
# Environment variables required:
STRIPE_SECRET_KEY
DEPOSIT_ADDRESS
CDP_API_KEY_ID
CDP_API_KEY_SECRET

# Start command:
npm start
```

---

## **📊 Monitoring**

### View Payments in Stripe

```bash
# List all x402 payments
curl https://api.stripe.com/v1/payment_intents \
  -u "sk_live_YOUR_KEY:" \
  -d "payment_method_types[]=crypto" \
  -d "limit=100"
```

### View Transactions on Base

All transactions settle on Base network:
- Explorer: https://basescan.org/
- USDC Contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### Server Logs

```bash
# Real-time logs on Vercel
vercel logs --tail

# Last 100 entries
vercel logs
```

---

## **🔑 Environment Variables**

### Required

```env
STRIPE_SECRET_KEY=sk_live_...          # From https://dashboard.stripe.com/apikeys
DEPOSIT_ADDRESS=0x...                  # Created via curl (see setup guide)
CDP_API_KEY_ID=organizations/.../...   # From https://portal.cdp.coinbase.com/
CDP_API_KEY_SECRET=...                 # From https://portal.cdp.coinbase.com/
```

### Optional

```env
PORT=4242                              # Server port (default: 4242)
NODE_ENV=production                    # Node environment
ANTHROPIC_API_KEY=sk-ant-...          # For Claude API integration (optional)
```

---

## **📚 Documentation**

- **Setup Guide**: See [X3-API-X402-SETUP-GUIDE.md](./X3-API-X402-SETUP-GUIDE.md)
- **Quick Reference**: See [X3-API-X402-QUICK-REFERENCE.md](./X3-API-X402-QUICK-REFERENCE.md)
- **Stripe x402 Docs**: https://docs.stripe.com/payments/machine/x402
- **Coinbase CDP Docs**: https://docs.cdp.coinbase.com/x402

---

## **🛠️ Architecture**

```
Client (Agent/Bot)
       ↓
  [POST /analyze]
       ↓
  x402 Payment Middleware
       ↓ (checks payment)
  ┌─────────────────┐
  │ Not paid?       │ → HTTP 402 (return payment address)
  │ Paid?           │ → Process request
  └─────────────────┘
       ↓
  Trade Metrics Calculator
       ↓
  Claude AI Analysis
       ↓
  Response JSON
       ↓
  Record in Stripe PaymentIntent
       ↓
  Return to Client
```

---

## **💡 Use Cases**

- **Arbitrage Bots**: Analyze trades programmatically, get signals in real-time
- **Portfolio Managers**: Score portfolio performance on-demand
- **Trading Agents**: AI agents making automated trade decisions
- **Risk Managers**: Monitor risk patterns across many traders
- **Liquidation Hunters**: Evaluate trade sequences for patterns

---

## **📈 Pricing Model Advantages**

| vs Subscriptions | vs Per-Call (No Micropayments) |
|---|---|
| ✅ No monthly churn risk | ✅ Real-time settlement |
| ✅ Unlimited usage | ✅ No prepayment needed |
| ✅ Agent-friendly (no quotas) | ✅ Perfect margin (83%) |
| ✅ 83% margin | ✅ Scales infinitely |

---

## **🚨 Errors & Troubleshooting**

### "Missing required environment variables"

```bash
# Check .env.local
cat .env.local

# Must have all 4:
STRIPE_SECRET_KEY=sk_live_...
DEPOSIT_ADDRESS=0x...
CDP_API_KEY_ID=...
CDP_API_KEY_SECRET=...
```

### "Payment not settled"

- Verify Stripe "Stablecoins and Crypto" is **Active** (not Pending)
- Wait 24-48 hours if Pending (check email from Stripe)

### "Invalid CDP credentials"

- Go to https://portal.cdp.coinbase.com/
- Generate new API keys
- Double-check for extra spaces/newlines

### "Deposit address not found"

```bash
# Recreate address
curl https://api.stripe.com/v1/crypto/deposit_addresses \
  -u "sk_live_YOUR_SECRET_KEY:" \
  -H "Stripe-Version: 2026-05-27.preview" \
  -d network=base
```

---

## **📞 Support**

- **Stripe Support**: support@stripe.com
- **Issues**: https://github.com/xxZavixx/x3-api-x402/issues
- **Email**: api@x3digitalcapital.com

---

## **📄 License**

MIT

---

## **🎯 Status**

- ✅ Local testing working
- ✅ Stripe x402 integration complete
- ✅ Production deployment ready
- ⏳ Agent SDKs coming soon (x402-fetch, x402-python)

---

**Built with**: Hono, Stripe, Coinbase CDP, x402 Protocol

**Last Updated**: August 20, 2026
