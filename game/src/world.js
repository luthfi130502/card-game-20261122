// Emberclash — the duel itself, with no drawing and no browser in it: decks,
// hands, mana, armour, the rival's thinking, score and who won. step() moves
// the rival's turn along in real time; the player's moves are method calls.
// Every effect is resolved here from a card's suit and power (see cards.js).
import { CARD, DUEL, TIMING } from './config.js';
import { buildDeck, defOf, effectLine } from './cards.js';

export const EVENT_PLAYED = 1;
export const EVENT_DAMAGE = 2;
export const EVENT_HEAL = 4;
export const EVENT_OVER = 8;

function makeFighter(random) {
  return {
    hp: DUEL.maxHp,
    armor: 0,
    deck: buildDeck(random),
    hand: [],
    discard: [],
  };
}

export function createWorld(random) {
  const state = {
    screen: 'title',
    turn: 'player',
    turnNumber: 1,
    mana: 1,
    manaMax: 1,
    player: makeFighter(random),
    rival: makeFighter(random),
    log: [],
    floats: [],
    zoom: null,
    zoomTimer: 0,
    rivalTimer: 0,
    rivalActed: false,
    winner: null,
    score: 0,
    damageDealt: 0,
    cardsPlayed: 0,
    muted: false,
  };

  function say(line) {
    state.log.unshift(line);
    if (state.log.length > 5) state.log.length = 5;
  }

  function drawCards(fighter, count) {
    for (let n = 0; n < count; n += 1) {
      if (fighter.deck.length === 0) {
        if (fighter.discard.length === 0) return;
        fighter.deck = fighter.discard;
        fighter.discard = [];
        for (let i = fighter.deck.length - 1; i > 0; i -= 1) {
          const j = Math.floor(random() * (i + 1));
          [fighter.deck[i], fighter.deck[j]] = [fighter.deck[j], fighter.deck[i]];
        }
        say('Deck reshuffled.');
      }
      if (fighter.hand.length >= DUEL.maxHand) return;
      fighter.hand.push(fighter.deck.pop());
    }
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: TIMING.floatLife });
  }

  function dealDamage(target, amount, fromPlayer) {
    const soaked = Math.min(target.armor, amount);
    target.armor -= soaked;
    const rest = amount - soaked;
    target.hp = Math.max(0, target.hp - rest);
    if (fromPlayer) state.damageDealt += rest;
    return { soaked, dealt: rest };
  }

  function resolveCard(owner, target, card) {
    const def = defOf(card);
    const me = owner === 'player' ? state.player : state.rival;
    const foe = owner === 'player' ? state.rival : state.player;
    let events = EVENT_PLAYED;
    if (def.suit === 'flame') {
      const hit = dealDamage(foe, def.power, owner === 'player');
      if (hit.dealt > 0) addFloat(foe === state.rival ? 960 : 320, 300, `-${hit.dealt}`, '#ff5a3c');
      if (hit.soaked > 0) say(`Armour soaked ${hit.soaked}.`);
      events |= EVENT_DAMAGE;
    } else if (def.suit === 'tide') {
      const healed = Math.min(def.power, DUEL.maxHp - me.hp);
      me.hp += healed;
      if (healed > 0) addFloat(owner === 'player' ? 320 : 960, 300, `+${healed}`, '#2fa8ff');
      events |= EVENT_HEAL;
    } else if (def.suit === 'gale') {
      if (def.power > 0) {
        const hit = dealDamage(foe, def.power, owner === 'player');
        if (hit.dealt > 0) addFloat(foe === state.rival ? 960 : 320, 300, `-${hit.dealt}`, '#37d67a');
        events |= EVENT_DAMAGE;
      }
      drawCards(me, def.id === 'zephyr' ? 2 : def.id === 'storm-call' ? 2 : 1);
    } else if (def.suit === 'stone') {
      me.armor += def.power;
      if (def.id === 'granite-guard') {
        const hit = dealDamage(foe, 2, owner === 'player');
        if (hit.dealt > 0) addFloat(foe === state.rival ? 960 : 320, 300, `-${hit.dealt}`, '#e8b23a');
        events |= EVENT_DAMAGE;
      }
    }
    say(`${owner === 'player' ? 'You' : 'Rival'}: ${effectLine(card)}.`);
    return events;
  }

  /** Play the card at hand index `at` for `owner`, if the mana is there. */
  function playCard(owner, at) {
    const me = owner === 'player' ? state.player : state.rival;
    if (at < 0 || at >= me.hand.length) return 0;
    const card = me.hand[at];
    const def = defOf(card);
    if (def.cost > state.mana) return 0;
    state.mana -= def.cost;
    me.hand.splice(at, 1);
    me.discard.push(card);
    state.cardsPlayed += 1;
    state.zoom = card;
    state.zoomTimer = TIMING.zoomHold;
    const events = resolveCard(owner, owner === 'player' ? 'rival' : 'player', card);
    state.score = state.damageDealt + state.cardsPlayed * 2;
    if (state.rival.hp === 0 || state.player.hp === 0) {
      state.winner = state.rival.hp === 0 ? 'player' : 'rival';
      state.screen = 'over';
      state.score = state.damageDealt + state.cardsPlayed * 2
        + (state.winner === 'player' ? 100 + state.player.hp * 5 : 0);
      say(state.winner === 'player' ? 'Victory!' : 'Defeat.');
      return events | EVENT_OVER;
    }
    return events;
  }

  /** How much the rival wants this card right now: attack when you are weak, mend when it is hurt. */
  function rivalValue(card) {
    const def = defOf(card);
    const rivalHp = state.rival.hp;
    const playerHp = state.player.hp;
    if (def.suit === 'flame') return def.power * (playerHp <= 8 ? 1.6 : 1) + 1;
    if (def.suit === 'tide') return rivalHp <= 12 ? def.power * 1.5 : def.power * 0.4;
    if (def.suit === 'gale') return def.power + 3;
    return def.power * (state.player.hp >= 15 ? 0.9 : 0.5) + 1;
  }

  function rivalAct() {
    const hand = state.rival.hand;
    let bestAt = -1;
    let bestValue = 0;
    for (let at = 0; at < hand.length; at += 1) {
      const def = defOf(hand[at]);
      if (def.cost > state.mana) continue;
      const value = rivalValue(hand[at]) / def.cost;
      if (value > bestValue) {
        bestValue = value;
        bestAt = at;
      }
    }
    if (bestAt === -1) return 0;
    return playCard('rival', bestAt);
  }

  function startTurn(who) {
    state.turn = who;
    state.turnNumber += who === 'player' ? 1 : 0;
    if (who === 'player') {
      state.manaMax = DUEL.manaForTurn(state.turnNumber);
      state.mana = state.manaMax;
      drawCards(state.player, 1);
      say(`Turn ${state.turnNumber} — ${state.mana} mana.`);
    } else {
      state.manaMax = DUEL.manaForTurn(state.turnNumber);
      state.mana = state.manaMax;
      drawCards(state.rival, 1);
      state.rivalTimer = TIMING.rivalThink;
      state.rivalActed = false;
    }
  }

  function reset() {
    state.player = makeFighter(random);
    state.rival = makeFighter(random);
    state.screen = 'play';
    state.turn = 'player';
    state.turnNumber = 1;
    state.manaMax = DUEL.manaForTurn(1);
    state.mana = state.manaMax;
    state.log = ['The duel begins. Your move.'];
    state.floats = [];
    state.zoom = null;
    state.zoomTimer = 0;
    state.winner = null;
    state.score = 0;
    state.damageDealt = 0;
    state.cardsPlayed = 0;
    drawCards(state.player, DUEL.startHand);
    drawCards(state.rival, DUEL.startHand);
  }

  /** End the player's turn; the rival plays, then a new turn starts. */
  function endTurn() {
    if (state.screen !== 'play' || state.turn !== 'player') return 0;
    startTurn('rival');
    return 0;
  }

  /** Advance timers, floats and the rival's turn. Returns event flags. */
  function step(dt) {
    let events = 0;
    for (const float of state.floats) float.life -= dt;
    state.floats = state.floats.filter((float) => float.life > 0);
    if (state.zoomTimer > 0) {
      state.zoomTimer -= dt;
      if (state.zoomTimer <= 0) state.zoom = null;
    }
    if (state.screen !== 'play' || state.turn !== 'rival') return events;
    state.rivalTimer -= dt;
    if (state.rivalTimer > 0) return events;
    state.rivalTimer = TIMING.rivalThink;
    const acted = rivalAct();
    events |= acted;
    if (acted & EVENT_OVER || state.screen === 'over') return events;
    if (!state.rivalActed) state.rivalActed = true;
    const affordable = state.rival.hand.some((card) => defOf(card).cost <= state.mana);
    if (!affordable) {
      startTurn('player');
    }
    return events;
  }

  return { state, reset, playCard, endTurn, step, startTurn, say, drawCards };
}
