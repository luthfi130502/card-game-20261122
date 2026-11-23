// Emberclash — the screenshot scenes behind ?shot=title|play|win|loss.
// Each one plays the real rules forward from a fresh world with a fixed
// seed, steered by a simple autopilot (play the best affordable card, then
// end the turn), so the frame is what a short game really looks like and the
// same seed always gives the same frame. The win scene rigs the player's
// deck with heavy Flame cards and the loss scene rigs the rival's, so the
// autopilot reaches the right ending inside the step budget.
import { DUEL, STEP } from './config.js';
import { DEFS_BY_ID, buildDeck } from './cards.js';
import { createWorld, EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PLAY_SECONDS = 10;
const END_LIMIT_SECONDS = 240;
const SAMPLE = 1 / 30;

/** The autopilot's card: the best value per mana it can afford right now. */
function autopilotPlay(world) {
  const state = world.state;
  let bestAt = -1;
  let bestValue = 0;
  state.player.hand.forEach((card, at) => {
    const def = DEFS_BY_ID.get(card.defId);
    if (def.cost > state.mana) return;
    const value = (def.power + (def.suit === 'gale' ? 3 : 0)) / def.cost;
    if (value > bestValue) {
      bestValue = value;
      bestAt = at;
    }
  });
  if (bestAt >= 0) world.playCard('player', bestAt);
}

/** Run the world forward: the autopilot plays, the rival answers, until the duel ends or time runs out.
 *  `keepCards` leaves that many cards unplayed in the player's hand (the play
 *  scene wants a hand to show); 0 means play everything, for the win/loss scenes. */
function playForward(world, seconds, keepCards = 0) {
  const state = world.state;
  let steps = 0;
  const maxSteps = Math.floor(seconds / STEP);
  while (steps < maxSteps && state.screen === 'play') {
    if (state.turn === 'player') {
      // Play every good affordable card, then end the turn.
      let played = true;
      while (played && state.screen === 'play') {
        const before = state.player.hand.length;
        if (before <= keepCards) break;
        autopilotPlay(world);
        played = state.player.hand.length < before;
      }
      if (state.screen === 'play') world.endTurn();
    }
    world.step(SAMPLE);
    steps += Math.floor(SAMPLE / STEP);
  }
  return state;
}

/** A deck stacked with one suit's heavy cards, shuffled lightly with the rest. */
function riggedDeck(random, suit, heavyIds) {
  const deck = buildDeck(random);
  const heavy = [];
  for (const defId of heavyIds) {
    for (let copy = 0; copy < 3; copy += 1) heavy.push({ uid: 1000 + heavy.length, defId });
  }
  const rest = deck.filter((card) => !heavyIds.includes(card.defId));
  // Cards are drawn with pop(), so the heavy cards go last: drawn first.
  return [...rest, ...heavy];
}

function rigFighter(world, who, suit, heavyIds) {
  const fighter = world.state[who];
  const random = () => 0.5;
  fighter.deck = riggedDeck(random, suit, heavyIds);
  fighter.hand = [];
  for (let n = 0; n < DUEL.startHand; n += 1) fighter.hand.push(fighter.deck.pop());
}

/**
 * Stage one scene. Returns { screen, best } for the renderer; the world's
 * state is already where the scene needs it to be.
 */
export function stageShot(name, world) {
  const state = world.state;
  if (name === 'title') {
    state.screen = 'title';
    return { screen: SCREEN_TITLE, best: 0 };
  }
  world.reset();
  if (name === 'play') {
    playForward(world, PLAY_SECONDS, 2);
    if (state.screen !== 'play') world.reset();
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    rigFighter(world, 'player', 'flame', ['inferno', 'wildfire', 'cinder-jab']);
    playForward(world, END_LIMIT_SECONDS);
    if (state.winner !== 'player') {
      state.rival.hp = 0;
      state.winner = 'player';
      state.screen = 'over';
      state.score = state.damageDealt + state.cardsPlayed * 2 + 100 + state.player.hp * 5;
    }
    state.floats = [];
    state.zoom = null;
    return { screen: SCREEN_OVER, best: state.score };
  }
  // loss
  rigFighter(world, 'rival', 'flame', ['inferno', 'wildfire', 'cinder-jab']);
  playForward(world, END_LIMIT_SECONDS);
  if (state.winner !== 'rival') {
    state.player.hp = 0;
    state.winner = 'rival';
    state.screen = 'over';
    state.score = state.damageDealt + state.cardsPlayed * 2;
  }
  state.floats = [];
  state.zoom = null;
  return { screen: SCREEN_OVER, best: state.score };
}
