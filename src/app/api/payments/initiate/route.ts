import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// ── WiPay config ──────────────────────────────────────────────────────────────
const WIPAY_ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER ?? "";
const WIPAY_API_KEY        = process.env.WIPAY_API_KEY        ?? "";
const WIPAY_ENVIRONMENT    = process.env.WIPAY_ENVIRONMENT    ?? "sandbox";
const WIPAY_BASE_URL       = WIPAY_ENVIRONMENT === "live"
  ? "https://wipayfinancial.com/v1/gateway"
  : "https://sandbox.wipayfinancial.com/v1/gateway";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.valeoexperience.com";

// ── Session Pricing (USD) ─────────────────────────────────────────────────────
const SESSION_PRICES: Record<string, number> = {
  "Individual Therapy": 400,
  "Couples Therapy":    600,
  "Life Coaching":      350,
  "Workplace Wellness": 500,
  "Free Consultation":  0,
};

// ── POST /api/payments/initiate ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Debug: log exactly what arrived ──────────────────────────────────────
    console.log("[Initiate] Raw body:", JSON.stringify(body));

    const {
      appointmentId,
      clientId,
      clientName,
      clientEmail,
      sessionType,
    } = body ?? {};

    // ── Validate required fields with specific logging ────────────────────────
    const missing: string[] = [];
    if (!appointmentId) missing.push("appointmentId");
    if (!clientId)      missing.push("clientId");
    if (!sessionType)   missing.push("sessionType");

    if (missing.length > 0) {
      console.error("[Initiate] Missing fields:", missing, "| Body was:", body);
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // ── Validate env vars ─────────────────────────────────────────────────────
    if (!WIPAY_ACCOUNT_NUMBER || !WIPAY_API_KEY) {
      console.error("[Initiate] WiPay env vars missing — WIPAY_ACCOUNT_NUMBER or WIPAY_API_KEY not set");
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 });
    }

    const amount = SESSION_PRICES[sessionType as string] ?? 400;

    // ── Free consultation — skip payment ──────────────────────────────────────
    if (amount === 0) {
      await adminDb.collection("appointments").doc(appointmentId).update({
        status:    "approved",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({
        redirect: `${APP_URL}/client/appointments?success=true&free=true`,
      });
    }

    // ── Create pending payment record in Firestore ────────────────────────────
    const paymentRef = await adminDb.collection("payments").add({
      appointmentId,
      clientId,
      clientName:  clientName  ?? "Client",
      clientEmail: clientEmail ?? "",
      sessionType,
      amount,
      currency:  "TTD",
      status:    "pending",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log("[Initiate] Payment record created:", paymentRef.id);

    // ── Build WiPay payload ───────────────────────────────────────────────────
    const payload = new URLSearchParams({
      account_number: WIPAY_ACCOUNT_NUMBER,
      avs:            "0",
      data_override:  "0",
      environment:    WIPAY_ENVIRONMENT,
      fee_structure:  "merchant_absorb",
      method:         "credit_card",
      order_id:       paymentRef.id,
      origin:         "Valeo Experience",
      return_url:     `${APP_URL}/payment/callback`,   // ← page, not API route
      total:          amount.toFixed(2),
      name:           clientName  ?? "Client",
      email:          clientEmail ?? "",
    });

    console.log("[Initiate] Calling WiPay:", WIPAY_BASE_URL, "env:", WIPAY_ENVIRONMENT);

    // ── Call WiPay ────────────────────────────────────────────────────────────
    const wipayRes  = await fetch(WIPAY_BASE_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    payload.toString(),
    });

    const wipayData = await wipayRes.json();
    console.log("[Initiate] WiPay response:", JSON.stringify(wipayData));

    if (!wipayData.url) {
      console.error("[Initiate] WiPay returned no URL:", wipayData);
      // Clean up the pending payment record since WiPay rejected
      await paymentRef.delete();
      return NextResponse.json(
        { error: wipayData.message ?? "Payment gateway error" },
        { status: 502 }
      );
    }

    // ── Store WiPay reference and return redirect URL ─────────────────────────
    await paymentRef.update({ wipayRef: wipayData.url });
    return NextResponse.json({ redirect: wipayData.url });

  } catch (err) {
    console.error("[Initiate] Unhandled exception:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
