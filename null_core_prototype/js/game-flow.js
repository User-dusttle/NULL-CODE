// ============================================================
// 游戏初始化与结束
// ============================================================

function newRun() {
  game.running = true;
  game.paused = false;
  game.ended = false;

  game.elapsed = 0;

  game.bullets = [];
  game.enemyBullets = [];
  game.particles = [];
  game.deathEffects = [];
  game.playerDying = false;
  game.playerDeathTimer = 0;
  game.bossDying = false;
  game.bossDeathTimer = 0;
  game.hazards = [];
  game.minions = [];
  game.fuseDrones = [];
  game.fuseSummon = null;
  game.fuseSummons = [];

  game.nextEnemyShot = 1.2;
  game.nextMinion = 7;

  game.skillCooldown = 0;
  game.ultEnergy = 0;
  game.prismUltimateTimer = 0;
  game.phantomStealthTimer = 0;
  game.phantomDomainTimer = 0;
  game.phantomDomainX = null;
  game.phantomDomainY = null;
  game.phantomHealAccumulator = 0;
  game.dashCooldown = 0;
  game.dashTime = 0;
  game.invulnerable = 0;
  game.shootCooldown = 0;
  game.toastTimer = 0;

  const character = game.character || "prism";
  const characterStats = character === "bulwark"
    ? { maxHp: 145, speed: 225, radius: 13 }
    : character === "singularity"
      ? { maxHp: 90, speed: 270, radius: 10 }
      : character === "phantom"
        ? { maxHp: 50, speed: 270, radius: 10 }
        : character === "paradox"
          ? { maxHp: 123, speed: 255, radius: 11 }
        : { maxHp: 100, speed: 255, radius: 11 };
  let coreLevel = 0;
  try {
    const gachaSave = JSON.parse(localStorage.getItem("nullcore.gacha.v1") || "{}");
    coreLevel = Math.max(0, Math.min(5, Number(gachaSave.coreLevels?.[character]) || 0));
  } catch {}
  game.coreBonuses = {
    level: coreLevel,
    maxHpMult: 1 + (coreLevel >= 1 ? 0.08 : 0) + (coreLevel >= 5 ? 0.08 : 0),
    damageMult: 1 + (coreLevel >= 2 ? 0.08 : 0) + (coreLevel >= 5 ? 0.08 : 0),
    skillCooldownMult: coreLevel >= 3 ? 0.92 : 1,
    ultDamageMult: coreLevel >= 4 ? 1.10 : 1,
  };
  const calculatedMaxHp = Math.round(characterStats.maxHp * game.coreBonuses.maxHpMult) + (game.mode === "rogue" ? game.rogueBuild.maxHpBonus : 0);
  const maxHp = DEBUG_MODE && Number.isFinite(game.debugMaxHp) ? game.debugMaxHp : calculatedMaxHp;
  game.characterEnergy = 0;
  game.paradox = 0; game.paradoxE = 0; game.paradoxQ = 0; game.paradoxR = 0; game.paradoxAnchor = null; game.paradoxRiftTimer = 0; game.paradoxRiftLife = 0; game.paradoxRiftShots = []; game.paradoxQActive = 0; game.paradoxAbsorbed = 0; game.paradoxShards = [];
  game.bulwarkAbsorbed = 0;
  game.bulwarkUltimateTimer = 0;
  game.bulwarkStoredBullets = [];
  game.singularityCharge = 10;
  game.skillFieldTimer = 0;
  game.skillFieldDamageTimer = 0;
  game.skillFieldX = null;
  game.skillFieldY = null;
  game.player = {
    x: game.width * 0.5,
    y: game.height * 0.78,
    radius: characterStats.radius,
    hp: DEBUG_MODE && Number.isFinite(game.debugCurrentHp) ? Math.max(0, Math.min(maxHp, game.debugCurrentHp)) : (game.mode === "rogue" ? Math.min(maxHp, game.rogueHpCarry) : maxHp),
    maxHp,
    speed: characterStats.speed + (game.mode === "rogue" ? game.rogueBuild.speedBonus : 0),
    angle: -Math.PI / 2,
    character,
  };

  game.boss = {
    x: game.width * 0.5,
    y: Math.max(90, game.height * 0.19),

    radius: game.mode === "rogue" && ROGUE_BOSSES[game.rogueBossIndex]?.id === "fuse" ? 38 : 31,
    hp: game.mode === "rogue" ? (ROGUE_BOSSES[game.rogueBossIndex] || ROGUE_BOSSES[0]).hp : 5000,
    maxHp: game.mode === "rogue" ? (ROGUE_BOSSES[game.rogueBossIndex] || ROGUE_BOSSES[0]).hp : 5000,
    type: game.mode === "rogue" ? (ROGUE_BOSSES[game.rogueBossIndex] || ROGUE_BOSSES[0]).id : "observer",

    phase: 1,
    spin: 0,
    moveTime: 0,
    hitFlash: 0,

    // none -> charge -> rings -> none
    transition: "none",
    transitionTimer: 0,
    ultimateTriggered: false,
    ultimateRingTimer: 0,
    ultimateSpiralAngle: 0,

    airstrikeCooldown: 4.5,

    // FUSE-CORE 四阶段状态：阶段一核心窗口，阶段四无人机攻击轮转。
    fuseCycleTimer: 0,
    fuseWeakpointOpen: true,
    fuseCoreIndex: 0,
    fuseShutdown: false,
    fuseDronesSpawned: false,
    fuseDroneAttackTimer: 1.4,
    fuseAttackMode: 0,
    fuseAttackModeTimer: 4.5,
    fuseLaserCooldown: 2.2,
    fusePhaseOneLaserCooldown: 3.5,

    // 裂隙猎手专属状态机：hunt -> charge -> dash -> stun
    stalkerState: "hunt",
    stalkerTimer: 3.2,
    stalkerStateTimer: 0,
    stalkerStartX: 0,
    stalkerStartY: 0,
    stalkerTargetX: 0,
    stalkerTargetY: 0,
    stalkerRiftTimer: 0,
    stalkerRiftCount: 0,
    stalkerWarpTimer: 0,
    stalkerOrbitAngle: 0,
    stalkerSideShotTimer: 0,
    stalkerHitPlayer: false,
    stalkerWarpState: "wait",
    stalkerWarpSource: null,
    stalkerWarpDestination: null,
    stalkerWarpIndex: 0,
  };

  if (game.boss.type === "fuse") {
    game.boss.fuseCycleTimer = 0;
    game.boss.fuseWeakpointOpen = true;
    game.boss.fuseCoreIndex = 0;
    game.boss.fuseShutdown = false;
    game.boss.fuseDronesSpawned = false;
    game.boss.fuseAttackMode = 0;
    game.boss.fuseAttackModeTimer = 4.5;
    game.boss.fuseLaserCooldown = 2.2;
    game.boss.fusePhaseOneLaserCooldown = 3.5;
    game.fuseDrones = [];
    addLog("FUSE-CORE 已上线。协议：70% 双重复现 / 30% 无人机防御网。");
    addLog("阶段一核心窗口：每 10 秒开放 5 秒。");
  }

  if (game.boss.type === "stalker") {
    // 阶段一只进行环轨猎杀，不进入冲刺状态机。
    game.boss.stalkerState = "orbit";
    game.boss.stalkerStateTimer = 0;
    game.boss.stalkerOrbitAngle = -Math.PI / 2;
    game.boss.stalkerDashCooldown = 1.8;
    game.boss.stalkerSideShotTimer = 0;
  }

  ui.log.replaceChildren();

  addLog("同步链路已建立。");
  addLog("异常体已锁定。保持移动。");

  refreshBattleCharacterInfo();
  ui.phaseLabel.textContent = "阶段 01 · 观测";
  const bossInfo = game.mode === "rogue" ? ROGUE_BOSSES[game.rogueBossIndex] : ROGUE_BOSSES[0];
  ui.enemyLabel.textContent = bossInfo?.name || "环形观测者";
  const bossTitle = document.querySelector(".right-panel h2");
  if (bossTitle) bossTitle.innerHTML = `${bossInfo?.name || "环形观测者"} <span>${bossInfo?.codename || "OBSERVER-01"}</span>`;
  const bossDesc = document.querySelector(".right-panel .muted.small");
  if (bossDesc) bossDesc.textContent = bossInfo?.subtitle || "通过旋转环形弹幕封锁区域。观察弹道间隙，持续移动。";
  const encounter = document.querySelector(".encounter-pill");
  if (encounter) encounter.innerHTML = game.mode === "rogue" ? `<span></span>零域探索 · BOSS ${game.rogueBossIndex + 1}/3` : `<span></span>遭遇战 · 测试场`;

  setOverlay("");
  updateHUD();

  canvas.focus?.();
}

