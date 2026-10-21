// Generates AI voice clips for every dialog line that uses the "AI voice" source,
// stores them in the audio store, and (optionally) re-times dialogs to the real voice length.

import { synthesize, aiKey, resolveAiVoice, prepareVoice } from './aiVoice.js';
import { roleOf } from './voices.js';
import { dialogDuration } from '../engine/renderer.js';
import { sequenceDialogs } from '../state.js';

const r2 = (v) => Math.round(v * 100) / 100;

/** Dialog lines whose clip is missing or out of date. */
export function pendingAiLines(project) {
  const out = [];
  project.scenes.forEach((sc, si) => sc.dialogs.forEach((d) => {
    if (d.source !== 'ai' || !d.text || !String(d.text).trim()) return;
    const voice = resolveAiVoice(project, roleOf(project, sc, d), d);
    if (!d.audioId || d.aiKey !== aiKey(d.text, voice)) out.push({ scene: sc, sceneIndex: si, dialog: d, voice });
  }));
  return out;
}
export function hasAiLines(project) { return project.scenes.some((s) => s.dialogs.some((d) => d.source === 'ai' && d.text)); }

/** Switch every browser-TTS dialog to the AI voice source. Returns how many lines changed. */
export function convertToAi(project) {
  let n = 0;
  for (const s of project.scenes) for (const d of s.dialogs) if (d.source === 'tts' && d.text) { d.source = 'ai'; n++; }
  project.voiceEngine = 'ai';
  return n;
}

/**
 * @param app  the app object (needs .project and .store)
 * @param opts { lines?: pending list, retime = true, onProgress({done,total,message,ratio}), signal }
 * @returns number of lines generated
 */
export async function generateAiVoices(app, { lines, retime = true, onProgress = () => {}, signal } = {}) {
  const p = app.project;
  const todo = lines || pendingAiLines(p);
  if (!todo.length) return 0;
  const cache = new Map(); // same text + voice -> one clip
  const voices = [...new Set(todo.map((t) => t.voice))];
  let done = 0; const total = todo.length;
  const touched = new Set();
  // 1) download voice models (shows progress the first time)
  for (let i = 0; i < voices.length; i++) {
    if (signal && signal.aborted) throw new Error('Cancelled');
    onProgress({ done, total, message: `Preparing voice ${i + 1}/${voices.length}…`, ratio: 0 });
    await prepareVoice(voices[i], (r) => onProgress({ done, total, message: `Downloading voice ${i + 1}/${voices.length}… ${Math.round(r * 100)}%`, ratio: 0 }));
  }
  // 2) synthesize
  for (const t of todo) {
    if (signal && signal.aborted) throw new Error('Cancelled');
    const { dialog: d, voice } = t;
    const key = aiKey(d.text, voice);
    onProgress({ done, total, message: `Generating voice ${done + 1}/${total}: “${d.text.slice(0, 40)}${d.text.length > 40 ? '…' : ''}”`, ratio: done / total });
    let clipId = cache.get(key);
    let dur;
    if (!clipId) {
      const blob = await synthesize(d.text, voice);
      const clip = await app.store.add(blob, `AI voice – ${d.text.slice(0, 24)}`);
      clipId = clip.id; cache.set(key, clipId); dur = clip.duration;
    } else dur = app.store.get(clipId).duration;
    d.audioId = clipId; d.aiKey = key; d.trimStart = 0; d.trimEnd = 0; d.duration = r2(dur);
    touched.add(t.scene);
    done++;
    // let the UI breathe between lines
    await new Promise((r) => setTimeout(r, 0));
  }
  onProgress({ done, total, message: 'Done', ratio: 1 });
  if (retime) for (const sc of touched) sequenceDialogs(sc, app.store.info, 0.45, dialogDuration);
  return done;
}
