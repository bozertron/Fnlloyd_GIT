// !Fnlloyd - Level Generation System
// Ported from fnlloyd_enhanced.html BrickLayouts, enhanced for new engine

import { BRICK, ROW_COLORS, COLORS } from './constants';

export interface BrickDef {
  r: number;
  c: number;
  type: 'standard' | 'reinforced' | 'power' | 'gold' | 'wall' | 'mystery' | 'boss';
  color: string;
  hp: number;
}

function makeBrick(r: number, c: number, hpBonus: number): BrickDef {
  let type: BrickDef['type'] = 'standard';
  let color: string = COLORS.purple;
  let hp = 1 + hpBonus;

  // Top row = reinforced
  if (r === 0) { type = 'reinforced'; color = COLORS.red; hp = 3 + hpBonus; }
  // Random power bricks
  if (Math.random() < 0.12) { type = 'power'; color = COLORS.green; hp = 1; }
  // Random gold bricks
  if (Math.random() < 0.05) { type = 'gold'; color = COLORS.gold; hp = 2 + hpBonus; }

  return { r, c, type, color, hp };
}

// --- LAYOUT GENERATORS ---

function classicGrid(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      bricks.push(makeBrick(r, c, hpBonus));
  return bricks;
}

function diamond(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  const cx = Math.floor(cols / 2);
  for (let r = 0; r < rows; r++) {
    const span = r < rows / 2 ? r + 1 : rows - r;
    for (let c = Math.max(0, cx - span); c <= Math.min(cols - 1, cx + span); c++)
      bricks.push(makeBrick(r, c, hpBonus));
  }
  return bricks;
}

function chevron(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const distFromCenter = Math.abs(c - cols / 2);
      const chevronRow = r + Math.floor(distFromCenter / 1.5);
      if (chevronRow < rows) bricks.push(makeBrick(r, c, hpBonus));
    }
  }
  return bricks;
}

function pyramid(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = r; c < cols - r; c++)
      bricks.push(makeBrick(r, c, hpBonus));
  }
  return bricks;
}

function zigzag(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : 1;
    for (let c = offset; c < cols; c += 2)
      bricks.push(makeBrick(r, c, hpBonus));
  }
  return bricks;
}

function artDecoArch(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  const cx = cols / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c - cx) / cx;
      const arch = Math.sqrt(Math.max(0, 1 - dx * dx)) * (rows - 1);
      if (r >= rows - 1 - arch) bricks.push(makeBrick(r, c, hpBonus));
    }
  }
  return bricks;
}

function fortress(rows: number, cols: number, hpBonus: number): BrickDef[] {
  const bricks: BrickDef[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isWall = c === 0 || c === cols - 1 || r === rows - 1;
      const isBattlement = r === 0 && c % 2 === 0;
      const isTower = (c <= 1 || c >= cols - 2) && r <= 2;
      const isMid = r === Math.floor(rows / 2);
      if (isWall || isBattlement || isTower || isMid)
        bricks.push(makeBrick(r, c, hpBonus));
    }
  }
  return bricks;
}

const GENERATORS = [classicGrid, diamond, chevron, pyramid, zigzag, artDecoArch, fortress];

export function generateLevel(level: number): BrickDef[] {
  const rows = Math.min(BRICK.baseRows + Math.floor(level / 2), BRICK.maxRows);
  const cols = BRICK.baseCols;
  const hpBonus = Math.floor(level / 3);
  const patternIdx = (level - 1) % GENERATORS.length;
  const layout = GENERATORS[patternIdx](rows, cols, hpBonus);

  // Apply row colors for standard bricks
  return layout.map(b => {
    if (b.type === 'standard') {
      b.color = ROW_COLORS[b.r % ROW_COLORS.length];
    }
    return b;
  });
}

export function brickToPixel(b: BrickDef, canvasW: number): { x: number; y: number; w: number; h: number } {
  const bw = BRICK.width;
  const bh = BRICK.height;
  const pad = BRICK.padding;
  const offX = (canvasW - (BRICK.baseCols * (bw + pad))) / 2 + pad / 2;
  return {
    x: offX + b.c * (bw + pad),
    y: BRICK.topOffset + b.r * (bh + pad),
    w: bw,
    h: bh,
  };
}
