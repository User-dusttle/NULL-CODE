// ============================================================
// FUSE-CORE 四阶段机制
// ============================================================

function spawnFuseSummon(kind) {
  const b = game.boss;
  if (!b || b.type !== "fuse") return;
  const observer = kind === "observer";
  const summon = {
    type: kind,
    name: observer ? "弱化观测者" : "弱化裂隙猎手",
    codename: observer ? "OBSERVER-ECHO" : "RIFT-ECHO",
    x: clamp(b.x + (observer ? -145 : 145), 70, game.width - 70),
    y: Math.max(100, b.y + 55),
    radius: observer ? 25 : 23,
    hp: observer ? 1350 : 1550,
    maxHp: observer ? 1350 : 1550,
    spin: 0, hitFlash: 0, timer: 0,
    shotTimer: observer ? 0.65 : 0.85,
    dashTimer: 2.6, dashTime: 0, vx: 0, vy: 0, dead: false,
  };
  if (!Array.isArray(game.fuseSummons)) game.fuseSummons = [];
  game.fuseSummons.push(summon);
  // Keep the legacy alias pointing at the first living summon for compatibility.
  game.fuseSummon = game.fuseSummons.find(x => !x.dead) || summon;
  addLog(observer
    ? "观测者复现体已实体化：环形弹幕正在建立。"
    : "裂隙猎手复现体已实体化：追踪与裂隙冲刺已启动。"
  );
  showToast(observer ? "弱化观测者出现" : "弱化裂隙猎手出现");
}

function getLivingFuseSummons() {
  return (game.fuseSummons || []).filter(s => !s.dead && s.hp > 0);
}

function damageFuseSummon(damage, sourceX, sourceY, target = null) {
  const s = target || (game.fuseSummons || []).find(x => !x.dead && x.hp > 0) || game.fuseSummon;
  if (!s || s.dead || s.hp <= 0) return false;
  s.hp = Math.max(0, s.hp - damage);
  s.hitFlash = 0.12;
  const color = s.type === "observer" ? COLORS.violet : COLORS.pink;
  if (sourceX !== undefined && sourceY !== undefined) emitParticles(sourceX, sourceY, color, 3, 65);
  if (s.hp <= 0) {
    s.dead = true;
    spawnDeathEffect(s.x, s.y, "summon", color, s.radius || 24);
    emitParticles(s.x, s.y, color, 30, 180);
    if (!(game.character === "prism" && game.prismUltimateTimer > 0)) game.ultEnergy = clamp(game.ultEnergy + 12, 0, 100);
    const living = getLivingFuseSummons();
    game.fuseSummon = living[0] || null;
    addLog(`${s.name} 已被击败。剩余复现体：${living.length}/2。`);
    if (living.length === 0) {
      game.enemyBullets = [];
      addLog("双重复现协议解除。FUSE-CORE 护盾解除，核心重新暴露。");
      showToast("两个复现体均已消灭：核心恢复可攻击状态");
    } else {
      showToast(`${s.name} 已消灭，另一个复现体仍在运行`);
    }
  }
  return true;
}

function updateFuseSummon(dt, s) {
  const b = game.boss;
  const p = game.player;
  if (!s || s.dead || s.hp <= 0 || !b || b.type !== "fuse" || !p) return;
  s.timer += dt;
  s.spin += dt * (s.type === "observer" ? 1.8 : 2.6);
  s.hitFlash = Math.max(0, s.hitFlash - dt);
  if (s.type === "observer") {
    const tx = clamp(b.x + Math.sin(s.timer * 0.72) * game.width * 0.22 - 95, 55, game.width - 55);
    const ty = Math.max(105, b.y + 65 + Math.sin(s.timer * 1.15) * 18);
    s.x += (tx - s.x) * Math.min(1, dt * 2.3);
    s.y += (ty - s.y) * Math.min(1, dt * 2.3);
    s.shotTimer -= dt;
    if (s.shotTimer <= 0) {
      const aim = angleTo(s, p), gap = aim + Math.PI;
      for (let i = 0; i < 16; i++) {
        const a = s.spin + i * Math.PI * 2 / 16;
        if (Math.abs(angleDiff(a, gap)) < 0.34) continue;
        const speed = 132;
        game.enemyBullets.push({ x:s.x, y:s.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, radius:4, life:5.2, damage:6, color:COLORS.violet });
      }
      s.shotTimer = 1.55;
    }
  } else {
    s.dashTimer -= dt;
    if (s.dashTime > 0) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.dashTime -= dt;
      s.x = clamp(s.x, s.radius + 10, game.width - s.radius - 10);
      s.y = clamp(s.y, 80, game.height * 0.62);
    } else {
      const tx = clamp(b.x + Math.sin(s.timer * 1.3) * game.width * 0.24 + 105, 55, game.width - 55);
      const ty = Math.max(100, b.y + 48 + Math.sin(s.timer * 1.7) * 35);
      s.x += (tx - s.x) * Math.min(1, dt * 2.8);
      s.y += (ty - s.y) * Math.min(1, dt * 2.8);
    }
    if (s.dashTimer <= 0 && s.dashTime <= 0) {
      const a = angleTo(s, p);
      s.vx = Math.cos(a) * 390; s.vy = Math.sin(a) * 260;
      s.dashTime = 0.28; s.dashTimer = 3.2;
      emitParticles(s.x, s.y, COLORS.pink, 10, 120);
    }
    s.shotTimer -= dt;
    if (s.shotTimer <= 0) {
      const aim = angleTo(s, p);
      for (let i = -2; i <= 2; i++) {
        const a = aim + i * 0.17, speed = 180;
        game.enemyBullets.push({ x:s.x, y:s.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, radius:4.2, life:4.3, damage:7, color:COLORS.pink });
      }
      s.shotTimer = 1.25;
    }
  }
}

