// ============================================================
// 游戏初始化与结束
// ============================================================
let launchEventBossDifficulty = 0;
let standardBattleTargetId = "observer";
window.setStandardBattleTarget = function(id) { if (["observer","stalker","fuse"].includes(id)) standardBattleTargetId = id; };
window.setLaunchEventBossDifficulty = function(value) { launchEventBossDifficulty = Math.max(0, Math.min(3, Math.floor(Number(value) || 0))); };

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
  game.rogueEncounterStarted = false; game.rogueEncounterResolved = false; game.rogueWave = -1; game.rogueWaveTimer = 0;
  game.fuseDrones = [];
  game.fuseSummon = null;
  game.fuseSummons = [];
  game.fuseSummonProtocolActive = false;

  game.nextEnemyShot = 1.2;
  game.nextMinion = 7;

  game.skillCooldown = 0;
  game.ultEnergy = 0;
  game.ultCooldown = 0;
  game.judgeQTimer = 0; game.judgeRTimer = 0; game.judgeRCharge = 0; game.judgeExplosionDepth = false;
  game.mechDrones = []; game.mechBullets = []; game.mechQTimer = 0; game.mechQCharge = 100; game.mechRCharge = 100; game.mechShield = 0; game.mechShieldTimer = 0; game.mechRTimer = 0; game.mechAirstrikeTimer = 2; game.mechAirstrikeCount = 0;
  game.prismUltimateTimer = 0;
  game.phantomStealthTimer = 0;
  game.illusionClones = []; game.illusionBullets = []; game.illusionETimer = 0; game.illusionQActive = false; game.illusionQCooldown = 0; game.illusionCharge = 0;
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
  const characterStats = character === "aleph"
    ? { maxHp: 120, speed: 250, radius: 11 }
    : character === "traveller"
    ? { maxHp: 100, speed: 255, radius: 11 }
    : character === "bulwark"
    ? { maxHp: 145, speed: 225, radius: 13 }
    : character === "singularity"
      ? { maxHp: 90, speed: 270, radius: 10 }
      : character === "illusion"
        ? { maxHp: 65, speed: 255, radius: 10 }
        : character === "phantom"
        ? { maxHp: 50, speed: 270, radius: 10 }
        : character === "paradox"
          ? { maxHp: 123, speed: 255, radius: 11 }
          : character === "judge"
            ? { maxHp: 80, speed: 255, radius: 11 }
            : character === "mechanist"
              ? { maxHp: 130, speed: 245, radius: 12 }
              : character === "fractal"
                ? { maxHp: 77, speed: 255, radius: 10 }
                : character === "comet"
                  ? { maxHp: 80, speed: 255, radius: 10 }
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
  game.fractalETimer = 0; game.fractalQTimer = 0; game.fractalElectricTimer = 0;
  game.cometQTimer = 0; game.cometMeteorTimer = 0; game.cometMeteorQueue = []; game.cometProjectiles = []; game.cometTrailFades = [];
  game.alephShots = []; game.alephQTimer = 0; game.alephQFireTimer = 0; game.alephQShotsLeft = 0; game.alephQShotCount = 0; game.alephHealTimer = 5;
  resetTraveller();
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

  if (character === "mechanist") game.mechDrones = [0, 1].map(i => ({ angle: i * Math.PI, x: game.player.x, y: game.player.y, cooldown: 0.25 + i * 0.35, returning: false }));

  const rogueBaseBoss = ROGUE_BOSSES[Math.min(game.rogueEncounterBossIndex ?? game.rogueLayer - 1, ROGUE_BOSSES.length - 1)] || ROGUE_BOSSES[0];
  const rogueScale = game.rogueNodeType === "boss" ? 1 + (game.rogueLayer - 1) * 0.42 : game.rogueNodeType === "elite" ? 0.46 + (game.rogueLayer - 1) * 0.12 : 0.22 + (game.rogueLayer - 1) * 0.06;
  const rogueWaveEncounter = game.mode === "rogue" && (game.rogueNodeType === "battle" || game.rogueNodeType === "elite");
  const launchEventBoss = game.mode !== "rogue" && launchEventBossDifficulty > 0;
  const standardBossId = game.mode === "standard" ? standardBattleTargetId : "observer";
  const launchBossHp = [0, 10000, 13000, 16000][launchEventBossDifficulty] || 10000;
  game.boss = {
    x: game.width * 0.5,
    y: Math.max(90, game.height * 0.19),

    radius: launchEventBoss ? 43 : game.mode === "rogue" && ROGUE_BOSSES[game.rogueEncounterBossIndex ?? game.rogueBossIndex]?.id === "fuse" ? 38 : 31,
    hp: launchEventBoss ? launchBossHp : rogueWaveEncounter ? 1000000000 : game.mode === "rogue" ? Math.round(rogueBaseBoss.hp * rogueScale) : (standardBossId === "fuse" ? 8500 : standardBossId === "stalker" ? 6200 : 5000),
    maxHp: launchEventBoss ? launchBossHp : rogueWaveEncounter ? 1000000000 : game.mode === "rogue" ? Math.round(rogueBaseBoss.hp * rogueScale) : (standardBossId === "fuse" ? 8500 : standardBossId === "stalker" ? 6200 : 5000),
    type: launchEventBoss ? "zero" : rogueWaveEncounter ? "rogue-wave-anchor" : game.mode === "rogue" ? rogueBaseBoss.id : standardBossId,
    zeroDifficulty: launchEventBossDifficulty,
    zeroBombTimer: 5.0,
    zeroOverloadTimer: 5.5,
    zeroPattern: 0,

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
  ui.phaseLabel.textContent = launchEventBoss ? "阶段 01 · 初始协议" : "阶段 01 · 观测";
  const bossInfo = game.mode === "rogue" ? ROGUE_BOSSES[game.rogueEncounterBossIndex ?? game.rogueBossIndex] : (ROGUE_BOSSES.find(x => x.id === standardBossId) || ROGUE_BOSSES[0]);
  if (launchEventBoss) window.recordEnemyEncounter?.("zero");
  else if (!rogueWaveEncounter && bossInfo?.id) window.recordEnemyEncounter?.(bossInfo.id);
  const bossTitle = document.querySelector(".right-panel h2");
  const bossDesc = document.querySelector(".right-panel .muted.small");
  if (rogueWaveEncounter) {
    const elite = game.rogueNodeType === "elite";
    ui.enemyLabel.textContent = elite ? "零域精英" : "异常体群";
    if (bossTitle) bossTitle.innerHTML = `${elite ? "零域精英" : "异常体群"} <span>${elite ? "ELITE ENCOUNTER" : "HOSTILE SWARM"}</span>`;
    if (bossDesc) bossDesc.textContent = elite ? "精英目标同步中……锁定实际目标后显示其专属战斗简报。" : "关卡目标：击败 18 个异常体。增援持续到达，达标后停止增援并清除残敌。";
  } else if (launchEventBoss) {
    ui.enemyLabel.textContent = "ZERO";
    if (bossTitle) bossTitle.innerHTML = `ZERO <span>LAUNCH EVENT / ${["", "I", "II", "III"][launchEventBossDifficulty]}</span>`;
    if (bossDesc) bossDesc.textContent = `机械师制造的首台自主机械生命体。危险等级 ${launchEventBossDifficulty}。观察锁定预警，寻找弹幕间隙。`;
    addLog(`活动目标 ZERO 已接入。警报等级 ${launchEventBossDifficulty} · 核心完整度 ${launchBossHp.toLocaleString()}。`);
  } else {
    ui.enemyLabel.textContent = bossInfo?.name || "环形观测者";
    if (bossTitle) bossTitle.innerHTML = `${bossInfo?.name || "环形观测者"} <span>${bossInfo?.codename || "OBSERVER-01"}</span>`;
    if (bossDesc) bossDesc.textContent = bossInfo?.subtitle || "通过旋转环形弹幕封锁区域。观察弹道间隙，持续移动。";
  }
  const encounter = document.querySelector(".encounter-pill");
  if (encounter) encounter.innerHTML = launchEventBoss ? `<span></span>启航协议 · ZERO / 警报 ${launchEventBossDifficulty}` : game.mode === "rogue" ? `<span></span>零域探索 · ${game.rogueNodeType === "boss" ? `BOSS ${game.rogueBossIndex + 1}/3` : game.rogueNodeType === "elite" ? "精英遭遇" : "普通敌袭"}` : `<span></span>遭遇战 · 测试场`;

  setOverlay("");
  updateHUD();

  // Start wave/elite encounters only after the player, hidden anchor, and HUD exist.
  // This avoids a first-frame race and makes the first target visible immediately.
  if (rogueWaveEncounter && typeof beginRogueEncounter === "function") beginRogueEncounter();
  updateHUD();
  canvas.focus?.();
}

