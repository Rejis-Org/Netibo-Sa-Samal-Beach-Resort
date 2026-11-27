import type { FormEvent, RefObject } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { AdminBookingDetails, isRecord } from "./chat-booking-details";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type ChatMessage = Database["public"]["Tables"]["messages"]["Row"];

type ChatThreadProps = {
  selected: Conversation | null;
  messages: ChatMessage[];
  draft: string;
  setDraft: (value: string) => void;
  sending: boolean;
  transcript: RefObject<HTMLDivElement | null>;
  sendReply: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

export function ChatThread({ selected, messages, draft, setDraft, sending, transcript, sendReply }: ChatThreadProps) {
  return (
    <section className="admin-chat-thread" aria-label="Selected conversation">
      {!selected && <p className="admin-empty-state">Select a conversation to view messages and reply.</p>}
      {selected && (
        <>
          <header className="admin-chat-thread-header">
            <div>
              <h3>{selected.guest_name || "Website visitor"}</h3>
              <p>
                {selected.contact || "No contact shared"}
                {selected.booking_id ? " · Booking attached" : ""}
              </p>
            </div>
          </header>
          <div className="admin-chat-messages" ref={transcript} aria-live="polite">
            {messages.map((message) => {
              const details = isRecord(message.booking_details) ? message.booking_details : null;
              return (
                <article
                  className={`admin-chat-message${message.sender === "owner" ? " admin-chat-message-own" : ""}${message.message_type === "booking" ? " admin-chat-message-booking" : ""}`}
                  key={message.id}
                >
                  {message.message_type === "booking" && details ? (
                    <AdminBookingDetails details={details} />
                  ) : (
                    <p>{message.body}</p>
                  )}
                  <span>
                    {new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(
                      new Date(message.created_at),
                    )}
                    {message.sender === "owner" && <b>{message.read_at ? " · Seen" : " · Sent"}</b>}
                  </span>
                </article>
              );
            })}
          </div>
          <form className="admin-chat-compose" onSubmit={sendReply}>
            <textarea
              rows={2}
              maxLength={3000}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Write a reply…"
            />
            <button type="submit" className="button button-blue" disabled={!draft.trim() || sending}>
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </>
      )}
    </section>
  );
}
