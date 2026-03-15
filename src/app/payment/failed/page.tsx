'use client';

// src/app/payment/failed/page.tsx

import Link from 'next/link';
import { XCircle, RefreshCw, MessageCircle } from 'lucide-react';

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0D3B44 0%, #1A535C 100%)' }}>
      <div className="rounded-3xl p-10 text-center max-w-sm w-full"
        style={{ background: 'white', boxShadow: '0 20px 60px rgba(13,59,68,0.25)' }}>

        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: 'rgba(232,96,76,0.1)' }}>
          <XCircle size={32} style={{ color: '#E8604C' }} />
        </div>

        <h2 className="text-2xl mb-2"
          style={{ fontFamily: 'var(--font-dm-serif)', color: '#0D3B44' }}>
          Payment Failed
        </h2>
        <p className="text-sm mb-6" style={{ color: '#8A9BA8' }}>
          Your payment could not be processed. No charge was made to your card.
          Please try again or contact support if the issue persists.
        </p>

        {/* Retry */}
        <Link href="/client/appointments"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-white mb-3 transition-all hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, #0D3B44, #1A535C)' }}>
          <RefreshCw size={15} /> Try Again
        </Link>

        {/* Support */}
        <a href="mailto:support@valeoexperience.com"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold mb-3"
          style={{ background: 'rgba(13,59,68,0.06)', color: '#0D3B44' }}>
          <MessageCircle size={15} /> Contact Support
        </a>

        <Link href="/client/dashboard" className="text-xs" style={{ color: '#C4C4C4' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
