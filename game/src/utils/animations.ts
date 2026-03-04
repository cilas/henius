import type Phaser from 'phaser'

// Register all game animations. Called once in BootScene after all spritesheets are loaded.
export function registerAnimations(anims: Phaser.Animations.AnimationManager): void {
  // ── Blue Archer ───────────────────────────────────────────────────────────
  anims.create({
    key: 'archer-idle',
    frames: anims.generateFrameNumbers('archer-idle', { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'archer-run',
    frames: anims.generateFrameNumbers('archer-run', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  })
  anims.create({
    key: 'archer-shoot',
    frames: anims.generateFrameNumbers('archer-shoot', { start: 0, end: 7 }),
    frameRate: 12,
    repeat: 0,
  })

  // ── Blue Warrior ──────────────────────────────────────────────────────────
  anims.create({
    key: 'warrior-idle',
    frames: anims.generateFrameNumbers('warrior-idle', { start: 0, end: 7 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'warrior-run',
    frames: anims.generateFrameNumbers('warrior-run', { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1,
  })
  anims.create({
    key: 'warrior-attack',
    frames: anims.generateFrameNumbers('warrior-attack', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: 0,
  })

  // ── Blue Lancer ───────────────────────────────────────────────────────────
  anims.create({
    key: 'lancer-idle',
    frames: anims.generateFrameNumbers('lancer-idle', { start: 0, end: 11 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'lancer-run',
    frames: anims.generateFrameNumbers('lancer-run', { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1,
  })
  anims.create({
    key: 'lancer-attack',
    frames: anims.generateFrameNumbers('lancer-attack', { start: 0, end: 2 }),
    frameRate: 10,
    repeat: 0,
  })

  // ── Blue Monk ─────────────────────────────────────────────────────────────
  anims.create({
    key: 'monk-idle',
    frames: anims.generateFrameNumbers('monk-idle', { start: 0, end: 5 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'monk-run',
    frames: anims.generateFrameNumbers('monk-run', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1,
  })
  anims.create({
    key: 'monk-heal',
    frames: anims.generateFrameNumbers('monk-heal', { start: 0, end: 10 }),
    frameRate: 12,
    repeat: 0,
  })

  // ── Red Pawn ──────────────────────────────────────────────────────────────
  anims.create({
    key: 'pawn-idle',
    frames: anims.generateFrameNumbers('pawn-idle', { start: 0, end: 7 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'pawn-run',
    frames: anims.generateFrameNumbers('pawn-run', { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1,
  })

  // ── Red Warrior ───────────────────────────────────────────────────────────
  anims.create({
    key: 'red-warrior-idle',
    frames: anims.generateFrameNumbers('red-warrior-idle', { start: 0, end: 7 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'red-warrior-run',
    frames: anims.generateFrameNumbers('red-warrior-run', { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1,
  })

  // ── Red Lancer ────────────────────────────────────────────────────────────
  anims.create({
    key: 'red-lancer-idle',
    frames: anims.generateFrameNumbers('red-lancer-idle', { start: 0, end: 11 }),
    frameRate: 8,
    repeat: -1,
  })
  anims.create({
    key: 'red-lancer-run',
    frames: anims.generateFrameNumbers('red-lancer-run', { start: 0, end: 5 }),
    frameRate: 10,
    repeat: -1,
  })

  // ── Particle FX ───────────────────────────────────────────────────────────
  anims.create({
    key: 'dust',
    frames: anims.generateFrameNumbers('dust', { start: 0, end: 7 }),
    frameRate: 14,
    repeat: 0,
  })
  anims.create({
    key: 'explosion',
    frames: anims.generateFrameNumbers('explosion', { start: 0, end: 7 }),
    frameRate: 16,
    repeat: 0,
  })

  // ── Water Foam ────────────────────────────────────────────────────────────
  anims.create({
    key: 'water-foam',
    frames: anims.generateFrameNumbers('water-foam', { start: 0, end: 15 }),
    frameRate: 8,
    repeat: -1,
  })
}
