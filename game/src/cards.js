// Emberclash — the card catalogue. Every card is one of four suits, each with
// its own job: Flame burns the rival, Tide mends you, Gale draws and nips,
// Stone raises armour that soaks damage before life does. A card's whole
// effect is its suit plus its power number, so it reads at thumbnail size.
import { SUIT } from './config.js';

/**
 * A card definition: id, suit, cost in mana, power, and the one-line text the
 * card itself prints. Effects are resolved in world.js from suit + power.
 */
export const CARD_DEFS = [
  { id: 'ember-strike', name: 'Ember Strike', suit: 'flame', cost: 1, power: 4, text: 'Deal 4 damage.' },
  { id: 'cinder-jab', name: 'Cinder Jab', suit: 'flame', cost: 2, power: 6, text: 'Deal 6 damage.' },
  { id: 'wildfire', name: 'Wildfire', suit: 'flame', cost: 3, power: 8, text: 'Deal 8 damage.' },
  { id: 'inferno', name: 'Inferno', suit: 'flame', cost: 5, power: 13, text: 'Deal 13 damage.' },
  { id: 'spring-water', name: 'Spring Water', suit: 'tide', cost: 1, power: 3, text: 'Restore 3 life.' },
  { id: 'deep-current', name: 'Deep Current', suit: 'tide', cost: 2, power: 5, text: 'Restore 5 life.' },
  { id: 'moonwell', name: 'Moonwell', suit: 'tide', cost: 4, power: 9, text: 'Restore 9 life.' },
  { id: 'swift-gust', name: 'Swift Gust', suit: 'gale', cost: 1, power: 2, text: 'Deal 2 damage. Draw 1.' },
  { id: 'zephyr', name: 'Zephyr', suit: 'gale', cost: 2, power: 0, text: 'Draw 2 cards.' },
  { id: 'storm-call', name: 'Storm Call', suit: 'gale', cost: 3, power: 6, text: 'Deal 6 damage. Draw 2.' },
  { id: 'stonewall', name: 'Stonewall', suit: 'stone', cost: 1, power: 3, text: 'Gain 3 armour.' },
  { id: 'granite-guard', name: 'Granite Guard', suit: 'stone', cost: 2, power: 5, text: 'Gain 5 armour. Deal 2.' },
  { id: 'bulwark', name: 'Bulwark', suit: 'stone', cost: 3, power: 7, text: 'Gain 7 armour.' },
];

export const DEFS_BY_ID = new Map(CARD_DEFS.map((def) => [def.id, def]));

/** How many copies of each card go into a fresh 26-card deck. */
const DECK_LIST = [
  ['ember-strike', 3], ['cinder-jab', 2], ['wildfire', 2], ['inferno', 1],
  ['spring-water', 3], ['deep-current', 2], ['moonwell', 1],
  ['swift-gust', 3], ['zephyr', 2], ['storm-call', 1],
  ['stonewall', 3], ['granite-guard', 2], ['bulwark', 1],
];

/** A shuffled deck: an array of fresh card instances {uid, defId}. */
export function buildDeck(random) {
  const deck = [];
  let uid = 0;
  for (const [defId, copies] of DECK_LIST) {
    for (let copy = 0; copy < copies; copy += 1) deck.push({ uid: uid++, defId });
  }
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [deck[index], deck[other]] = [deck[other], deck[index]];
  }
  return deck;
}

export function defOf(card) {
  return DEFS_BY_ID.get(card.defId);
}

export function suitOf(card) {
  return SUIT[defOf(card).suit];
}

/** Short effect line used in the log, e.g. "Wildfire burns 7". */
export function effectLine(card) {
  const def = defOf(card);
  const suit = SUIT[def.suit];
  if (def.suit === 'flame') return `${def.name} ${suit.verb.toLowerCase()}s ${def.power}`;
  if (def.suit === 'tide') return `${def.name} mends ${def.power}`;
  if (def.suit === 'stone') return `${def.name} guards ${def.power}`;
  return `${def.name} gusts ${def.power > 0 ? `${def.power} + draws` : 'and draws'}`;
}
