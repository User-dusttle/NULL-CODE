
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

// URL 调试开关：在地址后添加 ?debug=1 可开启无限生命。
function isDebugMode() {
  if (new URLSearchParams(window.location.search).get("debug") === "1") return true;
  const hash = window.location.hash || "";
  const queryIndex = hash.indexOf("?");
  if (queryIndex < 0) return false;
  return new URLSearchParams(hash.slice(queryIndex + 1)).get("debug") === "1";
}
const DEBUG_MODE = isDebugMode();

const ui = {
  start: document.querySelector("#start-overlay"),
  result: document.querySelector("#result-overlay"),
  rogue: document.querySelector("#rogue-overlay"),
  pause: document.querySelector("#pause-overlay"),
  startButton: document.querySelector("#start-button"),
  restartButton: document.querySelector("#restart-button"),
  resumeButton: document.querySelector("#resume-button"),
  pauseButton: document.querySelector("#pause-button"),
  playerHealthBar: document.querySelector("#player-health-bar"),
  playerHealthText: document.querySelector("#player-health-text"),
  energyBar: document.querySelector("#energy-bar"),
  energyText: document.querySelector("#energy-text"),
  bossHealthBar: document.querySelector("#boss-health-bar"),
  bossHealthText: document.querySelector("#boss-health-text"),
  phaseLabel: document.querySelector("#phase-label"),
  enemyLabel: document.querySelector("#enemy-label"),
  skillStatus: document.querySelector("#skill-status"),
  ultStatus: document.querySelector("#ult-status"),
  resultKicker: document.querySelector("#result-kicker"),
  resultTitle: document.querySelector("#result-title"),
  resultCopy: document.querySelector("#result-copy"),
  toast: document.querySelector("#toast"),
  log: document.querySelector("#battle-log"),
};

const COLORS = {
  cyan: "#68efff",
  cyanSoft: "rgba(104,239,255,.35)",
  violet: "#b68aff",
  pink: "#ff719d",
  orange: "#ffb46e",
  grid: "rgba(102,132,190,.10)",
  white: "#e9f0ff",
};

const game = {
  running: false,
  paused: false,
  ended: false,
  mode: "standard",
  rogueBossIndex: 0,
  rogueBossCount: 3,
  rogueContinuePending: false,
  rogueHpCarry: 100,
  rogueBuild: { damageMult: 1, speedBonus: 0, maxHpBonus: 0 },
  rogueChoices: [],

  width: 800,
  height: 640,
  dpr: 1,
  lastTime: 0,
  elapsed: 0,

  keys: new Set(),
  mouse: {
    x: 400,
    y: 320,
    down: false,
    inside: false,
  },

  player: null,
  boss: null,

  bullets: [],
  enemyBullets: [],
  particles: [],
  hazards: [],
  minions: [],

  nextEnemyShot: 1.2,
  nextMinion: 7,
  skillCooldown: 0,
  ultEnergy: 0,
  dashCooldown: 0,
  dashTime: 0,
  invulnerable: 0,
  shootCooldown: 0,
  toastTimer: 0,
};

const ROGUE_BOSSES = [
  { id: "observer", name: "环形观测者", codename: "OBSERVER-01", hp: 5000, subtitle: "旋转环形弹幕 / 四臂螺旋" },
  { id: "stalker", name: "裂隙猎手", codename: "RIFT-STALKER", hp: 4600, subtitle: "快速追踪 / 交叉弹道" },
  { id: "fuse", name: "熔断主机", codename: "FUSE-CORE", hp: 6500, subtitle: "区域轰击 / 高压弹幕" },
];

const ROGUE_UPGRADES = [
  { title: "棱镜过载", desc: "普通攻击伤害 +20%", apply: () => { game.rogueBuild.damageMult += 0.20; } },
  { title: "轻相位框架", desc: "移动速度 +12%", apply: () => { game.rogueBuild.speedBonus += 30; } },
  { title: "核心扩容", desc: "最大生命 +25，并恢复 25 点生命", apply: () => { game.rogueBuild.maxHpBonus += 25; game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 25); } },
  { title: "回路校准", desc: "普通攻击伤害 +12%，移动速度 +8%", apply: () => { game.rogueBuild.damageMult += 0.12; game.rogueBuild.speedBonus += 20; } },
  { title: "应急修复", desc: "恢复 35 点生命（不超过上限）", apply: () => { game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 35); } },
];

// ============================================================
// 基础工具
// ============================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleTo(a, b) {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function angleDiff(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

function addLog(message) {
  const seconds = Math.floor(game.elapsed);
  const stamp =
    `00:${String(seconds % 60).padStart(2, "0")}`;

  const p = document.createElement("p");
  const time = document.createElement("time");
  const span = document.createElement("span");

  time.textContent = stamp;
  span.textContent = message;

  p.append(time, span);
  ui.log.prepend(p);

  while (ui.log.children.length > 5) {
    ui.log.lastElementChild.remove();
  }
}

function showToast(message) {
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  game.toastTimer = 1.5;
}

