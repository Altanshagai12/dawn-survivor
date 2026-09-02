# Original heroes, separate weapon layer

The four original hero atlases contained weapons painted into their frames.
These sibling atlases remove those weapons while preserving each hero's
identity and the original 6-column / 8-row frame geometry. They are used only
when a weapon skin is selected; vanilla runs keep the original atlas.

The built-in image generation tool edited the original atlases. The source
technical-matte sheets and exact prompt set are retained in `source/`.
Import with `node scripts/import-weaponless-heroes.mjs`. Only the explicitly
authored green matte is removed; dark clothing stays opaque. The entire grid
is resampled to the original dimensions without per-frame trimming or
recentering. Runtime hitbox, movement and projectile math are unchanged.

`WeaponHandAnchors.js` calibrates hands against these edited frames, and
`SkinPresentation.js` attaches a single independent aiming weapon at that
point. Visual QA must inspect all displayed directions at phone scale, not
merely assert texture keys or alpha coverage.
