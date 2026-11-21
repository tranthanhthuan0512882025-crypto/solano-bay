// All sound is synthesised with WebAudio — no audio files, no network.
// Engine hum, sirens, gunshots, punches, pickups and a lazy harbour-pad loop.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let musicTimer = null;
  let muted = false;
  let sirenOn = false;
  let sirenOscA = null;
  let sirenOscB = null;
  let sirenGain = null;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.value = vol || 0.3;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  /** A soft two-chord pad that loops while the game runs. */
  function startMusic() {
    if (!ensure() || musicTimer) return;
    const chords = [[220, 277, 330], [174, 220, 261], [196, 246, 293], [146, 220, 293]];
    let step = 0;
    const playChord = () => {
      if (muted) return;
      const chord = chords[step % chords.length];
      step += 1;
      for (const f of chord) tone(f, 3.6, 'triangle', 0.045);
    };
    playChord();
    musicTimer = window.setInterval(playChord, 3600);
  }

  function setEngine(on, speedRatio) {
    if (!ensure()) return;
    if (on && !muted) {
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 60;
        engineGain.gain.value = 0.0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speedRatio * 130;
      engineGain.gain.value = 0.05 + speedRatio * 0.05;
    } else if (engineOsc && engineGain) {
      engineGain.gain.value = 0;
    }
  }

  function setSiren(on) {
    if (on === sirenOn) return;
    sirenOn = on;
    if (!ensure()) return;
    if (on && !muted) {
      sirenOscA = ctx.createOscillator();
      sirenOscB = ctx.createOscillator();
      sirenGain = ctx.createGain();
      sirenOscA.type = 'sine';
      sirenOscB.type = 'sine';
      sirenOscA.frequency.value = 660;
      sirenOscB.frequency.value = 880;
      sirenGain.gain.value = 0.0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 1.4;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.035;
      lfo.connect(lfoGain);
      lfoGain.connect(sirenGain.gain);
      sirenGain.gain.value = 0.035;
      sirenOscA.connect(sirenGain);
      sirenOscB.connect(sirenGain);
      sirenGain.connect(master);
      sirenOscA.start();
      sirenOscB.start();
      lfo.start();
      sirenOscA._lfo = lfo;
    } else if (sirenOscA) {
      try {
        sirenOscA._lfo.stop();
        sirenOscA.stop();
        sirenOscB.stop();
      } catch { /* already stopped */ }
      sirenOscA = null;
      sirenOscB = null;
    }
  }

  return {
    unlock,
    startMusic,
    setEngine,
    setSiren,
    gunshot() { noise(0.14, 0.4, 2400); tone(180, 0.08, 'square', 0.12, 60); },
    punch() { noise(0.09, 0.3, 500); },
    pickup() { tone(880, 0.12, 'sine', 0.18); tone(1320, 0.18, 'sine', 0.14); },
    cash() { tone(1046, 0.1, 'triangle', 0.16); tone(1318, 0.1, 'triangle', 0.16); tone(1568, 0.22, 'triangle', 0.16); },
    missionDone() { [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'triangle', 0.18), i * 110)); },
    busted() { tone(220, 0.5, 'sawtooth', 0.2, 110); tone(165, 0.7, 'sawtooth', 0.2, 82); },
    horn() { tone(370, 0.18, 'square', 0.1); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (muted) setSiren(false);
      return muted;
    },
    isMuted() { return muted; },
  };
}
