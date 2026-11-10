"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, Clapperboard, Play } from "lucide-react";
import {
  AURONIX_OVERVIEW_VIDEO,
  OVERVIEW_CHAPTERS,
  videoTimestamp,
} from "@/lib/auronix-video-guide";
export function AuronixVideoGuide() {
  const video = useRef<HTMLVideoElement>(null),
    pendingSeek = useRef<number | null>(null);
  const [active, setActive] = useState(-1),
    [error, setError] = useState(""),
    [playing, setPlaying] = useState(false);
  function jump(seconds: number) {
    const player = video.current;
    if (!player) return;
    setError("");
    if (player.readyState < 1) {
      pendingSeek.current = seconds;
      player.load();
    } else player.currentTime = seconds;
    void player
      .play()
      .catch(() =>
        setError("Press play to continue, or open the video directly below."),
      );
  }
  function markChapter() {
    const time = video.current?.currentTime || 0;
    const index = OVERVIEW_CHAPTERS.reduce(
      (current, chapter, i) => (time >= chapter.start ? i : current),
      0,
    );
    setActive(index);
  }
  return (
    <section
      className="av-guide-player"
      aria-labelledby="overview-player-title"
    >
      <div className="av-guide-player-heading">
        <div>
          <Clapperboard size={17} />
          <h2 id="overview-player-title">The Auronix overview</h2>
        </div>
        <span>
          02:00 <i /> English captions
        </span>
      </div>
      <div className="av-guide-player-grid">
        <div className="av-guide-screen">
          <video
            ref={video}
            controls
            playsInline
            preload="metadata"
            poster="/guides/auronix-overview.jpg"
            aria-label="Auronix Commerce and AIO video overview"
            aria-describedby="overview-video-description"
            onPlay={() => {
              setPlaying(true);
              setError("");
              markChapter();
            }}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={markChapter}
            onError={() =>
              setError(
                "The video could not load. You can open it directly or read the transcript below.",
              )
            }
            onLoadedMetadata={() => {
              if (pendingSeek.current !== null && video.current) {
                video.current.currentTime = pendingSeek.current;
                pendingSeek.current = null;
                markChapter();
              }
            }}
          >
            <source src={AURONIX_OVERVIEW_VIDEO} type="video/mp4" />
            <track
              kind="captions"
              src="/guides/auronix-overview.en.vtt"
              srcLang="en"
              label="English"
              default
            />
            <track
              kind="chapters"
              src="/guides/auronix-overview.chapters.vtt"
              srcLang="en"
              label="Chapters"
            />
            Your browser cannot play this video. Use the direct video link
            below.
          </video>
          <div className="av-guide-playing" aria-live="polite">
            <span className={playing ? "is-playing" : ""} />
            {active >= 0
              ? `${playing ? "Playing" : "Paused"} · ${OVERVIEW_CHAPTERS[active].title}`
              : "A quick introduction to commerce, AIO, and your next step."}
          </div>
        </div>
        <nav className="av-guide-chapters" aria-label="Video chapters">
          <div>
            <span>IN THIS VIDEO</span>
            <p>Jump to what matters.</p>
          </div>
          <ol>
            {OVERVIEW_CHAPTERS.map((chapter, index) => (
              <li key={chapter.start}>
                <button
                  type="button"
                  onClick={() => jump(chapter.start)}
                  aria-current={index === active ? "true" : undefined}
                  aria-label={`Play ${chapter.title} at ${videoTimestamp(chapter.start)}`}
                >
                  <span className="av-guide-chapter-time">
                    {videoTimestamp(chapter.start)}
                  </span>
                  <span>{chapter.title}</span>
                  <Play size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="av-guide-player-footer">
        <p id="overview-video-description">
          Use the player controls for captions, volume, and fullscreen. Some
          views in the overview are illustrative.
        </p>
        <a
          href={AURONIX_OVERVIEW_VIDEO}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open video <ArrowUpRight size={13} />
        </a>
      </div>
      {error && (
        <p className="av-guide-video-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