function endRun(victory) {
  if (game.ended) return;

  game.ended = true;
  game.running = false;
  game.paused = false;

  if (game.mode === "rogue" && victory) {
    game.rogueHpCarry = game.player ? game.player.hp : game.rogueHpCarry;
    const reward = typeof window.awardRoguelikeBossRecruitment === "function"
      ? window.awardRoguelikeBossRecruitment(game.rogueBossIndex)
      : 0;
    game.rogueRunSignalUnits = (game.rogueRunSignalUnits || 0) + reward;
    if (game.rogueBossIndex >= game.rogueBossCount - 1) {
      setOverlay("result");
      ui.resultKicker.textContent = "RIFT CLEARED";
      ui.resultTitle.textContent = "零域已贯通";
      ui.resultCopy.textContent = `已击败全部 ${game.rogueBossCount} 个异常体。本次探索获得招募信标 +${game.rogueRunSignalUnits}（完整通关奖励共 80）。探索记录已完成，本次构筑将保留至本局结束。`;
      ui.restartButton.textContent = "再次探索 ↻";
      addLog("零域探索完成。获得招募信标 +30，本次探索累计 +80。所有目标信号均已消失。");
      return;
    }
    showRogueChoices("upgrade");
    addLog(`${ROGUE_BOSSES[game.rogueBossIndex].name} 已被击败，获得招募信标 +${reward}。等待构筑强化。`);
    return;
  }

  setOverlay("result");
  ui.resultKicker.textContent = victory ? "TARGET NEUTRALIZED" : "SYNC LOST";
  ui.resultTitle.textContent = victory ? "目标已清除" : "同步中断";
  ui.resultCopy.textContent = victory
    ? "环形观测者已失去活动信号。第一阶段战斗测试完成。"
    : "核心完整度归零。调整走位，再次尝试突破零域。";
  ui.restartButton.textContent = game.mode === "rogue" ? "重新探索 ↻" : "再次进入 ↻";
  addLog(victory ? "目标信号消失。战斗胜利。" : "同步稳定度归零。战斗失败。");
}

