// UR「裁决者」：群攻、罪孽叠层与独立 R 充能。
function judgeDamageMult() { return (game.mode === "rogue" ? game.rogueBuild.damageMult : 1) * (game.coreBonuses?.damageMult || 1) * (game.debugDamageMult || 1); }
function shootJudge() {
  const p=game.player; if (!p || game.shootCooldown>0) return;
  const a=p.angle, empowered=(game.judgeQTimer||0)>0 || (game.judgeRTimer||0)>0;
  game.bullets.push({x:p.x+Math.cos(a)*16,y:p.y+Math.sin(a)*16,vx:Math.cos(a)*570,vy:Math.sin(a)*570,radius:3,damage:18*judgeDamageMult()*(empowered?1.2:1),life:1.8,color:(game.judgeRTimer||0)>0?"#ff6478":empowered?"#ffe6a1":"#e8d5a2",judgeShot:true,hitTargets:[]});
  game.shootCooldown=(empowered?0.125:0.15)*(game.mode==="rogue"?(game.rogueBuild.fireRateMult||1):1);
}
function useJudgeE() {
  if(!game.running||game.paused||game.skillCooldown>0)return;
  const targets=[...(game.minions||[]).filter(m=>!m.dead&&m.hp>0),...(game.boss&&game.boss.transition==="none"&&game.boss.type!=="rogue-wave-anchor"?[game.boss]:[])];
  if(!targets.length){showToast("执行失败：没有可裁决目标");return;}
  for(let i=0;i<3;i++){
    const target=targets[Math.floor(Math.random()*targets.length)];
    game.hazards.push({type:"judge-cross",x:target.x,y:target.y,radius:68,life:1,maxLife:1,fired:false,damage:70*judgeDamageMult()});
  }
  game.skillCooldown=9*(game.coreBonuses?.skillCooldownMult||1)*(game.mode==="rogue"?(game.rogueBuild.cooldownMult||1):1);
  showToast("执行：三道审判十字已锁定");addLog("裁决者发动执行，1 秒后对随机目标位置进行十字空袭。");updateHUD();
}
function useJudgeQ() {
  if(!game.running||game.paused||game.judgeRTimer>0||game.ultEnergy<100||game.ultCooldown>0){if(game.ultCooldown>0)showToast(`审判冷却 ${game.ultCooldown.toFixed(1)}s`);else if(game.running&&game.ultEnergy<100)showToast("审判尚未充能");return;}
  if((game.judgeQTimer||0)>0){showToast("审判仍在持续");return;}
  startUltimateCooldown("judge");game.ultEnergy=0;game.judgeQTimer=7;
  game.hazards.push({type:"judge-scales",life:1.4,maxLife:1.4});
  showToast("审判：7 秒强化启动");addLog("裁决者进入审判状态：攻速 +20%，伤害 +20%，命中引发 75% 伤害的范围爆炸。");updateHUD();
}
function useJudgeR() {
  if(!game.running||game.paused||game.ended)return;
  if((game.judgeRTimer||0)>0){showToast(`裁决持续中：${game.judgeRTimer.toFixed(1)} 秒`);return;}
  if((game.judgeRCharge||0)<100){showToast(`裁决独立充能：${Math.floor(game.judgeRCharge||0)}%`);return;}
  game.judgeRCharge=0;game.judgeRTimer=10;game.judgeExecutePending=0;
  game.hazards.push({type:"judge-scales",life:1.6,maxLife:1.6});
  showToast("裁决：天平显现，最终审判开始");addLog("裁决者发动 R，进入 10 秒审判状态。每次有效命中为目标增加 1 层罪孽。");updateHUD();
}
function updateJudge(dt) {
  game.judgeQTimer=Math.max(0,(game.judgeQTimer||0)-dt);
  if((game.judgeRTimer||0)>0){
    game.judgeRTimer=Math.max(0,game.judgeRTimer-dt);
    if(game.judgeRTimer===0&&!game.judgeExecutePending){
      game.judgeExecutePending=0.85;
      game.hazards.push({type:"judge-scales",life:1.05,maxLife:1.05,execute:true});
      showToast("裁决终结：天平锁定罪孽目标");
    }
  }
  if((game.judgeExecutePending||0)>0){
    game.judgeExecutePending-=dt;
    if(game.judgeExecutePending<=0){
      let executed=0;
      // 结算开始时放出全屏审判脉冲，确保 R 结束一定有明显爆炸，而非只依赖粒子。
      game.hazards.push({type:"judge-r-detonation",x:game.width*.5,y:game.height*.5,radius:Math.max(game.width,game.height)*.72,life:1.05,maxLife:1.05});
      for(const m of game.minions||[]){
        if(!m.dead&&!m.isElite&&(m.spawnTimer||0)<=0&&(m.judgeSin||0)>=10){
          game.hazards.push({type:"judge-execution-flash",x:m.x,y:m.y,radius:115,life:.9,maxLife:.9});
          game.hazards.push({type:"judge-execution-burst",x:m.x,y:m.y,radius:155,life:.95,maxLife:.95});
          emitParticles(m.x,m.y,"#fff1b5",58,310);emitParticles(m.x,m.y,"#ff536d",36,240);
          damageMinion(m,m.hp+1e9);executed++;
        }
      }
      const b=game.boss;
      if(b&&b.transition==="none"&&b.type!=="rogue-wave-anchor"&&(b.judgeSin||0)>0){
        const damage=Math.min(b.maxHp*(b.judgeSin/100),1000);
        game.hazards.push({type:"judge-execution-flash",x:b.x,y:b.y,radius:160,life:1,maxLife:1});
        game.hazards.push({type:"judge-execution-burst",x:b.x,y:b.y,radius:210,life:1.05,maxLife:1.05});
        emitParticles(b.x,b.y,"#fff1b5",80,360);emitParticles(b.x,b.y,"#ff536d",48,270);
        damageBoss(damage,b.x,b.y,{noCharge:true});
        showToast(`最终裁决：${Math.floor(damage)} 点伤害`);
      } else showToast(`最终裁决：处决 ${executed} 名罪孽满层小怪`);
      addLog(`最终裁决结算：处决 ${executed} 名罪孽满层小怪。`);
      game.judgeExecutePending=0;updateHUD();
    }
  }
}

function onJudgeHit(target, damage) { if(game.character!=="judge"||!target)return; if(game.judgeRTimer>0)target.judgeSin=Math.min(10,(target.judgeSin||0)+1); }