function spawnFuseDrones() {
  const b = game.boss;
  if (!b || b.type !== "fuse" || b.fuseDronesSpawned) return;
  b.fuseDronesSpawned = true;
  game.fuseDrones = [];
  for (let i = 0; i < 10; i++) {
    game.fuseDrones.push({
      id: i,
      angle: Math.PI * 2 * i / 10,
      orbitRadius: 78 + (i % 2) * 18,
      radius: 9,
      hp: 240,
      maxHp: 240,
      x: b.x,
      y: b.y,
      shootTimer: 1.1 + i * 0.12,
      dead: false,
    });
  }
  b.fuseAttackMode = 0;
  b.fuseAttackModeTimer = 4.5;
  addLog("阶段 04：防御无人机部署完成。每架无人机 240 HP，并为核心提供 10% 减伤。");
  showToast("阶段 04：摧毁 10 架无人机");
}

function spawnFuseLaser() {
  const b = game.boss;
  const p = game.player;
  if (!b || !p || b.type !== "fuse") return;
  const a = angleTo(b, p);
  const length = Math.hypot(game.width, game.height) * 1.15;
  game.hazards.push({
    type: "fuse-laser",
    x1: b.x, y1: b.y,
    x2: b.x + Math.cos(a) * length,
    y2: b.y + Math.sin(a) * length,
    angle: a,
    life: 0.9,
    maxLife: 0.9,
    telegraph: 0.58,
    fired: false,
    damage: 16,
  });
  addLog("FUSE-CORE 锁定玩家位置：高能激光即将发射。");
  showToast("警告：高能激光锁定");
}

function updateFuseMechanics(dt) {
  const b = game.boss;
  if (!b || b.type !== "fuse") return;

  // 第一阶段：核心窗口每 10 秒循环，前 5 秒开放。
  if (b.phase === 1 && !b.fuseShutdown) {
    b.fuseCycleTimer += dt;
    if (b.fuseCycleTimer >= 10) {
      b.fuseCycleTimer -= 10;
      b.fuseCoreIndex = (b.fuseCoreIndex + 1) % 4;
      addLog(`核心轮转至节点 ${b.fuseCoreIndex + 1}/4。`);
    }
    const open = b.fuseCycleTimer < 5;
    if (open !== b.fuseWeakpointOpen) {
      b.fuseWeakpointOpen = open;
      addLog(open ? "核心弱点开放 5 秒：立即攻击。" : "核心护盾闭合：等待下一轮窗口。");
      showToast(open ? "核心弱点开放" : "核心护盾闭合");
    }
  }

  // 第一阶段：周期性激光锁定。先给出预警，再沿锁定方向发射。
  if (b.phase === 1 && !b.fuseShutdown) {
    b.fusePhaseOneLaserCooldown = (b.fusePhaseOneLaserCooldown ?? 3.5) - dt;
    if (b.fusePhaseOneLaserCooldown <= 0) {
      spawnFuseLaser();
      b.fusePhaseOneLaserCooldown = 6.8;
    }
  }

  // 第四阶段：无人机环绕、独立射击，四种攻击模式轮转。
  if (b.phase === 4 && b.fuseDronesSpawned && !b.fuseShutdown) {
    b.fuseAttackModeTimer -= dt;
    if (b.fuseAttackModeTimer <= 0) {
      b.fuseAttackMode = (b.fuseAttackMode + 1) % 4;
      b.fuseAttackModeTimer = 4.5;
      const modes = ["定向射击", "环形弹幕", "区域空袭", "高能激光"];
      addLog(`FUSE-CORE 攻击协议切换：${modes[b.fuseAttackMode]}。`);
      showToast(`攻击协议：${modes[b.fuseAttackMode]}`);
      if (b.fuseAttackMode === 3) b.fuseLaserCooldown = 0.25;
      if (b.fuseAttackMode === 2) b.airstrikeCooldown = 0.4;
    }

    const alive = game.fuseDrones.filter(d => !d.dead && d.hp > 0);
    for (const d of alive) {
      d.angle += dt * (0.8 + d.id * 0.012);
      const tx = b.x + Math.cos(d.angle) * d.orbitRadius;
      const ty = b.y + Math.sin(d.angle) * d.orbitRadius * 0.72;
      d.x += (tx - d.x) * Math.min(1, dt * 5);
      d.y += (ty - d.y) * Math.min(1, dt * 5);
      d.shootTimer -= dt;
      if (d.shootTimer <= 0 && b.fuseAttackMode === 0) {
        const p = game.player;
        if (p) {
          const a = angleTo(d, p);
          const speed = 145 + (10 - alive.length) * 4;
          game.enemyBullets.push({ x:d.x, y:d.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, radius:3.5, life:4.2, damage:5, color:COLORS.orange });
        }
        d.shootTimer = Math.max(0.8, 2.2 - (10 - alive.length) * 0.06);
      }
    }

    if (b.fuseAttackMode === 3) {
      b.fuseLaserCooldown -= dt;
      if (b.fuseLaserCooldown <= 0) {
        spawnFuseLaser();
        b.fuseLaserCooldown = 4.5;
      }
    }
  }

  // 激光先预警，随后判定玩家是否处于线段附近。
  const p = game.player;
  for (const h of game.hazards) {
    if (h.type !== "fuse-laser") continue;
    if (h.fired) {
      h.life -= dt;
      continue;
    }
    h.life -= dt;
    h.telegraph -= dt;
    if (h.telegraph <= 0) {
      h.fired = true;
      h.life = 0.18; // 激光命中后保留短暂光束闪光
      if (p && game.invulnerable <= 0) {
        const vx = h.x2 - h.x1, vy = h.y2 - h.y1;
        const denom = vx * vx + vy * vy || 1;
        const t = clamp(((p.x - h.x1) * vx + (p.y - h.y1) * vy) / denom, 0, 1);
        const qx = h.x1 + t * vx, qy = h.y1 + t * vy;
        if (Math.hypot(p.x - qx, p.y - qy) < p.radius + 8) {
          damagePlayer(h.damage);
          emitParticles(p.x, p.y, COLORS.pink, 16, 130);
          showToast("高能激光命中");
          addLog(`受到 ${h.damage} 点激光伤害。`);
        }
      }
    }
  }
  game.hazards = game.hazards.filter(h => h.type !== "fuse-laser" || h.life > 0);
}

