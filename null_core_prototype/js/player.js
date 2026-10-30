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
  // 全局粒子硬上限，避免密集弹幕时创建数千个带阴影的 Canvas 粒子导致掉帧。
  const budget = Math.max(0, Math.min(amount, 240 - (game.particles?.length || 0)));
  for (let i = 0; i < budget; i++) {
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

// Q 终结技统一冷却。能量负责“是否充满”，冷却负责“是否允许再次释放”。
const ULT_COOLDOWN_SECONDS = {
  prism: 18, bulwark: 24, singularity: 22, illusion: 20, phantom: 24, fractal: 22, comet: 24,
  paradox: 18, mechanist: 22, judge: 22, aleph: 24, traveller: 22,
};
function startUltimateCooldown(character = game.character) {
  const base = ULT_COOLDOWN_SECONDS[character] || 20;
  const rogueMult = game.mode === "rogue" ? (game.rogueBuild?.cooldownMult || 1) : 1;
  game.ultCooldown = base * (game.coreBonuses?.skillCooldownMult || 1) * rogueMult * (game.debugCooldownMult ?? 1);
}
function ultimateChargeBlocked() {
  return (game.character === "illusion" && !!game.illusionQActive)
    || (game.character === "prism" && (game.prismUltimateTimer || 0) > 0)
    || (game.character === "judge" && (game.judgeQTimer || 0) > 0)
    || (game.character === "phantom" && (game.phantomDomainTimer || 0) > 0)
    || (game.character === "aleph" && (game.alephQTimer || 0) > 0)
    || (game.character === "bulwark" && (game.bulwarkUltimateTimer || 0) > 0)
    || (game.character === "fractal" && (game.fractalQTimer || 0) > 0)
    || (game.character === "comet" && (game.cometQTimer || 0) > 0)
    || (game.character === "mechanist" && (game.mechQTimer || 0) > 0);
}


function shootPlayer() {
  const p = game.player;

  if (!p || game.shootCooldown > 0) return;
  if (game.character === "aleph" && (game.alephQTimer || 0) > 0) return;
  if (game.character === "aleph") {
    const a = p.angle;
    for (const offset of [-0.055, 0.055]) { const aa = a + offset; game.bullets.push({x:p.x+Math.cos(aa)*16,y:p.y+Math.sin(aa)*16,vx:Math.cos(aa)*560,vy:Math.sin(aa)*560,radius:3.4,damage:10*(game.mode === "rogue" ? game.rogueBuild.damageMult : 1)*(game.coreBonuses?.damageMult||1),life:1.8,color:"#8ce8ff",alephRupture:true,hitTargets:[]}); }
    game.shootCooldown = 0.28 * (game.mode === "rogue" ? (game.rogueBuild.fireRateMult || 1) : 1); return;
  }
  if (game.character === "traveller") { shootTraveller(); return; }
  if (game.character === "comet") { shootComet(); return; }
  if (game.character === "judge") { shootJudge(); return; }

  const a = p.angle;
  const speed = 570;
  const prismBuff = game.character === "prism" && (game.prismUltimateTimer || 0) > 0;

  game.bullets.push({
    x: p.x + Math.cos(a) * 16,
    y: p.y + Math.sin(a) * 16,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: 3,
    damage: 18 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1) * (game.coreBonuses?.damageMult || 1) * (game.debugDamageMult || 1) * (prismBuff ? 1.25 : 1) * (game.character === "illusion" && game.illusionQActive ? 1.2 : 1),
    life: 1.8,
    color: game.character === "illusion" ? "#b9a7ff" : game.character === "fractal" ? "#72e6c2" : prismBuff ? "#ffffff" : COLORS.cyan,
    homing: prismBuff,
    ricochets: prismBuff ? 2 : 0,
    hitTargets: [],
  });

  game.shootCooldown = (prismBuff ? 0.10 : (game.character === "illusion" && illusionFullDodgeActive() ? 0.125 : 0.15)) * (game.character === "fractal" && game.fractalQTimer > 0 ? (1 / 1.2) : 1) * (game.mode === "rogue" ? (game.rogueBuild.fireRateMult || 1) : 1);
  if (game.character === "mechanist" && game.mechQTimer > 0 && game.mechRTimer <= 0) {
    game.bullets.push({ x:p.x+Math.cos(a)*20, y:p.y+Math.sin(a)*20, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, radius:4, damage:18*(game.mode === "rogue" ? game.rogueBuild.damageMult : 1)*(game.coreBonuses?.damageMult||1)*(game.debugDamageMult||1), life:1.8, color:"#63d8ff", hitTargets:[] });
  }
}

