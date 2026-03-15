// src/app/api/wipay/create-payment/route.ts
// Creates a WiPay payment session and returns the hosted checkout URL.
// Called by the client pay page before redirecting the user to WiPay.

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const WIPAY_API_URL  = 'https://bb.wipayfinancial.com/plugins/payments/request';
const ENVIRONMENT    = process.env.WIPAY_ENVIRONMENT ?? 'sandbox';     // 'sandbox' | 'live'
const ACCOUNT_NUMBER = process.env.WIPAY_ACCOUNT_NUMBER ?? '1234567890'; // sandbox default
const COUNTRY_CODE   = 'BB';
const CURRENCY       = 'USD';
const FEE_STRUCTURE  = 'merchant_absorb';
const ORIGIN         = 'valeo-health';

export async function POST(req: Request) {
  try {
    const {
      appointmentId,
      clientId,
      clientEmail,
      doctorId,
      amount,
      sessionType,
      sessionDate,
    } = await req.json();

    // ── Validate ──────────────────────────────────────────────────────────
    if (!appointmentId || !clientId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Missing required payment fields.' },
        { status: 400 },
      );
    }

    // ── Build the return URL ───────────────────────────────────────────────
    // WiPay appends ?status=&order_id=&transaction_id=&hash=&total= as query params.
    const baseUrl    = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://valeoexperience.com';
    const responseUrl = `${baseUrl}/payment/callback`;

    // ── Create a pending payment record in Firestore ───────────────────────
    // We use appointmentId as the order_id so we can look it up in the callback.
    // WiPay order_id: 1-48 alphanumeric + dashes, must start/end alphanumeric.
    // Firestore IDs are 20 alphanum chars — safe to use directly.
    const paymentRef = adminDb.collection('payments').doc();
    const paymentId  = paymentRef.id;

    await paymentRef.set({
      appointmentId,
      clientId,
      clientEmail:  clientEmail ?? '',
      doctorId:     doctorId    ?? '',
      amount,
      currency:     CURRENCY,
      status:       'pending',
      sessionType:  sessionType ?? 'Therapy Session',
      sessionDate:  sessionDate ?? '',
      provider:     'wipay',
      environment:  ENVIRONMENT,
      // Use paymentId as the WiPay order_id for unique reference
      wipayOrderId: paymentId,
      createdAt:    FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    });

    // ── Also mark the appointment as payment_pending ───────────────────────
    await adminDb.collection('appointments').doc(appointmentId).update({
      status:    'payment_pending',
      paymentId,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // ── POST to WiPay ──────────────────────────────────────────────────────
    const formBody = new URLSearchParams({
      account_number: ACCOUNT_NUMBER,
      avs:            '0',
      country_code:   COUNTRY_CODE,
      currency:       CURRENCY,
      environment:    ENVIRONMENT,
      fee_structure:  FEE_STRUCTURE,
      method:         'credit_card',
      order_id:       paymentId,          // our payment doc ID
      origin:         ORIGIN,
      response_url:   responseUrl,
      total:          amount.toFixed(2),
    }).toString();

    const wipayRes = await fetch(WIPAY_API_URL, {
      method:  'POST',
      headers: {
        'Accept':       'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody,
    });

    const wipayData = await wipayRes.json();

    if (!wipayRes.ok || !wipayData.url) {
      console.error('[WiPay] create-payment error:', wipayData);

      // Roll back payment record status
      await paymentRef.update({ status: 'failed', updatedAt: FieldValue.serverTimestamp() });

      return NextResponse.json(
        { error: wipayData.message ?? 'WiPay failed to create payment session.' },
        { status: 502 },
      );
    }

    // ── Return checkout URL to the client ─────────────────────────────────
    return NextResponse.json({
      checkoutUrl: wipayData.url,
      paymentId,
    });

  } catch (err) {
    console.error('[WiPay] create-payment exception:', err);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