function setOverlay(which) {
  ui.start.classList.toggle("hidden", which !== "start");
  ui.result.classList.toggle("hidden", which !== "result");
  ui.pause.classList.toggle("hidden", which !== "pause");
  ui.rogue.classList.toggle("hidden", which !== "rogue");
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));

  game.dpr = dpr;
  game.width = rect.width;
  game.height = rect.height;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (game.player) {
    game.player.x = clamp(game.player.x, 22, game.width - 22);
    game.player.y = clamp(game.player.y, 22, game.height - 22);
  }

  if (game.boss) {
    game.boss.x = clamp(game.boss.x, 60, game.width - 60);
    game.boss.y = Math.max(90, game.height * 0.19);
  }
}

window.addEventListener("resize", resizeCanvas);

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
    if (b.phase === 1) {
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
  for (let i = 0; i < amount; i++) {
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

function shootPlayer() {
  const p = game.player;

  if (!p || game.shootCooldown > 0) return;

  const a = p.angle;
  const speed = 570;

  game.bullets.push({
    x: p.x + Math.cos(a) * 16,
    y: p.y + Math.sin(a) * 16,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed,
    radius: 3,
    damage: 18 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1),
    life: 1.5,
    color: COLORS.cyan,
  });

  game.shootCooldown = 0.15;
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
  game.dashCooldown = 1.4;
  game.invulnerable = 0.34;

  emitParticles(p.x, p.y, COLORS.cyan, 14, 150);
  showToast("相位闪避");
}

function damageMinion(minion, damage) {
  if (minion.dead) return;

  minion.hp -= damage;

  if (minion.hp <= 0) {
    minion.hp = 0;
    minion.dead = true;

    emitParticles(
      minion.x,
      minion.y,
      COLORS.violet,
      12,
      110
    );

    game.ultEnergy = clamp(game.ultEnergy + 3, 0, 100);
  }
}

function damageBoss(damage, sourceX, sourceY) {
  const b = game.boss;

  if (!b || b.transition !== "none") return false;

  b.hp = Math.max(0, b.hp - damage);
  b.hitFlash = 0.1;

  game.ultEnergy = clamp(game.ultEnergy + 4, 0, 100);

  if (sourceX !== undefined && sourceY !== undefined) {
    emitParticles(
      sourceX,
      sourceY,
      COLORS.cyan,
      3,
      60
    );
  }

  return true;
}

function useSkill() {
  if (
    !game.running ||
    game.paused ||
    game.skillCooldown > 0
  ) {
    return;
  }

  const p = game.player;
  const b = game.boss;

  game.skillCooldown = 5;

  let removed = 0;

  // 清除玩家附近的敌方弹幕
  for (const bullet of game.enemyBullets) {
    if (
      !bullet.dead &&
      distance(p, bullet) < 125
    ) {
      bullet.dead = true;
      removed++;

      emitParticles(
        bullet.x,
        bullet.y,
        COLORS.cyan,
        4,
        75
      );
    }
  }

  // 折射脉冲也能攻击附近小怪
  for (const m of game.minions) {
    if (!m.dead && distance(p, m) < 150) {
      damageMinion(m, 42);
    }
  }

  // BOSS 充能或释放大招时无敌
  if (
    b.transition === "none" &&
    distance(p, b) < 185
  ) {
    damageBoss(52 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1), b.x, b.y);
  }

  emitParticles(p.x, p.y, COLORS.cyan, 28, 220);

  showToast(
    removed
      ? `折射脉冲：清除 ${removed} 枚弹幕`
      : "折射脉冲释放"
  );

  addLog("折射脉冲已释放。");
  updateHUD();
}

function useUltimate() {
  if (
    !game.running ||
    game.paused ||
    game.ultEnergy < 100
  ) {
    if (game.running && game.ultEnergy < 100) {
      showToast("核心能量不足");
    }

    return;
  }

  game.ultEnergy = 0;

  const b = game.boss;

  // 即使 BOSS 无敌，玩家也可以释放技能，
  // 但不会造成伤害。
  if (b.transition === "none") {
    damageBoss(185 * (game.mode === "rogue" ? game.rogueBuild.damageMult : 1), b.x, b.y);
  }

  // 保留原有交叉棱镜视觉效果
  game.hazards.push({
    type: "ultimate",
    life: 0.42,
    maxLife: 0.42,
  });

  emitParticles(b.x, b.y, COLORS.violet, 45, 240);

  showToast("终结技：交叉棱镜");
  addLog("终结技已释放。");

  updateHUD();
}

// ============================================================
// 小怪
// ============================================================

function spawnMinion() {
  if (!game.boss || game.boss.transition !== "none") {
    return;
  }

  if (game.minions.filter(m => !m.dead).length >= 4) {
    return;
  }

  const b = game.boss;
  const side = Math.random() < 0.5 ? -1 : 1;

  game.minions.push({
    x: clamp(
      b.x + side * rand(65, 115),
      30,
      game.width - 30
    ),

    y: clamp(
      b.y + rand(35, 85),
      35,
      game.height * 0.42
    ),

    radius: 10,
    hp: 72,
    maxHp: 72,
    shootTimer: rand(0.8, 1.5),
    age: 0,
    dead: false,
  });
}