function endRun(victory) {
  if (game.ended) return;

  game.ended = true;
  game.running = false;
  game.paused = false;

  if (game.mode === "rogue" && victory && typeof window.rogueNodeResolved === "function") {
    window.rogueNodeResolved(true);
    addLog("路径节点已清除，正在结算本次探索。");
    return;
  }
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

  if (game.boss?.type === "zero" && victory && typeof window.completeLaunchEventBoss === "function") {
    const result = window.completeLaunchEventBoss(game.boss.zeroDifficulty || 1);
    setOverlay("result");
    ui.resultKicker.textContent = result.firstClear ? "FIRST CLEAR · LAUNCH PROTOCOL" : "TARGET NEUTRALIZED";
    ui.resultTitle.textContent = result.firstClear ? "ZERO 已清除" : "ZERO 再次清除";
    ui.resultCopy.textContent = result.message;
    ui.restartButton.textContent = "再次挑战 ↻";
    addLog(result.message);
    return;
  }
  if (game.mode === "rogue" && !victory) {
    // 失败后清空旧路径图与节点状态；“重新探索”必须从第 1 层新地图开始。
    game.rogueMap = null;
    game.rogueLayer = 0;
    game.rogueNodeType = "boss";
    game.rogueContinuePending = false;
    game.rogueEncounterStarted = false;
    game.rogueEncounterResolved = false;
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
    paradox: { name: "悖论", en: "PARADOX", color: "#9d7cff", role: "因果反转 / 弹幕转化 / 时空回溯。", skill: "因果（E）", skillDesc: "持续 3 秒：受到的伤害反转给攻击者，自身攻击伤害反噬自身", ult: "覆写（Q）/ 轮回（R）", ultDesc: "Q：展开三枚碎片吸收接触弹幕；R：设置时空锚点并回溯" },
    aleph: { name: "阿尔法", en: "ALEPH", color: "#8ce8ff", role: "破裂叠层 / 自动追踪 / 空袭清算。", skill: "启程", skillDesc: "发射 10 枚自动追踪光锥，每次命中施加 1 层破裂", ult: "清算", ultDesc: "持续 10 秒发射 50 枚追踪光锥，随后对破裂层数最高的目标发动空袭" }
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
    if (["prism", "bulwark", "singularity", "phantom", "paradox", "traveller", "judge", "mechanist", "illusion", "aleph"].includes(saved)) game.character = saved;
  } catch {}
  refreshBattleCharacterInfo();
});

