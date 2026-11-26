# Paso Diario

A personal daily Spanish practice app for getting from B1+ to a solid B2 in speaking and writing.
It targets three weak points: **tenses**, **active vocabulary** and **sentence structure**.
Every exercise makes you *produce* Spanish (type, rebuild or speak), and the content is
**Mexican Spanish**, with Spain-only forms shown as "recognise only".

- 45-minute daily plan (editable): Review → Tense & structure drills → Active vocabulary → Writing → Speaking
- Calendar: dark green = full day, light green = light day (the 20-minute minimum), yellow = partly done
- 18 grammar topics, ~590 exercises, 430 vocabulary items in 7 themes, 18 grammar notes, 54 writing and 36 speaking prompts
- Spaced repetition (SM-2) of your own mistakes and vocabulary (sentence cards, typed answers)
- Free writing (with an optional idea, a statement to give your opinion on, or a short English text to translate, judged on meaning rather than word for word) plus optional "use this word in a sentence" → "Copy correction prompt" → paste the AI reply. You get overall feedback, and only real mistakes become review cards: accents, capitals, punctuation and Spain-vs-Mexico variants never count. Works with any AI chat, no API key.
- In-browser voice recording with an optional es-MX transcript, "redo worst sentence", and a weekly friend-call mode
- Progress charts, bonus trackers (series, listening, reading), JSON backup and restore
- Interface in English or Spanish; translation prompts in English or Dutch
- Installable PWA that works offline. All data stays in your browser (IndexedDB). No accounts and no backend.

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:5173. To try it on your phone over Wi-Fi, run `npm run dev -- --host`
and open the "Network" address it prints. Microphone recording needs HTTPS or localhost,
so use a deployed version for speaking practice on the phone.

Other commands:

```bash
npm test            # unit tests (answer checking, SM-2, curriculum, content integrity, i18n, backup)
```

```bash
npm run build       # production build in dist/
```

```bash
npm run preview     # serve the production build locally (http://localhost:4173)
```

## Deploy (free static hosting)

The app is a static site: `npm run build` produces `dist/`. It uses hash URLs (`#/today`),
so no server rewrites are needed anywhere.

### Vercel
1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repo and keep the detected settings
   (framework: Vite, build: `npm run build`, output: `dist`), then **Deploy**.

### Netlify
1. Push to GitHub, then **Add new site → Import an existing project**.
2. `netlify.toml` already sets the build command and the `dist` folder. Click **Deploy**.

Or deploy without git: run `npm run build` and drag the `dist/` folder onto https://app.netlify.com/drop.

### GitHub Pages
1. Push to a GitHub repository on the `main` branch.
2. In the repo, go to **Settings → Pages → Source: GitHub Actions**.
3. The included workflow `.github/workflows/deploy-pages.yml` tests, builds (with the right
   base path `/<repo-name>/`) and publishes on every push. The URL is
   `https://<your-user>.github.io/<repo-name>/`.

For any other sub-path host, build with `BASE_PATH=/sub/path/ npm run build`.

### Install it on your phone
Open the deployed URL. On **iPhone** (Safari), tap Share → *Add to Home Screen*.
On **Android** (Chrome), use menu → *Install app*. It then opens full-screen and works offline.
New versions install automatically the next time you open the app.

## Your data

Everything lives in your browser's IndexedDB on that one device. Use
**Settings → Backup → Export** regularly, for example weekly. The backup also moves your
progress to a new phone: export on the old device, then **Import** on the new one.
Importing replaces all data. Voice recordings are only included if you switch that on,
because they make the file big. Clearing your browser's site data deletes everything, so keep a backup.

## How a day is built

- The **weekly template** (Settings) sets each weekday as *Topic* (the next curriculum topic plus
  spiral review), *Mixed* (your weakest topics) or *Structure* (word order, pronouns, connectors,
  relatives, se-constructions). 📞 marks the weekly call day, where the speaking block becomes
  "Call with Mexican friend".
- The **curriculum** moves forward one "topic day" each time you finish the drills block on a topic day.
  Skipped days don't make you fall behind. Each topic has a number of topic days
  (preterite vs imperfect gets 8, about two weeks). You can jump to any topic in Settings.
- **Drills are adaptive.** About 60% are on today's topic. The rest come from earlier topics, weighted
  towards your lowest recent accuracy. Wrong answers go to the mistake log and become review cards.
- **Light day:** review + drills (20 min) still counts, as a light-green day. Any day where review
  and drills are done counts towards your streak.

## Answer checking

Answers are compared after ignoring case, extra spaces and punctuation (¿ ¡ . , etc.).
There are three results:

