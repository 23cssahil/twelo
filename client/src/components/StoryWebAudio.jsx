import React, { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';

const audioBufferCache = new Map(); // Cache audio buffers by URL to avoid re-downloading

const StoryWebAudio = forwardRef(({ story, isActiveSlide, storyPaused }, ref) => {
  const ctxRef = useRef(null);
  const sourceRef = useRef(null);
  const gainNodeRef = useRef(null);
  const rafRef = useRef(null);
  const [buffer, setBuffer] = useState(null);

  const url = story?.song?.audioUrl || story?.songUrl;
  const startTime = story?.song?.startTime || 0;
  const duration = story?.song?.duration || 15;

  // State to track playback
  const isPlayingRef = useRef(false);
  const currentOffsetRef = useRef(startTime); // The logical time in the song
  const startedAtRef = useRef(0); // The AudioContext time when play() was called

  // 1. Initialize Audio Context and Fetch/Decode Audio
  useEffect(() => {
    if (!url) return;
    
    // Setup context
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      gainNodeRef.current = ctxRef.current.createGain();
      gainNodeRef.current.connect(ctxRef.current.destination);
    }

    const loadAudio = async () => {
      if (audioBufferCache.has(url)) {
        setBuffer(audioBufferCache.get(url));
        return;
      }
      try {
        const res = await fetch(url);
        const arrayBuffer = await res.arrayBuffer();
        const decoded = await ctxRef.current.decodeAudioData(arrayBuffer);
        audioBufferCache.set(url, decoded);
        setBuffer(decoded);
      } catch (err) {
        console.error("StoryWebAudio load error", err);
      }
    };
    
    loadAudio();
    
    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current.disconnect();
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        ctxRef.current.close().catch(() => {});
      }
    };
  }, [url]);

  // 2. Play / Pause logic
  const play = () => {
    if (!buffer || !ctxRef.current) return Promise.resolve();
    if (isPlayingRef.current) return Promise.resolve();
    
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }

    sourceRef.current = ctxRef.current.createBufferSource();
    sourceRef.current.buffer = buffer;
    sourceRef.current.connect(gainNodeRef.current);

    sourceRef.current.loop = true;
    sourceRef.current.loopStart = startTime;
    sourceRef.current.loopEnd = startTime + duration;

    // Check bounds
    if (currentOffsetRef.current < startTime || currentOffsetRef.current >= startTime + duration) {
      currentOffsetRef.current = startTime;
    }

    startedAtRef.current = ctxRef.current.currentTime;
    const startOffset = currentOffsetRef.current;
    
    sourceRef.current.start(0, startOffset);
    isPlayingRef.current = true;

    // Time update loop
    const updateLoop = () => {
      if (isPlayingRef.current && ctxRef.current) {
        const elapsed = ctxRef.current.currentTime - startedAtRef.current;
        let newCurrentTime = startOffset + elapsed;
        
        // Handle looping manually for time reporting
        if (newCurrentTime >= startTime + duration) {
            const over = (newCurrentTime - startTime) % duration;
            newCurrentTime = startTime + over;
            // update startedAtRef to reset elapsed calculation for correct reporting
            startedAtRef.current = ctxRef.current.currentTime - over;
        }

        currentOffsetRef.current = newCurrentTime;
        rafRef.current = requestAnimationFrame(updateLoop);
      }
    };
    rafRef.current = requestAnimationFrame(updateLoop);
    
    return Promise.resolve();
  };

  const pause = () => {
    if (!isPlayingRef.current) return;
    isPlayingRef.current = false;
    
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // ignore if already stopped
      }
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  };

  // 3. Expose imperative methods to parent (localAudioRef)
  useImperativeHandle(ref, () => ({
    play: () => play(),
    pause: () => pause(),
    get currentTime() {
      return currentOffsetRef.current;
    },
    set currentTime(val) {
      currentOffsetRef.current = val;
      if (isPlayingRef.current) {
        pause();
        play();
      }
    }
  }), [buffer, startTime, duration]); // dependencies to re-bind if they change

  return null; // Invisible, pure Web Audio API
});

export default StoryWebAudio;