function startCurrentMode() {
  // Rogue begins at the map; node selection sets rogueContinuePending and then starts combat.
  if (game.mode === "rogue" && !game.rogueContinuePending) {
    window.startRogueMap?.(!game.rogueMap || game.rogueLayer === 0);
    return;
  }
  // 进入战斗时重新测量可见画布，避免隐藏状态下记录的 0×0 尺寸导致玩家/BOSS 出现在画布外。
  resizeCanvas();
  if (game.mode === "rogue" && !game.rogueContinuePending) {
    game.rogueBossIndex = 0;
    game.rogueRunSignalUnits = 0;
    game.rogueHpCarry = game.character === "bulwark" ? 145 : game.character === "singularity" ? 90 : game.character === "phantom" ? 50 : game.character === "illusion" ? 65 : game.character === "paradox" ? 123 : game.character === "judge" ? 80 : game.character === "mechanist" ? 130 : game.character === "aleph" ? 120 : game.character === "fractal" ? 77 : game.character === "comet" ? 80 : game.character === "traveller" ? 100 : 100;
    game.rogueBuild = { damageMult: 1, speedBonus: 0, maxHpBonus: 0, fireRateMult: 1, cooldownMult: 1, betweenStageHeal: 0 };
  }
  game.rogueContinuePending = false;
  document.querySelector(".arena-frame")?.classList.remove("rogue-map-open");
  newRun();
}

