# game_helena_2 — Project Memory

## What This Is
Tower defense game using Tiny Swords assets (PixelFrog), built with Phaser 3 + TypeScript + Vite.

## Dev Server
```
cd game && npm run dev
```
Runs at http://localhost:5173/

## Project Structure
```
game_helena_2/
├── Buildings/           ← asset pack
├── Terrain/             ← asset pack
├── Units/               ← asset pack
├── UI Elements/         ← asset pack
├── Particle FX/         ← asset pack
└── game/                ← Phaser 3 + Vite project
    ├── src/
    │   ├── main.ts
    │   ├── config.ts           ← Phaser.Game config
    │   ├── config/
    │   │   ├── map.ts          ← TILE_SIZE, PATH_TILES, TOWER_SLOTS, waypoints
    │   │   ├── towers.ts       ← TowerConfig, TOWER_CONFIGS
    │   │   ├── enemies.ts      ← EnemyConfig, ENEMY_CONFIGS
    │   │   └── waves.ts        ← WAVES, TOTAL_WAVES, BETWEEN_WAVE_DELAY
    │   ├── entities/
    │   │   ├── Enemy.ts        ← Phaser.Sprite, path-following, HP bar
    │   │   ├── Tower.ts        ← Phaser.Container, targeting, attack
    │   │   └── Projectile.ts   ← Phaser.Image, projectile movement
    │   ├── systems/
    │   │   ├── EconomyManager.ts
    │   │   ├── WaveManager.ts
    │   │   └── TowerManager.ts ← slot zones, tower placement
    │   ├── scenes/
    │   │   ├── BootScene.ts    ← asset loading
    │   │   ├── MenuScene.ts
    │   │   ├── GameScene.ts    ← main game loop
    │   │   └── UIScene.ts      ← HUD overlay
    │   └── utils/animations.ts
    └── public/assets → symlink to ../../ (game_helena_2 root)
```

## Sprite Dimensions
- Most units: 192×192 px per frame
- Lancer (Blue & Red): 320×320 px per frame
- Blue Archer Idle: 1152×192 (6 frames)
- Blue Archer Run: 768×192 (4 frames)
- Blue Archer Shoot: 1536×192 (8 frames)
- Blue Warrior Idle: 1536×192 (8 frames), Run: 1152×192 (6 frames), Attack1: 768×192 (4 frames)
- Blue Lancer Idle: 3840×320 (12 frames), Run: 1920×320 (6 frames), Right_Attack: 960×320 (3 frames)
- Blue Monk Idle: 1152×192 (6 frames), Run: 768×192 (4 frames), Heal: 2112×192 (11 frames)
- Red Pawn Idle: 1536×192 (8 frames), Run: 1152×192 (6 frames)
- Red Warrior Idle: 1536×192 (8 frames), Run: 1152×192 (6 frames)
- Red Lancer Idle: 3840×320 (12 frames), Run: 1920×320 (6 frames)

## Game Design
- Grid: 20×12 tiles, 64px each = 1280×768
- Path: S-curve left→right, waypoints in map.ts
- Factions: Blue (player) vs Red (enemies)
- 10 waves, 15s between waves
- Tower types: Archer(50g), Warrior(75g), Lancer(100g), Monk(80g)
- Enemy types: Pawn(60hp), Warrior(150hp), Lancer(300hp)

## Scene Communication
Global event bus: `this.game.events`
- `select-tower` (TowerType|null) — UIScene→GameScene
- `select-tower-from-game` (TowerType|null) — GameScene→UIScene (keyboard)
- `hud-gold`, `hud-lives`, `hud-wave`, `hud-state`, `hud-between-timer` — GameScene→UIScene
- `skip-wave-timer` — UIScene skip button

## Tileset Layout (Tilemap_color1.png — 576×384, 9×6 grid at 64×64)
- **Col 4 = empty separator** between left and right groups
- **Left group (cols 0–3)**: Same tile variants as right group (rarely needed)
- **Right group (cols 5–8), rows 0–3**: GRASS tiles (all green)
  - Row 0 = top-edge   | Row 1 = interior  | Row 2 = bottom-edge | Row 3 = single-row (isolated)
  - Col 5 = left-edge  | Col 6 = center    | Col 7 = center-alt  | Col 8 = right-edge
- **Row 4, cols 5–8**: Cliff rock face (teal ~RGB 97,144,145) — placed on path cells below grass
- **Row 5, cols 5–8**: Cliff base (teal→green) — deeper cliff extension
- **Autotile formula**: `tileRow * 9 + tileCol`
- **Water Background color.png**: solid teal fill (~RGB 93,169,163) — used as canvas background
- **Shadow.png**: 128×128 shadow sprite — placed at top of path cells directly below grass, alpha 0.55

## Map Rendering Architecture
1. `water-bg` tileSprite → depth -2 (entire canvas)
2. Shadow sprites → depth -1 (at top edge of path cells below grass)
3. Tilemap layer → depth 0 (grass tiles + cliff tiles in single layer)
4. Tower-slot hairline grid → depth 1
5. Buildings → depth 7
6. Towers → depth 8
7. Enemies → depth 10
8. HP bars → depth 20
9. Projectiles → depth 15

## Key Implementation Notes
- Tower slots: orthogonally adjacent to PATH_TILES, computed in map.ts
- Enemy path: waypoint array in map.ts, advance when within 8px
- WaveManager builds spawn queue, spawns with elapsed-time check
- Lancer scale=0.18 (320px frames), others scale=0.28-0.3 (192px frames)
- Public assets: `game/public/assets` → symlink `../../` (relative to symlink = game_helena_2 root)
