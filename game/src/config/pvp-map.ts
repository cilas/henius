import { TILE_SIZE } from './map'

// ── Dimensions ────────────────────────────────────────────────────────────────
export const PVP_GRID_COLS = 40
export const PVP_GRID_ROWS = 12
export const PVP_MAP_WIDTH  = TILE_SIZE * PVP_GRID_COLS   // 2560
export const PVP_MAP_HEIGHT = TILE_SIZE * PVP_GRID_ROWS   // 768

// Column ranges for each kingdom (used for rendering and slot assignment)
export const PVP_LEFT_MAX_COL  = 19   // cols 1–19 = left kingdom
export const PVP_RIGHT_MIN_COL = 20   // cols 20–38 = right kingdom

// ── Helper ────────────────────────────────────────────────────────────────────
/** Pixel center of a tile */
function tc(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 }
}

// ── Castle positions ──────────────────────────────────────────────────────────
export const PVP_CASTLE_LEFT_COL  = 1
export const PVP_CASTLE_LEFT_ROW  = 5
export const PVP_CASTLE_RIGHT_COL = 38
export const PVP_CASTLE_RIGHT_ROW = 5

export const PVP_CASTLE_LEFT  = tc(PVP_CASTLE_LEFT_COL,  PVP_CASTLE_LEFT_ROW)
export const PVP_CASTLE_RIGHT = tc(PVP_CASTLE_RIGHT_COL, PVP_CASTLE_RIGHT_ROW)

// ── Path tiles ────────────────────────────────────────────────────────────────
//
//  Full path (left castle → right castle):
//
//  Row 5  ╔══[1-3]══╗                            ╔══[36-38]══╗
//  Row 4  ║          ║                            ║            ║
//  Row 3  ║          ╚══[16-24 CENTER]════════════╝            ║
//  Row 2  ║                           [31-36]       [4-9]      ║
//  Row 9  ║     [10-15]   [25-30]                               ║
//  Row 5  ╚══[1]                                           [38]═╝
//
//  • Left S-curve  : cols 1-15, rows 5/2/9/3
//  • Center bridge : cols 16-24, row 3
//  • Right S-curve : cols 24-38 (mirror of left, read L→R)
//
const RAW_PVP_PATH_SEGMENTS: Array<[number, number][]> = [
  // ── Left half ─────────────────────────────────────────────────────────────
  // Horizontal exit from left castle (row 5)
  [[1,5],[2,5],[3,5]],
  // Up: col 3 → row 2
  [[3,4],[3,3],[3,2]],
  // Right along row 2
  [[4,2],[5,2],[6,2],[7,2],[8,2],[9,2]],
  // Down: col 9 → row 9
  [[9,3],[9,4],[9,5],[9,6],[9,7],[9,8],[9,9]],
  // Right along row 9
  [[10,9],[11,9],[12,9],[13,9],[14,9],[15,9]],
  // Up: col 15 → row 3
  [[15,8],[15,7],[15,6],[15,5],[15,4],[15,3]],
  // Right along row 3 → through center → into right half
  [[16,3],[17,3],[18,3],[19,3],[20,3],[21,3],[22,3],[23,3],[24,3]],

  // ── Right half (mirror of left, read left-to-right) ───────────────────────
  // Down: col 24 → row 9
  [[24,4],[24,5],[24,6],[24,7],[24,8],[24,9]],
  // Right along row 9
  [[25,9],[26,9],[27,9],[28,9],[29,9],[30,9]],
  // Up: col 30 → row 2
  [[30,8],[30,7],[30,6],[30,5],[30,4],[30,3],[30,2]],
  // Right along row 2
  [[31,2],[32,2],[33,2],[34,2],[35,2],[36,2]],
  // Down: col 36 → row 5
  [[36,3],[36,4],[36,5]],
  // Right to right castle (row 5)
  [[37,5],[38,5]],
]

export const PVP_PATH_TILES: [number, number][] = RAW_PVP_PATH_SEGMENTS.flat()