function updateMinions(dt) {
  const b = game.boss;
  const p = game.player;

  if (
    b.phase === 1 &&
    b.transition === "none"
  ) {
    game.nextMinion -= dt;

    if (game.nextMinion <= 0) {
      spawnMinion();
      game.nextMinion = rand(6, 8);
    }
  }

  for (const m of game.minions) {
    if (m.dead) continue;

    m.age += dt;

    // 小怪缓慢漂移
    m.x += Math.sin(m.age * 1.5) * 18 * dt;
    m.x = clamp(m.x, m.radius, game.width - m.radius);

    // 大招充能时停止攻击
    if (b.transition !== "none") continue;

    m.shootTimer -= dt;

    if (m.shootTimer <= 0) {
      const a = angleTo(m, p);
      const speed = 125;

      game.enemyBullets.push({
        x: m.x,
        y: m.y,

        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,

        radius: 4,
        life: 5,
        damage: 7,
        color: COLORS.orange,
      });

      m.shootTimer = rand(1.7, 2.4);
    }
  }

  game.minions = game.minions.filter(
    m => !m.dead && m.hp > 0
  );
}

// ============================================================
// BOSS 普通攻击
// ============================================================

function spawnEnemyShotPattern() {
  const b = game.boss;
  const p = game.player;

  if (!b || !p || b.transition !== "none") return;

  const phase = b.phase;
  const aimed = angleTo(b, p);

  // BOSS 02：裂隙猎手，使用交叉扇形与追踪弹，节奏更急促。
  if (b.type === "stalker") {
    if (phase === 1) {
      // 阶段一：朝地图中心发射，不瞄准玩家，也不冲刺。
      const center = { x: game.width * 0.5, y: game.height * 0.5 };
      const centerAngle = angleTo(b, center);
      for (const offset of [-0.22, -0.11, 0, 0.11, 0.22]) {
        const a = centerAngle + offset;
        const speed = 175;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 4.5, life: 4.5, damage: 9, color: COLORS.cyan });
      }
    } else if (phase === 2) {
      // 阶段二常规攻击：清晰的五发扇形弹幕。
      for (let i = -2; i <= 2; i++) {
        const a = aimed + i * 0.16;
        const speed = 205;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 4.8, life: 4.8, damage: 10, color: COLORS.violet });
      }
    } else {
      // 阶段三保留扇形机制，增加子弹数量和速度。
      for (let i = -3; i <= 3; i++) {
        const a = aimed + i * 0.15;
        const speed = 250;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, radius: 5, life: 4.5, damage: 11, color: COLORS.pink });
      }
    }
    return;
  }

  // BOSS 03：熔断主机，宽扇形与高密度环形弹幕，后期增加区域轰击。
  if (b.type === "fuse") {
    if (phase === 1) {
      for (let i = -3; i <= 3; i++) {
        const a = aimed + i * 0.16;
        game.enemyBullets.push({ x: b.x, y: b.y + 14, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, radius: 5, life: 5, damage: 10, color: COLORS.orange });
      }
    } else if (phase === 2) {
      const gap = aimed + Math.PI;
      for (let i = 0; i < 16; i++) {
        const a = i * Math.PI * 2 / 16 + b.spin;
        if (Math.abs(angleDiff(a, gap)) < 0.28) continue;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * 165, vy: Math.sin(a) * 165, radius: 4.5, life: 5.5, damage: 9, color: COLORS.orange });
      }
    } else {
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI * 2 / 20 + b.spin * 1.2;
        game.enemyBullets.push({ x: b.x, y: b.y, vx: Math.cos(a) * (160 + (i % 2) * 55), vy: Math.sin(a) * (160 + (i % 2) * 55), radius: 4.5, life: 5.5, damage: 10, color: i % 2 ? COLORS.orange : COLORS.pink });
      }
    }
    return;
  }

  if (phase === 1) {
    // 第一阶段：三连瞄准弹
    for (const offset of [-0.18, 0, 0.18]) {
      const a = aimed + offset;
      const speed = 155;

      game.enemyBullets.push({
        x: b.x,
        y: b.y + 15,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 5,
        life: 5,
        damage: 12,
        color: COLORS.pink,
      });
    }
  } else if (phase === 2) {
    // 第二阶段：带安全缺口的环形弹幕
    const gap = aimed + Math.PI;

    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI * 2 / 12 + b.spin;

      if (Math.abs(angleDiff(a, gap)) < 0.31) {
        continue;
      }

      const speed = 175;

      game.enemyBullets.push({
        x: b.x,
        y: b.y + 10,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 4.5,
        life: 5.5,
        damage: 10,
        color: COLORS.pink,
      });
    }
  } else {
    // 第三阶段：高速交错环形弹幕
    for (let i = 0; i < 16; i++) {
      const a = i * Math.PI * 2 / 16 + b.spin * 1.4;
      const speed = i % 2 ? 225 : 175;

      game.enemyBullets.push({
        x: b.x,
        y: b.y + 8,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        radius: 4.5,
        life: 5.5,
        damage: 11,
        color: i % 2 ? COLORS.pink : COLORS.orange,
      });
    }
  }
}

// ============================================================
// 空袭
// ============================================================

function spawnAirstrike() {
  // 固定两个落点，避免安全区域被一次性封死。
  const count = 2;

  for (let i = 0; i < count; i++) {
    game.hazards.push({
      type: "airstrike",

      x: rand(55, game.width - 55),
      y: rand(game.height * 0.3, game.height * 0.85),

      radius: 30,
      life: 1.8,
      maxLife: 1.8,
      fired: false,
    });
  }

  addLog("空袭锁定：注意地面标记。");
  showToast("警告：检测到空间轰击");
}