function updateFuseTransition() {
  const b = game.boss;
  if (!b || b.type !== "fuse" || b.transition !== "none") return;

  if (b.phase === 1 && b.hp <= b.maxHp * 0.70) {
    b.phase = 2;
    b.fuseCycleTimer = 0;
    b.fuseWeakpointOpen = true;
    b.attackTimer = 0;
    game.enemyBullets = [];
    game.fuseSummons = [];
    game.fuseSummon = null;
    game.nextEnemyShot = game.elapsed + 0.65;
    ui.phaseLabel.textContent = "阶段 02–03 · 双重复现";
    addLog("核心协议崩解。观测者与裂隙猎手同时实体化！先击败两个复现体。");
    showToast("双重复现：观测者 + 裂隙猎手");
    emitParticles(b.x, b.y, COLORS.violet, 34, 190);
    spawnFuseSummon("observer");
    spawnFuseSummon("stalker");
  } else if ((b.phase === 2 || b.phase === 3) && getLivingFuseSummons().length === 0 && b.hp <= b.maxHp * 0.30) {
    b.phase = 4;
    b.attackTimer = 0;
    game.enemyBullets = [];
    game.nextEnemyShot = game.elapsed + 0.45;
    ui.phaseLabel.textContent = "阶段 04 · 无人机清除";
    addLog("双重复现协议全部失效。FUSE-CORE 启动最终防御网。");
    spawnFuseDrones();
    showToast("阶段 04：摧毁全部无人机");
    emitParticles(b.x, b.y, COLORS.orange, 46, 220);
  }
}

