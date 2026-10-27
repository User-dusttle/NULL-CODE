const $ = (selector) => document.querySelector(selector);
const lobby = $('#lobby-view');
const battle = $('#battle-view');
const homeScreen = $('#home-screen');
const subpageScreen = $('#subpage-screen');
const navOverlay = $('#navigation-overlay');
const settingsOverlay = $('#settings-overlay');

const pageInfo = {
  characters: { code:'SYSTEM / 03', kicker:'SYNCHRONIZER DIRECTORY', symbol:'◇', title:'角色与模块', description:'同步体资料尚未接入。当前默认同步体为 PRISM / 棱镜。', body:'角色详情、技能成长与几何模块将在角色系统接入后开放。', button:'返回大厅', route:'home' },
  summon: { code:'SYSTEM / 04', kicker:'SIGNAL RECONSTRUCTION', symbol:'✧', title:'召唤', description:'召唤终端尚未开放。', body:'此处将用于角色获取与资源消耗。当前不会扣除或生成任何资源。', button:'返回大厅', route:'home' },
  events: { code:'SYSTEM / 05', kicker:'ANOMALY MONITOR', symbol:'⌁', title:'边界失稳', description:'检测到异常信号，但暂未建立可进入的活动实例。', body:'限时关卡、活动任务与活动商店尚未接入。信号状态仅为界面占位。', button:'返回大厅', route:'home' },
  inventory: { code:'SYSTEM / 06', kicker:'ARCHIVE & STORAGE', symbol:'▤', title:'档案与物资', description:'尚无可读取的物资档案。', body:'此处将汇总材料、战斗记录、图鉴与成就。不会展示虚构的奖励数据。', button:'返回大厅', route:'home' },
  rift: { code:'RIFT / 00', kicker:'RIFT EXPLORATION', symbol:'⌁', title:'零域探索', description:'三处异常信号已锁定。', body:'击败不同异常体，回收强化模块，并在路线节点之间做出取舍。', button:'开始零域探索', route:'rift' },
  settings: { code:'SYSTEM / CFG', kicker:'LOCAL CONFIGURATION', symbol:'⚙', title:'系统设置', description:'调整大厅显示偏好。', body:'设置会保存在当前浏览器中。', button:'返回大厅', route:'home' }
};

function safeRead(key, fallback) {
  try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
  catch { return fallback; }
}
function safeWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
const state = safeRead('nullcore.lobby.v1', { level: 1, data: 1, lastRecord: null, reducedMotion: false });
$('#profile-level').textContent = String(state.level ?? 1).padStart(2,'0');
$('#resource-data').textContent = String(state.data ?? 1).padStart(4,'0');
$('#last-record-text').textContent = state.lastRecord || '尚无已归档的战斗记录';
$('#save-status').textContent = safeWrite('nullcore.lobby.v1', state) ? '本地状态已就绪' : '本地存储不可用';