function fireAirstrikeRing(hazard) {
  const count = 10;
  const offset = Math.random() * Math.PI * 2;

  emitParticles(
    hazard.x,
    hazard.y,
    COLORS.orange,
    20,
    140
  );

  for (let i = 0; i < count; i++) {
    const a = offset + i * Math.PI * 2 / count;
    const speed = 132;

    game.enemyBullets.push({
      x: hazard.x,
      y: hazard.y,

      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,

      radius: 4.5,
      life: 4.5,
      damage: 10,
      color: COLORS.orange,
    });
  }
}

// ============================================================
// BOSS 阶段转换与终极大招
// ============================================================

function startBossUltimate() {
  const b = game.boss;

  if (b.ultimateTriggered) return;

  b.ultimateTriggered = true;
  b.transition = "charge";
  b.transitionTimer = 2.4;
  b.ultimateRingTimer = 0;
  b.ultimateCircleTimer = 0.65;
  b.ultimateSpiralAngle = rand(0, Math.PI * 2);

  // 大招开始时清场，也清除尚未引爆的空袭标记。
  game.minions = [];
  game.enemyBullets = [];
  game.hazards = game.hazards.filter(hazard => hazard.type !== "airstrike");

  addLog("观测者开始终极充能。");
  showToast("警告：观测者正在充能");
}

function finishBossUltimate() {
  const b = game.boss;

  b.transition = "none";
  b.phase = 2;
  b.airstrikeCooldown = 4.5;

  // 立即允许第二阶段攻击重新计时
  game.nextEnemyShot = game.elapsed + 0.6;

  ui.phaseLabel.textContent = "阶段 02 · 增压";

  addLog("观测者进入第二阶段。");
  showToast("阶段 02：增压");

  emitParticles(
    b.x,
    b.y,
    COLORS.violet,
    35,
    180
  );
}

function spawnStalkerRing(x, y, count = 12, speed = 145) {
  const p = game.player;
  const safeAngle = p ? angleTo({ x, y }, p) + Math.PI : 0;
  const offset = rand(0, Math.PI * 2);
  for (let i = 0; i < count; i++) {
    const a = offset + i * Math.PI * 2 / count;
    if (Math.abs(angleDiff(a, safeAngle)) < 0.24) continue;
    game.enemyBullets.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      radius: 4.2, life: 5.2, damage: 8, color: COLORS.cyan,
    });
  }
}

function spawnStalkerSeal(x, y) {
  // 阶段一转阶段专用标记：不可摧毁，存活至 20 秒转场结束。
  game.hazards.push({
    type: "stalker-seal", x, y, radius: 25,
    life: 20, maxLife: 20, crossTimer: 0.1, ringTimer: 1.45,
    fired: false,
  });
}

function fireStalkerSealCross(seal) {
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    game.enemyBullets.push({
      x: seal.x, y: seal.y,
      vx: Math.cos(a) * 165, vy: Math.sin(a) * 165,
      radius: 4.2, life: 5.2, damage: 8, color: COLORS.pink,
    });
  }
}

function fireStalkerRift(hazard) {
  emitParticles(hazard.x, hazard.y, COLORS.pink, 18, 145);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    game.enemyBullets.push({
      x: hazard.x, y: hazard.y,
      vx: Math.cos(a) * 185, vy: Math.sin(a) * 185,
      radius: 4.5, life: 4.5, damage: 9, color: COLORS.pink,
    });
  }
  spawnStalkerRing(hazard.x, hazard.y, 10, 115);
}

