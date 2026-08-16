import React, { useState, useEffect, useRef } from "react";

const API_HOST = "https://jiosaavn-api-mwqy.onrender.com";

export default function StoryMusicModal({ isOpen, onClose, onSelectSong }) {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState(null);

  const previewAudioRef = useRef(new Audio());
  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchMusic("Trending Bollywood");
    } else {
      previewAudioRef.current.pause();
      setPlayingUrl(null);
    }
  }, [isOpen]);

  const fetchMusic = async (searchQuery) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_HOST}/api/search/songs?query=${encodeURIComponent(searchQuery)}`);
      const json = await res.json();
      if (json?.data?.results?.length > 0) {
        setSongs(json.data.results);
      } else {
        setSongs([]);
      }
    } catch (err) {
      console.error("Music Fetch Error:", err);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      if (val.trim()) {
        fetchMusic(val);
      } else {
        fetchMusic("Trending Bollywood");
      }
    }, 400);
  };

  const handleTogglePreview = (audioUrl) => {
    if (playingUrl === audioUrl) {
      previewAudioRef.current.pause();
      setPlayingUrl(null);
    } else {
      previewAudioRef.current.src = audioUrl;
      previewAudioRef.current.play().catch(() => {});
      setPlayingUrl(audioUrl);

      previewAudioRef.current.onended = () => {
        setPlayingUrl(null);
      };
    }
  };

  const handleSelectSong = (track) => {
    previewAudioRef.current.pause();
    setPlayingUrl(null);

    const title = track.name;
    const artist = track.artists?.primary?.[0]?.name || "Unknown Artist";
    const image = track.image?.find((i) => i.quality === "150x150")?.url || track.image?.[0]?.url || "";
    const audioUrl = track.downloadUrl?.find((d) => d.quality === "320kbps")?.url || track.downloadUrl?.[0]?.url || "";

    onSelectSong({ title, artist, image, audioUrl });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <div style={styles.handle} />

        {/* Top Header */}
        <div style={styles.header}>
          <span style={styles.title}>Select Music</span>
          <button style={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>

        {/* Search Bar */}
        <div style={styles.searchWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search Hindi, English, Punjabi songs..."
            style={styles.searchInput}
            autoFocus
          />
        </div>

        {/* Songs List */}
        <div style={styles.scrollList}>
          {loading ? (
            <div style={styles.statusText}>Searching songs...</div>
          ) : songs.length > 0 ? (
            songs.map((track) => {
              const image = track.image?.find((i) => i.quality === "150x150")?.url || track.image?.[0]?.url || "";
              const audioUrl = track.downloadUrl?.find((d) => d.quality === "320kbps")?.url || track.downloadUrl?.[0]?.url || "";
              const artist = track.artists?.primary?.[0]?.name || "Unknown Artist";
              const isPlaying = playingUrl === audioUrl;

              return (
                <div key={track.id} style={styles.songRow}>
                  <img src={image} alt="art" style={styles.thumb} />
                  <div style={styles.meta}>
                    <div style={styles.songName}>{track.name}</div>
                    <div style={styles.artistName}>{artist}</div>
                  </div>
                  <div style={styles.actions}>
                    <button
                      style={{ ...styles.playBtn, background: isPlaying ? "#7b2cbf" : "#3c096c" }}
                      onClick={() => handleTogglePreview(audioUrl)}
                    >
                      {isPlaying ? "⏸" : "▶"}
                    </button>
                    <button style={styles.addBtn} onClick={() => handleSelectSong(track)}>
                      Add
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={styles.statusText}>No songs found. Try another search.</div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    zIndex: 99999,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  sheet: {
    background: "#19052b",
    borderRadius: "26px 26px 0 0",
    borderTop: "1px solid rgba(255, 255, 255, 0.15)",
    height: "82%",
    maxHeight: "560px",
    display: "flex",
    flexDirection: "column",
    padding: "16px 16px 8px 16px",
    boxShadow: "0 -10px 40px rgba(0, 0, 0, 0.8)"
  },
  handle: {
    width: "36px",
    height: "4px",
    background: "rgba(255, 255, 255, 0.3)",
    borderRadius: "4px",
    margin: "0 auto 12px auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
    color: "#fff"
  },
  title: {
    fontSize: "16px",
    fontWeight: "700"
  },
  closeBtn: {
    background: "rgba(255, 255, 255, 0.1)",
    border: "none",
    color: "#fff",
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "18px"
  },
  searchWrapper: {
    position: "relative",
    marginBottom: "12px"
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "14px",
    opacity: 0.6
  },
  searchInput: {
    width: "100%",
    background: "#2b0c48",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    padding: "12px 16px 12px 38px",
    borderRadius: "14px",
    color: "#fff",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box"
  },
  scrollList: {
    flex: 1,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  songRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px",
    borderRadius: "14px",
    background: "rgba(255, 255, 255, 0.03)",
    border: "1px solid rgba(255, 255, 255, 0.05)",
    color: "#fff"
  },
  thumb: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    objectFit: "cover"
  },
  meta: {
    flex: 1,
    overflow: "hidden"
  },
  songName: {
    fontSize: "14px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  artistName: {
    fontSize: "12px",
    color: "#c77dff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginTop: "2px"
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  playBtn: {
    border: "1px solid rgba(255, 255, 255, 0.2)",
    color: "#fff",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  addBtn: {
    background: "linear-gradient(135deg, #9d4edd, #7b2cbf)",
    border: "none",
    color: "#fff",
    padding: "8px 14px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer"
  },
  statusText: {
    textAlign: "center",
    color: "#c77dff",
    fontSize: "13px",
    marginTop: "30px"
  }
};