function showRogueChoices(kind) {
  document.querySelector(".arena-frame")?.classList.add("rogue-map-open");
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
    copy.textContent = `下一目标：${ROGUE_BOSSES[game.rogueBossIndex].name}。选择进入前的异常节点；已获得的模块将持续生效。`;
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
        game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + (game.rogueBuild.betweenStageHeal || 0));
        overlay.classList.add("hidden");
        setOverlay("start");
        ui.start.querySelector("h2").textContent = `目标：${ROGUE_BOSSES[game.rogueBossIndex].name}`;
        ui.start.querySelector(".panel-kicker").textContent = `RIFT ROUTE / BOSS ${String(game.rogueBossIndex + 1).padStart(2, "0")} OF 03`;
        ui.start.querySelector(".start-glyph").textContent = "⌁";
        ui.start.querySelector("p").innerHTML = `<span class="start-mission-line">${ROGUE_BOSSES[game.rogueBossIndex].codename}</span><br>${ROGUE_BOSSES[game.rogueBossIndex].subtitle}<br><span class="start-build-summary">构筑：伤害 ×${game.rogueBuild.damageMult.toFixed(2)} · 移速 +${game.rogueBuild.speedBonus} · 最大生命 +${game.rogueBuild.maxHpBonus}</span><br>已回收模块已同步。确认后进入下一坐标。`;
        ui.startButton.textContent = "进入下一战 ↗";
      }, { once: true });
      choices.append(button);
    });
  }
  setOverlay("rogue");
}

