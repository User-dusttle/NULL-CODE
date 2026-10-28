// ============================================================
// 小怪
// ============================================================

function spawnMinion() {
  if (!game.boss || game.boss.transition !== "none") {
    return;
  }

  if (game.minions.filter(m => !m.dead).length >= 4) {
    return;
  }

  const b = game.boss;
  const side = Math.random() < 0.5 ? -1 : 1;

  game.minions.push({
    x: clamp(
      b.x + side * rand(65, 115),
      30,
      game.width - 30
    ),

    y: clamp(
      b.y + rand(35, 85),
      35,
      game.height * 0.42
    ),

    radius: 10,
    hp: 72,
    maxHp: 72,
    shootTimer: rand(0.8, 1.5),
    age: 0,
    dead: false,
  });
}

function updateMinions(dt) {
  const b = game.boss;
  const p = game.player;

  if (
    b.phase === 1 &&
    b.transition === "none"
  ) {
    game.nextMinion -= dt;

    if (game.nextMinion <= 0) {
      spawnMinion();
      game.nextMinion = rand(6, 8);
    }
  }

  for (const m of game.minions) {
    if (m.dead) continue;

    m.age += dt;

    // 小怪缓慢漂移
    m.x += Math.sin(m.age * 1.5) * 18 * dt;
    m.x = clamp(m.x, m.radius, game.width - m.radius);

    // 大招充能时停止攻击
    if (b.transition !== "none") continue;

    m.shootTimer -= dt;

    if (m.shootTimer <= 0) {
      const a = angleTo(m, p);
      const speed = 125;

      game.enemyBullets.push({
        x: m.x,
        y: m.y,

        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,

        radius: 4,
        life: 5,
        damage: 7,
        color: COLORS.orange,
        sourceMinion: m,
      });

      m.shootTimer = rand(1.7, 2.4);
    }
  }

  game.minions = game.minions.filter(
    m => !m.dead && m.hp > 0
  );
}

// ============================================================
// BOSS 普通攻击
// ============================================================