function spawnEnemyShotPattern() {
  const b = game.boss;
  const p = game.player;

  if (!b || !p || b.transition !== "none") return;

  const phase = b.phase;
  const aimed = angleTo(b, p);

  // BOSS 02：裂隙猎手，使用交叉扇形与追踪弹，节奏更急促。
  if (b.type === "stalker") {
    if (phase === 1) {
      // 阶段一：朝地图中心发射，不瞄准玩家，也不冲刺。
      const center = { x: game.width * 0.5, y: game.height * 0.5 };
      const centerAngle = angleTo(b, center);
      for (const offset of [-0.22, -0.11, 0, 0.11, 0.22]) {
        const a = centerAngle + offset;
        const speed = 175;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 4.5, life: 4.5, damage: 9, color: COLORS.cyan });
      }
    } else if (phase === 2) {
      // 阶段二常规攻击：清晰的五发扇形弹幕。
      for (let i = -2; i <= 2; i++) {
        const a = aimed + i * 0.16;
        const speed = 205;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 4.8, life: 4.8, damage: 10, color: COLORS.violet });
      }
    } else {
      // 阶段三保留扇形机制，增加子弹数量和速度。
      for (let i = -3; i <= 3; i++) {
        const a = aimed + i * 0.15;
        const speed = 250;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 5, life: 4.5, damage: 11, color: COLORS.pink });
      }
    }
    return;
  }

  // FUSE-CORE 四阶段攻击协议。
  if (b.type === "fuse") {
    if ((phase === 2 || phase === 3) && game.fuseSummon && !game.fuseSummon.dead) return;
    if (phase === 1) {
      // 熔断炮列：短促宽扇形。
      for (let i = -3; i <= 3; i++) {
        const a = aimed + i * 0.16;
        game.enemyBullets.push({ x:b.x, y:b.y+14, vx:Math.cos(a)*150, vy:Math.sin(a)*150, radius:5, life:5, damage:9, color:COLORS.orange });
      }
    } else if (phase === 2) {
      // 弱化观测者：带安全缺口的环形弹幕。
      const gap = aimed + Math.PI;
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI * 2 / 16 + b.spin;
        if (Math.abs(angleDiff(a, gap)) < 0.32) continue;
        game.enemyBullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*145, vy:Math.sin(a)*145, radius:4.2, life:5.4, damage:8, color:COLORS.violet });
      }
    } else if (phase === 3) {
      // 弱化裂隙猎手：快速扇形与交叉弹道，不启用完整冲刺状态机。
      for (let i = -2; i <= 2; i++) {
        const a = aimed + i * 0.14;
        game.enemyBullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*215, vy:Math.sin(a)*215, radius:4.6, life:4.5, damage:9, color:COLORS.pink });
      }
      for (const offset of [-0.34, 0.34]) {
        const a = aimed + offset + Math.PI / 2;
        game.enemyBullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*150, vy:Math.sin(a)*150, radius:3.8, life:4.5, damage:7, color:COLORS.cyan });
      }
    } else {
      // 第四阶段由四种攻击协议控制；2=空袭时暂停普通弹幕，3=激光时发射激光。
      if (b.fuseShutdown || b.fuseAttackMode === 2 || b.fuseAttackMode === 3) return;
      if (b.fuseAttackMode === 1) {
        for (let i = 0; i < 18; i++) {
          const a = i * Math.PI * 2 / 18 + b.spin;
          game.enemyBullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*165, vy:Math.sin(a)*165, radius:4.4, life:5.2, damage:8, color:COLORS.orange });
        }
      } else {
        for (let i = -2; i <= 2; i++) {
          const a = aimed + i * 0.13;
          game.enemyBullets.push({ x:b.x, y:b.y, vx:Math.cos(a)*205, vy:Math.sin(a)*205, radius:4.6, life:4.6, damage:8, color:COLORS.orange });
        }
      }
    }
    return;
  }

  if (phase === 1) {
    // 第一阶段：三连瞄准弹
    for (const offset of [-0.18, 0, 0.18]) {
      const a = aimed + offset;
      const speed = 155;

      game.enemyBullets.push({
        x: b.x,
        y: b.y + 15,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 5,
        life: 5,
        damage: 12,
        color: COLORS.pink,
      });
    }
  } else if (phase === 2) {
    // 第二阶段：带安全缺口的环形弹幕
    const gap = aimed + Math.PI;

    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12 + b.spin;

      if (Math.abs(angleDiff(a, gap)) < 0.31) {
        continue;
      }

      const speed = 175;

      game.enemyBullets.push({
        x: b.x,
        y: b.y + 10,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 4.5,
        life: 5.5,
        damage: 10,
        color: COLORS.pink,
      });
    }
  } else {
    // 第三阶段：高速交错环形弹幕
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI * 2 / 16 + b.spin * 1.4;
      const speed = i % 2 ? 225 : 175;

      game.enemyBullets.push({
        x: b.x,
        y: b.y + 8,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 4.5,
        life: 5.5,
        damage: 11,
        color: i % 2 ? COLORS.pink : COLORS.orange,
      });
    }
  }
}

// ============================================================
// 空袭
// ============================================================

function spawnAirstrike() {
  // 固定两个落点，避免安全区域被一次性封死。
  const count = 2;

  for (let i = 0; i < count; i++) {
    game.hazards.push({
      type: "airstrike",

      x: rand(55, game.width - 55),
      y: rand(game.height * 0.3, game.height * 0.85),

      radius: 30,
      life: 1.8,
      maxLife: 1.8,
      fired: false,
    });
  }

  addLog("空袭锁定：注意地面标记。");
  showToast("警告：检测到空间轰击");
}

function fireAirstrikeRing(hazard) {
  const count = 10;
  const offset = Math.random() * Math.PI * 2;

  emitParticles(
    hazard.x,
    hazard.y,
    COLORS.orange,
    20,
    140
  );

  for (let i = 0; i < count; i++) {
    const a = offset + i * Math.PI * 2 / count;
    const speed = 132;

    game.enemyBullets.push({
      x: hazard.x,
      y: hazard.y,

      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,

      radius: 4.5,
      life: 4.5,
      damage: 10,
      color: COLORS.orange,
    });
  }
}

// ============================================================
// BOSS 阶段转换与终极大招
// ============================================================

function startBossUltimate() {
  const b = game.boss;

  if (b.ultimateTriggered) return;

  b.ultimateTriggered = true;
  b.transition = "charge";
  b.transitionTimer = 2.4;
  b.ultimateRingTimer = 0;
  b.ultimateCircleTimer = 0.65;
  b.ultimateSpiralAngle = rand(0, Math.PI * 2);

  // 大招开始时清场，也清除尚未引爆的空袭标记。
  game.minions = [];
  game.enemyBullets = [];
  game.hazards = game.hazards.filter(hazard => hazard.type !== "airstrike");

  addLog("观测者开始终极充能。");
  showToast("警告：观测者正在充能");
}

