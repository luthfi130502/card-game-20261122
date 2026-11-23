// Emberclash — every tuning number and colour in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const DUEL = {
  maxHp: 30,
  startHand: 4,
  maxHand: 7,
  maxMana: 10,
  /** Mana on turn n is min(n, maxMana): the duel ramps up, then stays hot. */
  manaForTurn(turn) {
    return Math.min(turn, this.maxMana);
  },
};

export const BEST_KEY = 'emberclash.best';

/** Suits: told apart by colour AND shape, never by text alone. */
export const SUIT = {
  flame: { name: 'Flame', color: '#ff5a3c', dark: '#b3271a', glow: '#ffb199', verb: 'Burn' },
  tide: { name: 'Tide', color: '#2fa8ff', dark: '#145da8', glow: '#a8d8ff', verb: 'Mend' },
  gale: { name: 'Gale', color: '#37d67a', dark: '#147a3e', glow: '#a9f0c4', verb: 'Gust' },
  stone: { name: 'Stone', color: '#e8b23a', dark: '#8a6410', glow: '#ffe9a8', verb: 'Guard' },
};

export const PALETTE = {
  backdrop: '#0d0a14',
  felt: '#14532d',
  feltLight: '#1b6b3a',
  feltDark: '#0c3520',
  wood: '#5b3a1e',
  woodDark: '#3d2712',
  gold: '#f2c94c',
  panel: '#171226',
  panelEdge: '#3a2f5e',
  text: '#f5efe2',
  muted: '#b8aec9',
  danger: '#ff5a3c',
  rival: '#c94b7c',
  player: '#2fa8ff',
  cardBack: '#241a3d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Card geometry on the table (logical pixels). */
export const CARD = {
  width: 132,
  height: 188,
  gap: 18,
  /** How far a hand card lifts when hovered / selected. */
  lift: 26,
  /** The big played-card shown in the middle of the table. */
  zoomWidth: 168,
  zoomHeight: 240,
};

export const TIMING = {
  /** Seconds between the rival's card plays, so its turn reads like thinking. */
  rivalThink: 0.75,
  /** How long a played card stays zoomed in the middle of the table. */
  zoomHold: 1.1,
  /** How long a floating damage number lives. */
  floatLife: 1.2,
};
