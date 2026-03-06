"use client";

import {
  Users, DollarSign, Calendar, TrendingUp,
  ArrowRight, Activity, Clock, Stethoscope, Settings,
} from "lucide-react";
import Link from "next/link";

function StatCard({ label, value, sub, icon: Icon, accent, trend }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#8A9BA8" }}>{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: accent + "15" }}>
          <Icon size={17} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-semibold mb-1" style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "#8A9BA8" }}>{sub}</p>
        {trend && (
          <span className="text-xs font-medium flex items-center gap-1" style={{ color: trend.positive ? "#4ECDC4" : "#E8604C" }}>
            <TrendingUp size={11} />{trend.value}
          </span>
        )}
      </div>
    </div>
  );
}

function QuickAction({ href, icon: Icon, label, accent }: {
  href: string; icon: React.ElementType; label: string; accent: string;
}) {
  return (
    <Link href={href} className="group flex items-center gap-3 p-3 rounded-xl transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(26,26,46,0.03)", border: "1px solid rgba(26,26,46,0.06)" }}>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: accent + "15" }}>
        <Icon size={16} style={{ color: accent }} />
      </div>
      <span className="text-sm font-medium flex-1" style={{ color: "#1A1A2E" }}>{label}</span>
      <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" style={{ color: "#8A9BA8" }} />
    </Link>
  );
}

export default function AdminDashboard() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1A1A2E 0%, #2D2D4E 100%)", boxShadow: "0 4px 24px rgba(26,26,46,0.2)" }}>
        <div className="absolute right-0 top-0 w-80 h-full opacity-10"
          style={{ background: "radial-gradient(circle at 80% 50%, #E8604C, transparent 70%)" }} />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.45)" }}>{today}</p>
            <h2 className="text-2xl text-white mb-2" style={{ fontFamily: "var(--font-dm-serif)" }}>Platform Overview</h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              The Valeo Experience is <span className="text-white font-semibold">operational</span>. All systems normal.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl flex-shrink-0"
            style={{ background: "rgba(78,205,196,0.12)", border: "1px solid rgba(78,205,196,0.2)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#4ECDC4" }} />
            <span className="text-sm font-medium" style={{ color: "#4ECDC4" }}>All Systems Online</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value="0"  sub="Registered accounts"    icon={Users}       accent="#4ECDC4" trend={{ value: "+0 this week", positive: true }} />
        <StatCard label="Active Doctors" value="0"  sub="Verified practitioners" icon={Stethoscope} accent="#0D3B44" />
        <StatCard label="Sessions"       value="0"  sub="This month"             icon={Calendar}    accent="#E8604C" />
        <StatCard label="Revenue"        value="$0" sub="Total processed"        icon={DollarSign}  accent="#D4A853" trend={{ value: "+0%", positive: true }} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#8A9BA8" }}>Platform Activity</h3>
            <Activity size={15} style={{ color: "#8A9BA8" }} />
          </div>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: "rgba(232,96,76,0.06)" }}>
              <Activity size={24} style={{ color: "#E8604C" }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: "#1A1A2E" }}>No activity yet</p>
            <p className="text-xs" style={{ color: "#8A9BA8" }}>User registrations, bookings, and payments will appear here.</p>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider px-1" style={{ color: "#8A9BA8" }}>Quick Actions</h3>
          <QuickAction href="/admin/users"      icon={Users}       label="Manage Users"      accent="#4ECDC4" />
          <QuickAction href="/admin/users"      icon={Stethoscope} label="Add Doctor"        accent="#0D3B44" />
          <QuickAction href="/admin/financials" icon={DollarSign}  label="View Financials"   accent="#D4A853" />
          <QuickAction href="/admin/analytics"  icon={TrendingUp}  label="Analytics"         accent="#E8604C" />
          <QuickAction href="/admin/settings"   icon={Settings}    label="Platform Settings" accent="#1A1A2E" />
          <div className="rounded-xl p-4" style={{ background: "rgba(26,26,46,0.03)", border: "1px solid rgba(26,26,46,0.08)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#8A9BA8" }}>System Health</p>
            {[
              { label: "Firebase Auth", status: "Operational",    ok: true  },
              { label: "Firestore DB",  status: "Operational",    ok: true  },
              { label: "Storage",       status: "Operational",    ok: true  },
              { label: "WiPay Gateway", status: "Not configured", ok: false },
            ].map(({ label, status, ok }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: "rgba(26,26,46,0.06)" }}>
                <span className="text-xs" style={{ color: "#4A5568" }}>{label}</span>
                <span className="text-xs font-medium flex items-center gap-1" style={{ color: ok ? "#4ECDC4" : "#E8604C" }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? "#4ECDC4" : "#E8604C" }} />
                  {status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {[
          { label: "Clients",        count: 0, icon: Users,       accent: "#4ECDC4", desc: "Registered clients",   href: "/admin/users" },
          { label: "Doctors",        count: 0, icon: Stethoscope, accent: "#0D3B44", desc: "Active practitioners", href: "/admin/users" },
          { label: "Pending Review", count: 0, icon: Clock,       accent: "#E8604C", desc: "Awaiting action",      href: "/admin/users" },
        ].map(({ label, count, icon: Icon, accent, desc, href }) => (
          <Link key={label} href={href}
            className="group rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5"
            style={{ background: "white", boxShadow: "0 1px 4px rgba(26,26,46,0.07)" }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: accent + "12" }}>
              <Icon size={22} style={{ color: accent }} />
            </div>
            <div className="flex-1">
              <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-dm-serif)", color: "#1A1A2E" }}>{count}</p>
              <p className="text-sm font-medium" style={{ color: "#1A1A2E" }}>{label}</p>
              <p className="text-xs" style={{ color: "#8A9BA8" }}>{desc}</p>
            </div>
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 flex-shrink-0" style={{ color: "#8A9BA8" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}