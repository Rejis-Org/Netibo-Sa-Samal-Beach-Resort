import Link from "next/link";
import { loginAction } from "../actions";
import { getSupabaseEnv } from "@/lib/supabase/env";

type LoginPageProps = { searchParams: Promise<{ error?: string }> };

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const configured = Boolean(getSupabaseEnv());

  return (
    <main className="admin-login-wrap">
      <section className="admin-login-card">
        <Link className="admin-back-link" href="/">← Back to the website</Link>
        <p className="eyebrow">Netibo sa Samal</p>
        <h1>Owner and staff sign in</h1>
        <p>Use the email and password provided for your resort account.</p>
        {!configured && <p className="admin-message admin-message-error">Add the Supabase project URL and publishable key to `.env.local` to enable sign-in.</p>}
        {error === "credentials" && <p className="admin-message admin-message-error">That email or password was not accepted. Try again.</p>}
        {error === "access" && <p className="admin-message admin-message-error">This account does not have resort admin access. Ask the owner to add your account.</p>}
        {error === "setup" && <p className="admin-message admin-message-error">Supabase is not configured yet. Ask your developer to finish setup.</p>}
        <form action={loginAction} className="admin-form admin-login-form">
          <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} disabled={!configured} /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" required maxLength={128} disabled={!configured} /></label>
          <button className="button button-blue" type="submit" disabled={!configured}>Sign in</button>
        </form>
      </section>
    </main>
  );
}