- **Correct.** Accents are optional by default (you get a reminder; turn on *Accents required* to make
  them count). Adding or leaving out a subject pronoun ("Yo no sé" / "No sé") is fine. Everyday and Spain
  variants count too (*coche* = *carro*, *móvil* = *celular*, *padres* = *papás*…), with a note. On vocabulary
  cards, another word from the deck with the same meaning counts (*pues* for *bueno*), and the note tells you
  which word the card is training.
- **Almost (half credit).** A small spelling slip, such as *estubo*, *conosco*, *hiso*, a swapped or missing
  letter in a longer word, is pointed out but not marked fully wrong. Changed endings (*fue* for *fui*)
  stay wrong, because they change tense or person, which is what the drills train.
- **Wrong.** You see a diff of your answer and the closest correct one, plus the rule.

If you are sure your answer is right, tap **I was actually right**: it counts as correct and is accepted from then on.

## Mistake analysis

**Progress** shows, from your answers in the last 60 days:
- **What to work on next:** your weakest topics, why, and a *Practise* button for each.
- **Your level per topic:** Needs work / Building / Good / Strong, based on your last 30 answers
  per topic (almost-right counts as half), with a trend arrow.
- **Your most common mistakes:** tense/mood choice, verb forms and endings, pronouns, prepositions,
  articles and gender, word order, missing words, word choice, spelling, accents, vocabulary. Each comes with examples.
- **Words you keep missing.**

Each grammar page (Library → Grammar) also shows **Your results** for that topic. The analysis is
automatic and approximate: it classifies each answer by comparing it with the closest correct answer.

## Adding your own content

All content is in plain TypeScript files under `src/data/`. Run `npm test` after editing:
it checks every topic still has 25+ exercises, every gap has `___`, unscramble alternatives
use the same words, every vocabulary example contains its word, and so on.

**Grammar exercises** (`src/data/exercises/*.ts`). Answers are separated by `|`, and the first one is the main answer:

```ts
gap('Ayer ___ (ir, yo) al súper.', 'fui', 'ir → fui (same forms as ser).'),
tr('Ik heb het al gezegd.', 'I had already said it.', 'Ya lo había dicho.', 'decir → dicho.'),
rw('Pasa al pretérito:', 'Hoy voy al cine.', 'Ayer fui al cine.', 'ir → fui.'),
us('Mañana voy al cine.|Voy al cine mañana.', 'Time expressions can go first or last.'),
pr('Cuando era niño, ___ a la playa.', 'iba|fui', 'iba', 'Habit → imperfect.', 'Spain-only note (optional)'),
```

**Vocabulary** (`src/data/vocab/*.ts`). One line per item, with the target in [brackets] inside the example:

```
'el partido | de wedstrijd | the match | Anoche vimos [el partido] en casa de Luis. | =un partido | ES: …'
```

Every exercise also needs an English meaning in `src/data/exercises/meanings-*.ts` (`[spanish sentence, english]`, where the
Spanish is the full sentence with the gap filled in). The tests tell you exactly which ones are missing.

Exercise and vocabulary ids are content hashes, so reordering or appending never breaks
your history. Grammar notes are in `src/data/notes.ts`, and writing and speaking prompts
in `src/data/prompts.ts`. Interface translations are in `src/lib/i18n-es.ts`.

## Project structure

```
src/
  data/          content: topics + curriculum, exercises, vocabulary, notes, prompts
  lib/           logic: db (Dexie schema), plan (curriculum, day plan, streaks), select (adaptive drills),
                 check (answer checking + diff), srs (SM-2), practice (mistakes → cards), correction (AI JSON
                 import), recorder (MediaRecorder + Web Speech), backup, i18n
  components/    UI pieces: PracticeCard, Recorder, charts, ui
  screens/       Today, Calendar, Progress, Library, Settings, Bonus, block sessions
```

### Data model (IndexedDB via Dexie)

| table | key | contents |
|---|---|---|
| `kv` | key | settings, last backup date |
| `days` | date | day type, topic, light/call flags, blocks (minutes, done, seconds spent) |
| `attempts` | ++id | every answer: item, topic, source, correct |
| `cards` | id | SM-2 state + a reference to an exercise / vocab item, or a custom "fix the sentence" card |
| `mistakes` | ++id | your mistake log (drills, writing, calls, speaking, manual) |
| `alts` | key | extra answers you accepted with "I was actually right" |
| `writings` | ++id | daily texts |
| `recordings` | ++id | audio blobs, transcript, redo flag |
| `logs` | ++id | series, listening, reading, friend calls |

Tech: React 19, TypeScript, Vite, Tailwind CSS 4, Dexie, vite-plugin-pwa, Vitest.
