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

  // 玩家子弹：先检查小怪，再检查 BOSS
  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (!bullet.dead) {
      let hitMinion = false;

      // FUSE-CORE 阶段二/三：子弹优先命中独立召唤体。
      if (b.type === "fuse") {
        const targetSummon = (game.fuseSummons || []).find(s => !s.dead && s.hp > 0 && distance(bullet, s) < bullet.radius + s.radius);
        if (targetSummon) {
          bullet.dead = true;
          damageFuseSummon(bullet.damage, bullet.x, bullet.y, targetSummon);
          emitParticles(bullet.x, bullet.y, targetSummon.type === "observer" ? COLORS.violet : COLORS.pink, 3, 60);
          hitMinion = true;
        }
      }

      // FUSE-CORE 第四阶段：玩家子弹优先命中无人机，再检查普通小怪与核心。
      if (!hitMinion && b.type === "fuse" && b.phase === 4 && b.fuseDronesSpawned) {
        for (const d of (game.fuseDrones || [])) {
          if (!d.dead && d.hp > 0 && distance(bullet, d) < bullet.radius + d.radius) {
            bullet.dead = true;
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
          distance(bullet, m) <
            bullet.radius + m.radius
        ) {
          bullet.dead = true;
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
          distance(bullet, b) <
            bullet.radius + b.radius
        ) {
          bullet.dead = true;
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

    if (
      !bullet.dead &&
      game.invulnerable <= 0 &&
      distance(bullet, p) <
        bullet.radius + p.radius * 0.7
    ) {
      bullet.dead = true;
      damagePlayer(bullet.damage);

      emitParticles(
        p.x,
        p.y,
        COLORS.pink,
        10,
        100
      );

      showToast("核心受到冲击");
      addLog(`受到 ${bullet.damage} 点伤害。`);
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

