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
Legacy free-trial choices never grant paid ownership. Valid weapon preferences
are retained, but a skin only equips after authenticated server ownership restores.
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
splinters, ricochets, piercing, summons, elemental statuses, and Tomes. Original
weapons remain free. Every weapon skin costs **500₮**, or **1,000₮ for all four
weapons of one theme**. Pictures/audio remain free to preview. The purchase modal
shows all four weapons and their owned state; owning three hides the costlier
bundle so the remaining individual weapon can be bought for 500₮.

Gameplay VFX use generated transparent 4×4 atlases rendered through the existing
Phaser 4.2.1 WebGL pipeline. Effects are pooled and capped separately from base
combat VFX; mobile uses lower particle and audio-polyphony budgets. Only the
equipped VFX atlas, weapon image, and firing-audio bank are loaded for a run. Three.js is
intentionally not loaded because Usion supports one game engine per service and
mixing a second renderer would break the platform runtime contract.

### Wallet store deployment

Gameplay remains a static GitHub Pages deployment. Checkout uses the **generic
Usions commerce API**, not a new Vercel/Railway game service. Deployment order:

1. Deploy the platform commerce/order endpoints, reserved-key wallet binding and
   indexes, including settlement's exact user/amount/service validation.
2. Generate the game-owned catalog using `node scripts/print-skin-catalog.mjs`.
   It contains 32 individual products and 8 bundles. As this service's owner,
   PUT that JSON to `/commerce/{serviceId}/catalog` using existing service-owner
   authentication. No game catalog data belongs in the platform repository.
3. Verify the authenticated `/commerce/{serviceId}/state` response reports the
   exact version, 500/1000 prices and grants from `src/data/skinProducts.js`.
4. Deploy the game and verify mobile/web previews and free gameplay. Any real
   purchase test needs the user's explicit amount confirmation; do not auto-charge.

The client fails closed when identity/backend/catalog validation is unavailable,
while free gameplay and image/audio previews still work. `requestPayment` uses
the frozen server order's amount/key and the existing host's confirmation and
wallet-recharge UI. A low balance must not be prechecked in the game: that would
hide the host's Recharge action. No new native/OTA SDK method is needed.

Ownership lives in server-only commerce accounts, not `ownedSkins`, cloud KV or
local storage. Scoped identity and exact transaction/order binding prevent price,
SKU and purchaser substitution. A lost callback/receipt is recovered from the
server's order/debit on refresh without charging again. Unpaid orders can be
cancelled; settled purchases remain owned if saving the equip preference fails.
The old `api/purchase-skin.js` is not called by the new store. Its original unique
pack receipt amounts are preserved solely for compatibility, independent of the
new equal-priced products.

For payment-free browser QA, open `/tests/weapon-store-preview.html?phone=1` at
390×724. This fixture uses an in-memory protocol simulator; it never contacts the
wallet. `npm test` also exercises duplicate clicks, rejected/forged order data,
callback loss, storage/network failures and cross-device restore without money.

The eight choices are the existing four hunters' two packs, shared across every gun
(plus Original), not six newly authored packs per weapon. Each pack retains its own
weapon audio and VFX artwork; animation/timing recipes remain shared.
Weapon-art repair sources and the alpha-preserving importer are documented in
`assets/skins/premium/weapon-sheets/README.md`.
