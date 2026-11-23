// Emberclash — keyboard and pointer input. Held keys are not needed here:
// every action is one-shot (play a card, end the turn, confirm, pause), so
// presses are queued as bit flags and taken once by the loop, never lost and
// never counted twice. The pointer reports its logical position each frame so
// the renderer can highlight the card under it.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;
export const ACTION_PAUSE = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const CONFIRM = new Set(['Space', 'Enter']);
const END_TURN = new Set(['KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
const DIGITS = new Map([
  ['Digit1', 0], ['Digit2', 1], ['Digit3', 2], ['Digit4', 3],
  ['Digit5', 4], ['Digit6', 5], ['Digit7', 6],
]);

export function createInput(canvas) {
  let actions = 0;
  let cardKey = -1;
  const pointer = { x: -1, y: -1, clicked: false, clickX: -1, clickY: -1 };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (DIGITS.has(event.code)) {
      if (!event.repeat) cardKey = DIGITS.get(event.code);
    } else return;
    event.preventDefault();
  });

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const point = toLogical(event);
    pointer.x = point.x;
    pointer.y = point.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    pointer.clicked = true;
    pointer.clickX = point.x;
    pointer.clickY = point.y;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.x = -1;
    pointer.y = -1;
  });

  return {
    pointer,
    /** One-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** A digit-key card index pressed since the last call, or -1. */
    takeCardKey() {
      const taken = cardKey;
      cardKey = -1;
      return taken;
    },
    /** A pointer click since the last call, as logical {x, y}, or null. */
    takeClick() {
      if (!pointer.clicked) return null;
      pointer.clicked = false;
      return { x: pointer.clickX, y: pointer.clickY };
    },
  };
}