function updateStalkerMovement(dt) {
  const b = game.boss;
  const p = game.player;
  if (!b || !p || b.type !== "stalker" || b.transition !== "none") return;

  // PHASE 01：只沿场地中央周围的椭圆轨道移动，绝不冲刺。
  if (b.phase === 1) {
    b.stalkerOrbitAngle = (b.stalkerOrbitAngle ?? -Math.PI / 2) + dt * 1.35;
    const rx = Math.min(game.width * 0.25, 205);
    const ry = Math.min(game.height * 0.19, 125);
    b.x = game.width * 0.5 + Math.cos(b.stalkerOrbitAngle) * rx;
    b.y = game.height * 0.36 + Math.sin(b.stalkerOrbitAngle) * ry;
    return;
  }

  // PHASE 02/03：普通追猎循环 hunt -> charge -> dash -> stun。
  b.stalkerStateTimer = Math.max(0, (b.stalkerStateTimer ?? 0) - dt);
  b.stalkerDashCooldown = Math.max(0, (b.stalkerDashCooldown ?? 0) - dt);

  if (!b.stalkerState || b.stalkerState === "orbit") {
    b.stalkerState = "hunt";
    b.stalkerStateTimer = 1.4;
  }

  if (b.stalkerState === "hunt") {
    const dx = p.x - b.x;
    const dy = p.y - b.y;
    const a = Math.atan2(dy, dx) + Math.PI * 0.62;
    const orbitRadiusX = b.phase === 3 ? 135 : 165;
    const orbitRadiusY = b.phase === 3 ? 100 : 120;
    const tx = clamp(p.x + Math.cos(a) * orbitRadiusX, 50, game.width - 50);
    const ty = clamp(p.y + Math.sin(a) * orbitRadiusY, 55, game.height * 0.60);
    const blend = Math.min(1, dt * (b.phase === 3 ? 3.2 : 2.0));
    b.x += (tx - b.x) * blend;
    b.y += (ty - b.y) * blend;

    if (b.stalkerStateTimer <= 0 && b.stalkerDashCooldown <= 0) {
      b.stalkerState = "charge";
      b.stalkerStateTimer = b.phase === 3 ? 0.42 : 0.72;
      b.stalkerTargetX = p.x;
      b.stalkerTargetY = p.y;
      addLog("裂隙猎手停止攻击，开始蓄力。冲刺目标将在蓄力结束时锁定。");
      showToast("警告：冲刺路线预备中");
      game.hazards = game.hazards.filter(h => h.type !== "stalker-telegraph");
      game.hazards.push({
        type: "stalker-telegraph", x1: b.x, y1: b.y,
        x2: p.x, y2: p.y, life: b.stalkerStateTimer,
        maxLife: b.stalkerStateTimer,
      });
    } else if (b.stalkerStateTimer <= 0) {
      b.stalkerStateTimer = 0.25;
    }
  } else if (b.stalkerState === "charge") {
    // 红色预警跟随玩家位置；冲刺开始前才最终锁定坐标。
    const warning = game.hazards.find(h => h.type === "stalker-telegraph");
    if (warning) {
      warning.x1 = b.x; warning.y1 = b.y;
      warning.x2 = p.x; warning.y2 = p.y;
      warning.life = b.stalkerStateTimer;
      warning.maxLife = Math.max(warning.maxLife, b.stalkerStateTimer);
    }
    if (b.stalkerStateTimer <= 0) {
      b.stalkerTargetX = clamp(p.x, 25, game.width - 25);
      b.stalkerTargetY = clamp(p.y, 25, game.height - 25);
      b.stalkerStartX = b.x;
      b.stalkerStartY = b.y;
      const dx = b.stalkerTargetX - b.x;
      const dy = b.stalkerTargetY - b.y;
      const len = Math.hypot(dx, dy) || 1;
      b.stalkerDashVx = dx / len;
      b.stalkerDashVy = dy / len;
      b.stalkerDashDuration = b.phase === 3 ? 0.19 : 0.31;
      b.stalkerState = "dash";
      b.stalkerStateTimer = b.stalkerDashDuration;
      b.stalkerSideShotTimer = 0;
      b.stalkerHitPlayer = false;
      game.hazards = game.hazards.filter(h => h.type !== "stalker-telegraph");
      game.hazards.push({
        type: "stalker-slash", x1: b.x, y1: b.y,
        x2: b.stalkerTargetX, y2: b.stalkerTargetY,
        life: b.stalkerDashDuration + 0.12,
        maxLife: b.stalkerDashDuration + 0.12,
      });
    }
  } else if (b.stalkerState === "dash") {
    const duration = b.stalkerDashDuration || 0.31;
    const progress = clamp(1 - b.stalkerStateTimer / duration, 0, 1);
    b.x = b.stalkerStartX + (b.stalkerTargetX - b.stalkerStartX) * progress;
    b.y = b.stalkerStartY + (b.stalkerTargetY - b.stalkerStartY) * progress;

    // 冲刺期间沿运动方向的左右两侧发射弹幕。
    b.stalkerSideShotTimer -= dt;
    if (b.stalkerSideShotTimer <= 0) {
      const direction = Math.atan2(b.stalkerDashVy, b.stalkerDashVx);
      for (const side of [-1, 1]) {
        const a = direction + side * Math.PI / 2;
        game.enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * 175, vy: Math.sin(a) * 175,
          radius: 4.3, life: 4.5, damage: 8, color: COLORS.pink,
        });
      }
      b.stalkerSideShotTimer = 0.075;
    }

    // 冲刺本体碰到玩家时每次冲刺只结算一次伤害。
    if (!b.stalkerHitPlayer && game.invulnerable <= 0 && distance(b, p) < b.radius + p.radius) {
      damagePlayer(18);
      b.stalkerHitPlayer = true;
      emitParticles(p.x, p.y, COLORS.pink, 12, 115);
      showToast("裂隙冲撞命中");
      addLog("被裂隙猎手的冲刺路径命中，受到 18 点伤害。");
    }

    if (b.stalkerStateTimer <= 0) {
      b.x = b.stalkerTargetX;
      b.y = b.stalkerTargetY;
      spawnStalkerRing(b.x, b.y, b.phase === 3 ? 14 : 11, b.phase === 3 ? 170 : 138);
      emitParticles(b.x, b.y, COLORS.cyan, 24, 180);
      b.stalkerState = "stun";
      b.stalkerStateTimer = b.phase === 3 ? 1.0 : 3.0;
      addLog(`冲刺结束。裂隙猎手眩晕 ${b.phase === 3 ? 1 : 3} 秒。`);
    }
  } else if (b.stalkerState === "stun") {
    if (b.stalkerStateTimer <= 0) {
      b.stalkerState = "hunt";
      b.stalkerStateTimer = b.phase === 3 ? 0.8 : 1.3;
      b.stalkerDashCooldown = b.phase === 3 ? 0.45 : 0.9;
    }
  }
}

