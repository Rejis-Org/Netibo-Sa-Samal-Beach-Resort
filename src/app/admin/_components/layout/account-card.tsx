import { logoutAction } from "@/app/admin/_actions/auth";

type AccountCardProps = { email: string; role: "owner" | "staff" };

export function AccountCard({ email, role }: AccountCardProps) {
  return (
    <div className="admin-account-card">
      <span className="admin-account-email" title={email}>
        {email}
      </span>
      <span className="admin-account-role">{role === "owner" ? "Owner" : "Staff"}</span>
      <form action={logoutAction}>
        <button className="admin-signout" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
