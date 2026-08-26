# Yummi — Privacy Policy

**Effective date: 26 August 2026**

Yummi ("the app", "we", "us") helps you decide what to cook: you photograph the
inside of your fridge, the app identifies ingredients, suggests one meal, and
guides you through cooking it. This policy explains exactly what data the app
handles and where it goes.

Yummi has **no user accounts**. We do not run analytics, advertising, or
tracking of any kind, and we do not collect your name, email, contacts, or
location.

---

## What the app processes, and why

### 1. Photos of your fridge

When you take a photo, the app resizes and compresses it on your device and
sends it to our backend, which forwards it to our AI provider (Anthropic) to
identify the food in the image. The identified ingredient names are returned to
your device.

- The photo is used **only** to identify ingredients for that one request.
- The photo is **not stored** by Yummi and is not saved to any database.
- Our AI provider processes the image to generate the response and does not use
  data submitted through its API to train its models.

### 2. Your ingredient list

The list of ingredients you confirm or type is stored **only on your device**
(local app storage). It is not uploaded to any account or server for
safekeeping.

The ingredient **names** (text only) are sent to our backend and AI provider
when you ask for a meal recommendation or cooking help, so the app can generate
a suggestion and step-by-step guidance.

### 3. Voice input

If you use the microphone to add ingredients or control cooking steps, speech
recognition is performed by **your device's own operating-system speech
service** (for example, Google's on Android). Yummi receives only the resulting
text. For cooking questions, that text is sent to our backend and AI provider to
generate an answer.

Yummi does **not** record, upload, or store audio.

### 4. Network address (abuse prevention only)

When your device contacts our backend, your IP address is briefly recorded in
our backend database solely to limit automated abuse of the service (rate
limiting). These records **expire automatically within 24 hours** and are used
for no other purpose. They are never sold, shared for advertising, or linked to
any identity.

---

## Who processes your data

| Provider | Role | More information |
|---|---|---|
| Supabase | Hosts our backend and database (the service that proxies AI requests and enforces rate limits) | https://supabase.com/privacy |
| Anthropic | AI processing of fridge photos and text to identify ingredients and generate recommendations | https://www.anthropic.com/legal/privacy |

Data is transmitted over encrypted connections (HTTPS).

---

## Data retention

- **Photos and text:** not retained by Yummi after the request completes.
- **Rate-limiting records (IP address):** deleted automatically, at most 24 hours
  after they are created.
- **Your ingredient list:** stays on your device until you remove items or
  uninstall the app. Uninstalling Yummi deletes all data the app stored on your
  device.

## Children

Yummi is not directed to children under 13, and we do not knowingly collect data
from children.

## Your choices

- You can use the app without the camera or microphone by adding ingredients
  manually.
- Uninstalling the app removes everything it stored locally.
- To ask what data relates to you or to request deletion, contact us at the
  address below. Because we keep no accounts and no server-side copies of your
  content, there is normally nothing stored for us to return or delete beyond the
  automatically expiring rate-limit records.

## Changes to this policy

If this policy changes, the updated version will be posted at this URL with a new
effective date.

## Contact

**[REPLACE WITH A REAL CONTACT EMAIL BEFORE PUBLISHING]**

Developer: **[REPLACE WITH YOUR DEVELOPER / PUBLISHER NAME]**
