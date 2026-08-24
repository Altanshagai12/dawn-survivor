# Lessons

- Production iframe input must be tested with the canvas offset and host header present; standalone full-page coordinates are not sufficient.
- A survival-game smoke test must run beyond the early spawn ramp on both desktop and mobile-sized viewports, while checking console errors and entity-count bounds.
- A combat smoke test must make a projectile actually collide with and kill an enemy; firing bullets, idling, or receiving damage does not cover post-destruction collision callbacks.
- Sprite-atlas QA must render every hero and boss frame inside Phaser; file dimensions and contact-sheet inspection alone do not catch runtime frame artifacts or overlapping visual effects.
