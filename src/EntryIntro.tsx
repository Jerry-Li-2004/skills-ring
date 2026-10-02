import { useEffect, useState, type ReactNode } from "react";
import "./intro.css";

/** Runs once on entry, without replaying during navigation inside the app. */
export function EntryIntro({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"playing" | "leaving" | "done">(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "done";
    try {
      if (localStorage.getItem("skills-ring-motion") === "off") return "done";
    } catch { /* Storage is optional. */ }
    return "playing";
  });

  useEffect(() => {
    if (phase === "done") return;
    const timer = window.setTimeout(
      () => setPhase(phase === "playing" ? "leaving" : "done"),
      phase === "playing" ? 2400 : 550,
    );
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const skip = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPhase("done");
    };
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (preference.matches) setPhase("done"); };
    window.addEventListener("keydown", skip);
    preference.addEventListener("change", reduce);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", skip);
      preference.removeEventListener("change", reduce);
    };
  }, [phase]);

  return (
    <>
      <div inert={phase !== "done"} aria-hidden={phase !== "done" ? true : undefined}>
        {children}
      </div>
      {phase !== "done" && (
        <div className={`entry-intro ${phase === "leaving" ? "is-leaving" : ""}`}>
          <div className="entry-intro-center" role="status" aria-label="Welcome to Skills-Ring">
            <div className="entry-intro-halo" aria-hidden="true" />
            <svg className="entry-intro-logo" viewBox="0 0 108 108" fill="none" aria-hidden="true">
              <g className="entry-ring entry-ring-first">
                <ellipse cx="50" cy="54" rx="17" ry="23" transform="rotate(27 50 54)" stroke="#5965ff" strokeWidth="6" pathLength="1" />
              </g>
              <g className="entry-ring entry-ring-second">
                <ellipse cx="68" cy="62" rx="17" ry="23" transform="rotate(27 68 62)" stroke="#8a94ff" strokeWidth="6" pathLength="1" />
              </g>
            </svg>
            <div className="entry-intro-wordmark" aria-hidden="true">skills<span>ring</span></div>
            <p className="entry-intro-caption" aria-hidden="true">Good things come full circle.</p>
          </div>
          <button className="entry-intro-skip" onClick={() => setPhase("done")}>
            Skip intro <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
    </>
  );
}
