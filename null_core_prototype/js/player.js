// ============================================================
// 粒子
// ============================================================

function emitParticles(
  x,
  y,
  color,
  amount = 8,
  speed = 90
) {
  for (let i = 0; i < amount; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(speed * 0.25, speed);

    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: rand(0.2, 0.55),
      maxLife: 0.55,
      r: rand(1, 3),
      color,
    });
  }
}

// ============================================================
// 玩家攻击与技能
// ============================================================

function shootPlayer() {
  const p = game.player;

  if (!p || game.shootCooldown > 0) return;

  const a = p.angle;
  const speed = 570;

  game.bullets.push({
    x: p.x + Math.cos(a) * 16,
    y: p.y + Math.sin(a) * 16,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: 3,
    damage: 18 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1),
    life: 1.5,
    color: COLORS.cyan,
  });

  game.shootCooldown = 0.15;
}

function useDash() {
  if (!game.running || game.paused || game.dashCooldown > 0) {
    return;
  }

  const p = game.player;

  let dx =
    (game.keys.has("d") ? 1 : 0) -
    (game.keys.has("a") ? 1 : 0);

  let dy =
    (game.keys.has("s") ? 1 : 0) -
    (game.keys.has("w") ? 1 : 0);

  if (!dx && !dy) {
    dx = Math.cos(p.angle);
    dy = Math.sin(p.angle);
  }

  const len = Math.hypot(dx, dy) || 1;

  p.dashVx = dx / len * 680;
  p.dashVy = dy / len * 680;

  game.dashTime = 0.16;
  game.dashCooldown = 1.4;
  game.invulnerable = 0.34;

  emitParticles(p.x, p.y, COLORS.cyan, 14, 150);
  showToast("相位闪避");
}

function damageMinion(minion, damage) {
  if (minion.dead) return;

  minion.hp -= damage;

  if (minion.hp <= 0) {
    minion.hp = 0;
    minion.dead = true;

    emitParticles(
      minion.x,
      minion.y,
      COLORS.violet,
      12,
      110
    );

    game.ultEnergy = clamp(game.ultEnergy + 3, 0, 100);
  }
}

function damageBoss(damage, sourceX, sourceY) {
  const b = game.boss;
  if (!b || b.transition !== "none") return false;

  let finalDamage = damage;
  if (b.type === "fuse") {
    // 阶段二、三的复现体存活时，FUSE-CORE 本体受护盾保护。
    if ((b.phase === 2 || b.phase === 3) && (game.fuseSummons || []).some(s => !s.dead && s.hp > 0)) return false;
    // 只有第一阶段受核心窗口限制；阶段二、三正常受伤。
    if (b.phase === 1 && !b.fuseShutdown && !b.fuseWeakpointOpen) return false;

    // 阶段四每架存活无人机提供 10% 减伤；10 架全在时核心完全免伤。
    if (b.phase === 4 && !b.fuseShutdown) {
      const alive = (game.fuseDrones || []).filter(d => !d.dead && d.hp > 0).length;
      finalDamage *= Math.max(0, 1 - alive * 0.10);
      if (finalDamage <= 0) {
        showToast("无人机防御网仍在运行：先摧毁无人机");
        return false;
      }
    }
  }

  b.hp = Math.max(0, b.hp - finalDamage);
  b.hitFlash = 0.1;
  game.ultEnergy = clamp(game.ultEnergy + 4, 0, 100);
  if (sourceX !== undefined && sourceY !== undefined) {
    emitParticles(sourceX, sourceY, COLORS.cyan, 3, 60);
  }
  return true;
}

function damageFuseDrone(drone, damage) {
  if (!drone || drone.dead || game.boss?.type !== "fuse" || game.boss.phase !== 4) return;
  drone.hp = Math.max(0, drone.hp - damage);
  if (drone.hp > 0) return;

  drone.dead = true;
  emitParticles(drone.x, drone.y, COLORS.orange, 14, 125);
  game.ultEnergy = clamp(game.ultEnergy + 5, 0, 100);
  const alive = (game.fuseDrones || []).filter(d => !d.dead && d.hp > 0).length;
  addLog(`FUSE-CORE 无人机已摧毁：剩余 ${alive}/10。`);
  showToast(`无人机剩余 ${alive}/10`);

  if (alive === 0 && !game.boss.fuseShutdown) {
    game.boss.fuseShutdown = true;
    game.boss.fuseWeakpointOpen = true;
    game.enemyBullets = [];
    game.hazards = game.hazards.filter(h => h.type !== "fuse-laser");
    emitParticles(game.boss.x, game.boss.y, COLORS.cyan, 60, 235);
    addLog("10/10 无人机已摧毁。FUSE-CORE 永久瘫痪，护盾解除！");
    showToast("防御网永久关闭：核心可持续受伤");
  }
}

function useSkill() {
  if (
    !game.running ||
    game.paused ||
    game.skillCooldown > 0
  ) {
    return;
  }

  const p = game.player;
  const b = game.boss;

  game.skillCooldown = 5;

  let removed = 0;

  // 清除玩家附近的敌方弹幕
  for (const bullet of game.enemyBullets) {
    if (
      !bullet.dead &&
      distance(p, bullet) < 125
    ) {
      bullet.dead = true;
      removed++;

      emitParticles(
        bullet.x,
        bullet.y,
        COLORS.cyan,
        4,
        75
      );
    }
  }

  // 折射脉冲也能攻击附近小怪
  for (const m of game.minions) {
    if (!m.dead && distance(p, m) < 150) {
      damageMinion(m, 42);
    }
  }

  // 复现体在场时，折射脉冲优先攻击复现体，不会穿过护盾伤害核心。
  const summons = (game.fuseSummons || []).filter(s => !s.dead && s.hp > 0 && distance(p, s) < 185);
  const summon = summons.sort((a, b) => distance(p, a) - distance(p, b))[0];
  if (summon) {
    damageFuseSummon(52 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1), summon.x, summon.y, summon);
  } else if (
    b.transition === "none" &&
    distance(p, b) < 185
  ) {
    damageBoss(52 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1), b.x, b.y);
  }

  emitParticles(p.x, p.y, COLORS.cyan, 28, 220);

  showToast(
    removed
      ? `折射脉冲：清除 ${removed} 枚弹幕`
      : "折射脉冲释放"
  );

  addLog("折射脉冲已释放。");
  updateHUD();
}

function useUltimate() {
  if (
    !game.running ||
    game.paused ||
    game.ultEnergy < 100
  ) {
    if (game.running && game.ultEnergy < 100) {
      showToast("核心能量不足");
    }

    return;
  }

  game.ultEnergy = 0;

  const b = game.boss;

  // 即使 BOSS 无敌，玩家也可以释放技能，
  // 但不会造成伤害。
  if (b.transition === "none") {
    damageBoss(185 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1), b.x, b.y);
  }

  // 保留原有交叉棱镜视觉效果
  game.hazards.push({
    type: "ultimate",
    life: 0.42,
    maxLife: 0.42,
  });

  emitParticles(b.x, b.y, COLORS.violet, 45, 240);

  showToast("终结技：交叉棱镜");
  addLog("终结技已释放。");

  updateHUD();
}

