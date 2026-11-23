// Emberclash — a small seeded random source, so a fixed ?seed= replays the
// same duel and the screenshot scenes are reproducible.
/** mulberry32: a tiny deterministic generator from one 32-bit seed. */
export function createRandom(seed) {
  let value = seed >>> 0;
  return function random() {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
