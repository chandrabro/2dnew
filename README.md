# StoryStage – 2D Story Animator

Make 2D animated stories entirely in your browser. No install, no server, no API keys.

- **Characters**: 40+ ready-made characters (Indian farmer, Nepali farmer, Nepali / Indian police, pilot, air hostess, doctor, nurse, teacher, students, kids, chef, king, queen, pirate, wizard, astronaut, bride, groom, monk, grandparents…) or build your own: gender, age, body, skin tone, 16 hair styles, hair / eye colour, facial hair, glasses, 15 tops, bottoms, shoes, 23 hats (dhaka topi, turban, police cap, pilot cap, crown, hijab…), accessories.
- **50 scenes** in 6 categories (home, farm & nature, city, school & work, fantasy & adventure, events) with day / dawn / sunset / night lighting, weather (rain, snow, fog, sun rays, leaves) and colour filters.
- **65+ actions**: all 50 requested (digging, watering, chopping wood, crying, laughing, walking, running, dancing, sweeping, cooking, typing, sword, magic, sleeping…) plus salute, namaste, bow, shrug, cheer, selfie and more. Characters walk/run to any point you choose and turn automatically.
- **Up to 3 characters per scene**, drag them on the stage, set facing (left / right / to camera), size and depth.
- **Camera per scene**: wide, medium, close-up, low / high angle, pans, zooms, dolly, handheld shake or fully custom start → end.
- **Dialog**: browser text-to-speech (free, no setup), microphone recording, or upload mp3/wav. Every line has its own start time, so characters **never talk over each other** unless you want them to; the timeline marks overlaps in red and *Auto-sequence* fixes them in one click. Lip-sync follows the real audio. Speech bubbles with 4 styles.
- **Extras**: captions & titles, scene transitions (fade, dissolve, slide, wipe, iris), background music, 16:9 / 9:16 / 1:1 / 4:3, undo/redo, autosave, project files with embedded audio, PNG snapshots.
- **Export**: real MP4 (H.264 + AAC) rendered frame-by-frame in the browser with WebCodecs. Also a live recording mode that captures the tab's audio so browser TTS voices end up in the video, and a WebM fallback.

## Run it

Just open the folder on any static host. Locally you can run `python3 -m http.server` in the folder and open http://localhost:8000 (ES modules need http://, not file://).

### Deploy on GitHub + Vercel (no software needed)

1. Create a new repository on https://github.com/new (for example `story-animator`).
2. On the empty repository page click **uploading an existing file**, drag **all files and folders** of this project in (index.html, css/, js/, vercel.json, README.md) and press **Commit changes**.
3. Go to https://vercel.com, sign in with GitHub, click **Add New → Project**, pick the repository and press **Deploy**. Framework preset: *Other*. No build command, no output directory needed.
4. Vercel gives you a URL like `https://story-animator.vercel.app`. Every time you upload new files to GitHub, Vercel redeploys automatically.

GitHub Pages also works (Settings → Pages → Deploy from branch → main / root).

## Browser support

| Feature | Chrome / Edge / Brave (desktop) | Safari | Firefox |
|---|---|---|---|
| Editor & preview | ✅ | ✅ | ✅ |
| MP4 export (WebCodecs) | ✅ | ⚠️ partial | ❌ use WebM fallback |
| Live export with tab audio (TTS) | ✅ | ❌ | ❌ |
| Browser voices (TTS) | ✅ | ✅ | ✅ |
| Mic recording | ✅ | ✅ | ✅ |

Use desktop Chrome or Edge for the full experience. The MP4 encoder library (Mediabunny, MIT) is loaded from a CDN the first time you export; everything else is in this folder.

## How TTS and export work together

The fast MP4 export renders every frame offline and mixes recorded / uploaded audio and music. Browser voices (Web Speech API) cannot be captured offline, so for dialogs that use a browser voice you have two options:

1. **Export → "Live recording with system audio"** (Windows / ChromeOS): choose *Entire screen* and tick *Also share system audio*. A shared *tab* can never contain browser TTS voices, because Chrome plays speechSynthesis outside the tab's audio pipeline.
2. Record the line with your microphone (Dialog → Voice source → Record) or upload an audio file. Those are always included in the fast export, with lip-sync.

## Narration and background music

Open the **Audio** tab. Add **one narration file** for the whole movie (starts at 0:00, optional offset) and **one music file** with its own volume slider (changes are heard live while previewing). Both are mixed into every export type and saved inside project files.

## Default voices (male / female / narrator)

In the **Audio** tab choose a default browser voice (plus speed and pitch) for male characters, female characters and the narrator, or press *Suggest voices*. Every dialog line follows its speaker's default automatically (gender comes from the character). In the **Dialog** tab, pick *Narrator* as the speaker for narration lines (shown as subtitles, no character talks), or choose a specific voice inside a dialog to override the default for that line only. *Use these defaults for every dialog* clears all manual overrides.

## Built-in AI voices (free, no API)

**Audio tab → AI voices.** Pick a voice for male characters, female characters and the narrator, then press **Generate voices for the whole movie**. The voices are made inside your browser with the open-source Piper models (via `vits-web`, loaded from the jsDelivr / esm.sh CDNs; each voice is about 60 MB, downloaded once and cached). Every line becomes a real audio clip, so it is included in **every export, including the fast MP4**. Dialog sources are now: AI voice, Browser voice (preview/live only), Upload, Record. Pending AI lines are generated automatically when you export; dialogs can be re-timed to the real voice length. "Load more voices" lists every language the engine offers (Hindi, Nepali, etc., when available). To self-host or change the engine, edit `LIB_URLS` in `js/audio/aiVoice.js`.

## Subtitles

**Settings → Subtitles**: burn subtitles into the video (narrator only or all speech) in four styles – classic, boxed, karaoke word-highlight, karaoke on a bar – with position, size, colours, speaker names and an option to hide speech bubbles. **Export → Subtitle file** saves `.srt` / `.vtt` for YouTube, TikTok and Instagram.

## Vertical videos and auto-fit camera

Choose the format in **Export** (16:9, 9:16 Shorts/Reels/TikTok, 1:1, 4:5 Instagram, 4:3) or in Settings. With **Auto-fit camera** on, narrow formats pan smoothly to keep the speaking or moving character in frame (the pan is a pure function of time, so exports stay frame-exact). Landscape output is unaffected.

## Project structure

```
index.html            app shell
css/app.css           theme
js/main.js            state, playback, undo, persistence
js/state.js           project model + demo story
js/engine/            pure rendering engine (deterministic: same time → same pixels)
  renderer.js         frame composition, camera, bubbles, captions, transitions
  character.js        2D rig (body, limbs, outfits)  face.js (expressions, hair, hats)  props.js
  actions.js          65+ keyframed actions         presets.js (ready-made characters)
  scenery.js          drawing helpers               scenes/*.js (50 backgrounds)
js/audio/             audio store (IndexedDB), player, TTS, recorder, offline mixer
js/export/exporter.js MP4 (WebCodecs + Mediabunny), WebM and live-capture export
js/ui/                editor panels
test/                 gallery pages used to check scenes / actions (open test/gallery.html?file=all)
```

## Keyboard

`Space` play/pause · `←` `→` step 0.1 s (`Shift` = 1 s) · `Home` / `End` · `Ctrl+Z` / `Ctrl+Y` undo / redo · `Esc` cancel · `Ctrl + wheel` zoom timeline · double-click a timeline track to add an action / dialog.

## License

MIT. Fonts from Google Fonts, MP4 muxing by [Mediabunny](https://mediabunny.dev) (MIT).
