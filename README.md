# Postmark

A personal music library you host yourself. Upload your songs once from your laptop. They are stored in a real database plus file storage on your server, and every device you sign in on can stream them or download them for offline listening.

Built with Next.js 16 (App Router), React 19, TypeScript, libSQL/SQLite, and the Web Audio API.

## What it does

- **Library in a database.** Songs, albums, artists, playlists, likes and saved links live in SQLite (libSQL). Audio and cover art are stored on disk, de-duplicated by SHA-256.
- **Upload from any device.** Drop files or a whole folder. Title, artist, album, year and embedded cover art are read from the tags, or guessed from the filename.
- **Offline listening.** "Download" saves a song inside the browser (IndexedDB). Downloaded songs play with no connection. A service worker lets the app itself open offline.
- **Playback.** Gapless-style queue, shuffle, repeat (off / all / one), drag-to-reorder queue, play next, sleep timer, lock-screen controls, keyboard shortcuts (space, arrows, `/`).
- **Effects.** Slowed + reverb, nightcore, bass boost, 8D, lo-fi, concert hall, vocal focus, plus a 5-band EQ and speed, bass, reverb, tone and 8D-motion controls.
- **Telugu, Hindi and English starter shelves.** 36 well-known songs are listed as stamps. Tap one to add your own copy of the file.
- **Light and dark themes**, responsive from small phones to wide desktops.
- **Password protection.** One password, signed cookie, rate-limited login.

## Run it

```bash
npm install
cp .env.example .env.local      # set POSTMARK_PASSWORD
npm run build
npm start                        # http://localhost:3000
```

For development use `npm run dev`. Data goes to `./data` (`DATA_DIR` to change it): `postmark.db`, `audio/`, `covers/`.

## Using it from your phone

A phone can only install the app, keep downloads reliably and run the service worker over **HTTPS**. Pick one:

1. **Your own server or VPS.** Run the Docker image (`docker build -t postmark . && docker run -p 3000:3000 -v postmark-data:/data -e POSTMARK_PASSWORD=... postmark`) behind Caddy or Cloudflare for HTTPS.
2. **Laptop plus a tunnel.** Run `npm start` on the laptop and expose it with Cloudflare Tunnel or Tailscale Funnel. Your library is only reachable while the laptop is on.
3. **A host with a persistent disk** (Fly.io, Railway, Render with a disk). Mount the disk at `DATA_DIR`.

Static or serverless hosts without a persistent disk (including Vercel) will lose uploaded audio. Do not use them for the audio folder.

`DATABASE_URL` and `DATABASE_AUTH_TOKEN` can point the database at a hosted libSQL / Turso instance. Audio and covers still use the disk at `DATA_DIR`.

On iPhone: open the site in Safari, Share, Add to Home Screen. Then tap Download on the songs you want offline.

## Adding music

Download or rip the audio file first, then upload it. Postmark stores files you provide; it does not fetch audio from YouTube or any streaming service, and cannot play their streams. You can save links to YouTube, Spotify, Apple Music, SoundCloud, JioSaavn, Gaana and Wynk in the Add page. They open in the original service.

Only upload music you have the right to keep and copy.

## Project layout

```
src/app            pages and API routes (api/songs/upload, api/songs/[id]/audio with Range support, ...)
src/lib/db.ts      schema and queries
src/lib/art.ts     deterministic vector cover art (8 styles, 12 palettes)
src/lib/engine.ts  Web Audio graph and effects
src/lib/player.ts  queue and playback store
src/lib/offline.ts IndexedDB downloads
src/components     stamp, reel, player bar, now-playing sheet
public/sw.js       service worker
scripts/           art-sheet.ts (contact sheet preview), icons.ts
```

## Known limits

- Single user. One password, one shared library.
- Downloads are per browser. Safari may evict site data after long inactivity unless the app is added to the Home Screen.
- Effects such as speed with pitch change use the browser's own resampling; very large files decode on the fly while streaming.
- Mood-based and personalised discovery is not built yet. Plays are counted per song (`plays`, `last_played`) so it can be added later.