function finishBossUltimate() {
  const b = game.boss;

  b.transition = "none";
  b.phase = 2;
  b.airstrikeCooldown = 4.5;

  // 立即允许第二阶段攻击重新计时
  game.nextEnemyShot = game.elapsed + 0.6;

  ui.phaseLabel.textContent = "阶段 02 · 增压";

  addLog("观测者进入第二阶段。");
  showToast("阶段 02：增压");

  emitParticles(
    b.x,
    b.y,
    COLORS.violet,
    35,
    180
  );
}

function spawnStalkerRing(x, y, count = 12, speed = 145) {
  const p = game.player;
  const safeAngle = p ? angleTo({ x, y }, p) + Math.PI : 0;
  const offset = rand(0, Math.PI * 2);
  for (let i = 0; i < count; i++) {
    const a = offset + i * Math.PI * 2 / count;
    if (Math.abs(angleDiff(a, safeAngle)) < 0.24) continue;
    game.enemyBullets.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      radius: 4.2, life: 5.2, damage: 8, color: COLORS.cyan,
    });
  }
}

function spawnStalkerSeal(x, y) {
  // 阶段一转阶段专用标记：不可摧毁，存活至 20 秒转场结束。
  game.hazards.push({
    type: "stalker-seal", x, y, radius: 25,
    life: 20, maxLife: 20, crossTimer: 0.1, ringTimer: 1.45,
    fired: false,
  });
}

function fireStalkerSealCross(seal) {
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    game.enemyBullets.push({
      x: seal.x, y: seal.y,
      vx: Math.cos(a) * 165, vy: Math.sin(a) * 165,
      radius: 4.2, life: 5.2, damage: 8, color: COLORS.pink,
    });
  }
}

function fireStalkerRift(hazard) {
  emitParticles(hazard.x, hazard.y, COLORS.pink, 18, 145);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    game.enemyBullets.push({
      x: hazard.x, y: hazard.y,
      vx: Math.cos(a) * 185, vy: Math.sin(a) * 185,
      radius: 4.5, life: 4.5, damage: 9, color: COLORS.pink,
    });
  }
  spawnStalkerRing(hazard.x, hazard.y, 10, 115);
}

