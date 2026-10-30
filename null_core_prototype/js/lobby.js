const $ = (selector) => document.querySelector(selector);
const lobby = $('#lobby-view');
const battle = $('#battle-view');
const homeScreen = $('#home-screen');
const subpageScreen = $('#subpage-screen');
const navOverlay = $('#navigation-overlay');
const settingsOverlay = $('#settings-overlay');

const pageInfo = {
  characters: { code:'SYSTEM / 03', kicker:'SYNCHRONIZER DIRECTORY', symbol:'◇', title:'角色与模块', description:'选择你的同步体。角色选择会保存在当前浏览器，并应用于下一场战斗。', body:'', button:'', route:'characters' },
  summon: { code:'SYSTEM / 04', kicker:'SIGNAL RECONSTRUCTION', symbol:'✧', title:'角色招募', description:'消耗招募信标，解析新的同步体。零域探索中的阶段进度也会带来信标。', body:'', button:'返回大厅', route:'home' },
  events: { code:'EVENT / 01', kicker:'LAUNCH PROTOCOL · 28 DAYS', symbol:'⟡', title:'启航协议', description:'完成累计签到、追踪异常清除行动，并在失序回收站兑换活动奖励。', body:'', button:'返回大厅', route:'home' },
  'event-supply': { code:'EVENT / 01-A', kicker:'LAUNCH SUPPLY', symbol:'✧', title:'启航补给', description:'累计签到与七日奖励。', body:'', button:'返回活动总览', route:'events' },
  'event-alert': { code:'EVENT / 01-B', kicker:'DEEP ALERT', symbol:'⌁', title:'异常清除行动', description:'三档警报与异常残片获取规则。', body:'', button:'返回活动总览', route:'events' },
  'event-recycle': { code:'EVENT / 01-C', kicker:'DISORDER RECLAMATION', symbol:'◈', title:'失序回收站', description:'使用异常残片兑换活动物资。', body:'', button:'返回活动总览', route:'events' },
  'enemy-archive': { code:'SYSTEM / 06', kicker:'HOSTILE ENTITY DATABASE', symbol:'⌖', title:'敌人档案', description:'已遭遇的异常实体会自动写入数据库。未遭遇目标仅显示基础索引，战斗数据将在首次遭遇后解锁。', body:'', button:'返回大厅', route:'home' },
  inventory: { code:'SYSTEM / 07', kicker:'CENTRAL STORAGE', symbol:'▤', title:'物资仓库', description:'查看招募资源、回收币、活动凭证与同步体核心库存。', body:'', button:'返回大厅', route:'home' },
  'recycle-shop': { code:'SYSTEM / 08', kicker:'WEEKLY RECLAMATION EXCHANGE', symbol:'◈', title:'回收币商城', description:'使用回收币兑换招募信标、同步体与专属核心。每周刷新限购库存。', body:'', button:'返回大厅', route:'home' },
  'battle-select': { code:'COMBAT / 01', kicker:'STANDARD COMBAT · TARGET SELECTION', symbol:'⌖', title:'常规战斗', description:'选择一个已知异常目标，进入对应战场。不同目标拥有独立的攻击模式。', body:'', button:'', route:'battle-select' },
  rift: { code:'RIFT / 00', kicker:'RIFT EXPLORATION', symbol:'⌁', title:'零域探索', description:'三处异常信号已锁定。', body:'击败不同异常体，回收强化模块，并在路线节点之间做出取舍。', button:'开始零域探索', route:'rift' },
  settings: { code:'SYSTEM / CFG', kicker:'LOCAL CONFIGURATION', symbol:'⚙', title:'系统设置', description:'调整大厅显示偏好。', body:'设置会保存在当前浏览器中。', button:'返回大厅', route:'home' }
};

