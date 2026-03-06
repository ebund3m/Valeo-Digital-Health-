// src/lib/useMessages.ts
// Real-time messaging hook using Firestore onSnapshot
// Data model:
//   conversations/{conversationId}
//     - clientId, doctorId, clientName, doctorName
//     - lastMessage, lastMessageAt, lastSenderId
//     - unreadClient (int), unreadDoctor (int)
//     - createdAt
//
//   conversations/{conversationId}/messages/{messageId}
//     - senderId, senderName, senderRole
//     - text, createdAt, read

import { useEffect, useState, useCallback } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
  getDocs, getDoc, setDoc, increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Conversation {
  id:            string;
  clientId:      string;
  doctorId:      string;
  clientName:    string;
  doctorName:    string;
  lastMessage:   string;
  lastMessageAt: any;
  lastSenderId:  string;
  unreadClient:  number;
  unreadDoctor:  number;
  createdAt:     any;
}

export interface Message {
  id:         string;
  senderId:   string;
  senderName: string;
  senderRole: "client" | "doctor";
  text:       string;
  createdAt:  any;
  read:       boolean;
}

// ── Get or create a conversation between client and doctor ─────────────────
export async function getOrCreateConversation(
  clientId:   string,
  clientName: string,
  doctorId:   string,
  doctorName: string,
): Promise<string> {
  // Check if conversation already exists
  const q = query(
    collection(db, "conversations"),
    where("clientId", "==", clientId),
    where("doctorId", "==", doctorId),
  );
  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  // Create new conversation
  const ref = doc(collection(db, "conversations"));
  await setDoc(ref, {
    clientId,
    clientName,
    doctorId,
    doctorName,
    lastMessage:   "",
    lastMessageAt: serverTimestamp(),
    lastSenderId:  "",
    unreadClient:  0,
    unreadDoctor:  0,
    createdAt:     serverTimestamp(),
  });
  return ref.id;
}

// ── Send a message ─────────────────────────────────────────────────────────
export async function sendMessage(
  conversationId: string,
  senderId:       string,
  senderName:     string,
  senderRole:     "client" | "doctor",
  text:           string,
) {
  const trimmed = text.trim();
  if (!trimmed) return;

  // Add message to subcollection
  await addDoc(
    collection(db, "conversations", conversationId, "messages"),
    {
      senderId,
      senderName,
      senderRole,
      text:      trimmed,
      createdAt: serverTimestamp(),
      read:      false,
    }
  );

  // Update conversation metadata + increment unread for the OTHER party
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessage:   trimmed,
    lastMessageAt: serverTimestamp(),
    lastSenderId:  senderId,
    // Increment unread for recipient
    ...(senderRole === "client"
      ? { unreadDoctor: increment(1) }
      : { unreadClient: increment(1) }),
  });
}

// ── Mark conversation as read for a role ──────────────────────────────────
export async function markRead(conversationId: string, role: "client" | "doctor") {
  await updateDoc(doc(db, "conversations", conversationId), {
    ...(role === "client" ? { unreadClient: 0 } : { unreadDoctor: 0 }),
  });
}

// ── Hook: live list of conversations ──────────────────────────────────────
export function useConversations(userId: string, role: "client" | "doctor") {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const field = role === "client" ? "clientId" : "doctorId";
    const q = query(
      collection(db, "conversations"),
      where(field, "==", userId),
      orderBy("lastMessageAt", "desc"),
    );
    const unsub = onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Conversation));
      setLoading(false);
    });
    return unsub;
  }, [userId, role]);

  return { conversations, loading };
}

// ── Hook: live messages in a conversation ─────────────────────────────────
export function useMessages(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!conversationId) { setLoading(false); return; }
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
    );
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
      setLoading(false);
    });
    return unsub;
  }, [conversationId]);

  return { messages, loading };
}
