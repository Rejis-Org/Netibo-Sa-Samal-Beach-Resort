import type { Database } from "@/lib/supabase/database.types";

type Conversation = Database["public"]["Tables"]["conversations"]["Row"];

type ConversationListProps = {
  conversations: Conversation[];
  unreadCounts: Record<string, number>;
  selectedId: string;
  loading: boolean;
  onSelect: (id: string) => void;
};

export function ConversationList({
  conversations,
  unreadCounts,
  selectedId,
  loading,
  onSelect,
}: ConversationListProps) {
  return (
    <aside className="admin-chat-list" aria-label="Conversations">
      {loading && <p className="admin-empty-state">Loading conversations…</p>}
      {!loading && conversations.length === 0 && (
        <p className="admin-empty-state">No chats yet. New website conversations will appear here.</p>
      )}
      {conversations.map((item) => (
        <button
          type="button"
          className={`admin-chat-conversation${selectedId === item.id ? " admin-chat-conversation-active" : ""}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
        >
          <span className="admin-chat-conversation-top">
            <strong>{item.guest_name || "Website visitor"}</strong>
            {unreadCounts[item.id] ? <b>{unreadCounts[item.id]}</b> : null}
          </span>
          <span>{item.contact || "No contact shared"}</span>
          <time dateTime={item.last_message_at}>
            {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(item.last_message_at),
            )}
          </time>
        </button>
      ))}
    </aside>
  );
}
