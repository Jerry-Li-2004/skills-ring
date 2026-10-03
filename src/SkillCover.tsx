import { library } from "./domain";

import programmingPhoto from "./assets/skill-covers/programming.webp";
import tennisPhoto from "./assets/skill-covers/tennis.webp";
import photographyPhoto from "./assets/skill-covers/photography.webp";
import musicPhoto from "./assets/skill-covers/music.webp";
import learningPhoto from "./assets/skill-covers/learning.webp";

const photos = {
  programming: { src: programmingPhoto, alt: "A laptop displaying code in a bright workspace", position: "center 52%" },
  tennis: { src: tennisPhoto, alt: "A tennis racket and ball on a green court", position: "center 53%" },
  photography: { src: photographyPhoto, alt: "A camera held outdoors, ready to take a photograph", position: "center 53%" },
  music: { src: musicPhoto, alt: "An acoustic guitar beside a recording microphone", position: "center 48%" },
  learning: { src: learningPhoto, alt: "An open notebook, pencil, and cup of coffee", position: "center 55%" },
};

export function SkillCover({ skill }: { skill: string }) {
  const photo = skill === "Tennis" ? photos.tennis
    : skill === "Photography" ? photos.photography
    : library.Programming.includes(skill) || library.Data.includes(skill) ? photos.programming
    : library.Music.includes(skill) || skill === "Music Production" ? photos.music
    : photos.learning;
  return <div className="skill-cover">
    <img src={photo.src} alt={photo.alt} width="1200" height="600" loading="lazy" decoding="async" style={{ objectPosition: photo.position }} />
    <div className="skill-cover-shade" aria-hidden="true" />
    <span className="skill-cover-label">{skill}</span>
  </div>;
}