function setHash(route) {
  const next = `#/${route}`;
  if (location.hash !== next) location.hash = next;
  else renderRoute(route);
}
function hideOverlays() {
  navOverlay.classList.add('hidden'); navOverlay.setAttribute('aria-hidden','true');
  settingsOverlay.classList.add('hidden'); settingsOverlay.setAttribute('aria-hidden','true');
  $('#nav-toggle').setAttribute('aria-expanded','false');
}
function showNav(show = true) {
  settingsOverlay.classList.add('hidden');
  navOverlay.classList.toggle('hidden', !show); navOverlay.setAttribute('aria-hidden', String(!show));
  $('#nav-toggle').setAttribute('aria-expanded', String(show));
  if (show) $('#nav-close').focus();
}
function showSettings(show = true) {
  navOverlay.classList.add('hidden');
  settingsOverlay.classList.toggle('hidden', !show); settingsOverlay.setAttribute('aria-hidden', String(!show));
  if (show) $('#settings-close').focus();
}
function renderSubpage(route) {
  const info = pageInfo[route] || pageInfo.rift;
  $('#subpage-code').textContent = info.code;
  $('#subpage-kicker').textContent = info.kicker;
  $('#subpage-symbol').textContent = info.symbol;
  $('#subpage-title').textContent = info.title;
  $('#subpage-description').textContent = info.description;
  $('#subpage-body').textContent = info.body;
  $('#subpage-primary').innerHTML = `${info.button} <span>↗</span>`;
  $('#subpage-primary').dataset.route = info.route;
}
function renderRoute(route) {
  hideOverlays();
  const isBattle = route === 'battle' || route === 'rift';
  lobby.classList.toggle('hidden', isBattle);
  battle.classList.toggle('hidden', !isBattle);
  if (isBattle) {
    if (window.setGameMode) window.setGameMode(route === 'rift' ? 'rogue' : 'standard');
    homeScreen.classList.remove('hidden');
    subpageScreen.classList.add('hidden');
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return;
  }
  if (route === 'home' || route === '') {
    homeScreen.classList.remove('hidden');
    subpageScreen.classList.add('hidden');
    $('#lobby-dialogue').textContent = '“连接仍然存在。只是没有人回应。”';
  } else {
    homeScreen.classList.add('hidden');
    subpageScreen.classList.remove('hidden');
    renderSubpage(route);
  }
}

function routeFromHash() {
   console.log("当前 hash：", location.hash);
  console.log("当前 search：", location.search);
  const hash = location.hash;
  const queryIndex = hash.indexOf("?");

  // 先剥离 Hash 路由内部的查询参数，再解析路由。
  const path = (
    queryIndex === -1 ? hash : hash.slice(0, queryIndex)
  ).replace(/^#\/?/, "").replace(/\/+$/, "");

  const route = path || "home";

  const known = [
    "home",
    "characters",
    "summon",
    "battle",
    "events",
    "inventory",
    "rift",
    "settings",
  ];

  const safeRoute = known.includes(route) ? route : "home";

  if (safeRoute !== route) {
    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#/home`
    );
  }

  if (safeRoute === "settings") {
    renderRoute("home");
    showSettings(true);
    return;
  }

  renderRoute(safeRoute);
}


document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-route]');
  if (target) { setHash(target.dataset.route); return; }
});
window.addEventListener('hashchange', routeFromHash);
$('#nav-toggle').addEventListener('click', () => showNav(navOverlay.classList.contains('hidden')));
$('#nav-close').addEventListener('click', () => { showNav(false); $('#nav-toggle').focus(); });
$('#settings-close').addEventListener('click', () => { showSettings(false); setHash('home'); });
$('#battle-home').addEventListener('click', () => setHash('home'));
$('#prism-details').addEventListener('click', () => setHash('characters'));
$('#reduced-motion').checked = Boolean(state.reducedMotion);
lobby.classList.toggle('reduce-motion', Boolean(state.reducedMotion));
$('#reduced-motion').addEventListener('change', (event) => {
  state.reducedMotion = event.target.checked;
  lobby.classList.toggle('reduce-motion', state.reducedMotion);
  $('#save-status').textContent = safeWrite('nullcore.lobby.v1', state) ? '设置已保存' : '保存失败';
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!navOverlay.classList.contains('hidden')) { showNav(false); $('#nav-toggle').focus(); return; }
    if (!settingsOverlay.classList.contains('hidden')) { showSettings(false); setHash('home'); return; }
  }
  if (event.key === 'Tab' && !event.ctrlKey && !event.altKey && !event.metaKey) {
    const active = document.activeElement;
    const inTextField = active && ['INPUT','TEXTAREA','SELECT'].includes(active.tagName);
    if (!inTextField && active === document.body && battle.classList.contains('hidden')) { event.preventDefault(); showNav(navOverlay.classList.contains('hidden')); }
  }
});
routeFromHash();
