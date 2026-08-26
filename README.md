# Yummi

**"I'm hungry, but I don't know what I want to eat."**

Open app → photograph fridge → AI identifies ingredients → you confirm/edit → AI
recommends **one** meal → interactive step-by-step cooking assistant with touch **and** voice.

The app is a decision-reduction tool, not a recipe database. It always says *"I think you
should make this"* and explains why. Reject it and it suggests something else, learning from
what you turned down.

---

## Stack

| Layer | Choice |
|---|---|
| App | React Native · Expo SDK 57 · TypeScript · Expo Router |
| State | `zustand` (only the ingredient list is persisted, via AsyncStorage) |
| AI | Anthropic Claude (`claude-sonnet-5`), behind a service layer |
| AI proxy | Supabase Edge Functions (Deno) — your `ANTHROPIC_API_KEY` never ships in the app |
| Voice | `expo-speech` (text-to-speech) + `expo-speech-recognition` (on-device speech-to-text) |

```
app/                     Expo Router screens
  index.tsx              Home — "What are we eating?"
  scan.tsx               Camera capture + photo preview
  ingredients.tsx        Editable ingredient list (+ text / voice add)
  recommend.tsx          One recommendation card + "Not what I want"
  cook.tsx               Step-by-step cooking mode (Done button + voice)
src/
  components/            Button, Screen, Card, IngredientRow, StepCard, MicButton, …
  services/ai/           vision.ts · recommendations.ts · cooking.ts · voice.ts · client.ts · mock.ts
  services/types.ts      Ingredient · Recommendation · CookingSession
  store/session.ts       the one app store
supabase/functions/
  vision/  recommend/  cook/     one Edge Function per AI task
  _shared/anthropic.ts            the ONLY file that knows the provider is Anthropic
```

---

## 1. Install

```bash
npm install
```

## 2. Run in demo mode (no backend, no keys)

```bash
npx expo start
```

Leave `.env` unset and the app runs with **canned AI responses** so you can click through the
whole flow (Home → Scan → Ingredients → Recommend → "Not what I want" → Cook → Done).
Camera and voice need a real device / dev build (see step 4); everything else works in Expo Go
and the web preview.

## 3. Connect the real AI (Supabase + Anthropic)

You need a free [Supabase](https://supabase.com) account and an
[Anthropic API key](https://console.anthropic.com/).

1. **Create a Supabase project.** In the dashboard: **Settings → API** — copy the
   **Project URL** and the **anon public** key.

2. **Point the app at it.**

   ```bash
   cp .env.example .env
   ```

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
   ```

   (Both values are safe in a mobile app — the anon key only lets the app call your Edge
   Functions.)

3. **Deploy the Edge Functions.** The Supabase CLI login is interactive — in this Claude Code
   session, prefix the command with `!` so it runs in your terminal:

   ```bash
   npx supabase login                       # opens a browser
   npx supabase link --project-ref YOUR-PROJECT-REF
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy vision recommend cook
   ```

   `YOUR-PROJECT-REF` is the subdomain in your Project URL.

4. **Restart Metro** (`npx expo start --clear`). The banner on the Home screen disappears once
   a backend is configured.

### Test a function directly

```bash
curl -i -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/recommend" \
  -H "Authorization: Bearer $EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ingredients":["eggs","cheese","tomatoes","tortillas","hot sauce"],"rejected":[]}'
```

## 4. Install on your Android phone (dev build — required for camera + voice)

You need a free [Expo](https://expo.dev) account.

```bash
npm install -g eas-cli        # or use: npx eas-cli@latest ...
eas login
eas build:configure           # first time only; picks up eas.json
eas build -p android --profile development
```

When the cloud build finishes, open the link on your phone and install the APK. Then:

```bash
npx expo start --dev-client
```

Scan the QR code from the **Yummi** dev app (not Expo Go). Camera, text-to-speech, and
hands-free "Done" all work here.

> Rebuild the dev client only when native config changes (new native module, `app.json`
> plugins/permissions). Day-to-day JS changes just need `npx expo start --dev-client`.

---

## Definition of done — the full loop, on the phone

1. Open app → **Scan my fridge** → photograph the open fridge.
2. Ingredients appear; uncertain ones are tagged **not sure**.
3. Add one by typing, add one by voice ("I also have rice and leftover beef"), remove a wrong one.
4. **Find something to eat** → one recommendation with time · difficulty · pans and a **Why I picked this**.
5. **Not what I want** twice → each suggestion is clearly different.
6. **Let's cook** → steps appear **one at a time**.
7. Tap **Done** and say **"Done"** — both advance. Steps are read aloud (toggle in the header).
8. Ask "I don't have olive oil" → get a short spoken answer. Ask "no more tortillas" → the
   remaining steps adapt.
9. Finish → **Enjoy your meal!**

---

## Swapping the AI provider

Everything provider-specific lives in `supabase/functions/_shared/anthropic.ts` plus the three
prompts in `supabase/functions/{vision,recommend,cook}/index.ts`. The mobile app only knows
about `src/services/ai/*`, which speak plain JSON over HTTPS. Rewrite the functions, keep the
request/response shapes, and nothing in `app/` or `src/` changes.

## Error handling

`src/services/ai/client.ts` normalises every failure (network, timeout, AI error, unusable
photo) into a typed `AiError`. Every screen shows a clear message with a retry and a
never-a-dead-end fallback (e.g. "Add ingredients manually" when the camera or vision fails).

## Scripts

| Command | What |
|---|---|
| `npx expo start` | dev server (Expo Go / web / dev client) |
| `npm run typecheck` | `tsc --noEmit` |
| `npx expo-doctor` | project health check |
| `npx expo export -p android` | build the JS bundle locally (sanity check) |
