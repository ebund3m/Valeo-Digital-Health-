"use client";

import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  ClipboardList,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Heart,
} from "lucide-react";
import Link from "next/link";

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium" style={{ color: "#4A5568" }}>
          {label}
        </span>
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: accent + "18" }}
        >
          <Icon size={17} style={{ color: accent }} />
        </div>
      </div>
      <div>
        <p
          className="text-3xl font-semibold"
          style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}
        >
          {value}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

// ── Quick action card ──────────────────────────────────────────────────────
function QuickAction({
  href,
  icon: Icon,
  label,
  desc,
  accent,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl p-5 flex items-center gap-4 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "white",
        boxShadow: "0 1px 3px rgba(13,59,68,0.06)",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
        style={{ background: accent + "18" }}
      >
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>
          {label}
        </p>
        <p className="text-xs mt-0.5 truncate" style={{ color: "#8A9BA8" }}>
          {desc}
        </p>
      </div>
      <ArrowRight
        size={16}
        className="flex-shrink-0 transition-transform group-hover:translate-x-1"
        style={{ color: "#8A9BA8" }}
      />
    </Link>
  );
}

// ── Activity item ──────────────────────────────────────────────────────────
function ActivityItem({
  icon: Icon,
  label,
  time,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  time: string;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0"
      style={{ borderColor: "rgba(13,59,68,0.06)" }}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: accent + "15" }}
      >
        <Icon size={15} style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "#22272B" }}>{label}</p>
      </div>
      <span className="text-xs flex-shrink-0" style={{ color: "#8A9BA8" }}>
        {time}
      </span>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Welcome banner ── */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between overflow-hidden relative"
        style={{
          background: "linear-gradient(135deg, #0D3B44 0%, #1A535C 100%)",
          boxShadow: "0 4px 24px rgba(13,59,68,0.15)",
        }}
      >
        {/* Background decoration */}
        <div
          className="absolute right-0 top-0 w-64 h-full opacity-10"
          style={{
            background: "radial-gradient(circle at 80% 50%, #4ECDC4, transparent 70%)",
          }}
        />
        <div>
          <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>
            {greeting}
          </p>
          <h2
            className="text-2xl text-white mb-2"
            style={{ fontFamily: "var(--font-dm-serif)" }}
          >
            {firstName} 👋
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            Your wellness journey continues. Here&apos;s your overview.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-center gap-1 relative z-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(78,205,196,0.2)", border: "1px solid rgba(78,205,196,0.3)" }}
          >
            <Heart size={26} style={{ color: "#4ECDC4" }} />
          </div>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Wellness
          </span>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Sessions"
          value="0"
          sub="Sessions completed"
          icon={CheckCircle}
          accent="#4ECDC4"
        />
        <StatCard
          label="Upcoming"
          value="0"
          sub="Scheduled sessions"
          icon={Calendar}
          accent="#0D3B44"
        />
        <StatCard
          label="Assessments"
          value="0"
          sub="Pending to complete"
          icon={ClipboardList}
          accent="#E8604C"
        />
        <StatCard
          label="Messages"
          value="0"
          sub="Unread messages"
          icon={MessageSquare}
          accent="#D4A853"
        />
      </div>

      {/* ── Two column layout ── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Quick actions — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <h3
            className="text-sm font-semibold uppercase tracking-wider px-1"
            style={{ color: "#8A9BA8" }}
          >
            Quick Actions
          </h3>
          <QuickAction
            href="/client/appointments"
            icon={Calendar}
            label="Book a Session"
            desc="Schedule your next appointment"
            accent="#0D3B44"
          />
          <QuickAction
            href="/client/assessments"
            icon={ClipboardList}
            label="Complete Assessment"
            desc="Pending wellness check-ins"
            accent="#E8604C"
          />
          <QuickAction
            href="/client/messages"
            icon={MessageSquare}
            label="Send a Message"
            desc="Reach out to Dr. Miller"
            accent="#4ECDC4"
          />
          <QuickAction
            href="/client/appointments"
            icon={TrendingUp}
            label="View Progress"
            desc="Track your wellness journey"
            accent="#D4A853"
          />
        </div>

        {/* Recent activity — 3 cols */}
        <div
          className="lg:col-span-3 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 3px rgba(13,59,68,0.06)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-semibold uppercase tracking-wider"
              style={{ color: "#8A9BA8" }}
            >
              Recent Activity
            </h3>
            <Clock size={15} style={{ color: "#8A9BA8" }} />
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(78,205,196,0.1)" }}
            >
              <Calendar size={24} style={{ color: "#4ECDC4" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>
              No activity yet
            </p>
            <p className="text-xs mb-4" style={{ color: "#8A9BA8" }}>
              Your sessions and activity will appear here.
            </p>
            <Link
              href="/client/appointments"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}
            >
              <Calendar size={14} />
              Book First Session
            </Link>
          </div>

          {/* Placeholder activity items — will be replaced with real data */}
          {/* 
          <ActivityItem icon={Calendar}     label="Session booked for March 5" time="2h ago"   accent="#4ECDC4" />
          <ActivityItem icon={ClipboardList} label="PHQ-9 assessment completed"  time="1d ago"   accent="#E8604C" />
          <ActivityItem icon={MessageSquare} label="Message from Dr. Miller"     time="2d ago"   accent="#0D3B44" />
          <ActivityItem icon={CheckCircle}   label="Session completed"           time="1w ago"   accent="#D4A853" />
          */}
        </div>
      </div>

      {/* ── Motivational footer ── */}
      <div
        className="rounded-2xl p-5 flex items-center gap-4"
        style={{
          background: "rgba(78,205,196,0.08)",
          border: "1px solid rgba(78,205,196,0.2)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(78,205,196,0.15)" }}
        >
          <Heart size={18} style={{ color: "#4ECDC4" }} />
        </div>
        <p className="text-sm italic" style={{ color: "#4A5568" }}>
          &ldquo;Healing is not a destination. It is a journey we take together.&rdquo;
          <span className="not-italic font-medium ml-2" style={{ color: "#0D3B44" }}>
            — Dr. Jozelle M. Miller
          </span>
        </p>
      </div>

    </div>
  );
}
