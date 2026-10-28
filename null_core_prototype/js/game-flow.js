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
  game.hazards = [];
  game.minions = [];
  game.fuseDrones = [];
  game.fuseSummon = null;
  game.fuseSummons = [];

  game.nextEnemyShot = 1.2;
  game.nextMinion = 7;

  game.skillCooldown = 0;
  game.ultEnergy = 0;
  game.dashCooldown = 0;
  game.dashTime = 0;
  game.invulnerable = 0;
  game.shootCooldown = 0;
  game.toastTimer = 0;

  game.player = {
    x: game.width * 0.5,
    y: game.height * 0.78,
    radius: 11,
    hp: game.mode === "rogue" ? Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry) : 100,
    maxHp: 100 + (game.mode === "rogue" ? game.rogueBuild.maxHpBonus : 0),
    speed: 255 + (game.mode === "rogue" ? game.rogueBuild.speedBonus : 0),
    angle: -Math.PI / 2,
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
    if (game.rogueBossIndex >= game.rogueBossCount - 1) {
      setOverlay("result");
      ui.resultKicker.textContent = "RIFT CLEARED";
      ui.resultTitle.textContent = "零域已贯通";
      ui.resultCopy.textContent = `已击败全部 ${game.rogueBossCount} 个异常体。探索记录已完成，本次构筑将保留至本局结束。`;
      ui.restartButton.textContent = "再次探索 ↻";
      addLog("零域探索完成。所有目标信号均已消失。");
      return;
    }
    showRogueChoices("upgrade");
    addLog(`${ROGUE_BOSSES[game.rogueBossIndex].name} 已被击败。等待构筑强化。`);
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

function startCurrentMode() {
  if (game.mode === "rogue" && !game.rogueContinuePending) {
    game.rogueBossIndex = 0;
    game.rogueHpCarry = 100;
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
    const options = [...ROGUE_UPGRADES].sort(() => Math.random() - 0.5).slice(0, 3);
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
  // 切换路由时结束隐藏中的战斗，避免返回大厅后后台继续运行。
  game.running = false;
  game.paused = false;
  game.ended = false;
  game.rogueContinuePending = false;
  setOverlay("start");
  game.mode = mode === "rogue" ? "rogue" : "standard";
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

// 调试模式下忽略所有玩家伤害，并将生命维持在上限。
function damagePlayer(amount) {
  const p = game.player;
  if (!p) return;
  if (DEBUG_MODE) {
    p.hp = p.maxHp;
    return;
  }
  p.hp -= amount;
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

  ui.ultStatus.textContent =
    game.ultEnergy >= 100 ? "可释放" : "充能中";

  ui.ultStatus.className =
    game.ultEnergy >= 100
      ? "skill-ready"
      : "skill-locked";
}