function updateStalkerTransition(dt) {
  const b = game.boss;

  // PHASE 01 -> PHASE 02：20 秒裂隙封锁，BOSS 全程隐身。
  if (b.transition === "none" && b.phase === 1 && b.hp <= b.maxHp * 0.65) {
    b.transition = "stalker_rifts";
    b.transitionTimer = 20;
    b.stalkerRiftTimer = 0;
    b.stalkerRiftCount = 0;
    b.stalkerState = "orbit";
    game.enemyBullets = [];
    game.minions = [];
    game.hazards = game.hazards.filter(h => h.type === "ultimate");
    addLog("裂隙封锁启动：猎手隐身，四个裂隙标记将依次生成。");
    showToast("警告：裂隙封锁，持续 20 秒");
  }

  if (b.transition === "stalker_rifts") {
    b.transitionTimer -= dt;
    b.stalkerRiftTimer -= dt;
    if (b.stalkerRiftTimer <= 0 && b.stalkerRiftCount < 4) {
      spawnStalkerSeal(
        rand(55, game.width - 55),
        rand(55, game.height - 55)
      );
      b.stalkerRiftCount++;
      b.stalkerRiftTimer = 5;
      addLog(`裂隙标记 ${b.stalkerRiftCount}/4 已生成。`);
    }
    if (b.transitionTimer <= 0) {
      game.hazards = game.hazards.filter(h => h.type !== "stalker-seal");
      b.transition = "none";
      b.phase = 2;
      b.x = game.width * 0.5;
      b.y = game.height * 0.34;
      b.stalkerState = "hunt";
      b.stalkerStateTimer = 1.5;
      b.stalkerDashCooldown = 1.6;
      b.attackTimer = 0.5;
      game.nextEnemyShot = game.elapsed + 0.6;
      spawnStalkerRing(b.x, b.y, 14, 145);
      ui.phaseLabel.textContent = "阶段 02 · 高速追猎";
      addLog("裂隙封锁结束。猎手在中央显形，发射环形弹幕。");
      showToast("阶段 02：高速追猎");
      emitParticles(b.x, b.y, COLORS.pink, 30, 185);
    }
    return;
  }

  // PHASE 02 -> PHASE 03：隐身，在裂隙之间连续穿梭。
  if (b.transition === "none" && b.phase === 2 && b.hp <= b.maxHp * 0.30) {
    b.transition = "stalker_warp";
    b.transitionTimer = 5.5;
    b.stalkerWarpTimer = 0.25;
    b.stalkerWarpState = "wait";
    b.stalkerWarpSource = { x: b.x, y: b.y };
    b.stalkerWarpDestination = null;
    b.stalkerWarpIndex = 0;
    game.enemyBullets = [];
    game.hazards = game.hazards.filter(h => h.type !== "ultimate");
    addLog("裂隙穿梭启动：猎手隐身，开始在空间裂隙间高速跃迁。");
    showToast("警告：裂隙穿梭");
  }

  if (b.transition === "stalker_warp") {
    b.transitionTimer -= dt;
    b.stalkerWarpTimer -= dt;

    if (b.stalkerWarpState === "wait" && b.stalkerWarpTimer <= 0 && b.transitionTimer > 0) {
      const dest = {
        x: rand(55, game.width - 55),
        y: rand(60, game.height * 0.76),
      };
      b.stalkerWarpDestination = dest;
      b.stalkerWarpState = "telegraph";
      b.stalkerWarpTimer = 0.52;
      game.hazards.push({
        type: "stalker-telegraph",
        x1: b.stalkerWarpSource.x, y1: b.stalkerWarpSource.y,
        x2: dest.x, y2: dest.y,
        life: 0.52, maxLife: 0.52,
      });
      spawnStalkerSeal(b.stalkerWarpSource.x, b.stalkerWarpSource.y);
      // 传送阶段的源裂隙不会自行消失，抵达后再销毁。
      const seal = game.hazards[game.hazards.length - 1];
      seal.type = "stalker-warp-source";
      seal.life = 6;
      seal.maxLife = 6;
    } else if (b.stalkerWarpState === "telegraph" && b.stalkerWarpTimer <= 0) {
      const dest = b.stalkerWarpDestination;
      if (dest) {
        b.stalkerStartX = b.stalkerWarpSource.x;
        b.stalkerStartY = b.stalkerWarpSource.y;
        b.stalkerTargetX = dest.x;
        b.stalkerTargetY = dest.y;
        b.stalkerWarpState = "dash";
        b.stalkerWarpTimer = b.phase === 3 ? 0.17 : 0.23;
        b.x = b.stalkerStartX;
        b.y = b.stalkerStartY;
        game.hazards = game.hazards.filter(h => h.type !== "stalker-telegraph");
      }
    } else if (b.stalkerWarpState === "dash") {
      const duration = b.phase === 3 ? 0.17 : 0.23;
      const progress = clamp(1 - b.stalkerWarpTimer / duration, 0, 1);
      b.x = b.stalkerStartX + (b.stalkerTargetX - b.stalkerStartX) * progress;
      b.y = b.stalkerStartY + (b.stalkerTargetY - b.stalkerStartY) * progress;
      const p = game.player;
      if (p && game.invulnerable <= 0 && distance(b, p) < b.radius + p.radius && !b.stalkerWarpHit) {
        damagePlayer(18);
        b.stalkerWarpHit = true;
        emitParticles(p.x, p.y, COLORS.pink, 12, 115);
      }
      if (b.stalkerWarpTimer <= 0) {
        b.x = b.stalkerTargetX;
        b.y = b.stalkerTargetY;
        // 销毁出发裂隙；到达点发射环形弹幕。
        const source = b.stalkerWarpSource;
        game.hazards = game.hazards.filter(h => !(h.type === "stalker-warp-source" && Math.hypot(h.x - source.x, h.y - source.y) < 2));
        spawnStalkerRing(b.x, b.y, 12, 155);
        emitParticles(b.x, b.y, COLORS.pink, 20, 180);
        b.stalkerWarpSource = { x: b.x, y: b.y };
        b.stalkerWarpState = "wait";
        b.stalkerWarpTimer = 0.2;
        b.stalkerWarpHit = false;
        b.stalkerWarpIndex++;
      }
    }

    if (b.transitionTimer <= 0) {
      game.hazards = game.hazards.filter(h => h.type !== "stalker-warp-source" && h.type !== "stalker-telegraph");
      b.transition = "none";
      b.phase = 3;
      b.x = game.width * 0.5;
      b.y = game.height * 0.30;
      b.stalkerState = "hunt";
      b.stalkerStateTimer = 0.8;
      b.stalkerDashCooldown = 0.45;
      game.nextEnemyShot = game.elapsed + 0.35;
      ui.phaseLabel.textContent = "阶段 03 · 裂隙过载";
      addLog("裂隙穿梭结束。猎手进入过载状态，冲刺间隔缩短。");
      showToast("阶段 03：裂隙过载");
      emitParticles(b.x, b.y, COLORS.pink, 35, 210);
    }
    return;
  }
}