function updateStalkerMovement(dt) {
  const b = game.boss;
  const p = game.player;
  if (!b || !p || b.type !== "stalker" || b.transition !== "none") return;

  // PHASE 01：只沿场地中央周围的椭圆轨道移动，绝不冲刺。
  if (b.phase === 1) {
    b.stalkerOrbitAngle = (b.stalkerOrbitAngle ?? -Math.PI / 2) + dt * 1.35;
    const rx = Math.min(game.width * 0.25, 205);
    const ry = Math.min(game.height * 0.19, 125);
    b.x = game.width * 0.5 + Math.cos(b.stalkerOrbitAngle) * rx;
    b.y = game.height * 0.36 + Math.sin(b.stalkerOrbitAngle) * ry;
    return;
  }

  // PHASE 02/03：普通追猎循环 hunt -> charge -> dash -> stun。
  b.stalkerStateTimer = Math.max(0, (b.stalkerStateTimer ?? 0) - dt);
  b.stalkerDashCooldown = Math.max(0, (b.stalkerDashCooldown ?? 0) - dt);

  if (!b.stalkerState || b.stalkerState === "orbit") {
    b.stalkerState = "hunt";
    b.stalkerStateTimer = 1.4;
  }

  if (b.stalkerState === "hunt") {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const a = Math.atan2(dy, dx) + Math.PI * 0.62;
    const orbitRadiusX = b.phase === 3 ? 135 : 165;
    const orbitRadiusY = b.phase === 3 ? 100 : 120;
    const tx = clamp(p.x + Math.cos(a) * orbitRadiusX, 50, game.width - 50);
    const ty = clamp(p.y + Math.sin(a) * orbitRadiusY, 55, game.height * 0.60);
    const blend = Math.min(1, dt * (b.phase === 3 ? 3.2 : 2.0));
    b.x += (tx - b.x) * blend;
    b.y += (ty - b.y) * blend;

    if (b.stalkerStateTimer <= 0 && b.stalkerDashCooldown <= 0) {
      b.stalkerState = "charge";
      b.stalkerStateTimer = b.phase === 3 ? 0.42 : 0.72;
      b.stalkerTargetX = p.x;
      b.stalkerTargetY = p.y;
      addLog("裂隙猎手停止攻击，开始蓄力。冲刺目标将在蓄力结束时锁定。");
      showToast("警告：冲刺路线预备中");
      game.hazards = game.hazards.filter(h => h.type !== "stalker-telegraph");
      game.hazards.push({
        type: "stalker-telegraph", x1: b.x, y1: b.y,
        x2: p.x, y2: p.y, life: b.stalkerStateTimer,
        maxLife: b.stalkerStateTimer,
      });
    } else if (b.stalkerStateTimer <= 0) {
      b.stalkerStateTimer = 0.25;
    }
  } else if (b.stalkerState === "charge") {
    // 红色预警跟随玩家位置；冲刺开始前才最终锁定坐标。
    const warning = game.hazards.find(h => h.type === "stalker-telegraph");
    if (warning) {
      warning.x1 = b.x; warning.y1 = b.y;
      warning.x2 = p.x; warning.y2 = p.y;
      warning.life = b.stalkerStateTimer;
      warning.maxLife = Math.max(warning.maxLife, b.stalkerStateTimer);
    }
    if (b.stalkerStateTimer <= 0) {
      b.stalkerTargetX = clamp(p.x, 25, game.width - 25);
      b.stalkerTargetY = clamp(p.y, 25, game.height - 25);
      b.stalkerStartX = b.x;
      b.stalkerStartY = b.y;
      const dx = b.stalkerTargetX - b.x;
      const dy = b.stalkerTargetY - b.y;
      const len = Math.hypot(dx, dy) || 1;
      b.stalkerDashVx = dx / len;
      b.stalkerDashVy = dy / len;
      b.stalkerDashDuration = b.phase === 3 ? 0.19 : 0.31;
      b.stalkerState = "dash";
      b.stalkerStateTimer = b.stalkerDashDuration;
      b.stalkerSideShotTimer = 0;
      b.stalkerHitPlayer = false;
      game.hazards = game.hazards.filter(h => h.type !== "stalker-telegraph");
      game.hazards.push({
        type: "stalker-slash", x1: b.x, y1: b.y,
        x2: b.stalkerTargetX, y2: b.stalkerTargetY,
        life: b.stalkerDashDuration + 0.12,
        maxLife: b.stalkerDashDuration + 0.12,
      });
    }
  } else if (b.stalkerState === "dash") {
    const duration = b.stalkerDashDuration || 0.31;
    const progress = clamp(1 - b.stalkerStateTimer / duration, 0, 1);
    b.x = b.stalkerStartX + (b.stalkerTargetX - b.stalkerStartX) * progress;
    b.y = b.stalkerStartY + (b.stalkerTargetY - b.stalkerStartY) * progress;

    // 冲刺期间沿运动方向的左右两侧发射弹幕。
    b.stalkerSideShotTimer -= dt;
    if (b.stalkerSideShotTimer <= 0) {
      const direction = Math.atan2(b.stalkerDashVy, b.stalkerDashVx);
      for (const side of [-1, 1]) {
        const a = direction + side * Math.PI / 2;
        game.enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * 175, vy: Math.sin(a) * 175,
          radius: 4.3, life: 4.5, damage: 8, color: COLORS.pink,
        });
      }
      b.stalkerSideShotTimer = 0.075;
    }

    // 冲刺本体碰到玩家时每次冲刺只结算一次伤害。
    if (!b.stalkerHitPlayer && game.invulnerable <= 0 && distance(b, p) < b.radius + p.radius) {
      damagePlayer(18);
      b.stalkerHitPlayer = true;
      emitParticles(p.x, p.y, COLORS.pink, 12, 115);
      showToast("裂隙冲撞命中");
      addLog("被裂隙猎手的冲刺路径命中，受到 18 点伤害。");
    }

    if (b.stalkerStateTimer <= 0) {
      b.x = b.stalkerTargetX;
      b.y = b.stalkerTargetY;
      spawnStalkerRing(b.x, b.y, b.phase === 3 ? 14 : 11, b.phase === 3 ? 170 : 138);
      emitParticles(b.x, b.y, COLORS.cyan, 24, 180);
      b.stalkerState = "stun";
      b.stalkerStateTimer = b.phase === 3 ? 1.0 : 3.0;
      addLog(`冲刺结束。裂隙猎手眩晕 ${b.phase === 3 ? 1 : 3} 秒。`);
    }
  } else if (b.stalkerState === "stun") {
    if (b.stalkerStateTimer <= 0) {
      b.stalkerState = "hunt";
      b.stalkerStateTimer = b.phase === 3 ? 0.8 : 1.3;
      b.stalkerDashCooldown = b.phase === 3 ? 0.45 : 0.9;
    }
  }
}

