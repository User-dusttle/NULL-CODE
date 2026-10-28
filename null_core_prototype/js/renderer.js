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
  if (game.character === "paradox") {
    if(game.paradoxAnchor){ctx.save();ctx.strokeStyle="#9d7cff";ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(game.paradoxAnchor.x,game.paradoxAnchor.y,18+Math.sin(game.elapsed*6)*3,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#d9caff";ctx.font="10px monospace";ctx.textAlign="center";ctx.fillText("ANCHOR",game.paradoxAnchor.x,game.paradoxAnchor.y-25);ctx.restore();}
  }
  const p = game.player;
  if (!p) return;
  const character = game.character || "prism";
  if (character === "paradox" && game.paradoxE > 0) {
    ctx.save(); ctx.translate(p.x,p.y); const pulse=1+Math.sin(game.elapsed*14)*0.08;
    ctx.globalAlpha=0.6+Math.sin(game.elapsed*18)*0.2; ctx.strokeStyle="#d8c8ff"; ctx.shadowBlur=18; ctx.shadowColor="#9d7cff"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(0,0,(p.radius+14)*pulse,game.elapsed*2,game.elapsed*2+Math.PI*1.65); ctx.stroke();
    ctx.strokeStyle="#9d7cff"; ctx.lineWidth=1.5; ctx.setLineDash([3,5]); ctx.beginPath(); ctx.arc(0,0,p.radius+23,-game.elapsed*3,-game.elapsed*3+Math.PI*1.4); ctx.stroke(); ctx.setLineDash([]);
    for(let i=0;i<4;i++){const a=game.elapsed*3+i*Math.PI/2;const x=Math.cos(a)*(p.radius+17),y=Math.sin(a)*(p.radius+17);ctx.fillStyle="#eee6ff";ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4,y);ctx.lineTo(x,y+5);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  if (character === "paradox" && game.paradoxShards?.length) {
    for (const shard of game.paradoxShards) {
      ctx.save(); ctx.translate(shard.x,shard.y); ctx.rotate(game.elapsed*2.5+shard.angle); ctx.fillStyle="#a98aff"; ctx.strokeStyle="#f0e7ff"; ctx.shadowBlur=18; ctx.shadowColor="#9d7cff"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(6,-2); ctx.lineTo(3,9); ctx.lineTo(-4,6); ctx.lineTo(-7,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(2,2);ctx.lineTo(-2,5);ctx.closePath();ctx.stroke();ctx.restore();
    }
  }
  const color = character === "bulwark" ? COLORS.violet : character === "singularity" ? COLORS.orange : character === "phantom" ? "#b49aff" : character === "paradox" ? "#9d7cff" : COLORS.cyan;
  ctx.save(); ctx.translate(p.x, p.y);
  if (game.playerDying) {
    const progress = clamp(1 - (game.playerDeathTimer || 0) / 1.25, 0, 1);
    ctx.globalAlpha = 1 - progress;
    ctx.rotate(progress * 2.8);
    ctx.scale(Math.max(0.08, 1 - progress * 0.92), Math.max(0.08, 1 - progress * 0.92));
  }
  const phantomStealthActive = character === "phantom" && typeof phantomEnhancedStealth === "function" && phantomEnhancedStealth();
  if (phantomStealthActive) {
    // 潜行状态：半透明残影、脉冲光环和环绕碎片，让状态一眼可辨。
    ctx.globalAlpha = 0.48 + Math.sin(game.elapsed * 13) * 0.12;
    ctx.strokeStyle = "#d9c8ff"; ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 12 + Math.sin(game.elapsed * 8) * 3, game.elapsed * 1.6, game.elapsed * 1.6 + Math.PI * 1.65); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const a = game.elapsed * 2.2 + i * Math.PI * 2 / 3;
      ctx.fillStyle = "#eee5ff";
      ctx.beginPath(); ctx.arc(Math.cos(a) * (p.radius + 8), Math.sin(a) * (p.radius + 8), 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (game.invulnerable > 0 || (character === "bulwark" && (game.bulwarkAbsorbed || 0) > 0)) {
    ctx.strokeStyle = `${color}bb`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 9 + Math.sin(game.elapsed * 9) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 22; ctx.shadowColor = color; ctx.fillStyle = color; ctx.strokeStyle = "#f4fbff"; ctx.lineWidth = 1.5;
  if (character === "bulwark") {
    ctx.beginPath(); for (let i=0;i<6;i++){const a=-Math.PI/6+i*Math.PI/3;const x=Math.cos(a)*p.radius*1.15,y=Math.sin(a)*p.radius*1.15;i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fillStyle="#f6efff";ctx.fill();
  } else if (character === "singularity") {
    ctx.beginPath();ctx.moveTo(0,-p.radius*1.35);ctx.lineTo(p.radius*1.15,p.radius);ctx.lineTo(-p.radius*1.15,p.radius);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fillStyle="#fff0df";ctx.fill();
  } else if (character === "paradox") {
    // 悖论专属：四向切割棱星 + 内部空洞，区别于棱镜方形与幻灵菱晶。
    ctx.rotate(game.elapsed*0.45); ctx.beginPath();
    for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4;const r=i%2===0?p.radius*1.45:p.radius*0.58;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
    ctx.globalAlpha=.9;ctx.strokeStyle="#e7dcff";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,p.radius*.42,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(0,0,2.4,0,Math.PI*2);ctx.fill();
    for(let i=0;i<3;i++){const a=game.elapsed*1.7+i*Math.PI*2/3;ctx.fillStyle="#c9b4ff";ctx.beginPath();ctx.moveTo(Math.cos(a)*(p.radius+8),Math.sin(a)*(p.radius+8));ctx.lineTo(Math.cos(a+.18)*(p.radius+15),Math.sin(a+.18)*(p.radius+15));ctx.lineTo(Math.cos(a-.18)*(p.radius+15),Math.sin(a-.18)*(p.radius+15));ctx.closePath();ctx.fill();}
  } else if (character === "phantom") {
    // 幻灵专属：竖向双层幽影菱晶，与棱镜的方形外观区分。
    ctx.beginPath(); ctx.moveTo(0, -p.radius * 1.35); ctx.lineTo(p.radius * 0.82, 0); ctx.lineTo(0, p.radius * 1.35); ctx.lineTo(-p.radius * 0.82, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha *= 0.82; ctx.strokeStyle = "#f0eaff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -p.radius * 0.82); ctx.lineTo(p.radius * 0.42, 0); ctx.lineTo(0, p.radius * 0.82); ctx.lineTo(-p.radius * 0.42, 0); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.rotate(Math.PI/4);ctx.fillRect(-8,-8,16,16);ctx.fillStyle="#e7ffff";ctx.fillRect(-3,-3,6,6);
  }
  ctx.shadowBlur=0;ctx.restore();
  if (phantomStealthActive) {
    ctx.save(); ctx.textAlign = "center"; ctx.font = "bold 11px monospace"; ctx.fillStyle = "#d9c8ff"; ctx.shadowBlur = 12; ctx.shadowColor = "#9d7cff";
    ctx.fillText("潜 行 中", p.x, p.y - p.radius - 23);
    const remaining = Math.max(0, game.phantomStealthTimer || 0);
    if (remaining > 0) { ctx.font = "10px monospace"; ctx.fillText(`${remaining.toFixed(1)}s`, p.x, p.y - p.radius - 10); }
    ctx.restore();
  }
  if (character === "singularity" && game.skillFieldTimer > 0) {
    const fx = game.skillFieldX ?? p.x, fy = game.skillFieldY ?? p.y;
    ctx.save();ctx.strokeStyle="rgba(255,155,66,.8)";ctx.fillStyle="rgba(255,155,66,.08)";ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.arc(fx,fy,game.skillFieldRadius||210,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(fx,fy,16+Math.sin(game.elapsed*10)*3,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if (game.mouse.inside && game.running && !game.paused) {
    ctx.save();ctx.strokeStyle=`${color}55`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(game.mouse.x,game.mouse.y);ctx.stroke();ctx.beginPath();ctx.arc(game.mouse.x,game.mouse.y,7,0,Math.PI*2);ctx.stroke();ctx.restore();
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

  ctx.save();
  ctx.translate(b.x, b.y);
  if (game.bossDying) {
    const progress = clamp(1 - (game.bossDeathTimer || 0) / 1.9, 0, 1);
    ctx.globalAlpha = 1 - progress;
    ctx.rotate(progress * 1.5);
    const scale = 1 + progress * 1.4;
    ctx.scale(scale, scale);
  } else if (b.type === "stalker" && b.transition === "stalker_warp") {
    // 跃迁阶段保持可见，短暂闪烁表现空间不稳定，而不是整段隐身。
    ctx.globalAlpha = 0.58 + 0.32 * Math.abs(Math.sin(game.elapsed * 15));
  }

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

function drawDeathEffects() {
  for (const e of (game.deathEffects || [])) {
    const progress = clamp(1 - e.life / e.maxLife, 0, 1);
    const fade = clamp(e.life / e.maxLife, 0, 1);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = e.color;
    ctx.fillStyle = e.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = e.color;
    if (e.type === "boss") {
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 3 - i * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + progress * (70 + i * 22) - i * 10, game.elapsed * (i % 2 ? -1 : 1) * 2, game.elapsed * (i % 2 ? -1 : 1) * 2 + Math.PI * 1.65);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = e.seed + i * Math.PI / 6;
        const r = e.radius + progress * 90;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, Math.max(1, 5 * fade), 0, Math.PI * 2); ctx.fill();
      }
    } else if (e.type === "player") {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + progress * 52, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-e.radius, -e.radius); ctx.lineTo(e.radius, e.radius); ctx.moveTo(e.radius, -e.radius); ctx.lineTo(-e.radius, e.radius); ctx.stroke();
    } else {
      const radius = e.radius * (1 + progress * (e.type === "drone" ? 2.3 : 1.8));
      ctx.lineWidth = Math.max(1, 3 * fade);
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = e.seed + i * Math.PI / 3;
        const r1 = radius * 0.45, r2 = radius * 1.25;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawParadoxEffects() {
  if (game.character !== "paradox") return;
  // 固定在回溯锚点的时空乱流，不跟随角色移动。
  for (const h of (game.hazards || [])) {
    if (h.type === "paradox-chaos") {
      const fade = clamp(h.life / h.maxLife, 0, 1), pulse = 1 + Math.sin(game.elapsed*5)*0.025;
      ctx.save(); ctx.translate(h.x,h.y); ctx.globalAlpha=0.3+fade*0.35;
      ctx.fillStyle="#6c3bba"; ctx.beginPath(); ctx.arc(0,0,h.radius,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#9d7cff"; ctx.shadowBlur=22; ctx.shadowColor="#9d7cff"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(0,0,h.radius*pulse,game.elapsed*.4,game.elapsed*.4+Math.PI*2); ctx.stroke();
      ctx.globalAlpha=.75; ctx.setLineDash([10,8]); ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,0,h.radius*.78,-game.elapsed*.65,-game.elapsed*.65+Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      for(let i=0;i<8;i++){const a=game.elapsed*.25+i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*h.radius*.65,Math.sin(a)*h.radius*.65);ctx.lineTo(Math.cos(a)*h.radius,Math.sin(a)*h.radius);ctx.stroke();}
      ctx.restore();
    } else if (h.type === "paradox-rift") {
      const f=clamp(h.life/h.maxLife,0,1);ctx.save();ctx.translate(h.x,h.y);ctx.rotate(game.elapsed*4);ctx.globalAlpha=.35+.65*f;ctx.strokeStyle="#d9c8ff";ctx.fillStyle="#7e4be8";ctx.shadowBlur=18;ctx.shadowColor="#9d7cff";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-h.radius);ctx.lineTo(h.radius*.55,0);ctx.lineTo(0,h.radius);ctx.lineTo(-h.radius*.55,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,h.radius*(1.4-f*.35),0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  for (const shot of (game.paradoxRiftShots || [])) {
    ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(game.elapsed*5);ctx.fillStyle="#bda4ff";ctx.strokeStyle="#ffffff";ctx.shadowBlur=16;ctx.shadowColor="#9d7cff";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(5,0);ctx.lineTo(0,9);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
}

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
    if (hazard.type === "phantom-domain") {
      const progress = 1 - hazard.life / hazard.maxLife;
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(game.elapsed * 5) * 0.06;
      ctx.fillStyle = "#9d7cff";
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.65 - progress * 0.25;
      ctx.strokeStyle = "#d6c8ff"; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, game.elapsed * 0.35, game.elapsed * 0.35 + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    } else if (hazard.type === "bulwark-ring" || hazard.type === "singularity-collapse") {
      const progress = 1 - hazard.life / hazard.maxLife;
      const color = hazard.type === "bulwark-ring" ? COLORS.violet : COLORS.orange;
      ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 1 - progress; ctx.lineWidth = hazard.type === "bulwark-ring" ? 4 : 6;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius * progress, 0, Math.PI * 2); ctx.stroke();
      if (hazard.type === "singularity-collapse") { ctx.globalAlpha = .3 + progress * .4; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius * (1-progress) * .45, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    } else if (hazard.type === "ultimate") {
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

    if (hazard.type === "stalker-phase-portal") {
      const pulse = 0.8 + Math.sin(game.elapsed * 9 + (hazard.spin || 0)) * 0.15;
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(game.elapsed * 1.6 + (hazard.spin || 0));
      ctx.globalAlpha = clamp(hazard.life / hazard.maxLife, 0.2, 1);
      ctx.strokeStyle = COLORS.pink; ctx.shadowBlur = 22; ctx.shadowColor = COLORS.pink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, hazard.radius * pulse, hazard.radius * 1.35, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, hazard.radius * 0.55, hazard.radius * 1.05, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(-hazard.radius * 0.65, 0); ctx.lineTo(hazard.radius * 0.65, 0); ctx.moveTo(0, -hazard.radius * 0.8); ctx.lineTo(0, hazard.radius * 0.8); ctx.stroke();
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
  drawParadoxEffects();
  drawPlayer();
  drawParticles();
  drawDeathEffects();
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

