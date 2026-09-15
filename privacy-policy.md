# Yummi — Privacy Policy

**Effective date: 16 September 2026**

Yummi ("the app", "we", "us") helps you decide what to cook — you photograph
the inside of your fridge, the app identifies ingredients and suggests
meals — and lets you optionally create an account to share photos of what you
made, rate other people's dishes, and set dietary preferences. This policy
explains what data the app handles, why, and how to have it deleted.

An account is **optional**. Scanning your fridge, getting recommendations,
and cooking with guidance all work fully signed out. An account is only
needed to post a dish photo, rate someone else's post, or save dietary
preferences.

---

## What the app processes, and why

### 1. Account information

If you create an account, we collect the **email address and password** you
provide. Passwords are handled entirely by our authentication provider
(Supabase) and are never visible to us in plain text. Your account is used to
sign you in and to attach the content described below to you.

### 2. Profile

Your **display name** and **dietary preferences** (e.g. vegetarian, gluten
free) are stored against your account. Dietary preferences are used to filter
meal recommendations and are not shown to other users. Your display name is
shown publicly alongside anything you post or rate.

### 3. Photos of your fridge (scanning)

When you take a photo to scan your fridge, the app resizes and compresses it
on your device and sends it to our backend, which forwards it to our AI
provider (Anthropic) to identify the food in the image.

- The photo is used **only** to identify ingredients for that one request.
- The photo is **not stored** by Yummi and is not saved to any database.

### 4. Photos you post of a dish

If you choose to share a photo of something you cooked, that photo **is
uploaded and stored** on our backend (Supabase Storage) and is **publicly
visible** to everyone using the app, alongside your display name, the recipe
name, your caption, and the location described below. This is different from
a fridge-scan photo — you choose when to post, and posted photos persist
until you delete the post or your account.

### 5. Location

When you post a dish photo, the app asks for your device location and stores
those coordinates with the post so it can appear on the map of "what people
are cooking nearby." This location is public, the same as the photo. If you
just open the map to look around, the app may also use your location
on-device to center the view — that use isn't sent anywhere or stored.

### 6. Ratings

Star ratings (1–5) you give to other people's posts are stored on our backend
and linked to your account. The app only ever shows other users the
**aggregated average** rating for a post, not who rated it.

### 7. Your ingredient list

The list of ingredients you confirm or type is stored **only on your device**
(local app storage) — it isn't uploaded for safekeeping. The ingredient
**names** (text only) are sent to our backend and AI provider when you ask
for a meal recommendation or cooking help, so the app can generate a
suggestion and step-by-step guidance.

### 8. Voice input

If you use the microphone to add ingredients or ask a cooking question,
speech recognition is performed by **your device's own operating-system
speech service** (for example, Google's on Android). Yummi receives only the
resulting text; for cooking questions that text is sent to our backend and AI
provider to generate an answer. Yummi does **not** record, upload, or store
audio.

### 9. Network address (abuse prevention only)

When your device contacts our backend, your IP address is briefly recorded
solely to limit automated abuse of the service (rate limiting). These records
**expire automatically within 24 hours** and are used for no other purpose.
They are never sold, shared for advertising, or linked to any identity.

---

## Who processes your data

| Provider | Role | More information |
|---|---|---|
| Supabase | Authentication, database, file storage, and the backend that proxies AI requests and enforces rate limits | https://supabase.com/privacy |
| Anthropic | AI processing of fridge photos and text to identify ingredients, generate recommendations, and answer cooking questions | https://www.anthropic.com/legal/privacy |

Data is transmitted over encrypted connections (HTTPS). We do not sell your
data or use it for advertising, and we do not run third-party analytics or ad
tracking.

---

## Data retention

- **Fridge-scan photos and cooking-assistant text:** not retained after the
  request completes.
- **Rate-limiting records (IP address):** deleted automatically, at most 24
  hours after they are created.
- **Your ingredient list:** stays on your device until you remove items or
  uninstall the app.
- **Account, profile, dish posts, posted photos, and ratings:** kept until you
  delete them, or delete your account (see below), at which point they are
  removed promptly and are not recoverable.

## Deleting your account and data

You can permanently delete your account at any time:

- **In the app:** go to your profile (tap the account icon) → **Delete
  account** → confirm. This immediately and permanently deletes your account,
  profile, dietary preferences, dish posts, posted photos, and ratings.
- **Without the app:** visit **https://iamditi.github.io/Yummi/delete-account.html**
  and sign in with your account's email and password to request deletion. If
  you no longer have access to the app or can't sign in, email us at the
  address below and we'll delete your account manually.

Deletion is irreversible. We don't retain a copy of deleted account data
except where the law requires we keep specific records, and we have no such
requirement today.

## Children

Yummi is not directed to children under 13, and we do not knowingly collect
data from children.

## Your choices

- You can use the app's core scan → recommend → cook flow without ever
  creating an account, and without granting camera/microphone/location access
  (add ingredients manually instead).
- Creating an account, posting a dish, and rating posts are all optional.
- Uninstalling the app removes everything it stored locally on your device,
  but does **not** delete your account or anything already posted — use the
  in-app or web deletion option above for that.

## Changes to this policy

If this policy changes, the updated version will be posted at this URL with a
new effective date.

## Contact

**ditidon@gmail.com**

Developer: **Yummi**

---

This policy is hosted at **https://iamditi.github.io/Yummi/privacy-policy.html**
(served from `docs/privacy-policy.html` via GitHub Pages) — that URL, not this
file, is what should be entered in Google Play Console and shown to users.
