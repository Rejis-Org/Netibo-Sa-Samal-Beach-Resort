import { AdminChatInbox } from "@/app/admin/chat-inbox";
import { requireAdmin } from "@/app/admin/require-admin";
import { AdminPageFrame } from "@/app/admin/admin-ui";

export const metadata = { title: "Live chats" };

export default async function AdminChatsPage() {
  await requireAdmin();
  return (
    <AdminPageFrame section="chats">
      <AdminChatInbox />
    </AdminPageFrame>
  );
}