function shootComet() {
  const p=game.player; if(!p || game.shootCooldown>0) return;
  const target=cometNearestTarget(p.x,p.y); if(!target) return;
  const dx=target.x-p.x,dy=target.y-p.y,d=Math.hypot(dx,dy)||1;
  const damage=15*(game.mode==="rogue"?(game.rogueBuild.damageMult||1)*(game.rogueBuild.cometDamageMult||1):1)*(game.coreBonuses?.damageMult||1)*(game.debugDamageMult||1);
  game.cometProjectiles=game.cometProjectiles||[];
  game.cometProjectiles.push({x:p.x+dx/d*15,y:p.y+dy/d*15,target,vx:dx/d*420,vy:dy/d*420,speed:420,damage,life:3.5,radius:7,kind:"basic",trail:[],trailClock:0});
  game.shootCooldown=0.28*(game.mode==="rogue"?(game.rogueBuild.fireRateMult||1):1);
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
  game.dashCooldown = game.debugDashCooldown ?? 1.4;
  game.invulnerable = 0.34;

  emitParticles(p.x, p.y, COLORS.cyan, 14, 150);
  showToast("相位闪避");
}

function alephAddRupture(target, amount = 1) { if (!target) return; target.alephRupture = Math.min(100, Math.max(0, Number(target.alephRupture) || 0) + amount); target.alephRuptureFlash = 0.35; }
function alephDamageScale(target) { return 1 + Math.min(100, Math.max(0, Number(target?.alephRupture) || 0)) / 100; }
function damageMinion(minion, damage) {
  // 入场动画期间没有碰撞箱，也不能被伤害/罪孽叠层/处决选中。
  if (!minion || minion.dead || minion.hp <= 0 || (minion.spawnTimer || 0) > 0) return false;

  // 织盾机提供真实减伤；护盾标记由 minions.js 每帧刷新。
  let appliedDamage = (minion.shield ? damage * 0.62 : damage) * alephDamageScale(minion);
  if (game.character === "judge") appliedDamage *= 1 + (minion.judgeSin || 0) * 0.05;
  if (game.character === "judge" && ((game.judgeQTimer > 0) || (game.judgeRTimer > 0)) && !game.judgeExplosionDepth) {
    const splash = appliedDamage * 0.75;
    // Q/R 强化期间，每次弹幕命中都会触发可见爆炸；R 使用更鲜明的红金色。
    const rActive = (game.judgeRTimer || 0) > 0;
    game.hazards.push({type:"judge-explosion",x:minion.x,y:minion.y,radius:rActive?76:62,life:rActive?.42:.32,maxLife:rActive?.42:.32,damage:splash,visualOnly:true,judgeR:rActive});
    emitParticles(minion.x,minion.y,rActive?"#ff526b":"#ffe8a6",rActive?24:16,rActive?240:185);
    emitParticles(minion.x,minion.y,"#ffb84d",rActive?15:9,rActive?165:115);
    game.judgeExplosionDepth = true;
    for (const other of game.minions) if (other !== minion && !other.dead && (other.spawnTimer||0)<=0 && distance(minion, other) <= 62) damageMinion(other, splash);
    if (game.boss && game.boss.transition === "none" && distance(minion, game.boss) <= 62) damageBoss(splash, minion.x, minion.y, {noCharge:true});
    game.judgeExplosionDepth = false;
  }
  if (game.character === "judge") {
    // Q 由有效命中稳定充能；R 独立充能较慢，避免多段攻击让 R 反而先于 Q。
    if (!(game.judgeQTimer > 0) && !ultimateChargeBlocked()) game.ultEnergy = clamp((game.ultEnergy || 0) + 1.25, 0, 100);
    if (game.judgeRTimer > 0) minion.judgeSin = Math.min(10, (minion.judgeSin||0)+1);
    else game.judgeRCharge = Math.min(100, (game.judgeRCharge||0) + 0.45);
  }
  if (minion.type === "prismWarden") {
    minion.prismParts = minion.prismParts ?? 3;
    const before = minion.hp;
    // 每损失约 1/4 生命摧毁一枚棱镜；全部摧毁后进入更脆弱的过载状态。
    minion.hp -= appliedDamage;
    const lost = Math.min(3, Math.floor((minion.maxHp - minion.hp) / (minion.maxHp / 4)));
    if (lost > minion.prismParts) { minion.prismParts = 3 - lost; emitParticles(minion.x,minion.y,minion.color,10,100); showToast(minion.prismParts ? `棱镜破损：剩余 ${minion.prismParts}` : "棱镜守卫过载：弱点暴露"); }
    if (minion.prismParts <= 0) minion.shield = 0;
  } else minion.hp -= appliedDamage;

  if (minion.hp <= 0) {
    minion.hp = 0;
    if (game.character === "judge") { const sin = minion.judgeSin || 0; game.player.hp = Math.min(game.player.maxHp, game.player.hp + sin); if (!ultimateChargeBlocked()) game.ultEnergy = clamp(game.ultEnergy + sin * 2, 0, 100); }
    minion.dead = true;
    // 普通房击杀计数只统计玩家击杀的原始敌人；裂片与召唤物不刷计数。
    if (game.mode === "rogue" && game.rogueNodeType === "battle" && !minion.isElite && !minion.splitChild && !minion.rogueKillCounted) {
      minion.rogueKillCounted = true;
      game.rogueKills = Math.min(game.rogueKillGoal || 18, (game.rogueKills || 0) + 1);
      if (game.rogueKills >= (game.rogueKillGoal || 18)) {
        game.rogueSpawnTimer = 999999;
        addLog(`击杀目标达成：${game.rogueKills}/${game.rogueKillGoal}。停止增援，清除残敌。`);
      }
    }
    // 裂变雷死亡时分裂为两枚低生命、短追踪子雷；限制分裂深度避免无限繁殖。
    if (minion.type === "zeroDrone") {
      addLog("ZERO 自律无人机已被摧毁。");
      showToast("自律无人机已摧毁");
      emitParticles(minion.x,minion.y,"#ff8067",24,175);
    }
    if (minion.type === "splinterMine" && !minion.splitChild && game.minions.filter(m => !m.dead).length < 6) {
      for (let i = 0; i < 2 && game.minions.filter(m => !m.dead).length < 6; i++) {
        const child = { ...minion, type: "splinterChild", name: "裂片", color: "#c8ffb8", radius: 6, hp: 16, maxHp: 16, speed: 74, dead: false, splitChild: true, shield: 0, age: 0, shootTimer: 99, pulseTimer: 0 };
        child.x = clamp(minion.x + (i ? 1 : -1) * 12, 8, game.width - 8);
        child.y = clamp(minion.y + (i ? -1 : 1) * 12, 8, game.height - 8);
        game.minions.push(child);
      }
    }
    spawnDeathEffect(minion.x, minion.y, minion.isElite ? "elite" : "minion", minion.color || COLORS.violet, minion.radius || 10);

    emitParticles(
      minion.x,
      minion.y,
      COLORS.violet,
      12,
      110
    );

    if (!ultimateChargeBlocked()) game.ultEnergy = clamp(game.ultEnergy + 3, 0, 100);
  }
}

