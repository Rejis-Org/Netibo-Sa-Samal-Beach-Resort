"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/lib/supabase/database.types";

type ChatMessage = Database["public"]["Tables"]["messages"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type Position = { x: number; y: number };

function isRecord(value: Json | null): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function textValue(value: Json | undefined) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function clampPosition(position: Position): Position {
  const margin = 12;
  const buttonSize = 62;
  return {
    x: Math.max(margin, Math.min(position.x, window.innerWidth - buttonSize - margin)),
    y: Math.max(margin, Math.min(position.y, window.innerHeight - buttonSize - margin)),
  };
}

export function SiteChat() {
  const t = useTranslations("chat");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guestName, setGuestName] = useState("");
  const [contact, setContact] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [attempted, setAttempted] = useState(false);
  const drag = useRef<{ pointerId: number; startX: number; startY: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);

  const startConversation = useCallback(async () => {
    if (!supabase) {
      setError(t("unavailable"));
      return;
    }
    setLoading(true);
    setError("");
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      setError(t("connectionError"));
      setLoading(false);
      return;
    }
    if (!sessionData.session) {
      const { error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        setError(t("connectionError"));
        setLoading(false);
        return;
      }
    }
    const { data, error: conversationError } = await supabase.rpc("get_or_create_guest_conversation", {
      p_guest_name: null,
      p_contact: null,
    });
    const currentConversation = data?.[0];
    if (conversationError || !currentConversation) {
      setError(t("connectionError"));
      setLoading(false);
      return;
    }
    setConversation(currentConversation);
    setGuestName(currentConversation.guest_name ?? "");
    setContact(currentConversation.contact ?? "");
    const { data: initialMessages, error: messagesError } = await supabase.from("messages")
      .select("*").eq("conversation_id", currentConversation.id).order("created_at");
    if (messagesError) {
      setError(t("connectionError"));
    } else {
      setMessages(initialMessages ?? []);
      const { error: readError } = await supabase.rpc("mark_messages_read", { p_conversation_id: currentConversation.id });
      if (readError) setError(t("connectionError"));
    }
    setLoading(false);
  }, [supabase, t]);

  useEffect(() => {
    if (!open || conversation || loading || attempted) return;
    const timer = window.setTimeout(() => {
      setAttempted(true);
      void startConversation();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [attempted, conversation, loading, open, startConversation]);

  useEffect(() => {
    if (!supabase || !conversation) return;
    const channel = supabase.channel(`guest-chat-${conversation.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversation.id}`,
      }, (payload) => {
        if (payload.eventType === "INSERT") {
          const incoming = payload.new as ChatMessage;
          setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
          if (open && incoming.sender === "owner") {
            void supabase.rpc("mark_messages_read", { p_conversation_id: conversation.id })
              .then(({ error: readError }) => {
                if (readError) setError(t("connectionError"));
              });
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as ChatMessage;
          setMessages((current) => current.map((message) => message.id === updated.id ? updated : message));
        }
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setError(t("realtimeError"));
      });
    return () => { void supabase.removeChannel(channel); };
  }, [conversation, open, supabase, t]);

  useEffect(() => {
    if (!open || !conversation || !supabase) return;
    void supabase.rpc("mark_messages_read", { p_conversation_id: conversation.id })
      .then(({ error: readError }) => {
        if (readError) setError(t("connectionError"));
      });
  }, [conversation, open, supabase, t]);

  useEffect(() => {
    if (!transcript.current) return;
    transcript.current.scrollTop = transcript.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = window.localStorage.getItem("netibo-chat-position");
        if (saved) {
          const parsed = JSON.parse(saved) as Position;
          if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) setPosition(clampPosition(parsed));
        }
      } catch {
        setPosition(null);
      }
    });
    const handleResize = () => setPosition((current) => current ? clampPosition(current) : current);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const savePosition = useCallback((next: Position) => {
    const bounded = clampPosition(next);
    setPosition(bounded);
    try {
      window.localStorage.setItem("netibo-chat-position", JSON.stringify(bounded));
    } catch {
      // The widget remains draggable when storage is unavailable.
    }
  }, []);

  function onButtonPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const current = position ?? { x: rect.left, y: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - current.x,
      offsetY: event.clientY - current.y,
      moved: false,
    };
    suppressClick.current = false;
  }

  function onButtonPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    const next = { x: event.clientX - activeDrag.offsetX, y: event.clientY - activeDrag.offsetY };
    if (Math.abs(event.clientX - activeDrag.startX) > 4 || Math.abs(event.clientY - activeDrag.startY) > 4) activeDrag.moved = true;
    if (activeDrag.moved) setPosition(clampPosition(next));
  }

  function onButtonPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    if (activeDrag.moved) {
      suppressClick.current = true;
      savePosition({ x: event.clientX - activeDrag.offsetX, y: event.clientY - activeDrag.offsetY });
    }
    drag.current = null;
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || body.length > 3000 || !conversation || !supabase || sending) return;
    setSending(true);
    setError("");
    const { error: profileError } = await supabase.rpc("get_or_create_guest_conversation", {
      p_guest_name: guestName.trim() || null,
      p_contact: contact.trim() || null,
    });
    if (profileError) {
      setError(t("sendError"));
      setSending(false);
      return;
    }
    const { data, error: sendError } = await supabase.from("messages").insert({
      conversation_id: conversation.id,
      sender: "guest",
      message_type: "text",
      body,
    }).select("*").single();
    if (sendError || !data) {
      setError(t("sendError"));
    } else {
      setMessages((current) => current.some((message) => message.id === data.id) ? current : [...current, data]);
      setDraft("");
    }
    setSending(false);
  }

  const panelStyle = position ? (() => {
    const panelWidth = Math.min(390, window.innerWidth - 24);
    const panelHeight = Math.min(610, window.innerHeight - 24);
    const left = Math.max(12, Math.min(position.x + 31 - panelWidth / 2, window.innerWidth - panelWidth - 12));
    const aboveTop = position.y - panelHeight - 12;
    const top = aboveTop >= 12 ? aboveTop : position.y + 74;
    const boundedTop = Math.max(12, Math.min(top, window.innerHeight - panelHeight - 12));
    return { left, top: boundedTop, right: "auto", bottom: "auto" };
  })() : undefined;

  return (
    <div className={`site-chat${open ? " site-chat-open" : ""}`}>
      {open && <section className="site-chat-panel" style={panelStyle} aria-label={t("title")}>
        <header className="site-chat-header">
          <div><p className="eyebrow">{t("eyebrow")}</p><h2>{t("title")}</h2><span className="site-chat-status">{conversation ? t("online") : t("connecting")}</span></div>
          <button type="button" className="site-chat-close" aria-label={t("close")} onClick={() => setOpen(false)}>×</button>
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
        {error && <p className="site-chat-error" role="alert">{error}<button type="button" onClick={() => { setConversation(null); setMessages([]); setError(""); setAttempted(false); }}>{t("retry")}</button></p>}
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
        onPointerDown={onButtonPointerDown}
        onPointerMove={onButtonPointerMove}
        onPointerUp={onButtonPointerUp}
        onPointerCancel={onButtonPointerUp}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          setOpen((value) => !value);
        }}
      >
        {open ? <span aria-hidden="true">×</span> : <span aria-hidden="true">✦</span>}
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
