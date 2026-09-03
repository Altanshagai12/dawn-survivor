# Dawn Survivor

An original ten-minute top-down survival shooter for Usion. The game uses
original characters and assets while preserving the deliberate aim-and-fire,
random upgrade, boss chest, and escalating horde loop of the short-form genre.

## Run locally

```powershell
npm start
```

Open `http://localhost:4173`. Outside Usion, a safe local SDK adapter is used.

## Test

```powershell
npm run check
```

## Controls

- Desktop: WASD/arrow keys to move, hold left mouse to aim and shoot, `R` to reload.
- Touch: left stick moves; right stick aims and fires.
- Survive exactly 10:00, collect embers, choose upgrades, and defeat bosses.

## Usion contract

Path B static game. It loads only the official Usion SDK and platform-hosted
Phaser runtime, starts after `Usion.init`, stores progression with
`Usion.storage`, and submits survival duration in milliseconds with
`Usion.leaderboard.submit` so longer runs rank higher.

## Replay regression check

Run `node scripts/serve-replay-test.mjs` and open `http://127.0.0.1:4174`.
Click **Run weapon-skin replay suite**. The local-only fixture exercises the real
Phaser scenes and start/replay buttons through 25 moving/firing runs: all eight
weapon skins, four original heroes, and switching back to a previously used skin.
Every run asserts the original hero (weaponless variant for a skin), the selected
weapon skin, and all 48 live animation frames; premium hero atlases never load.
It uses a no-op platform adapter, so test results never reach the leaderboard.
Repeat at a phone landscape viewport (for example 844 × 390). This is browser
viewport coverage, not a substitute for a physical iOS WebView check.
For a Mongolian phone-layout preview, open
`http://127.0.0.1:4174/?preview&phone&lang=mn` at 390 × 724. The local fixture
emulates the coarse-pointer media query to exercise the real automatic CSS
rotation and carousel input path; it does not change production device detection.

For hand-attachment visual QA, add `&pose` to that local preview URL. Choose a
hero, gun and skin, click **Show held weapon**, then inspect all eight directions
and six frames. Choose **Big Shot** and **Hitboxes** to compare the measured
the opaque core, softer outer glow and physics radius with and without a skin.
The fixture also measures aura/core alignment at postrender. The inset magnifies
the actual game framebuffer, not separate preview art. Weaponless source sheets and generation prompts are retained in
`assets/sprites/heroes/weaponless/source/`; import with
`node scripts/import-weaponless-heroes.mjs`.

## Weapon skins and loadout

Heroes always use their original body, animations, hitbox, and personal ability.
The loadout groups four heroes in a left-hand rail and four weapons in a larger
2×2 grid. Select a weapon, then swipe its image or use its arrows/Left/Right keys
to equip a skin. The neighboring skins remain visible in its carousel. The sound
button auditions that weapon's firing report.
Hero and weapon headings sit outside their groups so both bordered areas share
the same top and bottom edges. Hero name, HP and a concise localized ability
description stay visible on touch screens without hovering. Save feedback
appears only when a retry is needed.

Each of the four weapons independently saves an original or one of eight premium
styles in `equippedWeaponSkins`. Changing hero does not change weapon skins.
On the first load of an old profile, its selected hero's old skin is carried to
all four weapons. Once the new map exists, legacy hero selections never override it.
The choice changes weapon art, muzzle/projectile/trail/impact/reload presentation,
and firing audio only; hero cosmetics are no longer loaded or shown.
Skin and original shots share damage, velocity, lifetime, spread, count, and
collision radius. Front shots use the original 26-unit launch offset per pellet,
rear shots 22; cosmetic hand/barrel poses never change the ballistic path.
All projectile hit radii are now 1.25 times the original size/2 for equal aim
forgiveness (base revolver/shotgun/crossbow/flame radii: 5/3.75/5.625/8.125).
Each skin's opaque projectile core fits inside that shared hit circle, including
Big Shot and Magic Lens builds. Its softer outer energy is the exact arithmetic
midpoint of the pre-parity fb2dc15 and tight 19a7bed art scales; this layer follows
the real projectile and vanishes on impact/expiry, never adding damage or reach.
Muzzle and impact sizes also split the two released scales. Faint trails are
decorative; muzzle flashes stay attached to the held gun.
All 51 upgrades feed an authored presentation recipe, including rear/fan fire,
splinters, ricochets, piercing, summons, elemental statuses, and Tomes. The current production trial uses
`SKIN_ACCESS_MODE = 'free-preview'`: every pack can be equipped without a wallet
request, while the choice is saved with `Usion.storage` across devices. Free
preview does not grant a durable paid entitlement.

Gameplay VFX use generated transparent 4×4 atlases rendered through the existing
Phaser 4.2.1 WebGL pipeline. Effects are pooled and capped separately from base
combat VFX; mobile uses lower particle and audio-polyphony budgets. Only the
equipped VFX atlas, weapon image, and firing-audio bank are loaded for a run. Three.js is
intentionally not loaded because Usion supports one game engine per service and
mixing a second renderer would break the platform runtime contract.

The dormant paid path fails closed: the game checks the receipt service before it opens the
Usions confirmation dialog. `Usion.wallet.requestPayment` creates the escrow;
`api/purchase-skin.js` verifies the exact service + SKU amount and settles it.
The game never imports or calls this commerce path while free-preview mode is active.

Deploy the repository to Vercel for the settlement function and configure:

- `USION_SERVICE_ID` — the registered Dawn Survivor service id (required).
- `USION_API_BASE` — optional; defaults to `https://mobile.mongolai.mn`.
- `DAWN_ALLOWED_ORIGINS` — optional comma-separated origins; defaults to the
  production GitHub Pages and Vercel origins.

If the Vercel project uses another domain, update `SKIN_PURCHASE_ENDPOINT` in
`src/data/skins.js` before publishing. Catalog SKU prices are intentionally unique
so a settled stateless receipt cannot be replayed for another cosmetic SKU.
The new carousel is free-preview only; paid purchase UI is not exposed.

The eight choices are the existing four hunters' two packs, shared across every gun
(plus Original), not six newly authored packs per weapon. Each pack retains its own
weapon audio and VFX artwork; animation/timing recipes remain shared.
Weapon-art repair sources and the alpha-preserving importer are documented in
`assets/skins/premium/weapon-sheets/README.md`.
