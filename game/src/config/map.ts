export const TILE_SIZE = 64
export const GRID_COLS = 20
export const GRID_ROWS = 12
export const GAME_WIDTH = TILE_SIZE * GRID_COLS   // 1280
export const GAME_HEIGHT = TILE_SIZE * GRID_ROWS  // 768

// --- Path definition (col, row) ---
// S-curve from left (col 0, row 5) to castle (col 19, row 6)
const RAW_PATH_SEGMENTS: Array<[number, number][]> = [
  // Horizontal: entry row 5 cols 0-3
  [[0,5],[1,5],[2,5],[3,5]],
  // Vertical up: col 3 rows 4-2
  [[3,4],[3,3],[3,2]],
  // Horizontal right: row 2 cols 4-7
  [[4,2],[5,2],[6,2],[7,2]],
  // Vertical down: col 7 rows 3-9
  [[7,3],[7,4],[7,5],[7,6],[7,7],[7,8],[7,9]],
  // Horizontal right: row 9 cols 8-13
  [[8,9],[9,9],[10,9],[11,9],[12,9],[13,9]],
  // Vertical up: col 13 rows 8-3
  [[13,8],[13,7],[13,6],[13,5],[13,4],[13,3]],
  // Horizontal right: row 3 cols 14-17
  [[14,3],[15,3],[16,3],[17,3]],
  // Vertical down: col 17 rows 4-6
  [[17,4],[17,5],[17,6]],
  // Horizontal right: row 6 cols 18-19
  [[18,6],[19,6]],
]

export const PATH_TILES: [number, number][] = RAW_PATH_SEGMENTS.flat()

// Path waypoints (pixel centers of corner tiles)
// tileCenter(col, row) = col * TILE_SIZE + TILE_SIZE/2, row * TILE_SIZE + TILE_SIZE/2
function tc(col: number, row: number): { x: number; y: number } {
  return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 }
}

export const SPAWN_POINT = { x: -TILE_SIZE, y: 5 * TILE_SIZE + TILE_SIZE / 2 }

// Corner waypoints enemies walk through
export const PATH_WAYPOINTS = [
  tc(3, 5),   // turn up
  tc(3, 2),   // turn right
  tc(7, 2),   // turn down
  tc(7, 9),   // turn right
  tc(13, 9),  // turn up
  tc(13, 3),  // turn right
  tc(17, 3),  // turn down
  tc(17, 6),  // turn right
  tc(19, 6),  // castle (end)
]

export const CASTLE_COL = 19
export const CASTLE_ROW = 6
export const CASTLE_POSITION = tc(CASTLE_COL, CASTLE_ROW)

export const SPAWN_COL = 0
export const SPAWN_ROW = 5

// --- Map Elevation Grid ---
// -1: Water
//  0: Flat Ground (Sand / Path / Beach)
//  1: Elevated Ground (Grass / Tower Spots)
export const ELEVATION_GRID: number[][] = []
for (let r = 0; r < GRID_ROWS; r++) {
  const rowArr: number[] = []
  for (let c = 0; c < GRID_COLS; c++) {
    let elev = -1 // Default water
    // Core island bounds
    const isIsland = c >= 1 && c <= 18 && r >= 1 && r <= 10
    const isSpawn = (c === SPAWN_COL && r === SPAWN_ROW)
    const isCastle = (c === CASTLE_COL && r === CASTLE_ROW)

    if (isIsland || isSpawn || isCastle) {
      elev = 1 // Inside the island is grass by default
    }
    rowArr.push(elev)
  }
  ELEVATION_GRID.push(rowArr)
}

// Carve the edges as Beach (level 0)
for (let r = 0; r < GRID_ROWS; r++) {
  for (let c = 0; c < GRID_COLS; c++) {
    if (ELEVATION_GRID[r][c] === 1) {
      // If bordering water, make it flat sand
      const nearWater = (r === 1 || r === 10 || c === 1 || c === 18)
      if (nearWater && !(c === SPAWN_COL && r === SPAWN_ROW) && !(c === CASTLE_COL && r === CASTLE_ROW)) {
        ELEVATION_GRID[r][c] = 0
      }
    }
  }
}

// Carve out the path as Level 0
for (const [col, row] of PATH_TILES) {
  ELEVATION_GRID[row][col] = 0
}

// Ensure the entry point and castle outlet are connected properly
ELEVATION_GRID[SPAWN_ROW][SPAWN_COL] = 0
ELEVATION_GRID[CASTLE_ROW][CASTLE_COL] = 1

// Compute tower slots: must be elevation 1 (Grass)
function computeTowerSlots(): [number, number][] {
  const pathSet = new Set(PATH_TILES.map(([c, r]) => `${c},${r}`))
  const slotSet = new Set<string>()
  const slots: [number, number][] = []

  const excluded = new Set([
    `${CASTLE_COL},${CASTLE_ROW}`,
    `${SPAWN_COL},${SPAWN_ROW}`,
  ])

  for (const [col, row] of PATH_TILES) {
    for (const [dc, dr] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const nc = col + dc
      const nr = row + dr
      const key = `${nc},${nr}`
      if (
        nc >= 0 && nc < GRID_COLS &&
        nr >= 0 && nr < GRID_ROWS &&
        !pathSet.has(key) &&
        !slotSet.has(key) &&
        !excluded.has(key) &&
        ELEVATION_GRID[nr][nc] === 1 // Only allow on Elevated Grass
      ) {
        slots.push([nc, nr])
        slotSet.add(key)
      }
    }
  }

  return slots
}

export const TOWER_SLOTS = computeTowerSlots()

// Starting gold and lives
export const STARTING_GOLD = 130
export const STARTING_LIVES = 20
