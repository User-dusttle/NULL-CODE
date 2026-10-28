
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

// URL 调试开关：在地址后添加 ?debug=1 可开启无限生命。
const DEBUG_MODE = new URLSearchParams(window.location.search).get("debug") === "1";

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
  singularityChargePanel: document.querySelector("#singularity-charge-panel"),
  singularityChargeBar: document.querySelector("#singularity-charge-bar"),
  singularityChargeText: document.querySelector("#singularity-charge-text"),
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
  character: (() => { try { return localStorage.getItem("nullcore.character") || "prism"; } catch { return "prism"; } })(),
  characterEnergy: 0,
  bulwarkAbsorbed: 0,
  singularityCharge: 10,
  skillFieldTimer: 0,
  prismUltimateTimer: 0,
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
  fuseDrones: [],
  fuseSummon: null,
  fuseSummons: [],

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
  // 页面初次加载时战斗区可能仍处于 display:none；此时不能把逻辑画布尺寸写成 0。
  const frame = canvas.closest(".arena-frame");
  const width = rect.width || frame?.clientWidth || 800;
  const height = rect.height || (width / 1.22) || 640;

  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));

  game.dpr = dpr;
  game.width = width;
  game.height = height;

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

