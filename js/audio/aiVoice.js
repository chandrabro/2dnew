// Built-in AI voices ("neural text-to-speech") that run entirely in the browser – free, no API key.
//
// Engine: Piper voices through the open-source `vits-web` library (ONNX Runtime / WebAssembly).
//   * the library and the voice models are downloaded from public CDNs the first time they are used
//     (about 60 MB per voice) and cached by the browser afterwards;
//   * every generated line is stored as a normal audio clip, so it is included in EVERY export
//     (fast MP4, WebM, live) exactly like an uploaded voice.
//
// To self-host or pin a different build, change LIB_URLS below.


export const LIB_URLS = [
  'https://cdn.jsdelivr.net/npm/@diffusionstudio/vits-web@1/+esm',
  'https://esm.sh/@diffusionstudio/vits-web@1',
];

/** Curated Piper voices (ids from the public rhasspy/piper-voices catalogue). `gender` is only used for suggestions. */
export const CURATED_VOICES = [
  { id: 'en_US-hfc_male-medium', label: 'English (US) – Male, clear', lang: 'en', gender: 'male' },
  { id: 'en_US-hfc_female-medium', label: 'English (US) – Female, clear', lang: 'en', gender: 'female' },
  { id: 'en_US-joe-medium', label: 'English (US) – Joe, male', lang: 'en', gender: 'male' },
  { id: 'en_US-ryan-medium', label: 'English (US) – Ryan, male', lang: 'en', gender: 'male' },
  { id: 'en_US-amy-medium', label: 'English (US) – Amy, female', lang: 'en', gender: 'female' },
  { id: 'en_US-kristin-medium', label: 'English (US) – Kristin, female', lang: 'en', gender: 'female' },
  { id: 'en_US-lessac-medium', label: 'English (US) – Lessac, female', lang: 'en', gender: 'female' },
  { id: 'en_GB-alan-medium', label: 'English (UK) – Alan, male narrator', lang: 'en', gender: 'male' },
  { id: 'en_GB-northern_english_male-medium', label: 'English (UK) – Northern male', lang: 'en', gender: 'male' },
  { id: 'en_GB-jenny_dioco-medium', label: 'English (UK) – Jenny, female', lang: 'en', gender: 'female' },
  { id: 'en_GB-alba-medium', label: 'English (UK) – Alba, female', lang: 'en', gender: 'female' },
];
export const DEFAULT_AI_VOICES = { male: 'en_US-hfc_male-medium', female: 'en_US-hfc_female-medium', narrator: 'en_GB-alan-medium' };

let extraVoices = []; // filled by loadCatalog()
export function aiVoiceList() {
  const seen = new Set(CURATED_VOICES.map((v) => v.id));
  return [...CURATED_VOICES, ...extraVoices.filter((v) => !seen.has(v.id))];
}
export function aiVoiceLabel(id) { const v = aiVoiceList().find((x) => x.id === id); return v ? v.label : id || '(none)'; }

// ---------- library loading ----------
let libPromise = null;
export function loadLib() {
  if (!libPromise) {
    libPromise = (async () => {
      let lastErr;
      for (const url of LIB_URLS) {
        try { const m = await import(/* @vite-ignore */ url); const lib = m.predict ? m : (m.default && m.default.predict ? m.default : null); if (lib) return lib; lastErr = new Error('unexpected library format'); } catch (e) { lastErr = e; }
      }
      throw new Error('Could not load the AI voice engine (' + (lastErr && lastErr.message) + '). Check your internet connection – it is needed the first time.');
    })();
    libPromise.catch(() => { libPromise = null; });
  }
  return libPromise;
}

/** Fetch the full list of downloadable voices (all languages). Safe to call repeatedly. */
export async function loadCatalog() {
  let list = [];
  try {
    const lib = await loadLib();
    if (typeof lib.voices === 'function') list = await lib.voices();
  } catch (e) { /* fall through */ }
  if (!list || !list.length) {
    const r = await fetch('https://huggingface.co/rhasspy/piper-voices/resolve/main/voices.json');
    if (!r.ok) throw new Error('voice list unavailable');
    const obj = await r.json(); list = Object.values(obj);
  }
  extraVoices = list.filter((v) => !v.num_speakers || v.num_speakers <= 1).map((v) => {
    const id = v.key || v.id; const code = (v.language && (v.language.code || v.language)) || id.split('-')[0];
    const lname = (v.language && (v.language.name_english || v.language.name)) || code;
    return { id, label: `${lname} (${String(code).split('_')[1] || ''}) – ${v.name || id.split('-')[1]} · ${v.quality || ''}`.replace(' ()', ''), lang: String(code).split('_')[0], gender: 'unknown' };
  }).filter((v) => v.id);
  return aiVoiceList();
}

// ---------- synthesis ----------
let synthOverride = null; /** tests / custom engines: (text, voiceId, onProgress) => Promise<Blob> */
export function setSynthesizer(fn) { synthOverride = fn; }

const downloaded = new Set();
export async function prepareVoice(voiceId, onProgress) {
  if (synthOverride || downloaded.has(voiceId)) return;
  const lib = await loadLib();
  if (typeof lib.stored === 'function') { try { if ((await lib.stored()).includes(voiceId)) { downloaded.add(voiceId); return; } } catch (e) { /* ignore */ } }
  if (typeof lib.download === 'function') {
    await lib.download(voiceId, (p) => { if (onProgress && p && p.total) onProgress(p.loaded / p.total); });
  }
  downloaded.add(voiceId);
}
export async function synthesize(text, voiceId, onProgress) {
  if (synthOverride) return synthOverride(text, voiceId, onProgress);
  await prepareVoice(voiceId, onProgress);
  const lib = await loadLib();
  const wav = await lib.predict({ text, voiceId });
  if (!(wav instanceof Blob)) throw new Error('the voice engine returned no audio');
  return wav;
}

/** Fingerprint of what a clip was generated from – changes when the text or voice changes. */
export function aiKey(text, voiceId) { return voiceId + '|' + String(text || '').trim(); }

/** The AI voice id a dialog line uses: its own choice, else the project default for its speaker. */
export function resolveAiVoice(project, role, d) {
  return d.aiVoice || (project.aiVoices && project.aiVoices[role]) || DEFAULT_AI_VOICES[role] || DEFAULT_AI_VOICES.male;
}

export function ensureAiSettings(project) {
  project.voiceEngine ||= 'ai';
  project.aiVoices = { ...DEFAULT_AI_VOICES, ...(project.aiVoices || {}) };
  return project;
}
