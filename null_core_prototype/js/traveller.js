// UR-001 旅者：空虚旅途状态、追踪遗物、蓄能光柱与终结冲击波。
const TRAVELLER = { color: "#e4d9ff", shardDamage: 12, relicDamage: 24, pillarDamage: 90, relicSpeed: 420, eCooldown: 8, rCooldown: 35 };
function resetTraveller() {
  game.traveller = { stacks: new WeakMap(), relics: [], qCharge: 0, qCharging: false, qTarget: null, qCooldown: 0, rCooldown: 0, rTimer: 0, rHealAccumulator: 0, shotTimer: 0, waveFx: 0, qReleasePending: false };
}
function travellerCanTarget(t) {
  if (!t || t.hp <= 0 || t.dead || t.transition === "dead") return false;
  // Invisible room anchor is only a simulation sentinel, never a combat target.
  if (t === game.boss && t.type === "rogue-wave-anchor") return false;
  // BOSS 转阶段时不可锁定；FUSE-CORE 处于护盾/无人机防御状态时也不可叠层。
  if (t === game.boss) {
    if (t.transition !== "none") return false;
    if (t.type === "fuse") {
      if ((t.phase === 2 || t.phase === 3) && (game.fuseSummons || []).some(s => !s.dead && s.hp > 0)) return false;
      if (t.phase === 1 && !t.fuseShutdown && !t.fuseWeakpointOpen) return false;
      if (t.phase === 4 && !t.fuseShutdown && (game.fuseDrones || []).filter(d => !d.dead && d.hp > 0).length >= 10) return false;
    }
  }
  return true;
}
function travellerTargets() {
  const drones = game.boss?.type === "fuse" && game.boss.phase === 4 && game.boss.fuseDronesSpawned
    ? (game.fuseDrones || []).filter(d => !d.dead && d.hp > 0)
    : [];
  return [game.boss, ...(game.minions || []).filter(t => !t.dead), ...(game.fuseSummons || []).filter(t => !t.dead && t.hp > 0), ...drones]
    .filter(t => !(t === game.boss && t.type === "rogue-wave-anchor"))
    .filter(travellerCanTarget);
}
function travellerV(target) { return Math.max(0, Math.min(1, Number(target?.__voidJourney) || 0)); }
function travellerSetV(target, value) { if (target) target.__voidJourney = Math.max(0, Math.min(1, value)); }
function travellerAddV(target, value) { travellerSetV(target, travellerV(target) + value); }
function travellerBonus(target) { return 1 + 0.5 * travellerV(target); }
function travellerDamage(target, baseDamage, x = target?.x, y = target?.y) {
  if (!travellerCanTarget(target)) return false;
  const damage = baseDamage * travellerBonus(target);
  if (target === game.boss) return damageBoss(damage, x, y);
  if ((game.fuseSummons || []).includes(target)) return damageFuseSummon(damage, x, y, target);
  if ((game.fuseDrones || []).includes(target)) return damageFuseDrone(target, damage);
  return damageMinion(target, damage);
}
function nearestTravellerTarget(x, y) {
  return travellerTargets().sort((a, b) => Math.hypot(a.x-x,a.y-y) - Math.hypot(b.x-x,b.y-y))[0] || null;
}
function shootTraveller() {
  const p = game.player; if (!p) return;
  const t = game.traveller;
  const target = nearestTravellerTarget(p.x, p.y); if (!target) return;
  const angle = Math.atan2(target.y-p.y,target.x-p.x);
  t.relics.push({x:p.x+Math.cos(angle)*20,y:p.y+Math.sin(angle)*20,target,vx:Math.cos(angle)*TRAVELLER.relicSpeed,vy:Math.sin(angle)*TRAVELLER.relicSpeed,damage:TRAVELLER.shardDamage,kind:"basic",speed:TRAVELLER.relicSpeed,life:3.5,radius:6});
  game.shootCooldown = game.traveller.rTimer > 0 ? 0.13 : 0.22;
  emitParticles(p.x,p.y,TRAVELLER.color,3,55);
}
function travellerDetonate(target, damage, radiusBase = 42, multiplier = 1) {
  const before = travellerV(target);
  const reduced = Math.max(0, before - 0.30);
  const explosionRadius = radiusBase + reduced * 120;
  const finalDamage = damage * (1 + reduced * 2.0) * multiplier;
  // 先快照降低量并对范围内单位结算，最后重置主目标状态。
  for (const other of travellerTargets()) {
    if (Math.hypot(other.x-target.x, other.y-target.y) <= explosionRadius) travellerDamage(other, finalDamage, other.x, other.y);
  }
  travellerSetV(target, 0.30);
  game.hazards.push({type:"traveller-explosion",x:target.x,y:target.y,radius:explosionRadius,life:0.48,maxLife:0.48});
  emitParticles(target.x,target.y,TRAVELLER.color,20,170);
  return reduced;
}
function travellerOnRelicHit(target, relic) {
  if (relic.kind === "basic") {
    travellerAddV(target, Math.min(0.01, travellerV(target) * 1.1));
    travellerDamage(target, relic.damage, target.x, target.y);
    return;
  }
  if (travellerV(target) < 0.50) {
    travellerAddV(target, 0.10);
    travellerDamage(target, relic.damage, target.x, target.y);
  } else {
    travellerDetonate(target, relic.damage, 38, 1);
  }
}
function useTravellerE() {
  const t=game.traveller, p=game.player;
  if (!game.running || game.paused || t.eCooldown>0) { if(t.eCooldown>0) showToast(`旅途冷却 ${t.eCooldown.toFixed(1)}s`); return; }
  t.eCooldown=TRAVELLER.eCooldown*(game.coreBonuses?.skillCooldownMult||1)*(game.debugCooldownMult??1);
  for(let i=0;i<3;i++) { const target=nearestTravellerTarget(p.x,p.y); if(target) t.relics.push({x:p.x,y:p.y,target,damage:TRAVELLER.relicDamage,kind:"skill",speed:TRAVELLER.relicSpeed,life:3.5,radius:9,angle:i*Math.PI*2/3}); }
  emitParticles(p.x,p.y,TRAVELLER.color,18,140); showToast("旅途：3 枚旅者之遗已出发"); addLog("旅者召唤三枚旅者之遗，命中后根据空虚旅途积累或引爆。"); updateHUD();
}
function useTravellerQ() {
  const t=game.traveller;
  if (!game.running || game.paused || game.ended) return;
  if (t.qCharging) { releaseTravellerQ(); return; }
  if (game.ultCooldown>0 || t.qCooldown>0) { showToast(`信笺冷却 ${Math.max(game.ultCooldown||0,t.qCooldown||0).toFixed(1)}s`); return; }
  const target=travellerTargets().sort((a,b)=>travellerV(b)-travellerV(a))[0];
  if(!target) { showToast("信笺：当前没有可锁定目标"); return; }
  t.qCharging=true; t.qCharge=0; t.qTarget=target;
  showToast("信笺开始蓄能：再次按 Q 释放，10 秒后自动释放");
}
function releaseTravellerQ() {
  const t=game.traveller, target=t.qTarget;
  t.qCharging=false;
  if(!target || target.hp<=0 || !travellerTargets().includes(target)) { t.qCharge=0;t.qTarget=null;showToast("信笺取消：锁定目标已消失");return; }
  const pillars=1+Math.floor(Math.min(9.999,t.qCharge)/3);
  const chargeMult=1+t.qCharge*0.10;
  for(let i=0;i<pillars;i++) {
    const currentTarget=target;
    // 每根光柱逐次读取目标最新状态；高层数引爆后降至30%，后续光柱可再次引爆。
    if(currentTarget.hp<=0) break;
    const damage=TRAVELLER.pillarDamage*chargeMult*(game.coreBonuses?.damageMult||1)*(game.mode==="rogue"?game.rogueBuild.damageMult:1);
    if(travellerV(currentTarget)<0.50) { travellerAddV(currentTarget,0.10);travellerDamage(currentTarget,damage,currentTarget.x,currentTarget.y); }
    else { travellerDetonate(currentTarget,damage,52,1);const p=game.player;const old=p.hp;p.hp=Math.min(p.maxHp,p.hp+1);if(p.hp>old){emitParticles(p.x,p.y,"#a8ffe0",7,70);game.hazards.push({type:"phantom-heal",x:p.x,y:p.y,radius:18,life:.5,maxLife:.5});} }
    game.hazards.push({type:"traveller-pillar",x:currentTarget.x,y:currentTarget.y,radius:35,life:.5,maxLife:.5});
  }
  startUltimateCooldown("traveller"); t.qCooldown=game.ultCooldown;t.qCharge=0;t.qTarget=null;
  showToast(`信笺：${pillars} 枚光柱落下`);addLog(`信笺蓄能 ${(chargeMult-1)*100|0}% 后释放 ${pillars} 枚光柱。`);updateHUD();
}
function useTravellerR() {
  const t=game.traveller,p=game.player;
  if(!game.running||game.paused||game.ended)return;
  if(t.rCooldown>0){showToast(`旅途的尾声冷却 ${t.rCooldown.toFixed(1)}s`);return;}
  t.rTimer=10;t.rCooldown=TRAVELLER.rCooldown*(game.coreBonuses?.skillCooldownMult||1)*(game.debugCooldownMult??1);t.rHealAccumulator=0;t.shotTimer=0;
  game.hazards.push({type:"traveller-aura",x:p.x,y:p.y,radius:80,life:10,maxLife:10});emitParticles(p.x,p.y,TRAVELLER.color,45,230);
  showToast("旅途的尾声：全场叠层已启动");addLog("旅者进入 10 秒强化状态：移速、攻速、伤害提升并获得闪避与持续恢复。");
}
function updateTraveller(dt) {
  if(game.character!=="traveller") return;
  const t=game.traveller,p=game.player;
  t.eCooldown=Math.max(0,t.eCooldown-dt);t.qCooldown=Math.max(0,t.qCooldown-dt);t.rCooldown=Math.max(0,t.rCooldown-dt);t.waveFx=Math.max(0,t.waveFx-dt);
  if(t.qCharging){
    if(!t.qTarget||t.qTarget.hp<=0||!travellerTargets().includes(t.qTarget)){t.qCharging=false;t.qTarget=null;t.qCharge=0;showToast("信笺取消：锁定目标已消失");}
    else {t.qCharge=Math.min(10,t.qCharge+dt);if(t.qCharge>=10)releaseTravellerQ();}
  }
  if(t.rTimer>0){
    t.rTimer=Math.max(0,t.rTimer-dt);p.speed=255*(1+(game.mode==="rogue"?game.rogueBuild.speedBonus/255:0))*1.15;
    t.rHealAccumulator+=dt;while(t.rHealAccumulator>=1){t.rHealAccumulator-=1;const old=p.hp;p.hp=Math.min(p.maxHp,p.hp+2);if(p.hp>old){emitParticles(p.x,p.y,"#a8ffe0",6,65);game.hazards.push({type:"phantom-heal",x:p.x,y:p.y,radius:18,life:.5,maxLife:.5});}for(const target of travellerTargets())travellerAddV(target,.10);}
    t.shotTimer+=dt;
  } else {p.speed=255+(game.mode==="rogue"?game.rogueBuild.speedBonus:0);}
  const targets=travellerTargets();
  for(const relic of t.relics){
    relic.life-=dt;
    if(relic.life<=0)continue;
    // 目标消失/无敌时先尝试重新锁定；若没有合法目标，沿最后速度继续飞行，不再原地悬停。
    if(!relic.target||!travellerCanTarget(relic.target)||!targets.includes(relic.target))relic.target=nearestTravellerTarget(relic.x,relic.y);
    const step=relic.speed*dt;
    if(!relic.target){relic.x+=(relic.vx||0)*dt;relic.y+=(relic.vy||0)*dt;continue;}
    const dx=relic.target.x-relic.x,dy=relic.target.y-relic.y,d=Math.hypot(dx,dy)||1;
    relic.vx=dx/d*relic.speed;relic.vy=dy/d*relic.speed;
    if(d<=step+(relic.target.radius||12)+relic.radius){
      const hitTarget=relic.target;
      if(travellerCanTarget(hitTarget)&&targets.includes(hitTarget)){
        travellerOnRelicHit(hitTarget,relic);relic.life=0;
        game.hazards.push({type:"traveller-hit",x:hitTarget.x,y:hitTarget.y,radius:20,life:.25,maxLife:.25});
      } else {relic.target=null;relic.x+=relic.vx*dt;relic.y+=relic.vy*dt;}
    } else {relic.x+=relic.vx*dt;relic.y+=relic.vy*dt;}
  }
  t.relics=t.relics.filter(r=>r.life>0);
  if(t.rTimer===0&&t._wasRActive){t._wasRActive=false;for(const target of travellerTargets()){const v=travellerV(target);if(v>0){travellerDamage(target,1000*v,target.x,target.y);travellerSetV(target,0);}}t.waveFx=.9;game.hazards.push({type:"traveller-wave",x:p.x,y:p.y,radius:Math.max(game.width,game.height),life:.9,maxLife:.9});emitParticles(p.x,p.y,TRAVELLER.color,100,360);showToast("旅途的尾声：全屏冲击波已释放");addLog("旅途的尾声结束，冲击波按各敌人的空虚旅途结算伤害并清空状态。");}
  if(t.rTimer>0)t._wasRActive=true;
}
function drawCometEffects(){
  if(game.character!=="comet")return;
  const drawTrail=(trail,detached=false)=>{
    if(!trail||trail.length<2)return;
    ctx.save();ctx.globalCompositeOperation="lighter";ctx.lineCap="round";ctx.lineJoin="round";
    // 每一段根据节点剩余寿命单独淡出；尾端更细更透明，弹头消失后仍保留尾迹。
    for(let i=1;i<trail.length;i++){
      const a=trail[i-1],b=trail[i],progress=i/(trail.length-1);
      const life=Math.min(a.life/(a.maxLife||.62),b.life/(b.maxLife||.62));
      const alpha=Math.max(0,life)*(.06+progress*.52);
      if(alpha<=.01)continue;
      ctx.globalAlpha=alpha;
      ctx.strokeStyle=progress>.78?"#eadbff":"#b58aff";
      ctx.lineWidth=.55+progress*1.25;
      ctx.shadowBlur=progress>.7?5:2;ctx.shadowColor="rgba(181,138,255,.34)";
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
    ctx.restore();
  };
  for(const fade of game.cometTrailFades||[])drawTrail(fade.nodes,true);
  for(const shot of game.cometProjectiles||[]){
    drawTrail(shot.trail);
    const angle=Math.atan2(shot.vy||0,shot.vx||1);ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(angle);ctx.globalCompositeOperation="lighter";ctx.shadowBlur=7;ctx.shadowColor="rgba(181,138,255,.42)";ctx.fillStyle=shot.kind==="skill"?"#ead8ff":"#c6a2ff";ctx.strokeStyle="#fff4ff";ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(2,-shot.radius*.72);ctx.lineTo(-7,0);ctx.lineTo(2,shot.radius*.72);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
  if(game.cometQTimer>0){const p=game.player;ctx.save();ctx.translate(p.x,p.y);ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.5+.2*Math.sin(game.elapsed*10);ctx.strokeStyle="#c9a4ff";ctx.shadowBlur=12;ctx.shadowColor="#a879ff";ctx.lineWidth=1.7;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,p.radius+12+i*7,p.radius+7+i*5,game.elapsed*(i%2?-.8:.65)+i,game.elapsed,game.elapsed+Math.PI*1.45);ctx.stroke();}for(let i=0;i<5;i++){const a=game.elapsed*1.7+i*Math.PI*2/5;ctx.fillStyle="#f3eaff";ctx.beginPath();ctx.arc(Math.cos(a)*(p.radius+23),Math.sin(a)*(p.radius+17),2,0,Math.PI*2);ctx.fill();}ctx.restore();}
}
function drawTravellerEffects(){
  if(game.character!=="traveller")return;
  const t=game.traveller,p=game.player;if(!t||!p)return;
  // Relics read as small orbiting fragments with a directional tail.
  for(const r of t.relics){
    const a=Math.atan2(r.vy||0,r.vx||1);ctx.save();ctx.translate(r.x,r.y);ctx.rotate(a);
    ctx.globalCompositeOperation="lighter";ctx.shadowBlur=8;ctx.shadowColor="#b9a6ff";
    ctx.fillStyle=r.kind==="skill"?"#fff4df":"#c9baff";ctx.strokeStyle="#fff8e8";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(1,-r.radius*.65);ctx.lineTo(-7,0);ctx.lineTo(1,r.radius*.65);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.globalAlpha=.35;ctx.strokeStyle="#c8b8ff";ctx.beginPath();ctx.moveTo(-6,0);ctx.lineTo(-17,0);ctx.stroke();ctx.restore();
  }
  // Q charging: a clear lock-on reticle and a growing charge arc.
  if(t.qCharging&&t.qTarget){
    const q=t.qCharge/10,tar=t.qTarget;ctx.save();ctx.translate(tar.x,tar.y);ctx.globalCompositeOperation="lighter";
    ctx.strokeStyle="#fff0c9";ctx.shadowBlur=10;ctx.shadowColor="#c7b8ff";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(0,0,25+Math.sin(game.elapsed*7)*2,-Math.PI/2,-Math.PI/2+Math.PI*2*q);ctx.stroke();
    ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(0,0,32,game.elapsed*.7,game.elapsed*.7+Math.PI*1.6);ctx.stroke();ctx.setLineDash([]);
    ctx.textAlign="center";ctx.font="bold 10px monospace";ctx.fillStyle="#fff4df";ctx.fillText(`LETTER ${(q*100).toFixed(0)}%`,0,-43);ctx.restore();
  }
  // R active state: a calm double orbit, not a screen-filling glow.
  if(t.rTimer>0){ctx.save();ctx.translate(p.x,p.y);ctx.globalCompositeOperation="lighter";ctx.globalAlpha=.55+.16*Math.sin(game.elapsed*7);ctx.strokeStyle="#d8caff";ctx.shadowBlur=12;ctx.shadowColor="#b9a6ff";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(0,0,p.radius+13,p.radius+7,game.elapsed*.35,game.elapsed,game.elapsed+Math.PI*1.55);ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,0,p.radius+22,p.radius+15,-game.elapsed*.25,-game.elapsed*.8,-game.elapsed*.8+Math.PI*1.2);ctx.stroke();
    ctx.textAlign="center";ctx.font="bold 10px monospace";ctx.fillStyle="#fff4df";ctx.fillText(`THE END  ${t.rTimer.toFixed(1)}s`,0,-p.radius-34);ctx.restore();}
  // Void journey stacks: a compact segmented halo and readable percentage.
  for(const target of travellerTargets()){
    const v=travellerV(target);if(v<=0)continue;const r=(target.radius||12)+6;
    ctx.save();ctx.translate(target.x,target.y);ctx.globalAlpha=.45+.35*v;ctx.strokeStyle="#cbbcff";ctx.lineWidth=1.8;
    ctx.beginPath();ctx.arc(0,0,r,-Math.PI/2,-Math.PI/2+Math.PI*2*v);ctx.stroke();
    ctx.strokeStyle="#fff4df";ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,r+3,-Math.PI*.8,-Math.PI*.2);ctx.stroke();
    ctx.textAlign="center";ctx.font="bold 10px monospace";ctx.fillStyle="#e9e0ff";ctx.fillText(`VOID ${Math.round(v*100)}%`,0,-r-9);ctx.restore();
  }
}