function updateStalkerTransition(dt) {
  const b = game.boss;

  // PHASE 01 -> PHASE 02：20 秒裂隙封锁，BOSS 全程隐身。
  if (b.transition === "none" && b.phase === 1 && b.hp <= b.maxHp * 0.65) {
    b.transition = "stalker_rifts";
    b.transitionTimer = 20;
    b.stalkerRiftTimer = 0;
    b.stalkerRiftCount = 0;
    b.stalkerState = "orbit";
    game.enemyBullets = [];
    game.minions = [];
    game.hazards = game.hazards.filter(h => h.type === "ultimate");
    addLog("裂隙封锁启动：猎手隐身，四个裂隙标记将依次生成。");
    showToast("警告：裂隙封锁，持续 20 秒");
  }

  if (b.transition === "stalker_rifts") {
    b.transitionTimer -= dt;
    b.stalkerRiftTimer -= dt;
    if (b.stalkerRiftTimer <= 0 && b.stalkerRiftCount < 4) {
      spawnStalkerSeal(
        rand(55, game.width - 55),
        rand(55, game.height - 55)
      );
      b.stalkerRiftCount++;
      b.stalkerRiftTimer = 5;
      addLog(`裂隙标记 ${b.stalkerRiftCount}/4 已生成。`);
    }
    if (b.transitionTimer <= 0) {
      game.hazards = game.hazards.filter(h => h.type !== "stalker-seal");
      b.transition = "none";
      b.phase = 2;
      b.x = game.width * 0.5;
      b.y = game.height * 0.34;
      b.stalkerState = "hunt";
      b.stalkerStateTimer = 1.5;
      b.stalkerDashCooldown = 1.6;
      b.attackTimer = 0.5;
      game.nextEnemyShot = game.elapsed + 0.6;
      spawnStalkerRing(b.x, b.y, 14, 145);
      ui.phaseLabel.textContent = "阶段 02 · 高速追猎";
      addLog("裂隙封锁结束。猎手在中央显形，发射环形弹幕。");
      showToast("阶段 02：高速追猎");
      emitParticles(b.x, b.y, COLORS.pink, 30, 185);
    }
    return;
  }

  // PHASE 02 -> PHASE 03：隐身，在裂隙之间连续穿梭。
  if (b.transition === "none" && b.phase === 2 && b.hp <= b.maxHp * 0.30) {
    b.transition = "stalker_warp";
    b.transitionTimer = 5.5;
    // 第三阶段入口：在场地内生成可见传送门，作为阶段转换的明确目标。
    game.hazards = game.hazards.filter(h => h.type !== "stalker-phase-portal");
    for (let i = 0; i < 3; i++) {
      const angle = -Math.PI / 2 + i * Math.PI * 2 / 3;
      game.hazards.push({
        type: "stalker-phase-portal",
        x: clamp(game.width * 0.5 + Math.cos(angle) * game.width * 0.29, 58, game.width - 58),
        y: clamp(game.height * 0.40 + Math.sin(angle) * game.height * 0.27, 58, game.height - 58),
        radius: 30, life: 5.5, maxLife: 5.5, spin: angle,
      });
    }
    b.stalkerWarpTimer = 0.25;
    b.stalkerWarpState = "wait";
    b.stalkerWarpSource = { x: b.x, y: b.y };
    b.stalkerWarpDestination = null;
    b.stalkerWarpIndex = 0;
    game.enemyBullets = [];
    game.hazards = game.hazards.filter(h => h.type !== "ultimate");
    addLog("裂隙穿梭启动：猎手隐身，开始在空间裂隙间高速跃迁。");
    showToast("警告：裂隙穿梭");
  }

  if (b.transition === "stalker_warp") {
    b.transitionTimer -= dt;
    b.stalkerWarpTimer -= dt;

    if (b.stalkerWarpState === "wait" && b.stalkerWarpTimer <= 0 && b.transitionTimer > 0) {
      const dest = {
        x: rand(55, game.width - 55),
        y: rand(60, game.height * 0.76),
      };
      b.stalkerWarpDestination = dest;
      b.stalkerWarpState = "telegraph";
      b.stalkerWarpTimer = 0.52;
      game.hazards.push({
        type: "stalker-telegraph",
        x1: b.stalkerWarpSource.x, y1: b.stalkerWarpSource.y,
        x2: dest.x, y2: dest.y,
        life: 0.52, maxLife: 0.52,
      });
      spawnStalkerSeal(b.stalkerWarpSource.x, b.stalkerWarpSource.y);
      // 传送阶段的源裂隙不会自行消失，抵达后再销毁。
      const seal = game.hazards[game.hazards.length - 1];
      seal.type = "stalker-warp-source";
      seal.life = 6;
      seal.maxLife = 6;
    } else if (b.stalkerWarpState === "telegraph" && b.stalkerWarpTimer <= 0) {
      const dest = b.stalkerWarpDestination;
      if (dest) {
        b.stalkerStartX = b.stalkerWarpSource.x;
        b.stalkerStartY = b.stalkerWarpSource.y;
        b.stalkerTargetX = dest.x;
        b.stalkerTargetY = dest.y;
        b.stalkerWarpState = "dash";
        b.stalkerWarpTimer = b.phase === 3 ? 0.17 : 0.23;
        b.x = b.stalkerStartX;
        b.y = b.stalkerStartY;
        game.hazards = game.hazards.filter(h => h.type !== "stalker-telegraph");
      }
    } else if (b.stalkerWarpState === "dash") {
      const duration = b.phase === 3 ? 0.17 : 0.23;
      const progress = clamp(1 - b.stalkerWarpTimer / duration, 0, 1);
      b.x = b.stalkerStartX + (b.stalkerTargetX - b.stalkerStartX) * progress;
      b.y = b.stalkerStartY + (b.stalkerTargetY - b.stalkerStartY) * progress;
      const p = game.player;
      if (p && game.invulnerable <= 0 && distance(b, p) < b.radius + p.radius && !b.stalkerWarpHit) {
        damagePlayer(18);
        b.stalkerWarpHit = true;
        emitParticles(p.x, p.y, COLORS.pink, 12, 115);
      }
      if (b.stalkerWarpTimer <= 0) {
        b.x = b.stalkerTargetX;
        b.y = b.stalkerTargetY;
        // 销毁出发裂隙；到达点发射环形弹幕。
        const source = b.stalkerWarpSource;
        game.hazards = game.hazards.filter(h => !(h.type === "stalker-warp-source" && Math.hypot(h.x - source.x, h.y - source.y) < 2));
        spawnStalkerRing(b.x, b.y, 12, 155);
        emitParticles(b.x, b.y, COLORS.pink, 20, 180);
        b.stalkerWarpSource = { x: b.x, y: b.y };
        b.stalkerWarpState = "wait";
        b.stalkerWarpTimer = 0.2;
        b.stalkerWarpHit = false;
        b.stalkerWarpIndex++;
      }
    }

    if (b.transitionTimer <= 0) {
      game.hazards = game.hazards.filter(h => h.type !== "stalker-warp-source" && h.type !== "stalker-telegraph" && h.type !== "stalker-phase-portal");
      b.transition = "none";
      b.phase = 3;
      b.x = game.width * 0.5;
      b.y = game.height * 0.30;
      b.stalkerState = "hunt";
      b.stalkerStateTimer = 0.8;
      b.stalkerDashCooldown = 0.45;
      game.nextEnemyShot = game.elapsed + 0.35;
      ui.phaseLabel.textContent = "阶段 03 · 裂隙过载";
      addLog("裂隙穿梭结束。猎手进入过载状态，冲刺间隔缩短。");
      showToast("阶段 03：裂隙过载");
      emitParticles(b.x, b.y, COLORS.pink, 35, 210);
    }
    return;
  }
}

