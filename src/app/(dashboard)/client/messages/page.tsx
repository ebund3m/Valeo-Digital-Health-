"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  useConversations, useMessages,
  sendMessage, markRead, getOrCreateConversation,
} from "@/lib/useMessages";
import {
  MessageCircle, Send, Loader2, Lock,
  CheckCheck, Clock, ChevronLeft,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
export default function ClientMessagesPage() {
  const { user } = useAuth();

  const { conversations, loading: convLoading } = useConversations(user?.uid ?? "", "client");

  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [text,        setText]        = useState("");
  const [sending,     setSending]     = useState(false);
  const [mobileView,  setMobileView]  = useState<"list" | "chat">("list");
  const [doctorName,  setDoctorName]  = useState("");
  const [startingNew, setStartingNew] = useState(false);

  const { messages, loading: msgLoading } = useMessages(activeId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark as read when opening conversation
  useEffect(() => {
    if (activeId) markRead(activeId, "client");
  }, [activeId, messages.length]);

  // Auto-open first conversation
  useEffect(() => {
    if (!activeId && conversations.length > 0) {
      setActiveId(conversations[0].id);
      setDoctorName(conversations[0].doctorName);
    }
  }, [conversations]);

  // If no conversation exists, find the doctor and create one
  async function startConversation() {
    if (!user) return;
    setStartingNew(true);
    try {
      // Load the doctor from users collection
      const snap = await getDocs(
        query(collection(db, "users"), where("role", "==", "doctor"))
      );
      if (snap.empty) return;
      const doctorDoc  = snap.docs[0];
      const doctorData = doctorDoc.data() as any;
      const convId = await getOrCreateConversation(
        user.uid, user.displayName ?? "Client",
        doctorDoc.id, doctorData.displayName ?? "Dr. Miller",
      );
      setActiveId(convId);
      setDoctorName(doctorData.displayName ?? "Dr. Miller");
      setMobileView("chat");
    } finally {
      setStartingNew(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || !activeId || !user) return;
    setSending(true);
    try {
      const conv = conversations.find(c => c.id === activeId);
      await sendMessage(activeId, user.uid, user.displayName ?? "Client", "client", text);
      setText("");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function openConv(id: string, dName: string) {
    setActiveId(id); setDoctorName(dName); setMobileView("chat");
  }

  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="rounded-3xl overflow-hidden flex"
        style={{ height: "calc(100vh - 160px)", minHeight: "520px",
          background: "white", boxShadow: "0 2px 12px rgba(13,59,68,0.08)" }}>

        {/* ── Sidebar ── */}
        <div className={`flex-shrink-0 border-r flex flex-col
          ${mobileView === "chat" ? "hidden md:flex" : "flex"} w-full md:w-72`}
          style={{ borderColor: "rgba(13,59,68,0.08)" }}>

          {/* Sidebar header */}
          <div className="p-5 border-b" style={{ borderColor: "rgba(13,59,68,0.08)" }}>
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-dm-serif)", color: "#0D3B44" }}>
              Messages
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#8A9BA8" }}>
              Secure conversations with Dr. Miller
            </p>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {convLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin" style={{ color: "#4ECDC4" }} />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-5 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(78,205,196,0.08)" }}>
                  <MessageCircle size={20} style={{ color: "#4ECDC4" }} />
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: "#0D3B44" }}>No messages yet</p>
                <p className="text-xs mb-4" style={{ color: "#8A9BA8" }}>Start a conversation with your doctor.</p>
                <button onClick={startConversation} disabled={startingNew}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)" }}>
                  {startingNew ? <Loader2 size={13} className="animate-spin" /> : <MessageCircle size={13} />}
                  Message Dr. Miller
                </button>
              </div>
            ) : (
              conversations.map(conv => {
                const isActive  = conv.id === activeId;
                const unread    = conv.unreadClient ?? 0;
                return (
                  <button key={conv.id} onClick={() => openConv(conv.id, conv.doctorName)}
                    className="w-full text-left px-5 py-4 border-b transition-colors hover:bg-black/[0.02]"
                    style={{
                      borderColor: "rgba(13,59,68,0.05)",
                      background: isActive ? "rgba(13,59,68,0.04)" : "transparent",
                    }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)", color: "white" }}>
                        {conv.doctorName?.[0]?.toUpperCase() ?? "D"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold truncate" style={{ color: "#0D3B44" }}>
                            {conv.doctorName}
                          </p>
                          <span className="text-xs flex-shrink-0 ml-1" style={{ color: "#C4C4C4" }}>
                            {timeLabel(conv.lastMessageAt)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs truncate" style={{ color: "#8A9BA8" }}>
                            {conv.lastMessage || "Start a conversation"}
                          </p>
                          {unread > 0 && (
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ml-1 text-white"
                              style={{ background: "#4ECDC4" }}>
                              {unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Privacy note */}
          <div className="p-4 border-t" style={{ borderColor: "rgba(13,59,68,0.08)" }}>
            <p className="flex items-center gap-1.5 text-xs" style={{ color: "#C4C4C4" }}>
              <Lock size={10} /> End-to-end encrypted · HIPAA compliant
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
                {/* Mobile back */}
                <button onClick={() => setMobileView("list")}
                  className="md:hidden p-1 rounded-lg hover:bg-black/5">
                  <ChevronLeft size={18} style={{ color: "#4A5568" }} />
                </button>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0D3B44, #1A535C)", color: "white" }}>
                  {doctorName?.[0]?.toUpperCase() ?? "D"}
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#0D3B44" }}>{doctorName}</p>
                  <p className="text-xs flex items-center gap-1" style={{ color: "#4ECDC4" }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#4ECDC4" }} />
                    Health Psychologist
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
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
                      Start the conversation
                    </p>
                    <p className="text-xs" style={{ color: "#8A9BA8" }}>
                      Say hello or ask a question between sessions.
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => {
                      const isOwn = msg.senderId === user?.uid;
                      // Date divider
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
                    placeholder="Type a message... (Enter to send)"
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
                  Messages are private and secure. For emergencies call 911.
                </p>
              </div>
            </>
          ) : (
            /* No conversation selected */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: "rgba(13,59,68,0.05)" }}>
                <MessageCircle size={28} style={{ color: "#8A9BA8" }} />
              </div>
              <p className="text-base font-semibold mb-1" style={{ color: "#0D3B44" }}>
                Your messages
              </p>
              <p className="text-sm" style={{ color: "#8A9BA8" }}>
                Select a conversation or start a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
