import React, { useState, useEffect, useRef } from "react";

export default function StoryAudioTrimmer({ song, onRemove, onTimeChange }) {
  const [durationLimit, setDurationLimit] = useState(15); // 15s, 30s, 45s, 60s
  const [startTime, setStartTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const audioRef = useRef(null);

  // Audio metadata load hone par total duration calculate karein
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setTotalDuration(Math.floor(audioRef.current.duration) || 180);
    }
  };

  // Continuous looping between startTime and startTime + durationLimit
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const maxEnd = startTime + durationLimit;

    if (current >= maxEnd || current < startTime) {
      audioRef.current.currentTime = startTime;
      audioRef.current.play().catch(() => {});
    }
  };

  // Duration ya Start time change hone par audio seek karein
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = startTime;
      if (isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
    if (onTimeChange) {
      onTimeChange({ startTime, durationLimit });
    }
  }, [startTime, durationLimit]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!song) return null;

  return (
    <div style={styles.container}>
      {/* Background Audio Engine */}
      <audio
        ref={audioRef}
        src={song.audioUrl}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        autoPlay
      />

      {/* Top Floating Instagram Music Sticker */}
      <div style={styles.sticker}>
        <img src={song.image} alt="art" style={styles.stickerThumb} />
        <div style={styles.stickerMeta}>
          <div style={styles.stickerTitle}>{song.title}</div>
          <div style={styles.stickerArtist}>{song.artist}</div>
        </div>
        <button type="button" onClick={onRemove} style={styles.removeBtn} title="Remove Music">
          &times;
        </button>
      </div>

      {/* Bottom Instagram Trimmer Control Card */}
      <div style={styles.trimmerCard}>
        {/* Duration selector chips (15s, 30s, 45s, 60s) */}
        <div style={styles.chipRow}>
          {[15, 30, 45, 60].map((dur) => (
            <button
              key={dur}
              type="button"
              onClick={() => setDurationLimit(dur)}
              style={{
                ...styles.chipBtn,
                background: durationLimit === dur ? "#9d4edd" : "rgba(255, 255, 255, 0.12)",
                color: durationLimit === dur ? "#fff" : "#ccc",
                border: durationLimit === dur ? "1px solid #c77dff" : "1px solid rgba(255, 255, 255, 0.15)"
              }}
            >
              {dur}s
            </button>
          ))}
        </div>

        {/* Scrubber & Time Range Selector */}
        <div style={styles.sliderRow}>
          <button type="button" onClick={togglePlay} style={styles.playPauseBtn}>
            {isPlaying ? "⏸" : "▶"}
          </button>

          <div style={styles.sliderContainer}>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalDuration - durationLimit)}
              value={startTime}
              onChange={(e) => setStartTime(Number(e.target.value))}
              style={styles.rangeInput}
            />
            <div style={styles.timeLabels}>
              <span>{formatTime(startTime)}</span>
              <span>{formatTime(startTime + durationLimit)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    zIndex: 40,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "16px"
  },
  sticker: {
    pointerEvents: "auto",
    margin: "10px auto 0 auto",
    background: "rgba(18, 2, 36, 0.8)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    padding: "6px 12px 6px 6px",
    borderRadius: "30px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#fff",
    maxWidth: "85%",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
  },
  stickerThumb: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    objectFit: "cover"
  },
  stickerMeta: {
    flex: 1,
    overflow: "hidden",
    whiteSpace: "nowrap"
  },
  stickerTitle: {
    fontSize: "13px",
    fontWeight: "700",
    textOverflow: "ellipsis",
    overflow: "hidden"
  },
  stickerArtist: {
    fontSize: "11px",
    color: "#c77dff",
    textOverflow: "ellipsis",
    overflow: "hidden"
  },
  removeBtn: {
    background: "rgba(255, 255, 255, 0.15)",
    border: "none",
    color: "#fff",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  trimmerCard: {
    pointerEvents: "auto",
    background: "rgba(25, 5, 43, 0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "20px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    boxShadow: "0 -4px 30px rgba(0,0,0,0.6)"
  },
  chipRow: {
    display: "flex",
    justifyContent: "center",
    gap: "10px"
  },
  chipBtn: {
    padding: "6px 14px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  sliderRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  playPauseBtn: {
    background: "linear-gradient(135deg, #9d4edd, #7b2cbf)",
    border: "none",
    color: "#fff",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  sliderContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  rangeInput: {
    width: "100%",
    accentColor: "#c77dff",
    cursor: "pointer"
  },
  timeLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "11px",
    color: "#c77dff",
    fontWeight: "600"
  }
};