function updateBossTransition(dt) {
  const b = game.boss;

  if (b.type === "fuse") {
    updateFuseTransition();
    return;
  }

  // 裂隙猎手有独立阶段转场，不套用观测者的终极螺旋。
  if (b.type === "stalker") {
    updateStalkerTransition(dt);
    return;
  }

  // 65% 血量触发大招，只会发生一次
  if (
    b.phase === 1 &&
    !b.ultimateTriggered &&
    b.hp <= b.maxHp * 0.65
  ) {
    startBossUltimate();
  }

  // 充能阶段
  if (b.transition === "charge") {
    b.transitionTimer -= dt;

    // 紫色粒子向 BOSS 汇聚
    if (Math.random() < 0.65) {
      const a = rand(0, Math.PI * 2);
      const r = rand(65, 125);

      const x = b.x + Math.cos(a) * r;
      const y = b.y + Math.sin(a) * r;

      game.particles.push({
        x,
        y,

        vx: (b.x - x) * 1.5,
        vy: (b.y - y) * 1.5,

        life: 0.55,
        maxLife: 0.55,
        r: rand(2, 4),
        color: COLORS.violet,
      });
    }

    if (b.transitionTimer <= 0) {
      b.transition = "rings";
      b.transitionTimer = 5.5;
      b.ultimateRingTimer = 0;

      addLog("观测者释放终极螺旋弹幕。");
      showToast("危险：螺旋弹幕");
    }

    return;
  }

  // 观测者终极阶段：四臂旋转螺旋 + 独立环形弹幕，保留两层弹道。
  if (b.transition === "rings") {
    b.transitionTimer -= dt;
    b.ultimateRingTimer -= dt;
    b.ultimateCircleTimer = (b.ultimateCircleTimer ?? 0.75) - dt;

    if (b.ultimateRingTimer <= 0) {
      const arms = 4;
      const speed = 165;
      for (let i = 0; i < arms; i++) {
        const a = b.ultimateSpiralAngle + i * Math.PI * 2 / arms;
        game.enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: 4.5, life: 5.5, damage: 9,
          color: COLORS.violet,
        });
      }
      b.ultimateSpiralAngle += 0.115;
      b.ultimateRingTimer = 0.14;
    }

    // 每 0.82 秒补一轮完整圆环，旋转螺旋仍持续运行。
    if (b.ultimateCircleTimer <= 0) {
      const count = 12;
      const offset = b.ultimateSpiralAngle * 0.55;
      for (let i = 0; i < count; i++) {
        const a = offset + i * Math.PI * 2 / count;
        game.enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * 118,
          vy: Math.sin(a) * 118,
          radius: 3.8, life: 5.8, damage: 7,
          color: i % 2 ? COLORS.pink : COLORS.violet,
        });
      }
      b.ultimateCircleTimer = 0.82;
    }

    if (b.transitionTimer <= 0) finishBossUltimate();
    return;
  }

  // 大招结束后，低于 30% 血量进入第三阶段
  if (
    b.phase === 2 &&
    b.transition === "none" &&
    b.hp <= b.maxHp * 0.30
  ) {
    b.phase = 3;

    game.nextEnemyShot = game.elapsed + 0.45;

    ui.phaseLabel.textContent = "阶段 03 · 失稳";

    addLog("警告：观测结构失稳。");
    showToast("BOSS 进入失稳阶段");

    emitParticles(
      b.x,
      b.y,
      COLORS.orange,
      40,
      200
    );
  }
}

