"use client";

import { useTranslations } from "next-intl";
import type { Json } from "@/lib/supabase/database.types";
import { useDraggable } from "./use-draggable";
import { useSiteChat } from "./use-site-chat";
import { ChatIcon, CloseIcon } from "./icons";

function isRecord(value: Json | null): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: Json | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

export function SiteChat() {
  const t = useTranslations("chat");
  const {
    open, setOpen, conversation, messages, loading, sending, error, transcript,
    guestName, setGuestName, contact, setContact, draft, setDraft, sendMessage, retry,
  } = useSiteChat();
  const { position, panelStyle, consumeSuppressedClick, pointerHandlers } = useDraggable();

  return (
    <div className={`site-chat${open ? " site-chat-open" : ""}`}>
      {open && <section className="site-chat-panel" style={panelStyle} aria-label={t("title")}>
        <header className="site-chat-header">
          <div><p className="eyebrow">{t("eyebrow")}</p><h2>{t("title")}</h2><span className="site-chat-status">{conversation ? t("online") : t("connecting")}</span></div>
          <button type="button" className="site-chat-close" aria-label={t("close")} onClick={() => setOpen(false)}><CloseIcon size={18} /></button>
        </header>
        <div className="site-chat-profile">
          <label>{t("name")}<input value={guestName} maxLength={160} onChange={(event) => setGuestName(event.target.value)} /></label>
          <label>{t("contact")}<input value={contact} maxLength={120} onChange={(event) => setContact(event.target.value)} /></label>
        </div>
        <div className="site-chat-messages" ref={transcript} aria-live="polite">
          {!messages.length && !loading && <p className="site-chat-intro">{t("intro")}</p>}
          {messages.map((message) => {
            const own = message.sender === "guest";
            const details = isRecord(message.booking_details) ? message.booking_details : null;
            return <article className={`site-chat-message${own ? " site-chat-message-own" : ""}${message.message_type === "booking" ? " site-chat-message-booking" : ""}`} key={message.id}>
              {message.message_type === "booking" && details
                ? <BookingSummary details={details} t={t} />
                : <p>{message.body}</p>}
              <span>{new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(message.created_at))}
                {own && <b>{message.read_at ? ` · ${t("seen")}` : ` · ${t("sent")}`}</b>}
              </span>
            </article>;
          })}
          {loading && <p className="site-chat-intro">{t("connecting")}</p>}
        </div>
        {error && <p className="site-chat-error" role="alert">{error}<button type="button" onClick={retry}>{t("retry")}</button></p>}
        <form className="site-chat-compose" onSubmit={sendMessage}>
          <textarea value={draft} maxLength={3000} rows={2} placeholder={t("messagePlaceholder")} onChange={(event) => setDraft(event.target.value)} disabled={!conversation || sending} />
          <button type="submit" className="button button-blue" disabled={!draft.trim() || !conversation || sending}>{sending ? t("sending") : t("send")}</button>
        </form>
      </section>}
      <button
        type="button"
        className="site-chat-launcher"
        style={position ? { left: position.x, top: position.y, right: "auto", bottom: "auto" } : undefined}
        aria-label={open ? t("close") : t("open")}
        aria-expanded={open}
        {...pointerHandlers}
        onClick={() => {
          if (consumeSuppressedClick()) return;
          setOpen((value) => !value);
        }}
      >
        {open ? <span aria-hidden="true"><CloseIcon size={26} /></span> : <span aria-hidden="true"><ChatIcon size={26} /></span>}
      </button>
    </div>
  );
}

function BookingSummary({ details, t }: { details: { [key: string]: Json | undefined }; t: ReturnType<typeof useTranslations> }) {
  const rows = [
    ["reference", textValue(details.ref_code)],
    ["guest", textValue(details.guest_name)],
    ["bookingType", textValue(details.package_name) || textValue(details.unit_names) || textValue(details.type)],
    ["date", [textValue(details.date_start), textValue(details.date_end)].filter(Boolean).join(" – ")],
    ["guests", `${textValue(details.adults)} ${t("adults")} · ${textValue(details.children)} ${t("children")}`],
    ["total", textValue(details.total_amount)],
    ["phone", textValue(details.phone)],
    ["email", textValue(details.guest_email)],
    ["notes", textValue(details.notes)],
  ].filter(([, value]) => value);

  return <div className="site-chat-booking"><strong>{t("bookingRequest")}</strong><dl>{rows.map(([label, value]) => <div key={label}><dt>{t(label as never)}</dt><dd>{value}</dd></div>)}</dl></div>;
}
