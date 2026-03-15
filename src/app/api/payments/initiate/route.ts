// src/app/api/wipay/verify-callback/route.ts
// Called by the client-side callback PAGE (not WiPay directly).
// Verifies the MD5 hash from WiPay's query params server-side, then
// updates Firestore payment + appointment + triggers Meet link creation.

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

const ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER ?? '1234567890';
const API_KEY        = process.env.WIPAY_API_KEY        ?? '123';        // sandbox default

export async function POST(req: Request) {
  try {
    const { status, order_id, transaction_id, hash, total, message } = await req.json();

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id.' }, { status: 400 });
    }

    const paymentRef = adminDb.collection('payments').doc(order_id);
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }

    const payment = paymentSnap.data()!;

    // ── Handle failure ─────────────────────────────────────────────────────
    // WiPay does NOT include a hash on failed transactions.
    if (status === 'fail' || status === 'failed') {
      await paymentRef.update({
        status:        'failed',
        wipayMessage:  message ?? 'Payment failed.',
        updatedAt:     FieldValue.serverTimestamp(),
      });
      await adminDb.collection('appointments').doc(payment.appointmentId).update({
        status:    'payment_failed',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ verified: false, status: 'failed' });
    }

    // ── Verify MD5 hash on success ─────────────────────────────────────────
    // Hash formula (from WiPay docs): MD5(account_number + api_key + total + order_id + "success")
    const expectedHash = crypto
      .createHash('md5')
      .update(`${ACCOUNT_NUMBER}${API_KEY}${total}${order_id}success`)
      .digest('hex');

    if (hash !== expectedHash) {
      console.error('[WiPay] Hash mismatch. Expected:', expectedHash, 'Got:', hash);
      return NextResponse.json({ error: 'Hash verification failed.' }, { status: 400 });
    }

    // ── Mark payment completed ─────────────────────────────────────────────
    await paymentRef.update({
      status:          'completed',
      wipayTransactionId: transaction_id ?? '',
      wipayMessage:    message ?? '',
      finalTotal:      parseFloat(total),
      updatedAt:       FieldValue.serverTimestamp(),
    });

    // ── Approve appointment + trigger Meet link ────────────────────────────
    await adminDb.collection('appointments').doc(payment.appointmentId).update({
      status:    'approved',
      paymentId: order_id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ── Trigger Google Meet link generation via existing API route ─────────
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.valeoexperience.com';
      await fetch(`${baseUrl}/api/appointments/generate-meet`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ appointmentId: payment.appointmentId }),
      });
    } catch (meetErr) {
      // Non-fatal — Meet link can be generated on-demand later
      console.warn('[WiPay] Meet link generation failed (non-fatal):', meetErr);
    }

    return NextResponse.json({ verified: true, status: 'completed' });

  } catch (err) {
    console.error('[WiPay] verify-callback exception:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
