import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

type ChatMessage = Database["public"]["Tables"]["messages"]["Row"];
type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

export function useSiteChat() {
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
  const [attempted, setAttempted] = useState(false);
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

  function retry() {
    setConversation(null);
    setMessages([]);
    setError("");
    setAttempted(false);
  }

  return {
    open, setOpen, conversation, messages, loading, sending, error, transcript,
    guestName, setGuestName, contact, setContact, draft, setDraft, sendMessage, retry,
  };
}
