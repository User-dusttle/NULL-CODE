// 棱镜强化弹：自动追踪目标，命中后最多弹射两次。
function prismTargetsForBullet(bullet) {
  const b = game.boss;
  const targets = [];
  if (b && b.hp > 0 && b.transition === "none") targets.push(b);
  for (const m of game.minions || []) if (!m.dead && m.hp > 0) targets.push(m);
  for (const m of game.fuseSummons || []) if (!m.dead && m.hp > 0) targets.push(m);
  for (const d of game.fuseDrones || []) if (!d.dead && d.hp > 0) targets.push(d);
  return targets.filter(t => !(bullet.hitTargets || []).includes(t));
}

function onPrismBulletHit(bullet, target) {
  if (bullet.homing && bullet.ricochets > 0) {
    bullet.hitTargets = bullet.hitTargets || [];
    bullet.hitTargets.push(target);
    bullet.ricochets -= 1;
    const next = prismTargetsForBullet(bullet).reduce((best, target) => !best || distance(bullet, target) < distance(bullet, best) ? target : best, null);
    if (next) {
      const dx = next.x - bullet.x, dy = next.y - bullet.y;
      const speed = Math.hypot(bullet.vx, bullet.vy) || 570;
      const len = Math.hypot(dx, dy) || 1;
      bullet.vx = dx / len * speed;
      bullet.vy = dy / len * speed;
      bullet.life = Math.max(bullet.life, 0.45);
      return;
    }
  }
  bullet.dead = true;
}

// ============================================================
// 主更新
// ============================================================

