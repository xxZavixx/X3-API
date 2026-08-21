/**
 * X3 API - x402 Backend Server
 * Trade Intelligence API with x402 micropayment support
 * 
 * Follows Stripe Official Documentation:
 * https://docs.stripe.com/payments/machine/x402
 * 
 * Setup:
 * 1. npm install
 * 2. Create .env.local with credentials
 * 3. node x3-api-x402-server.js
 */

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createFacilitatorConfig } from "@coinbase/x402";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import Stripe from "stripe";

// ============ LOAD ENVIRONMENT VARIABLES ============
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, ".env.local");

console.log(`Loading environment from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn("⚠️  Warning: Could not load .env.local file:", result.error.message);
} else {
  console.log("✅ .env.local loaded successfully");
}

// ============ ENVIRONMENT SETUP ============
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DEPOSIT_ADDRESS = process.env.DEPOSIT_ADDRESS?.toLowerCase();
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;
const PORT = process.env.PORT || 4242;

// Debug output
console.log("\n📋 Environment Variables Check:");
console.log(`  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY ? "✅ SET (" + STRIPE_SECRET_KEY.substring(0, 20) + "...)" : "❌ MISSING"}`);
console.log(`  DEPOSIT_ADDRESS: ${DEPOSIT_ADDRESS ? "✅ SET (" + DEPOSIT_ADDRESS + ")" : "❌ MISSING"}`);
console.log(`  CDP_API_KEY_ID: ${CDP_API_KEY_ID ? "✅ SET (" + CDP_API_KEY_ID.substring(0, 30) + "...)" : "❌ MISSING"}`);
console.log(`  CDP_API_KEY_SECRET: ${CDP_API_KEY_SECRET ? "✅ SET (" + CDP_API_KEY_SECRET.substring(0, 20) + "...)" : "❌ MISSING"}`);
console.log(`  PORT: ${PORT}\n`);

// Validate all required variables
if (!STRIPE_SECRET_KEY || !DEPOSIT_ADDRESS || !CDP_API_KEY_ID || !CDP_API_KEY_SECRET) {
  console.error("\n❌ ERROR: Missing required environment variables!");
  console.error("Make sure your .env.local file has:");
  console.error("  - STRIPE_SECRET_KEY");
  console.error("  - DEPOSIT_ADDRESS");
  console.error("  - CDP_API_KEY_ID");
  console.error("  - CDP_API_KEY_SECRET");
  console.error("\nChecked in:", envPath);
  process.exit(1);
}

// ============ INITIALIZE APP ============
const app = new Hono();

// ============ INITIALIZE FACILITATOR ============
const facilitatorClient = new HTTPFacilitatorClient(
  createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET),
);

const resourceServer = new x402ResourceServer(facilitatorClient).register(
  "eip155:8453", // Base network
  new ExactEvmScheme(),
);

// ============ INITIALIZE STRIPE ============
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-05-27.preview",
});

// ============ MIDDLEWARE ============
app.use("*", async (c, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${c.req.method} ${c.req.path}`);
  await next();
});

// ============ HEALTH CHECK ============
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    deposit_address: DEPOSIT_ADDRESS,
  });
});

// ============ CONFIGURE PAYMENT MIDDLEWARE ============
// Price: $0.12 per call
// Network: Base (USDC)
// Requires Stripe approval for "Stablecoins and Crypto" payment method

