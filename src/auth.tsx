import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { EntryIntro } from "./EntryIntro";
import { SkillOrbit } from "./experience";
import "./auth.css";

export type Account = {
  userId: string;
  name: string;
  email: string;
  status: "Active";
};

type Response = { user?: Account; error?: string };

async function request(path: string, body?: object): Promise<Response> {
  const response = await fetch(`/api/auth/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json()) as Response;
  if (!response.ok) throw new Error(data.error || "The request could not be completed.");
  return data;
}

export function AuthGate({ children }: { children: (account: Account, logout: () => Promise<void>) => ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    request("me").then((data) => setAccount(data.user || null)).catch(() => setAccount(null))
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    if (mode === "register" && password !== String(data.get("confirmPassword") || "")) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await request(mode, {
        name: mode === "register" ? String(data.get("name") || "") : undefined,
        email: String(data.get("email") || ""),
        password,
      });
      setAccount(result.user || null);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The account service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await request("logout", {});
    setAccount(null);
  }

  if (checking) return <div className="auth-status" role="status">Checking your session…</div>;
  if (account) return <EntryIntro>{children(account, logout)}</EntryIntro>;

  return (
    <div className="auth-home">
      <header className="auth-home-header">
        <a className="brand" href="#top" aria-label="Skills-Ring home">
          <span className="brand-mark"><span /><span /></span>
          skills<span className="brand-light">ring</span>
        </a>
        <span className="auth-home-header-note">A little give. A lot of possibility.</span>
        <button className="auth-home-header-action" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Join the ring" : "Sign in"} <ArrowRight size={16} />
        </button>
      </header>
      <main className="auth-home-content" id="top">
        <div className="auth-home-grid">
          <div className="auth-home-showcase">
            <span className="auth-home-eyebrow"><Sparkles size={15} /> THE SKILL-SWAP COMMUNITY</span>
            <SkillOrbit onExplore={() => setMode("register")} onAddSkills={() => setMode("register")} />
          </div>
          <section className="auth-card" aria-labelledby="auth-title">
            <span className="auth-card-kicker">YOUR SPACE IN THE RING</span>
            <h1 id="auth-title">{mode === "register" ? "Make room for more." : "Welcome back."}</h1>
            <p className="auth-intro">{mode === "register" ? "Create an account to explore what your skills can become." : "Sign in to explore skills, exchanges, and the demo workspace."}</p>
            <form onSubmit={submit}>
              {mode === "register" && <label>Display name<input name="name" autoComplete="name" minLength={2} maxLength={80} placeholder="What should we call you?" required /></label>}
              <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required /></label>
              <label>Password<input name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={8} maxLength={128} placeholder={mode === "register" ? "At least 8 characters" : "Your password"} required /></label>
              {mode === "register" && <>
                <p className="auth-hint">At least 8 characters; a longer passphrase is safer.</p>
                <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Enter your password again" required /></label>
              </>}
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"} {!busy && <ArrowRight size={17} />}</button>
            </form>
            <button className="auth-switch" type="button" onClick={() => { setMode(mode === "register" ? "login" : "register"); setError(""); }}>
              {mode === "register" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
            <p className="auth-card-footnote"><ShieldCheck size={15} /> Your account is real; the exchange workspace currently uses fictional demo participants.</p>
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
