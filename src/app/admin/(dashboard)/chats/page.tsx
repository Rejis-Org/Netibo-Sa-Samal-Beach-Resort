import { AdminChatInbox } from "@/app/admin/_components/chat/chat-inbox";
import { requireAdmin } from "@/app/admin/_lib/require-admin";
import { AdminPageFrame } from "@/app/admin/_components/ui/admin-page-frame";

export const metadata = { title: "Live chats" };

export default async function AdminChatsPage() {
  await requireAdmin();
  return (
    <AdminPageFrame section="chats">
      <AdminChatInbox />
    </AdminPageFrame>
  );
}
