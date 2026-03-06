import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ── GET /api/payments/callback ────────────────────────────────────────────
// WiPay redirects the client here after payment attempt.
// We verify the result, update Firestore, and redirect the client.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const orderId     = searchParams.get("order_id");
  const status      = searchParams.get("status");       // "success" | "failed"
  const transaction = searchParams.get("transaction_id");
  const total       = searchParams.get("total");

  if (!orderId) {
    return NextResponse.redirect(`${APP_URL}/client/appointments?error=missing_order`);
  }

  try {
    const paymentRef = adminDb.collection("payments").doc(orderId);
    const paymentDoc = await paymentRef.get();

    if (!paymentDoc.exists) {
      return NextResponse.redirect(`${APP_URL}/client/appointments?error=not_found`);
    }

    const payment = paymentDoc.data()!;

    if (status === "success") {
      // Update payment record
      await paymentRef.update({
        status:        "completed",
        transactionId: transaction,
        paidAt:        FieldValue.serverTimestamp(),
        updatedAt:     FieldValue.serverTimestamp(),
      });

      // Approve the appointment
      await adminDb.collection("appointments").doc(payment.appointmentId).update({
        status:    "approved",
        paymentId: orderId,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.redirect(
        `${APP_URL}/client/appointments?success=true&transaction=${transaction}`
      );

    } else {
      // Payment failed or was cancelled
      await paymentRef.update({
        status:    "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Delete the pending appointment so client can try again
      await adminDb.collection("appointments").doc(payment.appointmentId).update({
        status:    "cancelled",
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.redirect(
        `${APP_URL}/client/appointments?error=payment_failed`
      );
    }

  } catch (err) {
    console.error("Payment callback error:", err);
    return NextResponse.redirect(`${APP_URL}/client/appointments?error=server_error`);
  }
}
