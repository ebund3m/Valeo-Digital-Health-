import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ── WiPay config (set these in .env.local) ────────────────────────────────
const WIPAY_ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER!;
const WIPAY_API_KEY        = process.env.WIPAY_API_KEY!;
const WIPAY_ENVIRONMENT    = process.env.WIPAY_ENVIRONMENT ?? "sandbox"; // "live" in production
const WIPAY_BASE_URL       = WIPAY_ENVIRONMENT === "live"
  ? "https://wipayfinancial.com/v1/gateway"
  : "https://sandbox.wipayfinancial.com/v1/gateway";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── Session pricing (TTD) ─────────────────────────────────────────────────
const SESSION_PRICES: Record<string, number> = {
  "Individual Therapy":  400,
  "Couples Therapy":     600,
  "Life Coaching":       350,
  "Workplace Wellness":  500,
  "Free Consultation":   0,
};

// ── POST /api/payments/initiate ───────────────────────────────────────────
// Called when client confirms booking. Creates a pending payment record
// and returns the WiPay redirect URL.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, clientId, clientName, clientEmail, sessionType } = body;

    if (!appointmentId || !clientId || !sessionType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amount = SESSION_PRICES[sessionType] ?? 400;

    // Free consultation — skip payment, mark appointment as approved directly
    if (amount === 0) {
      await adminDb.collection("appointments").doc(appointmentId).update({
        status:    "approved",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ redirect: `${APP_URL}/client/appointments?success=true&free=true` });
    }

    // Create a pending payment record in Firestore
    const paymentRef = await adminDb.collection("payments").add({
      appointmentId,
      clientId,
      clientName,
      clientEmail,
      sessionType,
      amount,
      currency:  "TTD",
      status:    "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Build WiPay payload
    const payload = new URLSearchParams({
      account_number: WIPAY_ACCOUNT_NUMBER,
      avs:            "0",
      data_override:  "0",
      environment:    WIPAY_ENVIRONMENT,
      fee_structure:  "merchant_absorb", // merchant pays the fee
      method:         "credit_card",
      order_id:       paymentRef.id,
      origin:         "Valeo Experience",
      return_url:     `${APP_URL}/api/payments/callback`,
      total:          amount.toFixed(2),
      name:           clientName,
      email:          clientEmail,
    });

    // Call WiPay to get redirect URL
    const wipayRes = await fetch(WIPAY_BASE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    payload.toString(),
    });

    const wipayData = await wipayRes.json();

    if (!wipayData.url) {
      console.error("WiPay initiation failed:", wipayData);
      return NextResponse.json({ error: "Payment gateway error" }, { status: 502 });
    }

    // Store the WiPay transaction reference
    await paymentRef.update({ wipayRef: wipayData.url });

    return NextResponse.json({ redirect: wipayData.url });

  } catch (err) {
    console.error("Payment initiation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
