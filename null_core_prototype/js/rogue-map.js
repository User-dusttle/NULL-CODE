// NULL//CORE roguelite map: three layers, branching routes, chip nodes and combat nodes.
(() => {
  const NODE_TYPES = [
    { type: "battle", label: "普通敌袭", icon: "⚔", desc: "清除异常体，领取基础奖励。" },
    { type: "elite", label: "精英房", icon: "✦", desc: "危险精英，奖励更丰厚。" },
    { type: "chip", label: "芯片回收", icon: "⬡", desc: "从构筑模块中选择一枚芯片。" },
    { type: "event", label: "异常事件", icon: "◇", desc: "选择一次风险与收益。" },
    { type: "repair", label: "维修站", icon: "+", desc: "恢复生命并整理构筑。" },
  ];
  const CHIPS = [
    { id: "prism-overload", title: "棱镜过载", desc: "造成的伤害提高 18%。", apply: () => { game.rogueBuild.damageMult += .18; } },
    { id: "phase-frame", title: "轻相位框架", desc: "移动速度提高 30。", apply: () => { game.rogueBuild.speedBonus += 30; } },
    { id: "core-expansion", title: "核心扩容", desc: "最大生命 +20，并恢复 20 点生命。", apply: () => { game.rogueBuild.maxHpBonus += 20; game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 20); } },
    { id: "fire-rate", title: "相位连射器", desc: "普通攻击间隔缩短 12%。", apply: () => { game.rogueBuild.fireRateMult = (game.rogueBuild.fireRateMult || 1) * .88; } },
    { id: "cooldown", title: "过载蓄能", desc: "技能冷却缩短 10%。", apply: () => { game.rogueBuild.cooldownMult = (game.rogueBuild.cooldownMult || 1) * .9; } },
    { id: "nanites", title: "急救纳米群", desc: "立即恢复 25 点生命，每层额外恢复 8 点。", apply: () => { game.rogueBuild.betweenStageHeal = (game.rogueBuild.betweenStageHeal || 0) + 8; game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 25); } },
  ];
  const CHARACTER_CHIPS = {
    traveller: [{ id: "traveller-echo", title: "回声旅途", desc: "旅者专属：伤害强化 15%，移动速度 +18。", apply: () => { game.rogueBuild.damageMult += .15; game.rogueBuild.speedBonus += 18; } }],
    bulwark: [{ id: "bulwark-armor", title: "反震装甲", desc: "壁垒专属：最大生命 +22，并恢复 22 点生命。", apply: () => { game.rogueBuild.maxHpBonus += 22; game.rogueHpCarry = Math.min(145 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 22); } }],
    singularity: [{ id: "gravity-lens", title: "引力透镜", desc: "奇点专属：伤害提高 20%。", apply: () => { game.rogueBuild.damageMult += .2; game.rogueBuild.gravityLens = (game.rogueBuild.gravityLens || 0) + 1; } }],
    phantom: [{ id: "phantom-step", title: "幽影步态", desc: "幻灵专属：移动速度 +35，技能冷却缩短 8%。", apply: () => { game.rogueBuild.speedBonus += 35; game.rogueBuild.cooldownMult = (game.rogueBuild.cooldownMult || 1) * .92; } }],
    paradox: [{ id: "paradox-loop", title: "因果回环", desc: "悖论专属：伤害提高 16%，最大生命 +12。", apply: () => { game.rogueBuild.damageMult += .16; game.rogueBuild.maxHpBonus += 12; game.rogueHpCarry += 12; } }],
    prism: [{ id: "prism-refraction", title: "折射棱镜", desc: "棱镜专属：伤害提高 16%，攻击间隔缩短 6%。", apply: () => { game.rogueBuild.damageMult += .16; game.rogueBuild.fireRateMult = (game.rogueBuild.fireRateMult || 1) * .94; } }],
  };
  const $ = (s) => document.querySelector(s);
  const overlay = () => $("#rogue-overlay");
  const board = () => $(".rogue-map-board");
  const choices = () => $(".rogue-choice-grid");
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const SAVE_KEY = "nullcore.rogue.save.v1";
  let restoringSave = false;

  function saveRogueRun() {
    if (restoringSave || game.mode !== "rogue" || !game.rogueMap) return;
    try {
      const snapshot = {
        version: 1, character: game.character, rogueLayer: game.rogueLayer,
        rogueBossIndex: game.rogueBossIndex, rogueEncounterBossIndex: game.rogueEncounterBossIndex,
        rogueNodeType: game.rogueNodeType, rogueEliteId: game.rogueEliteId || null,
        rogueMap: game.rogueMap, rogueMapRow: game.rogueMapRow,
        rogueVisited: game.rogueVisited, rogueChipIds: game.rogueChipIds,
        rogueRunSignalUnits: game.rogueRunSignalUnits || 0, rogueHpCarry: game.player?.hp ?? game.rogueHpCarry,
        rogueBuild: game.rogueBuild, rogueNodeInProgress: !!game.rogueContinuePending || (game.running && !game.ended && game.mode === "rogue"), savedAt: Date.now()
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    } catch (err) { console.warn("肉鸽存档写入失败", err); }
  }

  function loadRogueRun() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const s = JSON.parse(raw);
      if (s?.version !== 1 || !Array.isArray(s.rogueMap) || !s.rogueMap.length || !Number.isFinite(s.rogueLayer)) return false;
      restoringSave = true;
      game.rogueLayer = Math.max(1, Math.min(3, s.rogueLayer));
      game.rogueBossIndex = Number(s.rogueBossIndex) || 0;
      game.rogueEncounterBossIndex = Number(s.rogueEncounterBossIndex) || game.rogueBossIndex;
      game.rogueNodeType = s.rogueNodeType || "battle";
      game.rogueEliteId = s.rogueEliteId || null;
      game.rogueMap = s.rogueMap;
      game.rogueMapRow = Number(s.rogueMapRow) || 0;
      game.rogueVisited = Array.isArray(s.rogueVisited) ? s.rogueVisited : [];
      game.rogueChipIds = Array.isArray(s.rogueChipIds) ? s.rogueChipIds : [];
      game.rogueRunSignalUnits = Number(s.rogueRunSignalUnits) || 0;
      game.rogueHpCarry = Number.isFinite(s.rogueHpCarry) ? s.rogueHpCarry : 100;
      game.rogueBuild = s.rogueBuild && typeof s.rogueBuild === "object" ? s.rogueBuild : { damageMult: 1, speedBonus: 0, maxHpBonus: 0, fireRateMult: 1, cooldownMult: 1, betweenStageHeal: 0 };
      // A browser cannot safely resume a live battle's transient projectiles/timers.
      // Return to the map and let the player retry the node they were entering.
      const lastId = game.rogueVisited[game.rogueVisited.length - 1];
      const last = game.rogueMap.find(n => n.id === lastId);
      if (last && ["battle", "elite", "boss"].includes(last.type) && s.rogueNodeInProgress) {
        last.state = "available";
        game.rogueVisited.pop();
        game.rogueNodeType = "battle";
        game.rogueEliteId = null;
      }
      game.rogueContinuePending = false;
      restoringSave = false;
      return true;
    } catch (err) { restoringSave = false; console.warn("肉鸽存档读取失败", err); return false; }
  }

  window.clearRogueSave = function() { try { localStorage.removeItem(SAVE_KEY); } catch {} };
  window.saveRogueRun = saveRogueRun;
  window.addEventListener("pagehide", saveRogueRun);
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveRogueRun(); });

  function makeMap() {
    const rows = [];
    for (let r = 0; r < 4; r++) {
      const row = [];
      for (let c = 0; c < 3; c++) {
        let option = pick(NODE_TYPES);
        if (r === 0 && c === 1) option = { type: "battle", label: "普通敌袭", icon: "⚔", desc: "清除异常体，领取基础奖励。" };
        if (r === 3 && c === 1) option = { type: "elite", label: "精英房", icon: "✦", desc: "高风险高回报。" };
        row.push({ id: `L${game.rogueLayer}-R${r}-C${c}`, row: r, col: c, ...option, state: "locked", next: [] });
      }
      rows.push(row);
    }
    // Every node connects to same-column and adjacent-column nodes on the next row.
    for (let r = 0; r < 3; r++) for (const node of rows[r]) {
      node.next = rows[r + 1].filter(n => Math.abs(n.col - node.col) <= 1).map(n => n.id);
    }
    const boss = { id: `L${game.rogueLayer}-BOSS`, row: 4, col: 1, type: "boss", label: `第 ${game.rogueLayer} 层 BOSS`, icon: "☠", desc: "击败本层异常核心，进入下一层。", state: "locked", next: [] };
    rows[3].forEach(n => n.next = [boss.id]);
    game.rogueMap = [...rows.flat(), boss];
    game.rogueMapRow = 0;
    game.rogueVisited = [];
    game.rogueMap.forEach(n => n.state = n.row === 0 ? "available" : "locked");
    saveRogueRun();
  }

  function mapNodeClick(node) {
    if (node.state !== "available") return;
    node.state = "cleared";
    // Choosing one route closes the sibling branches on this row.
    game.rogueMap.filter(n => n.row === node.row && n.id !== node.id && n.state === "available").forEach(n => n.state = "locked");
    game.rogueVisited.push(node.id);
    saveRogueRun();
    game.rogueNodeType = node.type;
    if (node.type === "chip" || node.type === "repair" || node.type === "event") {
      if (node.type === "repair") {
        game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 35);
        showNotice("维修站已完成", "恢复 35 点生命。同步链路已稳定。", "继续前进", advanceFromNode);
      } else if (node.type === "event") {
        showChoices("异常事件", "选择一项处理方式。", [
          { title: "安全校准", desc: "恢复 24 点生命。", apply: () => { game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + 24); } },
          { title: "强行超频", desc: "伤害提高 20%，但失去 10 点生命。", apply: () => { game.rogueBuild.damageMult += .2; game.rogueHpCarry = Math.max(1, game.rogueHpCarry - 10); } },
          { title: "拆解残骸", desc: "获得一枚随机芯片。", apply: () => installChip(pick([...CHIPS, ...(CHARACTER_CHIPS[game.character] || [])])) },
        ], advanceFromNode);
      } else {
        const pool = [...CHIPS, ...(CHARACTER_CHIPS[game.character] || [])].filter(c => !game.rogueChipIds.includes(c.id));
        const available = (pool.length ? pool : CHIPS).slice().sort(() => Math.random() - .5).slice(0, 3);
        showChoices("芯片回收", "选择一枚芯片；效果持续到本次探索结束。", available.map(chip => ({ ...chip, apply: () => installChip(chip) })), advanceFromNode);
      }
      return;
    }
    if (node.type === "battle" || node.type === "elite" || node.type === "boss") {
      if (node.type === "boss") {
        game.rogueBossIndex = game.rogueLayer - 1;
        game.rogueEncounterBossIndex = game.rogueBossIndex;
      } else if (node.type === "elite") {
        // Choose the actual elite now, so the route briefing and spawned enemy cannot disagree.
        const elitePools = { 1: ["prismWarden", "riftHerald"], 2: ["shadeHound", "nullCartographer"], 3: ["meltdownSeed"] };
        const pool = elitePools[Math.min(3, Math.max(1, game.rogueLayer || 1))] || elitePools[1];
        game.rogueEliteId = pick(pool);
        game.rogueEncounterBossIndex = game.rogueLayer - 1;
      } else {
        game.rogueEliteId = null;
        game.rogueEncounterBossIndex = 0;
      }
      game.rogueContinuePending = true;
      const boss = ROGUE_BOSSES[Math.min(game.rogueEncounterBossIndex ?? 0, ROGUE_BOSSES.length - 1)];
      const eliteDef = node.type === "elite" ? ROGUE_ENEMY_DEFS?.[game.rogueEliteId] : null;
      const eliteBriefing = node.type === "elite" ? ROGUE_ELITE_BRIEFINGS?.[game.rogueEliteId] : null;
      const title = node.type === "boss" ? boss.name : node.type === "elite" ? `精英：${eliteDef?.name || "未知异常体"}` : "普通敌袭 · 异常体群";
      const subtitle = node.type === "boss" ? boss.subtitle : node.type === "elite" ? (eliteBriefing || "精英强化协议：观察攻击预警，寻找反击窗口。") : "异常体群正在接近。进入战场并清除威胁。";
      overlay().classList.add("hidden");
      const start = $("#start-overlay");
      start.classList.remove("hidden");
      start.querySelector("h2").textContent = title;
      start.querySelector(".panel-kicker").textContent = `RIFT LAYER ${game.rogueLayer} / ${node.type.toUpperCase()}`;
      start.querySelector(".start-glyph").textContent = node.icon;
      start.querySelector("p").innerHTML = `${subtitle}<br><span class="start-build-summary">构筑：伤害 ×${game.rogueBuild.damageMult.toFixed(2)} · 芯片 ${game.rogueChipIds.length} 枚 · 生命 ${Math.round(game.rogueHpCarry)}</span>`;
      saveRogueRun();
      $("#start-button").textContent = node.type === "boss" ? "挑战层级 BOSS ↗" : "进入战斗 ↗";
      return;
    }
  }

  function installChip(chip) {
    chip.apply(); game.rogueChipIds.push(chip.id); saveRogueRun();
    game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry);
  }
  function showChoices(title, copy, items, done) {
    document.querySelector(".arena-frame")?.classList.add("rogue-map-open");
    overlay().querySelector("h2").textContent = title;
    overlay().querySelector("p").textContent = copy;
    board().innerHTML = ""; choices().innerHTML = "";
    items.forEach(item => {
      const b = document.createElement("button"); b.className = "rogue-choice";
      b.innerHTML = `<span class="choice-kicker">${item.id?.startsWith("traveller-") || item.id?.startsWith("bulwark-") || item.id?.startsWith("gravity-") || item.id?.startsWith("phantom-") || item.id?.startsWith("paradox-") || item.id?.startsWith("prism-") ? "CHARACTER CHIP" : "RIFT MODULE"}</span><b>${item.title}</b><small>${item.desc}</small><span class="choice-action">选择并安装 ↗</span>`;
      b.addEventListener("click", () => { item.apply(); done(); }, { once: true }); choices().append(b);
    });
    overlay().classList.remove("hidden");
  }
  function showNotice(title, copy, label, done) {
    showChoices(title, copy, [{ title: label, desc: "返回路径图继续选择下一节点。", apply: () => {} }], done);
  }
  function showMap() {
    if (!game.rogueMap) makeMap();
    document.querySelector(".arena-frame")?.classList.add("rogue-map-open");
    const ov = overlay();
    ov.classList.remove("rogue-map-arrive"); void ov.offsetWidth; ov.classList.add("rogue-map-arrive");
    ov.querySelector("h2").textContent = `第 ${game.rogueLayer} 层 · 零域路径图`;
    ov.querySelector("p").textContent = "沿连线向上探索。每次只能进入与已完成节点相连的房间；顶端是本层 BOSS。";
    choices().innerHTML = "";
    const status = ov.querySelector(".rogue-map-status");
    status.textContent = `层级 ${game.rogueLayer}/3  ·  生命 ${Math.round(game.rogueHpCarry)}  ·  芯片 ${game.rogueChipIds.length}  ·  伤害 ×${game.rogueBuild.damageMult.toFixed(2)}`;
    status.classList.remove("map-status-arrive"); void status.offsetWidth; status.classList.add("map-status-arrive");
    const b = board(); b.innerHTML = ""; b.classList.add("rogue-tree-board");
    const W = 900, H = 600;
    const xFor = n => n.type === "boss" ? W / 2 : [W * .18, W * .5, W * .82][n.col];
    const yFor = n => n.type === "boss" ? 44 : H - 70 - n.row * 125;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("preserveAspectRatio", "none"); svg.classList.add("rogue-tree-edges");
    game.rogueMap.forEach(n => n.next.forEach(id => {
      const to = game.rogueMap.find(q => q.id === id); if (!to) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", xFor(n)); line.setAttribute("y1", yFor(n)); line.setAttribute("x2", xFor(to)); line.setAttribute("y2", yFor(to));
      line.setAttribute("class", (n.state === "cleared" && (to.state === "available" || to.state === "cleared")) ? "edge-active" : "edge-locked"); svg.append(line);
    }));
    b.append(svg);
    game.rogueMap.forEach(node => {
      const btn = document.createElement("button"); btn.className = `rogue-map-node tree-node node-${node.type} state-${node.state}`;
      btn.style.left = `${xFor(node) / W * 100}%`; btn.style.top = `${yFor(node) / H * 100}%`;
      btn.style.setProperty("--node-index", game.rogueMap.indexOf(node));
      btn.disabled = node.state !== "available";
      btn.innerHTML = `<span class="map-node-icon">${node.icon}</span><b>${node.label}</b><small>${node.state === "cleared" ? "已完成" : node.state === "locked" ? "未连通" : node.desc}</small>`;
      btn.addEventListener("click", () => mapNodeClick(node)); b.append(btn);
    });
    ov.classList.remove("hidden");
    saveRogueRun();
  }
  function advanceFromNode() {
    const current = game.rogueMap?.find(n => n.id === game.rogueVisited[game.rogueVisited.length - 1]);
    if (!current) return showMap();
    if (current.type === "boss") {
      if (game.rogueLayer >= 3) {
        const reward = typeof window.awardRoguelikeBossRecruitment === "function" ? window.awardRoguelikeBossRecruitment(2) : 0;
        game.rogueRunSignalUnits = (game.rogueRunSignalUnits || 0) + reward;
        setOverlay("result");
        ui.resultKicker.textContent = "RIFT CLEARED"; ui.resultTitle.textContent = "零域已贯通";
        ui.resultCopy.textContent = `三层路径全部完成。本次探索获得招募信标 +${game.rogueRunSignalUnits}。`; ui.restartButton.textContent = "再次探索 ↻";
        return;
      }
      game.rogueLayer++; game.rogueBossIndex = game.rogueLayer - 1; game.rogueEncounterBossIndex = game.rogueBossIndex;
      game.rogueHpCarry = Math.min(100 + game.rogueBuild.maxHpBonus, game.rogueHpCarry + (game.rogueBuild.betweenStageHeal || 8));
      makeMap(); saveRogueRun(); showMap(); return;
    }
    const next = new Set(current.next);
    game.rogueMap.forEach(n => { if (next.has(n.id) && n.state === "locked") n.state = "available"; });
    game.rogueMapRow = current.row + 1;
    saveRogueRun(); showMap();
  }
  window.startRogueMap = function(reset = false) {
    let restored = false;
    if (reset) window.clearRogueSave();
    if (!reset && !game.rogueMap) restored = loadRogueRun();
    if (reset || (!game.rogueMap && !restored)) {
      game.rogueLayer = 1; game.rogueBossIndex = 0; game.rogueEncounterBossIndex = 0; game.rogueRunSignalUnits = 0; game.rogueChipIds = []; game.rogueVisited = []; game.rogueBuild = { damageMult: 1, speedBonus: 0, maxHpBonus: 0, fireRateMult: 1, cooldownMult: 1, betweenStageHeal: 0 }; game.rogueHpCarry = game.character === "bulwark" ? 145 : game.character === "singularity" ? 90 : game.character === "phantom" ? 50 : game.character === "paradox" ? 123 : 100; makeMap();
    }
    showMap(); saveRogueRun();
  };
  window.rogueNodeResolved = function(victory) {
    if (!victory) return;
    game.rogueHpCarry = game.player ? game.player.hp : game.rogueHpCarry;
    saveRogueRun();
    const node = game.rogueMap?.find(n => n.id === game.rogueVisited[game.rogueVisited.length - 1]);
    if (!node) return;
    if (node.type === "battle" || node.type === "elite") {
      const reward = node.type === "elite" ? 22 : 10;
      game.rogueRunSignalUnits = (game.rogueRunSignalUnits || 0) + reward;
      const pool = [...CHIPS, ...(CHARACTER_CHIPS[game.character] || [])].filter(c => !game.rogueChipIds.includes(c.id));
      const options = (pool.length ? pool : CHIPS).slice().sort(() => Math.random() - .5).slice(0, node.type === "elite" ? 3 : 2);
      showChoices(node.type === "elite" ? "精英讨伐奖励" : "敌袭清除奖励", `已获得招募信标 +${reward}。选择一项战利品。`, options.map(chip => ({ ...chip, apply: () => installChip(chip) })), advanceFromNode);
      return;
    }
    if (node.type === "boss") {
      const reward = typeof window.awardRoguelikeBossRecruitment === "function" ? window.awardRoguelikeBossRecruitment(game.rogueLayer - 1) : 0;
      game.rogueRunSignalUnits = (game.rogueRunSignalUnits || 0) + reward;
      advanceFromNode();
    }
  };
  window.showRogueMap = showMap;
})();
