# X3 API x402 — Quick Reference Cheat Sheet

---

## **Endpoint**

```
POST https://api.x3digitalcapital.com/api/v1/x402/analyze
```

**Local Testing:**
```
POST http://localhost:4242/api/v1/x402/analyze
```

---

## **Request Example**

```bash
curl -X POST https://api.x3digitalcapital.com/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "trades": [
      {
        "symbol": "XRP",
        "direction": "long",
        "entry": 0.5,
        "exit": 1.2,
        "qty": 100,
        "date": "2026-08-09",
        "notes": "Breakout trade"
      }
    ]
  }'
```

---

## **Payment Flow**

```
1. Client requests → Server
2. Server responds: HTTP 402 (Payment Required)
3. Client sends $0.12 USDC to address
4. Client retries with payment proof
5. Server verifies payment
6. Server returns trade analysis
```

---

## **Pricing**

| Metric | Value |
|--------|-------|
| Price per call | $0.12 |
| Network | Base |
| Token | USDC |
| Min payment | $0.12 |
| Settlement | Real-time |

---

## **Request Fields**

### Required

```json
{
  "trades": [
    {
      "symbol": "XRP",        // string
      "direction": "long",     // "long" or "short"
      "entry": 0.5,            // number > 0
      "exit": 1.2,             // number > 0
      "qty": 100               // number > 0
    }
  ]
}
```

### Optional

```json
{
  "date": "2026-08-09",      // YYYY-MM-DD
  "notes": "Breakout setup"   // string
}
```

---

## **Response (Success)**

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
    "flags": [...],
    "recommendations": [...]
  },
  "payment": {
    "price": "$0.12",
    "network": "base",
    "currency": "USDC"
  },
  "timestamp": "2026-08-20T15:30:45Z"
}
```

---

## **Response (Payment Required)**

```
HTTP/1.1 402 Payment Required
payment-required: eyJ4NDAyVmVyc2lvbiI6MiwiZXJyb3I6...
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

## **Error Responses**

### Invalid Trades

```json
{
  "error": "invalid_trade",
  "message": "Each trade needs: symbol, direction, entry, exit, qty"
}
```

### Too Many Trades

```json
{
  "error": "invalid_request",
  "message": "Maximum 100 trades per request"
}
```

### Insufficient Payment

```json
{
  "error": "insufficient_payment",
  "message": "Payment received but amount is less than $0.12"
}
```

### Server Error

```json
{
  "error": "internal_error",
  "message": "Server error processing request"
}
```

---

## **Setup Checklist**

- [ ] Stripe account created
- [ ] "Stablecoins and Crypto" approved
- [ ] Stripe Secret Key saved
- [ ] Deposit address created
- [ ] CDP account created
- [ ] CDP API keys saved
- [ ] `.env.local` configured
- [ ] `npm install` complete
- [ ] Server starts locally (`npm run dev`)
- [ ] Test without payment (HTTP 402)
- [ ] Test with payment (`purl`)
- [ ] Deploy to Vercel
- [ ] Env vars set in Vercel
- [ ] Test live endpoint
- [ ] Monitor in Stripe Dashboard

---

## **Commands**

### Local Testing

```bash
# Install
npm install

# Start server
npm run dev

# Test without payment (should return 402)
curl -X POST http://localhost:4242/api/v1/x402/analyze \
  -H "Content-Type: application/json" \
  -d '{"trades":[{"symbol":"XRP","direction":"long","entry":0.5,"exit":1.2,"qty":100}]}'

# Test with payment
npm install -g purl
purl http://localhost:4242/api/v1/x402/analyze
```

### Deployment

```bash
# Deploy to Vercel
vercel --prod

# View logs
vercel logs --tail

# Set env var
vercel env add STRIPE_SECRET_KEY
```

### Monitoring

```bash
# Check Stripe payments
curl https://api.stripe.com/v1/payment_intents \
  -u "sk_live_YOUR_KEY:" \
  -d "payment_method_types[]=crypto"

# View on Base
https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## **Important Links**

| Resource | URL |
|----------|-----|
| Stripe Dashboard | https://dashboard.stripe.com |
| Stripe x402 Docs | https://docs.stripe.com/payments/machine/x402 |
| CDP Portal | https://portal.cdp.coinbase.com/ |
| CDP Docs | https://docs.cdp.coinbase.com/x402 |
| Base Explorer | https://basescan.org/ |
| Vercel Dashboard | https://vercel.com/dashboard |

---

## **Environment Variables**

```bash
# Required
STRIPE_SECRET_KEY=sk_live_...
DEPOSIT_ADDRESS=0x...
CDP_API_KEY_ID=organizations/.../apiKeys/...
CDP_API_KEY_SECRET=...

# Optional
PORT=4242
NODE_ENV=production
ANTHROPIC_API_KEY=sk-ant-...
```

---

## **Price Breakdown**

**For 1,000 API calls:**

| Item | Calculation | Amount |
|------|-------------|--------|
| API Calls | 1,000 × $0.12 | $120.00 |
| Your Revenue | $120 - Claude cost | ~$100 |
| Claude Cost | 1,000 × $0.02 | $20.00 |
| Margin | $100 / $120 | **83%** |

---

## **What's Different from Subscriptions**

| Aspect | Subscription | x402 |
|--------|--------------|------|
| Pricing | $49/month | $0.12/call |
| Payment | Monthly invoice | Per-call |
| Settlement | 30 days | Real-time |
| Quotas | 500/month | Unlimited |
| Rate limits | 20/min | None |
| Risk | You finance Claude | Agent finances |

---

**Ready to accept micropayments! 🚀**
