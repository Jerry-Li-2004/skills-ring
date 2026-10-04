import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { EntryIntro } from "./EntryIntro";
import { SkillOrbit } from "./experience";
import { authenticatedFetch, supabase } from "./supabase";
import "./auth.css";
import { ProfileImport } from "./ProfileImport";

const registrationProviders = ["Google", "WeChat", "Microsoft"] as const;
type RegistrationProvider = typeof registrationProviders[number];

function ProviderIcon({ provider }: { provider: RegistrationProvider }) {
  if (provider === "Microsoft") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#f25022" d="M2 2h9v9H2z" /><path fill="#7fba00" d="M13 2h9v9h-9z" /><path fill="#00a4ef" d="M2 13h9v9H2z" /><path fill="#ffb900" d="M13 13h9v9h-9z" /></svg>;
  if (provider === "WeChat") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#07b75b" d="M10 3C5 3 1 6.2 1 10.2c0 2.2 1.2 4.2 3.2 5.5L3.4 19l3.7-1.8c.9.2 1.9.4 2.9.4 5 0 9-3.3 9-7.4S15 3 10 3Z" /><path fill="#07b75b" stroke="#fff" strokeWidth="1.2" d="M16 10c-3.9 0-7 2.5-7 5.6s3.1 5.6 7 5.6c.8 0 1.5-.1 2.2-.3l2.8 1.3-.6-2.5c1.6-1 2.6-2.5 2.6-4.1S19.9 10 16 10Z" /><g fill="#fff"><circle cx="7" cy="8" r="1" /><circle cx="13" cy="8" r="1" /><circle cx="13.5" cy="14.5" r=".8" /><circle cx="18.5" cy="14.5" r=".8" /></g></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285f4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" /><path fill="#34a853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.89.6-2.03.96-3.39.96-2.6 0-4.81-1.76-5.6-4.13H3.06v2.59A10 10 0 0 0 12 22Z" /><path fill="#fbbc05" d="M6.4 13.91a6 6 0 0 1 0-3.82V7.5H3.06a10 10 0 0 0 0 9l3.34-2.59Z" /><path fill="#ea4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.5l3.34 2.59C7.19 7.72 9.4 5.96 12 5.96Z" /></svg>;
}

export type Account = {
  moderator?: boolean;
  userId: string;
  name: string;
  email: string;
  status: "Active";
};

export function AuthGate({ children }: { children: (account: Account, logout: () => Promise<void>) => ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [providerPreview, setProviderPreview] = useState(false);

  function previewProvider(provider: RegistrationProvider) {
    const userId = `preview-${provider.toLowerCase()}`;
    try {
      localStorage.setItem(`skills-ring-mode-v1-${userId}`, "demo");
    } catch {
      setError("Please enable browser storage to open the demo workspace.");
      return;
    }
    setProviderPreview(true);
    setAccount({ userId, name: `${provider} Guest`, email: "", status: "Active" });
  }

  useEffect(() => {
    let active = true;
    void authenticatedFetch("/api/auth/me").then(async response => {
      if (response.ok) {
        const data = await response.json();
        if (active) setAccount(data.user);
      } else if (response.status === 401) {
        localStorage.removeItem("sr-registration-token");
      }
    }).catch(() => {}).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.get("name"), email: data.get("email") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Registration is unavailable. Please try again.");
      localStorage.setItem("sr-registration-token", result.token);
      localStorage.setItem(`skills-ring-mode-v1-${result.user.userId}`, "live");
      setAccount(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Registration is unavailable. Please try again.");
    } finally { setBusy(false); }
  }

  async function logout() {
    if (providerPreview) {
      setProviderPreview(false);
      setAccount(null);
      return;
    }
    localStorage.removeItem("sr-registration-token");
    await supabase?.auth.signOut({ scope: "local" });
    setAccount(null);
  }

  function focusRegistration() { document.getElementById("registration-name")?.focus(); }
  if (checking) return <div className="auth-status" role="status">Opening your workspace…</div>;
  if (account) return providerPreview ? children(account, logout) : <EntryIntro>{children(account, logout)}</EntryIntro>;

  return (
    <div className="auth-home">
      <header className="auth-home-header">
        <a className="brand" href="#top" aria-label="Skills-Ring home">
          <span className="brand-mark"><span /><span /></span>
          skills<span className="brand-light">ring</span>
        </a>
        <button className="auth-home-header-action" type="button" onClick={focusRegistration}>
          Get started <ArrowRight size={16} />
        </button>
      </header>
      <main className="auth-home-content" id="top">
        <div className="auth-home-grid">
          <div className="auth-home-showcase">
            <SkillOrbit onExplore={focusRegistration} onAddSkills={focusRegistration} />
          </div>
          <section className="auth-card" aria-labelledby="auth-title">
            <h1 id="auth-title">Create your account</h1>
            <div className="auth-providers" aria-label="Account registration options">
              {registrationProviders.map(provider => <button className="auth-provider" type="button" key={provider} disabled={busy} onClick={() => previewProvider(provider)}><ProviderIcon provider={provider} /><span>Continue with {provider}</span><ArrowRight size={16} /></button>)}
            </div>
            <div className="auth-divider"><span>or use email</span></div>
            <form onSubmit={submit}>
              <label>Display name<input id="registration-name" name="name" autoComplete="name" minLength={2} maxLength={80} placeholder="What should we call you?" required /></label>
              <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required /></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Opening your workspace…" : "Create account"} {!busy && <ArrowRight size={17} />}</button>
            </form>
            <ProfileImport />
          </section>
        </div>
      </main>
    </div>
  );
}
