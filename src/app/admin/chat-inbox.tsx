"use client";

import type { Json } from "@/lib/supabase/database.types";
import { useAdminChat } from "./use-admin-chat";

function isRecord(value: Json | null): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: Json | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function AdminChatInbox() {
  const {
    conversations, unreadCounts, selectedId, selected, messages, draft, setDraft,
    loading, error, sending, transcript, sendReply, selectConversation,
  } = useAdminChat();

  return (
    <div className="admin-chat-inbox">
      {error && <p className="admin-message admin-message-error" role="alert">{error}</p>}
      <div className="admin-chat-layout">
        <aside className="admin-chat-list" aria-label="Conversations">
          {loading && <p className="admin-empty-state">Loading conversations…</p>}
          {!loading && conversations.length === 0 && <p className="admin-empty-state">No chats yet. New website conversations will appear here.</p>}
          {conversations.map((item) => (
            <button type="button" className={`admin-chat-conversation${selectedId === item.id ? " admin-chat-conversation-active" : ""}`} key={item.id} onClick={() => selectConversation(item.id)}>
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