window.setGameMode = function(mode) {
  // 读取大厅刚刚保存的角色选择，确保不必刷新页面也能切换角色。
  try { const savedCharacter = localStorage.getItem("nullcore.character"); if (["prism", "bulwark", "singularity", "phantom", "paradox", "traveller", "judge", "mechanist", "illusion", "aleph"].includes(savedCharacter)) game.character = savedCharacter; } catch {}
  // 切换路由时结束隐藏中的战斗，避免返回大厅后后台继续运行。
  game.running = false;
  game.paused = false;
  game.ended = false;
  game.rogueContinuePending = false;
  if (mode === "rogue") { game.rogueMap = null; game.rogueLayer = 1; game.rogueNodeType = "boss"; }
  setOverlay("start");
  game.mode = mode === "rogue" ? "rogue" : "standard";
  refreshBattleCharacterInfo();
  // 路由切换后的下一帧再测一次尺寸，兼容初次打开时模块加载与页面显隐的时序。
  requestAnimationFrame(() => resizeCanvas());
  if (game.mode === "rogue") {
    ui.start.querySelector("h2").textContent = "零域探索协议";
    ui.start.querySelector(".panel-kicker").textContent = "RIFT PROTOCOL / 3 TARGETS DETECTED";
    ui.start.querySelector(".start-glyph").textContent = "⌁";
    ui.start.querySelector("p").innerHTML = `<span class="start-mission-line">三阶段连续讨伐</span><br>击败异常体，选择路线并重构战斗构筑。<br><span class="start-build-summary">每次胜利：信标奖励 + 随机模块 · 失败将结束本次探索</span>`;
    ui.startButton.textContent = "开始探索 ↗";
    ui.restartButton.textContent = "再次探索 ↻";
  } else {
    const isLaunchBoss = launchEventBossDifficulty > 0;
    ui.start.querySelector("h2").textContent = isLaunchBoss ? "挑战 ZERO" : `目标：${({observer:"环形观测者",stalker:"裂隙猎手",fuse:"熔断主机"})[standardBattleTargetId] || "环形观测者"}`;
    ui.start.querySelector(".panel-kicker").textContent = isLaunchBoss ? `LAUNCH PROTOCOL / ZERO · ALERT ${launchEventBossDifficulty}` : "SIMULATION READY / NULL CORE";
    ui.start.querySelector(".start-glyph").textContent = isLaunchBoss ? "⬡" : "◇";
    ui.start.querySelector("p").innerHTML = isLaunchBoss ? `启航协议活动目标已锁定。<br>警报等级 ${launchEventBossDifficulty} · ZERO 核心完整度 ${[0,10000,13000,16000][launchEventBossDifficulty].toLocaleString()}。` : `已锁定目标：${({observer:"环形观测者",stalker:"裂隙猎手",fuse:"熔断主机"})[standardBattleTargetId] || "环形观测者"}。<br>移动、瞄准并击败异常体。观察攻击模式，寻找核心破绽。`;
    ui.startButton.textContent = isLaunchBoss ? "开始挑战 ↗" : "开始战斗 ↗";
    ui.restartButton.textContent = isLaunchBoss ? "再次挑战 ↻" : "再次进入 ↻";
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
function damagePlayer(amount, source = null) {
  const p = game.player;
  if (!p || game.bossDying || game.playerDying || (game.boss && game.boss.hp <= 0) || (game.invulnerable > 0 && !game._paradoxForceDamage)) return;
  if (game.character === "traveller" && game.traveller?.rTimer > 0 && Math.random() < 0.20) { emitParticles(p.x,p.y,"#e4d9ff",18,150); game.hazards.push({type:"dodge-burst",x:p.x,y:p.y,radius:34,life:.32,maxLife:.32}); showToast("旅途的尾声：闪避成功"); return; }
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
  // 罪孽只记在真正命中玩家的敌人身上，绝不再按“离玩家最近的敌人”猜测来源。
  if (game.character === "judge" && source && (source === game.boss || (game.minions || []).includes(source))) { source.judgeSin = Math.min(10, (source.judgeSin || 0) + 1); }
  if (game.character === "mechanist" && (game.mechShield || 0) > 0) { const absorbed = Math.min(game.mechShield, amount); game.mechShield -= absorbed; amount -= absorbed; emitParticles(p.x,p.y,"#63d8ff",8,90); if (amount <= 0) return; }
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
  const judgePanel=document.getElementById("judge-charge-panel");
  if(judgePanel){const active=game.character==="judge";judgePanel.style.display=active?"block":"none";
    const q=clamp(game.ultEnergy||0,0,100), rr=clamp(game.judgeRCharge||0,0,100);
    const qb=document.getElementById("judge-q-charge-bar"), qt=document.getElementById("judge-q-charge-text"), rb=document.getElementById("judge-r-charge-bar"), rt=document.getElementById("judge-r-charge-text");
    if(qb)qb.style.width=q+"%";if(qt)qt.textContent=(game.judgeQTimer>0?`强化 ${game.judgeQTimer.toFixed(1)}s`:Math.floor(q)+"%");
    if(rb)rb.style.width=rr+"%";if(rt)rt.textContent=(game.judgeRTimer>0?`审判 ${game.judgeRTimer.toFixed(1)}s`:Math.floor(rr)+"%");
    const sins=document.getElementById("judge-sin-total");if(sins){const targets=[...(game.minions||[]).filter(m=>!m.dead),...(game.boss&&game.boss.transition==="none"?[game.boss]:[])];const count=targets.filter(t=>(t.judgeSin||0)>0).length;sins.textContent=`罪孽目标：${count} · 总层数：${targets.reduce((a,t)=>a+(t.judgeSin||0),0)}`;}
  }
  const alephPanel = document.getElementById("aleph-status-panel");
  if (alephPanel) { alephPanel.style.display = game.character === "aleph" ? "block" : "none"; const q = document.getElementById("aleph-q-status"); const rupture = document.getElementById("aleph-rupture-status"); if(q) q.textContent = game.alephQTimer > 0 ? `清算 ${game.alephQTimer.toFixed(1)}s · ${game.alephQShotsLeft||0} 枚剩余` : (game.ultEnergy >= 100 ? "Q 清算就绪" : `Q 充能 ${Math.floor(game.ultEnergy)}%`); if(rupture) { const targets=[...(game.minions||[]),...(game.fuseSummons||[]),...(game.boss?[game.boss]:[])].filter(t=>t&&!t.dead&&t.hp>0); const best=targets.reduce((a,t)=>!a||(t.alephRupture||0)>(a.alephRupture||0)?t:a,null); rupture.textContent = best ? `最高破裂：${best.alephRupture||0}/100` : "破裂目标：无"; } }
  if (ui.singularityChargePanel) {
    const isSingularity = game.character === "singularity";
    ui.singularityChargePanel.style.display = isSingularity ? "block" : "none";
    const charge = clamp(game.singularityCharge ?? 10, 10, 100);
    ui.singularityChargeBar.style.width = `${charge}%`;
    ui.singularityChargeText.textContent = `${Math.floor(charge)}%`;
  }

  if (b) {
    const waveEncounter = game.mode === "rogue" && (game.rogueNodeType === "battle" || game.rogueNodeType === "elite");
    if (waveEncounter) {
      const living = (game.minions || []).filter(m => !m.dead && m.hp > 0);
      const eliteTarget = living.find(m => m.isElite);
      if (game.rogueNodeType === "elite" && eliteTarget) {
        ui.bossHealthBar.style.width = `${Math.max(0, Math.min(100, eliteTarget.hp / eliteTarget.maxHp * 100))}%`;
        ui.bossHealthText.textContent = `${Math.ceil(eliteTarget.hp)} / ${eliteTarget.maxHp}`;
        ui.enemyLabel.textContent = eliteTarget.name;
        const title = document.querySelector(".right-panel h2");
        const desc = document.querySelector(".right-panel .muted.small");
        // 始终以精英实体的 type 查找专属简报，避免沿用初始化时的关底 BOSS 文案。
        const eliteBriefings = {
          prismWarden: "棱镜护盾：三枚棱镜环绕核心。击破棱镜可逐步削弱护盾；护盾归零后核心过载，抓住窗口输出。",
          riftHerald: "裂隙召唤：裂隙牧者会持续召唤低阶单位，并在召唤物存活时获得护盾。优先清除召唤物再集中攻击本体。",
          shadeHound: "锁定冲刺：猎犬会标记玩家位置并高速突进。观察锁定预警，诱导它撞向场地边缘，趁失衡窗口攻击。",
          nullCartographer: "区域测绘：测绘者会在玩家附近绘制延迟爆发区。持续移动，避开蓝色标记区域并利用其攻击间隔反击。",
          meltdownSeed: "热量失控：核心热量持续上升，弹幕会随热量加速；达到过热阈值时释放大范围爆发。观察热量读数并保持距离。"
        };
        if (title) title.innerHTML = `${eliteTarget.name} <span>ELITE · ${(eliteTarget.type || "unknown").toUpperCase()}</span>`;
        if (desc) desc.textContent = eliteBriefings[eliteTarget.type] || eliteTarget.description || "精英异常体：观察攻击预警，在攻击间隙反击。";
        ui.phaseLabel.textContent = eliteTarget.houndState === "stun" ? "失衡窗口 · 进攻" : (eliteTarget.heat != null ? `核心热量 ${Math.floor(eliteTarget.heat)}%` : "精英机制 · 弹幕/空袭协议");
      } else if (game.rogueNodeType === "elite") {
        ui.bossHealthBar.style.width = "0%";
        ui.bossHealthText.textContent = "CLEAR";
        ui.phaseLabel.textContent = "精英信号消失";
      } else {
        const progress = Math.min(100, (game.rogueKills || 0) / (game.rogueKillGoal || 18) * 100);
        ui.bossHealthBar.style.width = `${progress}%`;
        ui.bossHealthText.textContent = `${game.rogueKills || 0} / ${game.rogueKillGoal || 18}`;
        ui.phaseLabel.textContent = `增援压力 · 存活 ${living.length}`;
      }
    } else {
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
  }

  ui.skillStatus.textContent =
    game.skillCooldown > 0
      ? `${game.skillCooldown.toFixed(1)}s`
      : "就绪";

  ui.skillStatus.className =
    game.skillCooldown > 0
      ? "skill-locked"
      : "skill-ready";

  ui.ultStatus.textContent = game.character === "aleph" ? `Q ${game.alephQTimer>0?`清算 ${game.alephQTimer.toFixed(1)}s`:game.ultEnergy>=100?"就绪":Math.floor(game.ultEnergy)+"%"} · E ${game.skillCooldown>0?game.skillCooldown.toFixed(1)+"s":"启程就绪"} · 回复 ${game.alephHealTimer>0?game.alephHealTimer.toFixed(1):"0.0"}s` : game.character === "illusion" ? `Q ${game.illusionQActive?"虚像存续":game.ultEnergy>=100?"就绪":Math.floor(game.ultEnergy)+"%"} · E ${game.skillCooldown>0?game.skillCooldown.toFixed(1)+"s":"就绪"} · 闪避/移速 ${illusionFullDodgeActive()?"100% / +25%":"30%"}` : game.character === "mechanist" ? `Q ${game.mechQTimer>0?game.mechQTimer.toFixed(1)+"s":Math.floor(game.mechQCharge||0)+"%"} · R ${game.mechRTimer>0?game.mechRTimer.toFixed(1)+"s":Math.floor(game.mechRCharge||0)+"%"} · 空袭 ${game.mechAirstrikeCount||0}/10` : game.character === "judge" ? `Q ${game.judgeQTimer>0?`强化 ${game.judgeQTimer.toFixed(1)}s`:game.ultEnergy>=100?"就绪":Math.floor(game.ultEnergy)+"%"} · R ${Math.floor(game.judgeRCharge||0)}%${game.judgeRTimer>0?` · 裁决 ${game.judgeRTimer.toFixed(1)}s`:""}` : game.character === "paradox" ? `悖论 ${game.paradox||0}/200 · Q${game.paradoxQ>0?` ${game.paradoxQ.toFixed(1)}s`:`就绪`} · R${game.paradoxR>0?` ${game.paradoxR.toFixed(1)}s`:(game.paradoxAnchor?"回溯":"锚点")}` : game.character === "traveller" ? `Q ${game.traveller?.qCharging?`蓄能 ${Math.floor((game.traveller.qCharge||0)*10)}%`:game.ultCooldown>0?"冷却中":game.traveller?.qCooldown>0?"冷却中":game.ultEnergy>=100?"就绪":"充能中"} · R ${game.traveller?.rCooldown>0?game.traveller.rCooldown.toFixed(1)+"s":"就绪"}` : game.character === "phantom" ? `Q ${game.phantomDomainTimer>0?`领域 ${game.phantomDomainTimer.toFixed(1)}s`:game.ultEnergy>=100?"就绪":Math.floor(game.ultEnergy)+"%"} · E ${game.skillCooldown>0?game.skillCooldown.toFixed(1)+"s":"就绪"}` : (game.ultEnergy >= 100 ? "可释放" : "充能中");
  if (game.ultCooldown > 0) ui.ultStatus.textContent += ` · Q冷却 ${game.ultCooldown.toFixed(1)}s`;

  ui.ultStatus.className =
    game.ultCooldown <= 0 && (game.character === "judge" ? (game.ultEnergy >= 100 || (game.judgeRCharge||0) >= 100) : game.character === "mechanist" ? (game.mechQCharge >= 100 || game.mechRCharge >= 100) : game.character === "paradox" ? ((game.paradox||0) >= 20 || (game.paradoxAnchor && game.paradoxR <= 0)) : game.character === "traveller" ? ((game.ultEnergy >= 100) || (game.traveller?.qCharging)) : game.ultEnergy >= 100)
      ? "skill-ready"
      : "skill-locked";
}

