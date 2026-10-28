const $ = (selector) => document.querySelector(selector);
const lobby = $('#lobby-view');
const battle = $('#battle-view');
const homeScreen = $('#home-screen');
const subpageScreen = $('#subpage-screen');
const navOverlay = $('#navigation-overlay');
const settingsOverlay = $('#settings-overlay');

const pageInfo = {
  characters: { code:'SYSTEM / 03', kicker:'SYNCHRONIZER DIRECTORY', symbol:'◇', title:'角色与模块', description:'选择你的同步体。角色选择会保存在当前浏览器，并应用于下一场战斗。', body:'', button:'返回战斗', route:'battle' },
  summon: { code:'SYSTEM / 04', kicker:'SIGNAL RECONSTRUCTION', symbol:'✧', title:'角色招募', description:'消耗招募信标，解析新的同步体。零域探索中的阶段进度也会带来信标。', body:'', button:'返回大厅', route:'home' },
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
const state = safeRead('nullcore.lobby.v1', { level: 1, data: 1, lastRecord: null, reducedMotion: false, selectedCharacter: 'prism' });
const characterDefs = {
  prism: { name:'棱镜', en:'PRISM', color:'#68efff', shape:'◇', role:'折射 / 均衡', skill:'折射脉冲', ult:'交叉棱镜', desc:'均衡型同步体。清除附近弹幕，并用稳定的持续火力击破异常体。' },
  bulwark: { name:'壁垒', en:'BULWARK', color:'#b68aff', shape:'⬡', role:'承伤 / 反弹 / 无敌散射', skill:'反弹脉冲（E）', ult:'绝对壁垒（Q）', desc:'正常承受伤害；受到伤害与每秒自动回复终结技能量。E 反弹周围弹幕并让其伤害敌人；Q 获得 10 秒无敌并吸收接触到的弹幕，结束后全部散射。' },
  singularity: { name:'奇点', en:'SINGULARITY', color:'#ff9b42', shape:'▲', role:'定点引力 / 积蓄 / 爆发', skill:'定点引力场（E）', ult:'核心坍缩（Q）', desc:'E 在施放位置放置持续 4.5 秒的引力场，强力聚集敌人、牵引弹幕并周期性造成伤害；进入核心的弹幕会被压碎。Q 在自身 320 范围内引发坍缩，基础伤害为 1000×蓄能比例；蓄能从 10% 起每秒增加 3%，最高 100%；每清除一枚弹幕额外造成 12 点伤害，最多 +240，释放后蓄能重置为 10%。' },
  paradox: { name:'悖论', en:'PARADOX', color:'#9d7cff', shape:'✧', role:'因果反转 / 弹幕转化 / 时空回溯', skill:'因果（E）', ult:'覆写（Q）/ 轮回（R）', desc:'初始生命值 123。悖论值上限 200，每点增加 0.3 个百分点闪避；受击、命中、闪避与技能都能积累悖论。E：3 秒因果反转；Q：吸收弹幕并释放三枚固定伤害碎片；R：设置时空锚点并回溯，致命伤时优先触发。' },
  phantom: { name:'幻灵', en:'PHANTOM', color:'#b49aff', shape:'◈', role:'闪避 / 反伤 / 团队增伤', skill:'幽影（E）', ult:'幽冥领域（Q）', desc:'初始生命值 50，基础闪避率 50%；闪避时反伤 1.5 倍实际伤害。E：潜行 2 秒，闪避率 100%、反伤 3 倍、每秒回血 3。Q：半径 270、持续 7 秒，领域内幻灵获得强化潜行，领域内 BOSS 受到所有玩家造成的伤害提高 75%。' }
};
function getOwnedCharacters() {
  const saved = safeRead('nullcore.gacha.v1', {});
  return new Set(['prism','bulwark','singularity', ...(Array.isArray(saved.ownedCharacters) ? saved.ownedCharacters : [])]);
}
state.selectedCharacter = characterDefs[state.selectedCharacter] && getOwnedCharacters().has(state.selectedCharacter) ? state.selectedCharacter : 'prism';
try { localStorage.setItem('nullcore.character', state.selectedCharacter); } catch {}

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
  if (route === 'summon') {
    renderSummonPage();
  } else if (route === 'characters') {
    const selected = state.selectedCharacter;
    const ownedCharacters = getOwnedCharacters();
    $('#subpage-body').innerHTML = `<div class="character-select-grid">${Object.entries(characterDefs).filter(([id])=>ownedCharacters.has(id)).map(([id,c]) => `<article class="character-select-card ${selected===id?'active':''}" style="--character-color:${c.color}"><div class="character-select-shape">${c.shape}</div><div class="character-select-kicker">SYNCHRONIZER / ${c.en}</div><h3>${c.name}</h3><b>${c.role}</b><p>${c.desc}</p><small>主动：${c.skill}　·　终结：${c.ult}</small><button type="button" data-character="${id}">${selected===id?'当前选用':'选择角色'}</button></article>`).join('')}</div>`;
  } else { $('#subpage-body').textContent = info.body; }
  $('#subpage-primary').innerHTML = `${info.button} <span>↗</span>`;
  $('#subpage-primary').dataset.route = info.route;
}
const GACHA_KEY = 'nullcore.gacha.v1';
const GACHA_CHARACTERS = [
  { id:'prism', name:'棱镜', en:'PRISM', rarity:'R', color:'#68efff', shape:'◇', role:'折射 / 均衡' },
  { id:'bulwark', name:'壁垒', en:'BULWARK', rarity:'R', color:'#b68aff', shape:'⬡', role:'承伤 / 反弹' },
  { id:'singularity', name:'奇点', en:'SINGULARITY', rarity:'R', color:'#ff9b42', shape:'▲', role:'引力 / 爆发' },
  { id:'paradox', name:'悖论', en:'PARADOX', rarity:'SSR', color:'#9d7cff', shape:'✧', role:'因果反转 / 时空回溯', rate:0.8 },
  { id:'phantom', name:'幻灵', en:'PHANTOM', rarity:'SR', color:'#b49aff', shape:'◈', role:'闪避 / 反伤 / 团队增伤', rate:5 },
];
function readGacha() {
  const saved = safeRead(GACHA_KEY, {});
  const data = {
    signalUnits: Math.max(0, Number(saved.signalUnits ?? ((Number(saved.halfPulls) || 0) * 80)) || 0),
    currency: Math.max(0, Number(saved.currency) || 0),
    cores: { prism:0, bulwark:0, singularity:0, phantom:0, paradox:0, ...(saved.cores || {}) },
    coreLevels: { prism:0, bulwark:0, singularity:0, phantom:0, paradox:0, ...(saved.coreLevels || {}) },
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
function saveGacha() { safeWrite(GACHA_KEY, gachaState); }
function totalPulls() { return Math.floor(gachaState.signalUnits / 160); }
function renderSummonPage(message = '') {
  const owned = new Set(gachaState.ownedCharacters || ['prism','bulwark','singularity']);
  const tabs = [ ['limited','限定招募'], ['standard','常驻招募'], ['event','活动招募'] ];
  const currentPool = tabs.find(t => t[0] === gachaState.activePool)?.[1] || '限定招募';
  const availablePulls = totalPulls();
  const srLeft = Math.max(0, 10 - gachaState.srPity);
  const characters = GACHA_CHARACTERS.map(c => {
    const level = gachaState.coreLevels[c.id] || 0;
    const cores = gachaState.cores[c.id] || 0;
    const nextEffects = ['最大生命 +8%', '基础伤害 +8%', 'E 技能冷却 -8%', 'Q 技能伤害 +10%', '最大生命 +8%，基础伤害 +8%'];
    const isOwned = owned.has(c.id);
    return `<article class="gacha-character-card rarity-${c.rarity.toLowerCase()}" style="--rarity-color:${c.color}">
      <div class="gacha-character-shape">${c.shape}</div><span class="gacha-rarity">${c.rarity} · ${isOwned?'已登记':'未解锁'}</span>
      <h3>${c.name}</h3><p>${c.en} / ${c.role}</p>
      <div class="gacha-next-effect">${!isOwned ? '首次招募解锁角色，不赠送核心' : level < 5 ? `下一阶：${nextEffects[level]}` : '核心强化已全部解锁'}</div>
      <div class="gacha-core-line"><span>核心库存</span><b>${isOwned?cores:'—'}</b><span class="gacha-level">${isOwned?`强化 ${level}/5`:'未解锁'}</span></div>
      <div class="gacha-core-track"><i style="width:${level*20}%"></i></div>
      <button type="button" class="gacha-small-button" data-core-use="${c.id}" ${!isOwned || cores < 1 || level >= 5 ? 'disabled' : ''}>${!isOwned?'等待招募解锁':level >= 5 ? '已达强化上限' : '消耗 1 核心强化'}</button>
    </article>`;
  }).join('');
  const history = gachaState.history.length ? gachaState.history.slice(0, 8).map(h => `<li><span>${h.pool}</span><b>${h.name}</b><small>${h.rarity} · ${h.time}</small></li>`).join('') : '<li class="gacha-empty-history">尚无招募记录</li>';
  $('#subpage-body').innerHTML = `<section class="gacha-terminal">
    <div class="gacha-banner"><div class="gacha-banner-grid"></div><div class="gacha-banner-copy"><span class="gacha-overline">NULL//CORE · RECRUITMENT SYSTEM</span><h2>从虚空中，<br>重构新的同步体。</h2><p>每 10 抽至少获得 1 名 SR。SSR / UR 保底计数已预留，待对应角色加入卡池后启用。</p><div class="gacha-banner-tag">${currentPool.toUpperCase()} / TEST POOL</div></div><div class="gacha-banner-emblem">✧</div></div>
    <div class="gacha-resource-row"><div class="gacha-resource"><span>招募信号</span><b>${gachaState.signalUnits} <small>招募信标</small></b><em>可招募 ${availablePulls} 次</em></div><div class="gacha-resource"><span>回收币</span><b>◈ ${gachaState.currency}</b><em>用于后续兑换商店</em></div><div class="gacha-resource"><span>完整探索奖励</span><b>+80 信标</b><em>击败全部 3 个 BOSS</em></div></div>
    <div class="gacha-pool-tabs">${tabs.map(([id,label]) => `<button type="button" data-pool="${id}" class="${gachaState.activePool===id?'active':''}">${label}</button>`).join('')}</div>
    <div class="gacha-pool-info"><div><span class="gacha-overline">CURRENT POOL</span><h3>${currentPool} · 御三家测试池</h3><p>当前测试池包含三名初始 R 级同步体与 SR 级幻灵。幻灵首次招募时解锁角色，不赠送核心；再次招募才获得专属核心。</p></div><button type="button" class="gacha-rate-toggle" data-show-rates>概率与规则</button></div>
    <div class="gacha-actions"><button type="button" class="gacha-pull-button" data-gacha-pull="1" ${availablePulls < 1?'disabled':''}><span>单次招募</span><b>消耗 1 抽</b></button><button type="button" class="gacha-pull-button ten-pull" data-gacha-pull="10" ${availablePulls < 10?'disabled':''}><span>十次招募</span><b>消耗 10 抽</b></button></div>
    <p class="gacha-hint">单抽消耗 160 招募信标，十连消耗 1600。击败第 1 个 BOSS 获得 20，第 2 个再获得 30；击败全部 3 个 BOSS 后，本次探索累计获得 80 信标。</p>
    <div class="gacha-message ${message?'visible':''}" role="status">${message}</div>
    <section class="gacha-rate-panel hidden" id="gacha-rate-panel"><h3>当前测试池规则</h3><ul><li>幻灵（SR）：5%</li><li>壁垒（R）：31.6667%</li><li>奇点（R）：31.6667%</li><li>棱镜（R）：31.6666%</li><li>SR 保底：连续未获得 SR 时，第 10 抽必定获得 SR（幻灵）。当前 SR 保底进度：${gachaState.srPity}/10。</li><li>SSR 保底：80 抽；UR 保底：160 抽并替代该轮 SSR 保底。由于当前卡池尚无 SSR / UR 角色，相关保底会在加入对应角色后生效。</li><li>重复角色获得 1 个专属核心；每名角色最多消耗 5 个核心强化。达到 5 阶后再次抽中该角色，核心自动转换为 10 回收币。</li></ul></section>
    <section class="gacha-collection"><div class="gacha-section-heading"><div><span class="gacha-overline">SYNCHRONIZER ARCHIVE</span><h3>核心与强化</h3></div><span>${GACHA_CHARACTERS.reduce((sum,c)=>sum+(gachaState.coreLevels[c.id]||0),0)} / 20 阶</span></div><div class="gacha-character-grid">${characters}</div></section>
    <section class="gacha-history"><div class="gacha-section-heading"><div><span class="gacha-overline">SIGNAL LOG</span><h3>最近招募记录</h3></div><button type="button" class="gacha-rate-toggle" data-clear-history>清空记录</button></div><ul>${history}</ul></section>
  </section>`;
}
function performGacha(count) {
  const cost = count * 160;
  if (gachaState.signalUnits < cost) { renderSummonPage(count === 10 ? '招募信标不足：十连需要 1600 个信标。' : '招募信标不足：单抽需要 160 个信标。'); return; }
  gachaState.signalUnits -= cost;
  const results = [];
  for (let i=0;i<count;i++) {
    const availableSSR = GACHA_CHARACTERS.filter(c => c.rarity === 'SSR');
    const availableUR = GACHA_CHARACTERS.filter(c => c.rarity === 'UR');
    let character;
    if (availableUR.length && gachaState.urPity >= 159) { character = availableUR[Math.floor(Math.random() * availableUR.length)]; }
    else if (availableSSR.length && gachaState.ssrPity >= 79) { character = availableSSR[Math.floor(Math.random() * availableSSR.length)]; }
    else if (gachaState.srPity >= 9) { character = GACHA_CHARACTERS.find(c => c.id === 'phantom'); }
    else { const roll = Math.random() * 100; character = roll < 0.8 ? GACHA_CHARACTERS.find(c=>c.id==='paradox') : roll < 5.8 ? GACHA_CHARACTERS.find(c=>c.id==='phantom') : GACHA_CHARACTERS[Math.floor(Math.random()*3)]; }
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
  const resultMarkup = results.map((c,i)=>`<div class="gacha-result-card" style="--rarity-color:${c.color}"><span>${i+1}</span><div class="gacha-result-shape">${c.shape}</div><small>${c.rarity}</small><b>${c.name}</b><em>${c.resultText}</em></div>`).join('');
  const resultOverlay = document.createElement('div');
  resultOverlay.className = 'gacha-result-overlay';
  resultOverlay.innerHTML = `<div class="gacha-result-dialog"><span class="gacha-overline">SIGNAL RECONSTRUCTION COMPLETE</span><h2>${count===10?'十次招募结果':'招募结果'}</h2><p>首次招募的角色已解锁，不会赠送核心；已拥有角色重复招募后获得核心。</p><div class="gacha-result-grid ${count===10?'is-ten':''}">${resultMarkup}</div><button type="button" class="gacha-pull-button" data-close-results>确认</button></div>`;
  document.body.appendChild(resultOverlay);
  renderSummonPage(`${count===10?'十连':'单抽'}完成。${results.map(c=>c.name).join('、')}。`);
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
  const route = location.hash.replace(/^#\/?/, '') || 'home';
  const known = ['home','characters','summon','battle','events','inventory','rift','settings'];
  const safeRoute = known.includes(route) ? route : 'home';
  if (safeRoute !== route) history.replaceState(null, '', `${location.pathname}${location.search}#/home`);
  if (safeRoute === 'settings') { renderRoute('home'); showSettings(true); return; }
  renderRoute(safeRoute);
}

document.addEventListener('click', (event) => {
  const pullButton = event.target.closest('[data-gacha-pull]');
  if (pullButton) { performGacha(Number(pullButton.dataset.gachaPull)); return; }
  if (event.target.closest('[data-close-results]')) { document.querySelector('.gacha-result-overlay')?.remove(); renderSummonPage(); return; }
  const poolButton = event.target.closest('[data-pool]');
  if (poolButton) { gachaState.activePool = poolButton.dataset.pool; saveGacha(); renderSummonPage(); return; }
  if (event.target.closest('[data-show-rates]')) { $('#gacha-rate-panel')?.classList.toggle('hidden'); return; }
  if (event.target.closest('[data-clear-history]')) { gachaState.history = []; saveGacha(); renderSummonPage('招募记录已清空。'); return; }
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
      renderSummonPage(`${c.name}核心强化提升至 ${gachaState.coreLevels[id]}/5${conversionMessage}。`);
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
      renderSubpage('characters');
      syncLobbyCharacter();
      const c = characterDefs[id];
      $('#subpage-symbol').textContent = c.shape;
      $('#subpage-symbol').style.color = c.color;
      $('#subpage-symbol').style.borderColor = c.color + '88';
      $('#lobby-dialogue').textContent = `“同步体已切换为 ${c.en}。战斗模块已重新校准。”`;
    }
    return;
  }
  const target = event.target.closest('[data-route]');
  if (target) { setHash(target.dataset.route); return; }
});
window.addEventListener('hashchange', routeFromHash);
$('#nav-toggle').addEventListener('click', () => showNav(navOverlay.classList.contains('hidden')));
$('#nav-close').addEventListener('click', () => { showNav(false); $('#nav-toggle').focus(); });
$('#settings-close').addEventListener('click', () => { showSettings(false); setHash('home'); });
$('#battle-home').addEventListener('click', () => setHash('home'));
$('#prism-details').addEventListener('click', () => setHash('characters'));
function syncLobbyCharacter() { const c = characterDefs[state.selectedCharacter] || characterDefs.prism; const caption = document.querySelector('.stage-caption b'); const shape = document.querySelector('.prism-object'); if (caption) caption.innerHTML = `${c.en} <i>·</i> ${c.name}`; if (shape) { shape.style.filter = `drop-shadow(0 0 22px ${c.color}66)`; shape.dataset.character = state.selectedCharacter; shape.style.clipPath = state.selectedCharacter === 'bulwark' ? 'polygon(25% 5%,75% 5%,100% 50%,75% 95%,25% 95%,0 50%)' : state.selectedCharacter === 'singularity' ? 'polygon(50% 0,100% 90%,0 90%)' : ''; } const symbol = document.querySelector('.brand-glyph'); if (symbol) { symbol.textContent = c.shape; symbol.style.color = c.color; symbol.style.borderColor = c.color + '77'; } }
syncLobbyCharacter();
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


window.addEventListener('nullcore:gacha-updated', () => {
  gachaState = readGacha();
  if ((location.hash.replace(/^#\/?/, '') || 'home') === 'summon') renderSummonPage();
});