function update(dt) {
  if (DEBUG_MODE && game.player) game.player.hp = game.player.maxHp;
  if (!game.running || game.paused || game.ended) {
    return;
  }

  game.elapsed += dt;

  const p = game.player;
  const b = game.boss;

  if (!p || !b) return;

  game.shootCooldown = Math.max(0, game.shootCooldown - dt);
  game.skillCooldown = Math.max(0, game.skillCooldown - dt);
  game.dashCooldown = Math.max(0, game.dashCooldown - dt);
  game.dashTime = Math.max(0, game.dashTime - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  game.skillFieldTimer = Math.max(0, (game.skillFieldTimer || 0) - dt);
  game.prismUltimateTimer = Math.max(0, (game.prismUltimateTimer || 0) - dt);
  if (game.character === "bulwark") {
    game.ultEnergy = clamp(game.ultEnergy + dt * 1.35, 0, 100);
    if ((game.bulwarkUltimateTimer || 0) > 0) {
      game.bulwarkUltimateTimer = Math.max(0, game.bulwarkUltimateTimer - dt);
      game.invulnerable = Math.max(game.invulnerable, game.bulwarkUltimateTimer);
      if (game.bulwarkUltimateTimer === 0) finishBulwarkUltimate();
    }
  }
  if (game.character === "singularity") { const lens = game.rogueBuild.gravityLens || 0; game.singularityCharge = clamp((game.singularityCharge ?? 10) + dt * (1 + lens * 0.8), 0, 100); game.ultEnergy = clamp(game.ultEnergy + dt * 0.35, 0, 100); }

  if (
    game.toastTimer > 0 &&
    (game.toastTimer -= dt) <= 0
  ) {
    ui.toast.classList.remove("show");
  }

  // 玩家移动与瞄准
  p.angle = angleTo(p, game.mouse);

  if (game.dashTime > 0) {
    p.x += p.dashVx * dt;
    p.y += p.dashVy * dt;
  } else {
    let dx =
      (game.keys.has("d") ? 1 : 0) -
      (game.keys.has("a") ? 1 : 0);

    let dy =
      (game.keys.has("s") ? 1 : 0) -
      (game.keys.has("w") ? 1 : 0);

    const len = Math.hypot(dx, dy);

    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    p.x += dx * p.speed * dt;
    p.y += dy * p.speed * dt;
  }

  p.x = clamp(
    p.x,
    p.radius + 8,
    game.width - p.radius - 8
  );

  p.y = clamp(
    p.y,
    p.radius + 8,
    game.height - p.radius - 8
  );

  if (game.mouse.down) {
    shootPlayer();
  }

  // BOSS 移动与旋转
  b.moveTime += dt;

  const speedMultiplier =
    b.phase === 1 ? 1 :
    b.phase === 2 ? 1.3 : 1.55;

  b.spin += dt * (
    b.phase === 3 ? 2.8 :
    b.phase === 2 ? 1.8 : 1.0
  );

  if (b.type === "stalker") {
    if (b.transition === "none") updateStalkerMovement(dt);
  } else {
    b.x =
      game.width * 0.5 +
      Math.sin(b.moveTime * 0.62 * speedMultiplier) *
        game.width * 0.19;

    b.y = Math.max(
      74,
      game.height * 0.18 +
        Math.sin(b.moveTime * 0.9 * speedMultiplier) * 16
    );
  }

  b.hitFlash = Math.max(0, b.hitFlash - dt);

  // 更新阶段转换与 FUSE-CORE 专属机制
  updateBossTransition(dt);
  if (b.type === "fuse") {
    updateFuseMechanics(dt);
    for (const summon of (game.fuseSummons || [])) updateFuseSummon(dt, summon);
    game.fuseSummons = (game.fuseSummons || []).filter(s => !s.dead || s.hp > 0);
    game.fuseSummon = game.fuseSummons.find(s => !s.dead && s.hp > 0) || null;
  }

  // 普通攻击计时
  const summonActive = b.type === "fuse" && (game.fuseSummons || []).some(s => !s.dead && s.hp > 0);
  const stalkerCanFire = b.type !== "stalker" || b.phase === 1 || b.stalkerState === "hunt";
  if (b.transition === "none" && stalkerCanFire && !summonActive) {
    const interval = b.type === "stalker"
      ? (b.phase === 1 ? 1.25 : b.phase === 2 ? 1.15 : 0.78)
      : (b.phase === 1 ? 1.45 : b.phase === 2 ? 0.88 : 0.68);

    if (game.elapsed >= game.nextEnemyShot) {
      spawnEnemyShotPattern();
      game.nextEnemyShot = game.elapsed + interval;
    }
  }

  // 小怪与其弹幕
  updateMinions(dt);

  // 第二阶段专属空袭
  if (
    ((b.phase === 2 && !(b.type === "fuse" && (game.fuseSummons || []).some(s => !s.dead && s.hp > 0))) || (b.type === "fuse" && b.phase === 4 && !b.fuseShutdown && b.fuseAttackMode === 2)) &&
    b.transition === "none"
  ) {
    b.airstrikeCooldown -= dt;
    if (b.airstrikeCooldown <= 0) {
      spawnAirstrike();
      b.airstrikeCooldown = b.type === "fuse" && b.phase === 4 ? rand(2.8, 3.8) : rand(7, 9.5);
    }
  }

  // 奇点引力场固定在施放位置，不跟随玩家移动。
  if (game.character === "singularity" && game.skillFieldTimer > 0) {
    const radius = game.skillFieldRadius || 210;
    const fx = game.skillFieldX ?? p.x, fy = game.skillFieldY ?? p.y;
    for (const bullet of game.enemyBullets) {
      if (bullet.dead) continue;
      const dx = fx - bullet.x, dy = fy - bullet.y, d = Math.hypot(dx, dy) || 1;
      if (d < radius) { const pull = 260 * dt; bullet.vx += dx / d * pull; bullet.vy += dy / d * pull; }
    }
    for (const target of [...game.minions.filter(m => !m.dead), ...(game.fuseSummons || []).filter(m => !m.dead && m.hp > 0)]) {
      const dx = fx - target.x, dy = fy - target.y, d = Math.hypot(dx, dy) || 1;
      if (d < radius) { target.x += dx / d * 100 * dt; target.y += dy / d * 100 * dt; }
    }
  }

  // 玩家子弹：先检查小怪，再检查 BOSS
  for (const bullet of game.bullets) {
    if (bullet.homing && game.character === "prism" && game.prismUltimateTimer > 0) {
      const targets = prismTargetsForBullet(bullet);
      if (targets.length) {
        let target = targets[0], best = distance(bullet, target);
        for (const candidate of targets) { const d = distance(bullet, candidate); if (d < best) { best = d; target = candidate; } }
        const speed = Math.hypot(bullet.vx, bullet.vy) || 570;
        const dx = target.x - bullet.x, dy = target.y - bullet.y, len = Math.hypot(dx, dy) || 1;
        const desiredX = dx / len * speed, desiredY = dy / len * speed;
        bullet.vx += (desiredX - bullet.vx) * Math.min(1, dt * 5);
        bullet.vy += (desiredY - bullet.vy) * Math.min(1, dt * 5);
      }
    }
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (!bullet.dead) {
      let hitMinion = false;

      // FUSE-CORE 阶段二/三：子弹优先命中独立召唤体。
      if (b.type === "fuse") {
        const targetSummon = (game.fuseSummons || []).find(s => !s.dead && s.hp > 0 && !(bullet.hitTargets || []).includes(s) && distance(bullet, s) < bullet.radius + s.radius);
        if (targetSummon) {
          onPrismBulletHit(bullet, targetSummon);
          damageFuseSummon(bullet.damage, bullet.x, bullet.y, targetSummon);
          emitParticles(bullet.x, bullet.y, targetSummon.type === "observer" ? COLORS.violet : COLORS.pink, 3, 60);
          hitMinion = true;
        }
      }

      // FUSE-CORE 第四阶段：玩家子弹优先命中无人机，再检查普通小怪与核心。
      if (!hitMinion && b.type === "fuse" && b.phase === 4 && b.fuseDronesSpawned) {
        for (const d of (game.fuseDrones || [])) {
          if (!d.dead && d.hp > 0 && !(bullet.hitTargets || []).includes(d) && distance(bullet, d) < bullet.radius + d.radius) {
            onPrismBulletHit(bullet, d);
            damageFuseDrone(d, bullet.damage);
            emitParticles(bullet.x, bullet.y, COLORS.cyan, 3, 60);
            hitMinion = true;
            break;
          }
        }
      }

      for (const m of (hitMinion ? [] : game.minions)) {
        if (
          !m.dead &&
          !(bullet.hitTargets || []).includes(m) &&
          distance(bullet, m) <
            bullet.radius + m.radius
        ) {
          onPrismBulletHit(bullet, m);
          damageMinion(m, bullet.damage);
          emitParticles(
            bullet.x,
            bullet.y,
            COLORS.cyan,
            3,
            60
          );

          hitMinion = true;
          break;
        }
      }

      if (!hitMinion && !bullet.dead) {
        if (
          b.transition === "none" &&
          !(bullet.hitTargets || []).includes(b) &&
          distance(bullet, b) <
            bullet.radius + b.radius
        ) {
          onPrismBulletHit(bullet, b);
          damageBoss(
            bullet.damage,
            bullet.x,
            bullet.y
          );
        }
      }
    }

    if (
      bullet.x < -20 ||
      bullet.x > game.width + 20 ||
      bullet.y < -20 ||
      bullet.y > game.height + 20
    ) {
      bullet.dead = true;
    }
  }

  game.bullets = game.bullets.filter(
    bullet => !bullet.dead && bullet.life > 0
  );

  // 敌方弹幕
  for (const bullet of game.enemyBullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (!bullet.dead && distance(bullet, p) < bullet.radius + p.radius * 0.7) {
      // 壁垒终结技期间：无条件吸收接触到的弹幕，结束时统一散射。
      if (game.character === "bulwark" && (game.bulwarkUltimateTimer || 0) > 0) {
        bullet.dead = true;
        game.bulwarkStoredBullets = game.bulwarkStoredBullets || [];
        game.bulwarkStoredBullets.push({ damage: bullet.damage || 10, radius: bullet.radius || 3 });
        emitParticles(p.x, p.y, COLORS.violet, 8, 95);
      } else if (game.invulnerable <= 0) {
        bullet.dead = true;
        damagePlayer(bullet.damage);
        emitParticles(p.x, p.y, COLORS.pink, 10, 100);
        showToast("核心受到冲击");
        addLog(`受到 ${bullet.damage} 点伤害。`);
      }
    }

    if (
      bullet.x < -40 ||
      bullet.x > game.width + 40 ||
      bullet.y < -40 ||
      bullet.y > game.height + 40
    ) {
      bullet.dead = true;
    }
  }

  game.enemyBullets = game.enemyBullets.filter(
    bullet => !bullet.dead && bullet.life > 0
  );

  // 粒子
  for (const particle of game.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;

    particle.vx *= Math.pow(0.04, dt);
    particle.vy *= Math.pow(0.04, dt);

    particle.life -= dt;
  }

  game.particles = game.particles.filter(
    particle => particle.life > 0
  );

  // 危险区域与空袭倒计时
  for (const hazard of game.hazards) {
    if (hazard.type === "airstrike") {
      if (hazard.fired) continue;
      hazard.life -= dt;
      if (hazard.life <= 0) {
        hazard.fired = true;
        fireAirstrikeRing(hazard);
      }
    } else if (hazard.type === "stalker-rift") {
      if (hazard.fired) continue;
      hazard.life -= dt;
      if (hazard.life <= 0) {
        hazard.fired = true;
        fireStalkerRift(hazard);
      }
    } else if (hazard.type === "stalker-seal") {
      // 两套攻击独立计时：持续循环发射十字弹，环形弹幕按周期单独触发。
      hazard.life -= dt;
      hazard.crossTimer -= dt;
      hazard.ringTimer -= dt;
      if (hazard.crossTimer <= 0) {
        fireStalkerSealCross(hazard);
        hazard.crossTimer += 0.72;
      }
      if (hazard.ringTimer <= 0) {
        spawnStalkerRing(hazard.x, hazard.y, 10, 112);
        hazard.ringTimer += 1.45;
      }
    } else if (hazard.type === "stalker-warp-source") {
      // 转阶段源裂隙一直存在，只有猎手完成一次跃迁后才被销毁。
      hazard.life -= dt;
    } else if (hazard.type === "fuse-laser") {
      // 激光由 updateFuseMechanics 独立计时，避免重复扣时。
    } else {
      hazard.life -= dt;
    }
  }

  game.hazards = game.hazards.filter(hazard => {
    if (hazard.type === "airstrike" || hazard.type === "stalker-rift") {
      return !hazard.fired;
    }
    if (hazard.type === "fuse-laser") return hazard.life > 0;
    return hazard.life > 0;
  });

  // 胜负判定
  if (b.hp <= 0) {
    b.hp = 0;
    updateHUD();
    endRun(true);
    return;
  }

  if (DEBUG_MODE) p.hp = p.maxHp;
  if (!DEBUG_MODE && p.hp <= 0) {
    p.hp = 0;
    updateHUD();
    endRun(false);
    return;
  }

  updateHUD();
}

// ============================================================
// 绘制背景
// ============================================================

