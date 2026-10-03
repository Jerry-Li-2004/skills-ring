import { useState } from "react";

export function ProfileImport() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <details className="profile-import"><summary>Open a saved profile</summary><p>Choose your private profile file. Anyone with this file can access that profile. Opening it replaces the profile in this browser.</p>
    <label>Profile file<input type="file" accept="application/json,.json" disabled={busy} onChange={async e => {
      const file = e.target.files?.[0]; if (!file) return;
      setBusy(true); setError("");
      try {
        if (file.size > 16384) throw new Error("This profile file is too large.");
        const profile = JSON.parse(await file.text());
        if (profile.version !== 1 || typeof profile.token !== "string" || !profile.token.startsWith("sr1.")) throw new Error("Choose a valid Skills-Ring profile file.");
        const response = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${profile.token}` } });
        if (!response.ok) throw new Error("This profile is invalid or no longer active.");
        localStorage.setItem("sr-registration-token", profile.token);
        window.location.reload();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not open this profile."); setBusy(false); }
    }} /></label>{busy && <p role="status">Opening profile…</p>}{error && <p role="alert">{error}</p>}
  </details>;
}
