import assert from 'node:assert/strict';
import test from 'node:test';

import { landscapeViewportSize } from '../src/ui/orientation.js';

test('portrait mobile fallback swaps the viewport into landscape dimensions', () => {
  assert.deepEqual(
    landscapeViewportSize({ width: 390, height: 844, mobilePortrait: true }),
    { width: 844, height: 390 },
  );
});

test('landscape and desktop viewports keep their native dimensions', () => {
  assert.deepEqual(
    landscapeViewportSize({ width: 844, height: 390, mobilePortrait: false }),
    { width: 844, height: 390 },
  );
  assert.deepEqual(
    landscapeViewportSize({ width: 1440, height: 900, mobilePortrait: false }),
    { width: 1440, height: 900 },
  );
});