function updateBossTransition(dt) {
  const b = game.boss;

  // 裂隙猎手有独立阶段转场，不套用观测者的终极螺旋。
  if (b.type === "stalker") {
    updateStalkerTransition(dt);
    return;
  }

  // 65% 血量触发大招，只会发生一次
  if (
    b.phase === 1 &&
    !b.ultimateTriggered &&
    b.hp <= b.maxHp * 0.65
  ) {
    startBossUltimate();
  }

  // 充能阶段
  if (b.transition === "charge") {
    b.transitionTimer -= dt;

    // 紫色粒子向 BOSS 汇聚
    if (Math.random() < 0.65) {
      const a = rand(0, Math.PI * 2);
      const r = rand(65, 125);

      const x = b.x + Math.cos(a) * r;
      const y = b.y + Math.sin(a) * r;

      game.particles.push({
        x,
        y,

        vx: (b.x - x) * 1.5,
        vy: (b.y - y) * 1.5,

        life: 0.55,
        maxLife: 0.55,
        r: rand(2, 4),
        color: COLORS.violet,
      });
    }

    if (b.transitionTimer <= 0) {
      b.transition = "rings";
      b.transitionTimer = 5.5;
      b.ultimateRingTimer = 0;

      addLog("观测者释放终极螺旋弹幕。");
      showToast("危险：螺旋弹幕");
    }

    return;
  }

  // 观测者终极阶段：四臂旋转螺旋 + 独立环形弹幕，保留两层弹道。
  if (b.transition === "rings") {
    b.transitionTimer -= dt;
    b.ultimateRingTimer -= dt;
    b.ultimateCircleTimer = (b.ultimateCircleTimer ?? 0.75) - dt;

    if (b.ultimateRingTimer <= 0) {
      const arms = 4;
      const speed = 165;
      for (let i = 0; i < arms; i++) {
        const a = b.ultimateSpiralAngle + i * Math.PI * 2 / arms;
        game.enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          radius: 4.5, life: 5.5, damage: 9,
          color: COLORS.violet,
        });
      }
      b.ultimateSpiralAngle += 0.115;
      b.ultimateRingTimer = 0.14;
    }

    // 每 0.82 秒补一轮完整圆环，旋转螺旋仍持续运行。
    if (b.ultimateCircleTimer <= 0) {
      const count = 12;
      const offset = b.ultimateSpiralAngle * 0.55;
      for (let i = 0; i < count; i++) {
        const a = offset + i * Math.PI * 2 / count;
        game.enemyBullets.push({
          x: b.x, y: b.y,
          vx: Math.cos(a) * 118,
          vy: Math.sin(a) * 118,
          radius: 3.8, life: 5.8, damage: 7,
          color: i % 2 ? COLORS.pink : COLORS.violet,
        });
      }
      b.ultimateCircleTimer = 0.82;
    }

    if (b.transitionTimer <= 0) finishBossUltimate();
    return;
  }

  // 大招结束后，低于 30% 血量进入第三阶段
  if (
    b.phase === 2 &&
    b.transition === "none" &&
    b.hp <= b.maxHp * 0.30
  ) {
    b.phase = 3;

    game.nextEnemyShot = game.elapsed + 0.45;

    ui.phaseLabel.textContent = "阶段 03 · 失稳";

    addLog("警告：观测结构失稳。");
    showToast("BOSS 进入失稳阶段");

    emitParticles(
      b.x,
      b.y,
      COLORS.orange,
      40,
      200
    );
  }
}

// ============================================================
// 主更新
// ============================================================

