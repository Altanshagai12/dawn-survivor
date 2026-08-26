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