function refreshBattleCharacterInfo() {
  const characterInfo = {
    prism: { name: "棱镜", en: "PRISM", color: COLORS.cyan, role: "以折射重写弹道，以分形撕开零域。", skill: "折射脉冲", skillDesc: "清除附近弹幕并造成伤害", ult: "交叉棱镜", ultDesc: "消耗核心能量释放交叉棱镜" },
    bulwark: { name: "壁垒", en: "BULWARK", color: COLORS.violet, role: "吸收可拦截弹幕，将防御转化为反击。", skill: "反弹脉冲", skillDesc: "反弹周围敌方弹幕，反弹弹幕可伤害敌人", ult: "绝对壁垒", ultDesc: "展开防御领域并强化生存能力" },
    singularity: { name: "奇点", en: "SINGULARITY", color: COLORS.orange, role: "积蓄引力能量，聚集目标并引发坍缩。", skill: "定点引力场", skillDesc: "在原地放置引力场，吸引附近弹幕与敌人", ult: "核心坍缩", ultDesc: "释放积蓄的引力能量，引发核心坍缩" },
    phantom: { name: "幻灵", en: "PHANTOM", color: "#b49aff", role: "以闪避化解攻击，以幽冥领域强化全队输出。", skill: "幽影", skillDesc: "潜行 2 秒：100% 闪避、三倍反伤、每秒恢复 3 HP", ult: "幽冥领域", ultDesc: "展开幽冥领域，强化潜行并提升领域内输出" },
    paradox: { name: "悖论", en: "PARADOX", color: "#9d7cff", role: "因果反转 / 弹幕转化 / 时空回溯。", skill: "因果（E）", skillDesc: "持续 3 秒：受到的伤害反转给攻击者，自身攻击伤害反噬自身", ult: "覆写（Q）/ 轮回（R）", ultDesc: "Q：展开三枚碎片吸收接触弹幕；R：设置时空锚点并回溯" }
  };
  const info = characterInfo[game.character] || characterInfo.prism;
  const playerTitle = document.querySelector(".left-panel h1");
  if (playerTitle) playerTitle.innerHTML = `${info.name} <span>${info.en}</span>`;
  const playerDesc = document.querySelector(".left-panel .muted");
  if (playerDesc) playerDesc.textContent = info.role;
  const skillCard = document.querySelectorAll(".right-panel .skill-card");
  if (skillCard[0]) {
    const title = skillCard[0].querySelector(".skill-info b");
    const desc = skillCard[0].querySelector(".skill-info small");
    const icon = skillCard[0].querySelector(".skill-icon");
    if (title) title.textContent = info.skill;
    if (desc) desc.textContent = info.skillDesc;
    if (icon) { icon.textContent = "E"; icon.style.color = info.color; }
  }
  if (skillCard[1]) {
    const title = skillCard[1].querySelector(".skill-info b");
    const desc = skillCard[1].querySelector(".skill-info small");
    const icon = skillCard[1].querySelector(".skill-icon");
    if (title) title.textContent = info.ult;
    if (desc) desc.textContent = info.ultDesc;
    if (icon) icon.style.color = info.color;
  }
}
window.refreshBattleCharacterInfo = refreshBattleCharacterInfo;
window.addEventListener("nullcore:character-changed", () => {
  try {
    const saved = localStorage.getItem("nullcore.character");
    if (["prism", "bulwark", "singularity", "phantom", "paradox"].includes(saved)) game.character = saved;
  } catch {}
  refreshBattleCharacterInfo();
});

