
const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

// URL 调试开关：在地址后添加 ?debug=1 可开启无限生命与作弊菜单。
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
  paradox: 0, paradoxE: 0, paradoxQ: 0, paradoxR: 0, paradoxAnchor: null, paradoxRiftTimer: 0, paradoxRiftLife: 0, paradoxRiftShots: [], paradoxQActive: 0, paradoxAbsorbed: 0, paradoxShards: [],
  bulwarkAbsorbed: 0,
  singularityCharge: 10,
  skillFieldTimer: 0,
  skillFieldDamageTimer: 0,
  prismUltimateTimer: 0,
  rogueBossIndex: 0,
  rogueBossCount: 3,
  rogueContinuePending: false,
  rogueHpCarry: 100,
  rogueBuild: { damageMult: 1, speedBonus: 0, maxHpBonus: 0 },
  rogueChoices: [],
  coreBonuses: { level: 0, maxHpMult: 1, damageMult: 1, skillCooldownMult: 1, ultDamageMult: 1 },

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
  deathEffects: [],
  playerDying: false,
  playerDeathTimer: 0,
  bossDying: false,
  bossDeathTimer: 0,
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

// 统一的敌人死亡演出：实体可立即移除，视觉残影独立播放。
function spawnDeathEffect(x, y, type = "minion", color = "#ff719d", radius = 18) {
  if (!Array.isArray(game.deathEffects)) game.deathEffects = [];
  const duration = type === "boss" ? 1.9 : type === "player" ? 1.25 : type === "drone" ? 0.8 : type === "summon" ? 1.05 : 0.62;
  game.deathEffects.push({ x, y, type, color, radius, life: duration, maxLife: duration, seed: Math.random() * Math.PI * 2 });
}

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



