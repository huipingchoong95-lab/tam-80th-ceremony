# TAM Penang 80th Anniversary — opening ceremony display

A self-hosted, offline-capable version of the "wall of names" gimmick:
attendees scan a QR code, type their name, and watch it appear on the big
screen inside a word cloud shaped like "80". The operator then triggers the
president's name zooming in, and finally the anniversary title card.

Everything runs from one laptop and one local network — it does not depend
on the venue's WiFi or internet at all once you've done the one-time install.

## What's in here

- `server.js` — the whole backend (Node + Express). Stores names, pushes
  live updates to the display and admin pages over Server-Sent Events.
- `public/submit.html` — the mobile page attendees land on after scanning the QR code.
- `public/display.html` — the big-screen visual (word cloud shaped "80", zoom, title).
- `public/admin.html` — the operator's control panel.
- `public/index.html` — a landing page linking to all three, handy while testing.
- `data/state.json` — created automatically; holds all submitted names so a
  crash or restart doesn't lose them.

## One-time setup (do this before the event, with internet access)

1. Install [Node.js](https://nodejs.org) (v18 or newer) on the laptop that
   will run the show.
2. In this folder, run:
   ```
   npm install
   ```
   This downloads Express — the only dependency.

## Running it

```
npm start
```

By default it runs on port 3000 with admin PIN `2026`. To change either:

```
PORT=3000 ADMIN_PIN=your-own-pin npm start
```

On Windows (PowerShell):
```
$env:ADMIN_PIN="your-own-pin"; npm start
```

The terminal will print the URLs to use. You'll need this laptop's **local
IP address** (not `localhost`) so phones on the same network can reach it:

- Mac: System Settings → Wi-Fi → Details, or run `ipconfig getifaddr en0`
- Windows: run `ipconfig` and look for "IPv4 Address"
- Linux: run `hostname -I`

Then:
- **Attendees**: `http://<that-ip>:3000/submit.html` — generate a QR code
  pointing at this URL with any free QR generator, and put it on screen/signage.
- **Big screen**: `http://<that-ip>:3000/display.html` — open in a browser
  on the machine feeding the projector, press F11 (or your browser's
  fullscreen shortcut) to hide the browser chrome.
- **Admin**: `http://<that-ip>:3000/admin.html` — open on the operator's own
  laptop or phone, enter the PIN.

## Strongly recommended: bring your own network

Don't rely on the venue's WiFi. Bring a travel router or use a phone as a
mobile hotspot, and connect the server laptop, the display machine, and the
admin device to that network. Encourage attendees to join the same WiFi
network to scan in (put the WiFi name/password next to the QR code) —
this keeps the whole system independent of the venue's infrastructure and
of everyone's individual cell signal in a crowded hall.

## Running the actual ceremony

1. Start the server well before doors open and open `display.html`
   fullscreen on the projector. It shows a faint "80" outline until names
   start arriving.
2. Attendees scan the QR code and submit their names — each one pops into
   the word cloud in real time.
3. Once you have a good number filled in (80 minimum, as many more as you like),
   click **Freeze cloud** in the admin panel for a small "shape complete!" moment.
4. Type the president's name (e.g. `Ts. Full Name`) into the admin panel and
   click **Zoom president's name**. It zooms in large, holds, then shrinks
   back into its place in the word cloud — automatically, no second click needed.
5. When ready, click **Show final title** to reveal "80th Anniversary TAM Penang".
6. Click **Reset everything** before doors open if you want to clear out any
   test names from rehearsal.

## Moderation

The submission filter in `server.js` is a placeholder. Before the real event,
install a proper filter:

```
npm install bad-words
```

and swap it into the `isNameAllowed` function (there's a comment showing
exactly where). You can also hide any individual name live from the admin
panel's name list at any time — hidden names are removed from the display
immediately.

## Customizing the look

Colors, the "80" shape text, and the title wording are all defined near the
top of `public/display.html` (look for the `CONFIG` block) and in the
`:root` CSS variables in `public/submit.html` and `public/admin.html`.
Everything renders with the system font and plain Canvas — no external
fonts or CDNs are loaded, so it keeps working even with zero internet on
the day.

## Rehearse it

Run through the whole sequence at least once on the actual projector before
the event — screen resolution and aspect ratio affect how the "80" shape
lays out. Consider recording a full rehearsal run as a backup video in case
of live technical issues on the day.
"# tam-80th-ceremony" 