function startCurrentMode() {
  // 进入战斗时重新测量可见画布，避免隐藏状态下记录的 0×0 尺寸导致玩家/BOSS 出现在画布外。
  resizeCanvas();
  if (game.mode === "rogue" && !game.rogueContinuePending) {
    game.rogueBossIndex = 0;
    game.rogueRunSignalUnits = 0;
    game.rogueHpCarry = game.character === "bulwark" ? 145 : game.character === "singularity" ? 90 : game.character === "phantom" ? 50 : game.character === "paradox" ? 123 : 100;
    game.rogueBuild = { damageMult: 1, speedBonus: 0, maxHpBonus: 0 };
  }
  game.rogueContinuePending = false;
  newRun();
}

function showRogueChoices(kind) {
  const overlay = ui.rogue;
  const title = overlay.querySelector("h2");
  const copy = overlay.querySelector("p");
  const choices = overlay.querySelector(".rogue-choice-grid");
  choices.replaceChildren();

  if (kind === "upgrade") {
    title.textContent = "回收异常残响";
    copy.textContent = "选择一项强化，带入下一场 BOSS 战。";
    const characterUpgrades = game.character === "bulwark" ? [
      { title: "绝对领域", desc: "壁垒专属：每吸收 4 枚弹幕，获得短暂无敌与额外能量。", apply: () => { game.rogueBuild.absoluteDomain = (game.rogueBuild.absoluteDomain || 0) + 1; } },
      { title: "反震装甲", desc: "最大生命 +18，反弹脉冲伤害提高 15%。", apply: () => { game.rogueBuild.maxHpBonus += 18; game.rogueBuild.damageMult += 0.15; game.rogueHpCarry = Math.min(145 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 18); } },
    ] : game.character === "singularity" ? [
      { title: "临界坍缩", desc: "奇点专属：命中积蓄更快，核心坍缩伤害提高 20%。", apply: () => { game.rogueBuild.criticalCollapse = (game.rogueBuild.criticalCollapse || 0) + 1; game.rogueBuild.damageMult += 0.20; } },
      { title: "引力透镜", desc: "定点引力场范围 +20%，奇点能量积蓄速度提高。", apply: () => { game.rogueBuild.gravityLens = (game.rogueBuild.gravityLens || 0) + 1; } },
    ] : [];
    const options = [...ROGUE_UPGRADES, ...characterUpgrades].sort(() => Math.random() - 0.5).slice(0, 3);
    options.forEach((upgrade) => {
      const button = document.createElement("button");
      button.className = "rogue-choice";
      button.innerHTML = `<span class="choice-kicker">SYNC MODULE</span><b>${upgrade.title}</b><small>${upgrade.desc}</small><span class="choice-action">安装模块 ↗</span>`;
      button.addEventListener("click", () => {
        upgrade.apply();
        if (game.player) game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry);
        game.rogueBossIndex++;
        showRogueChoices("route");
      }, { once: true });
      choices.append(button);
    });
  } else {
    title.textContent = "选择下一段坐标";
    copy.textContent = `下一目标：${ROGUE_BOSSES[game.rogueBossIndex].name}。选择进入前的异常节点。`;
    const routes = [
      { title: "修复节点", desc: "恢复 30 点生命，稳定同步链路。", action: () => { game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 30); } },
      { title: "过载节点", desc: "下一场战斗伤害提高 25%，但先损失 12 点生命。", action: () => { game.rogueBuild.damageMult += 0.25; game.rogueHpCarry = Math.max(1, game.rogueHpCarry - 12); } },
      { title: "回声节点", desc: "获得随机基础强化。", action: () => { ROGUE_UPGRADES[Math.floor(Math.random() * ROGUE_UPGRADES.length)].apply(); } },
    ];
    routes.forEach((route) => {
      const button = document.createElement("button");
      button.className = "rogue-choice";
      button.innerHTML = `<span class="choice-kicker">RIFT ROUTE</span><b>${route.title}</b><small>${route.desc}</small><span class="choice-action">确认坐标 ↗</span>`;
      button.addEventListener("click", () => {
        route.action();
        game.rogueContinuePending = true;
        overlay.classList.add("hidden");
        setOverlay("start");
        ui.start.querySelector("h2").textContent = `目标：${ROGUE_BOSSES[game.rogueBossIndex].name}`;
        ui.start.querySelector("p").innerHTML = `零域探索 · BOSS ${game.rogueBossIndex + 1}/3<br>强化已保存，准备进入下一坐标。`;
        ui.startButton.textContent = "进入下一战 ↗";
      }, { once: true });
      choices.append(button);
    });
  }
  setOverlay("rogue");
}

