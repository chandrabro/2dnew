// Free browser text-to-speech via the Web Speech API (no API keys, no setup).
// Note: TTS audio cannot be captured by the offline MP4 export; use "Export (live, with tab audio)"
// or record your voice / upload a clip for exported speech.

export const ttsAvailable = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

let voicesCache = [];
export function getVoices() {
  if (!ttsAvailable()) return [];
  const v = speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}
if (ttsAvailable()) { getVoices(); speechSynthesis.addEventListener?.('voiceschanged', getVoices); }

export function findVoice(nameOrLang) {
  const voices = getVoices();
  if (!nameOrLang) return null;
  return voices.find((v) => v.name === nameOrLang) || voices.find((v) => v.lang === nameOrLang) || voices.find((v) => v.lang.startsWith(nameOrLang)) || null;
}

let current = null;
/** Speak text. Resolves when finished (or cancelled). Returns the utterance. */
export function speak(text, { voice, rate = 1, pitch = 1, volume = 1, onBoundary } = {}) {
  if (!ttsAvailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = findVoice(voice); if (v) u.voice = v;
    u.rate = rate; u.pitch = pitch; u.volume = volume;
    u.onend = () => { if (current === u) current = null; resolve(u); };
    u.onerror = () => { if (current === u) current = null; resolve(u); };
    if (onBoundary) u.onboundary = onBoundary;
    current = u;
    speechSynthesis.speak(u);
  });
}
export function cancel() { if (ttsAvailable()) { speechSynthesis.cancel(); current = null; } }
export function isSpeaking() { return ttsAvailable() && speechSynthesis.speaking; }

/** Measure the real spoken duration of a text (speaks silently). */
export async function measureDuration(text, opts = {}) {
  if (!ttsAvailable()) return null;
  cancel();
  const t0 = performance.now();
  let started = t0;
  await new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const v = findVoice(opts.voice); if (v) u.voice = v;
    u.rate = opts.rate || 1; u.pitch = opts.pitch || 1; u.volume = 0;
    u.onstart = () => { started = performance.now(); };
    u.onend = resolve; u.onerror = resolve;
    speechSynthesis.speak(u);
    setTimeout(resolve, 30000);
  });
  return Math.max(0.3, (performance.now() - started) / 1000);
}
