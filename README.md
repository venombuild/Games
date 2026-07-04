# Games

A mobile-friendly, pass-the-phone game collection built with plain HTML, CSS, and JavaScript. Open the hub, pick a game, and play — no install required.

**Live site:** https://venombuild.github.io/MiniGolf/

**Current build:** `2026070401`

---

## Games

### Marvel Guess Who

Two-player deduction game on a shared phone.

1. Enter both player names and pick a board size (20, 24, or 28 characters).
2. Each player privately reveals their secret Marvel hero, then passes the phone.
3. Take turns asking yes/no questions and tapping characters to eliminate them.
4. Use **Final Guess** when ready — first correct guess wins.

### Marvel Brawl

Auto-battling arena fighter on a circular map. Pick heroes, pass the phone, and watch the fight play out. Fighters bounce around the arena and use their powers automatically — last hero standing wins.

**How to play**

1. From the **Games** home screen, open **Marvel Brawl**.
2. Player 1 picks a hero, passes the phone.
3. Player 2 picks a hero.
4. Watch the fight — no manual controls during battle.

Fighters are drawn as colored circles in the arena (no letter labels). Captain America shows a patriot shield disc when holding his shield. Thor's Mjolnir is drawn as a silver hammer head with a brown handle.

---

## Marvel Brawl Heroes

All heroes are tuned for roughly **23–27% win rates** in headless simulation (6000+ fights).

| Hero | HP | Power | Key stats |
|------|-----|-------|-----------|
| **Iron Man** | 108 | Unibeam | 14 dmg, 160 range, 2.95s interval, 0.4s windup |
| **Captain America** | 115 | Shield Throw | 8 shield dmg, 4.1s interval; held shield + bash; red/white/blue trail fields |
| **Thor** | 102 | Mjolnir | 7 hammer dmg, 4.6s interval; boomerang throw with grab/drag |
| **Hulk** | 135 | Smash | 21 contact dmg, 3.18s interval |

### Iron Man — Unibeam

- Fires a ranged energy beam at the opponent when in range.
- Short windup before each shot.

### Captain America — Shield Throw

- Throws his shield as a boomerang projectile.
- While the shield is away, Cap holds a visible patriot shield and can **shield bash** on body contact.
- Leaves **red / white / blue trail fields** behind the shield path that damage enemies who cross them.
- Catching the returning shield grants temporary damage reduction.

### Thor — Mjolnir

- Throws Mjolnir in a **boomerang** arc (out and back), not an orbit.
- **On hit:** grabs the opponent and drags them along the hammer's path.
- **Wall slams:** dragged opponents take damage when slammed into the arena wall (max **3 wall hits** per throw, then grab breaks).
- **Return impact:** if the dragged opponent is pulled into Thor on the return trip, they take bonus impact damage.
- **Missed return:** if they never reach Thor, the grab releases and Mjolnir flies back alone.
- **Melee:** body contact while holding the hammer (not thrown) also deals damage.

### Hulk — Smash

- High HP brawler.
- Deals heavy damage on body contact when his smash cooldown is ready.

---

## Games Home Features

The **Games** home screen (`hub.html`) includes:

- **Game grid** — Marvel Guess Who and Marvel Brawl (more slots coming soon)
- **Latest Update** — fetches the current build note from `version.json`
- **Settings (gear icon)** — run headless Marvel Brawl simulations (1–1000 fights) to check hero win rates

---

## Project Structure

```
index.html          Entry redirect → hub.html (with cache-bust version)
hub.html            Games home, Guess Who, settings & simulator
brawl.html          Marvel Brawl game
marvel-brawl.html   Redirect stub → brawl.html
brawl-sim.js        Headless simulator (shared hero stats with brawl.html)
version.json        Build version + latest update note
sw.js               Service worker for mobile cache clearing
.github/workflows/  GitHub Actions auto-deploy to Pages
```

There is no build step, bundler, or framework. Each game is self-contained HTML with inline CSS/JS.

---

## Run Locally

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000

---

## Deployment

Pushes to `main` automatically deploy to GitHub Pages via GitHub Actions (`.github/workflows/deploy-pages.yml`).

Repo setting required: **Settings → Pages → Source: GitHub Actions**

Check deploy status in the repo **Actions** tab.

---

## Mobile Cache Busting

The site auto-updates on mobile without a hard refresh:

- Versioned URLs (`?v=BUILD`) on all pages and assets
- `version.json` polled every 20 seconds and when the tab becomes visible
- Service worker clears stale caches when the build changes
- **Latest Update** box on the Games home confirms which build is live

---

## Balance Testing

Run simulations from the Games home **Settings** panel, or from the command line:

```bash
node -e "
globalThis.performance = { now: () => Date.now() };
require('./brawl-sim.js');
const r = globalThis.BrawlSim.runBatch(1000);
const t = r.count - r.timeouts;
for (const [id, w] of Object.entries(r.wins)) {
  console.log(id, (100 * w / t).toFixed(1) + '%');
}
"
```

Hero stats live in both `brawl.html` and `brawl-sim.js` — keep them in sync when balancing.

---

## Roadmap Ideas

Character concepts discussed for future roster expansion:

- Spider-Man (web snare / wall bonus)
- Black Widow (stun dash)
- Doctor Strange (portal swap)
- Scarlet Witch (chaos zone)
- Vision (density shift / shockwave)
- Black Panther (stacking daggers)
- Ant-Man (shrink strike)
- Storm (delayed lightning)
- Wolverine (lunge + heal)
- Loki (decoy + blink)

---

## License

Personal project — play and fork freely.