function safeRead(key, fallback) {
  try { const value = localStorage.getItem(key); return value === null ? fallback : JSON.parse(value); }
  catch { return fallback; }
}
function safeWrite(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
const state = safeRead('nullcore.lobby.v1', { level: 1, data: 1, lastRecord: null, reducedMotion: false, selectedCharacter: 'prism' });
const characterDefs = {
  prism: { name:'棱镜', en:'PRISM', color:'#68efff', shape:'◇', role:'折射 / 均衡', skill:'折射脉冲', ult:'交叉棱镜', desc:'均衡型同步体。清除附近弹幕，并用稳定的持续火力击破异常体。' },
  bulwark: { name:'壁垒', en:'BULWARK', color:'#b68aff', shape:'⬡', role:'承伤 / 反弹 / 无敌散射', skill:'反弹脉冲（E）', ult:'绝对壁垒（Q）', desc:'正常承受伤害；受到伤害与每秒自动回复终结技能量。E 反弹周围弹幕并让其伤害敌人；Q 获得 10 秒无敌并吸收接触到的弹幕，结束后全部散射。' },
  singularity: { name:'奇点', en:'SINGULARITY', color:'#ff9b42', shape:'▲', role:'定点引力 / 积蓄 / 爆发', skill:'定点引力场（E）', ult:'核心坍缩（Q）', desc:'E 在施放位置放置持续 4.5 秒的引力场，强力聚集敌人、牵引弹幕并周期性造成伤害；进入核心的弹幕会被压碎。Q 在自身 320 范围内引发坍缩，基础伤害为 1000×蓄能比例；蓄能从 10% 起每秒增加 3%，最高 100%；每清除一枚弹幕额外造成 12 点伤害，最多 +240，释放后蓄能重置为 10%。' },
  paradox: { name:'悖论', en:'PARADOX', color:'#9d7cff', shape:'✧', role:'因果反转 / 弹幕转化 / 时空回溯', skill:'因果（E）', ult:'覆写（Q）/ 轮回（R）', desc:'以悖论值强化闪避。E：反转因果；Q：展开时空碎片；R：设置锚点并回溯。' },
  illusion: { name:'幻影', en:'PHANTOM', color:'#8e7bff', shape:'✧', role:'分身 / 闪避 / 诱敌', skill:'幻形（E）', ult:'幻影（Q）', desc:'SR · 生命 65，自带 30% 闪避。E 召唤 1 个 40 HP 虚像并获得 2 秒 100% 闪避；Q 召唤 5 个虚像，存活期间获得 100% 闪避、攻速与伤害 +20%。100% 闪避期间移速 +25%。' },
  phantom: { name:'幻灵', en:'PHANTOM', color:'#b49aff', shape:'◈', role:'闪避 / 反伤 / 团队增伤', skill:'幽影（E）', ult:'幽冥领域（Q）', desc:'依靠闪避与反击作战。E：幽影，短暂潜行并持续恢复生命；Q：幽冥领域，强化潜行并提升领域内对 BOSS 的伤害。' },
  fractal: { name:'分形', en:'FRACTAL', color:'#72e6c2', shape:'⧖', role:'弹幕分裂 / 连锁电流 / 多段散射', skill:'分裂（E）', ult:'电流（Q）', desc:'SR · 生命 77。普攻命中敌人后向四周散射 3 枚子弹，散射弹伤害与体积降低，且不能继续散射。E「分裂」持续 7 秒：散射弹不再降低伤害与体积，并可额外散射一次。Q「电流」持续 10 秒：所有子弹以电流连接，电流周期性伤害触及的敌人，攻速与伤害 +20%；Q 期间可以释放 E。' },
  comet: { name:'流星', en:'METEOR', color:'#b58aff', shape:'☄', role:'追踪弹幕 / 双翼齐射 / 区域轰炸', skill:'流星爆发（E）', ult:'流星陨落（Q）', desc:'SR · 生命 80。普攻发射带紫色长拖尾的追踪弹幕。E「流星爆发」一次召唤 15 枚弹幕，先向两侧展开，再自动追踪敌人。Q「流星陨落」持续 20 秒，每 2 秒随机选择场上区域，向半径 130 的范围降下流星并造成范围伤害。' },
  mechanist: { name:'机械师', en:'MECHANIST', color:'#63d8ff', shape:'⌘', role:'无人机 / 护盾 / 空袭', skill:'『防御』协议（E）', ult:'『剿灭』协议（Q）/『机械黎明』（R）', desc:'SSR · 生命 130。两架无人机自主索敌；E 获得 75 点护盾持续 5 秒；Q 持续 7 秒，无人机攻速与伤害 +30%，本体发射弹幕时追加同向弹幕；R 持续 20 秒，每 2 秒发动一次半径 100 的小范围群体空袭，覆盖范围内多个敌人。' },
  judge: { name:'裁决者', en:'ARBITER', color:'#e8d5a2', shape:'⚖', role:'群攻 / 罪孽叠层 / 处决', skill:'执行（E）', ult:'审判（Q）/ 裁决（R）', desc:'UR 常驻。被敌人命中时为其叠加罪孽；E 随机标记三个空袭落点，Q 强化弹幕并引发范围爆炸，R 独立充能并在 10 秒审判结束时处决罪孽满层小怪、重创 BOSS。' },
  aleph: { name:'阿尔法', en:'ALEPH', color:'#8ce8ff', shape:'⟡', role:'破裂叠层 / 自动追踪 / 空袭清算', skill:'启程（E）', ult:'清算（Q）', desc:'活动限定 SSR · 生命 120，每 5 秒恢复 1 点生命。普攻双发光锥；E 发射 10 枚追踪光锥；Q 持续 10 秒发射 50 枚追踪光锥，结束后对【破裂】层数最高的敌人发动空袭。' },
  traveller: { name:'旅者', en:'THE WAYFARER', color:'#e4d9ff', shape:'⟡', role:'空虚叠层 / 引爆 / 全屏终结', skill:'旅途（E）', ult:'信笺（Q）/ 旅途的尾声（R）', desc:'UR·开服限定，初始生命 100。普攻：碎片自动追击最近敌人并叠加【空虚旅途】，目标层数越高承伤越高（最多 +50%）。E「旅途」：发射 3 枚旅者之遗；低层目标增加层数，高层目标引爆并按本次降低层数提升伤害与范围。Q「信笺」：锁定空虚旅途最高的敌人，蓄力最多 10 秒后降下 1–4 道光柱；命中后叠层或引爆，触发引爆时每道光柱回复 1 点生命。R「旅途的尾声」：持续 10 秒，提升移速、攻速与伤害，每秒为全场敌人叠加 10% 空虚旅途并回复 2 点生命，获得 20% 闪避；结束时根据敌人层数造成全屏冲击波并清空层数。' }
};
function getOwnedCharacters() {
  const saved = safeRead('nullcore.gacha.v1', {});
  return new Set(['prism','bulwark','singularity', ...(Array.isArray(saved.ownedCharacters) ? saved.ownedCharacters : [])]);
}
state.selectedCharacter = characterDefs[state.selectedCharacter] && getOwnedCharacters().has(state.selectedCharacter) ? state.selectedCharacter : 'prism';
let characterDetailId = null;
try { localStorage.setItem('nullcore.character', state.selectedCharacter); } catch {}

$('#profile-level').textContent = String(state.level ?? 1).padStart(2,'0');
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

const EVENT_KEY = 'nullcore.event.v1';
const EVENT_DURATION_MS = 28 * 24 * 60 * 60 * 1000;
const EVENT_SIGNIN_REWARDS = [
  { day:1, title:'启航信标', detail:'招募信标 × 320', type:'signal', amount:320 },
  { day:2, title:'SR 同步体自选券', detail:'SR 自选 × 1', type:'srVoucher', amount:1 },
  { day:3, title:'启航信标', detail:'招募信标 × 480', type:'signal', amount:480 },
  { day:4, title:'SR 同步体自选券', detail:'SR 自选 × 1', type:'srVoucher', amount:1 },
  { day:5, title:'启航信标', detail:'招募信标 × 800', type:'signal', amount:800 },
  { day:6, title:'SSR 同步体自选券', detail:'SSR 自选 × 1', type:'ssrVoucher', amount:1 },
  { day:7, title:'启航信标', detail:'招募信标 × 1,600', type:'signal', amount:1600 },
];
const EVENT_ITEMS = [
  { id:'beacon-pack', name:'信标补给', en:'BEACON SUPPLY', icon:'✧', cost:100, desc:'招募信标 × 160 · 直接加入招募资源。', limit:10, reward:'beacon' },
  { id:'recycle-currency', name:'回收币补给', en:'RECYCLE CURRENCY', icon:'◈', cost:50, desc:'回收币 × 1,000 · 直接加入常规资源。', limit:Infinity, reward:'currency' },
  { id:'sr-select', name:'SR 自选券', en:'SR SELECTOR', icon:'◇', cost:150, desc:'SR 自选券 × 1 · 暂存于活动奖励记录。', limit:2, reward:'srVoucher' },
  { id:'ssr-select', name:'SSR 自选券', en:'SSR SELECTOR', icon:'⬡', cost:400, desc:'SSR 自选券 × 1 · 暂存于活动奖励记录。', limit:1, reward:'ssrVoucher' },
  { id:'limited-ssr', name:'阿尔法·活动限定 SSR 兑换凭证', en:'ALEPH / LIMITED SSR', icon:'✦', cost:800, desc:'兑换后获得阿尔法（Aleph）· 活动限定 SSR。每个账号限兑 1 次。', limit:1, reward:'limitedVoucher' },
  { id:'limited-core', name:'活动限定 SSR 核心', en:'LIMITED SSR CORE', icon:'⌘', cost:300, desc:'限定 SSR 核心 × 1 · 暂存活动物资，不接入限定角色养成。', limit:5, reward:'limitedCore' },
];
function readEventState() {
  const saved = safeRead(EVENT_KEY, {});
  const now = Date.now();
  return {
    tokens: Math.max(0, Math.floor(Number(saved.tokens) || 0)),
    claimed: saved.claimed && typeof saved.claimed === 'object' ? saved.claimed : {},
    rewards: Array.isArray(saved.rewards) ? saved.rewards : [],
    signInDates: Array.isArray(saved.signInDates) ? saved.signInDates : [],
    signInCount: Math.max(0, Math.min(7, Math.floor(Number(saved.signInCount) || 0))),
    signInClaims: saved.signInClaims && typeof saved.signInClaims === 'object' ? saved.signInClaims : {},
    vouchers: { sr:0, ssr:0, limited:0, limitedCore:0, ...(saved.vouchers || {}) },
    bossClears: saved.bossClears && typeof saved.bossClears === "object" ? saved.bossClears : {},
    bossDaily: saved.bossDaily && typeof saved.bossDaily === "object" ? saved.bossDaily : { date:"", tokens:0, clears:{} },
    startedAt: Number(saved.startedAt) || now,
  };
}
let eventState = readEventState();
if (!safeRead(EVENT_KEY, {}).startedAt) { safeWrite(EVENT_KEY, eventState); }
function saveEventState() { safeWrite(EVENT_KEY, eventState); }
window.completeLaunchEventBoss = function(difficulty) {
  eventState = readEventState(); const key = String(Math.max(1,Math.min(3,Number(difficulty)||1)));
  const firstClear = !eventState.bossClears[key];
  if (firstClear) { eventState.bossClears[key] = true; const beaconReward = [0,400,500,700][Number(key)]; gachaState = readGacha(); gachaState.signalUnits = (gachaState.signalUnits || 0) + beaconReward; saveGacha(); }
  const today = getTodayKey();
  if (eventState.bossDaily.date !== today) eventState.bossDaily = {date:today,tokens:0,clears:{}};
  if (!eventState.bossDaily.clears || typeof eventState.bossDaily.clears !== "object") eventState.bossDaily.clears = {};
  const dailyFirstClear = !eventState.bossDaily.clears[key];
  const reward = [0,80,120,200][Number(key)];
  const gained = dailyFirstClear ? Math.min(reward, Math.max(0,400-eventState.bossDaily.tokens)) : 0;
  if (dailyFirstClear) eventState.bossDaily.clears[key] = true;
  eventState.bossDaily.tokens += gained;
  eventState.tokens = Math.min(9999999,eventState.tokens+gained);
  eventState.rewards.push({name:`ZERO 警报 ${key} ${firstClear?'首通':'重复挑战'}`,cost:0,time:Date.now()});
  if (gained) eventState.rewards.push({name:`每日首通异常残片 +${gained}`,cost:0,time:Date.now()});
  saveEventState();
  const beacon = firstClear ? [0,400,500,700][Number(key)] : 0;
  return {firstClear,dailyFirstClear,message:`${beacon ? `首通信标 +${beacon}；` : ''}${gained ? `每日首通异常残片 +${gained}` : '今日该难度已领取过残片奖励'}${dailyFirstClear && gained<reward?'（今日获取上限已达到）':''}。`};
};
function isDeveloperMode() {
  const params = new URLSearchParams(location.search);
  if (params.get('debug') === '1' || params.get('dev') === '1') return true;
  const hashQuery = (location.hash.split('?')[1] || '');
  const hashParams = new URLSearchParams(hashQuery);
  return hashParams.get('debug') === '1' || hashParams.get('dev') === '1';
}
function eventDay() { return Math.min(28, Math.max(1, Math.floor((Date.now() - eventState.startedAt) / 86400000) + 1)); }
function getTodayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function grantEventSigninReward(reward) {
  if (reward.type === 'signal') {
    const gacha = safeRead('nullcore.gacha.v1', {});
    gacha.signalUnits = Math.max(0, Number(gacha.signalUnits) || 0) + reward.amount;
    safeWrite('nullcore.gacha.v1', gacha);
  } else if (reward.type === 'srVoucher') eventState.vouchers.sr += reward.amount;
  else if (reward.type === 'ssrVoucher') eventState.vouchers.ssr += reward.amount;
}
function claimEventSignin() {
  eventState = readEventState();
  const today = getTodayKey();
  if (eventState.signInDates.includes(today)) { renderEventPage('今日已完成签到；采用累计签到，不会因漏签重置。'); return; }
  if (Date.now() - eventState.startedAt >= EVENT_DURATION_MS) { renderEventPage('启航协议活动周期已结束。'); return; }
  eventState.signInDates.push(today);
  eventState.signInCount = Math.min(7, eventState.signInCount + 1);
  const reward = EVENT_SIGNIN_REWARDS.find(item => item.day === eventState.signInCount);
  let message = '签到成功。';
  if (reward && !eventState.signInClaims[reward.day]) {
    grantEventSigninReward(reward);
    eventState.signInClaims[reward.day] = true;
    eventState.rewards.push({ name:`签到奖励：${reward.title}`, cost:0, time:Date.now() });
    message = `签到成功，已领取：${reward.detail}。`;
  } else if (eventState.signInCount >= 7) message = '签到成功，七日累计奖励已全部领取。';
  saveEventState(); renderEventPage(message);
}
function applyEventShopReward(item) {
  if (item.reward === 'beacon') {
    const gacha = safeRead('nullcore.gacha.v1', {});
    gacha.signalUnits = Math.max(0, Number(gacha.signalUnits) || 0) + 160;
    safeWrite('nullcore.gacha.v1', gacha);
  } else if (item.reward === 'currency') {
    const gacha = safeRead('nullcore.gacha.v1', {});
    gacha.currency = Math.max(0, Number(gacha.currency) || 0) + 1000;
    safeWrite('nullcore.gacha.v1', gacha);
  } else if (item.reward === 'srVoucher') eventState.vouchers.sr++;
  else if (item.reward === 'ssrVoucher') eventState.vouchers.ssr++;
  else if (item.reward === 'limitedVoucher') eventState.vouchers.limited++;
  else if (item.reward === 'limitedCore') {
    eventState.vouchers.limitedCore++;
    const gacha = safeRead('nullcore.gacha.v1', {}); gacha.cores = {...(gacha.cores || {}), aleph: Math.max(0, Number(gacha.cores?.aleph) || 0) + 1}; safeWrite('nullcore.gacha.v1', gacha);
  }
}
function getEventSection() {
  const route = location.hash.replace(/^#\/?/, '').split('?')[0];
  return ({'event-supply':'supply','event-alert':'alert','event-recycle':'recycle'})[route] || 'home';
}
function formatEventDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
function eventSectionNav(active = '') {
  return `<nav class="launch-section-nav" aria-label="启航协议活动导航">
    <button type="button" data-route="events" class="${active==='home'?'active':''}"><span>00</span><b>活动总览</b><small>OVERVIEW</small><i>↗</i></button>
    <button type="button" data-route="event-supply" class="${active==='supply'?'active':''}"><span>01</span><b>启航补给</b><small>LAUNCH SUPPLY</small><i>↗</i></button>
    <button type="button" data-route="event-alert" class="${active==='alert'?'active':''}"><span>02</span><b>异常清除行动</b><small>DEEP ALERT</small><i>↗</i></button>
    <button type="button" data-route="event-recycle" class="${active==='recycle'?'active':''}"><span>03</span><b>失序回收站</b><small>RECLAMATION</small><i>↗</i></button>
  </nav>`;
}
function renderEventPage(message = '', section = getEventSection()) {
  eventState = readEventState();
  const dev = isDeveloperMode();
  const currentDay = eventDay();
  const signedToday = eventState.signInDates.includes(getTodayKey());
  const elapsed = Math.max(0, Date.now() - eventState.startedAt);
  const remaining = Math.max(0, Math.ceil((EVENT_DURATION_MS - elapsed) / 86400000));
  const endAt = eventState.startedAt + EVENT_DURATION_MS - 1;
  const startDate = formatEventDate(eventState.startedAt);
  const endDate = formatEventDate(endAt);
  const signInRows = EVENT_SIGNIN_REWARDS.map(reward => {
    const claimed = Boolean(eventState.signInClaims[reward.day]);
    const reached = eventState.signInCount >= reward.day;
    return `<article class="launch-reward-card ${claimed?'is-claimed':''} ${reached?'is-reached':''}">
      <span class="launch-day">DAY ${String(reward.day).padStart(2,'0')}</span><span class="launch-reward-icon">${reward.type==='signal'?'✧':reward.type==='srVoucher'?'◇':'⬡'}</span>
      <b>${reward.title}</b><small>${reward.detail}</small><em>${claimed?'已领取':reached?'已达成':'累计签到 '+reward.day+' 天'}</em></article>`;
  }).join('');
  const cards = EVENT_ITEMS.map(item => {
    const claimed = Number(eventState.claimed[item.id] || 0);
    const soldOut = Number.isFinite(item.limit) && claimed >= item.limit;
    const enough = eventState.tokens >= item.cost;
    const limitText = Number.isFinite(item.limit) ? `已兑换 ${claimed}/${item.limit}` : `已兑换 ${claimed} · 不限量`;
    return `<article class="event-shop-card ${soldOut?'is-sold':''}">
      <div class="event-item-art"><span>${item.icon}</span><i>${item.en}</i></div>
      <div class="event-item-info"><span class="event-item-en">${item.en}</span><h3>${item.name}</h3><p>${item.desc}</p>
      <div class="event-item-bottom"><span class="event-cost">◈ <b>${item.cost}</b> 异常残片</span><span class="event-limit">${limitText}</span></div>
      <button class="event-exchange-button" type="button" data-event-buy="${item.id}" ${soldOut||!enough?'disabled':''}>${soldOut?'已兑换完毕':enough?'确认兑换':'残片不足'} <span>↗</span></button></div>
    </article>`;
  }).join('');
  const recent = eventState.rewards.length
    ? eventState.rewards.slice(-6).reverse().map(r=>`<li><span>${r.name}</span><b>${r.cost ? `−${r.cost} ◈` : '已领取'}</b></li>`).join('')
    : '<li class="event-empty-log">暂无记录。签到与兑换结果会保存在本地。</li>';
  const challengeMarkup = `<div class="launch-challenge-grid"><article><span>DIFFICULTY / I</span><h4>低层警报</h4><b>80 <small>每日首通</small></b><p>基础异常清除行动。ZERO 核心完整度 10,000。</p><button type="button" data-launch-boss="1">挑战 ZERO ↗</button></article><article><span>DIFFICULTY / II</span><h4>深层警报</h4><b>120 <small>每日首通</small></b><p>更高密度的异常区域。ZERO 核心完整度 13,000。</p><button type="button" data-launch-boss="2">挑战 ZERO ↗</button></article><article><span>DIFFICULTY / III</span><h4>核心警报</h4><b>200 <small>每日首通</small></b><p>最高等级警报。ZERO 核心完整度 16,000。</p><button type="button" data-launch-boss="3">挑战 ZERO ↗</button></article></div>`;
  const alephOwned = (safeRead('nullcore.gacha.v1', {}).ownedCharacters || []).includes('aleph');
  const inventory = `<button type="button" class="event-inventory-shortcut" data-route="inventory"><span><b>物资已转入中央仓库</b><small>查看活动凭证、异常残片、招募资源与核心库存</small></span><strong>打开物资仓库 ↗</strong></button>`;
  const devPanel = dev ? `<section class="event-dev-panel"><div class="event-section-heading"><div><span class="event-overline">DEVELOPER TOOLS / ENABLED</span><h3>活动调试控制台</h3></div><span class="event-dev-badge">DEV</span></div><p>仅供本地测试。注入异常残片仅用于兑换测试；重置会清空本活动签到、代币、凭证、BOSS 首通记录和兑换记录。</p><form class="event-dev-form" id="event-dev-form"><label for="event-dev-amount">注入异常残片</label><div><input id="event-dev-amount" type="number" min="1" max="99999" step="1" value="4000"><button type="submit">注入残片</button></div></form><button type="button" class="event-reset-button" data-event-reset>重置活动测试数据</button><small>在网址参数添加 ?debug=1 或 ?dev=1 开启。仅用于本地测试，不是线上安全权限系统。</small></section>` : '';
  const commonHeader = `<header class="launch-page-top"><button type="button" class="launch-back" data-route="home">← 返回大厅</button><div><span class="event-overline">NULL//CORE / LAUNCH EVENT · 001</span><h2>启航<span>协议</span></h2></div><div class="launch-top-meta"><span>EVENT WINDOW</span><b>${remaining} <small>DAYS LEFT</small></b></div></header>`;
  let page = '';
  if (section === 'home') {
    page = `<section class="launch-dashboard"><div class="launch-dashboard-copy"><span class="event-overline"><i class="launch-title-pulse"></i> INITIALIZATION SEQUENCE <b>／ 001</b></span><h1><span class="launch-title-main">启航</span><span class="launch-title-accent">协议</span><sup>01</sup></h1><p class="launch-dashboard-en"><span>NULL//CORE</span><i></i> LAUNCH PROTOCOL</p><p class="launch-dashboard-desc">新的航程已建立。三个活动模块已接入本地终端，选择一个模块开始。</p><div class="launch-date-strip"><div><span>开放日期 / OPEN</span><b>${startDate}</b></div><i></i><div><span>结束日期 / CLOSE</span><b>${endDate}</b></div><div class="launch-days-left"><span>剩余时间</span><b>${String(remaining).padStart(2,'0')}<small> DAYS</small></b></div></div><div class="launch-dashboard-state"><i></i>${remaining>0?'协议在线':'活动周期已结束'} <span>·</span> 第 ${currentDay} / 28 天</div></div><div class="launch-dashboard-orb" aria-hidden="true"><div class="launch-orb-ring ring-a"></div><div class="launch-orb-ring ring-b"></div><div class="launch-orb-ring ring-c"></div><div class="launch-orb-core">⟡</div><span>NULL//CORE</span></div><div class="launch-module-grid"><button type="button" data-route="event-supply" class="launch-module-card supply"><span class="launch-module-no"><i>01</i><b>LOGIN REWARD</b><em>SUPPLY ARCHIVE</em></span><div class="launch-module-icon">✧</div><h3>启航补给</h3><p>累计签到 · 七日补给 · 信标与自选凭证</p><div class="launch-module-foot"><span>查看补给清单</span><b>↗</b></div></button><button type="button" data-route="event-alert" class="launch-module-card alert"><span class="launch-module-no"><i>02</i><b>ANOMALY ALERT</b><em>CONTAINMENT ZONE</em></span><div class="launch-module-icon">⌁</div><h3>异常清除行动</h3><p>三档警报 · 首通奖励 · 异常残片获取</p><div class="launch-module-foot"><span>查看行动详情</span><b>↗</b></div></button><button type="button" data-route="event-recycle" class="launch-module-card recycle"><span class="launch-module-no"><i>03</i><b>EXCHANGE TERMINAL</b><em>RECLAMATION BAY</em></span><div class="launch-module-icon">◈</div><h3>失序回收站</h3><p>兑换招募资源与活动限定物资</p><div class="launch-module-foot"><span>进入回收终端</span><b>↗</b></div></button></div><div class="launch-dashboard-footer"><span>LOCAL EVENT SIMULATION</span><span>◈ <b>${eventState.tokens.toLocaleString()}</b> ANOMALY FRAGMENTS</span><span>累计签到 ${eventState.signInCount}/7</span></div>${devPanel}</section>`;
  } else if (section === 'supply') {
    page = `<section class="launch-section-page supply-page"><aside class="launch-section-aside"><span class="event-overline">PART I / LAUNCH SUPPLY</span><div class="launch-aside-symbol">✧</div><h1>启航补给</h1><p>在活动期间累计签到，未签到的日期不会清空已有进度。每档奖励仅领取一次。</p><div class="launch-aside-stat"><span>累计签到进度</span><b>${eventState.signInCount}<small> / 7 DAYS</small></b><div class="event-progress-track"><i style="width:${eventState.signInCount/7*100}%"></i></div></div><button type="button" class="event-quiet-button" data-event-signin ${signedToday||remaining===0?'disabled':''}>${signedToday?'今日已签到':remaining===0?'活动已结束':'完成今日签到'} <span>累计签到 ${eventState.signInCount}/7</span></button><p class="launch-aside-note">固定奖励总计：3,200 信标、SR 自选 ×2、SSR 自选 ×1。</p></aside><div class="launch-section-main"><div class="event-section-heading"><div><span class="event-overline">SUPPLY MANIFEST / 7 MILESTONES</span><h3>七日累计补给</h3><p>奖励按累计签到次数解锁，不要求连续签到。</p></div><span class="event-stock-tag">3,200 BEACONS · 2 SR · 1 SSR</span></div><div class="launch-reward-grid">${signInRows}</div><div class="launch-lower-grid"><section class="event-log-panel"><div class="event-section-heading"><div><span class="event-overline">TRANSACTION HISTORY</span><h3>领取记录</h3></div></div><ul>${recent}</ul>${inventory}</section>${devPanel}</div></div></section>`;
  } else if (section === 'alert') {
    page = `<section class="launch-section-page alert-page"><aside class="launch-section-aside"><span class="event-overline">PART II / DEEP ALERT</span><div class="launch-aside-symbol">⌁</div><h1>异常清除行动</h1><p>定位异常信号，按警报等级清除目标。活动 BOSS ZERO 已接入三档挑战。</p><div class="launch-fragment-meter"><span>当前异常残片</span><b>◈ ${eventState.tokens.toLocaleString()}</b><small>ANOMALY FRAGMENTS</small></div><div class="launch-aside-rule"><b>每日获取上限</b><strong>400 <small>FRAGMENTS</small></strong><span>28 天全勤理论上限：11,200 残片</span></div></aside><div class="launch-section-main"><div class="event-section-heading"><div><span class="event-overline">ALERT LEVELS / 3 CLASSES</span><h3>行动等级</h3><p>各档首通奖励独立领取；每日首次通关对应难度可领取异常残片；重复挑战不再发放。</p></div><span class="event-stock-tag">FIRST CLEAR · 1,600 BEACONS TOTAL</span></div>${challengeMarkup}<div class="launch-alert-summary"><div><span>DIFFICULTY I</span><b>80 <small>每日首通</small></b></div><div><span>DIFFICULTY II</span><b>120 <small>每日首通</small></b></div><div><span>DIFFICULTY III</span><b>200 <small>每日首通</small></b></div></div><p class="launch-challenge-note">首通奖励总计 1,600 信标。首次通关对应难度可领取首通奖励；每个难度每日仅首通发放残片；重复挑战不发放，每日获取上限 400。</p>${devPanel}</div></section>`;
  } else {
    page = `<section class="launch-section-page recycle-page"><aside class="launch-section-aside"><span class="event-overline">PART III / DISORDER RECLAMATION</span><div class="launch-aside-symbol">◈</div><h1>失序回收站</h1><p>回收异常区域中残留的信号碎片，将其兑换为招募资源与活动物资。</p><div class="launch-fragment-meter"><span>可用异常残片</span><b id="event-token-count">◈ ${eventState.tokens.toLocaleString()}</b><small>ANOMALY FRAGMENTS</small></div><div class="launch-aside-rule"><b>限量物资总成本</b><strong>4,000 <small>FRAGMENTS</small></strong><span>兑换阿尔法后即可在「角色与模块」中选择；限定核心将计入阿尔法的核心库存。</span></div>${inventory}</aside><div class="launch-section-main"><div class="event-section-heading event-shop-heading"><div><span class="event-overline">EXCHANGE TERMINAL / STOCK LIST</span><h3>可兑换物资</h3><p>确认兑换后立即扣除残片；限量物资达到上限后将停止供应。</p></div><span class="event-stock-tag">◈ ${eventState.tokens.toLocaleString()} AVAILABLE</span></div><div class="event-shop-grid launch-shop-grid">${cards}</div><section class="aleph-exchange-panel"><div><span class="event-overline">LIMITED SYNCHRONIZER / SSR</span><h3>阿尔法 <small>ALEPH</small></h3><p>「清算开始之前，所有命中都只是倒计时。」</p><span class="aleph-exchange-status">${alephOwned ? '已加入同步体档案' : eventState.vouchers.limited > 0 ? '兑换凭证已就绪' : '需要先兑换活动限定凭证'}</span></div><button type="button" data-aleph-redeem ${(!alephOwned && eventState.vouchers.limited < 1) || (alephOwned && eventState.vouchers.limitedCore < 1) ? 'disabled' : ''}>${alephOwned ? (eventState.vouchers.limitedCore > 0 ? '转入核心库存' : '已解锁阿尔法') : '登记同步体'} <span>↗</span></button></section><div class="launch-lower-grid"><section class="event-log-panel"><div class="event-section-heading"><div><span class="event-overline">TRANSACTION HISTORY</span><h3>领取与兑换记录</h3></div></div><ul>${recent}</ul></section>${devPanel}</div></div></section>`;
  }
  $('#subpage-body').innerHTML = `<section class="event-terminal launch-event-terminal launch-page-${section}">${commonHeader}${eventSectionNav(section)}${page}<div class="event-message ${message?'visible':''}" role="status">${message}</div></section>`;
  $('#subpage-primary').classList.add('hidden');
}

function exchangeEventItem(id) {
  const item = EVENT_ITEMS.find(entry => entry.id === id);
  if (!item) return;
  eventState = readEventState();
  const claimed = Number(eventState.claimed[id] || 0);
  if (Number.isFinite(item.limit) && claimed >= item.limit) { renderEventPage('该物资已达到兑换上限。'); return; }
  if (eventState.tokens < item.cost) { renderEventPage('异常残片不足，无法完成兑换。'); return; }
  eventState.tokens -= item.cost;
  eventState.claimed[id] = claimed + 1;
  applyEventShopReward(item);
  eventState.rewards.push({ id, name:item.name, cost:item.cost, time:Date.now() });
  saveEventState();
  renderEventPage(`兑换成功：${item.name}。已按当前活动规则发放或暂存奖励。`);
}

const ENEMY_ARCHIVE_KEY = 'nullcore.enemy.archive.v1';
const ENEMY_ARCHIVE = [
  {id:'observer',name:'环形观测者',code:'OBSERVER-01',type:'BOSS',symbol:'◎',color:'#68e7ff',desc:'以旋转环形弹幕与四臂螺旋封锁战场。观察弹幕缺口，沿环形轨迹寻找安全窗口。',source:'常规战斗 / 零域探索'},
  {id:'stalker',name:'裂隙猎手',code:'RIFT-STALKER',type:'BOSS',symbol:'⌁',color:'#ff668a',desc:'高速追踪型异常体，以交叉弹道与裂隙冲刺压缩玩家的移动空间。',source:'零域探索'},
  {id:'fuse',name:'熔断主机',code:'FUSE-CORE',type:'BOSS',symbol:'⌘',color:'#bd8cff',desc:'通过区域轰击与高压弹幕制造持续压迫；战斗中会调用复现体维持护盾。',source:'零域探索'},
  {id:'zero',name:'ZERO',code:'ZERO / AUTONOMOUS',type:'EVENT BOSS',symbol:'⟡',color:'#ff705f',desc:'机械师制造的首台自主机械生命体。获得自我意识后脱离控制，被放逐至深空；现作为高危活动目标。',source:'启航协议 / 异常清除行动'},
  {id:'zeroDrone',name:'ZERO 自律无人机',code:'ZERO-DRONE',type:'SUMMON',symbol:'◇',color:'#ff8067',desc:'ZERO 召唤的自律作战单元。维持近身编队并发射追踪攻击，场上最多同时存在两架。',source:'ZERO 战斗'},
  {id:'observerEcho',name:'环形观测者「复现」',code:'OBSERVER-ECHO',type:'SUMMON',symbol:'◉',color:'#a98cff',desc:'熔断主机调用的环形观测者复现体，以环形弹幕持续覆盖场地。',source:'熔断主机战斗'},
  {id:'riftEcho',name:'裂隙猎手「复现」',code:'RIFT-ECHO',type:'SUMMON',symbol:'⌁',color:'#ff6b9a',desc:'熔断主机调用的裂隙猎手复现体，以追踪与裂隙冲刺攻击玩家。',source:'熔断主机战斗'},
  {id:'drifter',name:'游荡者',code:'ROGUE-DRIFTER',type:'HOSTILE',symbol:'·',color:'#ff9d57',desc:'低速定点型基础异常体，会周期性向玩家发射弹幕。',source:'零域探索 / 普通敌袭'},
  {id:'pulseCrawler',name:'脉冲虫',code:'ROGUE-CRAWLER',type:'HOSTILE',symbol:'⌁',color:'#ff547c',desc:'快速移动并持续发射脉冲弹幕，擅长从侧翼逼近。',source:'零域探索 / 普通敌袭'},
  {id:'spikeTurret',name:'钉刺炮台',code:'ROGUE-TURRET',type:'HOSTILE',symbol:'✣',color:'#ffd166',desc:'固定式火力单位，射击频率较高，迫使玩家及时改变站位。',source:'零域探索 / 普通敌袭'},
  {id:'aegisWeaver',name:'织盾机',code:'ROGUE-AEGIS',type:'HOSTILE',symbol:'⬡',color:'#68e1fd',desc:'缓慢移动的支援单位，以稳定火力干扰玩家推进。',source:'零域探索 / 深层区域'},
  {id:'phaseSkipper',name:'影跃者',code:'ROGUE-SKIPPER',type:'HOSTILE',symbol:'◇',color:'#bda4ff',desc:'具备相位跃迁能力的机动单位，会改变位置并从意料之外的角度发起攻击。',source:'零域探索 / 深层区域'},
  {id:'splinterMine',name:'裂变雷',code:'ROGUE-MINE',type:'HOSTILE',symbol:'✦',color:'#a6ff8f',desc:'接近后产生威胁的异常装置，通常需要优先处理。',source:'零域探索 / 核心区域'},
  {id:'prismWarden',name:'棱镜守卫',code:'ELITE-WARDEN',type:'ELITE',symbol:'◇',color:'#6ce7ff',desc:'三枚棱镜环绕核心形成护盾。击破棱镜可逐步削弱防护，护盾归零后核心过载。',source:'零域探索 / 第一层精英'},
  {id:'riftHerald',name:'裂隙牧者',code:'ELITE-HERALD',type:'ELITE',symbol:'⌘',color:'#bd8cff',desc:'持续召唤低阶单位，并在召唤物存活时获得护盾。优先清除召唤物。',source:'零域探索 / 第一层精英'},
  {id:'shadeHound',name:'逐影猎犬',code:'ELITE-HOUND',type:'ELITE',symbol:'爪',color:'#ff668a',desc:'标记玩家位置后高速突进。观察锁定预警，诱导其撞向场地边缘。',source:'零域探索 / 第二层精英'},
  {id:'nullCartographer',name:'零域测绘者',code:'ELITE-CARTOGRAPHER',type:'ELITE',symbol:'⌖',color:'#77a7ff',desc:'在玩家附近绘制延迟爆发区。持续移动并避开蓝色标记区域。',source:'零域探索 / 第二层精英'},
  {id:'meltdownSeed',name:'熔蚀核心',code:'ELITE-MELTDOWN',type:'ELITE',symbol:'✹',color:'#ff9b55',desc:'热量持续上升，弹幕随热量加速；达到过热阈值时释放大范围爆发。',source:'零域探索 / 第三层精英'},
];
function readEnemyArchive() { const v = safeRead(ENEMY_ARCHIVE_KEY, {}); return v && typeof v === 'object' ? v : {}; }
window.recordEnemyEncounter = function(id) { if (!ENEMY_ARCHIVE.some(x=>x.id===id)) return; const data=readEnemyArchive(); if (!data[id]) { data[id]={firstSeen:Date.now(),count:0}; } data[id].count=(Number(data[id].count)||0)+1; data[id].lastSeen=Date.now(); safeWrite(ENEMY_ARCHIVE_KEY,data); };
function renderEnemyArchivePage(message = '') {
  const encountered = readEnemyArchive();
  const knownCount = ENEMY_ARCHIVE.filter(e=>encountered[e.id]).length;
  const enemyCards = ENEMY_ARCHIVE.map(e=>{ const seen=encountered[e.id]; return `<article class="enemy-dossier-card ${seen?'is-logged':'is-unlogged'}" style="--enemy-color:${e.color}"><div class="enemy-dossier-art"><span>${e.symbol}</span><small>${e.type}</small><i>${e.code}</i></div><div class="enemy-dossier-info"><span class="enemy-dossier-source">${e.source}</span><h3>${e.name}</h3><p>${seen?e.desc:'尚未采集到该实体的有效战斗数据。遭遇后将自动补全档案。'}</p><footer><b>${seen?'已收录':'未遭遇'}</b><span>${seen?`遭遇记录 ${seen.count||1} 次`:'DATA NOT FOUND'}</span></footer></div></article>`; }).join('');
  $('#subpage-body').innerHTML = `<section class="archive-storage-page enemy-archive-page"><header class="archive-storage-heading"><div><span class="character-panel-label">NULL//CORE · HOSTILE ENTITY DATABASE</span><h2>敌人档案</h2><p>按实体类别收录已遭遇目标。首次进入战斗后，系统会自动记录遭遇次数并解锁对应档案。</p></div><div class="archive-storage-stat"><b>${knownCount.toString().padStart(2,'0')}</b><span>/ ${ENEMY_ARCHIVE.length} 已收录</span></div></header>${message?`<p class="character-page-message">${message}</p>`:''}<div class="enemy-dossier-toolbar"><div><b>HOSTILE ENTITY INDEX</b><span>按遭遇类型收录当前版本已出现的敌对实体</span></div><span>${knownCount} / ${ENEMY_ARCHIVE.length} RECORDS UNLOCKED</span></div><div class="enemy-dossier-grid">${enemyCards}</div></section>`;
  replayTransition($('#subpage-body'), 'enemy-archive-in');
}
function renderInventoryPage(message = '') {
  eventState = readEventState(); gachaState = readGacha();
  const coreRows = GACHA_CHARACTERS.map(c=>({c,count:Number(gachaState.cores[c.id])||0,level:Number(gachaState.coreLevels[c.id])||0})).filter(x=>x.count>0||x.level>0).map(x=>`<div class="storage-core-row" style="--enemy-color:${x.c.color}"><span class="storage-core-sigil">${x.c.shape}</span><span class="storage-core-name"><b>${x.c.name} 核心</b><small>${x.c.rarity} / ${x.c.en}</small></span><strong>× ${x.count}</strong><em>强化 ${x.level}/5</em></div>`).join('') || '<p class="storage-empty">暂无专属核心。重复招募或活动兑换可获得核心。</p>';
  const voucherRows = `<div class="storage-voucher-row"><div><b>SR 同步体自选券</b><small>可选择幻影、幻灵、分形或流星</small></div><strong>× ${eventState.vouchers.sr}</strong><button type="button" data-voucher-open="sr" ${eventState.vouchers.sr<1?'disabled':''}>使用 ↗</button></div><div class="storage-voucher-row"><div><b>SSR 同步体自选券</b><small>可选择机械师或悖论</small></div><strong>× ${eventState.vouchers.ssr}</strong><button type="button" data-voucher-open="ssr" ${eventState.vouchers.ssr<1?'disabled':''}>使用 ↗</button></div><div class="storage-voucher-row"><div><b>阿尔法限定登记凭证</b><small>用于登记活动限定 SSR</small></div><strong>× ${eventState.vouchers.limited}</strong><button type="button" data-aleph-redeem ${eventState.vouchers.limited<1?'disabled':''}>登记 ↗</button></div><div class="storage-voucher-row"><div><b>阿尔法核心归档标记</b><small>核心已计入库存；确认后清除活动暂存标记</small></div><strong>× ${eventState.vouchers.limitedCore}</strong><button type="button" data-aleph-core-transfer ${eventState.vouchers.limitedCore<1?'disabled':''}>确认归档 ↗</button></div>`;
  const records = eventState.rewards.length ? eventState.rewards.slice().reverse().slice(0,12).map(r=>`<li><span>${r.name}</span><b>${r.cost?`−${r.cost} ◈`:'已领取'}</b><small>${r.time?new Date(r.time).toLocaleString():'活动记录'}</small></li>`).join('') : '<li class="event-empty-log">暂无活动领取或兑换记录。</li>';
  $('#subpage-body').innerHTML = `<section class="archive-storage-page storage-only-page"><header class="archive-storage-heading"><div><span class="character-panel-label">NULL//CORE · CENTRAL STORAGE</span><h2>物资仓库</h2><p>所有资源、活动凭证与同步体核心均在此归档。兑换与使用会实时更新库存。</p></div><div class="archive-storage-stat"><b>03</b><span>RESOURCE TYPES</span></div></header>${message?`<p class="character-page-message">${message}</p>`:''}<div class="storage-resource-grid"><article><span>招募资源</span><b>✧ ${gachaState.signalUnits.toLocaleString()}</b><small>招募信标</small></article><article><span>常规货币</span><b>◈ ${gachaState.currency.toLocaleString()}</b><small>回收币</small></article><article><span>活动残片</span><b>⌁ ${eventState.tokens.toLocaleString()}</b><small>异常残片</small></article></div><section class="storage-panel"><div class="storage-panel-heading"><div><span>CORE INVENTORY</span><h3>同步体核心</h3></div><small>核心强化材料</small></div>${coreRows}</section><section class="storage-panel"><div class="storage-panel-heading"><div><span>EVENT VOUCHERS</span><h3>活动凭证</h3></div><small>启航协议 · 兑换所得</small></div>${voucherRows}</section><section class="storage-panel"><div class="storage-panel-heading"><div><span>TRANSACTION LOG</span><h3>活动领取与兑换记录</h3></div><small>最近 12 条</small></div><ul class="storage-history-list">${records}</ul></section></section>`;
  replayTransition($('#subpage-body'), 'central-storage-in');
}

function renderStandardBattleSelect() {
  const targets = [
    {id:'observer',name:'环形观测者',code:'OBSERVER-01',symbol:'◎',color:'#68e7ff',type:'BOSS',desc:'环形弹幕与四臂螺旋封锁。适合练习弹幕观察与走位。'},
    {id:'stalker',name:'裂隙猎手',code:'RIFT-STALKER',symbol:'⌁',color:'#ff668a',type:'BOSS',desc:'高速追踪、裂隙冲刺与交叉弹道。持续移动，避免被压缩空间。'},
    {id:'fuse',name:'熔断主机',code:'FUSE-CORE',symbol:'⌘',color:'#bd8cff',type:'BOSS',desc:'多阶段核心窗口、复现体与无人机防御网。高压综合战。'}
  ];
  $('#subpage-body').innerHTML = `<section class="standard-target-select"><div class="standard-target-heading"><span>KNOWN HOSTILE DATABASE</span><b>SELECT ONE ENCOUNTER</b></div><div class="standard-target-grid">${targets.map((t,i)=>`<button type="button" class="standard-target-card" data-standard-target="${t.id}" style="--target-color:${t.color}"><span class="standard-target-index">TARGET / 0${i+1}</span><span class="standard-target-symbol">${t.symbol}</span><span class="standard-target-type">${t.type} · ${t.code}</span><strong>${t.name}</strong><p>${t.desc}</p><span class="standard-target-action">锁定目标并进入战斗 ↗</span></button>`).join('')}</div><p class="standard-target-note">常规战斗不会影响零域探索进度；选择目标后可随时返回大厅重新选择。</p></section>`;
  replayTransition($('#subpage-body'), 'standard-target-in');
}

function renderSubpage(route) {
  const info = pageInfo[route] || pageInfo.rift;
  $('#subpage-primary').classList.remove('hidden');
  $('#subpage-code').textContent = info.code;
  $('#subpage-kicker').textContent = info.kicker;
  $('#subpage-symbol').textContent = info.symbol;
  $('#subpage-title').textContent = info.title;
  $('#subpage-description').textContent = info.description;
  if (['events','event-supply','event-alert','event-recycle'].includes(route)) {
    renderEventPage('', getEventSection());
  } else if (route === 'summon') {
    renderSummonPage();
  } else if (route === 'characters') {
    characterDetailId = null;
    renderCharactersPage();
  } else if (route === 'enemy-archive') {
    renderEnemyArchivePage();
  } else if (route === 'inventory') {
    renderInventoryPage();
  } else if (route === 'recycle-shop') {
    renderRecycleShop();
  } else if (route === 'battle-select') {
    renderStandardBattleSelect();
  } else { $('#subpage-body').textContent = info.body; }
  const primary = $('#subpage-primary');
  primary.classList.toggle('hidden', route === 'characters' || route === 'battle-select' || !info.button);
  primary.innerHTML = info.button ? `${info.button} <span>↗</span>` : '';
  primary.dataset.route = info.route;
}
function renderCharactersPage(message = '') {
  const owned = getOwnedCharacters();
  const metaById = new Map(GACHA_CHARACTERS.map(c => [c.id, c]));
  if (characterDetailId && characterDefs[characterDetailId]) {
    const id = characterDetailId;
    const c = characterDefs[id];
    const meta = metaById.get(id) || {rarity:'SSR'};
    const isOwned = owned.has(id);
    gachaState = readGacha();
    const gacha = gachaState;
    const level = gacha.coreLevels[id] || 0;
    const cores = gacha.cores[id] || 0;
    const nextEffects = ['最大生命 +8%', '基础伤害 +8%', 'E 技能冷却 -8%', 'Q 技能伤害 +10%', '最大生命 +8%，基础伤害 +8%'];
    const next = level < 5 ? nextEffects[level] : '核心强化已全部解锁';
    const roleTags = (c.role || '未知定位').split(/[／/·]/).map(x=>x.trim()).filter(Boolean).slice(0,4);
    const abilityParts = (c.ult || '未记录').split('/').map(x=>x.trim()).filter(Boolean);
    const abilityCards = [`<article class="character-ability-card"><span>TACTICAL MODULE / E</span><b>${c.skill || '未记录'}</b><p>主动战术模块。根据同步体特性改变战场局势。</p></article>`, ...abilityParts.map((ability,i)=>`<article class="character-ability-card"><span>${i===0?'ULTIMATE MODULE / Q':'AUXILIARY MODULE / R'}</span><b>${ability}</b><p>${i===0?'终结模块。需要满足能量与冷却条件后发动。':'扩展模块。拥有独立的战术循环与释放条件。'}</p></article>`) ].join('');
    const profileText = meta.desc || c.desc || '该同步体的详细战斗数据尚未归档。';
    $('#subpage-body').innerHTML = `<section class="character-detail character-detail-v2" style="--character-color:${c.color}">
      <button type="button" class="character-back-button" data-character-back><span>←</span> 返回同步体目录</button>
      <header class="character-detail-hero-v2"><div class="character-hero-gridlines" aria-hidden="true"></div><div class="character-detail-sigil"><span>${c.shape}</span><i></i></div><div class="character-detail-heading"><span class="character-detail-kicker">${meta.rarity} / SYNCHRONIZER · ${c.en}</span><h2>${c.name}</h2><p>${c.en} <i>／</i> ${meta.rarity} CLASS</p><div class="character-detail-tags">${roleTags.map(tag=>`<span>${tag}</span>`).join('')}</div><span class="character-owned-state ${isOwned?'is-owned':''}">${isOwned?'已登记 · 可投入战斗':'未解锁 · 预览档案'}</span></div><div class="character-hero-index"><small>ARCHIVE INDEX</small><b>${String(GACHA_CHARACTERS.findIndex(x=>x.id===id)+1).padStart(2,'0')}</b><i>NULL//CORE</i></div></header>
      <div class="character-detail-section-title"><span>01 / COMBAT PROFILE</span><b>战斗档案</b></div>
      <div class="character-detail-grid-v2"><section class="character-info-panel character-info-panel-v2"><span class="character-panel-label">SYNCHRONIZER PROFILE</span><h3>作战特征</h3><p>${profileText}</p><div class="character-profile-foot"><span>战斗定位</span><b>${c.role}</b></div></section><section class="character-core-panel character-core-panel-v2"><span class="character-panel-label">CORE ENHANCEMENT</span><h3>核心强化</h3>${isOwned?`<div class="character-core-level"><strong>${level}<small>/ 5</small></strong><span>当前强化阶级</span></div><div class="character-core-track"><i style="width:${level*20}%"></i></div><div class="character-core-inventory"><span>专属核心库存</span><b>${cores}</b></div><p>${next}</p><button type="button" class="character-core-button" data-core-use="${id}" ${cores<1||level>=5?'disabled':''}>${level>=5?'已达强化上限':cores<1?'核心不足':'消耗 1 个专属核心强化'}</button>`:`<div class="character-preview-lock"><b>CORE DATA SEALED</b><p>首次获得该同步体后，核心库存与强化模块将在此处开放。</p></div>`}</section></div>
      <div class="character-detail-section-title"><span>02 / MODULE CONFIGURATION</span><b>技能模块</b></div><div class="character-ability-grid">${abilityCards}</div>
      <footer class="character-detail-footer"><div><span>REGISTRATION STATUS</span><b>${isOwned?'已录入本地同步体数据库':'仅开放只读预览'}</b></div><div><span>DATA SOURCE</span><b>NULL//CORE LOCAL ARCHIVE</b></div></footer>
      <div class="character-detail-actions">${isOwned?`<button type="button" data-character="${id}" class="character-equip-button">${state.selectedCharacter===id?'当前出战同步体':'设为出战同步体'}</button>`:'<span class="character-preview-note">预览模式不会解锁角色，也不会改变当前出战配置。</span>'}</div>${message?`<p class="character-page-message" role="status">${message}</p>`:''}
    </section>`;
    replayTransition($('#subpage-body'), 'character-view-in');
    return;
  }
  const groups = ['UR','SSR','SR','R'];
  const labels = {UR:'超稀有同步体',SSR:'高稀有同步体',SR:'稀有同步体',R:'基础同步体'};
  const cards = groups.map(rarity => {
    const list = GACHA_CHARACTERS.filter(c => c.rarity === rarity);
    if (!list.length) return '';
    return `<section class="character-rarity-group rarity-group-${rarity.toLowerCase()}"><div class="character-rarity-heading"><div><span>RARITY / ${rarity}</span><h3>${labels[rarity]}</h3></div><b>${list.filter(c=>owned.has(c.id)).length} / ${list.length} 已登记</b></div><div class="character-roster-grid">${list.map(c => { const isOwned=owned.has(c.id); const def=characterDefs[c.id]; return `<button type="button" class="character-roster-card ${isOwned?'is-owned':'is-locked'}" data-character-open="${c.id}" style="--character-color:${c.color}"><span class="character-roster-sigil">${c.shape}</span><span class="character-roster-rarity">${c.rarity}${c.id==='aleph'?' · LIMITED':''}</span><strong>${c.name}</strong><small>${c.en}</small><em>${def?.role||c.role||'未知定位'}</em><span class="character-roster-status">${isOwned?'已登记':'未解锁 · 可预览'} <b>↗</b></span></button>`; }).join('')}</div></section>`;
  }).join('');
  $('#subpage-body').innerHTML = `<section class="character-archive"><div class="character-archive-summary"><div><span class="character-panel-label">SYNCHRONIZER DIRECTORY</span><h2>同步体档案</h2><p>按品质浏览全部同步体。点击任意条目查看技能、定位与核心强化信息；未解锁角色也可预览。</p></div><div class="character-archive-count"><b>${owned.size}</b><span>/ ${GACHA_CHARACTERS.length} 已登记</span></div></div>${message?`<p class="character-page-message" role="status">${message}</p>`:''}${cards}</section>`;
  replayTransition($('#subpage-body'), 'character-view-in');
}
const GACHA_KEY = 'nullcore.gacha.v1';
const GACHA_CHARACTERS = [
  { id:'prism', name:'棱镜', en:'PRISM', rarity:'R', color:'#68efff', shape:'◇', role:'折射 / 均衡' },
  { id:'bulwark', name:'壁垒', en:'BULWARK', rarity:'R', color:'#b68aff', shape:'⬡', role:'承伤 / 反弹' },
  { id:'singularity', name:'奇点', en:'SINGULARITY', rarity:'R', color:'#ff9b42', shape:'▲', role:'引力 / 爆发' },
  { id:'mechanist', name:'机械师', en:'MECHANIST', rarity:'SSR', color:'#63d8ff', shape:'⌘', role:'无人机 / 护盾 / 空袭', desc:'SSR · 生命 130。双无人机自主索敌；E 75 护盾持续 5 秒；Q 持续 7 秒强化无人机并追加同向弹幕；R 持续 20 秒，每 2 秒发动一次半径 100 的小范围群体空袭，中心 200 伤害、范围 150 伤害。', rate:0.8 },
  { id:'aleph', name:'阿尔法', en:'ALEPH', rarity:'SSR', color:'#8ce8ff', shape:'⟡', role:'破裂叠层 / 追踪 / 空袭清算', desc:'活动限定 SSR · 生命 120。每 5 秒回复 1 点生命；普攻双发光锥，E「启程」发射 10 枚追踪光锥，Q「清算」持续 10 秒发射 50 枚追踪光锥并空袭最高破裂目标。仅可通过启航协议兑换。', eventOnly:true },
  { id:'paradox', name:'悖论', en:'PARADOX', rarity:'SSR', color:'#9d7cff', shape:'✧', role:'因果反转 / 时空回溯', rate:0.8 },
  { id:'illusion', name:'幻影', en:'PHANTOM', rarity:'SR', color:'#8e7bff', shape:'✧', role:'分身 / 闪避 / 诱敌', rate:5 },
  { id:'phantom', name:'幻灵', en:'PHANTOM', rarity:'SR', color:'#b49aff', shape:'◈', role:'闪避 / 反伤 / 团队增伤', rate:5 },
  { id:'fractal', name:'分形', en:'FRACTAL', rarity:'SR', color:'#72e6c2', shape:'⧖', role:'弹幕分裂 / 连锁电流', rate:5 },
  { id:'comet', name:'流星', en:'METEOR', rarity:'SR', color:'#b58aff', shape:'☄', role:'追踪弹幕 / 双翼齐射 / 区域轰炸', rate:5 },
  { id:'judge', name:'裁决者', en:'ARBITER', rarity:'UR', color:'#e8d5a2', shape:'⚖', role:'群攻 / 罪孽叠层 / 处决', desc:'常驻 UR · 生命 80。E「执行」随机锁定三个空袭位置；Q「审判」持续 7 秒，攻速与伤害 +20%，命中触发 75% 范围爆炸；R「裁决」独立充能，持续 10 秒并在结束时处决罪孽满层小怪、对 BOSS 造成最高 1000 点伤害。', rate:0.4 },
  { id:'traveller', name:'旅者', en:'THE WAYFARER', rarity:'UR', color:'#e4d9ff', shape:'⟡', role:'空虚叠层 / 引爆 / 全屏终结', desc:'开服限定 UR · 生命 100。普攻自动追踪并叠加空虚旅途；E 三枚遗物叠层或引爆，Q 蓄力光柱精准打击高层目标，R 强化 10 秒后以全屏冲击波收尾。仅在开服限定招募开放期间出现。', rate:0.3, limitedOnly:true, banner:{title:'旅途尽头，仍有星光',subtitle:'THE WAYFARER · LIMITED UR',quote:'“我走过的路，终会成为你的坐标。”',tag:'FIRST LIGHT / LIMITED SIGNAL',motif:'⟡',theme:'traveller'} },
];
function readGacha() {
  const saved = safeRead(GACHA_KEY, {});
  const data = {
    signalUnits: Math.max(0, Number(saved.signalUnits ?? ((Number(saved.halfPulls) || 0) * 80)) || 0),
    currency: Math.max(0, Number(saved.currency) || 0),
    cores: { prism:0, bulwark:0, singularity:0, illusion:0, phantom:0, fractal:0, comet:0, paradox:0, traveller:0, judge:0, mechanist:0, aleph:0, ...(saved.cores || {}) },
    coreLevels: { prism:0, bulwark:0, singularity:0, illusion:0, phantom:0, fractal:0, comet:0, paradox:0, traveller:0, judge:0, mechanist:0, aleph:0, ...(saved.coreLevels || {}) },
    ownedCharacters: [...new Set(['prism','bulwark','singularity', ...(Array.isArray(saved.ownedCharacters) ? saved.ownedCharacters : [])])],
    history: Array.isArray(saved.history) ? saved.history.slice(0, 30) : [],
    srPity: Math.max(0, Number(saved.srPity) || 0),
    ssrPity: Math.max(0, Number(saved.ssrPity) || 0),
    urPity: Math.max(0, Number(saved.urPity) || 0),
    activePool: ['limited','standard','event'].includes(saved.activePool) ? saved.activePool : 'limited',
  };
  for (const c of GACHA_CHARACTERS) {
    data.cores[c.id] = Math.max(0, Number(data.cores[c.id]) || 0);
    data.coreLevels[c.id] = Math.max(0, Math.min(5, Number(data.coreLevels[c.id]) || 0));
  }
  return data;
}
let gachaState = readGacha();
updateHeaderResources();
function saveGacha() { safeWrite(GACHA_KEY, gachaState); updateHeaderResources(); }
function updateHeaderResources() { const s=document.querySelector('#resource-signal'); const c=document.querySelector('#resource-currency'); if(s) s.textContent=String(gachaState.signalUnits||0).toLocaleString(); if(c) c.textContent=String(gachaState.currency||0).toLocaleString(); }
function totalPulls() { return Math.floor(gachaState.signalUnits / 160); }
function renderSummonPage(message = '') {
  gachaState = readGacha();
  const owned = new Set(gachaState.ownedCharacters || ['prism','bulwark','singularity']);
  const tabs = [ ['limited','限定招募'], ['standard','常驻招募'], ['event','活动招募'] ];
  const currentPool = tabs.find(t => t[0] === gachaState.activePool)?.[1] || '限定招募';
  const availablePulls = totalPulls();
  const srLeft = Math.max(0, 10 - gachaState.srPity);
  const poolCharacters = GACHA_CHARACTERS.filter(c => !c.eventOnly && (!c.limitedOnly || gachaState.activePool === 'limited'));
  // 每个限定 UP 角色只需在角色数据中配置 banner，即可获得独立主题。
  const featured = gachaState.activePool === 'limited' ? GACHA_CHARACTERS.find(c => c.limitedOnly && c.banner) : null;
  const banner = featured?.banner || {title:'从虚空中，重构新的同步体。',subtitle:'NULL//CORE · RECRUITMENT SYSTEM',quote:'每一次同步，都是一次未知的相遇。',tag:`${currentPool.toUpperCase()} / SIGNAL ARCHIVE`,motif:'✧',theme:'standard'};
  const history = gachaState.history.length ? gachaState.history.slice(0, 8).map(h => `<li><span>${h.pool}</span><b>${h.name}</b><small>${h.rarity} · ${h.time}</small></li>`).join('') : '<li class="gacha-empty-history">尚无招募记录</li>';
  $('#subpage-body').innerHTML = `<section class="gacha-terminal">
    <div class="gacha-banner ${banner.theme==='traveller'?'gacha-banner-traveller':''}" data-banner-theme="${banner.theme}" style="--banner-color:${featured?.color||'#68efff'}"><div class="gacha-banner-grid"></div><div class="gacha-banner-orbit orbit-one"></div><div class="gacha-banner-orbit orbit-two"></div><div class="gacha-banner-copy"><span class="gacha-overline">${banner.subtitle}</span><h2>${banner.title}</h2><p>${featured ? `${banner.quote}<br>${featured.desc}` : `${banner.quote}<br>每 10 抽至少获得 1 名 SR。限定角色仅在对应 UP 招募开放期间加入限定池。`}</p><div class="gacha-banner-tag">${banner.tag}</div></div><div class="gacha-banner-emblem">${banner.motif}</div>${featured?`<div class="gacha-featured-name"><span>FEATURED SYNCHRONIZER</span><strong>${featured.name}</strong><em>${featured.en} / ${featured.rarity} RATE UP · 0.3%</em></div>`:''}</div>
    <div class="gacha-resource-row"><div class="gacha-resource"><span>招募信号</span><b>${gachaState.signalUnits} <small>招募信标</small></b><em>可招募 ${availablePulls} 次</em></div><div class="gacha-resource"><span>回收币</span><b>◈ ${gachaState.currency}</b><em>用于后续兑换商店</em></div><div class="gacha-resource"><span>完整探索奖励</span><b>+80 信标</b><em>击败全部 3 个 BOSS</em></div></div>
    <div class="gacha-pool-tabs">${tabs.map(([id,label]) => `<button type="button" data-pool="${id}" class="${gachaState.activePool===id?'active':''}">${label}</button>`).join('')}</div>
    <div class="gacha-pool-info"><div><span class="gacha-overline">CURRENT POOL</span><h3>${currentPool}${gachaState.activePool==='limited'?' · 旅者开服限定 UP':' · 常规招募'}</h3><p>${gachaState.activePool==='limited'?'开服限定期间，UR「旅者」仅在本限定池开放，基础招募概率 0.3%；旅者首次招募解锁角色，不赠送核心，重复招募才获得专属核心。活动结束后将从所有卡池移除。':'本卡池不包含开服限定 UR「旅者」。初始 R 级同步体与其他可用角色仍可招募；首次招募解锁角色，重复招募才获得专属核心。'}</p></div><button type="button" class="gacha-rate-toggle" data-show-rates>概率与规则</button></div>
    <div class="gacha-actions"><button type="button" class="gacha-pull-button" data-gacha-pull="1" ${availablePulls < 1?'disabled':''}><span>单次招募</span><b>消耗 160 信标</b></button><button type="button" class="gacha-pull-button ten-pull" data-gacha-pull="10" ${availablePulls < 10?'disabled':''}><span>十次招募</span><b>消耗 1600 信标</b></button></div>
    <p class="gacha-hint">单抽消耗 160 招募信标，十连消耗 1600。击败第 1 个 BOSS 获得 20，第 2 个再获得 30；击败全部 3 个 BOSS 后，本次探索累计获得 80 信标。</p>
    <div class="gacha-message ${message?'visible':''}" role="status">${message}</div>
    <section class="gacha-rate-panel hidden" id="gacha-rate-panel"><h3>当前测试池规则</h3><ul><li>旅者（UR）：仅限开服限定招募，基础概率 0.3%（活动结束后移出卡池）</li><li>悖论（SSR）：基础概率 0.8%</li><li>幻影、幻灵、分形、流星（SR）：合计基础概率 5%</li><li>壁垒、奇点、棱镜（R）：其余基础概率</li><li>SR 保底：连续未获得 SR 时，第 10 抽必定获得 SR（幻影、幻灵、分形或流星）。当前 SR 保底进度：${gachaState.srPity}/10。</li><li>SSR 保底：第 80 抽触发；UR 保底：第 160 抽触发并优先结算。旅者只计入开服限定池的可招募名单，限定活动结束后不再进入任何卡池。</li><li>重复角色获得 1 个专属核心；每名角色最多消耗 5 个核心强化。达到 5 阶后再次抽中该角色，核心自动转换为 10 回收币。</li></ul></section>
    <section class="gacha-history"><div class="gacha-section-heading"><div><span class="gacha-overline">SIGNAL LOG</span><h3>最近招募记录</h3></div><button type="button" class="gacha-rate-toggle" data-clear-history>清空记录</button></div><ul>${history}</ul></section>
  </section>`;
}
function performGacha(count) {
  const cost = count * 160;
  if (gachaState.signalUnits < cost) { renderSummonPage(count === 10 ? '招募信标不足：十连需要 1600 个信标。' : '招募信标不足：单抽需要 160 个信标。'); return; }
  gachaState.signalUnits -= cost;
  const results = [];
  for (let i=0;i<count;i++) {
    const poolCharacters = GACHA_CHARACTERS.filter(c => !c.eventOnly && (!c.limitedOnly || gachaState.activePool === 'limited'));
    const availableSSR = poolCharacters.filter(c => c.rarity === 'SSR');
    const availableUR = poolCharacters.filter(c => c.rarity === 'UR');
    let character;
    if (availableUR.length && gachaState.urPity >= 159) { character = availableUR[Math.floor(Math.random() * availableUR.length)]; }
    else if (availableSSR.length && gachaState.ssrPity >= 79) { character = availableSSR[Math.floor(Math.random() * availableSSR.length)]; }
    else if (gachaState.srPity >= 9) { const srPool=GACHA_CHARACTERS.filter(c=>c.rarity==='SR'); character=srPool[Math.floor(Math.random()*srPool.length)]; }
    else { const roll = Math.random() * 100; character = roll < 0.4 ? GACHA_CHARACTERS.find(c=>c.id==='judge') : roll < 0.7 && gachaState.activePool === 'limited' ? GACHA_CHARACTERS.find(c=>c.id==='traveller') : roll < 1.5 ? GACHA_CHARACTERS.filter(c=>c.rarity==='SSR'&&!c.eventOnly)[Math.floor(Math.random()*GACHA_CHARACTERS.filter(c=>c.rarity==='SSR'&&!c.eventOnly).length)] : roll < 6.5 ? GACHA_CHARACTERS.filter(c=>c.rarity==='SR')[Math.floor(Math.random()*GACHA_CHARACTERS.filter(c=>c.rarity==='SR').length)] : GACHA_CHARACTERS[Math.floor(Math.random()*3)]; }
    if (character.rarity === 'SR' || character.rarity === 'SSR' || character.rarity === 'UR') gachaState.srPity = 0; else gachaState.srPity++;
    if (character.rarity === 'SSR' || character.rarity === 'UR') gachaState.ssrPity = 0; else gachaState.ssrPity++;
    if (character.rarity === 'UR') gachaState.urPity = 0; else gachaState.urPity++;
    let resultText = '获得 1 个专属核心';
    const alreadyOwned = (gachaState.ownedCharacters || []).includes(character.id);
    if (!alreadyOwned) {
      gachaState.ownedCharacters.push(character.id);
      resultText = '首次招募：解锁角色（不赠送核心）';
    } else if ((gachaState.coreLevels[character.id] || 0) >= 5) {
      const unitPrice = ({ R:10, SR:25, SSR:60, UR:150 })[character.rarity] || 10;
      gachaState.currency += unitPrice;
      resultText = `核心已满阶，回收获得 ${unitPrice} 回收币`;
    } else {
      gachaState.cores[character.id] = (gachaState.cores[character.id] || 0) + 1;
    }
    const record = { name:character.name, rarity:character.rarity, pool:({limited:'限定',standard:'常驻',event:'活动'}[gachaState.activePool]), time:new Date().toLocaleString(), result:resultText };
    gachaState.history.unshift(record); results.push({ ...character, resultText });
  }
  gachaState.history = gachaState.history.slice(0,30);
  saveGacha();
  const resultMarkup = results.map((c,i)=>`<div class="gacha-result-card rarity-${String(c.rarity).toLowerCase()}" style="--rarity-color:${c.color}"><span>${i+1}</span><div class="gacha-result-shape">${c.shape}</div><small>${c.rarity}</small><b>${c.name}</b><em>${c.resultText}</em></div>`).join('');
  const resultOverlay = document.createElement('div');
  resultOverlay.className = 'gacha-result-overlay is-summoning';
  resultOverlay.innerHTML = `<div class="gacha-summon-flash" aria-hidden="true"><div class="summon-ring"></div><div class="summon-core">✧</div><span>RECONSTRUCTING SIGNAL</span></div><div class="gacha-result-dialog"><span class="gacha-overline">SIGNAL RECONSTRUCTION COMPLETE</span><h2>${count===10?'十次招募结果':'招募结果'}</h2><p>首次招募的角色已解锁，不会赠送核心；已拥有角色重复招募后获得核心。UR「旅者」仅在开服限定池开放期间可招募，活动结束后永久移出所有招募池。</p><div class="gacha-result-grid ${count===10?'is-ten':''}">${resultMarkup}</div><button type="button" class="gacha-pull-button" data-close-results>确认</button></div>`;
  document.body.appendChild(resultOverlay);
  window.setTimeout(() => { resultOverlay.classList.remove('is-summoning'); resultOverlay.classList.add('is-revealed'); }, 1150);
  renderSummonPage(`${count===10?'十连':'单抽'}完成。${results.map(c=>c.name).join('、')}。`);
}

function replayTransition(el, className = "screen-arrive") {
  if (!el || state.reducedMotion || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
  window.setTimeout(() => el.classList.remove(className), 720);
}

let lastRenderedRoute = null;
function isEventRoute(route) { return ['events','event-supply','event-alert','event-recycle'].includes(route); }
function playLaunchSequence() {
  const overlay = document.createElement('div');
  overlay.className = 'launch-sequence-overlay';
  overlay.innerHTML = `<div class="launch-sequence-noise"></div><div class="launch-sequence-mark"><span>NULL</span><i>//</i><span>CORE</span></div><div class="launch-sequence-orbit"><b></b><b></b><b></b></div><p class="launch-sequence-label">ESTABLISHING EVENT CONNECTION</p><div class="launch-sequence-progress"><i></i></div><small>LAUNCH PROTOCOL · 001</small>`;
  document.body.appendChild(overlay);
  const reduced = state.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  window.setTimeout(() => { overlay.classList.add('sequence-exit'); window.setTimeout(() => overlay.remove(), reduced ? 0 : 520); }, reduced ? 50 : 2200);
}
function renderRoute(route) {
  const enteringEvent = isEventRoute(route) && !isEventRoute(lastRenderedRoute);
  lastRenderedRoute = route;
  hideOverlays();
  const isBattle = route === 'battle' || route === 'rift';
  if (!isBattle) window.setLaunchEventBossDifficulty?.(0);
  lobby.classList.toggle('hidden', isBattle);
  battle.classList.toggle('hidden', !isBattle);
  if (isBattle) {
    if (window.setGameMode) window.setGameMode(route === 'rift' ? 'rogue' : 'standard');
    homeScreen.classList.remove('hidden');
    subpageScreen.classList.add('hidden');
    replayTransition(battle);
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return;
  }
  if (route === 'home' || route === '') {
    homeScreen.classList.remove('hidden');
    subpageScreen.classList.add('hidden');
    replayTransition(homeScreen);
    $('#lobby-dialogue').textContent = '“连接仍然存在。只是没有人回应。”';
  } else {
    homeScreen.classList.add('hidden');
    subpageScreen.classList.remove('hidden');
    renderSubpage(route);
    replayTransition(subpageScreen);
    if (enteringEvent) playLaunchSequence();
  }
}
window.awardRoguelikeBossRecruitment = function(bossIndex) {
  const rewards = [20, 30, 30]; // 前两阶段累计 50；完整通关总计 80。
  const amount = rewards[bossIndex] || 0;
  if (!amount) return 0;
  gachaState = readGacha();
  gachaState.signalUnits += amount;
  saveGacha();
  return amount;
};

function routeFromHash() {
  const route = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'home';
  const known = ['home','characters','summon','battle','battle-select','events','event-supply','event-alert','event-recycle','enemy-archive','inventory','recycle-shop','rift','settings'];
  const safeRoute = known.includes(route) ? route : 'home';
  if (safeRoute !== route) history.replaceState(null, '', `${location.pathname}${location.search}#/home`);
  if (safeRoute === 'settings') { renderRoute('home'); showSettings(true); return; }
  renderRoute(safeRoute);
}

let alephRegistrationRunning = false;
function playAlephRegistrationAnimation(onComplete) {
  if (alephRegistrationRunning) return;
  alephRegistrationRunning = true;
  const reduced = Boolean(state.reducedMotion) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const overlay = document.createElement('div');
  overlay.className = `aleph-registration-overlay${reduced ? ' reduced' : ''}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', '阿尔法同步体登记');
  overlay.innerHTML = `
    <div class="aleph-reg-noise" aria-hidden="true"></div>
    <div class="aleph-reg-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <div class="aleph-reg-content">
      <div class="aleph-reg-kicker">NULL//CORE · SYNCHRONIZATION AUTHORITY</div>
      <div class="aleph-reg-orbit" aria-hidden="true"><span class="aleph-reg-orbit-ring ring-a"></span><span class="aleph-reg-orbit-ring ring-b"></span><span class="aleph-reg-orbit-ring ring-c"></span><b>⟡</b><em></em></div>
      <div class="aleph-reg-code">LIMITED SSR / ALEPH-01</div>
      <h2>同步体登记</h2>
      <p class="aleph-reg-line">正在校验限定权限……</p>
      <div class="aleph-reg-progress"><i></i></div>
      <div class="aleph-reg-status">ESTABLISHING LINK <span>···</span></div>
    </div>`;
  document.body.append(overlay);
  const line = overlay.querySelector('.aleph-reg-line');
  const status = overlay.querySelector('.aleph-reg-status');
  const messages = [
    ['正在校验限定权限……', 'VERIFYING EVENT AUTHORIZATION'],
    ['检测到有效同步体信号。', 'SIGNATURE CONFIRMED'],
    ['正在建立意识映射……', 'MAPPING SYNCHRONIZATION MATRIX'],
    ['阿尔法，登记完成。', 'ALEPH LINK ESTABLISHED']
  ];
  let index = 0;
  const interval = reduced ? 180 : 620;
  const step = () => {
    index++;
    if (index < messages.length) {
      line.textContent = messages[index][0];
      status.innerHTML = `${messages[index][1]} <span>···</span>`;
      window.setTimeout(step, interval);
      return;
    }
    overlay.classList.add('complete');
    window.setTimeout(() => {
      overlay.classList.add('leaving');
      window.setTimeout(() => {
        overlay.remove();
        alephRegistrationRunning = false;
        onComplete();
      }, reduced ? 40 : 420);
    }, reduced ? 100 : 520);
  };
  window.setTimeout(step, interval);
}
function redeemAlephOrCores() {
  eventState = readEventState();
  const gacha = safeRead('nullcore.gacha.v1', {});
  const alreadyOwned = (Array.isArray(gacha.ownedCharacters) ? gacha.ownedCharacters : []).includes('aleph');
  if (!alreadyOwned && eventState.vouchers.limited < 1) { renderEventPage('缺少阿尔法兑换凭证。'); return; }
  if (!alreadyOwned) gacha.ownedCharacters = [...new Set([...(Array.isArray(gacha.ownedCharacters) ? gacha.ownedCharacters : []), 'aleph'])];
  const coreCount = Math.max(0, Number(eventState.vouchers.limitedCore) || 0);
  // 限定核心兑换时已进入 gacha.cores.aleph；此处只清除暂存标记，防止重复发放。
  eventState.vouchers.limitedCore = 0;
  if (!alreadyOwned) eventState.vouchers.limited = Math.max(0, Number(eventState.vouchers.limited) || 0) - 1;
  safeWrite('nullcore.gacha.v1', gacha);
  saveEventState();
  const msg = alreadyOwned ? `已确认归档 ${coreCount} 个阿尔法核心；核心库存未重复增加。` : '阿尔法（Aleph）已登记。同步体已加入档案，请前往「角色与模块」选择。';
  if (location.hash.includes('/inventory')) renderInventoryPage(msg); else renderEventPage(msg);
}
const VOUCHER_OPTIONS = {
  sr: ['illusion','phantom','fractal','comet'],
  // SSR 自选券仅包含常驻 SSR；活动限定阿尔法仍通过独立活动凭证获取。
  ssr: ['mechanist','paradox'],
};
function closeVoucherSelector() { document.querySelector('.voucher-selector-overlay')?.remove(); }
function openVoucherSelector(type) {
  eventState = readEventState();
  if (!['sr','ssr'].includes(type) || eventState.vouchers[type] < 1) {
    if (location.hash.includes('/inventory')) renderInventoryPage('没有可使用的对应自选券。'); else renderEventPage('没有可使用的对应自选券。'); return;
  }
  const options = VOUCHER_OPTIONS[type].map(id => {
    const c = GACHA_CHARACTERS.find(item => item.id === id);
    const owned = getOwnedCharacters().has(id);
    const description = c.desc || c.role;
    return `<button type="button" class="voucher-choice-card ${owned?'owned':''}" data-voucher-pick="${id}" style="--rarity-color:${c.color}"><span class="voucher-choice-symbol">${c.shape}</span><span class="voucher-choice-rarity">${c.rarity} / SYNCHRONIZER</span><strong>${c.name}</strong><small>${c.en}</small><p>${description}</p><em>${owned?'已拥有 · 选择后转化为 1 个专属核心':'未解锁 · 选择后加入同步体档案'}</em><b>选择该同步体　↗</b></button>`;
  }).join('');
  const overlay = document.createElement('div');
  overlay.className = 'voucher-selector-overlay';
  overlay.innerHTML = `<section class="voucher-selector-dialog" role="dialog" aria-modal="true" aria-labelledby="voucher-selector-title"><button type="button" class="voucher-selector-close" data-voucher-close aria-label="关闭">×</button><span class="event-overline">SYNCHRONIZER SELECTION / ${type.toUpperCase()}</span><h2 id="voucher-selector-title">${type==='sr'?'SR':'SSR'} 同步体自选</h2><p>选择一名同步体使用自选券。确认后立即发放，无法撤销。</p><div class="voucher-choice-grid">${options}</div><footer><span>持有 ${eventState.vouchers[type]} 张 ${type.toUpperCase()} 自选券</span><button type="button" data-voucher-close>暂不选择</button></footer></section>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeVoucherSelector(); });
  document.body.appendChild(overlay);
}
function claimVoucherCharacter(id) {
  eventState = readEventState();
  const type = Object.keys(VOUCHER_OPTIONS).find(key => VOUCHER_OPTIONS[key].includes(id));
  const c = GACHA_CHARACTERS.find(item => item.id === id);
  if (!type || !c || eventState.vouchers[type] < 1) { closeVoucherSelector(); if (location.hash.includes('/inventory')) renderInventoryPage('自选券状态已变化，请重新打开选择界面。'); else renderEventPage('自选券状态已变化，请重新打开选择界面。'); return; }
  gachaState = readGacha();
  const owned = gachaState.ownedCharacters.includes(id);
  eventState.vouchers[type]--;
  let message;
  if (owned) {
    if ((gachaState.coreLevels[id] || 0) >= 5) {
      const value = ({SR:25,SSR:60})[c.rarity] || 25;
      gachaState.currency = Math.max(0, Number(gachaState.currency) || 0) + value;
      message = `${c.name} 已达到核心强化上限，自选奖励已自动回收为 ${value} 回收币。`;
    } else {
      gachaState.cores[id] = Math.max(0, Number(gachaState.cores[id]) || 0) + 1;
      message = `${c.name} 已拥有，已将本次自选转化为 1 个专属核心。`;
    }
  } else {
    gachaState.ownedCharacters = [...new Set([...gachaState.ownedCharacters, id])];
    message = `${c.name} 已加入同步体档案！可前往「角色与模块」进行选择。`;
  }
  saveGacha();
  eventState.rewards.push({name:`${type.toUpperCase()} 自选：${c.name}${owned?'（转化为核心）':''}`,cost:0,time:Date.now()});
  saveEventState();
  closeVoucherSelector();
  if (location.hash.includes('/inventory')) renderInventoryPage(message); else renderEventPage(message);
}

// 回收币商城：以本地 ISO 周为周期刷新限购次数。
function currentShopWeek() {
  const d = new Date(); const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = utc.getUTCDay() || 7; utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(),0,1));
  const week = Math.ceil((((utc-yearStart)/86400000)+1)/7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}
