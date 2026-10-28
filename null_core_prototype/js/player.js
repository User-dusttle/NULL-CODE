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
  const prismBuff = game.character === "prism" && (game.prismUltimateTimer || 0) > 0;

  game.bullets.push({
    x: p.x + Math.cos(a) * 16,
    y: p.y + Math.sin(a) * 16,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: 3,
    damage: 18 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1) * (prismBuff ? 1.25 : 1),
    life: 1.8,
    color: prismBuff ? "#ffffff" : COLORS.cyan,
    homing: prismBuff,
    ricochets: prismBuff ? 2 : 0,
    hitTargets: [],
  });

  game.shootCooldown = prismBuff ? 0.10 : 0.15;
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

    if (!(game.character === "prism" && game.prismUltimateTimer > 0)) game.ultEnergy = clamp(game.ultEnergy + 3, 0, 100);
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
  if (!(game.character === "prism" && game.prismUltimateTimer > 0)) game.ultEnergy = clamp(game.ultEnergy + (game.character === "singularity" ? 2 : game.character === "bulwark" ? 2 : 4), 0, 100);
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
  if (!(game.character === "prism" && game.prismUltimateTimer > 0)) game.ultEnergy = clamp(game.ultEnergy + 5, 0, 100);
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

function scatterBulwarkBullets(count, damageScale = 1.5, originX = game.player.x, originY = game.player.y, baseDamage = 12) {
  if (!count || !game.player) return;
  const speed = 520;
  const step = Math.PI * 2 / count;
  const offset = rand(0, Math.PI * 2);
  for (let i = 0; i < count; i++) {
    const angle = offset + step * i;
    game.bullets.push({
      x: originX + Math.cos(angle) * 18,
      y: originY + Math.sin(angle) * 18,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      damage: baseDamage * damageScale * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1),
      life: 1.8,
      color: COLORS.violet,
      reflected: true,
    });
  }
}

function finishBulwarkUltimate() {
  const p = game.player;
  if (!p) return;
  const stored = game.bulwarkStoredBullets || [];
  if (stored.length) {
    scatterBulwarkBullets(stored.length, 2.0, p.x, p.y, stored.reduce((sum, b) => sum + (b.damage || 10), 0) / stored.length);
  }
  game.bulwarkStoredBullets = [];
  game.bulwarkUltimateTimer = 0;
  game.invulnerable = Math.min(game.invulnerable, 0.15);
  emitParticles(p.x, p.y, COLORS.violet, 60, 300);
  showToast(`绝对壁垒结束：散射 ${stored.length} 枚吸收弹幕`);
  addLog(`壁垒结束无敌状态，散射 ${stored.length} 枚吸收弹幕。`);
}

function useSkill() {
  if (!game.running || game.paused || game.skillCooldown > 0) return;
  const p = game.player;
  const b = game.boss;
  const character = game.character || "prism";
  const mult = game.mode === "rogue" ? game.rogueBuild.damageMult : 1;
  game.skillCooldown = character === "bulwark" ? 6.5 : character === "singularity" ? 7 : 5;
  let removed = 0;

  if (character === "bulwark") {
    // E：反弹周围弹幕。反弹弹幕会成为玩家弹幕，只能伤害敌人。
    const reflected = [];
    for (const bullet of game.enemyBullets) {
      if (!bullet.dead && distance(p, bullet) < 175) {
        bullet.dead = true;
        reflected.push(bullet);
        emitParticles(bullet.x, bullet.y, COLORS.violet, 5, 85);
      }
    }
    if (reflected.length) {
      scatterBulwarkBullets(reflected.length, 1.65, p.x, p.y,
        reflected.reduce((sum, bullet) => sum + (bullet.damage || 10), 0) / reflected.length);
    }
    const counterDamage = (35 + reflected.length * 4) * mult;
    for (const m of game.minions) if (!m.dead && distance(p, m) < 190) damageMinion(m, counterDamage);
    for (const summon of (game.fuseSummons || [])) if (!summon.dead && distance(p, summon) < 210) damageFuseSummon(counterDamage, summon.x, summon.y, summon);
    if (distance(p, b) < 210 && b.transition === "none") damageBoss(counterDamage, b.x, b.y);
    emitParticles(p.x, p.y, COLORS.violet, 34, 240);
    showToast(`反弹脉冲：反弹 ${reflected.length} 枚弹幕`);
    addLog(`壁垒释放反弹脉冲，将 ${reflected.length} 枚弹幕反射回战场。`);
  } else if (character === "singularity") {
    // 引力井持续 2.4 秒；更新循环会把附近弹幕和敌人拖向中心。
    game.skillFieldTimer = 2.4;
    game.skillFieldRadius = 210;
    game.skillFieldX = p.x;
    game.skillFieldY = p.y;
    emitParticles(game.skillFieldX, game.skillFieldY, COLORS.orange, 36, 180);
    showToast("定点引力场已展开：目标正在聚集");
    addLog("奇点在当前位置展开定点引力场，开始积蓄坍缩能量。");
  } else {
    for (const bullet of game.enemyBullets) {
      if (!bullet.dead && distance(p, bullet) < 125) {
        bullet.dead = true; removed++;
        emitParticles(bullet.x, bullet.y, COLORS.cyan, 4, 75);
      }
    }
    for (const m of game.minions) if (!m.dead && distance(p, m) < 150) damageMinion(m, 42);
    const summons = (game.fuseSummons || []).filter(s => !s.dead && s.hp > 0 && distance(p, s) < 185).sort((a, b) => distance(p, a) - distance(p, b));
    if (summons[0]) damageFuseSummon(52 * mult, summons[0].x, summons[0].y, summons[0]);
    else if (b.transition === "none" && distance(p, b) < 185) damageBoss(52 * mult, b.x, b.y);
    emitParticles(p.x, p.y, COLORS.cyan, 28, 220);
    showToast(removed ? `折射脉冲：清除 ${removed} 枚弹幕` : "折射脉冲释放");
    addLog("棱镜释放折射脉冲。");
  }
  updateHUD();
}