window.setGameMode = function(mode) {
  // 读取大厅刚刚保存的角色选择，确保不必刷新页面也能切换角色。
  try { const savedCharacter = localStorage.getItem("nullcore.character"); if (["prism", "bulwark", "singularity", "phantom", "paradox"].includes(savedCharacter)) game.character = savedCharacter; } catch {}
  // 切换路由时结束隐藏中的战斗，避免返回大厅后后台继续运行。
  game.running = false;
  game.paused = false;
  game.ended = false;
  game.rogueContinuePending = false;
  setOverlay("start");
  game.mode = mode === "rogue" ? "rogue" : "standard";
  refreshBattleCharacterInfo();
  // 路由切换后的下一帧再测一次尺寸，兼容初次打开时模块加载与页面显隐的时序。
  requestAnimationFrame(() => resizeCanvas());
  if (game.mode === "rogue") {
    ui.start.querySelector("h2").textContent = "进入零域";
    ui.start.querySelector("p").innerHTML = "连续挑战多个异常体，通过战斗强化构筑。<br>探索失败将结束本次流程。";
    ui.startButton.textContent = "开始探索 ↗";
    ui.restartButton.textContent = "再次探索 ↻";
  } else {
    ui.start.querySelector("h2").textContent = "进入零域";
    ui.start.querySelector("p").innerHTML = "移动、瞄准并击败异常体。<br>这是《空核》的第一版战斗原型。";
    ui.startButton.textContent = "开始模拟 ↗";
    ui.restartButton.textContent = "再次进入 ↻";
  }
};

