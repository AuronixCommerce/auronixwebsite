"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import {
  ArrowUpRight,
  Captions,
  Clapperboard,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  AURONIX_OVERVIEW_VIDEO,
  OVERVIEW_CHAPTERS,
  videoTimestamp,
} from "@/lib/auronix-video-guide";

type MobileVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
import "./video-guide.css";
type VideoGuideProps = {
  src?: string; title?: string; poster?: string; initialDuration?: number;
  chapters?: ReadonlyArray<{start: number; title: string}>;
  captionSrc?: string | null; chapterTrackSrc?: string | null; note?: string;
};
export function AuronixVideoGuide({src = AURONIX_OVERVIEW_VIDEO, title = "The Auronix overview", poster = "/guides/auronix-overview.jpg", initialDuration = 120, chapters = OVERVIEW_CHAPTERS, captionSrc = "/guides/auronix-overview.en.vtt", chapterTrackSrc = "/guides/auronix-overview.chapters.vtt", note = "Some views in the overview are illustrative."}: VideoGuideProps) {
  const id = useId();
  const video = useRef<MobileVideo>(null),
    screen = useRef<HTMLDivElement>(null),
    pendingSeek = useRef<number | null>(null);
  const [enhanced, setEnhanced] = useState(false),
    [active, setActive] = useState(-1),
    [error, setError] = useState("");
  const [playing, setPlaying] = useState(false),
    [waiting, setWaiting] = useState(false),
    [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0),
    [duration, setDuration] = useState(initialDuration),
    [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1),
    [muted, setMuted] = useState(false),
    [captions, setCaptions] = useState(Boolean(captionSrc)),
    [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false),
    [canFullscreen, setCanFullscreen] = useState(false);
  useEffect(() => {
    setEnhanced(true);
    setCanFullscreen(
      Boolean(
        document.fullscreenEnabled || video.current?.webkitEnterFullscreen,
      ),
    );
    const sync = () =>
      setFullscreen(document.fullscreenElement === screen.current);
    const begin = () => setFullscreen(true),
      end = () => setFullscreen(false);
    const player = video.current;
    document.addEventListener("fullscreenchange", sync);
    player?.addEventListener("webkitbeginfullscreen", begin);
    player?.addEventListener("webkitendfullscreen", end);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      player?.removeEventListener("webkitbeginfullscreen", begin);
      player?.removeEventListener("webkitendfullscreen", end);
    };
  }, []);
  function markChapter() {
    const current = video.current?.currentTime || 0;
    setTime(current);
    setActive(
      chapters.reduce(
        (index, chapter, i) => (current >= chapter.start ? i : index),
        0,
      ),
    );
  }
  function syncBuffer() {
    const player = video.current;
    if (!player || !player.duration || !player.buffered.length) return;
    let end = 0;
    for (let i = 0; i < player.buffered.length; i++)
      if (player.buffered.start(i) <= player.currentTime)
        end = player.buffered.end(i);
    setBuffered(Math.min(100, (end / player.duration) * 100));
  }
  function syncCaptions(enabled: boolean) {
    const tracks = video.current?.textTracks;
    if (tracks)
      for (let i = 0; i < tracks.length; i++)
        if (tracks[i].kind === "captions")
          tracks[i].mode = enabled ? "showing" : "disabled";
  }
  function seek(seconds: number) {
    const player = video.current;
    if (!player) return;
    const next = Math.max(0, Math.min(duration, seconds));
    setTime(next);
    setEnded(false);
    if (player.readyState < 1) {
      pendingSeek.current = next;
      player.load();
    } else {
      player.currentTime = next;
      markChapter();
    }
  }
  async function play() {
    const player = video.current;
    if (!player) return;
    setError("");
    try {
      await player.play();
    } catch {
      setWaiting(false);
      setError("Press play to continue, or open the video directly below.");
    }
  }
  function togglePlayback() {
    const player = video.current;
    if (!player) return;
    if (player.paused) {
      if (player.ended) seek(0);
      void play();
    } else player.pause();
  }
  function jump(seconds: number) {
    seek(seconds);
    void play();
  }
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (screen.current?.requestFullscreen && document.fullscreenEnabled)
        await screen.current.requestFullscreen();
      else video.current?.webkitEnterFullscreen?.();
    } catch {
      setError(
        "Fullscreen is unavailable here. You can open the video directly below.",
      );
    }
  }
  function shortcuts(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget && event.target !== video.current)
      return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if ([" ", "k", "arrowleft", "arrowright", "m", "c", "f"].includes(key))
      event.preventDefault();
    if (key === " " || key === "k") togglePlayback();
    if (key === "arrowleft") seek(time - 10);
    if (key === "arrowright") seek(time + 10);
    if (key === "m" && video.current)
      video.current.muted = !video.current.muted;
    if (key === "c" && captionSrc) {
      syncCaptions(!captions);
      setCaptions(!captions);
    }
    if (key === "f" && canFullscreen) void toggleFullscreen();
  }
  const progress = Math.min(100, (time / duration) * 100);
  return (
    <section
      className="av-guide-player"
      aria-labelledby={`${id}-title`}
    >
      <div className="av-guide-player-heading">
        <div>
          <Clapperboard size={17} />
          <h2 id={`${id}-title`}>{title}</h2>
        </div>
        <span>
          {videoTimestamp(initialDuration)} <i /> {captionSrc ? "English captions" : "Captions included"}
        </span>
      </div>
      <div className={`av-guide-player-grid${chapters.length ? "" : " av-guide-player-solo"}`}>
        <div
          className="av-guide-screen"
          ref={screen}
          tabIndex={0}
          onKeyDown={shortcuts}
          aria-label="Video player. Space to play, arrows to seek, M to mute, F for fullscreen."
        >
          <div className="av-video-stage">
            <video
              ref={video}
              controls={!enhanced}
              playsInline
              preload="metadata"
              poster={poster}
              aria-label={title}
              aria-describedby={`${id}-description`}
              onClick={enhanced ? togglePlayback : undefined}
              onPlay={() => {
                setPlaying(true);
                setEnded(false);
                setError("");
                markChapter();
              }}
              onPlaying={() => setWaiting(false)}
              onWaiting={() => setWaiting(true)}
              onSeeking={() => setWaiting(true)}
              onSeeked={() => {
                setWaiting(false);
                markChapter();
                syncBuffer();
              }}
              onPause={() => {
                setPlaying(false);
                setWaiting(false);
              }}
              onEnded={() => {
                setPlaying(false);
                setWaiting(false);
                setEnded(true);
              }}
              onTimeUpdate={() => {
                markChapter();
                syncBuffer();
              }}
              onProgress={syncBuffer}
              onVolumeChange={() => {
                if (video.current) {
                  setVolume(video.current.volume);
                  setMuted(video.current.muted);
                }
              }}
              onRateChange={() => setRate(video.current?.playbackRate || 1)}
              onError={() => {
                setWaiting(false);
                setError(
                  "The video could not load. You can open it directly or read the transcript below.",
                );
              }}
              onLoadedMetadata={() => {
                const player = video.current;
                if (!player) return;
                if (Number.isFinite(player.duration) && player.duration > 0)
                  setDuration(player.duration);
                syncCaptions(captions);
                if (pendingSeek.current !== null) {
                  player.currentTime = pendingSeek.current;
                  pendingSeek.current = null;
                  markChapter();
                }
              }}
            >
              <source src={src} />
              {captionSrc && <track kind="captions" src={captionSrc} srcLang="en" label="English" default onLoad={() => syncCaptions(captions)} />}
              {chapterTrackSrc && <track kind="chapters" src={chapterTrackSrc} srcLang="en" label="Chapters" />}
              Your browser cannot play this video. Use the direct video link
              below.
            </video>
          </div>
          {enhanced && (
            <div
              className="av-video-controls"
              role="group"
              aria-label="Video controls"
            >
              <div
                className="av-video-timeline"
                style={
                  {
                    "--av-played": `${progress}%`,
                    "--av-buffered": `${buffered}%`,
                  } as CSSProperties
                }
              >
                <div className="av-video-rail" aria-hidden="true">
                  <span />
                  <i />
                  {chapters.slice(1).map((chapter) => (
                    <b
                      key={chapter.start}
                      style={{ left: `${(chapter.start / duration) * 100}%` }}
                    />
                  ))}
                </div>
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="0.1"
                  value={time}
                  aria-label="Seek video"
                  aria-valuetext={`${videoTimestamp(time)} of ${videoTimestamp(duration)}`}
                  onChange={(event) => seek(Number(event.target.value))}
                />
              </div>
              <div className="av-video-toolbar">
                <div className="av-video-control-group">
                  <button
                    type="button"
                    className="av-video-play-toggle"
                    onClick={togglePlayback}
                    aria-label={
                      playing
                        ? "Pause video"
                        : ended
                          ? "Replay video"
                          : "Play video"
                    }
                    title="Play / pause (Space)"
                  >
                    {playing ? (
                      <Pause size={18} fill="currentColor" />
                    ) : ended ? (
                      <RotateCcw size={18} />
                    ) : (
                      <Play size={18} fill="currentColor" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="av-video-skip"
                    onClick={() => seek(time - 10)}
                    aria-label="Back 10 seconds"
                    title="Back 10 seconds"
                  >
                    <SkipBack size={16} />
                    <small>10</small>
                  </button>
                  <button
                    type="button"
                    className="av-video-skip"
                    onClick={() => seek(time + 10)}
                    aria-label="Forward 10 seconds"
                    title="Forward 10 seconds"
                  >
                    <SkipForward size={16} />
                    <small>10</small>
                  </button>
                  <span className="av-video-time">
                    {videoTimestamp(time)}
                    <span>/ {videoTimestamp(duration)}</span>
                  </span>
                </div>
                <div className="av-video-control-group av-video-options">
                  <div className="av-video-volume">
                    <button
                      type="button"
                      onClick={() => {
                        if (video.current) video.current.muted = !muted;
                      }}
                      aria-label={
                        muted || volume === 0 ? "Unmute video" : "Mute video"
                      }
                      title="Mute (M)"
                    >
                      {muted || volume === 0 ? (
                        <VolumeX size={18} />
                      ) : (
                        <Volume2 size={18} />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={muted ? 0 : volume}
                      aria-label="Volume"
                      aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)} percent`}
                      onChange={(event) => {
                        if (video.current) {
                          video.current.volume = Number(event.target.value);
                          video.current.muted = false;
                        }
                      }}
                    />
                  </div>
                  {captionSrc && <button
                    type="button"
                    className={captions ? "is-active" : ""}
                    onClick={() => {
                      syncCaptions(!captions);
                      setCaptions(!captions);
                    }}
                    aria-label="English captions"
                    aria-pressed={captions}
                    title="Captions (C)"
                  >
                    <Captions size={19} />
                  </button>}
                  <label className="av-video-speed">
                    <span className="sr-only">Playback speed</span>
                    <select
                      aria-label="Playback speed"
                      value={rate}
                      onChange={(event) => {
                        if (video.current)
                          video.current.playbackRate = Number(
                            event.target.value,
                          );
                      }}
                    >
                      {[0.75, 1, 1.25, 1.5, 2].map((speed) => (
                        <option key={speed} value={speed}>
                          {speed}×
                        </option>
                      ))}
                    </select>
                  </label>
                  {canFullscreen && (
                    <button
                      type="button"
                      onClick={() => void toggleFullscreen()}
                      aria-label={
                        fullscreen ? "Exit fullscreen" : "Enter fullscreen"
                      }
                      title="Fullscreen (F)"
                    >
                      {fullscreen ? (
                        <Minimize size={18} />
                      ) : (
                        <Maximize size={18} />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
          <div className="av-guide-playing" aria-live="polite">
            <span className={playing ? "is-playing" : ""} />
            {waiting ? "Loading video…" : active >= 0 && chapters[active]
              ? `${ended ? "Finished" : playing ? "Playing" : "Paused"} · ${chapters[active].title}`
              : `${playing ? "Playing" : "Press play to watch"} · ${title}`}
          </div>
        </div>
        {chapters.length > 0 && <nav className="av-guide-chapters" aria-label="Video chapters">
          <div>
            <span>IN THIS VIDEO</span>
            <p>Jump to what matters.</p>
          </div>
          <ol>
            {chapters.map((chapter, index) => (
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
        </nav>}
      </div>
      <div className="av-guide-player-footer">
        <p id={`${id}-description`}>{note}</p>
        <a
          href={src}
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
