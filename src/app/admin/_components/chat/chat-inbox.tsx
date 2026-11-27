"use client";

import { ChatThread } from "./chat-thread";
import { ConversationList } from "./conversation-list";
import { useAdminChat } from "./use-admin-chat";

export function AdminChatInbox() {
  const {
    conversations,
    unreadCounts,
    selectedId,
    selected,
    messages,
    draft,
    setDraft,
    loading,
    error,
    sending,
    transcript,
    sendReply,
    selectConversation,
  } = useAdminChat();

  return (
    <div className="admin-chat-inbox">
      {error && (
        <p className="admin-message admin-message-error" role="alert">
          {error}
        </p>
      )}
      <div className="admin-chat-layout">
        <ConversationList
          conversations={conversations}
          unreadCounts={unreadCounts}
          selectedId={selectedId}
          loading={loading}
          onSelect={selectConversation}
        />
        <ChatThread
          selected={selected}
          messages={messages}
          draft={draft}
          setDraft={setDraft}
          sending={sending}
          transcript={transcript}
          sendReply={sendReply}
        />
      </div>
    </div>
  );
}