// Debug-only cheat panel. It is intentionally absent unless ?debug=1 is present.
if (DEBUG_MODE) {
  const cheat = document.createElement("section");
  cheat.id = "debug-cheat-panel";
  cheat.innerHTML = `
    <div class="debug-cheat-head"><div><small>NULL//CORE · DEVELOPER TOOLS</small><b>作弊菜单</b></div><button type="button" id="debug-cheat-close" aria-label="关闭作弊菜单">×</button></div>
    <label class="debug-cheat-infinite"><input id="cheat-infinite-health" type="checkbox" checked> 无限生命（调试默认开启）</label>
    <div class="debug-cheat-grid">
      <label>最大生命值 <input id="cheat-max-hp" type="number" min="1" max="999999" value="100"></label>
      <label>当前生命值 <input id="cheat-hp" type="number" min="0" max="999999" value="100"></label>
      <label>伤害倍率 <select id="cheat-damage"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="5">5×</option><option value="10">10×</option><option value="50">50×</option></select></label>
      <label>技能冷却倍率 <select id="cheat-cooldown"><option value="0">0（无冷却）</option><option value="0.1">0.1×</option><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="5">5×</option></select></label>
      <label>冲刺冷却（秒） <input id="cheat-dash-cd" type="number" min="0" max="999" step="0.1" value="1.4"></label>
      <label>终结技能量 <input id="cheat-energy" type="number" min="0" max="100" value="0"></label>
      <label>当前 BOSS 生命值 <input id="cheat-boss-hp" type="number" min="1" max="999999999" value="5000"></label>
      <label>招募信标 <input id="cheat-signals" type="number" min="0" max="999999999" value="0"></label>
      <label>回收币 <input id="cheat-currency" type="number" min="0" max="999999999" value="0"></label>
    </div>
    <div class="debug-cheat-actions"><button type="button" id="cheat-apply">应用战斗数值</button><button type="button" id="cheat-full-charge">满血 / 满能量</button><button type="button" id="cheat-refresh-resources">读取资源</button><button type="button" id="cheat-apply-resources">保存资源</button></div>
    <p id="debug-cheat-status">仅在 ?debug=1 时显示。快捷键 F2 开关菜单。</p>`;
  document.body.appendChild(cheat);
  const toggle = document.createElement("button");
  toggle.id = "debug-cheat-toggle";
  toggle.type = "button";
  toggle.textContent = "⚙ 作弊菜单 [F2]";
  document.body.appendChild(toggle);
  const setStatus = (msg) => { const el = document.querySelector("#debug-cheat-status"); if (el) el.textContent = msg; };
  const readNum = (id, fallback, min, max) => {
    const n = Number(document.querySelector(`#${id}`).value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  function readResourcesIntoForm() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("nullcore.gacha.v1") || "{}"); } catch {}
    document.querySelector("#cheat-signals").value = Math.max(0, Number(saved.signalUnits ?? (Number(saved.halfPulls || 0) * 80)) || 0);
    document.querySelector("#cheat-currency").value = Math.max(0, Number(saved.currency) || 0);
  }
  function toggleCheat(force) {
    const open = typeof force === "boolean" ? force : !cheat.classList.contains("open");
    if (open && game.player) { document.querySelector("#cheat-max-hp").value = game.player.maxHp; document.querySelector("#cheat-hp").value = game.player.hp; document.querySelector("#cheat-energy").value = game.ultEnergy; if (game.boss) document.querySelector("#cheat-boss-hp").value = Math.max(1, Math.round(game.boss.maxHp)); }
    cheat.classList.toggle("open", open);
    toggle.classList.toggle("active", open);
  }
  toggle.addEventListener("click", () => toggleCheat());
  document.querySelector("#debug-cheat-close").addEventListener("click", () => toggleCheat(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "F2") { event.preventDefault(); toggleCheat(); }
  });
  document.querySelector("#cheat-apply").addEventListener("click", () => {
    const maxHp = readNum("cheat-max-hp", 100, 1, 999999);
    const hp = readNum("cheat-hp", maxHp, 0, maxHp);
    game.debugMaxHp = maxHp;
    game.debugCurrentHp = hp;
    game.debugInfiniteHealth = document.querySelector("#cheat-infinite-health").checked;
    if (game.player) { game.player.maxHp = maxHp; game.player.hp = hp; }
    game.debugDamageMult = readNum("cheat-damage", 1, 0, 50);
    game.debugCooldownMult = readNum("cheat-cooldown", 1, 0, 5);
    game.debugDashCooldown = readNum("cheat-dash-cd", 1.4, 0, 999);
    game.ultEnergy = readNum("cheat-energy", 0, 0, 100);
    const bossHp = readNum("cheat-boss-hp", 5000, 1, 999999999);
    if (game.boss) { const ratio = game.boss.maxHp > 0 ? game.boss.hp / game.boss.maxHp : 1; game.boss.maxHp = bossHp; game.boss.hp = Math.max(1, Math.min(bossHp, bossHp * ratio)); }
    setStatus("战斗数值已应用。伤害与冷却倍率会影响后续攻击/技能。");
  });
  document.querySelector("#cheat-full-charge").addEventListener("click", () => {
    if (game.player) game.player.hp = game.player.maxHp;
    game.ultEnergy = 100;
    game.skillCooldown = 0;
    game.dashCooldown = 0;
    document.querySelector("#cheat-hp").value = game.player?.maxHp ?? 100;
    document.querySelector("#cheat-energy").value = 100;
    setStatus("已恢复满血、满能量，并清空 E / 冲刺冷却。");
  });
  document.querySelector("#cheat-refresh-resources").addEventListener("click", () => { readResourcesIntoForm(); setStatus("已读取当前招募信标与回收币。"); });
  document.querySelector("#cheat-apply-resources").addEventListener("click", () => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem("nullcore.gacha.v1") || "{}"); } catch {}
    saved.signalUnits = readNum("cheat-signals", 0, 0, 999999999);
    saved.currency = readNum("cheat-currency", 0, 0, 999999999);
    delete saved.halfPulls;
    try { localStorage.setItem("nullcore.gacha.v1", JSON.stringify(saved)); } catch {}
    window.dispatchEvent(new CustomEvent("nullcore:gacha-updated"));
    setStatus("招募信标与回收币已保存到本地存档。");
  });
  readResourcesIntoForm();
  // A compact developer-only stylesheet is injected alongside the panel.
  const style = document.createElement("style");
  style.textContent = `
    #debug-cheat-toggle{position:fixed;right:16px;top:16px;z-index:10001;border:1px solid #8c7bff;background:#15152a;color:#e5e0ff;padding:10px 13px;border-radius:8px;font:600 12px system-ui;cursor:pointer;box-shadow:0 6px 24px #0008}
    #debug-cheat-toggle.active{background:#33245c}
    #debug-cheat-panel{position:fixed;z-index:10000;right:16px;top:58px;width:min(360px,calc(100vw - 32px));max-height:calc(100vh - 78px);overflow:auto;display:none;padding:16px;border:1px solid #7769cb;border-radius:12px;background:rgba(9,12,28,.97);color:#e8eaff;box-shadow:0 20px 70px #000a;font:12px/1.5 system-ui}
    #debug-cheat-panel.open{display:block} .debug-cheat-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.debug-cheat-head small{display:block;color:#9c91ed;font-size:9px;letter-spacing:.12em}.debug-cheat-head b{display:block;font-size:19px}.debug-cheat-head button{background:transparent;color:#fff;border:0;font-size:24px;cursor:pointer}
    .debug-cheat-infinite{display:flex;align-items:center;gap:8px;margin-bottom:12px;color:#c9c4ff;font-size:11px}.debug-cheat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.debug-cheat-grid label{display:flex;flex-direction:column;gap:5px;color:#aeb7d6;font-size:11px}.debug-cheat-grid input,.debug-cheat-grid select{box-sizing:border-box;width:100%;min-width:0;padding:8px;border:1px solid #343d60;border-radius:6px;background:#11182c;color:#f2f4ff;font:12px system-ui}
    .debug-cheat-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.debug-cheat-actions button{padding:9px 7px;border:1px solid #6258a9;border-radius:6px;background:#211d42;color:#eae6ff;font-size:11px;cursor:pointer}.debug-cheat-actions button:hover{background:#393064}#debug-cheat-status{margin:12px 0 0;color:#9ba7c9;font-size:10px}
  `;
  document.head.appendChild(style);
}
