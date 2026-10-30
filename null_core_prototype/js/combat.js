function paradoxReverseOwnHit(damage) {
  if (game.character !== "paradox" || !(game.paradoxE > 0)) return false;
  // 自身攻击反转为自己承受原本算出的最终伤害；禁止递归反转。
  game._paradoxReversal = true;
  game._paradoxForceDamage = true;
  damagePlayer(Math.max(0, Number(damage) || 0));
  game._paradoxForceDamage = false;
  game._paradoxReversal = false;
  emitParticles(game.player.x, game.player.y, "#9d7cff", 6, 90);
  showToast("因果反转：自身攻击的伤害回到自身");
  return true;
}

// 棱镜强化弹：自动追踪目标，命中后最多弹射两次。
function prismTargetsForBullet(bullet) {
  const b = game.boss;
  const targets = [];
  if (b && b.hp > 0 && b.transition === "none" && b.type !== "rogue-wave-anchor") targets.push(b);
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

function getMechanistTargets() {
  const targets = [];
  if (game.boss && game.boss.hp > 0 && game.boss.transition === "none" && game.boss.type !== "rogue-wave-anchor") targets.push(game.boss);
  for (const m of (game.minions || [])) if (!m.dead && m.hp > 0 && (m.spawnTimer || 0) <= 0) targets.push(m);
  for (const s of (game.fuseSummons || [])) if (!s.dead && s.hp > 0) targets.push(s);
  // FUSE-CORE 阶段四无人机是正常可受击单位，纳入机械师所有自动索敌与范围攻击。
  for (const d of (game.fuseDrones || [])) if (!d.dead && d.hp > 0) targets.push(d);
  return targets;
}
function launchMechanistAirstrike() {
  const targets = getMechanistTargets(); if (!targets.length) return;
  // 优先选择周围敌人最多的落点，避免空袭总是追着单个高血量目标打。
  const radius = 100;
  const target = targets.reduce((best, candidate) => {
    const count = targets.filter(t => Math.hypot(t.x-candidate.x,t.y-candidate.y) <= radius).length;
    return !best || count > best.count || (count === best.count && (candidate.hp||0) > (best.target.hp||0)) ? {target:candidate,count} : best;
  }, null)?.target || targets[0];
  const x = target.x, y = target.y;
  game.hazards.push({type:"mechanist-airstrike",x,y,radius,life:0.65,maxLife:0.65,fired:false,target});
  const affected = targets.filter(t => Math.hypot(t.x-x,t.y-y) <= radius+(t.radius||0)).length;
  showToast(`机械黎明：区域空袭已锁定 · 预计覆盖 ${affected} 个目标`);
}
function updateMechanist(dt) {
  const p = game.player; if (!p) return;
  game.mechQCharge = Math.min(100, (game.mechQCharge ?? 100) + dt * 2.5);
  game.mechRCharge = Math.min(100, (game.mechRCharge ?? 100) + dt * 1.15);
  if (!game.mechDrones || game.mechDrones.length !== 2) game.mechDrones = [0,1].map(i=>({angle:i*Math.PI,cooldown:0.2,x:p.x,y:p.y,returning:false,flight:"orbit"}));
  for (let i=0;i<2;i++) {
    const d=game.mechDrones[i]; d.angle += dt*(i===0?1.2:-1.2);
    let tx, ty;
    if (game.mechRTimer > 0) {
      // R 模式：无人机飞向战场上方的空袭航线，20 秒期间不再环绕玩家。
      d.flight = "airstrike";
      tx = p.x + (i===0?-1:1) * Math.min(game.width*0.28, 190);
      ty = 58 + Math.sin(game.elapsed*2+i*Math.PI)*12;
    } else {
      d.flight = "returning";
      tx=p.x+Math.cos(d.angle)*28; ty=p.y+Math.sin(d.angle)*28;
    }
    const ease=Math.min(1,dt*(game.mechRTimer>0?2.1:5.8));
    d.x += (tx-d.x)*ease; d.y += (ty-d.y)*ease;
    if (game.mechRTimer>0) continue;
    d.cooldown -= dt;
    if (d.cooldown<=0) {
      const targets=getMechanistTargets().sort((a,b)=>Math.hypot(a.x-d.x,a.y-d.y)-Math.hypot(b.x-d.x,b.y-d.y));
      const t=targets[0];
      if(t){
        const damage=18*0.8*(game.mechQTimer>0?1.3:1)*(game.mode==="rogue"?game.rogueBuild.damageMult:1)*(game.coreBonuses?.damageMult||1);
        const dx=t.x-d.x,dy=t.y-d.y,len=Math.hypot(dx,dy)||1,speed=430;
        game.mechBullets.push({x:d.x,y:d.y,vx:dx/len*speed,vy:dy/len*speed,life:1.8,radius:4,damage,target:t,color:game.mechQTimer>0?"#e8fbff":"#63d8ff",trail:game.mechQTimer>0});
      }
      d.cooldown=(game.mechQTimer>0?1/1.3:1);
    }
  }
  for (const b of (game.mechBullets||[])) {
    b.life-=dt; b.x+=b.vx*dt; b.y+=b.vy*dt;
    const target=b.target;
    if (!target || target.hp<=0 || target.dead) { b.dead=true; continue; }
    if (Math.hypot(target.x-b.x,target.y-b.y) <= (target.radius||14)+b.radius) {
      if(target===game.boss) damageBoss(b.damage,target.x,target.y); else if(target.type && target.type!=="minion") damageFuseSummon(b.damage,target.x,target.y,target); else damageMinion(target,b.damage);
      emitParticles(b.x,b.y,b.color,game.mechQTimer>0?10:6,game.mechQTimer>0?115:80);
      game.hazards.push({type:"mechanist-hit",x:b.x,y:b.y,radius:game.mechQTimer>0?24:15,life:.22,maxLife:.22}); b.dead=true;
    }
    if(b.life<=0||b.x<-30||b.x>game.width+30||b.y<-30||b.y>game.height+30)b.dead=true;
  }
  game.mechBullets=(game.mechBullets||[]).filter(b=>!b.dead);
}


function alephTargets() {
  const targets=[]; const b=game.boss;
  if(b&&b.hp>0&&b.transition==="none"&&b.type!=="rogue-wave-anchor")targets.push(b);
  for(const t of game.minions||[])if(!t.dead&&t.hp>0&&(t.spawnTimer||0)<=0)targets.push(t);
  for(const t of game.fuseSummons||[])if(!t.dead&&t.hp>0)targets.push(t);
  for(const t of game.fuseDrones||[])if(!t.dead&&t.hp>0)targets.push(t);
  return targets;
}
function updateAleph(dt) {
  if(game.character!=="aleph")return;
  game.alephHealTimer=(game.alephHealTimer??5)-dt;
  while(game.alephHealTimer<=0){game.alephHealTimer+=5;if(game.player&&game.player.hp>0&&game.player.hp<game.player.maxHp){game.player.hp=Math.min(game.player.maxHp,game.player.hp+1);game.hazards.push({type:"aleph-heal",x:game.player.x,y:game.player.y,radius:24,life:.45,maxLife:.45});}}
  if((game.alephQTimer||0)>0){game.alephQTimer=Math.max(0,game.alephQTimer-dt);game.alephQFireTimer=(game.alephQFireTimer||0)-dt;while(game.alephQFireTimer<=0&&game.alephQShotsLeft>0&&(game.alephQTimer>0||game.alephQShotsLeft===1)){game.alephQFireTimer+=0.2;game.alephQShotsLeft--;game.alephQShotCount=(game.alephQShotCount||0)+1;game.alephShots.push({x:game.player.x,y:game.player.y,vx:0,vy:0,life:3.8,speed:490,damage:10*(game.coreBonuses?.ultDamageMult||1),kind:"Q",target:null,delay:0,dead:false});}}
  for(const shot of game.alephShots||[]){if(shot.dead)continue;shot.life-=dt;if(shot.delay>0){shot.delay-=dt;continue;}const targets=alephTargets();if(!shot.target||shot.target.hp<=0||shot.target.dead||!targets.includes(shot.target)){shot.target=targets.reduce((best,t)=>!best||Math.hypot(t.x-shot.x,t.y-shot.y)<Math.hypot(best.x-shot.x,best.y-shot.y)?t:best,null);}
    if(!shot.target){shot.dead=true;continue;}const dx=shot.target.x-shot.x,dy=shot.target.y-shot.y,d=Math.hypot(dx,dy)||1,step=shot.speed*dt;if(d<=step+(shot.target.radius||12)){const t=shot.target;if(t===game.boss)damageBoss(shot.damage,shot.x,shot.y);else if((game.fuseSummons||[]).includes(t))damageFuseSummon(shot.damage,shot.x,shot.y,t);else if((game.fuseDrones||[]).includes(t))damageFuseDrone(t,shot.damage);else damageMinion(t,shot.damage);if(typeof alephAddRupture==="function")alephAddRupture(t,1);emitParticles(shot.x,shot.y,"#8ce8ff",shot.kind==="Q"?4:7,shot.kind==="Q"?75:110);game.hazards.push({type:"aleph-hit",x:shot.x,y:shot.y,radius:shot.kind==="Q"?13:19,life:.22,maxLife:.22});shot.dead=true;}else{const desiredX=dx/d*shot.speed,desiredY=dy/d*shot.speed;shot.vx+=(desiredX-shot.vx)*Math.min(1,dt*6);shot.vy+=(desiredY-shot.vy)*Math.min(1,dt*6);shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;}if(shot.life<=0)shot.dead=true;
  }
  game.alephShots=(game.alephShots||[]).filter(s=>!s.dead);
  if(game.alephQTimer===0&&game.alephQShotCount>0&&(game.alephQShotsLeft||0)===0&&!(game.alephShots||[]).some(s=>s.kind==="Q")&&!game.alephQSettled){game.alephQSettled=true;const target=alephTargets().filter(t=>(t.alephRupture||0)>0).reduce((best,t)=>!best||(t.alephRupture||0)>(best.alephRupture||0)?t:best,null);if(target){const stacks=Math.min(100,Math.max(0,Number(target.alephRupture)||0));const damage=Math.min(1000,(Number(target.maxHp)||0)*stacks/100);target.alephRupture=0;if(target===game.boss)damageBoss(damage,target.x,target.y,{noCharge:true});else if((game.fuseSummons||[]).includes(target))damageFuseSummon(damage,target.x,target.y,target);else if((game.fuseDrones||[]).includes(target))damageFuseDrone(target,damage);else damageMinion(target,damage);target.alephRuptureFlash=.8;game.hazards.push({type:"aleph-airstrike",x:target.x,y:target.y,radius:Math.max(65,target.radius*4),life:.9,maxLife:.9,damage});emitParticles(target.x,target.y,"#dffcff",70,290);showToast(`清算完成：${Math.floor(damage)} 点空袭伤害，目标破裂层数已清空`);addLog(`阿尔法清算：对最高破裂目标发动空袭，造成 ${Math.floor(damage)} 点伤害（上限 1000），并清空其破裂层数。`);}else showToast("清算完成：未找到有效目标");game.alephQShotCount=0;}
}

function update(dt) {
  if (DEBUG_MODE && game.player && game.debugInfiniteHealth !== false) game.player.hp = game.player.maxHp;
  if (!game.running || game.paused || game.ended) {
    return;
  }

  game.elapsed += dt;
  game.ultCooldown = Math.max(0, (game.ultCooldown || 0) - dt);
  // 死亡演出期间停止战斗模拟，只推进视觉效果与演出计时。
  if (game.bossDying || game.playerDying) {
    for (const effect of (game.deathEffects || [])) effect.life -= dt;
    game.deathEffects = (game.deathEffects || []).filter(effect => effect.life > 0);
    for (const particle of (game.particles || [])) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.04, dt);
      particle.vy *= Math.pow(0.04, dt);
      particle.life -= dt;
    }
    game.particles = (game.particles || []).filter(particle => particle.life > 0);
    if (game.bossDying) {
      game.bossDeathTimer = Math.max(0, game.bossDeathTimer - dt);
      if (game.bossDeathTimer <= 0) endRun(true);
    } else {
      game.playerDeathTimer = Math.max(0, game.playerDeathTimer - dt);
      if (game.playerDeathTimer <= 0) endRun(false);
    }
    return;
  }

  const p = game.player;
  const b = game.boss;

  if (!p || !b) return;
  if (game.character === "aleph") updateAleph(dt);
  game.illusionETimer = Math.max(0,(game.illusionETimer||0)-dt);
  game.illusionQCooldown = Math.max(0,(game.illusionQCooldown||0)-dt);
  if (game.character === "illusion") {
    const clones=game.illusionClones||[];
    game.illusionQActive=clones.some(c=>c.kind==="Q"&&!c.dead);
    const targets=[...(b.type==="rogue-wave-anchor"?[]:[b]),...(game.minions||[]).filter(m=>!m.dead),...(game.fuseSummons||[]).filter(m=>!m.dead)].filter(t=>t&&t.hp>0);
    for(let ci=0;ci<clones.length;ci++){
      const c=clones[ci];
      c.life-=dt; c.attackCooldown-=dt;
      // 虚像保持射击距离并绕目标侧移，不再直线冲向 BOSS 的碰撞箱。
      c.orbitAngle=(c.orbitAngle ?? c.angle ?? 0)+dt*(c.kind==="Q"?0.95:0.72)*(c.orbitDir||1);
      const target=targets.slice().sort((u,v)=>Math.hypot(u.x-c.x,u.y-c.y)-Math.hypot(v.x-c.x,v.y-c.y))[0];
      if(target){
        const orbitRadius=(c.kind==="Q"?112:126)+(ci%3)*12;
        const orbitA=c.orbitAngle+(c.seed||0);
        const px=target.x+Math.cos(orbitA)*orbitRadius;
        const py=target.y+Math.sin(orbitA)*orbitRadius;
        const dx=px-c.x,dy=py-c.y,distToPoint=Math.hypot(dx,dy)||1;
        const moveSpeed= c.kind==="Q"?105:88;
        const step=Math.min(distToPoint,moveSpeed*dt);
        c.x+=dx/distToPoint*step; c.y+=dy/distToPoint*step;
        const desired=Math.atan2(target.y-c.y,target.x-c.x);
        if(c.attackCooldown<=0 && Math.hypot(target.x-c.x,target.y-c.y)<340){c.attackCooldown=c.kind==="Q"?0.82:1.15;game.illusionBullets.push({x:c.x,y:c.y,vx:Math.cos(desired)*430,vy:Math.sin(desired)*430,target,life:1.5,damage:c.kind==="Q"?12:10,dead:false,noCharge:true});}
      }
      c.x=clamp(c.x,12,game.width-12);c.y=clamp(c.y,12,game.height-12);
      if(c.life<=0||c.hp<=0){c.dead=true;emitParticles(c.x,c.y,"#a99aff",12,115);game.hazards.push({type:"illusion-fade",x:c.x,y:c.y,radius:26,life:.38,maxLife:.38});}
    }
    game.illusionClones=clones.filter(c=>!c.dead);
    game.illusionQActive=game.illusionClones.some(c=>c.kind==="Q");
    for(const shot of (game.illusionBullets||[])){shot.life-=dt; if(!shot.target||shot.target.hp<=0){shot.dead=true;continue;} const dx=shot.target.x-shot.x,dy=shot.target.y-shot.y,d=Math.hypot(dx,dy)||1,step=430*dt;if(d<=step+(shot.target.radius||10)){if(shot.target===game.boss)damageBoss(shot.damage*(game.illusionQActive?1.2:1),shot.x,shot.y,{noCharge:true});else if(shot.target.type&&shot.target.type!=="minion")damageFuseSummon(shot.damage*(game.illusionQActive?1.2:1),shot.x,shot.y,shot.target);else damageMinion(shot.target,shot.damage*(game.illusionQActive?1.2:1));emitParticles(shot.x,shot.y,"#b9a7ff",5,70);shot.dead=true;}else{shot.x+=dx/d*step;shot.y+=dy/d*step;} if(shot.life<=0)shot.dead=true;}
    game.illusionBullets=(game.illusionBullets||[]).filter(s=>!s.dead);
  }
  updateTraveller(dt);
  if (game.character === "judge") updateJudge(dt);
  if (game.character === "mechanist") updateMechanist(dt);

  game.shootCooldown = Math.max(0, game.shootCooldown - dt);
  game.skillCooldown = Math.max(0, game.skillCooldown - dt);
  game.mechQTimer = Math.max(0, (game.mechQTimer || 0) - dt);
  game.mechShieldTimer = Math.max(0, (game.mechShieldTimer || 0) - dt);
  if (game.mechShieldTimer <= 0) game.mechShield = 0;
  if (game.character === "mechanist" && game.mechRTimer > 0) {
    game.mechRTimer = Math.max(0, game.mechRTimer - dt); game.mechAirstrikeTimer -= dt;
    if (game.mechAirstrikeTimer <= 0 && game.mechAirstrikeCount < 10) { launchMechanistAirstrike(); game.mechAirstrikeCount++; game.mechAirstrikeTimer += 2; }
    if (game.mechRTimer <= 0) { for (const d of (game.mechDrones||[])) { d.returning = false; d.flight = "returning"; } showToast("『机械黎明』结束：无人机已归队"); }
  }
  game.dashCooldown = Math.max(0, game.dashCooldown - dt);
  game.dashTime = Math.max(0, game.dashTime - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  game.skillFieldTimer = Math.max(0, (game.skillFieldTimer || 0) - dt);
  game.prismUltimateTimer = Math.max(0, (game.prismUltimateTimer || 0) - dt);
  game.paradoxE = Math.max(0,(game.paradoxE||0)-dt);
  game.paradoxQ = Math.max(0,(game.paradoxQ||0)-dt);
  game.paradoxR = Math.max(0,(game.paradoxR||0)-dt);
  if (game.paradoxAnchor && game.elapsed >= game.paradoxAnchor.expires) useParadoxR();
  if (game.character === "paradox" && game.paradoxRiftLife > 0) {
    game.paradoxRiftLife = Math.max(0, game.paradoxRiftLife - dt);
    game.paradoxRiftTimer -= dt;
    if (game.paradoxRiftTimer <= 0 && game.paradoxRiftLife > 0) {
      game.paradoxRiftTimer = rand(1, 2);
      const field = [...(game.hazards || [])].reverse().find(h => h.type === "paradox-chaos");
      const cx = field ? field.x : game.player.x, cy = field ? field.y : game.player.y;
      const a = rand(0, Math.PI * 2), r = rand(30, 225), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      const target = [...(game.boss?.type === "rogue-wave-anchor" ? [] : [game.boss]), ...(game.minions || []).filter(m => !m.dead), ...(game.fuseSummons || []).filter(m => !m.dead)].filter(t => t && t.hp > 0).sort((u,v)=>Math.hypot(u.x-x,u.y-y)-Math.hypot(v.x-x,v.y-y))[0];
      game.hazards.push({type:"paradox-rift",x,y,radius:15,life:0.42,maxLife:0.42,fired:false});
      game.paradoxRiftShots = game.paradoxRiftShots || [];
      if (target) game.paradoxRiftShots.push({x,y,target,life:1.6,speed:520,damage:24});
    }
  }
  // 裂缝发射的碎片：可见追踪弹，不再用瞬间消失的伪子弹结算伤害。
  for (const shot of (game.paradoxRiftShots || [])) {
    shot.life -= dt;
    if (!shot.target || shot.target.hp <= 0) {
      const candidates = [...(game.boss?.type === "rogue-wave-anchor" ? [] : [game.boss]), ...(game.minions || []).filter(m => !m.dead), ...(game.fuseSummons || []).filter(m => !m.dead)].filter(t => t && t.hp > 0);
      shot.target = candidates.sort((u,v)=>Math.hypot(u.x-shot.x,u.y-shot.y)-Math.hypot(v.x-shot.x,v.y-shot.y))[0];
    }
    if (shot.target) {
      const dx=shot.target.x-shot.x, dy=shot.target.y-shot.y, d=Math.hypot(dx,dy)||1, step=shot.speed*dt;
      if (d <= step + (shot.target.radius || 12)) {
        if (!paradoxReverseOwnHit(shot.damage)) {
          if (shot.target === game.boss) damageBoss(shot.damage,shot.target.x,shot.target.y);
          else if (shot.target.type && shot.target.type !== "minion") damageFuseSummon(shot.damage,shot.target.x,shot.target.y,shot.target);
          else damageMinion(shot.target,shot.damage);
        }
        shot.life=0; emitParticles(shot.x,shot.y,"#bda4ff",5,75);
      } else { shot.x += dx/d*step; shot.y += dy/d*step; }
    }
  }
  game.paradoxRiftShots = (game.paradoxRiftShots || []).filter(s=>s.life>0);

  if (game.character === "paradox" && game.paradoxShards?.length) {
    game.paradoxQActive = Math.max(0, (game.paradoxQActive || 0) - dt);
    const targets = [...(game.boss?.type === "rogue-wave-anchor" ? [] : [game.boss]), ...(game.minions || []).filter(m=>!m.dead), ...(game.fuseSummons || []).filter(m=>!m.dead)].filter(t=>t&&t.hp>0);
    for (const shard of game.paradoxShards) {
      if (shard.hit) continue;
      shard.angle += dt * 2.2;
      if (shard.phase === "orbit") {
        shard.x = p.x + Math.cos(shard.angle) * 43; shard.y = p.y + Math.sin(shard.angle) * 43;
        if (game.paradoxQActive <= 0) {
          shard.phase = "seek";
          shard.target = targets.sort((u,v)=>Math.hypot(u.x-shard.x,u.y-shard.y)-Math.hypot(v.x-shard.x,v.y-shard.y))[0] || null;
        }
      } else if (shard.phase === "seek") {
        if (!shard.target || shard.target.hp <= 0) shard.target = targets.sort((u,v)=>Math.hypot(u.x-shard.x,u.y-shard.y)-Math.hypot(v.x-shard.x,v.y-shard.y))[0] || null;
        if (!shard.target) { shard.hit=true; continue; }
        const dx=shard.target.x-shard.x,dy=shard.target.y-shard.y,d=Math.hypot(dx,dy)||1,step=460*dt;
        if(d<=step+(shard.target.radius||12)){
          if (!paradoxReverseOwnHit(36)) {
            if(shard.target===game.boss) damageBoss(36,shard.target.x,shard.target.y);
            else if(shard.target.type && shard.target.type !== "minion") damageFuseSummon(36,shard.target.x,shard.target.y,shard.target);
            else damageMinion(shard.target,36);
          }
          shard.hit=true; emitParticles(shard.x,shard.y,"#9d7cff",8,90);
        } else {shard.x+=dx/d*step;shard.y+=dy/d*step;}
      }
    }
    game.paradoxShards=game.paradoxShards.filter(s=>!s.hit);
  }
  game.phantomStealthTimer = Math.max(0, (game.phantomStealthTimer || 0) - dt);
  game.phantomHealFxCooldown = Math.max(0, (game.phantomHealFxCooldown || 0) - dt);
  if (game.phantomDomainTimer > 0) {
    game.phantomDomainTimer = Math.max(0, game.phantomDomainTimer - dt);
    const domainHazard = (game.hazards || []).find(h => h.type === "phantom-domain");
    if (domainHazard) domainHazard.life = game.phantomDomainTimer;
  }
  if (game.character === "phantom" && phantomEnhancedStealth()) {
    game.phantomHealAccumulator = (game.phantomHealAccumulator || 0) + dt;
    while (game.phantomHealAccumulator >= 1) {
      game.phantomHealAccumulator -= 1;
      const oldHp = p.hp;
      p.hp = Math.min(p.maxHp, p.hp + 3);
      if (p.hp > oldHp) {
        emitParticles(p.x + rand(-7, 7), p.y + rand(-7, 7), "#a8ffe0", 5, 55);
        if (!game.phantomHealFxCooldown || game.phantomHealFxCooldown <= 0) {
          game.hazards.push({ type: "phantom-heal", x: p.x, y: p.y, radius: 18, life: 0.5, maxLife: 0.5 });
          game.phantomHealFxCooldown = 0.65;
        }
      }
    }
  } else { game.phantomHealAccumulator = 0; }
  if (game.character === "bulwark") {
    if (!ultimateChargeBlocked()) game.ultEnergy = clamp(game.ultEnergy + dt * 1.35, 0, 100);
    if ((game.bulwarkUltimateTimer || 0) > 0) {
      game.bulwarkUltimateTimer = Math.max(0, game.bulwarkUltimateTimer - dt);
      game.invulnerable = Math.max(game.invulnerable, game.bulwarkUltimateTimer);
      if (game.bulwarkUltimateTimer === 0) finishBulwarkUltimate();
    }
  }
  if (game.character === "singularity") { const lens = game.rogueBuild.gravityLens || 0; game.singularityCharge = clamp((game.singularityCharge ?? 10) + dt * (3 + lens * 1.2), 0, 100); game.ultEnergy = clamp(game.ultEnergy + dt * 0.35, 0, 100); }

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

    const phantomSpeed = game.character === "illusion" && illusionFullDodgeActive() ? 1.25 : 1;
    p.x += dx * p.speed * phantomSpeed * dt;
    p.y += dy * p.speed * phantomSpeed * dt;
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

  const rogueWaveEncounter = game.mode === "rogue" && (game.rogueNodeType === "battle" || game.rogueNodeType === "elite");
  // 普通敌袭与精英房不运行旧 BOSS 的移动、转阶段与主弹幕。
  if (!rogueWaveEncounter) {
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
  if (b.type === "zero") updateZeroMechanics(dt);
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
  }
  updateMinions(dt);

  // 第二阶段专属空袭
  if (
    b.type !== "zero" && !rogueWaveEncounter && ((b.phase === 2 && !(b.type === "fuse" && (game.fuseSummons || []).some(s => !s.dead && s.hp > 0))) || (b.type === "fuse" && b.phase === 4 && !b.fuseShutdown && b.fuseAttackMode === 2)) &&
    b.transition === "none"
  ) {
    b.airstrikeCooldown -= dt;
    if (b.airstrikeCooldown <= 0) {
      spawnAirstrike();
      b.airstrikeCooldown = b.type === "fuse" && b.phase === 4 ? rand(2.8, 3.8) : rand(7, 9.5);
    }
  }

  // 奇点引力场固定在施放位置，不跟随玩家移动；强力牵引弹幕与敌人，并周期性造成伤害。
  if (game.character === "singularity" && game.skillFieldTimer > 0) {
    const radius = game.skillFieldRadius || 270;
    const fx = game.skillFieldX ?? p.x, fy = game.skillFieldY ?? p.y;
    for (const bullet of game.enemyBullets) {
      if (bullet.dead) continue;
      const dx = fx - bullet.x, dy = fy - bullet.y, d = Math.hypot(dx, dy) || 1;
      if (d < radius) {
        const pull = 620 * dt;
        bullet.vx += dx / d * pull;
        bullet.vy += dy / d * pull;
        // 进入引力井核心区域的弹幕被压碎，给 E 一个明确的防御价值。
        if (d < 42) { bullet.dead = true; emitParticles(bullet.x, bullet.y, COLORS.orange, 3, 45); }
      }
    }
    // 奇点 E 只牵引普通小怪；精英、BOSS 与 FUSE 机制单位拥有重力抗性。
    for (const target of game.minions.filter(m => !m.dead && !m.isElite && (m.spawnTimer||0)<=0)) {
      const dx = fx - target.x, dy = fy - target.y, d = Math.hypot(dx, dy) || 1;
      if (d < radius) { target.x += dx / d * 185 * dt; target.y += dy / d * 185 * dt; }
    }
    game.skillFieldDamageTimer = (game.skillFieldDamageTimer || 0) - dt;
    if (game.skillFieldDamageTimer <= 0) {
      game.skillFieldDamageTimer += 0.5;
      for (const m of game.minions) if (!m.dead && !m.isElite && (m.spawnTimer||0)<=0 && distance({x:fx,y:fy}, m) < radius) damageMinion(m, 42);
      for (const summon of (game.fuseSummons || [])) if (!summon.dead && summon.hp > 0 && distance({x:fx,y:fy}, summon) < radius) damageFuseSummon(55, summon.x, summon.y, summon);
      if (b.transition === "none" && distance({x:fx,y:fy}, b) < radius) damageBoss(48, fx, fy);
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
          if (!paradoxReverseOwnHit(bullet.damage)) damageFuseSummon(bullet.damage, bullet.x, bullet.y, targetSummon);
          if (game.character === "aleph" && bullet.alephRupture) alephAddRupture(targetSummon,1);
          emitParticles(bullet.x, bullet.y, targetSummon.type === "observer" ? COLORS.violet : COLORS.pink, 3, 60);
          hitMinion = true;
        }
      }

      // FUSE-CORE 第四阶段：玩家子弹优先命中无人机，再检查普通小怪与核心。
      if (!hitMinion && b.type === "fuse" && b.phase === 4 && b.fuseDronesSpawned) {
        for (const d of (game.fuseDrones || [])) {
          if (!d.dead && d.hp > 0 && !(bullet.hitTargets || []).includes(d) && distance(bullet, d) < bullet.radius + d.radius) {
            onPrismBulletHit(bullet, d);
            if (!paradoxReverseOwnHit(bullet.damage)) damageFuseDrone(d, bullet.damage);
            if (game.character === "aleph" && bullet.alephRupture) alephAddRupture(d,1);
            emitParticles(bullet.x, bullet.y, COLORS.cyan, 3, 60);
            hitMinion = true;
            break;
          }
        }
      }

      for (const m of (hitMinion ? [] : game.minions)) {
        if (
          !m.dead && (m.spawnTimer || 0) <= 0 &&
          !(bullet.hitTargets || []).includes(m) &&
          distance(bullet, m) <
            bullet.radius + m.radius
        ) {
          onPrismBulletHit(bullet, m);
          if (!paradoxReverseOwnHit(bullet.damage)) damageMinion(m, bullet.damage);
          if (game.character === "aleph" && bullet.alephRupture) alephAddRupture(m,1);
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
          b.type !== "rogue-wave-anchor" &&
          b.transition === "none" &&
          !(bullet.hitTargets || []).includes(b) &&
          distance(bullet, b) <
            bullet.radius + b.radius
        ) {
          onPrismBulletHit(bullet, b);
          if (!paradoxReverseOwnHit(bullet.damage)) damageBoss(
            bullet.damage,
            bullet.x,
            bullet.y
          );
          if (game.character === "aleph" && bullet.alephRupture) alephAddRupture(b,1);
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
    // ZERO 追踪导弹采用“短时锁定 + 直线飞行”：锁定窗口结束后不再修正方向，
    // 同时保留独立总寿命，避免导弹长时间追逐玩家。
    if (bullet.zeroHoming) {
      bullet.homingTime = Math.max(0, (bullet.homingTime ?? 1.25) - dt);
    }
    if (bullet.homing && p && (!bullet.zeroHoming || bullet.homingTime > 0)) {
      const dx = p.x - bullet.x, dy = p.y - bullet.y, len = Math.hypot(dx,dy) || 1;
      const speed = bullet.zeroHoming ? 285 : (Math.hypot(bullet.vx,bullet.vy) || 120);
      const desiredX = dx / len * speed, desiredY = dy / len * speed;
      const turn = Math.min(1, dt * (bullet.turnRate || 1.35));
      bullet.vx += (desiredX - bullet.vx) * turn; bullet.vy += (desiredY - bullet.vy) * turn;
      if (bullet.zeroHoming) { const v=Math.hypot(bullet.vx,bullet.vy)||1; bullet.vx=bullet.vx/v*speed; bullet.vy=bullet.vy/v*speed; }
    }
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.zeroHoming && bullet.life <= 0 && !bullet.dead) {
      bullet.dead = true;
      emitParticles(bullet.x, bullet.y, "#ff8b70", 5, 65);
    }

    // 幻影虚像可被敌方弹幕命中；虚像存活时会吸引弹道并独立承伤。
    if (!bullet.dead && game.character === "illusion") {
      const clone=(game.illusionClones||[]).find(c=>!c.dead&&Math.hypot(bullet.x-c.x,bullet.y-c.y)<(bullet.radius||3)+c.radius);
      if(clone){bullet.dead=true;clone.hp-=Number(bullet.damage)||10;emitParticles(clone.x,clone.y,"#b9a7ff",7,85);if(clone.hp<=0){clone.dead=true;game.hazards.push({type:"illusion-fade",x:clone.x,y:clone.y,radius:26,life:.38,maxLife:.38});emitParticles(clone.x,clone.y,"#a99aff",14,130);}continue;}
    }
    // 覆写只在弹幕实际碰到环绕碎片时吸收，不清空角色周围区域。
    if (!bullet.dead && game.character === "paradox" && game.paradoxQActive > 0) {
      const shard = (game.paradoxShards || []).find(sh => sh.phase === "orbit" && !sh.hit && Math.hypot(bullet.x-sh.x, bullet.y-sh.y) <= (bullet.radius || 3) + (sh.radius || 10));
      if (shard) {
        bullet.dead = true;
        if ((game.paradoxAbsorbed || 0) < 20) { game.paradoxAbsorbed++; game.paradox = clamp((game.paradox || 0) + 5, 0, 200); }
        emitParticles(shard.x, shard.y, "#bda4ff", 5, 70);
        continue;
      }
    }

    if (!bullet.dead && distance(bullet, p) < bullet.radius + p.radius * 0.7) {
      // 因果优先于常规无敌帧：悖论不受伤，原本计算出的伤害转移给攻击者。
      if (game.character === "paradox" && game.paradoxE > 0) {
        bullet.dead = true;
        const source = bullet.sourceMinion || (game.boss && game.boss.transition === "none" ? game.boss : null);
        if (source) {
          if (source === game.boss) damageBoss(Number(bullet.damage)||0, source.x, source.y, {noCharge:true});
          else if (source.type && source.type !== "minion") damageFuseSummon(Number(bullet.damage)||0, source.x, source.y, source);
          else if (!source.dead) damageMinion(source, Number(bullet.damage)||0);
        }
        emitParticles(p.x,p.y,"#bda4ff",7,100);
        showToast("因果反转：伤害已转移给攻击者");
        continue;
      }
      // 壁垒终结技期间：无条件吸收接触到的弹幕，结束时统一散射.
      if (game.character === "bulwark" && (game.bulwarkUltimateTimer || 0) > 0) {
        bullet.dead = true;
        game.bulwarkStoredBullets = game.bulwarkStoredBullets || [];
        game.bulwarkStoredBullets.push({ damage: bullet.damage || 10, radius: bullet.radius || 3 });
        emitParticles(p.x, p.y, COLORS.violet, 8, 95);
      } else if (game.invulnerable <= 0) {
        bullet.dead = true;
        if (game.character === "illusion" && (illusionFullDodgeActive() || Math.random()<0.30)) {
          emitParticles(p.x,p.y,"#a99aff",18,140);game.hazards.push({type:"illusion-dodge",x:p.x,y:p.y,radius:34,life:.32,maxLife:.32});showToast(illusionFullDodgeActive()?"幻影闪避：移速 +25%":"幻影闪避成功");
        } else if (game.character === "phantom") {
          const dodged = phantomEnhancedStealth() || Math.random() < 0.5;
          if (dodged) {
            const actualDamage = Math.max(0, Number(bullet.damage) || 0);
            const multiplier = phantomEnhancedStealth() ? 3 : 1.5;
            if (!ultimateChargeBlocked()) game.ultEnergy = clamp(game.ultEnergy + 3, 0, 100);
            if (bullet.sourceMinion && !bullet.sourceMinion.dead) damageMinion(bullet.sourceMinion, actualDamage * multiplier);
            else if (game.boss && game.boss.transition === "none") damageBoss(actualDamage * multiplier, p.x, p.y);
            emitParticles(p.x, p.y, "#b49aff", 24, 175);
            game.hazards.push({ type: "dodge-burst", x: p.x, y: p.y, radius: 42, life: 0.32, maxLife: 0.32 });
            showToast(`闪避成功：反伤 ${Math.round(actualDamage * multiplier)} · 充能 +3%`);
            addLog(`幻灵闪避攻击，反伤 ${Math.round(actualDamage * multiplier)} 点，获得 3% 终结技能量。`);
          } else {
            damagePlayer(bullet.damage, bullet.sourceMinion || (game.boss && game.boss.transition === "none" ? game.boss : null));
            emitParticles(p.x, p.y, COLORS.pink, 10, 100);
            showToast("闪避失败：核心受到冲击");
            addLog(`闪避失败，受到 ${bullet.damage} 点伤害。`);
          }
        } else if (game.character === "paradox" && Math.random() < Math.min(0.85,0.15+(game.paradox||0)*0.003 + (game.paradoxRiftLife>0?0.10:0))) {
          game.paradox=clamp((game.paradox||0)+10,0,200); emitParticles(p.x,p.y,"#9d7cff",24,160); game.hazards.push({type:"dodge-burst",x:p.x,y:p.y,radius:40,life:0.32,maxLife:0.32}); showToast("悖论闪避成功 · 悖论 +10");
        } else {
          game._paradoxDamageSource = bullet.sourceMinion || (game.boss && game.boss.transition === "none" ? game.boss : null);
          damagePlayer(bullet.damage, bullet.sourceMinion || (game.boss && game.boss.transition === "none" ? game.boss : null)); game._paradoxDamageSource = null;
          emitParticles(p.x, p.y, game.character === "paradox" ? "#9d7cff" : COLORS.pink, 10, 100);
          showToast("核心受到冲击"); addLog(`受到 ${bullet.damage} 点伤害。`);
        }
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
  for (const effect of (game.deathEffects || [])) effect.life -= dt;
  game.deathEffects = (game.deathEffects || []).filter(effect => effect.life > 0);

  // 危险区域与空袭倒计时
  for (const h of (game.hazards||[])) { if (h.type === "mechanist-airstrike" && !h.fired && h.life <= 0.18) { h.fired=true; const radius=h.radius; for (const t of getMechanistTargets()) { const d=Math.hypot(t.x-h.x,t.y-h.y); if(d<=radius+(t.radius||0)) { const dmg=t===h.target?200:150; if(t===game.boss) damageBoss(dmg*(game.coreBonuses?.ultDamageMult||1),t.x,t.y); else if((game.fuseDrones||[]).includes(t)) damageFuseDrone(t,dmg); else if((game.fuseSummons||[]).includes(t)) damageFuseSummon(dmg,t.x,t.y,t); else damageMinion(t,dmg); } } emitParticles(h.x,h.y,"#ff786b",54,280); game.hazards.push({type:"mechanist-blast",x:h.x,y:h.y,radius:radius,life:.42,maxLife:.42}); } }
  for (const hazard of game.hazards) {
    if (hazard.type === "judge-cross") {
      if (!hazard.fired) { hazard.life -= dt; if (hazard.life <= 0) { hazard.fired = true; for (const m of game.minions||[]) if(!m.dead && (m.spawnTimer||0)<=0 && distance(hazard,m)<=hazard.radius) damageMinion(m,hazard.damage); if(game.boss&&game.boss.transition==="none"&&game.boss.type!=="rogue-wave-anchor"&&distance(hazard,game.boss)<=hazard.radius+game.boss.radius) damageBoss(hazard.damage,hazard.x,hazard.y); emitParticles(hazard.x,hazard.y,"#ffe6a1",28,180); } }
    } else if (hazard.type === "judge-scales") { hazard.life -= dt;
    } else if (hazard.type === "airstrike") {
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
    } else if (hazard.type === "zero-bombardment") {
      hazard.life -= dt;
      if (hazard.life <= 0 && !hazard.fired) {
        hazard.fired = true;
        if (game.player && distance(hazard, game.player) <= hazard.radius + game.player.radius) damagePlayer(hazard.damage || 10, game.boss);
        emitParticles(hazard.x,hazard.y,"#ff6b55",42,260);
        emitParticles(hazard.x,hazard.y,"#ffd0a1",22,170);
        game.hazards.push({type:"zero-blast",x:hazard.x,y:hazard.y,radius:hazard.radius*1.35,life:.48,maxLife:.48});
      }
    } else if (hazard.type === "enemy-pulse") {
      hazard.life -= dt;
      if (hazard.life <= 0 && !hazard.fired) {
        hazard.fired = true;
        if (game.player && distance(hazard, game.player) <= hazard.radius + game.player.radius) damagePlayer(hazard.damage || 8, hazard.sourceMinion || (game.boss && game.boss.transition === "none" ? game.boss : null));
        emitParticles(hazard.x, hazard.y, hazard.color || COLORS.pink, 14, 95);
      }
    } else if (hazard.type === "phantom-domain") {
      // 领域计时器在战斗更新开头统一递减，此处不重复扣时。
      hazard.life = game.phantomDomainTimer || 0;
    } else {
      hazard.life -= dt;
    }
  }

  game.hazards = game.hazards.filter(hazard => {
    if (hazard.type === "airstrike" || hazard.type === "stalker-rift" || hazard.type === "zero-bombardment") {
      return !hazard.fired;
    }
    if (hazard.type === "fuse-laser") return hazard.life > 0;
    if (hazard.type === "enemy-pulse") return !hazard.fired;
    return hazard.life > 0;
  });

  // 胜负判定：先进入死亡演出，演出期间完全冻结战斗与伤害。
  if (!rogueWaveEncounter && b.hp <= 0) {
    b.hp = 0;
    game.bossDying = true;
    game.bossDeathTimer = b.type === "zero" ? 3.25 : 1.9;
    game.enemyBullets = [];
    game.hazards = [];
    game.bullets = [];
    spawnDeathEffect(b.x, b.y, b.type === "zero" ? "zero-boss" : "boss", b.type === "zero" ? "#ff654f" : b.type === "stalker" ? COLORS.pink : b.type === "fuse" ? COLORS.orange : COLORS.violet, 54);
    emitParticles(b.x, b.y, b.type === "zero" ? "#ff654f" : b.type === "stalker" ? COLORS.pink : b.type === "fuse" ? COLORS.orange : COLORS.violet, b.type === "zero" ? 105 : 70, b.type === "zero" ? 310 : 245);
    showToast("目标信号崩解中……");
    updateHUD();
    return;
  }

  if (DEBUG_MODE && game.debugInfiniteHealth !== false) p.hp = p.maxHp;
  if (p.hp <= 0) {
    p.hp = 0;
    game.playerDying = true;
    game.playerDeathTimer = 1.25;
    game.enemyBullets = [];
    game.hazards = [];
    game.bullets = [];
    spawnDeathEffect(p.x, p.y, "player", COLORS.cyan, p.radius + 8);
    emitParticles(p.x, p.y, COLORS.cyan, 40, 175);
    updateHUD();
    return;
  }

  updateHUD();
}

// ============================================================
// 绘制背景
// ============================================================

