// Emberclash — drawing only: the duel's state and the current screen in,
// pixels out. The 1280x720 table is scaled to fit the window and centred.
// Cards are drawn, not images: suit by colour AND shape, cost in a gem,
// power in a big number, so a card reads at thumbnail size.
import { CARD, DUEL, FIELD, FONT, PALETTE, SUIT } from './config.js';
import { defOf, suitOf } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const HAND_Y = 508;
const RIVAL_HAND_Y = 26;
const END_TURN = { x: 1092, y: 636, width: 164, height: 52 };
const LOG = { x: 1012, y: 210, width: 244, height: 150 };

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

/** The suit's shape, drawn in the middle of a card: flame, drop, swirl, shield. */
function drawSuitMark(context, suit, cx, cy, size, color) {
  context.fillStyle = color;
  context.strokeStyle = color;
  context.lineWidth = Math.max(3, size * 0.09);
  context.lineJoin = 'round';
  context.lineCap = 'round';
  if (suit === 'flame') {
    context.beginPath();
    context.moveTo(cx, cy - size * 0.55);
    context.bezierCurveTo(cx + size * 0.55, cy - size * 0.1, cx + size * 0.42, cy + size * 0.5, cx, cy + size * 0.5);
    context.bezierCurveTo(cx - size * 0.42, cy + size * 0.5, cx - size * 0.55, cy - size * 0.1, cx, cy - size * 0.55);
    context.fill();
    context.fillStyle = '#ffd23e';
    context.beginPath();
    context.moveTo(cx, cy - size * 0.12);
    context.bezierCurveTo(cx + size * 0.22, cy + size * 0.08, cx + size * 0.16, cy + size * 0.34, cx, cy + size * 0.34);
    context.bezierCurveTo(cx - size * 0.16, cy + size * 0.34, cx - size * 0.22, cy + size * 0.08, cx, cy - size * 0.12);
    context.fill();
  } else if (suit === 'tide') {
    context.beginPath();
    context.moveTo(cx, cy - size * 0.55);
    context.bezierCurveTo(cx + size * 0.42, cy - size * 0.05, cx + size * 0.4, cy + size * 0.5, cx, cy + size * 0.5);
    context.bezierCurveTo(cx - size * 0.4, cy + size * 0.5, cx - size * 0.42, cy - size * 0.05, cx, cy - size * 0.55);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.55)';
    context.beginPath();
    context.arc(cx - size * 0.14, cy + size * 0.12, size * 0.09, 0, Math.PI * 2);
    context.fill();
  } else if (suit === 'gale') {
    for (let arm = 0; arm < 3; arm += 1) {
      const start = (arm * Math.PI * 2) / 3;
      context.beginPath();
      context.arc(cx, cy, size * (0.5 - arm * 0.11), start, start + Math.PI * 1.15);
      context.stroke();
    }
    context.beginPath();
    context.arc(cx, cy, size * 0.1, 0, Math.PI * 2);
    context.fill();
  } else {
    context.beginPath();
    context.moveTo(cx, cy - size * 0.5);
    context.lineTo(cx + size * 0.5, cy - size * 0.28);
    context.lineTo(cx + size * 0.42, cy + size * 0.2);
    context.quadraticCurveTo(cx + size * 0.2, cy + size * 0.5, cx, cy + size * 0.55);
    context.quadraticCurveTo(cx - size * 0.2, cy + size * 0.5, cx - size * 0.42, cy + size * 0.2);
    context.lineTo(cx - size * 0.5, cy - size * 0.28);
    context.closePath();
    context.fill();
  }
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', weight = '') {
    const key = `${weight}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight} ${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** Where the player's hand cards sit, left to right, slightly fanned. */
  function handRects(count) {
    const total = count * CARD.width + (count - 1) * CARD.gap;
    const startX = (FIELD.width - total) / 2;
    const rects = [];
    for (let index = 0; index < count; index += 1) {
      const fan = count > 1 ? (index - (count - 1) / 2) * 4 : 0;
      rects.push({
        x: startX + index * (CARD.width + CARD.gap),
        y: HAND_Y + Math.abs(fan),
        width: CARD.width,
        height: CARD.height,
      });
    }
    return rects;
  }

  function drawCardFace(card, x, y, width, height, opts = {}) {
    const def = defOf(card);
    const suit = SUIT[def.suit];
    const scale = width / CARD.width;
    context.save();
    if (opts.lift) context.translate(0, -CARD.lift * scale);
    if (opts.dim) context.globalAlpha = 0.45;
    roundRect(context, x, y, width, height, 12 * scale);
    context.fillStyle = '#f7f1de';
    context.fill();
    context.lineWidth = 2 * scale;
    context.strokeStyle = suit.dark;
    context.stroke();
    context.fillStyle = suit.color;
    context.fillRect(x, y, width, 10 * scale);
    // Cost gem, top left.
    context.beginPath();
    context.arc(x + 24 * scale, y + 30 * scale, 17 * scale, 0, Math.PI * 2);
    context.fillStyle = '#7b2ff7';
    context.fill();
    context.lineWidth = 2 * scale;
    context.strokeStyle = '#e9d5ff';
    context.stroke();
    text(String(def.cost), x + 24 * scale, y + 38 * scale, 22 * scale, '#ffffff', 'center', '700');
    // Power, top right.
    text(String(def.power), x + width - 14 * scale, y + 40 * scale, 30 * scale, suit.dark, 'right', '800');
    // Suit mark, centre.
    drawSuitMark(context, def.suit, x + width / 2, y + height * 0.46, 52 * scale, suit.color);
    text(def.name, x + width / 2, y + height * 0.68, 17 * scale, '#241a12', 'center', '700');
    context.font = `${13 * scale}px ${FONT}`;
    context.fillStyle = '#5b4a35';
    context.textAlign = 'center';
    wrapText(def.text, x + 10 * scale, y + height * 0.78, width - 20 * scale, 17 * scale);
    context.restore();
  }

  function wrapText(value, x, y, maxWidth, lineHeight) {
    const words = value.split(' ');
    let line = '';
    let lineY = y;
    for (const word of words) {
      const test = line === '' ? word : `${line} ${word}`;
      if (context.measureText(test).width > maxWidth && line !== '') {
        context.fillText(line, x + maxWidth / 2, lineY);
        line = word;
        lineY += lineHeight;
      } else line = test;
    }
    context.fillText(line, x + maxWidth / 2, lineY);
  }

  function drawCardBack(x, y, width, height) {
    roundRect(context, x, y, width, height, 8);
    context.fillStyle = PALETTE.cardBack;
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = '#6d5aa8';
    context.stroke();
    context.strokeStyle = '#4a3d78';
    context.beginPath();
    context.moveTo(x + width / 2, y + 10);
    context.lineTo(x + width - 10, y + height / 2);
    context.lineTo(x + width / 2, y + height - 10);
    context.lineTo(x + 10, y + height / 2);
    context.closePath();
    context.stroke();
    context.fillStyle = '#f2c94c';
    context.beginPath();
    context.arc(x + width / 2, y + height / 2, 7, 0, Math.PI * 2);
    context.fill();
  }

  function drawFighter(fighter, x, y, name, color, isPlayer) {
    context.beginPath();
    context.arc(x, y, 34, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = '#ffffff';
    context.stroke();
    text(isPlayer ? 'YOU' : 'FOX', x, y + 8, 20, '#ffffff', 'center', '800');
    text(name, x, y + 56, 18, PALETTE.text, 'center', '700');
    // Life bar with numbers, plus an armour badge when there is any.
    const barX = x - 110;
    const barY = y + 66;
    const barW = 220;
    roundRect(context, barX, barY, barW, 22, 11);
    context.fillStyle = '#00000088';
    context.fill();
    roundRect(context, barX, barY, barW * Math.max(0, fighter.hp / DUEL.maxHp), 22, 11);
    context.fillStyle = fighter.hp <= 8 ? PALETTE.danger : '#3ddc74';
    context.fill();
    text(`${fighter.hp} / ${DUEL.maxHp}`, x, barY + 17, 15, '#ffffff', 'center', '700');
    if (fighter.armor > 0) {
      context.beginPath();
      context.arc(x + 128, barY + 11, 15, 0, Math.PI * 2);
      context.fillStyle = SUIT.stone.color;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = '#ffffff';
      context.stroke();
      text(String(fighter.armor), x + 128, barY + 16, 15, '#241a12', 'center', '800');
      text('armour', x + 128, barY + 38, 12, PALETTE.muted, 'center');
    }
  }

  function drawMana(state) {
    text('MANA', 60, 656, 16, PALETTE.muted, 'left', '700');
    for (let pip = 0; pip < state.manaMax; pip += 1) {
      const cx = 76 + pip * 30;
      const cy = 678;
      context.save();
      context.translate(cx, cy);
      context.rotate(Math.PI / 4);
      context.fillStyle = pip < state.mana ? '#7b2ff7' : '#3a2f5e';
      context.fillRect(-9, -9, 18, 18);
      context.restore();
    }
    text(`Deck ${state.player.deck.length}`, 60, 708, 15, PALETTE.muted, 'left');
  }

  function drawTable(state) {
    const gradient = context.createRadialGradient(640, 360, 80, 640, 360, 760);
    gradient.addColorStop(0, PALETTE.feltLight);
    gradient.addColorStop(1, PALETTE.feltDark);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.strokeStyle = PALETTE.wood;
    context.lineWidth = 26;
    context.strokeRect(13, 13, FIELD.width - 26, FIELD.height - 26);
    context.strokeStyle = PALETTE.woodDark;
    context.lineWidth = 2;
    context.strokeRect(28, 28, FIELD.width - 56, FIELD.height - 56);
    // Centre emblem: a faint ember ring where played cards land.
    context.beginPath();
    context.arc(640, 330, 92, 0, Math.PI * 2);
    context.strokeStyle = '#ffffff14';
    context.lineWidth = 3;
    context.stroke();
    text('EMBERCLASH', 640, 336, 22, '#ffffff22', 'center', '800');
  }

  function drawLog(state) {
    roundRect(context, LOG.x, LOG.y, LOG.width, LOG.height, 10);
    context.fillStyle = '#00000055';
    context.fill();
    context.font = `14px ${FONT}`;
    context.fillStyle = PALETTE.muted;
    context.textAlign = 'left';
    state.log.forEach((line, index) => {
      context.fillText(line.slice(0, 34), LOG.x + 12, LOG.y + 24 + index * 26);
    });
  }

  function drawEndTurn(state) {
    const enabled = state.turn === 'player' && state.screen === 'play';
    roundRect(context, END_TURN.x, END_TURN.y, END_TURN.width, END_TURN.height, 10);
    context.fillStyle = enabled ? PALETTE.gold : '#4a4260';
    context.fill();
    text('END TURN  [E]', END_TURN.x + END_TURN.width / 2, END_TURN.y + 33, 19, enabled ? '#241a12' : '#9a90ad', 'center', '800');
  }

  function drawFloats(state) {
    context.textAlign = 'center';
    for (const float of state.floats) {
      const age = 1 - float.life / 1.2;
      context.globalAlpha = Math.max(0, float.life / 1.2);
      context.font = `800 ${34 + age * 10}px ${FONT}`;
      context.fillStyle = float.color;
      context.fillText(float.text, float.x, float.y - age * 60);
    }
    context.globalAlpha = 1;
  }

  function drawPlay(state, pointer) {
    drawTable(state);
    // Rival's face-down hand.
    const rivalCount = state.rival.hand.length;
    const rivalTotal = rivalCount * 56 + (rivalCount - 1) * 8;
    for (let index = 0; index < rivalCount; index += 1) {
      drawCardBack(640 - rivalTotal / 2 + index * 64, RIVAL_HAND_Y, 56, 80);
    }
    text(`Rival hand: ${rivalCount}`, 640, RIVAL_HAND_Y + 126, 15, PALETTE.muted, 'center');
    drawFighter(state.rival, 150, 130, 'Ash, the Cinder Fox', PALETTE.rival, false);
    drawFighter(state.player, 150, 545, 'You, Ember Keeper', PALETTE.player, true);
    // Turn banner (not on the game-over screen: the panel speaks there).
    if (state.screen !== 'over') {
      text(state.turn === 'player' ? 'YOUR TURN' : 'RIVAL THINKING…', 640, 195, 20,
        state.turn === 'player' ? PALETTE.gold : PALETTE.muted, 'center', '800');
    }
    // Zoomed card just played.
    if (state.zoom) {
      const progress = 1 - state.zoomTimer / 1.1;
      const scale = 0.6 + 0.4 * Math.min(1, progress * 3);
      const width = CARD.zoomWidth * scale;
      const height = CARD.zoomHeight * scale;
      context.save();
      context.shadowColor = '#00000088';
      context.shadowBlur = 24;
      drawCardFace(state.zoom, 640 - width / 2, 330 - height / 2, width, height);
      context.restore();
    }
    drawFloats(state);
    drawLog(state);
    // Player's hand.
    const rects = handRects(state.player.hand.length);
    state.player.hand.forEach((card, index) => {
      const rect = rects[index];
      const hovered = pointer.x >= rect.x && pointer.x <= rect.x + rect.width
        && pointer.y >= rect.y && pointer.y <= rect.y + rect.height;
      const affordable = defOf(card).cost <= state.mana && state.turn === 'player';
      drawCardFace(card, rect.x, rect.y, rect.width, rect.height, {
        lift: hovered && state.turn === 'player',
        dim: !affordable,
      });
      if (hovered && state.turn === 'player') {
        context.strokeStyle = PALETTE.gold;
        context.lineWidth = 3;
        roundRect(context, rect.x, rect.y - CARD.lift, rect.width, rect.height, 12);
        context.stroke();
      }
      text(String(index + 1), rect.x + rect.width / 2, rect.y + rect.height + 18, 13, PALETTE.muted, 'center');
    });
    drawMana(state);
    drawEndTurn(state);
    // Score, top right.
    text(`SCORE ${state.score}`, 1256, 40, 20, PALETTE.text, 'right', '800');
    text(`Turn ${state.turnNumber}`, 1256, 66, 15, PALETTE.muted, 'right');
    text('M mute · P pause', 1256, 700, 13, PALETTE.muted, 'right');
  }

  function drawPanel(title, lines, prompt, accent) {
    const width = 640;
    const height = 150 + lines.length * 34;
    const x = (FIELD.width - width) / 2;
    const y = (FIELD.height - height) / 2;
    roundRect(context, x, y, width, height, 16);
    context.fillStyle = PALETTE.panel;
    context.fill();
    context.lineWidth = 3;
    context.strokeStyle = PALETTE.panelEdge;
    context.stroke();
    text(title, FIELD.width / 2, y + 72, 46, accent, 'center', '800');
    lines.forEach((line, index) => {
      text(line, FIELD.width / 2, y + 122 + index * 34, 20, PALETTE.muted, 'center');
    });
    text(prompt, FIELD.width / 2, y + height - 30, 21, PALETTE.gold, 'center', '700');
  }

  function drawTitle(state, best) {
    drawTable(state);
    // A decorative fan of cards behind the title.
    const demo = ['ember-strike', 'spring-water', 'storm-call', 'bulwark'];
    demo.forEach((defId, index) => {
      context.save();
      context.translate(640 + (index - 1.5) * 150, 600);
      context.rotate((index - 1.5) * 0.12);
      drawCardFace({ uid: index, defId }, -66, -94, CARD.width, CARD.height);
      context.restore();
    });
    text('EMBERCLASH', 640, 190, 84, PALETTE.gold, 'center', '800');
    text('A duel of ember, tide, gale and stone', 640, 232, 24, PALETTE.text, 'center');
    drawPanel('How to play', [
      'Play cards with mana — Flame burns, Tide mends,',
      'Gale draws, Stone guards. Reduce Ash to 0 life.',
      'Click a card or press 1–7. End turn with E or the button.',
    ], 'Click or press Space to duel', PALETTE.text);
    if (best > 0) text(`Best score: ${best}`, 640, 640, 20, PALETTE.gold, 'center', '700');
  }

  function drawOver(state, best) {
    drawPlay(state, { x: -1, y: -1 });
    const won = state.winner === 'player';
    drawPanel(won ? 'VICTORY!' : 'DEFEAT', [
      won ? 'Ash the Cinder Fox is out of embers.' : 'Your embers are spent. Ash takes the table.',
      `Score ${state.score}   ·   Damage dealt ${state.damageDealt}   ·   Cards played ${state.cardsPlayed}`,
      `Best score ${Math.max(best, state.score)}`,
    ], 'Press R or click to play again', won ? PALETTE.gold : PALETTE.danger);
  }

  function draw(state, screen, best, pointer) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const safePointer = pointer ?? { x: -1, y: -1 };
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else if (screen === SCREEN_PAUSED) {
      drawPlay(state, safePointer);
      drawPanel('PAUSED', ['The embers wait for you.'], 'Press P to resume', PALETTE.text);
    } else drawPlay(state, safePointer);
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    draw,
    handRects,
    endTurnRect: END_TURN,
    /** What is at logical point (x, y) during play: a hand card, the end-turn button, or nothing. */
    hitTest(state, x, y) {
      if (x >= END_TURN.x && x <= END_TURN.x + END_TURN.width
        && y >= END_TURN.y && y <= END_TURN.y + END_TURN.height) return { type: 'endTurn' };
      const rects = handRects(state.player.hand.length);
      for (let index = rects.length - 1; index >= 0; index -= 1) {
        const rect = rects[index];
        if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
          return { type: 'card', index };
        }
      }
      return null;
    },
  };
}