function phantomDomainContains(x, y) {
  return game.character === "phantom" && (game.phantomDomainTimer || 0) > 0 && game.phantomDomainX != null && Math.hypot(x - game.phantomDomainX, y - game.phantomDomainY) <= 270;
}
function phantomEnhancedStealth() {
  if (game.character !== "phantom") return false;
  if ((game.phantomStealthTimer || 0) > 0) return true;
  return !!(game.player && (game.phantomDomainTimer || 0) > 0 && game.phantomDomainX != null && Math.hypot(game.player.x - game.phantomDomainX, game.player.y - game.phantomDomainY) <= 270);
}
function damageBoss(damage, sourceX, sourceY, options = {}) {
  const b = game.boss;
  if (!b || b.transition !== "none") return false;
  // 普通敌袭/精英房使用不可交互的锚点代替旧 BOSS；所有伤害必须落在真实敌人身上。
  if (b.type === "rogue-wave-anchor") return false;

  let finalDamage = damage * alephDamageScale(b);
  if (game.character === "judge") {
    finalDamage *= 1 + (b.judgeSin || 0) * 0.05;
    if (!(game.judgeQTimer > 0) && !options.noCharge && !ultimateChargeBlocked()) game.ultEnergy = clamp((game.ultEnergy || 0) + 1.25, 0, 100);
    if (game.judgeRTimer > 0) b.judgeSin = Math.min(10, (b.judgeSin||0)+1);
    else if (!options.noCharge) game.judgeRCharge = Math.min(100, (game.judgeRCharge||0) + 0.45);
  }
  if (game.character === "judge" && ((game.judgeQTimer > 0) || (game.judgeRTimer > 0)) && !game.judgeExplosionDepth) {
    const rActive = (game.judgeRTimer || 0) > 0;
    game.hazards.push({type:"judge-explosion",x:b.x,y:b.y,radius:rActive?76:62,life:rActive?.42:.32,maxLife:rActive?.42:.32,damage:finalDamage*.75,visualOnly:true,judgeR:rActive});
    emitParticles(b.x,b.y,rActive?"#ff526b":"#ffe8a6",rActive?24:16,rActive?240:185);emitParticles(b.x,b.y,"#ffb84d",rActive?15:9,rActive?165:115);
    game.judgeExplosionDepth = true; const splash = finalDamage * 0.75; for (const m of game.minions) if (!m.dead && (m.spawnTimer||0)<=0 && distance(b,m) <= 62) damageMinion(m,splash); game.judgeExplosionDepth = false;
  }
  if (phantomDomainContains(b.x, b.y)) finalDamage *= 1.75;
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
  if (!options.noCharge && !ultimateChargeBlocked()) game.ultEnergy = clamp(game.ultEnergy + (game.character === "singularity" ? 2 : game.character === "bulwark" ? 2 : 4), 0, 100);
  if (sourceX !== undefined && sourceY !== undefined) {
    emitParticles(sourceX, sourceY, COLORS.cyan, 3, 60);
  }
  return true;
}

