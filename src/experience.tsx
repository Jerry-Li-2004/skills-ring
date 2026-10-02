import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  Camera,
  Check,
  Code2,
  HeartHandshake,
  MoveUpRight,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";
import type { Status } from "./domain";

const chapters = [
  {
    label: "Give",
    title: "Your skill. Someone’s breakthrough.",
    detail: "A little of what you know can open a whole new door.",
    icon: Code2,
  },
  {
    label: "Learn",
    title: "The next version of you starts here.",
    detail: "Find the person who can teach you something new.",
    icon: Camera,
  },
  {
    label: "Connect",
    title: "Good things come full circle.",
    detail: "When two people don’t match, a ring connects the possibilities.",
    icon: HeartHandshake,
  },
];

/** Interactive explanation of the exchange idea; it never changes agreement data. */
export function SkillOrbit({
  onExplore,
  onAddSkills,
}: {
  onExplore: () => void;
  onAddSkills: () => void;
}) {
  const [chapter, setChapter] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = chapters[chapter];
  return (
    <section className="possibility-hero" data-chapter={chapter}>
      <div className="hero-copy">
        <h2>
          Trade Skills.
          <br />
          <span>Complete the Ring.</span>
        </h2>
        <p className="hero-problem-mark">
          Turn overlooked skills into fair exchanges—with clear terms, tracked
          contributions, and recovery when a ring breaks.
        </p>
        <div className="hero-actions">
          <button className="button primary hero-primary" onClick={onExplore}>
            Find your next exchange <ArrowUpRight size={17} />
          </button>
          <button className="hero-secondary" onClick={onAddSkills}>
            <span className="hero-secondary-icon">
              <Plus size={12} />
            </span>{" "}
            Add Skills
          </button>
        </div>
        <div className="hero-footnote">
          <span className="mini-member-stack">
            <span>AC</span>
            <span>BW</span>
            <span>CL</span>
          </span>
          <span>
            Real skills. Shared possibilities.
            <small>No money. Just a little give and grow.</small>
          </span>
        </div>
      </div>
      <div className="orbit-experience">
        <div
          className="orbit-scene"
          aria-label="Example skills connected through a ring"
        >
          <div className="orbit-glow" aria-hidden="true" />
          <svg className="orbit-paths" viewBox="0 0 460 370" aria-hidden="true">
            <defs>
              <linearGradient id="orbit-gradient" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#567aff" />
                <stop offset=".5" stopColor="#b287ff" />
                <stop offset="1" stopColor="#61cfab" />
              </linearGradient>
            </defs>
            <ellipse
              className="orbit-guide"
              cx="231"
              cy="179"
              rx="150"
              ry="124"
              transform="rotate(-20 231 179)"
            />
            <ellipse
              className="orbit-flow"
              cx="231"
              cy="179"
              rx="150"
              ry="124"
              transform="rotate(-20 231 179)"
            />
          </svg>
          <div className="orbit-core" aria-hidden="true">
            <div className="sculpture-ring ring-one" />
            <div className="sculpture-ring ring-two" />
            <span className="core-spark">
              <Sparkles size={23} />
            </span>
          </div>
          <button
            className={`orbit-skill orbit-code ${chapter === 0 ? "is-highlighted" : ""}`}
            onClick={() => setChapter(0)}
            aria-label="Explore giving a skill"
          >
            <span className="orbit-skill-icon">
              <Code2 size={23} />
            </span>
            <span>
              <small>I can share</small>
              <strong>Python</strong>
            </span>
            <span className="orbit-card-arrow">
              <MoveUpRight size={15} />
            </span>
          </button>
          <button
            className={`orbit-skill orbit-camera ${chapter === 1 ? "is-highlighted" : ""}`}
            onClick={() => setChapter(1)}
            aria-label="Explore learning a skill"
          >
            <span className="orbit-skill-icon">
              <Camera size={23} />
            </span>
            <span>
              <small>I’d love to learn</small>
              <strong>Photography</strong>
            </span>
            <span className="orbit-card-arrow">
              <MoveUpRight size={15} />
            </span>
          </button>
          <button
            className={`orbit-skill orbit-connect ${chapter === 2 ? "is-highlighted" : ""}`}
            onClick={() => setChapter(2)}
            aria-label="Explore a skill exchange ring"
          >
            <span className="orbit-skill-icon">
              <HeartHandshake size={23} />
            </span>
            <span>
              <small>We make it happen</small>
              <strong>Full circle.</strong>
            </span>
            <span className="orbit-card-arrow">
              <Check size={16} />
            </span>
          </button>
          <span className="orbit-satellite satellite-one" aria-hidden="true">
            <Zap size={15} />
          </span>
          <span className="orbit-satellite satellite-two" aria-hidden="true">
            ✦
          </span>
          <span className="orbit-caption">
            ONE CONNECTION CAN CHANGE EVERYTHING
          </span>
        </div>
        <div
          className="orbit-controls"
          role="tablist"
          aria-label="Explore how skill exchange works"
        >
          {chapters.map((c, i) => (
            <button
              key={c.label}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              id={`chapter-${i}`}
              aria-controls="chapter-content"
              aria-selected={chapter === i}
              tabIndex={chapter === i ? 0 : -1}
              className={chapter === i ? "active" : ""}
              onClick={() => setChapter(i)}
              onKeyDown={(event) => {
                if (
                  ["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
                ) {
                  event.preventDefault();
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : (i + (event.key === "ArrowRight" ? 1 : 2)) % 3;
                  setChapter(next);
                  tabs.current[next]?.focus();
                }
              }}
            >
              <c.icon size={14} />
              {c.label}
            </button>
          ))}
        </div>
        <div
          className="chapter-copy"
          id="chapter-content"
          role="tabpanel"
          aria-labelledby={`chapter-${chapter}`}
        >
          <strong key={`${chapter}-title`}>{current.title}</strong>
          <p key={`${chapter}-detail`}>{current.detail}</p>
        </div>
      </div>
    </section>
  );
}

export function useMotionPreference() {
  const [motion, setMotion] = useState(() => {
    try {
      const saved = localStorage.getItem("skills-ring-motion");
      if (saved !== null) return saved === "on";
    } catch {
      /* storage is optional */
    }
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    document.documentElement.dataset.motion = motion ? "on" : "off";
    try {
      localStorage.setItem("skills-ring-motion", motion ? "on" : "off");
    } catch {
      /* preference remains local to this session */
    }
  }, [motion]);
  return [motion, setMotion] as const;
}

export function AnimatedValue({ value }: { value: ReactNode }) {
  const raw = String(value),
    match = raw.match(/^(\d+)(.*)$/),
    target = match ? Number(match[1]) : 0;
  const [number, setNumber] = useState(target);
  useEffect(() => {
    if (
      !match ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.dataset.motion === "off"
    ) {
      setNumber(target);
      return;
    }
    let request = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 650);
      setNumber(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [target, raw]);
  return (
    <>
      <span aria-hidden="true">{match ? `${number}${match[2]}` : value}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}

export function ExchangeJourney({ status }: { status: Status }) {
  const active =
    status === "settled"
      ? 3
      : status === "proposed"
        ? 0
        : status === "confirmed"
          ? 1
          : 2;
  const held = ["withdrawn", "disputed", "defaulted"].includes(status);
  return (
    <ol
      className={`exchange-journey ${held ? "journey-held" : ""}`}
      aria-label="Exchange journey"
    >
      {[
        "Review terms",
        "Everyone agrees",
        "Share your skills",
        "Full circle",
      ].map((label, i) => (
        <li
          key={label}
          className={i < active ? "complete" : i === active ? "current" : ""}
        >
          <span>{i < active ? <Check size={12} /> : i + 1}</span>
          <strong>{label}</strong>
        </li>
      ))}
    </ol>
  );
}

export function SettlementMoment() {
  return (
    <div className="settlement-moment" role="status">
      <div className="celebration-shapes" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <i
            key={i}
            style={
              {
                "--i": i,
                "--angle": `${i * 30}deg`,
                "--delay": `${i * 0.025}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <span className="settlement-check">
        <Check size={26} />
      </span>
      <div>
        <span className="eyebrow">GOOD THINGS COME FULL CIRCLE</span>
        <h3>You both showed up. Possibility delivered.</h3>
        <p>Every agreed service is fulfilled. Your next connection awaits.</p>
      </div>
      <Sparkles className="settlement-spark" size={27} />
    </div>
  );
}