function update(dt) {
  if (DEBUG_MODE && game.player) game.player.hp = game.player.maxHp;
  if (!game.running || game.paused || game.ended) {
    return;
  }

  game.elapsed += dt;

  const p = game.player;
  const b = game.boss;

  if (!p || !b) return;

  game.shootCooldown = Math.max(0, game.shootCooldown - dt);
  game.skillCooldown = Math.max(0, game.skillCooldown - dt);
  game.dashCooldown = Math.max(0, game.dashCooldown - dt);
  game.dashTime = Math.max(0, game.dashTime - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);

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

    p.x += dx * p.speed * dt;
    p.y += dy * p.speed * dt;
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

  // 更新阶段转换
  updateBossTransition(dt);

  // 普通攻击计时
  const stalkerCanFire = b.type !== "stalker" || b.phase === 1 || b.stalkerState === "hunt";
  if (b.transition === "none" && stalkerCanFire) {
    const interval = b.type === "stalker"
      ? (b.phase === 1 ? 1.25 : b.phase === 2 ? 1.15 : 0.78)
      : (b.phase === 1 ? 1.45 : b.phase === 2 ? 0.88 : 0.68);

    if (game.elapsed >= game.nextEnemyShot) {
      spawnEnemyShotPattern();
      game.nextEnemyShot = game.elapsed + interval;
    }
  }

  // 小怪与其弹幕
  updateMinions(dt);

  // 第二阶段专属空袭
  if (
    (b.phase === 2 || (b.type === "fuse" && b.phase === 3)) &&
    b.transition === "none"
  ) {
    b.airstrikeCooldown -= dt;
    if (b.airstrikeCooldown <= 0) {
      spawnAirstrike();
      b.airstrikeCooldown = b.type === "fuse" && b.phase === 3 ? rand(4.5, 6) : rand(7, 9.5);
    }
  }

  // 玩家子弹：先检查小怪，再检查 BOSS
  for (const bullet of game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (!bullet.dead) {
      let hitMinion = false;

      for (const m of game.minions) {
        if (
          !m.dead &&
          distance(bullet, m) <
            bullet.radius + m.radius
        ) {
          bullet.dead = true;
          damageMinion(m, bullet.damage);
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
          b.transition === "none" &&
          distance(bullet, b) <
            bullet.radius + b.radius
        ) {
          bullet.dead = true;
          damageBoss(
            bullet.damage,
            bullet.x,
            bullet.y
          );
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
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;

    if (
      !bullet.dead &&
      game.invulnerable <= 0 &&
      distance(bullet, p) <
        bullet.radius + p.radius * 0.7
    ) {
      bullet.dead = true;
      damagePlayer(bullet.damage);

      emitParticles(
        p.x,
        p.y,
        COLORS.pink,
        10,
        100
      );

      showToast("核心受到冲击");
      addLog(`受到 ${bullet.damage} 点伤害。`);
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

  // 危险区域与空袭倒计时
  for (const hazard of game.hazards) {
    if (hazard.type === "airstrike") {
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
    } else {
      hazard.life -= dt;
    }
  }

  game.hazards = game.hazards.filter(hazard => {
    if (hazard.type === "airstrike" || hazard.type === "stalker-rift") {
      return !hazard.fired;
    }
    return hazard.life > 0;
  });

  // 胜负判定
  if (b.hp <= 0) {
    b.hp = 0;
    updateHUD();
    endRun(true);
    return;
  }

  if (DEBUG_MODE) p.hp = p.maxHp;
  if (!DEBUG_MODE && p.hp <= 0) {
    p.hp = 0;
    updateHUD();
    endRun(false);
    return;
  }

  updateHUD();
}

// ============================================================
// 绘制背景
// ============================================================

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

  const bossColor = b.type === "stalker" ? COLORS.cyan : b.type === "fuse" ? COLORS.orange : COLORS.violet;
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
  drawBoss();
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

// ============================================================
// 输入事件
// ============================================================

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  game.mouse.x = event.clientX - rect.left;
  game.mouse.y = event.clientY - rect.top;
}

canvas.addEventListener("pointermove", event => {
  pointerPosition(event);
  game.mouse.inside = true;
});

canvas.addEventListener("pointerenter", () => {
  game.mouse.inside = true;
});

canvas.addEventListener("pointerleave", () => {
  game.mouse.inside = false;
  game.mouse.down = false;
});

canvas.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;

  pointerPosition(event);
  game.mouse.down = true;

  canvas.setPointerCapture?.(event.pointerId);
});

window.addEventListener("pointerup", event => {
  if (event.button === 0) {
    game.mouse.down = false;
  }
});

window.addEventListener("keydown", event => {
  const key = event.key.toLowerCase();

  if (
    [
      "w", "a", "s", "d",
      " ", "arrowup", "arrowdown",
      "arrowleft", "arrowright",
    ].includes(key)
  ) {
    event.preventDefault();
  }

  game.keys.add(key);

  if (event.repeat) return;

  if (key === " " || key === "spacebar") {
    useDash();
  }

  if (key === "e") {
    useSkill();
  }

  if (key === "q") {
    useUltimate();
  }

  if (key === "escape") {
    togglePause();
  }
});

window.addEventListener("keyup", event => {
  game.keys.delete(event.key.toLowerCase());
});

window.addEventListener("blur", () => {
  game.keys.clear();
  game.mouse.down = false;

  if (game.running && !game.paused) {
    togglePause(true);
  }
});

// ============================================================
// UI 按钮
// ============================================================

ui.startButton.addEventListener("click", startCurrentMode);
ui.restartButton.addEventListener("click", startCurrentMode);

ui.resumeButton.addEventListener(
  "click",
  () => togglePause(false)
);

ui.pauseButton.addEventListener(
  "click",
  () => togglePause()
);

// 启动
resizeCanvas();
requestAnimationFrame(frame);
