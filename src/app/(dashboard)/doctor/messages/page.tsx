"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useConversations, useMessages,
  sendMessage, markRead,
} from "@/lib/useMessages";
import {
  MessageCircle, Send, Loader2, Lock,
  Search, X, CheckCheck, ChevronLeft,
  Users,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────
function timeLabel(ts: any): string {
  if (!ts?.toDate) return "";
  const d   = ts.toDate() as Date;
  const now = new Date();
  const diffMs  = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)  return `${diffHr}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fullTime(ts: any): string {
  if (!ts?.toDate) return "";
  return ts.toDate().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// ── Message bubble ─────────────────────────────────────────────────────────
function Bubble({ msg, isOwn }: { msg: any; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div className="max-w-[72%]">
        <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
          style={{
            background:   isOwn ? "linear-gradient(135deg, #0D3B44, #1A535C)" : "white",
            color:        isOwn ? "white" : "#22272B",
            borderRadius: isOwn ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            boxShadow:    isOwn ? "none" : "0 1px 3px rgba(13,59,68,0.08)",
          }}>
          {msg.text}
        </div>
        <p className={`text-xs mt-1 ${isOwn ? "text-right" : "text-left"}`}
          style={{ color: "#C4C4C4" }}>
          {fullTime(msg.createdAt)}
          {isOwn && <CheckCheck size={11} className="inline ml-1" style={{ color: "#4ECDC4" }} />}
        </p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function DoctorMessagesPage() {
  const { user } = useAuth();

  const { conversations, loading: convLoading } = useConversations(user?.uid ?? "", "doctor");

  const [activeId,   setActiveId]   = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [text,       setText]       = useState("");
  const [sending,    setSending]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  const { messages, loading: msgLoading } = useMessages(activeId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read
  useEffect(() => {
    if (activeId) markRead(activeId, "doctor");
  }, [activeId, messages.length]);

  // Auto-open first conversation
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
      setClientName(conversations[0].clientName);
    }
  }, [conversations]);

  async function handleSend() {
    if (!text.trim() || !activeId || !user) return;
    setSending(true);
    try {
      await sendMessage(activeId, user.uid, user.displayName ?? "Dr. Miller", "doctor", text);
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function openConv(id: string, cName: string) {
    setActiveId(id); setClientName(cName); setMobileView("chat");
  }

  const filtered = conversations.filter(c =>
    c.clientName.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadDoctor ?? 0), 0);
  const activeConv  = conversations.find(c => c.id === activeId);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-3xl overflow-hidden flex"
        style={{ height: "calc(100vh - 160px)", minHeight: "520px",
          background: "white", boxShadow: "0 2px 12px rgba(13,59,68,0.08)" }}>

        {/* ── Sidebar ── */}
        <div className={`flex-shrink-0 border-r flex flex-col
          ${mobileView === "chat" ? "hidden md:flex" : "flex"} w-full md:w-72`}
          style={{ borderColor: "rgba(13,59,68,0.08)" }}>

          {/* Header */}
          <div className="p-5 border-b" style={{ borderColor: "rgba(13,59,68,0.08)" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold"
                style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
                Messages
              </h2>
              {totalUnread > 0 && (
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "#4ECDC4" }}>
                  {totalUnread}
                </span>
              )}
            </div>
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "#8A9BA8" }} />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                style={{ borderColor: "rgba(13,59,68,0.12)", background: "rgba(13,59,68,0.02)" }} />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X size={11} style={{ color: "#8A9BA8" }} />
                </button>
              )}
            </div>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: "#4ECDC4" }} />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-5 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(78,205,196,0.08)" }}>
                  {search ? <Search size={20} style={{ color: "#4ECDC4" }} /> : <Users size={20} style={{ color: "#4ECDC4" }} />}
                </div>
                <p className="text-sm font-medium" style={{ color: "#0D3B44" }}>
                  {search ? "No clients found" : "No messages yet"}
                </p>
                <p className="text-xs mt-1" style={{ color: "#8A9BA8" }}>
                  {search ? "Try a different name." : "Clients will message you here."}
                </p>
              </div>
            ) : (
              filtered.map(conv => {
                const isActive = conv.id === activeId;
                const unread   = conv.unreadDoctor ?? 0;
                return (
                  <button key={conv.id} onClick={() => openConv(conv.id, conv.clientName)}
                    className="w-full text-left px-5 py-4 border-b transition-colors hover:bg-black/[0.02]"
                    style={{
                      borderColor: "rgba(13,59,68,0.05)",
                      background: isActive ? "rgba(13,59,68,0.04)" : "transparent",
                    }}>
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                          style={{ background: "linear-gradient(135deg, #4ECDC4, #2BA8A0)", color: "white" }}>
                          {conv.clientName?.[0]?.toUpperCase() ?? "C"}
                        </div>
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: "#E8604C", fontSize: "9px" }}>
                            {unread}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate"
                            style={{ color: "#0D3B44", fontWeight: unread > 0 ? 700 : 600 }}>
                            {conv.clientName}
                          </p>
                          <span className="text-xs flex-shrink-0 ml-1" style={{ color: "#C4C4C4" }}>
                            {timeLabel(conv.lastMessageAt)}
                          </span>
                        </div>
                        <p className="text-xs truncate mt-0.5"
                          style={{ color: unread > 0 ? "#0D3B44" : "#8A9BA8",
                            fontWeight: unread > 0 ? 500 : 400 }}>
                          {conv.lastMessage || "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t" style={{ borderColor: "rgba(13,59,68,0.08)" }}>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: "#C4C4C4" }}>
              <Lock size={10} /> Messages are private and HIPAA compliant
            </p>
          </div>
        </div>

        {/* ── Chat panel ── */}
        <div className={`flex-1 flex flex-col min-w-0
          ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>

          {activeId && activeConv ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0"
                style={{ borderColor: "rgba(13,59,68,0.08)" }}>
                <button onClick={() => setMobileView("list")}
                  className="md:hidden p-1 rounded-lg hover:bg-black/5">
                  <ChevronLeft size={18} style={{ color: "#4A5568" }} />
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #4ECDC4, #2BA8A0)", color: "white" }}>
                  {clientName?.[0]?.toUpperCase() ?? "C"}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>{clientName}</p>
                  <p className="text-xs" style={{ color: "#8A9BA8" }}>Client</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4"
                style={{ background: "rgba(13,59,68,0.01)" }}>
                {msgLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 size={24} className="animate-spin" style={{ color: "#4ECDC4" }} />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                      style={{ background: "rgba(78,205,196,0.08)" }}>
                      <MessageCircle size={20} style={{ color: "#4ECDC4" }} />
                    </div>
                    <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>
                      No messages yet
                    </p>
                    <p className="text-xs" style={{ color: "#8A9BA8" }}>
                      Send a message to start the conversation.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const isOwn = msg.senderId === user?.uid;
                      const showDate = i === 0 || (
                        msg.createdAt?.toDate && messages[i-1].createdAt?.toDate &&
                        msg.createdAt.toDate().toDateString() !== messages[i-1].createdAt.toDate().toDateString()
                      );
                      return (
                        <div key={msg.id}>
                          {showDate && msg.createdAt?.toDate && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px" style={{ background: "rgba(13,59,68,0.08)" }} />
                              <span className="text-xs px-3" style={{ color: "#C4C4C4" }}>
                                {msg.createdAt.toDate().toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" })}
                              </span>
                              <div className="flex-1 h-px" style={{ background: "rgba(13,59,68,0.08)" }} />
                            </div>
                          )}
                          <Bubble msg={msg} isOwn={isOwn} />
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-5 py-4 border-t flex-shrink-0"
                style={{ borderColor: "rgba(13,59,68,0.08)" }}>
                <div className="flex items-end gap-3">
                  <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Reply to client... (Enter to send)"
                    rows={1}
                    className="flex-1 px-4 py-3 rounded-2xl text-sm border resize-none focus:outline-none leading-relaxed"
                    style={{
                      borderColor: "rgba(13,59,68,0.15)",
                      background: "rgba(13,59,68,0.02)",
                      maxHeight: "120px",
                    }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                    }}
                  />
                  <button onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all hover:-translate-y-0.5"
                    style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                    {sending
                      ? <Loader2 size={16} className="animate-spin text-white" />
                      : <Send size={16} className="text-white" />}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: "#C4C4C4" }}>
                  Do not share clinical diagnoses via chat. Use session notes for clinical records.
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: "rgba(13,59,68,0.05)" }}>
                <MessageCircle size={28} style={{ color: "#8A9BA8" }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: "#0D3B44" }}>
                Select a conversation
              </p>
              <p className="text-sm" style={{ color: "#8A9BA8" }}>
                Choose a client from the list to view messages.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
