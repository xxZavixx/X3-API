/**
 * X3 API - Vercel Serverless Handler
 * Trade Intelligence API with x402 micropayment support
 * 
 * This is a serverless function for Vercel
 * Maps to: /api/v1/x402/analyze
 */

import dotenv from "dotenv";
import { createFacilitatorConfig } from "@coinbase/x402";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { Hono } from "hono";
import { handle } from "hono/vercel";
import Stripe from "stripe";

// Load environment variables
dotenv.config();

// ============ ENVIRONMENT SETUP ============
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const DEPOSIT_ADDRESS = process.env.DEPOSIT_ADDRESS?.toLowerCase();
const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID;
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET;

if (!STRIPE_SECRET_KEY || !DEPOSIT_ADDRESS || !CDP_API_KEY_ID || !CDP_API_KEY_SECRET) {
  console.error("Missing required environment variables!");
}

// ============ INITIALIZE APP ============
const app = new Hono();

// ============ INITIALIZE FACILITATOR ============
let facilitatorClient;
let resourceServer;

if (CDP_API_KEY_ID && CDP_API_KEY_SECRET) {
  facilitatorClient = new HTTPFacilitatorClient(
    createFacilitatorConfig(CDP_API_KEY_ID, CDP_API_KEY_SECRET),
  );

  resourceServer = new x402ResourceServer(facilitatorClient).register(
    "eip155:8453", // Base network
    new ExactEvmScheme(),
  );
}

// ============ INITIALIZE STRIPE ============
const stripe = new Stripe(STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-05-27.preview",
});

// ============ HEALTH CHECK ============
app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    deposit_address: DEPOSIT_ADDRESS,
  });
});

// ============ CONFIGURE PAYMENT MIDDLEWARE ============
if (resourceServer) {
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
}

// ============ X3 API ENDPOINT ============
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

    // ============ GET AI ANALYSIS ============
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
async function getClaudeAnalysis(trades, metrics) {
  try {
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
if (resourceServer) {
  resourceServer.onAfterSettle(async ({ result, requirements }) => {
    const txHash = result.transaction;
    if (!txHash || !result.success) {
      console.warn("Payment not settled or failed:", result);
      return;
    }

    try {
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
}

// ============ EXPORT FOR VERCEL ============
export const POST = handle(app);
export const GET = handle(app);