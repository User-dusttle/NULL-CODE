function drawBackground() {
  const w = game.width;
  const h = game.height;

  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createRadialGradient(
    w * 0.5,
    h * 0.36,
    20,
    w * 0.5,
    h * 0.45,
    Math.max(w, h) * 0.8
  );

  gradient.addColorStop(0, "#101a32");
  gradient.addColorStop(1, "#070b16");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  const grid = 34;

  for (
    let x = (game.elapsed * 4) % grid;
    x < w;
    x += grid
  ) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  for (
    let y = (game.elapsed * 4) % grid;
    y < h;
    y += grid
  ) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(104,239,255,.10)";

  ctx.beginPath();
  ctx.ellipse(
    w * 0.5,
    h * 0.48,
    w * 0.36,
    h * 0.29,
    0,
    0,
    Math.PI * 2
  );
  ctx.stroke();

  ctx.restore();
}

// ============================================================
// 绘制玩家
// ============================================================

function drawPlayer() {
  const p = game.player;
  if (!p) return;

  ctx.save();
  ctx.translate(p.x, p.y);

  if (game.invulnerable > 0) {
    ctx.strokeStyle =
      `rgba(104,239,255,${0.45 + Math.sin(game.elapsed * 45) * 0.2})`;

    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, 21, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.shadowBlur = 22;
  ctx.shadowColor = COLORS.cyan;

  ctx.rotate(Math.PI / 4);

  ctx.fillStyle = "#68efff";
  ctx.fillRect(-8, -8, 16, 16);

  ctx.fillStyle = "#e7ffff";
  ctx.fillRect(-3, -3, 6, 6);

  ctx.shadowBlur = 0;
  ctx.restore();

  if (game.mouse.inside && game.running && !game.paused) {
    ctx.save();

    ctx.strokeStyle = "rgba(104,239,255,.3)";
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(game.mouse.x, game.mouse.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(game.mouse.x, game.mouse.y, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();

    ctx.moveTo(game.mouse.x - 11, game.mouse.y);
    ctx.lineTo(game.mouse.x - 4, game.mouse.y);

    ctx.moveTo(game.mouse.x + 4, game.mouse.y);
    ctx.lineTo(game.mouse.x + 11, game.mouse.y);

    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================
// 绘制 BOSS
// ============================================================

function drawFuseDrones() {
  const b = game.boss;
  if (!b || b.type !== "fuse" || b.phase !== 4 || !b.fuseDronesSpawned) return;
  for (const d of (game.fuseDrones || [])) {
    if (d.dead || d.hp <= 0) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle + Math.PI / 4);
    ctx.shadowBlur = 12;
    ctx.shadowColor = COLORS.orange;
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(-d.radius * 0.72, -d.radius * 0.72, d.radius * 1.44, d.radius * 1.44);
    ctx.restore();
    const w = 22, ratio = clamp(d.hp / d.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.fillRect(d.x - w / 2, d.y - 17, w, 3);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(d.x - w / 2, d.y - 17, w * ratio, 3);
  }
}

function drawFuseSummon() {
  const summons = (game.fuseSummons || []).filter(s => !s.dead && s.hp > 0);
  for (const s of summons) {
  const color = s.type === "observer" ? COLORS.violet : COLORS.pink;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.spin * 0.35);
  ctx.shadowBlur = s.hitFlash > 0 ? 28 : 17;
  ctx.shadowColor = s.hitFlash > 0 ? "#ffffff" : color;
  ctx.strokeStyle = s.hitFlash > 0 ? "#ffffff" : color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-s.spin * 0.9);
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, s.radius + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (s.type === "observer") {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * (s.radius - 2), Math.sin(a) * (s.radius - 2));
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -s.radius + 3);
    ctx.lineTo(s.radius - 4, 0);
    ctx.lineTo(0, s.radius - 3);
    ctx.lineTo(-s.radius + 4, 0);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  const w = 74, ratio = clamp(s.hp / s.maxHp, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,.78)";
  ctx.fillRect(s.x - w / 2, s.y - s.radius - 25, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(s.x - w / 2, s.y - s.radius - 25, w * ratio, 5);
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(`${s.name} ${Math.ceil(s.hp)}/${s.maxHp}`, s.x, s.y - s.radius - 31);
  }
}

function drawBoss() {
  const b = game.boss;
  if (!b) return;
  if (b.type === "stalker" && (b.transition === "stalker_warp" || b.transition === "stalker_rifts")) return;

  ctx.save();
  ctx.translate(b.x, b.y);

  // 大招充能时，绘制粒子环向内汇聚
  if (b.transition === "charge") {
    const progress = 1 - b.transitionTimer / 2.4;
    const radius = 100 - progress * 60;

    ctx.strokeStyle = COLORS.violet;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7;

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      radius,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const a =
        game.elapsed * 2.8 +
        i * Math.PI * 2 / 12;

      const r = radius + Math.sin(game.elapsed * 8 + i) * 5;

      ctx.fillStyle = COLORS.violet;
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLORS.violet;

      ctx.beginPath();
      ctx.arc(
        Math.cos(a) * r,
        Math.sin(a) * r,
        3,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // 环形弹幕阶段：明显的无敌能量护盾
  if (b.transition === "rings") {
    ctx.strokeStyle = COLORS.violet;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 22;
    ctx.shadowColor = COLORS.violet;

    ctx.beginPath();
    ctx.arc(
      0,
      0,
      56 + Math.sin(game.elapsed * 10) * 4,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  if (b.type === "stalker" && b.stalkerState === "charge") {
    ctx.strokeStyle = COLORS.pink;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 58 + Math.sin(game.elapsed * 24) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const bossColor = b.type === "stalker" ? COLORS.cyan : b.type === "fuse" ? (b.fuseShutdown ? COLORS.cyan : COLORS.orange) : COLORS.violet;
  ctx.rotate(b.spin * 0.35);

  ctx.shadowBlur = b.hitFlash > 0 ? 30 : 18;
  ctx.shadowColor = b.hitFlash > 0 ? COLORS.cyan : bossColor;

  ctx.strokeStyle = b.hitFlash > 0 ? "#eaffff" : bossColor;

  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();

  ctx.rotate(-b.spin * 0.8);

  ctx.setLineDash([7, 5]);

  ctx.beginPath();
  ctx.arc(0, 0, 45, 0, Math.PI * 2);
  ctx.stroke();

  ctx.setLineDash([]);

  ctx.rotate(b.spin * 0.45);

  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(21, 0);
  ctx.lineTo(0, 24);
  ctx.lineTo(-21, 0);
  ctx.closePath();

  ctx.fillStyle = b.hitFlash > 0 ? "#eaffff" : (b.type === "stalker" ? "#3cbfd8" : b.type === "fuse" ? "#d98a45" : "#9b6ce7");

  ctx.fill();

  ctx.fillStyle = "#211535";
  ctx.fillRect(-5, -5, 10, 10);

  ctx.restore();
}

// ============================================================
// 绘制小怪
// ============================================================

function drawMinions() {
  for (const m of game.minions) {
    ctx.save();
    ctx.translate(m.x, m.y);

    ctx.shadowBlur = 13;
    ctx.shadowColor = COLORS.orange;

    ctx.fillStyle = COLORS.orange;
    ctx.rotate(Math.PI / 4);

    ctx.fillRect(
      -m.radius * 0.7,
      -m.radius * 0.7,
      m.radius * 1.4,
      m.radius * 1.4
    );

    ctx.restore();

    // 小怪生命条
    const barWidth = 28;
    const ratio = clamp(m.hp / m.maxHp, 0, 1);

    ctx.fillStyle = "rgba(0,0,0,.65)";
    ctx.fillRect(
      m.x - barWidth / 2,
      m.y - 19,
      barWidth,
      4
    );

    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(
      m.x - barWidth / 2,
      m.y - 19,
      barWidth * ratio,
      4
    );
  }
}

// ============================================================
// 绘制子弹
// ============================================================

function drawBullets() {
  for (const bullet of game.bullets) {
    ctx.save();

    ctx.shadowBlur = 12;
    ctx.shadowColor = bullet.color;
    ctx.fillStyle = bullet.color;

    ctx.beginPath();
    ctx.arc(
      bullet.x,
      bullet.y,
      bullet.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  for (const bullet of game.enemyBullets) {
    ctx.save();

    ctx.shadowBlur = 10;
    ctx.shadowColor = bullet.color;
    ctx.fillStyle = bullet.color;

    ctx.beginPath();
    ctx.arc(
      bullet.x,
      bullet.y,
      bullet.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================
// 绘制粒子
// ============================================================

function drawParticles() {
  for (const particle of game.particles) {
    ctx.save();

    ctx.globalAlpha = clamp(
      particle.life / particle.maxLife,
      0,
      1
    );

    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = particle.color;

    ctx.beginPath();
    ctx.arc(
      particle.x,
      particle.y,
      particle.r,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================
// 绘制危险区域
// ============================================================

function drawHazards() {
  for (const hazard of game.hazards) {
    if (hazard.type === "ultimate") {
      ctx.save();

      ctx.globalAlpha = hazard.life / hazard.maxLife;
      ctx.strokeStyle = "#d9c3ff";
      ctx.shadowBlur = 22;
      ctx.shadowColor = COLORS.violet;
      ctx.lineWidth = 4;

      ctx.beginPath();

      ctx.moveTo(0, 0);
      ctx.lineTo(game.width, game.height);

      ctx.moveTo(game.width, 0);
      ctx.lineTo(0, game.height);

      ctx.stroke();
      ctx.restore();
    }

    if (hazard.type === "fuse-laser") {
      ctx.save();
      const charging = hazard.telegraph > 0;
      ctx.globalAlpha = charging ? 0.42 + Math.sin(game.elapsed * 24) * 0.18 : 0.95;
      ctx.strokeStyle = charging ? COLORS.orange : COLORS.pink;
      ctx.shadowBlur = charging ? 10 : 24;
      ctx.shadowColor = charging ? COLORS.orange : COLORS.pink;
      ctx.lineWidth = charging ? 2 : 10;
      ctx.beginPath();
      ctx.moveTo(hazard.x1, hazard.y1);
      ctx.lineTo(hazard.x2, hazard.y2);
      ctx.stroke();
      if (!charging) {
        ctx.strokeStyle = "#fff3f8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hazard.x1, hazard.y1);
        ctx.lineTo(hazard.x2, hazard.y2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (hazard.type === "airstrike") {
      const progress = clamp(
        1 - hazard.life / hazard.maxLife,
        0,
        1
      );

      const radius =
        hazard.radius * (1 + progress * 0.25);

      ctx.save();

      ctx.globalAlpha = 0.5 + progress * 0.5;
      ctx.strokeStyle = COLORS.orange;
      ctx.fillStyle = "rgba(255,180,110,.10)";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLORS.orange;

      ctx.beginPath();
      ctx.arc(
        hazard.x,
        hazard.y,
        radius,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();

      // 中心十字标记
      ctx.beginPath();

      ctx.moveTo(
        hazard.x - 8,
        hazard.y
      );
      ctx.lineTo(
        hazard.x + 8,
        hazard.y
      );

      ctx.moveTo(
        hazard.x,
        hazard.y - 8
      );
      ctx.lineTo(
        hazard.x,
        hazard.y + 8
      );

      ctx.stroke();
      ctx.restore();
    }

    if (hazard.type === "stalker-rift" || hazard.type === "stalker-seal" || hazard.type === "stalker-warp-source") {
      const progress = clamp(1 - hazard.life / hazard.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(game.elapsed * 18);
      ctx.strokeStyle = COLORS.pink;
      ctx.fillStyle = "rgba(255,113,157,.10)";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 16;
      ctx.shadowColor = COLORS.pink;
      ctx.beginPath();
      ctx.arc(hazard.x, hazard.y, hazard.radius * (0.85 + progress * 0.25), 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(hazard.x - 15, hazard.y); ctx.lineTo(hazard.x + 15, hazard.y);
      ctx.moveTo(hazard.x, hazard.y - 15); ctx.lineTo(hazard.x, hazard.y + 15);
      ctx.stroke();
      ctx.restore();
    }

    if (hazard.type === "stalker-telegraph" || hazard.type === "stalker-slash") {
      const telegraph = hazard.type === "stalker-telegraph";
      ctx.save();
      ctx.globalAlpha = telegraph ? 0.35 + 0.55 * Math.sin(game.elapsed * 22) : clamp(hazard.life / hazard.maxLife, 0, 1);
      ctx.strokeStyle = telegraph ? "#ff719d" : "#ffd5e1";
      ctx.shadowBlur = telegraph ? 12 : 24;
      ctx.shadowColor = COLORS.pink;
      ctx.lineWidth = telegraph ? 2 : 8;
      ctx.setLineDash(telegraph ? [8, 7] : []);
      ctx.beginPath();
      ctx.moveTo(hazard.x1, hazard.y1);
      ctx.lineTo(hazard.x2, hazard.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

// ============================================================
// 渲染与帧循环
// ============================================================

function render() {
  drawBackground();
  drawHazards();
  drawBullets();
  drawMinions();
  drawFuseDrones();
  drawBoss();
  drawFuseSummon();
  drawPlayer();
  drawParticles();
}

function frame(now) {
  const dt = Math.min(
    (now - (game.lastTime || now)) / 1000,
    0.033
  );

  game.lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(frame);
}

