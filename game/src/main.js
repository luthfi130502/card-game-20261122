// Emberclash — boot and the one loop: input is read every frame, the world
// advances in fixed 1/60 s steps, and the renderer paints what is there. The
// game moves between four screens: title, play, paused and game over.
//
// ?seed=N fixes the duel's shuffle. ?shot=title|play|win|loss (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_DAMAGE, EVENT_HEAL, EVENT_OVER, EVENT_PLAYED } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_END_TURN,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RESTART,
  createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { SOUND, setMuted, unlockAudio } from './audio.js';
import { defOf } from './cards.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { x: -1, y: -1 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Your turn — play a card or end the turn.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (world.state.winner === 'player') SOUND.win();
    else SOUND.lose();
    announce(world.state.winner === 'player'
      ? `Victory! Score ${world.state.score}. Best ${best}.`
      : `Defeat. Score ${world.state.score}. Best ${best}.`);
  }

  function playSoundFor(events) {
    if (events & EVENT_OVER) return;
    if (events & EVENT_DAMAGE) SOUND.hit();
    else if (events & EVENT_HEAL) SOUND.heal();
    else if (events & EVENT_PLAYED) SOUND.play();
  }

  function handleClicks() {
    const click = input.takeClick();
    if (click === null) return;
    unlockAudio();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const hit = renderer.hitTest(world.state, click.x, click.y);
    if (hit === null) return;
    if (hit.type === 'endTurn') {
      if (world.state.turn === 'player') {
        world.endTurn();
        SOUND.turn();
        announce('Rival thinking.');
      }
      return;
    }
    if (hit.type === 'card' && world.state.turn === 'player') {
      const card = world.state.player.hand[hit.index];
      const events = world.playCard('player', hit.index);
      if (events !== 0) {
        playSoundFor(events);
        if (events & EVENT_OVER) endGame();
        else announce(`Played ${defOf(card).name}. ${world.state.mana} mana left.`);
      }
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const cardKey = input.takeCardKey();
    if (actions & ACTION_MUTE) {
      world.state.muted = !world.state.muted;
      setMuted(world.state.muted);
      announce(world.state.muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      unlockAudio();
      startGame();
      SOUND.click();
    } else if (actions & ACTION_RESTART && screen === SCREEN_OVER) {
      unlockAudio();
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_END_TURN && screen === SCREEN_PLAY && world.state.turn === 'player') {
      world.endTurn();
      SOUND.turn();
      announce('Rival thinking.');
    }
    if (cardKey >= 0 && screen === SCREEN_PLAY && world.state.turn === 'player') {
      const card = world.state.player.hand[cardKey];
      if (card) {
        const events = world.playCard('player', cardKey);
        if (events !== 0) {
          playSoundFor(events);
          if (events & EVENT_OVER) endGame();
        }
      }
    }
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP);
    if (events & EVENT_OVER) {
      endGame();
      return;
    }
    if (events & EVENT_DAMAGE) SOUND.hit();
    else if (events & EVENT_HEAL) SOUND.heal();
    else if (events & EVENT_PLAYED) SOUND.play();
    if (world.state.turn === 'player' && events !== 0) announce('Your turn.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleClicks();
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, input.pointer);
  }

  // Leaving the tab pauses a running game rather than letting the rival play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A handle for play-testing: the live state, read-only from the console.
  window.__ember = { world, get screen() { return screen; }, get best() { return best; } };

  announce('Emberclash. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