function damageFuseDrone(drone, damage) {
  if (!drone || drone.dead || game.boss?.type !== "fuse" || game.boss.phase !== 4) return;
  damage *= alephDamageScale(drone);
  drone.hp = Math.max(0, drone.hp - damage);
  if (drone.hp > 0) return;

  drone.dead = true;
  spawnDeathEffect(drone.x, drone.y, "drone", COLORS.orange, drone.radius || 12);
  emitParticles(drone.x, drone.y, COLORS.orange, 14, 125);
  if (!ultimateChargeBlocked()) game.ultEnergy = clamp(game.ultEnergy + 5, 0, 100);
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
      damage: baseDamage * damageScale * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1) * (game.coreBonuses?.damageMult || 1) * (game.debugDamageMult || 1),
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

function illusionFullDodgeActive() { return game.character === "illusion" && ((game.illusionETimer||0)>0 || (game.illusionClones||[]).some(c=>c.kind==="Q"&&!c.dead)); }
function makeIllusionClone(x,y,kind,duration) { return {x:clamp(x,18,game.width-18),y:clamp(y,18,game.height-18),hp:40,maxHp:40,radius:9,kind,life:duration,maxLife:duration,angle:Math.random()*Math.PI*2,attackCooldown:Math.random()*.35,dead:false,seed:Math.random()*10}; }
function useSkill() {
  if (game.character === "judge") { useJudgeE(); return; }
  if (!game.running || game.paused || game.skillCooldown > 0) return;
  const p = game.player;
  const b = game.boss;
  const character = game.character || "prism";
  if (character === "aleph") {
    if ((game.alephQTimer || 0) > 0) { showToast("清算协议执行中，无法启动启程"); return; }
    game.skillCooldown = 8 * (game.coreBonuses?.skillCooldownMult || 1);
    for (let i=0;i<10;i++) game.alephShots.push({x:p.x,y:p.y,vx:0,vy:0,life:3.2,speed:470,damage:12*(game.coreBonuses?.damageMult||1),kind:"E",target:null,delay:i*0.055,dead:false});
    emitParticles(p.x,p.y,"#8ce8ff",28,180); game.hazards.push({type:"aleph-launch",x:p.x,y:p.y,radius:58,life:.42,maxLife:.42});
    showToast("启程：10 枚追踪光锥已发射"); updateHUD(); return;
  }
  if (character === "illusion") {
    game.illusionClones = game.illusionClones || [];
    game.illusionClones.push(makeIllusionClone(p.x + rand(-35,35), p.y + rand(-24,24), "E", 5));
    game.illusionETimer = 2; game.skillCooldown = 8 * (game.coreBonuses?.skillCooldownMult || 1);
    emitParticles(p.x,p.y,"#a99aff",24,160); game.hazards.push({type:"illusion-shift",x:p.x,y:p.y,radius:45,life:.55,maxLife:.55});
    showToast("幻形：虚像已部署，本体闪避 2 秒"); updateHUD(); return;
  }
  if (character === "comet") {
    const base=Math.atan2(Math.sin(p.angle),Math.cos(p.angle));
    const damage=15*(game.mode==="rogue"?(game.rogueBuild.damageMult||1)*(game.rogueBuild.cometDamageMult||1):1)*(game.coreBonuses?.damageMult||1);
    for(let i=0;i<15;i++){
      const side=i%2===0?-1:1, row=Math.floor(i/2), spread=(row-3.5)*0.105;
      const angle=base+side*(0.72+Math.abs(spread))+spread;
      const targets=cometTargets();
      const target=targets.reduce((best,t)=>!best||Math.hypot(t.x-p.x,t.y-p.y)<Math.hypot(best.x-p.x,best.y-p.y)?t:best,null);
      if(target) (game.cometProjectiles=game.cometProjectiles||[]).push({x:p.x+Math.cos(angle)*18,y:p.y+Math.sin(angle)*18,vx:Math.cos(angle)*520,vy:Math.sin(angle)*520,speed:520,damage,life:3.8,radius:7,kind:"skill",target,delay:0.34+row*0.025,trail:[],trailClock:0,wingSide:side});
    }
    game.skillCooldown=11*(game.coreBonuses?.skillCooldownMult||1)*(game.mode==="rogue"?(game.rogueBuild.cooldownMult||1):1)*(game.debugCooldownMult??1);
    emitParticles(p.x,p.y,"#b58aff",14,155);game.hazards.push({type:"comet-launch",x:p.x,y:p.y,radius:72,life:.55,maxLife:.55});
    showToast("流星爆发：15 枚追踪弹幕已向两翼展开");updateHUD();return;
  }
  if (character === "fractal") {
    game.fractalETimer = 7;
    game.skillCooldown = 12 * (game.coreBonuses?.skillCooldownMult || 1) * (game.mode === "rogue" ? (game.rogueBuild.cooldownMult || 1) : 1) * (game.debugCooldownMult ?? 1);
    emitParticles(p.x,p.y,"#72e6c2",32,190);
    game.hazards.push({type:"fractal-split",x:p.x,y:p.y,radius:48,life:.7,maxLife:.7});
    showToast("分裂：7 秒内散射弹保持完整，并可再分裂一次");
    updateHUD(); return;
  }
  if (character === "mechanist") { game.mechShield = 75; game.mechShieldTimer = 5; game.skillCooldown = 9 * (game.coreBonuses?.skillCooldownMult || 1); game.hazards.push({type:"mechanist-shield",x:p.x,y:p.y,radius:34,life:0.65,maxLife:0.65}); emitParticles(p.x,p.y,"#63d8ff",28,160); showToast("『防御』协议：75 点护盾"); updateHUD(); return; }
  if (character === "traveller") { useTravellerE(); return; }
  const mult = (game.mode === "rogue" ? game.rogueBuild.damageMult : 1) * (game.coreBonuses?.damageMult || 1) * (game.debugDamageMult || 1) * (game.character === "illusion" && illusionFullDodgeActive() ? 1.2 : 1);
  if (character === "paradox") {
    if (game.paradoxE > 0) { showToast("因果仍在持续"); return; }
    game.paradoxE = 3; game.paradox = clamp((game.paradox || 0) + 5, 0, 200);
    game.skillCooldown = 12 * (game.coreBonuses?.skillCooldownMult || 1) * (game.mode === "rogue" ? (game.rogueBuild.cooldownMult || 1) : 1) * (game.debugCooldownMult ?? 1);
    emitParticles(p.x,p.y,"#9d7cff",24,160); showToast("因果：伤害接收者反转，持续 3 秒"); addLog("悖论启动因果，持续 3 秒；反转伤害不递归触发。"); updateHUD(); return;
  }
  game.skillCooldown = (character === "bulwark" ? 6.5 : character === "singularity" ? 7 : character === "phantom" ? 8 : 5) * (game.coreBonuses?.skillCooldownMult || 1) * (game.mode === "rogue" ? (game.rogueBuild.cooldownMult || 1) : 1) * (game.debugCooldownMult ?? 1);
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
  } else if (character === "phantom") {
    game.phantomStealthTimer = 2;
    game.phantomHealAccumulator = 0;
    emitParticles(p.x, p.y, "#b49aff", 30, 180);
    showToast("幽影：2 秒强化潜行");
    addLog("幻灵进入幽影状态：100% 闪避、三倍反伤，每秒恢复 3 点生命。");
  } else if (character === "singularity") {
    // 引力井持续 4.5 秒：强力聚怪、牵引弹幕，并周期性造成引力灼伤。
    game.skillFieldTimer = 4.5;
    game.skillFieldDamageTimer = 0.35;
    game.skillFieldRadius = 270;
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

function useMechanistR() {
  if (!game.running || game.paused || game.ended || game.mechRTimer > 0 || (game.mechRCharge||0) < 100) { if (game.running && (game.mechRCharge||0) < 100) showToast("机械黎明尚未充能完成"); return; }
  game.mechRCharge = 0; game.mechRTimer = 20; game.mechAirstrikeTimer = 2; game.mechAirstrikeCount = 0; game.mechQTimer = 0;
  for (const d of (game.mechDrones || [])) { d.returning = true; d.flight = "outbound"; d.flightTimer = 0; }
  emitParticles(game.player.x,game.player.y,"#63d8ff",48,250); showToast("『机械黎明』：无人机已升空，空袭开始"); addLog("机械师启动机械黎明：20 秒内每 2 秒发动一次小范围群体空袭。"); updateHUD();
}

function useUltimate() {
  if (game.character === "aleph") {
    if (!game.running || game.paused || game.ended || game.ultEnergy < 100 || (game.alephQTimer || 0) > 0 || game.ultCooldown > 0) { if (game.ultCooldown > 0) showToast(`清算冷却 ${game.ultCooldown.toFixed(1)}s`); else if (game.ultEnergy < 100) showToast("清算协议尚未充能完成"); return; }
    startUltimateCooldown("aleph"); game.ultEnergy = 0; game.alephQTimer = 10; game.alephQFireTimer = 0; game.alephQShotsLeft = 50; game.alephQShotCount = 0; game.alephQSettled = false;
    emitParticles(game.player.x,game.player.y,"#8ce8ff",44,230); game.hazards.push({type:"aleph-clearing",x:game.player.x,y:game.player.y,radius:180,life:1,maxLife:1});
    showToast("清算：10 秒自动追踪弹幕已启动"); addLog("阿尔法启动清算协议：停止主动射击，发射 50 枚追踪光锥；协议结束后将空袭【破裂】层数最高的目标。"); updateHUD(); return;
  }
  if (game.character === "illusion") {
    if (!game.running || game.paused || game.ended || game.illusionQActive || game.ultEnergy < 100 || game.ultCooldown > 0) { if (game.illusionQActive) showToast("幻影仍在持续，无法重复释放"); else if (game.ultCooldown > 0) showToast(`幻影冷却 ${game.ultCooldown.toFixed(1)}s`); else if (game.ultEnergy < 100) showToast("幻影尚未充能完成"); return; }
    startUltimateCooldown("illusion"); game.ultEnergy=0; game.illusionQActive=true; game.illusionClones=game.illusionClones||[];
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;game.illusionClones.push(makeIllusionClone(game.player.x+Math.cos(a)*36,game.player.y+Math.sin(a)*36,"Q",10));}
    emitParticles(game.player.x,game.player.y,"#8e7bff",48,230); game.hazards.push({type:"illusion-burst",x:game.player.x,y:game.player.y,radius:130,life:.8,maxLife:.8}); showToast("幻影：五重虚像展开，输出与闪避强化"); updateHUD(); return;
  }
  if (game.character === "comet") {
    if (!game.running || game.paused || game.ended || game.ultEnergy<100 || game.cometQTimer>0 || game.ultCooldown>0) { if(game.ultCooldown>0)showToast(`流星陨落冷却 ${game.ultCooldown.toFixed(1)}s`);else if(game.ultEnergy<100)showToast("流星陨落尚未充能完成");return; }
    startUltimateCooldown("comet");game.ultEnergy=0;game.cometQTimer=20;game.cometMeteorTimer=0.5;game.cometMeteorQueue=[];
    emitParticles(game.player.x,game.player.y,"#b58aff",48,240);game.hazards.push({type:"comet-q-start",x:game.player.x,y:game.player.y,radius:100,life:.8,maxLife:.8});
    showToast("流星陨落：20 秒区域轰炸已启动");addLog("流星启动流星陨落：每 2 秒随机轰炸一个半径 130 的区域。");updateHUD();return;
  }
  if (game.character === "fractal") {
    if (!game.running || game.paused || game.ended || game.ultEnergy < 100 || game.fractalQTimer > 0 || game.ultCooldown > 0) { if (game.ultCooldown > 0) showToast(`电流冷却 ${game.ultCooldown.toFixed(1)}s`); else if (game.ultEnergy < 100) showToast("电流尚未充能完成"); return; }
    startUltimateCooldown("fractal"); game.ultEnergy = 0; game.fractalQTimer = 10; game.fractalElectricTimer = 0;
    emitParticles(game.player.x,game.player.y,"#72e6c2",42,220);
    game.hazards.push({type:"fractal-current",x:game.player.x,y:game.player.y,radius:110,life:.9,maxLife:.9});
    showToast("电流：10 秒连锁电流已启动，攻速与伤害 +20%"); updateHUD(); return;
  }
  if (game.character === "mechanist") { if (!game.running || game.paused || game.ended || (game.mechQCharge||0) < 100 || game.mechRTimer > 0 || game.mechQTimer > 0 || game.ultCooldown > 0) { if (game.ultCooldown > 0) showToast(`剿灭协议冷却 ${game.ultCooldown.toFixed(1)}s`); else if (game.running && (game.mechQCharge||0) < 100) showToast("剿灭协议尚未充能完成"); return; } startUltimateCooldown("mechanist"); game.mechQCharge = 0; game.mechQTimer = 7; emitParticles(game.player.x,game.player.y,"#63d8ff",36,210); showToast("『剿灭』协议：无人机火力强化 7 秒"); updateHUD(); return; }
  if (game.character === "judge") { useJudgeQ(); return; }
  if (game.character === "traveller") { useTravellerQ(); return; }
  if (game.character === "paradox") {
    if (!game.running || game.paused || game.ended) return;
    if (game.ultCooldown > 0) { showToast(`覆写冷却 ${game.ultCooldown.toFixed(1)}s`); return; }
    if (game.paradoxQ > 0) { showToast(`覆写冷却 ${game.paradoxQ.toFixed(1)}s`); return; }
    if ((game.paradox || 0) < 20) { showToast("悖论不足：覆写需要 20 点"); return; }
    startUltimateCooldown("paradox"); game.paradox -= 20; game.paradoxQ = 10; game.paradoxAbsorbed = 0; game.paradoxQActive = 5;
    game.paradoxShards = [0,1,2].map(i=>({angle:i*Math.PI*2/3,phase:"orbit",life:5,hit:false,x:game.player.x,y:game.player.y,radius:10,damage:36}));
    showToast("覆写：三枚时空碎片已展开，弹幕触碰碎片时才会被吸收"); addLog("悖论使用覆写，三枚碎片环绕自身持续 5 秒，吸收奖励最多计入 20 枚弹幕。"); emitParticles(game.player.x,game.player.y,"#9d7cff",18,140); updateHUD(); return;
  }
  if (!game.running || game.paused || game.ended || game.ultEnergy < 100 || game.ultCooldown > 0) {
    if (game.ultCooldown > 0) showToast(`终结技冷却 ${game.ultCooldown.toFixed(1)}s`); else if (game.running && game.ultEnergy < 100) showToast("核心能量不足");
    return;
  }
  startUltimateCooldown(game.character);
  game.ultEnergy = 0;
  const p = game.player;
  const b = game.boss;
  const character = game.character || "prism";
  const mult = (game.mode === "rogue" ? game.rogueBuild.damageMult : 1) * (game.coreBonuses?.damageMult || 1) * (game.debugDamageMult || 1) * (game.coreBonuses?.ultDamageMult || 1) * (game.debugDamageMult || 1);

  if (character === "bulwark") {
    // Q：10 秒无敌；期间碰到的敌方弹幕全部储存，结束时全数散射。
    game.bulwarkUltimateTimer = 10;
    game.bulwarkStoredBullets = [];
    game.invulnerable = Math.max(game.invulnerable, 10);
    game.hazards.push({ type: "bulwark-ring", x: p.x, y: p.y, radius: 300, life: 1.0, maxLife: 1.0 });
    emitParticles(p.x, p.y, COLORS.violet, 55, 260);
    showToast("终结技：绝对壁垒启动（10 秒无敌）");
    addLog("壁垒启动绝对壁垒：10 秒内无敌并吸收接触到的弹幕。结束后将散射全部吸收弹幕。");
  } else if (character === "phantom") {
    game.phantomDomainTimer = 7;
    game.phantomDomainX = p.x;
    game.phantomDomainY = p.y;
    game.hazards.push({ type: "phantom-domain", x: p.x, y: p.y, radius: 270, life: 7, maxLife: 7 });
    emitParticles(p.x, p.y, "#b49aff", 60, 240);
    showToast("幽冥领域展开：领域内 BOSS 受到伤害 +75%");
    addLog("幻灵展开幽冥领域，持续 7 秒。领域内幻灵获得强化潜行，所有玩家对领域内 BOSS 的伤害提高 75%。");
  } else if (character === "singularity") {
    // Q：更大的局部坍缩范围；高蓄能提供强爆发，吸收弹幕另有独立增伤。
    const radius = 320;
    let absorbedBullets = 0;
    for (const bullet of game.enemyBullets) {
      if (!bullet.dead && distance(p, bullet) < radius) {
        bullet.dead = true;
        absorbedBullets++;
      }
    }
    const charge = clamp(game.singularityCharge ?? 10, 10, 100) / 100;
    const bulletBonus = Math.min(absorbedBullets, 20) * 12;
    const damage = (1000 * charge + bulletBonus) * mult;
    for (const m of game.minions) if (!m.dead && distance(p, m) < radius) damageMinion(m, damage);
    for (const summon of (game.fuseSummons || [])) if (!summon.dead && distance(p, summon) < radius) damageFuseSummon(damage, summon.x, summon.y, summon);
    if (distance(p, b) < radius && b.transition === "none") damageBoss(damage, b.x, b.y);
    game.hazards.push({ type: "singularity-collapse", x: p.x, y: p.y, radius, life: 0.85, maxLife: 0.85 });
    emitParticles(p.x, p.y, COLORS.orange, 72, 300);
    game.singularityCharge = 10;
    showToast("核心坍缩释放");
    addLog("奇点释放核心坍缩，蓄能已重置。");
  } else {
    game.prismUltimateTimer = 7;
    game.hazards.push({ type: "ultimate", life: 0.7, maxLife: 0.7 });
    emitParticles(p.x, p.y, COLORS.cyan, 55, 250);
    showToast("终结技：交叉棱镜（7 秒强化）");
    addLog("棱镜启动交叉棱镜：持续 7 秒，攻速 +50%、伤害 +25%，普通攻击获得追踪与两次弹射。");
  }
  updateHUD();
}

