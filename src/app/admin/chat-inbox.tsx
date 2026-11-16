"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/lib/supabase/database.types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type ChatMessage = Database["public"]["Tables"]["messages"]["Row"];

function isRecord(value: Json | null): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function AdminChatInbox() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [selectedId, setSelectedId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    const [{ data, error: conversationError }, { data: unread, error: unreadError }] = await Promise.all([
      supabase.from("conversations").select("*").order("last_message_at", { ascending: false }).limit(100),
      supabase.from("messages").select("conversation_id").eq("sender", "guest").is("read_at", null).limit(1000),
    ]);
    if (conversationError || unreadError) {
      setError("Could not load live conversations. Check the Supabase chat schema and admin permissions.");
      setLoading(false);
      return;
    }
    const counts: Record<string, number> = {};
    for (const message of unread ?? []) counts[message.conversation_id] = (counts[message.conversation_id] ?? 0) + 1;
    setConversations(data ?? []);
    setUnreadCounts(counts);
    setLoading(false);
  }, [supabase]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!supabase) return;
    const { data, error: loadError } = await supabase.from("messages")
      .select("*").eq("conversation_id", conversationId).order("created_at");
    if (loadError) {
      setError("Could not load this conversation.");
      return;
    }
    setMessages(data ?? []);
    const { error: readError } = await supabase.rpc("mark_messages_read", { p_conversation_id: conversationId });
    if (readError) setError("The messages loaded, but read receipts could not be updated.");
  }, [supabase]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadConversations(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase.channel("admin-chat-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        void loadConversations();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        void loadConversations();
        const row = payload.new as Partial<ChatMessage>;
        if (row.conversation_id && row.conversation_id === selectedId) void loadMessages(row.conversation_id);
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError("Live updates are disconnected. Check the Supabase Realtime publication.");
      });
    return () => { void supabase.removeChannel(channel); };
  }, [loadConversations, loadMessages, selectedId, supabase]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setTimeout(() => { void loadMessages(selectedId); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadMessages, selectedId]);

  useEffect(() => {
    if (!transcript.current) return;
    transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages]);

  async function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 3000 || !selectedId || !supabase || sending) return;
    setSending(true);
    setError("");
    const { data, error: sendError } = await supabase.from("messages").insert({
      conversation_id: selectedId,
      sender: "owner",
      message_type: "text",
      body,
    }).select("*").single();
    if (sendError || !data) {
      setError("Your reply could not be sent. Check the connection and try again.");
    } else {
      setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data]);
      setDraft("");
    }
    setSending(false);
  }

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="admin-chat-inbox">
      {error && <p className="admin-message admin-message-error" role="alert">{error}</p>}
      <div className="admin-chat-layout">
        <aside className="admin-chat-list" aria-label="Conversations">
          {loading && <p className="admin-empty-state">Loading conversations…</p>}
          {!loading && conversations.length === 0 && <p className="admin-empty-state">No chats yet. New website conversations will appear here.</p>}
          {conversations.map((item) => (
            <button type="button" className={`admin-chat-conversation${selectedId === item.id ? " admin-chat-conversation-active" : ""}`} key={item.id} onClick={() => { setSelectedId(item.id); setMessages([]); setError(""); }}>
              <span className="admin-chat-conversation-top"><strong>{item.guest_name || "Website visitor"}</strong>{unreadCounts[item.id] ? <b>{unreadCounts[item.id]}</b> : null}</span>
              <span>{item.contact || "No contact shared"}</span>
              <time dateTime={item.last_message_at}>{new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.last_message_at))}</time>
            </button>
          ))}
        </aside>
        <section className="admin-chat-thread" aria-label="Selected conversation">
          {!selected && <p className="admin-empty-state">Select a conversation to view messages and reply.</p>}
          {selected && <>
            <header className="admin-chat-thread-header"><div><h3>{selected.guest_name || "Website visitor"}</h3><p>{selected.contact || "No contact shared"}{selected.booking_id ? " · Booking attached" : ""}</p></div></header>
            <div className="admin-chat-messages" ref={transcript} aria-live="polite">
              {messages.map((message) => {
                const details = isRecord(message.booking_details) ? message.booking_details : null;
                return <article className={`admin-chat-message${message.sender === "owner" ? " admin-chat-message-own" : ""}${message.message_type === "booking" ? " admin-chat-message-booking" : ""}`} key={message.id}>
                  {message.message_type === "booking" && details
                    ? <AdminBookingDetails details={details} />
                    : <p>{message.body}</p>}
                  <span>{new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}
                    {message.sender === "owner" && <b>{message.read_at ? " · Seen" : " · Sent"}</b>}
                  </span>
                </article>;
              })}
            </div>
            <form className="admin-chat-compose" onSubmit={sendReply}>
              <textarea rows={2} maxLength={3000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a reply…" />
              <button type="submit" className="button button-blue" disabled={!draft.trim() || sending}>{sending ? "Sending…" : "Send"}</button>
            </form>
          </>}
        </section>
      </div>
    </div>
  );
}

function AdminBookingDetails({ details }: { details: { [key: string]: Json | undefined } }) {
  const rows = [
    ["Reference", stringValue(details.ref_code)],
    ["Guest", stringValue(details.guest_name)],
    ["Booking", stringValue(details.package_name) || stringValue(details.unit_names) || stringValue(details.type)],
    ["Date", [stringValue(details.date_start), stringValue(details.date_end)].filter(Boolean).join(" – ")],
    ["Guests", `${stringValue(details.adults)} adults · ${stringValue(details.children)} children`],
    ["Total", stringValue(details.total_amount)],
    ["Phone", stringValue(details.phone)],
    ["Email", stringValue(details.guest_email)],
    ["Notes", stringValue(details.notes)],
  ].filter(([, value]) => value);
  return <div className="admin-chat-booking"><strong>Booking request</strong><dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></div>;
}