const RECYCLE_SHOP_KEY = 'nullcore.recycle-shop.v1';
const RECYCLE_SHOP_ITEMS = [
  {id:'beacon',name:'招募信标 × 10',en:'BEACON PACK',cost:50,limit:160,kind:'beacon',desc:'获得 10 个招募信标'},
  {id:'sr',name:'SR 同步体自选',en:'SR SELECTOR',cost:1000,limit:2,kind:'character',rarity:'SR',desc:'从已开放的 SR 同步体中选择一名'},
  {id:'ssr',name:'SSR 同步体自选',en:'SSR SELECTOR',cost:5000,limit:1,kind:'character',rarity:'SSR',desc:'从常驻 SSR 同步体中选择一名'},
  {id:'sr-core',name:'SR 核心自选',en:'SR CORE SELECTOR',cost:800,limit:2,kind:'core',rarity:'SR',desc:'仅可选择已拥有的 SR 同步体核心'},
  {id:'ssr-core',name:'SSR 核心自选',en:'SSR CORE SELECTOR',cost:4500,limit:1,kind:'core',rarity:'SSR',desc:'仅可选择已拥有的 SSR 同步体核心'},
  {id:'ur-core',name:'UR 核心自选',en:'UR CORE SELECTOR',cost:8000,limit:1,kind:'core',rarity:'UR',desc:'仅可选择已拥有的 UR 同步体核心'}
];
function readRecycleShop() {
  const week=currentShopWeek(); const saved=safeRead(RECYCLE_SHOP_KEY,{});
  if(saved.week!==week) { const fresh={week,purchases:{}}; safeWrite(RECYCLE_SHOP_KEY,fresh); return fresh; }
  return {week,purchases:saved.purchases||{}};
}
function renderRecycleShop(message='') {
  gachaState=readGacha(); const stock=readRecycleShop();
  const cards=RECYCLE_SHOP_ITEMS.map(item=>{const bought=Number(stock.purchases[item.id])||0; const left=Math.max(0,item.limit-bought); return `<article class="recycle-currency-card"><span class="recycle-currency-code">${item.en}</span><div class="recycle-currency-symbol">${item.kind==='beacon'?'✧':item.kind==='core'?'⬡':'◇'}</div><h3>${item.name}</h3><p>${item.desc}</p><div class="recycle-currency-meta"><b>◈ ${item.cost.toLocaleString()}</b><span>本周剩余 ${left}/${item.limit}</span></div><button type="button" data-weekly-buy="${item.id}" ${left<1||gachaState.currency<item.cost?'disabled':''}>${left<1?'本周已售罄':gachaState.currency<item.cost?'回收币不足':'兑换' } <i>↗</i></button></article>`;}).join('');
  $('#subpage-body').innerHTML=`<section class="recycle-currency-shop"><header class="recycle-currency-head"><div><span>WEEKLY STOCK / ${stock.week}</span><h2>回收币商城</h2><p>每周一刷新全部商品限购次数。兑换成功后立即扣除回收币并发放奖励。</p></div><div class="recycle-currency-wallet"><small>当前持有</small><b>◈ ${gachaState.currency.toLocaleString()}</b><span>回收币</span><em>✧ ${gachaState.signalUnits.toLocaleString()} 信标</em></div></header>${message?`<p class="character-page-message">${message}</p>`:''}<div class="recycle-currency-grid">${cards}</div><p class="recycle-currency-footnote">核心自选只显示已拥有且核心强化未满阶的同步体；角色自选若选中已拥有角色，将转化为该角色的 1 个核心。</p></section>`;
}
let pendingRecyclePurchase=null;
function openRecyclePurchase(itemId) {
  const item=RECYCLE_SHOP_ITEMS.find(x=>x.id===itemId); if(!item)return;
  gachaState=readGacha(); const stock=readRecycleShop();
  if((Number(stock.purchases[item.id])||0)>=item.limit||gachaState.currency<item.cost){renderRecycleShop('库存或回收币状态已变化，请刷新后重试。');return;}
  if(item.kind==='beacon'){completeRecyclePurchase(item,null);return;}
  const owned=getOwnedCharacters();
  const options=GACHA_CHARACTERS.filter(c=>c.rarity===item.rarity&&(item.kind==='character'?(!c.eventOnly&&!c.limitedOnly):(owned.has(c.id)&&(Number(gachaState.coreLevels[c.id])||0)<5)));
  if(!options.length){renderRecycleShop(item.kind==='core'?'没有符合条件的已拥有角色核心可供选择。':'当前没有可选角色。');return;}
  pendingRecyclePurchase=item;
  const overlay=document.createElement('div'); overlay.className='voucher-selector-overlay';
  overlay.innerHTML=`<section class="voucher-selector-dialog" role="dialog" aria-modal="true"><button type="button" class="voucher-selector-close" data-recycle-cancel>×</button><span class="event-overline">RECYCLE EXCHANGE / ${item.rarity}</span><h2>${item.name}</h2><p>${item.kind==='core'?'只能选择已拥有且尚未达到核心满阶的同步体。':'选择一名同步体；若已拥有，将转化为专属核心。'}</p><div class="voucher-choice-grid">${options.map(c=>`<button type="button" class="voucher-choice-card" data-recycle-pick="${c.id}" style="--rarity-color:${c.color}"><span class="voucher-choice-symbol">${c.shape}</span><span class="voucher-choice-rarity">${c.rarity} / SYNCHRONIZER</span><strong>${c.name}</strong><small>${c.en}</small><em>${owned.has(c.id)?`已拥有 · 核心库存 ${gachaState.cores[c.id]||0}`:'未解锁 · 兑换后加入档案'}</em><b>选择并兑换 ↗</b></button>`).join('')}</div><footer><span>消耗 ◈ ${item.cost.toLocaleString()}</span><button type="button" data-recycle-cancel>取消</button></footer></section>`;
  overlay.addEventListener('click',e=>{if(e.target===overlay){pendingRecyclePurchase=null;overlay.remove();}}); document.body.appendChild(overlay);
}
function completeRecyclePurchase(item, characterId) {
  gachaState=readGacha(); const stock=readRecycleShop();
  if(gachaState.currency<item.cost||(Number(stock.purchases[item.id])||0)>=item.limit){document.querySelector('.voucher-selector-overlay')?.remove();pendingRecyclePurchase=null;renderRecycleShop('兑换失败：回收币不足或本周库存已用完。');return;}
  gachaState.currency-=item.cost; let message='';
  if(item.kind==='beacon'){gachaState.signalUnits+=10;message='已兑换 10 个招募信标。';}
  else {
    const c=GACHA_CHARACTERS.find(x=>x.id===characterId); if(!c||c.rarity!==item.rarity){gachaState.currency+=item.cost;saveGacha();renderRecycleShop('选择目标无效，未扣除回收币。');return;}
    const owned=gachaState.ownedCharacters.includes(characterId);
    if(item.kind==='core'){
      if(!owned||(Number(gachaState.coreLevels[characterId])||0)>=5){gachaState.currency+=item.cost;saveGacha();renderRecycleShop('核心兑换条件不满足，未扣除回收币。');return;}
      gachaState.cores[characterId]=(Number(gachaState.cores[characterId])||0)+1; message=`已获得 ${c.name} 专属核心 ×1。`;
    } else if(owned){gachaState.cores[characterId]=(Number(gachaState.cores[characterId])||0)+1;message=`${c.name} 已拥有，奖励转化为专属核心 ×1。`;}
    else {gachaState.ownedCharacters=[...new Set([...gachaState.ownedCharacters,characterId])];message=`${c.name} 已加入同步体档案。`;}
  }
  stock.purchases[item.id]=(Number(stock.purchases[item.id])||0)+1; safeWrite(RECYCLE_SHOP_KEY,stock); saveGacha();
  const overlay=document.querySelector('.voucher-selector-overlay'); if(overlay)overlay.remove(); pendingRecyclePurchase=null; renderRecycleShop(message);
}

