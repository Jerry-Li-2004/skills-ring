import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { EntryIntro } from "./EntryIntro";
import { SkillOrbit } from "./experience";
import { authenticatedFetch, supabase } from "./supabase";
import "./auth.css";
import { ProfileImport } from "./ProfileImport";

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
    localStorage.removeItem("sr-registration-token");
    await supabase?.auth.signOut({ scope: "local" });
    setAccount(null);
  }

  function focusRegistration() { document.getElementById("registration-name")?.focus(); }
  if (checking) return <div className="auth-status" role="status">Opening your workspace…</div>;
  if (account) return <EntryIntro>{children(account, logout)}</EntryIntro>;

  return (
    <div className="auth-home">
      <header className="auth-home-header">
        <a className="brand" href="#top" aria-label="Skills-Ring home">
          <span className="brand-mark"><span /><span /></span>
          skills<span className="brand-light">ring</span>
        </a>
        <span className="auth-home-header-note">A little give. A lot of possibility.</span>
        <button className="auth-home-header-action" type="button" onClick={focusRegistration}>
          Join the ring <ArrowRight size={16} />
        </button>
      </header>
      <main className="auth-home-content" id="top">
        <div className="auth-home-grid">
          <div className="auth-home-showcase">
            <span className="auth-home-eyebrow"><Sparkles size={15} /> THE SKILL-SWAP COMMUNITY</span>
            <SkillOrbit onExplore={focusRegistration} onAddSkills={focusRegistration} />
          </div>
          <section className="auth-card" aria-labelledby="auth-title">
            <span className="auth-card-kicker">YOUR SPACE IN THE RING</span>
            <h1 id="auth-title">Make room for more.</h1>
            <p className="auth-intro">Add a skill you can offer and something you want to learn to find community exchanges. You can explore examples separately in demo mode.</p>
            <form onSubmit={submit}>
              <label>Display name<input id="registration-name" name="name" autoComplete="name" minLength={2} maxLength={80} placeholder="What should we call you?" required /></label>
              <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required /></label>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Opening your workspace…" : "Join and start exploring"} {!busy && <ArrowRight size={17} />}</button>
            </form>
            <p className="auth-card-footnote">Your profile stays available in this browser. Clearing browser data or leaving this profile means registering a new one.</p>
            <ProfileImport />
          </section>
        </div>
        <div className="auth-home-features" aria-label="How Skills-Ring works">
          <div><span>01 / GIVE</span><strong>Share what you know.</strong><p>Make everyday skills useful to someone else.</p></div>
          <div><span>02 / LEARN</span><strong>Find what you need.</strong><p>Discover exchanges that work for both sides.</p></div>
          <div><span>03 / CONNECT</span><strong>Keep the ring moving.</strong><p>Agree on clear terms and track each contribution.</p></div>
        </div>
      </main>
    </div>
  );
}