function togglePause(force) {
  if (!game.running || game.ended) return;

  game.paused =
    typeof force === "boolean" ? force : !game.paused;

  setOverlay(game.paused ? "pause" : "");

  if (game.paused) {
    addLog("模拟已暂停。");
  } else {
    addLog("模拟继续。");
  }
}

// 悖论 R：首次按下放置锚点，再次按下立即回溯；致命伤优先触发。
function useParadoxR() {
  if (game.character !== "paradox" || !game.running || game.paused || game.ended) return;
  const p = game.player;
  if (!p) return;
  if (game.paradoxR > 0) { showToast(`轮回冷却 ${game.paradoxR.toFixed(1)}s`); return; }
  if (game.paradoxAnchor) {
    const a = game.paradoxAnchor; game.paradoxAnchor = null;
    p.x = a.x; p.y = a.y; p.hp = Math.max(1, Math.min(p.maxHp, a.hp));
    game.paradoxRiftLife = 10; game.paradoxRiftTimer = 0.5;
    game.hazards = game.hazards.filter(h => h.type !== "paradox-chaos"); game.hazards.push({type:"paradox-chaos",x:p.x,y:p.y,radius:250,life:10,maxLife:10});
    game.paradoxR = 35; emitParticles(p.x,p.y,"#9d7cff",55,240);
    showToast("轮回：回溯完成，时空乱流展开"); addLog("悖论触发轮回，恢复锚点生命并生成时空乱流。");
  } else {
    if ((game.paradox || 0) < 50) { showToast("悖论不足：轮回需要 50 点"); return; }
    game.paradox -= 50; game.paradoxAnchor = {x:p.x,y:p.y,hp:p.hp,expires:game.elapsed+20};
    emitParticles(p.x,p.y,"#9d7cff",18,110); showToast("时空锚点已放置：20 秒内再次按 R 回溯"); addLog("悖论放置时空锚点，记录位置与生命值。");
  }
}

// 调试模式下忽略所有玩家伤害，并将生命维持在上限。
function damagePlayer(amount) {
  const p = game.player;
  if (!p || game.bossDying || game.playerDying || (game.boss && game.boss.hp <= 0) || (game.invulnerable > 0 && !game._paradoxForceDamage)) return;
  // 壁垒仍然正常承伤；受到伤害时转化为终结技能量。
  if (game.character === "paradox") {
    if (game.paradoxE > 0 && !game._paradoxReversal) {
      const source = game._paradoxDamageSource;
      if (source) { if (source === game.boss) damageBoss(amount, p.x, p.y, {noCharge:true}); else if (!source.dead) damageMinion(source, amount); }
      game.paradox = clamp(game.paradox + 5, 0, 200); return;
    }
    game.paradox = clamp(game.paradox + 5, 0, 200);
    if (game.paradoxAnchor && game.paradoxAnchor.expires > game.elapsed && p.hp - amount <= 0) { const a=game.paradoxAnchor; game.paradoxAnchor=null; p.x=a.x;p.y=a.y;p.hp=Math.max(1,Math.min(p.maxHp,a.hp));game.paradoxRiftLife=10;game.paradoxRiftTimer=.5;game.hazards = game.hazards.filter(h => h.type !== "paradox-chaos"); game.hazards.push({type:"paradox-chaos",x:p.x,y:p.y,radius:250,life:10,maxLife:10});game.paradoxR=35;game.invulnerable=.5;emitParticles(p.x,p.y,"#9d7cff",60,250);showToast("轮回自动触发：致命伤已回溯");addLog("致命伤触发轮回，取消本次攻击剩余结算。 ");return; }
  }
  if (game.character === "bulwark") game.ultEnergy = clamp(game.ultEnergy + amount * 0.42, 0, 100);
  if (DEBUG_MODE && game.debugInfiniteHealth !== false) {
    p.hp = p.maxHp;
    return;
  }
  p.hp -= amount;
  // 每次实际受击后获得 0.5 秒无敌，防止重叠弹幕造成瞬间连击。
  game.invulnerable = Math.max(game.invulnerable || 0, 0.5);
  emitParticles(p.x, p.y, COLORS.pink, 9, 105);
}