function useUltimate() {
  if (!game.running || game.paused || game.ultEnergy < 100) {
    if (game.running && game.ultEnergy < 100) showToast("核心能量不足");
    return;
  }
  game.ultEnergy = 0;
  const p = game.player;
  const b = game.boss;
  const character = game.character || "prism";
  const mult = game.mode === "rogue" ? game.rogueBuild.damageMult : 1;

  if (character === "bulwark") {
    // Q：10 秒无敌；期间碰到的敌方弹幕全部储存，结束时全数散射。
    game.bulwarkUltimateTimer = 10;
    game.bulwarkStoredBullets = [];
    game.invulnerable = Math.max(game.invulnerable, 10);
    game.hazards.push({ type: "bulwark-ring", x: p.x, y: p.y, radius: 300, life: 1.0, maxLife: 1.0 });
    emitParticles(p.x, p.y, COLORS.violet, 55, 260);
    showToast("终结技：绝对壁垒启动（10 秒无敌）");
    addLog("壁垒启动绝对壁垒：10 秒内无敌并吸收接触到的弹幕。结束后将散射全部吸收弹幕。");
  } else if (character === "singularity") {
    // Q only clears enemy bullets in its local blast radius. Base damage scales with charge;
    // bullet absorption bonus is independent of charge and capped at +100.
    const radius = 260;
    let absorbedBullets = 0;
    for (const bullet of game.enemyBullets) {
      if (!bullet.dead && distance(p, bullet) < radius) {
        bullet.dead = true;
        absorbedBullets++;
      }
    }
    const charge = clamp(game.singularityCharge ?? 10, 10, 100) / 100;
    const bulletBonus = Math.min(absorbedBullets, 20) * 5;
    const damage = (500 * charge + bulletBonus) * mult;
    for (const m of game.minions) if (!m.dead && distance(p, m) < radius) damageMinion(m, damage);
    for (const summon of (game.fuseSummons || [])) if (!summon.dead && distance(p, summon) < radius) damageFuseSummon(damage, summon.x, summon.y, summon);
    if (distance(p, b) < radius && b.transition === "none") damageBoss(damage, b.x, b.y);
    game.hazards.push({ type: "singularity-collapse", x: p.x, y: p.y, radius, life: 0.85, maxLife: 0.85 });
    emitParticles(p.x, p.y, COLORS.orange, 72, 300);
    game.singularityCharge = 10;
    showToast(`核心坍缩：蓄能 ${Math.round(charge * 100)}% · 吸收 ${absorbedBullets} 枚弹幕`);
    addLog(`奇点释放核心坍缩：蓄能 ${Math.round(charge * 100)}%，清除范围内 ${absorbedBullets} 枚弹幕，弹幕增伤上限 +100；蓄能重置为 10%。`);
  } else {
    game.prismUltimateTimer = 7;
    game.hazards.push({ type: "ultimate", life: 0.7, maxLife: 0.7 });
    emitParticles(p.x, p.y, COLORS.cyan, 55, 250);
    showToast("终结技：交叉棱镜（7 秒强化）");
    addLog("棱镜启动交叉棱镜：持续 7 秒，攻速 +50%、伤害 +25%，普通攻击获得追踪与两次弹射。");
  }
  updateHUD();
}