app.use(
  paymentMiddleware(
    {
      "POST /api/v1/x402/analyze": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.12",
            network: "eip155:8453",
            payTo: DEPOSIT_ADDRESS,
          },
        ],
        description: "Trade intelligence analysis",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

// ============ X3 API ENDPOINT ============
/**
 * POST /api/v1/x402/analyze
 * 
 * Payment flow:
 * 1. Client calls endpoint without payment → HTTP 402
 * 2. Client sends $0.12 USDC to returned address
 * 3. Client retries with payment proof
 * 4. Server verifies payment via facilitator
 * 5. Server returns trade analysis
 * 
 * Request body:
 * {
 *   "trades": [
 *     {
 *       "symbol": "XRP",
 *       "direction": "long",
 *       "entry": 0.5,
 *       "exit": 1.2,
 *       "qty": 100,
 *       "date": "2026-08-09",
 *       "notes": "Breakout trade"
 *     }
 *   ]
 * }
 */

app.post("/api/v1/x402/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const { trades } = body;

    // ============ VALIDATE INPUT ============
    if (!trades || !Array.isArray(trades) || trades.length === 0) {
      return c.json(
        {
          error: "invalid_request",
          message: "Request must include 'trades' array with at least one trade",
        },
        { status: 400 }
      );
    }

    if (trades.length > 100) {
      return c.json(
        {
          error: "invalid_request",
          message: "Maximum 100 trades per request",
        },
        { status: 400 }
      );
    }

    // Validate each trade
    for (const trade of trades) {
      const required = ["symbol", "direction", "entry", "exit", "qty"];
      const missing = required.filter((field) => !(field in trade));
      if (missing.length > 0) {
        return c.json(
          {
            error: "invalid_trade",
            message: `Each trade needs: ${required.join(", ")}. Missing: ${missing.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // Validate types
      if (typeof trade.symbol !== "string") {
        return c.json(
          { error: "invalid_trade", message: "symbol must be string" },
          { status: 400 }
        );
      }
      if (!["long", "short"].includes(trade.direction)) {
        return c.json(
          { error: "invalid_trade", message: "direction must be 'long' or 'short'" },
          { status: 400 }
        );
      }
      if (typeof trade.entry !== "number" || trade.entry <= 0) {
        return c.json(
          { error: "invalid_trade", message: "entry must be positive number" },
          { status: 400 }
        );
      }
      if (typeof trade.exit !== "number" || trade.exit <= 0) {
        return c.json(
          { error: "invalid_trade", message: "exit must be positive number" },
          { status: 400 }
        );
      }
      if (typeof trade.qty !== "number" || trade.qty <= 0) {
        return c.json(
          { error: "invalid_trade", message: "qty must be positive number" },
          { status: 400 }
        );
      }
    }

    // ============ CALCULATE METRICS ============
    const metrics = calculateMetrics(trades);

    // ============ CALL CLAUDE FOR AI ANALYSIS ============
    // Replace this with your actual Claude API call
    const aiAnalysis = await getClaudeAnalysis(trades, metrics);

    // ============ RETURN ANALYSIS ============
    return c.json({
      success: true,
      metrics: metrics,
      aiAnalysis: aiAnalysis,
      payment: {
        price: "$0.12",
        network: "base",
        currency: "USDC",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /analyze:", error);
    return c.json(
      {
        error: "internal_error",
        message: "Server error processing request",
      },
      { status: 500 }
    );
  }
});

// ============ HELPER: CALCULATE METRICS ============
function calculateMetrics(trades) {
  let totalWins = 0;
  let totalLosses = 0;
  let winCount = 0;
  let lossCount = 0;
  let netPL = 0;

  for (const trade of trades) {
    const pl = (trade.exit - trade.entry) * trade.qty;
    netPL += pl;

    if (pl > 0) {
      totalWins += pl;
      winCount++;
    } else if (pl < 0) {
      totalLosses += Math.abs(pl);
      lossCount++;
    }
  }

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
  const avgWin = winCount > 0 ? totalWins / winCount : 0;
  const avgLoss = lossCount > 0 ? totalLosses / lossCount : 0;

  return {
    netPL: parseFloat(netPL.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(2)),
    profitFactor: parseFloat(profitFactor.toFixed(2)),
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    winCount,
    lossCount,
    totalTrades,
  };
}

// ============ HELPER: GET CLAUDE ANALYSIS ============
// Replace with your actual Claude API integration
async function getClaudeAnalysis(trades, metrics) {
  try {
    // Example: Use Anthropic SDK
    // const message = await client.messages.create({...})
    
    // For now, return structured analysis
    return {
      overall: 72,
      riskManagement: 68,
      consistency: 75,
      discipline: 70,
      edgeClarity: 73,
      grade: "C+",
      flags: [
        {
          severity: "medium",
          type: "small_sample",
          message: "Only " + trades.length + " trades. Need 20+ for reliable analysis.",
        },
      ],
      recommendations: [
        "Increase trade sample size to at least 20 trades",
        "Focus on risk management: tighten stops",
        "Improve trade consistency with defined setups",
      ],
    };
  } catch (error) {
    console.error("Error getting Claude analysis:", error);
    return {
      overall: 0,
      error: "Could not generate AI analysis",
    };
  }
}

// ============ RECORD PAYMENTS IN STRIPE ============
// Called automatically after payment is settled on-chain
resourceServer.onAfterSettle(async ({ result, requirements }) => {
  const txHash = result.transaction;
  if (!txHash || !result.success) {
    console.warn("Payment not settled or failed:", result);
    return;
  }

  try {
    // requirements.amount is in atomic USDC units (6 decimals)
    // $0.12 = 120000 atomic units
    // Convert to cents for Stripe: 120000 / 10000 = 12 cents = $0.12
    const amountInCents = Math.round(Number(requirements.amount) / 10000);
    if (amountInCents < 1) {
      console.warn("Amount too small to record:", amountInCents);
      return;
    }

    const pi = await stripe.paymentIntents.create(
      {
        amount: amountInCents,
        currency: "usd",
        confirm: true,
        payment_method_data: { type: "crypto" },
        payment_method_types: ["crypto"],
        payment_method_options: {
          crypto: {
            mode: "transaction_verification",
            transaction_verification_options: {
              network: "base",
              transaction_hash: txHash,
            },
          },
        },
      },
      { idempotencyKey: txHash }
    );

    console.log(`✅ Recorded PaymentIntent ${pi.id} for tx ${txHash}`);
  } catch (error) {
    console.error("Error recording payment in Stripe:", error);
  }
});

// ============ START SERVER ============
const PORT_NUM = parseInt(PORT, 10);
console.log(`
╔════════════════════════════════════════════════════╗
║          X3 API - x402 Backend Server              ║
║                  LIVE AND READY                    ║
╚════════════════════════════════════════════════════╝

🚀 Server running on port ${PORT_NUM}
📍 Endpoint: POST http://localhost:${PORT_NUM}/api/v1/x402/analyze
💰 Price: $0.12 per call (USDC on Base)
📧 Deposit Address: ${DEPOSIT_ADDRESS}
🟢 Health: http://localhost:${PORT_NUM}/health

Ready to accept x402 payments! ✨
`);

serve({ fetch: app.fetch, port: PORT_NUM });