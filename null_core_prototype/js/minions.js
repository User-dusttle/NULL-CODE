// NULL//CORE enemy roster v1. Uses the existing minion contract so all current
// targeting, damage, death effects and character skills continue to work.
const ROGUE_ENEMY_DEFS = {
  drifter:      { name: "游荡者", hp: 72, radius: 10, speed: 0,  color: "#ff9d57", fireRate: 2.0, damage: 7 },
  pulseCrawler: { name: "脉冲虫", hp: 58, radius: 9,  speed: 72, color: "#ff547c", fireRate: 2.8, damage: 9 },
  spikeTurret:  { name: "钉刺炮台", hp: 88, radius: 12, speed: 0, color: "#ffd166", fireRate: 1.55, damage: 8 },
  aegisWeaver:  { name: "织盾机", hp: 64, radius: 10, speed: 22, color: "#68e1fd", fireRate: 2.8, damage: 5 },
  phaseSkipper: { name: "影跃者", hp: 48, radius: 9,  speed: 42, color: "#bda4ff", fireRate: 2.25, damage: 7 },
  splinterMine: { name: "裂变雷", hp: 54, radius: 10, speed: 34, color: "#a6ff8f", fireRate: 99, damage: 0 },
  prismWarden: { name: "棱镜守卫", hp: 920, radius: 23, speed: 25, color: "#6ce7ff", fireRate: 1.8, damage: 9 },
  riftHerald: { name: "裂隙牧者", hp: 820, radius: 21, speed: 18, color: "#bd8cff", fireRate: 1.7, damage: 8 },
  shadeHound: { name: "逐影猎犬", hp: 980, radius: 20, speed: 70, color: "#ff668a", fireRate: 2.4, damage: 12 },
  nullCartographer: { name: "零域测绘者", hp: 1050, radius: 22, speed: 15, color: "#77a7ff", fireRate: 2.1, damage: 8 },
  meltdownSeed: { name: "熔蚀核心", hp: 1250, radius: 24, speed: 0, color: "#ff9b55", fireRate: 1.6, damage: 10 },
};
const ROGUE_ELITES_BY_LAYER = { 1: ["prismWarden", "riftHerald"], 2: ["shadeHound", "nullCartographer"], 3: ["meltdownSeed"] };
const ROGUE_ELITE_BRIEFINGS = {
  prismWarden: "棱镜护盾：三枚棱镜环绕核心。击破棱镜可逐步削弱护盾；护盾归零后核心过载，抓住窗口输出。",
  riftHerald: "裂隙召唤：裂隙牧者会持续召唤低阶单位，并在召唤物存活时获得护盾。优先清除召唤物再集中攻击本体。",
  shadeHound: "锁定冲刺：猎犬会标记玩家位置并高速突进。观察锁定预警，诱导它撞向场地边缘，趁失衡窗口攻击。",
  nullCartographer: "区域测绘：测绘者会在玩家附近绘制延迟爆发区。持续移动，避开蓝色标记区域并利用其攻击间隔反击。",
  meltdownSeed: "热量失控：核心热量持续上升，弹幕会随热量加速；达到过热阈值时释放大范围爆发。观察热量读数并保持距离。"
};
function isRogueWaveEncounter() { return game.mode === "rogue" && (game.rogueNodeType === "battle" || game.rogueNodeType === "elite"); }
function beginRogueEncounter() {
  if (!isRogueWaveEncounter() || game.rogueEncounterStarted) return;
  game.rogueEncounterStarted = true;
  game.rogueEncounterResolved = false;
  game.rogueWave = 0;
  game.rogueWaveTimer = 1.0;
  game.rogueKills = 0;
  game.rogueKillGoal = 18;
  game.rogueResolveTimer = 0;
  game.rogueSpawnTimer = 1.0;
  game.minions = [];
  game.enemyBullets = [];
  game.hazards = [];
  if (game.rogueNodeType === "elite") {
    const pool = ROGUE_ELITES_BY_LAYER[Math.min(3, Math.max(1, game.rogueLayer || 1))] || ROGUE_ELITES_BY_LAYER[1];
    // Use the elite selected on the route briefing screen; only roll here as a fallback.
    const eliteType = pool.includes(game.rogueEliteId) ? game.rogueEliteId : pool[Math.floor(Math.random() * pool.length)];
    const elite = spawnMinion(eliteType, { elite: true });
    if (!elite) {
      game.rogueEncounterResolved = true;
      addLog("错误：精英生成失败，请重启本次探索。");
      showToast("精英生成失败");
      return;
    }
    game.rogueEliteId = elite.type;
    const title = document.querySelector(".right-panel h2");
    if (title) title.innerHTML = `${elite.name} <span>ELITE · ${elite.type.toUpperCase()}</span>`;
    if (ui.enemyLabel) ui.enemyLabel.textContent = elite.name;
    const desc = document.querySelector(".right-panel .muted.small");
    if (desc) desc.textContent = ROGUE_ELITE_BRIEFINGS[elite.type] || elite.description || "精英异常体：观察攻击预警，寻找机制反制窗口。";
    if (ui.bossHealthBar) ui.bossHealthBar.style.width = "100%";
    if (ui.bossHealthText) ui.bossHealthText.textContent = `${elite.maxHp} / ${elite.maxHp}`;
    if (ui.phaseLabel) ui.phaseLabel.textContent = "精英机制 · 观察预警";
    addLog(`精英信号已确认：${elite.name}。击败目标以结束本房间。`);
  } else {
    game.rogueSpawnTimer = 1.2;
    addLog(`敌袭开始：持续增援已启动。目标：击败 ${game.rogueKillGoal} 个异常体。`);
  }
}
function spawnRogueWave() {
  // Compatibility shim for older callers: combat is now continuous, not discrete waves.
  const layer = Math.max(1, game.rogueLayer || 1);
  const pool = rogueEnemyPool();
  const roomCap = Math.min(8, 4 + layer);
  for (let i = 0; i < Math.min(2, roomCap - game.minions.filter(m => !m.dead && !m.isElite).length); i++) {
    spawnMinion(pool[Math.floor(Math.random() * pool.length)]);
  }
}
function rogueEnemyPool() {
  if (game.mode !== "rogue") return ["drifter"];
  const layer = Math.max(1, game.rogueLayer || 1);
  const pool = ["drifter", "pulseCrawler", "spikeTurret"];
  if (layer >= 2) pool.push("aegisWeaver", "phaseSkipper");
  if (layer >= 3) pool.push("splinterMine");
  return pool;
}
function spawnMinion(type, options = {}) {
  const elite = !!options.elite;
  if (!game.boss || (!isRogueWaveEncounter() && game.boss.transition !== "none") || game.minions.filter(m => !m.dead && m.hp > 0).length >= (elite ? 1 : (isRogueWaveEncounter() ? 8 : 6))) return;
  const pool = rogueEnemyPool(), chosenType = type || pool[Math.floor(Math.random() * pool.length)];
  const def = ROGUE_ENEMY_DEFS[chosenType] || ROGUE_ENEMY_DEFS.drifter, b = game.boss;
  const side = Math.random() < .5 ? -1 : 1;
  const layerScale = 1 + Math.max(0, (game.rogueLayer || 1) - 1) * .14;
  // 精英使用独立倍率与完整元数据，不再被当作普通小怪初始化。
  const scale = elite ? (4.2 + Math.max(0, (game.rogueLayer || 1) - 1) * 1.0) : (game.mode === "rogue" ? layerScale : 1);
  const hp = Math.round(def.hp * scale);
  const m = { type: chosenType, name: def.name, description: ROGUE_ELITE_BRIEFINGS[chosenType] || "异常体：保持移动，观察其攻击节奏。", isElite: elite,
    color: def.color, x: clamp(b.x + side * rand(elite ? 105 : 65, elite ? 155 : 115), 30, game.width - 30),
    y: clamp(b.y + rand(35, elite ? 115 : 85), 35, game.height * .55), homeX: 0, homeY: 0,
    radius: elite ? def.radius * 1.9 : def.radius, hp, maxHp: hp,
    shootTimer: rand(.7, 1.4), age: 0, dead: false, dashTimer: rand(2.2, 3.5), pulseTimer: 0, shield: 0,
    spawnTimer: elite ? 1.0 : .72, spawnDuration: elite ? 1.0 : .72, elitePatternTimer: 1.15, eliteAirstrikeTimer: 8.0, eliteAttackPhase: 0 };
  if (elite) { m.shootTimer = .55; m.shield = chosenType === "prismWarden" || chosenType === "riftHerald" ? 1 : 0; m.name = def.name; m.description = ROGUE_ELITE_BRIEFINGS[chosenType] || "精英异常体：躲避弹幕与空袭，在攻击间隙反击。"; }
  m.homeX = m.x; m.homeY = m.y; game.minions.push(m); window.recordEnemyEncounter?.(chosenType); return m;
}
function updateMinions(dt) {
  const b = game.boss, p = game.player;
  if (!b || !p) return;
  if (isRogueWaveEncounter()) {
    beginRogueEncounter();
    if (!game.rogueEncounterResolved) {
      const living = game.minions.filter(m => !m.dead && m.hp > 0);
      if (game.rogueNodeType === "elite") {
        if (living.length === 0) {
          game.rogueResolveTimer = (game.rogueResolveTimer ?? 0.95) - dt;
          if (game.rogueResolveTimer <= 0) {
            game.rogueEncounterResolved = true;
            game.enemyBullets = []; game.hazards = []; game.rogueHpCarry = p.hp;
            showToast("精英已讨伐"); addLog("精英残响消散，正在结算奖励。"); endRun(true); return;
          }
        } else game.rogueResolveTimer = 0.95;
      } else {
        game.rogueSpawnTimer = (game.rogueSpawnTimer ?? 1) - dt;
        const regularAlive = living.filter(m => !m.isElite).length;
        if (game.rogueKills >= game.rogueKillGoal) {
          // 达成击杀目标后停止增援，清掉残敌才结算。
          if (regularAlive === 0) {
            game.rogueResolveTimer = (game.rogueResolveTimer ?? 0.95) - dt;
            if (game.rogueResolveTimer <= 0) {
              game.rogueEncounterResolved = true;
              game.enemyBullets = []; game.hazards = []; game.rogueHpCarry = p.hp;
              showToast("敌袭已清除"); addLog("最后一个异常体的残响消散，正在结算奖励。"); endRun(true); return;
            }
          } else game.rogueResolveTimer = 0.95;
        } else if (game.rogueSpawnTimer <= 0 && living.length < 7) {
          const pool = rogueEnemyPool();
          const count = Math.min(2, 7 - living.length);
          for (let i = 0; i < count; i++) spawnMinion(pool[Math.floor(Math.random() * pool.length)]);
          game.rogueSpawnTimer = rand(1.45, 2.15);
          game.rogueWave = Math.floor(game.rogueKills / 6) + 1;
          addLog("增援抵达。");
        }
      }
    }
  }
  if (!isRogueWaveEncounter() && b.type !== "zero" && b.phase === 1 && b.transition === "none") {
    game.nextMinion -= dt;
    if (game.nextMinion <= 0) { spawnMinion(); game.nextMinion = game.mode === "rogue" ? rand(5.5, 7.5) : rand(6, 8); }
  }
  for (const m of game.minions) {
    if (m.dead) continue;
    m.age += dt;
    if (m.spawnTimer > 0) { m.spawnTimer = Math.max(0, m.spawnTimer - dt); continue; }
    const def = ROGUE_ENEMY_DEFS[m.type] || ROGUE_ENEMY_DEFS.drifter;
    if (b.transition !== "none") continue;
    // 精英共通攻击：低频、少量弹幕，保留躲避空间，不用弹幕堆难度。
    if (m.isElite) {
      m.elitePatternTimer = (m.elitePatternTimer ?? 2.1) - dt;
      m.eliteAirstrikeTimer = (m.eliteAirstrikeTimer ?? 8.0) - dt;
      if (m.elitePatternTimer <= 0) {
        const aim = angleTo(m, p);
        const phase = m.eliteAttackPhase || 0;
        const count = 3;
        const spread = .42;
        for (let k = 0; k < count; k++) {
          const a = aim - spread / 2 + spread * k / Math.max(1, count - 1);
          const speed = 155 + (game.rogueLayer || 1) * 6;
          game.enemyBullets.push({ x:m.x, y:m.y, vx:Math.cos(a)*speed, vy:Math.sin(a)*speed, radius:4, life:4.2, damage:Math.max(6, def.damage + 1), color:m.color, sourceMinion:m, eliteShot:true });
        }
        // 不再追加整圈 12 发弹幕，避免场地瞬间被封死。
        m.eliteAttackPhase = phase + 1;
        m.elitePatternTimer = Math.max(1.65, 2.15 - (game.rogueLayer || 1) * .12);
      }
      if (m.eliteAirstrikeTimer <= 0) {
        // 精英每轮只锁定一个落点；给玩家留出明确的反应窗口。
        const x = clamp(p.x + rand(-34, 34), 48, game.width - 48);
        const y = clamp(p.y + rand(-34, 34), game.height * .22, game.height - 48);
        game.hazards.push({type:"airstrike",x,y,radius:42,life:1.55,maxLife:1.55,fired:false,eliteAirstrike:true});
        addLog(`${m.name} 锁定单点空袭！离开地面标记。`);
        m.eliteAirstrikeTimer = Math.max(10.0, 12.0 - (game.rogueLayer || 1) * .4);
      }
    }
    if (m.type === "zeroDrone") {
      const b = game.boss;
      const orbit = m.age * 1.25 + (m.homeX < (b?.x || game.width/2) ? Math.PI : 0);
      const tx = clamp((b?.x || game.width/2) + Math.cos(orbit) * 105, 28, game.width-28);
      const ty = clamp((b?.y || 110) + 70 + Math.sin(orbit) * 48, 28, game.height*.62);
      m.x += (tx-m.x)*Math.min(1,dt*2.6); m.y += (ty-m.y)*Math.min(1,dt*2.6);
      m.shootTimer -= dt;
      if (m.shootTimer <= 0) {
        const a=angleTo(m,p), speed=205;
        game.enemyBullets.push({x:m.x,y:m.y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,radius:4.5,life:4.2,damage:7,color:"#ff8067",sourceMinion:m});
        m.shootTimer=1.65;
      }
      continue;
    } else if (m.type === "drifter") {
      m.x = clamp(m.homeX + Math.sin(m.age * 1.5) * 18, m.radius, game.width - m.radius);
      m.y = clamp(m.homeY + Math.sin(m.age * .9) * 7, m.radius, game.height * .5);
    } else if (m.type === "pulseCrawler" || m.type === "splinterMine" || m.type === "splinterChild") {
      const a = angleTo(m, p);
      m.x = clamp(m.x + Math.cos(a) * def.speed * dt, m.radius, game.width - m.radius);
      m.y = clamp(m.y + Math.sin(a) * def.speed * dt, m.radius, game.height - m.radius);
      if (m.type === "pulseCrawler") {
        m.pulseTimer = Math.max(0, m.pulseTimer - dt);
        if (distance(m, p) < 52 && m.pulseTimer <= 0) {
          game.hazards.push({ type: "enemy-pulse", x: m.x, y: m.y, radius: 52, life: .42, maxLife: .42, damage: def.damage, color: m.color });
          m.pulseTimer = 2.8;
        }
      }
    } else if (m.type === "aegisWeaver") {
      m.x = clamp(m.homeX + Math.sin(m.age * .75) * 28, m.radius, game.width - m.radius);
      m.y = clamp(m.homeY + Math.cos(m.age * .65) * 12, m.radius, game.height * .48);
      for (const ally of game.minions) if (ally !== m && !ally.dead && distance(m, ally) < 115) ally.shield = 1;
    } else if (m.type === "phaseSkipper") {
      m.dashTimer -= dt;
      if (m.dashTimer <= 0 && !m.warpWarning) {
        m.warpTargetX = clamp(p.x + rand(-90, 90), m.radius, game.width - m.radius);
        m.warpTargetY = clamp(p.y + rand(-90, 90), m.radius, game.height - m.radius);
        m.warpWarning = .38;
        game.hazards.push({ type: "enemy-warning", x: m.warpTargetX, y: m.warpTargetY, radius: 25, life: .38, maxLife: .38, color: m.color });
      }
      if (m.warpWarning) {
        m.warpWarning -= dt;
        if (m.warpWarning <= 0) { m.x = m.warpTargetX; m.y = m.warpTargetY; m.warpWarning = 0; m.dashTimer = rand(2.2, 3.3); }
      }
    }
    // 精英机制：所有危险动作都有可见预警，并提供明确反制窗口。
    if (m.type === "prismWarden") {
      m.prismParts = m.prismParts ?? 3;
      m.shield = m.prismParts > 0 ? 1 : 0;
      m.shootTimer -= dt;
      if (m.shootTimer <= 0) {
        const a = angleTo(m, p);
        for (let k = -2; k <= 2; k++) { const aa = a + k * 0.19; game.enemyBullets.push({x:m.x,y:m.y,vx:Math.cos(aa)*155,vy:Math.sin(aa)*155,radius:4,life:4,damage:def.damage,color:m.color,sourceMinion:m}); }
        m.shootTimer = 1.15;
      }
      continue;
    } else if (m.type === "riftHerald") {
      m.summonTimer = (m.summonTimer ?? 3) - dt;
      if (m.summonTimer <= 0 && game.minions.filter(q=>!q.dead).length < 6) { spawnMinion("drifter"); m.summonTimer = 3.0; emitParticles(m.x,m.y,m.color,8,80); }
      m.shield = game.minions.some(q=>q!==m&&!q.dead&&q.type!=="riftHerald") ? 1 : 0;
    } else if (m.type === "shadeHound") {
      m.houndState = m.houndState || "hunt"; m.houndTimer = (m.houndTimer ?? 2) - dt;
      if (m.houndState === "hunt") { const a=angleTo(m,p); m.x=clamp(m.x+Math.cos(a)*def.speed*dt,m.radius,game.width-m.radius); m.y=clamp(m.y+Math.sin(a)*def.speed*dt,m.radius,game.height-m.radius); if(m.houndTimer<=0){m.houndState="windup";m.houndTimer=.7;game.hazards.push({type:"enemy-warning",x:p.x,y:p.y,radius:38,life:.7,maxLife:.7,color:m.color});} }
      else if(m.houndState === "windup" && m.houndTimer<=0){m.houndState="dash";m.houndTimer=.32;m.houndX=p.x;m.houndY=p.y;}
      else if(m.houndState === "dash"){const dx=m.houndX-m.x,dy=m.houndY-m.y,d=Math.hypot(dx,dy)||1;m.x+=dx/d*430*dt;m.y+=dy/d*430*dt;if(m.houndTimer<=0||m.x<m.radius||m.x>game.width-m.radius||m.y<m.radius||m.y>game.height-m.radius){m.houndState="stun";m.houndTimer=1.1;}}
      else if(m.houndState === "stun" && m.houndTimer<=0){m.houndState="hunt";m.houndTimer=2.4;}
      if(m.houndState==="stun") m.shield=0; continue;
    } else if (m.type === "nullCartographer") {
      m.mapTimer = (m.mapTimer ?? 2.4)-dt;
      if(m.mapTimer<=0){const x=clamp(p.x+rand(-70,70),40,game.width-40),y=clamp(p.y+rand(-70,70),40,game.height-40);game.hazards.push({type:"enemy-pulse",x,y,radius:48,life:.85,maxLife:.85,damage:def.damage,color:m.color});m.mapTimer=2.8;}
    } else if (m.type === "meltdownSeed") {
      m.heat = Math.min(100,(m.heat||0)+dt*3.5); m.shootTimer -= dt;
      if(m.shootTimer<=0){const a=angleTo(m,p),speed=130+m.heat*.8;for(let k=0;k<10;k++){const aa=a+k*Math.PI/5;game.enemyBullets.push({x:m.x,y:m.y,vx:Math.cos(aa)*speed,vy:Math.sin(aa)*speed,radius:4,life:4,damage:def.damage,color:m.color,sourceMinion:m});}m.shootTimer=Math.max(.48,1.2-m.heat*.008);}
      if(m.heat>=100){game.hazards.push({type:"enemy-pulse",x:m.x,y:m.y,radius:95,life:.3,maxLife:.3,damage:18,color:m.color});m.heat=35;}
    }
    m.shootTimer -= dt;
    if (m.shootTimer <= 0 && m.type !== "splinterMine" && m.type !== "splinterChild" && m.type !== "pulseCrawler") {
      const a = angleTo(m, p), speed = m.type === "spikeTurret" ? 235 : m.type === "phaseSkipper" ? 175 : 125;
      game.enemyBullets.push({ x: m.x, y: m.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        radius: m.type === "spikeTurret" ? 4.5 : 4, life: 5, damage: def.damage, color: m.color || COLORS.orange, sourceMinion: m });
      m.shootTimer = rand(def.fireRate * .8, def.fireRate * 1.2);
    }
  }
  game.minions = game.minions.filter(m => !m.dead && m.hp > 0);
}