// ── Waypoints ─────────────────────────────────────────────────────────────────
//
//  Corner turn points for unit navigation.
//  Units heading LEFT→RIGHT use PVP_WAYPOINTS_L2R.
//  Units heading RIGHT→LEFT use PVP_WAYPOINTS_R2L (same list reversed).
//
export const PVP_WAYPOINTS_L2R: { x: number; y: number }[] = [
  tc( 3, 5),   // turn UP    (left half, first S bend)
  tc( 3, 2),   // turn RIGHT
  tc( 9, 2),   // turn DOWN
  tc( 9, 9),   // turn RIGHT
  tc(15, 9),   // turn UP
  tc(15, 3),   // turn RIGHT (into center bridge)
  tc(24, 3),   // turn DOWN  (right half, mirror S bend)
  tc(24, 9),   // turn RIGHT
  tc(30, 9),   // turn UP
  tc(30, 2),   // turn RIGHT
  tc(36, 2),   // turn DOWN
  tc(36, 5),   // turn RIGHT
  tc(38, 5),   // RIGHT CASTLE — destination
]

export const PVP_WAYPOINTS_R2L: { x: number; y: number }[] =
  [...PVP_WAYPOINTS_L2R].reverse().map((_, i, arr) => arr[i])

// ── Elevation grid ────────────────────────────────────────────────────────────
// -1 = Water  |  0 = Flat ground / path  |  1 = Elevated grass
export const PVP_ELEVATION_GRID: number[][] = (() => {
  // Start with water everywhere
  const grid = Array.from({ length: PVP_GRID_ROWS }, () =>
    new Array<number>(PVP_GRID_COLS).fill(-1)
  )

  // Fill inner island with grass (rows 1-10, cols 1-38)
  for (let r = 1; r <= 10; r++) {
    for (let c = 1; c <= 38; c++) {
      grid[r][c] = 1
    }
  }

  // Border rows → flat beach (0)
  for (let c = 1; c <= 38; c++) {
    grid[1][c]  = 0
    grid[10][c] = 0
  }

  // Carve path tiles → flat (0)
  for (const [col, row] of PVP_PATH_TILES) {
    grid[row][col] = 0
  }

  // Keep castle tiles as grass (they sit on path row but are special)
  grid[PVP_CASTLE_LEFT_ROW][PVP_CASTLE_LEFT_COL]   = 1
  grid[PVP_CASTLE_RIGHT_ROW][PVP_CASTLE_RIGHT_COL] = 1

  return grid
})()

// ── Tower slots ───────────────────────────────────────────────────────────────
function computePvpSlots(side: 'left' | 'right'): [number, number][] {
  const pathSet  = new Set(PVP_PATH_TILES.map(([c, r]) => `${c},${r}`))
  const slotSet  = new Set<string>()
  const excluded = new Set([
    `${PVP_CASTLE_LEFT_COL},${PVP_CASTLE_LEFT_ROW}`,
    `${PVP_CASTLE_RIGHT_COL},${PVP_CASTLE_RIGHT_ROW}`,
  ])
  const slots: [number, number][] = []

  for (const [col, row] of PVP_PATH_TILES) {
    // Only generate slots from path tiles that belong to this side
    const isLeftTile  = col <= PVP_LEFT_MAX_COL
    const isRightTile = col >= PVP_RIGHT_MIN_COL
    if (side === 'left'  && !isLeftTile)  continue
    if (side === 'right' && !isRightTile) continue

    for (const [dc, dr] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
      const nc  = col + dc
      const nr  = row + dr
      const key = `${nc},${nr}`

      // Slot must be on the correct side of the map
      const slotOnLeft  = nc <= PVP_LEFT_MAX_COL
      const slotOnRight = nc >= PVP_RIGHT_MIN_COL
      if (side === 'left'  && !slotOnLeft)  continue
      if (side === 'right' && !slotOnRight) continue

      if (
        nc >= 0 && nc < PVP_GRID_COLS &&
        nr >= 0 && nr < PVP_GRID_ROWS &&
        !pathSet.has(key) &&
        !slotSet.has(key) &&
        !excluded.has(key) &&
        PVP_ELEVATION_GRID[nr]?.[nc] === 1
      ) {
        slots.push([nc, nr])
        slotSet.add(key)
      }
    }
  }

  return slots
}

export const PVP_TOWER_SLOTS_LEFT  = computePvpSlots('left')
export const PVP_TOWER_SLOTS_RIGHT = computePvpSlots('right')

// ── Economy constants (client-side, mirrors shared/Constants) ─────────────────
export const PVP_STARTING_GOLD     = 10000
export const PVP_CASTLE_HP         = 500
export const PVP_PASSIVE_INCOME    = 5    // gold per interval
export const PVP_INCOME_INTERVAL_S = 10  // seconds
