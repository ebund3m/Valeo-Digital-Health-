"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Calendar,
  ClipboardList,
  MessageSquare,
  CreditCard,
  User,
  LogOut,
  Menu,
  X,
  Bell,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/client",              label: "Dashboard",     icon: LayoutDashboard },
  { href: "/client/appointments", label: "Appointments",  icon: Calendar },
  { href: "/client/my-doctor", label: "My Therapist", icon: Heart },
  { href: "/client/assessments",  label: "Assessments",   icon: ClipboardList },
  { href: "/client/messages",     label: "Messages",      icon: MessageSquare },
  { href: "/client/payments",     label: "Payments",      icon: CreditCard },
  { href: "/client/profile",      label: "Profile",       icon: User },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname        = usePathname();
  const router          = useRouter();
  const { user }        = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  const firstName = user?.displayName?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen flex" style={{ background: "#F5F4F0" }}>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300",
          "w-64 lg:translate-x-0 lg:static lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "#0D3B44", width: "256px" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-white/10">
          <div>
            <span
              className="text-white text-lg block"
              style={{ fontFamily: "var(--font-dm-serif)" }}
            >
              Valeo
            </span>
            <span className="text-xs tracking-widest uppercase"
              style={{ color: "#4ECDC4" }}>
              Health Platform
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/50 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* User pill */}
        <div className="mx-4 mt-5 mb-2 rounded-xl p-3 flex items-center gap-3"
          style={{ background: "rgba(255,255,255,0.07)" }}>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: "#4ECDC4", color: "#0D3B44" }}
          >
            {firstName?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="overflow-hidden">
            <p className="text-white text-sm font-medium truncate">{user?.displayName}</p>
            <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
              {user?.email}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <p className="text-xs font-semibold tracking-widest uppercase px-3 py-2"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            Menu
          </p>
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active
                    ? "text-ocean"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
                style={active ? { background: "#4ECDC4", color: "#0D3B44" } : {}}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                       text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">

        {/* Top bar */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: "rgba(245,244,240,0.92)", backdropFilter: "blur(12px)", borderColor: "rgba(13,59,68,0.08)" }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-black/5"
              style={{ color: "#0D3B44" }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1
                className="text-lg font-medium"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}
              >
                {navItems.find(i => i.href === pathname)?.label ?? "Dashboard"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative p-2 rounded-lg hover:bg-black/5 transition-colors"
              style={{ color: "#4A5568" }}>
              <Bell size={18} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: "#E8604C" }}
              />
            </button>

            {/* Book session CTA */}
            <Link
              href="/client/appointments"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}
            >
              <Calendar size={14} />
              Book Session
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
