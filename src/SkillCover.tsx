import { useState } from "react";
import { library } from "./domain";

const templates = {
  programming: { file: "programming", alt: "A laptop displaying code in a bright workspace", position: "center 52%" },
  tennis: { file: "tennis", alt: "A tennis racket and ball on a green court", position: "center 53%" },
  photography: { file: "photography", alt: "A camera held outdoors, ready to take a photograph", position: "center 53%" },
  music: { file: "music", alt: "An acoustic guitar beside a recording microphone", position: "center 48%" },
  learning: { file: "learning", alt: "An open notebook, pencil, and cup of coffee", position: "center 55%" },
};

export function SkillCover({ skill }: { skill: string }) {
  const [failed, setFailed] = useState(false);
  const photo = skill === "Tennis" ? templates.tennis
    : skill === "Photography" ? templates.photography
    : library.Programming.includes(skill) || library.Data.includes(skill) ? templates.programming
    : library.Music.includes(skill) || skill === "Music Production" ? templates.music
    : templates.learning;
  return <div className="skill-cover">
    {!failed && <img src={`/images/skills/${photo.file}.webp`} alt={photo.alt} width="1200" height="600" loading="lazy" decoding="async" style={{ objectPosition: photo.position }} onError={() => setFailed(true)} />}
    <div className="skill-cover-shade" aria-hidden="true" />
    <span className="skill-cover-label">{skill}</span>
    <span className="skill-cover-template">Template photo</span>
  </div>;
}
