import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Check, Play, Pause } from 'lucide-react';

// Instagram-style fullscreen music trimmer. Self-contained: owns its preview
// <audio>, playhead tracking and clip loop. Dashboard only passes settings +
// callbacks, so the trim screen can never "leak" into the story editor state.
//
// Scrub model (matches IG behaviour):
//  - While the finger drags, the song KEEPS PLAYING and follows the window with
//    throttled seeks (~every 120ms) — never stop/rewind races.
//  - The loop guard is suspended during the drag so nothing yanks currentTime.
//  - On release we snap to the exact chosen start and playback continues.
//  - The playhead is driven by requestAnimationFrame on a DOM ref, so audio
//    ticks cause ZERO React re-renders (that was the source of the lag).
export default function StoryMusicTrimmer({ song, settings, onSettingsChange, onBack, onDone }) {
  const audioRef = useRef(null);
  const playheadRef = useRef(null);
  const draggingRef = useRef(false);
  const scrubValRef = useRef(settings?.startTime || 0);
  const lastSeekAt = useRef(0);
  const rafRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  const duration = song?.duration || 120;
  const start = settings?.startTime || 0;
  const clipLen = settings?.durationLimit || 15;
  const maxStart = Math.max(0, duration - clipLen);
  const winLeft = (start / duration) * 100;
  const winWidth = Math.min(100, (clipLen / duration) * 100);

  // Latest settings for stable (subscribe-once) audio listeners.
  const liveRef = useRef({ start, clipLen, duration });
  liveRef.current = { start, clipLen, duration };

  // Deterministic pseudo-waveform (same song -> same bars, no audio decoding).
  const bars = useMemo(() => {
    const seedStr = song?.title || 'song';
    let s = 2166136261;
    for (let i = 0; i < seedStr.length; i++) { s ^= seedStr.charCodeAt(i); s = Math.imul(s, 16777619) >>> 0; }
    const out = [];
    for (let i = 0; i < 48; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      out.push(26 + (s / 4294967296) * 74);
    }
    return out;
  }, [song?.title]);

  const positionPlayhead = (a) => {
    const ph = playheadRef.current;
    if (!ph || !a) return;
    const dur = liveRef.current.duration;
    ph.style.left = `${Math.min(100, Math.max(0, (a.currentTime / dur) * 100))}%`;
  };

  // Drop OS-level media controls so the clip can't be resumed from the notification shade.
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = null;
      ['play', 'pause', 'seekbackward', 'seekforward', 'previoustrack', 'nexttrack'].forEach((h) => {
        try { navigator.mediaSession.setActionHandler(h, null); } catch (_) { /* noop */ }
      });
    }
  }, []);

  // Core audio wiring: attached once, reads settings via liveRef.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => {
      const { start: st, clipLen: du } = liveRef.current;
      // Loop the clip — but never fight the user's finger mid-drag.
      if (!draggingRef.current && (a.currentTime >= st + du || a.currentTime < st)) {
        a.currentTime = st;
      }
    };
    const startRaf = () => {
      if (rafRef.current) return;
      const loop = () => {
        positionPlayhead(a);
        rafRef.current = !a.paused ? requestAnimationFrame(loop) : 0;
      };
      rafRef.current = requestAnimationFrame(loop);
    };
    const stopRaf = () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };
    const onPlay = () => { setPlaying(true); startRaf(); };
    const onPause = () => { setPlaying(false); stopRaf(); };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    positionPlayhead(a);
    return () => { a.removeEventListener('timeupdate', onTime); a.removeEventListener('play', onPlay); a.removeEventListener('pause', onPause); stopRaf(); a.pause(); };
  }, []);

  // Global pointer-up ends the scrub: jump exactly to the chosen start and keep playing.
  useEffect(() => {
    const endDrag = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      const a = audioRef.current;
      if (a) {
        try { a.currentTime = scrubValRef.current; } catch (_) { /* noop */ }
        if (a.paused) a.play().catch(() => {});
      }
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    return () => { window.removeEventListener('pointerup', endDrag); window.removeEventListener('pointercancel', endDrag); };
  }, []);

  // Scrub: update window instantly (React), seek audio at most ~8x/sec so the
  // user HEARS the song continuously while sliding.
  const handleScrub = (val) => {
    onSettingsChange({ startTime: val });
    scrubValRef.current = val;
    const a = audioRef.current;
    if (!a) return;
    const now = performance.now();
    if (!draggingRef.current || now - lastSeekAt.current > 120) {
      lastSeekAt.current = now;
      try { a.currentTime = val; } catch (_) { /* noop */ }
      if (a.paused) a.play().catch(() => {});
    }
  };

  const pickDuration = (sec) => {
    const newStart = Math.min(start, Math.max(0, duration - sec));
    onSettingsChange({ durationLimit: sec, startTime: newStart });
    const a = audioRef.current;
    if (a) {
      try { a.currentTime = newStart; } catch (_) { /* noop */ }
      if (a.paused) a.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };

  const fmt = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="sm-trimmer">
      <style>{`
        .sm-trimmer { position: fixed; inset: 0; z-index: 99999; display: flex; flex-direction: column;
          background: radial-gradient(circle at 50% 12%, rgba(0,114,255,0.22), transparent 55%), #07080c;
          color: #fff; font-family: 'Inter', system-ui, sans-serif; padding: max(12px, env(safe-area-inset-top)) 18px calc(18px + env(safe-area-inset-bottom)); box-sizing: border-box; }
        .sm-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .sm-back { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.16); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; backdrop-filter: blur(8px); }
        .sm-back:active { transform: scale(.93); }
        .sm-head-title { font-size: .95rem; font-weight: 700; letter-spacing: .3px; }
        .sm-done { background: linear-gradient(135deg,#00c6ff,#0072ff); color: #fff; border: none; padding: 9px 20px; border-radius: 20px; font-weight: 700; font-size: .88rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 16px rgba(0,114,255,.45); }
        .sm-done:active { transform: scale(.96); }

        .sm-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; min-height: 0; }
        .sm-disc-wrap { position: relative; width: 176px; height: 176px; }
        .sm-disc-ring { position: absolute; inset: -6px; border-radius: 50%; background: conic-gradient(from 0deg, #00c6ff, #0072ff, #7b5cff, #00c6ff); -webkit-mask: radial-gradient(circle, transparent 86px, #000 87px); mask: radial-gradient(circle, transparent 86px, #000 87px); animation: sm-spin 6s linear infinite; opacity: .9; }
        .sm-disc-ring.paused { animation-play-state: paused; opacity: .35; }
        .sm-disc { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; border: 3px solid rgba(255,255,255,.85); box-shadow: 0 14px 44px rgba(0,0,0,.65); animation: sm-spin 16s linear infinite; }
        .sm-disc.paused { animation-play-state: paused; }
        .sm-disc img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .sm-hole { position: absolute; inset: 0; margin: auto; width: 18px; height: 18px; border-radius: 50%; background: #07080c; border: 3px solid rgba(255,255,255,.7); }
        @keyframes sm-spin { to { transform: rotate(360deg); } }
        .sm-song-title { margin: 0; font-size: 1.15rem; font-weight: 700; max-width: 86%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }
        .sm-song-artist { margin: 2px 0 0; color: rgba(255,255,255,.55); font-size: .88rem; max-width: 86%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; }

        .sm-panel { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 22px; padding: 16px; backdrop-filter: blur(14px); }
        .sm-times { display: flex; justify-content: space-between; align-items: center; color: rgba(255,255,255,.6); font-size: .76rem; font-weight: 600; margin-bottom: 10px; }
        .sm-times .sm-win { color: #7dd3fc; }
        .sm-wave-wrap { position: relative; height: 64px; border-radius: 12px; background: rgba(255,255,255,0.04); overflow: hidden; touch-action: none; }
        .sm-wave { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding: 0 3px; }
        .sm-bar { width: 3px; border-radius: 2px; background: rgba(255,255,255,.16); transition: background .12s ease; }
        .sm-bar.in { background: linear-gradient(180deg,#00c6ff,#0072ff); box-shadow: 0 0 6px rgba(0,140,255,.5); }
        .sm-window { position: absolute; top: 0; bottom: 0; border-left: 2.5px solid #fff; border-right: 2.5px solid #fff; background: rgba(255,255,255,.07); pointer-events: none; }
        .sm-handle { position: absolute; top: 50%; transform: translateY(-50%); width: 14px; height: 30px; border-radius: 7px; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.55); pointer-events: none; }
        .sm-handle.l { left: -8px; } .sm-handle.r { right: -8px; }
        .sm-playhead { position: absolute; top: 2px; bottom: 2px; width: 2px; background: #fff; box-shadow: 0 0 8px rgba(255,255,255,.9); pointer-events: none; }
        .sm-seek { position: absolute; inset: 0; width: 100%; opacity: 0; cursor: pointer; margin: 0; -webkit-appearance: none; appearance: none; }
        .sm-ctrls { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
        .sm-play-btn { width: 46px; height: 46px; border-radius: 50%; border: none; background: linear-gradient(135deg,#00c6ff,#0072ff); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 16px rgba(0,114,255,.5); flex-shrink: 0; }
        .sm-play-btn:active { transform: scale(.92); }
        .sm-durs { display: flex; gap: 6px; }
        .sm-dur-btn { padding: 7px 12px; border-radius: 14px; border: 1px solid rgba(255,255,255,.14); background: transparent; color: rgba(255,255,255,.6); font-size: .78rem; font-weight: 700; cursor: pointer; }
        .sm-dur-btn.active { background: rgba(0,198,255,.16); border-color: rgba(0,198,255,.55); color: #7dd3fc; }
      `}</style>

      {/* Top bar: back = cancel to song picker, Done = confirm */}
      <div className="sm-top">
        <button type="button" className="sm-back" onClick={onBack} aria-label="Back to song selection"><ArrowLeft size={20} /></button>
        <span className="sm-head-title">Trim music</span>
        <button type="button" className="sm-done" onClick={onDone}><Check size={16} /> Done</button>
      </div>

      {/* Artwork + track */}
      <div className="sm-center">
        <div className="sm-disc-wrap">
          <div className={`sm-disc-ring ${playing ? '' : 'paused'}`} />
          <div className={`sm-disc ${playing ? '' : 'paused'}`}>
            <img src={song?.image || 'https://placehold.co/150x150/111827/FFFFFF'} alt="album" />
            <div className="sm-hole" />
          </div>
        </div>
        <div>
          <h3 className="sm-song-title">{song?.title}</h3>
          <p className="sm-song-artist">{song?.artist}</p>
        </div>
      </div>

      {/* Waveform trim panel */}
      <div className="sm-panel">
        <div className="sm-times">
          <span>{fmt(start)}</span>
          <span className="sm-win">{clipLen}s clip</span>
          <span>{fmt(start + clipLen)} / {fmt(duration)}</span>
        </div>

        <div className="sm-wave-wrap">
          <div className="sm-wave" aria-hidden="true">
            {bars.map((h, i) => {
              const pct = (i / (bars.length - 1)) * 100;
              const inWin = pct >= winLeft - 0.8 && pct <= winLeft + winWidth + 0.8;
              return <div key={i} className={`sm-bar ${inWin ? 'in' : ''}`} style={{ height: `${h}%` }} />;
            })}
          </div>
          <div className="sm-window" style={{ left: `${winLeft}%`, width: `${winWidth}%` }}>
            <div className="sm-handle l" />
            <div className="sm-handle r" />
          </div>
          <div className="sm-playhead" ref={playheadRef} style={{ left: `${winLeft}%` }} />
          {/* Transparent drag/seek layer (accessible range input). */}
          <input
            className="sm-seek"
            type="range"
            min={0}
            max={maxStart}
            step={0.1}
            value={start}
            onPointerDown={() => { draggingRef.current = true; }}
            onChange={(e) => handleScrub(parseFloat(e.target.value))}
            aria-label="Song start position"
          />
        </div>

        <div className="sm-ctrls">
          <button type="button" className="sm-play-btn" onClick={togglePlay} aria-label={playing ? 'Pause preview' : 'Play preview'}>
            {playing ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>
          <div className="sm-durs">
            {[5, 10, 15, 30].map((sec) => (
              <button
                key={sec}
                type="button"
                className={`sm-dur-btn ${clipLen === sec ? 'active' : ''}`}
                onClick={() => pickDuration(sec)}
              >
                {sec}s
              </button>
            ))}
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={song?.audioUrl} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
}
