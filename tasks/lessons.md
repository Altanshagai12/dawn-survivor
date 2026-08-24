# Lessons

- Production iframe input must be tested with the canvas offset and host header present; standalone full-page coordinates are not sufficient.
- A survival-game smoke test must run beyond the early spawn ramp on both desktop and mobile-sized viewports, while checking console errors and entity-count bounds.
- A combat smoke test must make a projectile actually collide with and kill an enemy; firing bullets, idling, or receiving damage does not cover post-destruction collision callbacks.
- Sprite-atlas QA must render every hero and boss frame inside Phaser; file dimensions and contact-sheet inspection alone do not catch runtime frame artifacts or overlapping visual effects.
- Transparent sprite repair must validate edge colors against the in-game background; isolated frames can be geometrically correct while pale RGB/alpha fringe still creates a white halo.
- Mobile combat input must assign each pointer to exactly one role (move stick, aim stick, or world tap) and test quick taps inside the real Usion iframe offset.
- Sprite cleanup is incomplete until every non-exempt runtime atlas is processed and its ground contact is checked in motion; fixing only the reported hero/boss examples leaves the same source-art defect in later enemy families.
- Damage immunity must be long enough to prevent stacked contact/projectile hits and must provide visible feedback for the entire immunity window, not only a short hit flash.
- Directional character QA must verify every octant after both movement and a single tap-shot; checking continuous aim alone misses facing that snaps back on the next frame.
- Fast enemies need an on-screen approach telegraph and sufficient contrast before their collision window starts; distant low alpha is not a usable warning on a dark mobile map.
- A progression upgrade is not complete when only its card exists: its projectile behavior, combat feedback, HUD feedback, and a focused test must all be wired together.
