# SlapEarn → Telegram Mini App setup

SlapEarn no longer asks anyone to sign up. Every entry point creates a session
automatically:

| Where the player opens SlapEarn | What happens |
| --- | --- |
| Inside Telegram (Mini App / Telegram Web / Desktop) | `initData` is verified with your bot token, the player is mapped to a stable account (`telegram_links/{telegramId}` → uid) and signed in with a Firebase custom token. |
| Plain browser (someone taps a normal link) | Instant anonymous guest account, no form. |
| Browser where anonymous auth is unavailable | Server-signed guest account (`guest_<random id>`), still no form. |
| Server has no Firebase Admin credentials / offline | Local-only session so the game still opens (progress kept on the device). |

The old e-mail/password screen (`src/components/AuthScreen.tsx`, `LandingPage.tsx`)
is no longer referenced by the app flow, but the files and the Firebase accounts
behind them are untouched.

---

## 1. Create / configure the bot (BotFather)

1. Send `/newbot` to [@BotFather](https://t.me/BotFather) and copy the token
   (`123456789:AA...`).
2. Point the Mini App at the deployed site (Firebase Hosting URL is fine):
   * `/newapp` → choose your bot → **Web App URL**: `https://slapearn.web.app`
     (or `https://slapearn.firebaseapp.com`);
   * or `/setmenubutton` → send the URL as the button text/URL pair.
3. Optional but recommended:
   * `/setdomain` → `slapearn.web.app` (only needed for the Telegram **Login
     Widget** flow on a website);
   * `/setdescription`, `/setuserpic`, `/setcommands`.
4. Open the bot chat → the menu button now launches SlapEarn. No sign-up screen
   should appear; the log line `[Auth] No session found — starting formless
   bootstrap` is printed in the browser console.

**Referral links:** use a Mini App start parameter, e.g.
`https://t.me/YourBot?startapp=SLAP-CHAMP123`. The value arrives as
`start_param`, is stored on the new account as `referredByCode`, and is usable
by the existing referral logic.

## 2. Add the bot token to the API

The API (Cloud Run service `slapearn-api`, region `europe-west3`, wired through
the `/api/**` rewrite in `firebase.json`) needs the token at runtime:

```bash
gcloud run services update slapearn-api \
  --region europe-west3 \
  --update-env-vars TELEGRAM_BOT_TOKEN="123456789:AA..."
```

Local development: copy `.env.example` to `.env` and set the same variable
(`server.ts` loads `.env` with dotenv, and prints a startup line telling you
whether signature verification is active).

| Variable | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | BotFather token. **Required in production** — it is the HMAC key used to verify `initData`. |
| `TELEGRAM_ALLOW_UNVERIFIED` | `true` accepts unsigned Telegram payloads (development only — anyone could then claim any Telegram id). Leave unset in production. |
| `TELEGRAM_AUTH_MAX_AGE_SECONDS` | Maximum age of a Telegram payload before it is rejected (default `86400`). |

## 3. Turn on anonymous sign-in (plain-browser guests)

Firebase console → **Authentication → Sign-in method → Anonymous → Enable**.

Without it the browser fallback drops to the server-signed guest token, and if
the API also has no credentials the player gets a local-only session. Telegram
users are unaffected either way.

## 4. Deploy

```bash
npm run build                 # vite build + bundled dist/server.cjs
firebase deploy --only hosting
# API: deploy/rebuild the Cloud Run service that runs `npm start`
```

`firebase.json` was adjusted for Telegram:

* `X-Frame-Options: DENY` removed — Telegram Web embeds Mini Apps in an iframe.
* CSP `frame-ancestors 'self' https://web.telegram.org https://*.telegram.org`.
* CSP `script-src`/`connect-src` allow `https://telegram.org`
  (`telegram-web-app.js`, loaded in `index.html`).

Other project files that changed:

* `index.html` — Telegram SDK script + `viewport-fit=cover`.
* `vite.config.ts` — `server.allowedHosts` so proxied/preview hosts are not
  rejected with “Blocked request. This host is not allowed.”
* `server.ts` — `POST /api/auth/telegram`, `POST /api/auth/guest-token`, startup
  banner, credential probe and an `unhandledRejection` guard.
* `src/lib/telegramAuth.ts` — signature verification (Mini App + Login Widget).
* `src/lib/telegramSession.ts` — uid mapping, `users/{uid}` bootstrap, custom tokens.
* `src/lib/telegramSdk.ts` — client Telegram helpers (`ready`, `expand`, chrome colours, swipe lock).
* `src/lib/autoSession.ts` — the formless bootstrap + “link my browser guest to my Telegram account”.
* `src/components/BootSplash.tsx` — replaces the auth screen while the session is created.
* `src/App.tsx`, `src/components/ProfileView.tsx` — session wiring, Telegram
  badge instead of e-mail, avatar from the Telegram photo, no “log out” for
  automatic sessions.

## 5. What the server enforces

* `data_check_string` = all `initData` fields except `hash`/`signature`, sorted
  and joined with `\n`; `secret = HMAC_SHA256("WebAppData", bot_token)`;
  comparison is constant-time. `auth_date` must be fresh.
* Telegram Login Widget payloads are verified with `SHA256(bot_token)` instead.
* Rejected attempts are written to `security_incidents`
  (`TELEGRAM_AUTH_REJECTED`); successful logins log `TELEGRAM_AUTH_SUCCESS`.
* `telegram_links` is server-only and covered by the “deny everything else”
  rule at the bottom of `firestore.rules` — no rules change was required.
* Guests get `guest_<128-bit random id>` uids; the id is client-stored but
  unguessable, and it can never collide with a real Telegram/e-mail account.

## 6. Behaviour notes

* “Log out” is intentionally a no-op for Telegram/guest sessions (a sign-out
  would just create an empty new account). The profile tab shows a
  “Session saved automatically” card instead. Local-only sessions can be reset.
* Telegram-verified sessions can be linked to an existing browser guest session:
  the first time a Telegram account is seen, the current session uid is adopted
  (so a player who started in the browser keeps their points).
* `TELEGRAM_BOT_TOKEN` missing → the API logs a loud warning and accepts
  unsigned identities so you can test the flow immediately. **Set the token
  before launch.**

## 7. Rolling back to e-mail sign-up

The old screens are still on disk. To restore them temporarily, re-import
`AuthScreen` in `src/App.tsx` and render it when `!isAuthenticated` instead of
`<BootSplash />`, then `git checkout` the removal commit. Everything else
(Firebase e-mail accounts, admin claims, password reset) is unchanged.
