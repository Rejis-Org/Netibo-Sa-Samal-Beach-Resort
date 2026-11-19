import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
type ChatMessage = Database["public"]["Tables"]["messages"]["Row"];

export function useAdminChat() {
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

  function selectConversation(id: string) {
    setSelectedId(id);
    setMessages([]);
    setError("");
  }

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  return {
    conversations, unreadCounts, selectedId, selected, messages, draft, setDraft,
    loading, error, sending, transcript, sendReply, selectConversation,
  };
}
