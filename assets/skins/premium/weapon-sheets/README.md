# Restored weapon artwork

These three imagegen-edited sheets restore the existing Bloodmoon, Obsidian Eclipse,
and Chrono Kitsune designs from their original collection PNGs. They are not new skins.
The built-in image generator returned a drawn checkerboard instead of actual alpha;
the second edit replaced that background with an explicit green technical matte.
Full prompts are in `prompts.json`. Original generation outputs remain outside the repo.

Run `node scripts/import-weapon-art.mjs` from the game repository to rebuild the 12
768x384 lossless WebP weapon files. The importer removes only this explicit green
matte, preserves dark interiors and detached ornaments, trims by alpha, centers each
complete silhouette, and validates every cell before writing any live asset.
`scripts/extract-skin-weapon-art.mjs` redirects to the same safe import path.
The other 20 weapon files are unchanged. Never run dark-pixel background removal.

Verification: all 32 gun/skin images were inspected in the CSS-rotated 390x724 phone
preview; repaired collections also checked at 844x390 and 859x912. This is browser emulation,
not a physical iPhone test. The regression suite checks silhouette occupancy and
centering in addition to image dimensions. Audio/effect identity tests verify 32
distinct gun WAV banks, 8 event banks, 8 VFX atlases, and 32 projectile cells.
All 180 automated tests pass. The real Phaser phone-fallback harness also passed
25 move/fire/replay runs with no runtime errors and no premium hero textures.
