"use client";

import { useAuth } from "@/context/AuthContext";
import {
  Calendar,
  Users,
  ClipboardList,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  FileText,
} from "lucide-react";
import Link from "next/link";

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, accent, trend,
}: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent: string; trend?: string;
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 4px rgba(10,46,53,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8A9BA8" }}>
          {label}
        </span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + "15" }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-semibold mb-1" style={{ fontFamily: "var(--font-dm-serif)", color: "#0A2E35" }}>
        {value}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#8A9BA8" }}>{sub}</p>
        {trend && (
          <span className="text-xs font-medium flex items-center gap-1" style={{ color: "#4ECDC4" }}>
            <TrendingUp size={11} /> {trend}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Appointment row ────────────────────────────────────────────────────────
function AppointmentRow({
  name, time, type, status,
}: {
  name: string; time: string; type: string;
  status: "pending" | "confirmed" | "completed";
}) {
  const statusStyles = {
    pending:   { bg: "rgba(232,96,76,0.1)",   color: "#E8604C", label: "Pending" },
    confirmed: { bg: "rgba(78,205,196,0.1)",  color: "#2BA8A0", label: "Confirmed" },
    completed: { bg: "rgba(13,59,68,0.08)",   color: "#0A2E35", label: "Completed" },
  };
  const s = statusStyles[status];

  return (
    <div className="flex items-center gap-4 py-3 border-b last:border-0"
      style={{ borderColor: "rgba(10,46,53,0.06)" }}>
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
        style={{ background: "rgba(78,205,196,0.15)", color: "#0A2E35" }}
      >
        {name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#0A2E35" }}>{name}</p>
        <p className="text-xs" style={{ color: "#8A9BA8" }}>{type}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-xs font-medium" style={{ color: "#0A2E35" }}>{time}</p>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </span>
      </div>
    </div>
  );
}

// ── Action card ────────────────────────────────────────────────────────────
function ActionCard({
  href, icon: Icon, label, count, accent,
}: {
  href: string; icon: React.ElementType; label: string; count: number; accent: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl p-4 flex items-center gap-3 transition-all hover:-translate-y-0.5"
      style={{ background: "white", boxShadow: "0 1px 4px rgba(10,46,53,0.07)" }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: accent + "15" }}>
        <Icon size={18} style={{ color: accent }} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: "#0A2E35" }}>{label}</p>
        <p className="text-xs" style={{ color: "#8A9BA8" }}>{count} pending</p>
      </div>
      <ArrowRight size={15} className="transition-transform group-hover:translate-x-1"
        style={{ color: "#8A9BA8" }} />
    </Link>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DoctorDashboard() {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0] ?? "Doctor";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Welcome banner ── */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0A2E35 0%, #1A535C 100%)",
          boxShadow: "0 4px 24px rgba(10,46,53,0.2)",
        }}
      >
        <div className="absolute right-0 top-0 w-80 h-full opacity-10"
          style={{ background: "radial-gradient(circle at 80% 50%, #4ECDC4, transparent 70%)" }} />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
              {greeting}, Dr. {firstName} · {today}
            </p>
            <h2 className="text-2xl text-white mb-2" style={{ fontFamily: "var(--font-dm-serif)" }}>
              Here&apos;s your practice overview
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
              You have <span className="text-white font-semibold">0 appointments</span> scheduled today.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
            style={{ background: "rgba(78,205,196,0.15)", border: "1px solid rgba(78,205,196,0.25)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ECDC4" }} />
            <span className="text-sm font-medium" style={{ color: "#4ECDC4" }}>Practice Active</span>
          </div>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clients"     value="0"   sub="Registered clients"      icon={Users}        accent="#4ECDC4"  trend="+0 this month" />
        <StatCard label="This Month"        value="0"   sub="Sessions completed"      icon={CheckCircle}  accent="#0A2E35" />
        <StatCard label="Pending Approvals" value="0"   sub="Awaiting confirmation"   icon={AlertCircle}  accent="#E8604C" />
        <StatCard label="Revenue"           value="$0"  sub="This month"              icon={DollarSign}   accent="#D4A853"  trend="+0%" />
      </div>

      {/* ── Two column layout ── */}
      <div className="grid lg:grid-cols-5 gap-4">

        {/* Today's schedule — 3 cols */}
        <div className="lg:col-span-3 rounded-2xl p-5"
          style={{ background: "white", boxShadow: "0 1px 4px rgba(10,46,53,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8A9BA8" }}>
              Today&apos;s Schedule
            </h3>
            <Link href="/doctor/schedule"
              className="text-xs font-medium flex items-center gap-1 hover:underline"
              style={{ color: "#4ECDC4" }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {/* Empty state */}
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "rgba(78,205,196,0.08)" }}>
              <Calendar size={24} style={{ color: "#4ECDC4" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#0A2E35" }}>No appointments today</p>
            <p className="text-xs" style={{ color: "#8A9BA8" }}>
              Your schedule is clear. Appointments will appear here.
            </p>
          </div>

          {/* Placeholder rows — uncomment when real data flows in
          <AppointmentRow name="Sarah Johnson"  time="9:00 AM"  type="Individual Therapy" status="confirmed" />
          <AppointmentRow name="James Thomas"   time="11:00 AM" type="Couples Therapy"    status="confirmed" />
          <AppointmentRow name="Maria Lopez"    time="2:00 PM"  type="Life Coaching"      status="pending"   />
          <AppointmentRow name="Kevin Brown"    time="4:00 PM"  type="Individual Therapy" status="pending"   />
          */}
        </div>

        {/* Action items — 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider px-1" style={{ color: "#8A9BA8" }}>
            Needs Attention
          </h3>
          <ActionCard href="/doctor/schedule"    icon={Clock}        label="Pending Approvals"    count={0} accent="#E8604C" />
          <ActionCard href="/doctor/assessments" icon={ClipboardList} label="Assessments to Review" count={0} accent="#4ECDC4" />
          <ActionCard href="/doctor/notes"       icon={FileText}     label="Notes to Complete"    count={0} accent="#0A2E35" />
          <ActionCard href="/doctor/clients"     icon={Users}        label="New Client Requests"  count={0} accent="#D4A853" />

          {/* Quick stats card */}
          <div className="rounded-xl p-4 mt-2"
            style={{ background: "linear-gradient(135deg, rgba(78,205,196,0.08), rgba(78,205,196,0.03))", border: "1px solid rgba(78,205,196,0.15)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8A9BA8" }}>
              This Week
            </p>
            {[
              { label: "Sessions Completed", value: "0" },
              { label: "New Clients",         value: "0" },
              { label: "Assessments Sent",    value: "0" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0"
                style={{ borderColor: "rgba(78,205,196,0.1)" }}>
                <span className="text-xs" style={{ color: "#4A5568" }}>{label}</span>
                <span className="text-xs font-bold" style={{ color: "#0A2E35" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent clients ── */}
      <div className="rounded-2xl p-5"
        style={{ background: "white", boxShadow: "0 1px 4px rgba(10,46,53,0.07)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8A9BA8" }}>
            Recent Clients
          </h3>
          <Link href="/doctor/clients"
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: "#4ECDC4" }}>
            View all <ArrowRight size={11} />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: "rgba(13,59,68,0.06)" }}>
            <Users size={20} style={{ color: "#0A2E35" }} />
          </div>
          <p className="text-sm font-medium mb-1" style={{ color: "#0A2E35" }}>No clients yet</p>
          <p className="text-xs" style={{ color: "#8A9BA8" }}>
            Clients will appear here once they register and book sessions.
          </p>
        </div>
      </div>

    </div>
  );
}
