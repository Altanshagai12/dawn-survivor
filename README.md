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

## Premium skin preview

Each hunter has one original premium cosmetic pack. A pack changes the loadout
art, hero tint/aura, every core weapon's projectile/tracer/impact motif, weapon
timbre, and hero intro/hit/ability voice cues. The current production trial uses
`SKIN_ACCESS_MODE = 'free-preview'`: every pack can be equipped without a wallet
request, while the choice is saved with `Usion.storage` across devices. Free
preview does not grant a durable paid entitlement.

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
`src/data/skins.js` before publishing. Current catalog prices are 240, 250, 260,
and 270 Usions credits; they are intentionally unique so a settled stateless
receipt cannot be replayed for another cosmetic SKU.