// ============================================================
// HUD
// ============================================================

function updateHUD() {
  const p = game.player;
  const b = game.boss;

  if (p) {
    const hp = Math.max(0, p.hp);

    ui.playerHealthBar.style.width =
      `${100 * hp / p.maxHp}%`;

    ui.playerHealthText.textContent =
      `${Math.ceil(hp)} / ${p.maxHp}`;
  }

  ui.energyBar.style.width = `${game.ultEnergy}%`;
  ui.energyText.textContent = `${Math.floor(game.ultEnergy)}%`;
  if (ui.singularityChargePanel) {
    const isSingularity = game.character === "singularity";
    ui.singularityChargePanel.style.display = isSingularity ? "block" : "none";
    const charge = clamp(game.singularityCharge ?? 10, 10, 100);
    ui.singularityChargeBar.style.width = `${charge}%`;
    ui.singularityChargeText.textContent = `${Math.floor(charge)}%`;
  }

  if (b) {
    const hp = Math.max(0, b.hp);

    ui.bossHealthBar.style.width =
      `${100 * hp / b.maxHp}%`;

    ui.bossHealthText.textContent =
      `${Math.ceil(100 * hp / b.maxHp)}%`;

    // 阶段只由实际战斗状态决定，
    // 不再在 HUD 更新时擅自切换。
    if (b.type === "fuse") {
      if (b.phase === 1) ui.phaseLabel.textContent = "阶段 01 · 熔断核心";
      else if (b.phase === 2 || b.phase === 3) ui.phaseLabel.textContent = "阶段 02–03 · 双重复现";
      else ui.phaseLabel.textContent = b.fuseShutdown ? "阶段 04 · 核心永久瘫痪" : "阶段 04 · 无人机清除";
    } else if (b.phase === 1) {
      ui.phaseLabel.textContent = "阶段 01 · 观测";
    } else if (b.phase === 2) {
      ui.phaseLabel.textContent = "阶段 02 · 增压";
    } else {
      ui.phaseLabel.textContent = "阶段 03 · 失稳";
    }
  }

  ui.skillStatus.textContent =
    game.skillCooldown > 0
      ? `${game.skillCooldown.toFixed(1)}s`
      : "就绪";

  ui.skillStatus.className =
    game.skillCooldown > 0
      ? "skill-locked"
      : "skill-ready";

  ui.ultStatus.textContent = game.character === "paradox" ? `悖论 ${game.paradox||0}/200 · Q${game.paradoxQ>0?` ${game.paradoxQ.toFixed(1)}s`:`就绪`} · R${game.paradoxR>0?` ${game.paradoxR.toFixed(1)}s`:(game.paradoxAnchor?"回溯":"锚点")}` : (game.ultEnergy >= 100 ? "可释放" : "充能中");

  ui.ultStatus.className =
    game.ultEnergy >= 100
      ? "skill-ready"
      : "skill-locked";
}