function transferAlephCoresToStorage() {
  eventState = readEventState(); gachaState = readGacha();
  const count = Math.max(0, Number(eventState.vouchers.limitedCore) || 0);
  if (!count) { renderInventoryPage('没有可转入的阿尔法核心。'); return; }
  // 兑换时核心已计入阿尔法核心库存；此处只清除活动暂存标记，避免重复入账。
  eventState.vouchers.limitedCore = 0; saveEventState();
  renderInventoryPage(`已确认归档 ${count} 个阿尔法核心；核心库存不会重复增加。`);
}

document.addEventListener('click', (event) => {
  const weeklyBuy=event.target.closest('[data-weekly-buy]');
  if(weeklyBuy){openRecyclePurchase(weeklyBuy.dataset.weeklyBuy);return;}
  const recyclePick=event.target.closest('[data-recycle-pick]');
  if(recyclePick&&pendingRecyclePurchase){completeRecyclePurchase(pendingRecyclePurchase,recyclePick.dataset.recyclePick);return;}
  if(event.target.closest('[data-recycle-cancel]')){document.querySelector('.voucher-selector-overlay')?.remove();pendingRecyclePurchase=null;return;}
  const standardTarget = event.target.closest('[data-standard-target]');
  if (standardTarget) { window.setStandardBattleTarget?.(standardTarget.dataset.standardTarget); setHash('battle'); return; }
  if (event.target.closest('[data-aleph-core-transfer]')) { transferAlephCoresToStorage(); return; }
  const voucherOpen = event.target.closest('[data-voucher-open]');
  if (voucherOpen) { openVoucherSelector(voucherOpen.dataset.voucherOpen); return; }
  if (event.target.closest('[data-voucher-close]')) { closeVoucherSelector(); return; }
  const voucherPick = event.target.closest('[data-voucher-pick]');
  if (voucherPick) { claimVoucherCharacter(voucherPick.dataset.voucherPick); return; }
  if (event.target.closest('[data-aleph-redeem]')) {
    const gacha = safeRead('nullcore.gacha.v1', {});
    const alreadyOwned = (Array.isArray(gacha.ownedCharacters) ? gacha.ownedCharacters : []).includes('aleph');
    if (alephRegistrationRunning) return;
    if (!alreadyOwned) {
      eventState = readEventState();
      if (eventState.vouchers.limited < 1) { renderEventPage('缺少阿尔法兑换凭证。'); return; }
      playAlephRegistrationAnimation(redeemAlephOrCores);
    } else {
      redeemAlephOrCores();
    }
    return;
  }
  const eventBuy = event.target.closest('[data-event-buy]');
  if (eventBuy) { exchangeEventItem(eventBuy.dataset.eventBuy); return; }
  if (event.target.closest('[data-event-signin]')) { claimEventSignin(); return; }
  if (event.target.closest('[data-event-reset]')) {
    if (confirm('确定重置活动代币、兑换次数与记录？此操作不可撤销。')) {
      eventState = {tokens:0,claimed:{},rewards:[],signInDates:[],signInCount:0,signInClaims:{},bossClears:{},bossDaily:{date:'',tokens:0,clears:{}},vouchers:{sr:0,ssr:0,limited:0,limitedCore:0},startedAt:Date.now()}; saveEventState(); renderEventPage('活动测试数据已重置。');
    }
    return;
  }
  const pullButton = event.target.closest('[data-gacha-pull]');
  if (pullButton) { performGacha(Number(pullButton.dataset.gachaPull)); return; }
  if (event.target.closest('[data-close-results]')) { document.querySelector('.gacha-result-overlay')?.remove(); renderSummonPage(); return; }
  const poolButton = event.target.closest('[data-pool]');
  if (poolButton) { const terminal = $('#subpage-body'); terminal?.classList.remove('pool-switch-in'); terminal?.classList.add('pool-switch-out'); window.setTimeout(() => { gachaState.activePool = poolButton.dataset.pool; saveGacha(); renderSummonPage(); const body = $('#subpage-body'); body?.classList.remove('pool-switch-out'); replayTransition(body, 'pool-switch-in'); }, 140); return; }
  if (event.target.closest('[data-show-rates]')) { $('#gacha-rate-panel')?.classList.toggle('hidden'); return; }
  if (event.target.closest('[data-clear-history]')) { gachaState.history = []; saveGacha(); renderSummonPage('招募记录已清空。'); return; }
  const characterOpen = event.target.closest('[data-character-open]');
  if (characterOpen) { characterDetailId = characterOpen.dataset.characterOpen; renderCharactersPage(); return; }
  if (event.target.closest('[data-character-back]')) { characterDetailId = null; renderCharactersPage(); return; }
  const coreButton = event.target.closest('[data-core-use]');
  if (coreButton) {
    const id = coreButton.dataset.coreUse;
    if ((gachaState.cores[id] || 0) > 0 && (gachaState.coreLevels[id] || 0) < 5) {
      gachaState.cores[id]--;
      gachaState.coreLevels[id]++;
      const c = GACHA_CHARACTERS.find(item => item.id === id);
      let conversionMessage = '';
      if (gachaState.coreLevels[id] >= 5 && gachaState.cores[id] > 0) {
        const surplus = gachaState.cores[id];
        const unitPrice = ({ R:10, SR:25, SSR:60, UR:150 })[c.rarity] || 10;
        gachaState.currency += surplus * unitPrice;
        gachaState.cores[id] = 0;
        conversionMessage = `，多余 ${surplus} 个核心自动回收为 ${surplus * unitPrice} 回收币`;
      }
      saveGacha();
      characterDetailId = id;
      renderCharactersPage(`${c.name}核心强化提升至 ${gachaState.coreLevels[id]}/5${conversionMessage}。`);
    }
    return;
  }
  const characterButton = event.target.closest('[data-character]');
  if (characterButton) {
    const id = characterButton.dataset.character;
    if (characterDefs[id] && getOwnedCharacters().has(id)) {
      state.selectedCharacter = id;
      try { localStorage.setItem('nullcore.character', id); } catch {}
      safeWrite('nullcore.lobby.v1', state);
      window.dispatchEvent(new Event('nullcore:character-changed'));
      if (typeof window.refreshBattleCharacterInfo === 'function') window.refreshBattleCharacterInfo();
      characterDetailId = id;
      renderCharactersPage();
      syncLobbyCharacter();
      const c = characterDefs[id];
      $('#subpage-symbol').textContent = c.shape;
      $('#subpage-symbol').style.color = c.color;
      $('#subpage-symbol').style.borderColor = c.color + '88';
      $('#lobby-dialogue').textContent = `“同步体已切换为 ${c.en}。战斗模块已重新校准。”`;
    }
    return;
  }
  const launchBossButton = event.target.closest('[data-launch-boss]');
  if (launchBossButton) {
    const difficulty = Number(launchBossButton.dataset.launchBoss);
    if (![1,2,3].includes(difficulty)) return;
    if (typeof window.setLaunchEventBossDifficulty === 'function') window.setLaunchEventBossDifficulty(difficulty);
    setHash('battle'); return;
  }
  const target = event.target.closest('[data-route]');
  if (target) { setHash(target.dataset.route); return; }
});
document.addEventListener('submit', (event) => {
  if (event.target?.id !== 'event-dev-form') return;
  event.preventDefault();
  if (!isDeveloperMode()) { renderEventPage('开发者模式未启用。'); return; }
  const input = $('#event-dev-amount');
  const amount = Math.floor(Number(input?.value));
  if (!Number.isFinite(amount) || amount < 1 || amount > 99999) { renderEventPage('请输入 1–99999 之间的整数。'); return; }
  eventState = readEventState();
  eventState.tokens = Math.min(9999999, eventState.tokens + amount);
  saveEventState();
  renderEventPage(`调试注入完成：+${amount} 异常残片。`);
});
window.addEventListener('hashchange', routeFromHash);
$('#nav-toggle').addEventListener('click', () => showNav(navOverlay.classList.contains('hidden')));
$('#nav-close').addEventListener('click', () => { showNav(false); $('#nav-toggle').focus(); });
$('#settings-close').addEventListener('click', () => { showSettings(false); setHash('home'); });
$('#battle-home').addEventListener('click', () => { window.setLaunchEventBossDifficulty?.(0); setHash('home'); });
$('#prism-details').addEventListener('click', () => setHash('characters'));
function syncLobbyCharacter() {
  const id = state.selectedCharacter;
  const c = characterDefs[id] || characterDefs.prism;
  const caption = document.querySelector('.stage-caption b');
  const shape = document.querySelector('.prism-object');
  if (caption) caption.innerHTML = `${c.en} <i>·</i> ${c.name}`;
  if (shape) {
    shape.dataset.character = id;
    shape.setAttribute('aria-label', `${c.name} ${c.en} 几何形象`);
    shape.style.filter = `drop-shadow(0 0 25px ${c.color}88)`;
  }
  const stageRole = $('#stage-character-role'); if (stageRole) stageRole.textContent = `${c.role}　/　同步稳定`;
  const emblem = $('#battle-character-emblem');
  if (emblem) { emblem.dataset.character = id; emblem.style.setProperty('--character-color', c.color); }
  const name = $('#battle-character-name'); if (name) name.innerHTML = `${c.name} <span>${c.en}</span>`;
  const desc = $('#battle-character-desc'); if (desc) desc.textContent = c.desc;
  const role = $('#battle-character-role'); if (role) role.textContent = c.role;
  const skill = $('#battle-skill-label'); if (skill) skill.textContent = c.skill;
  const ult = $('#battle-ult-label'); if (ult) ult.textContent = c.ult;
  const rControl = $('#battle-r-control'); if (rControl) { rControl.hidden = id !== 'paradox' && id !== 'traveller'; const label = rControl.querySelector('span'); if (label) label.textContent = id === 'traveller' ? '旅途的尾声' : '轮回：时空回溯'; }
  const symbol = document.querySelector('.brand-glyph');
  if (symbol) { symbol.textContent = c.shape; symbol.style.color = c.color; symbol.style.borderColor = c.color + '77'; }
}
window.refreshBattleCharacterInfo = syncLobbyCharacter;
window.addEventListener('nullcore:character-changed', syncLobbyCharacter);
syncLobbyCharacter();
$('#reduced-motion').checked = Boolean(state.reducedMotion);
lobby.classList.toggle('reduce-motion', Boolean(state.reducedMotion));
document.documentElement.classList.toggle('reduce-motion-global', Boolean(state.reducedMotion));
$('#reduced-motion').addEventListener('change', (event) => {
  state.reducedMotion = event.target.checked;
  lobby.classList.toggle('reduce-motion', state.reducedMotion);
  document.documentElement.classList.toggle('reduce-motion-global', state.reducedMotion);
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


window.addEventListener('nullcore:gacha-updated', () => {
  gachaState = readGacha();
  if ((location.hash.replace(/^#\/?/, '') || 'home') === 'summon') renderSummonPage();
});
