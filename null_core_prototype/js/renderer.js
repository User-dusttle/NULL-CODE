function drawBackground() {
  const w = game.width;
  const h = game.height;

  ctx.clearRect(0, 0, w, h);
  if (game.boss?.type === "zero") { drawZeroArenaBackground(w, h); return; }

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


function drawZeroArenaBackground(w, h) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#050914"); bg.addColorStop(.58, "#101522"); bg.addColorStop(1, "#090d17");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  // Deep-space starfield and distant debris.
  for (let i=0;i<58;i++) {
    const x = ((i*173.7 + 31) % w), y = ((i*97.3 + 19) % (h*.72));
    ctx.globalAlpha = i%5===0 ? .72 : .38; ctx.fillStyle=i%9===0?"#ff9a7b":"#b8c9e2";
    ctx.fillRect(x,y,i%13===0?2:1,i%13===0?2:1);
  }
  ctx.globalAlpha=1;
  // A huge eclipsed planet anchors the horizon.
  const px=w*.78, py=h*.20, pr=Math.min(w,h)*.19;
  const pg=ctx.createRadialGradient(px-pr*.32,py-pr*.38,pr*.08,px,py,pr);
  pg.addColorStop(0,"#465267"); pg.addColorStop(.55,"#202b3d"); pg.addColorStop(1,"#080d18");
  ctx.fillStyle=pg; ctx.beginPath(); ctx.arc(px,py,pr,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.translate(px,py); ctx.rotate(-.22); ctx.strokeStyle="rgba(255,112,83,.28)"; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(0,0,pr*1.48,pr*.32,0,0,Math.PI*2); ctx.stroke(); ctx.restore();
  // Broken orbital gantry silhouettes.
  ctx.save(); ctx.strokeStyle="rgba(116,143,174,.22)"; ctx.lineWidth=3;
  for(let i=0;i<5;i++){const x=w*(.08+i*.19), top=h*(.13+(i%2)*.07);ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x+18,h*.42);ctx.lineTo(x+62,h*.48);ctx.stroke();ctx.beginPath();ctx.moveTo(x+18,h*.42);ctx.lineTo(x-22,h*.55);ctx.stroke();}
  ctx.restore();
  // Arena floor: concentric containment rings and perspective grid.
  const cx=w*.5, cy=h*.59;
  ctx.save(); ctx.strokeStyle="rgba(255,105,79,.12)"; ctx.lineWidth=1;
  for(let i=0;i<5;i++){ctx.beginPath();ctx.ellipse(cx,cy,w*(.16+i*.105),h*(.055+i*.035),0,0,Math.PI*2);ctx.stroke();}
  ctx.strokeStyle="rgba(115,157,194,.10)";
  for(let i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(cx+i*w*.055,cy);ctx.lineTo(cx+i*w*.13,h);ctx.stroke();}
  for(let j=1;j<=7;j++){const y=cy+(h-cy)*(j/7)**1.65;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.restore();
  const vignette=ctx.createRadialGradient(cx,h*.48,Math.min(w,h)*.18,cx,h*.48,Math.max(w,h)*.72);
  vignette.addColorStop(.45,"rgba(0,0,0,0)");vignette.addColorStop(1,"rgba(0,0,0,.58)");ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
}

// ============================================================
// 绘制玩家
// ============================================================

function drawPlayer() {
  if (game.character === "paradox") {
    if(game.paradoxAnchor){ctx.save();ctx.strokeStyle="#9d7cff";ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(game.paradoxAnchor.x,game.paradoxAnchor.y,18+Math.sin(game.elapsed*6)*3,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle="#d9caff";ctx.font="10px monospace";ctx.textAlign="center";ctx.fillText("ANCHOR",game.paradoxAnchor.x,game.paradoxAnchor.y-25);ctx.restore();}
  }
  const p = game.player;
  if (!p) return;
  const character = game.character || "prism";
  if (character === "paradox" && game.paradoxE > 0) {
    ctx.save(); ctx.translate(p.x,p.y); const pulse=1+Math.sin(game.elapsed*14)*0.08;
    ctx.globalAlpha=0.6+Math.sin(game.elapsed*18)*0.2; ctx.strokeStyle="#d8c8ff"; ctx.shadowBlur=18; ctx.shadowColor="#9d7cff"; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(0,0,(p.radius+14)*pulse,game.elapsed*2,game.elapsed*2+Math.PI*1.65); ctx.stroke();
    ctx.strokeStyle="#9d7cff"; ctx.lineWidth=1.5; ctx.setLineDash([3,5]); ctx.beginPath(); ctx.arc(0,0,p.radius+23,-game.elapsed*3,-game.elapsed*3+Math.PI*1.4); ctx.stroke(); ctx.setLineDash([]);
    for(let i=0;i<4;i++){const a=game.elapsed*3+i*Math.PI/2;const x=Math.cos(a)*(p.radius+17),y=Math.sin(a)*(p.radius+17);ctx.fillStyle="#eee6ff";ctx.beginPath();ctx.moveTo(x,y-5);ctx.lineTo(x+4,y);ctx.lineTo(x,y+5);ctx.lineTo(x-4,y);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  if (character === "paradox" && game.paradoxShards?.length) {
    for (const shard of game.paradoxShards) {
      ctx.save(); ctx.translate(shard.x,shard.y); ctx.rotate(game.elapsed*2.5+shard.angle); ctx.fillStyle="#a98aff"; ctx.strokeStyle="#f0e7ff"; ctx.shadowBlur=18; ctx.shadowColor="#9d7cff"; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(6,-2); ctx.lineTo(3,9); ctx.lineTo(-4,6); ctx.lineTo(-7,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(2,2);ctx.lineTo(-2,5);ctx.closePath();ctx.stroke();ctx.restore();
    }
  }
  if (character === "mechanist") {
    const q=(game.mechQTimer||0)>0, rr=(game.mechRTimer||0)>0;
    // 机械师专属机甲建模：肩甲、胸甲、能源核心与背部推进器。
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle||0); ctx.shadowBlur=q?24:15; ctx.shadowColor=rr?"#ff725e":"#63d8ff";
    ctx.fillStyle="#172a3b"; ctx.strokeStyle="#a9f1ff"; ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(-p.radius*.72,-p.radius*.62);ctx.lineTo(-p.radius*1.05,-p.radius*.28);ctx.lineTo(-p.radius*.86,p.radius*.48);ctx.lineTo(-p.radius*.45,p.radius*.68);ctx.lineTo(-p.radius*.3,p.radius*.35);ctx.lineTo(p.radius*.3,p.radius*.35);ctx.lineTo(p.radius*.45,p.radius*.68);ctx.lineTo(p.radius*.86,p.radius*.48);ctx.lineTo(p.radius*1.05,-p.radius*.28);ctx.lineTo(p.radius*.72,-p.radius*.62);ctx.lineTo(0,-p.radius*.92);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle="#24516a";ctx.beginPath();ctx.moveTo(-p.radius*.42,-p.radius*.25);ctx.lineTo(0,-p.radius*.55);ctx.lineTo(p.radius*.42,-p.radius*.25);ctx.lineTo(p.radius*.32,p.radius*.38);ctx.lineTo(-p.radius*.32,p.radius*.38);ctx.closePath();ctx.fill();
    ctx.fillStyle=rr?"#ff8d69":q?"#e9fbff":"#63d8ff";ctx.shadowBlur=22;ctx.beginPath();ctx.arc(0,0,p.radius*.23,0,Math.PI*2);ctx.fill();
    for(const side of [-1,1]){ctx.fillStyle="#6ee4ff";ctx.fillRect(side*p.radius*.65-2,-p.radius*.82,4,p.radius*.32);} ctx.restore();
    if(rr){ctx.save();ctx.strokeStyle="#ff9a7d";ctx.globalAlpha=.22;ctx.setLineDash([3,8]);ctx.lineWidth=1.5;for(const d of (game.mechDrones||[])){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(d.x,d.y);ctx.stroke();}ctx.setLineDash([]);ctx.restore();}
    for (const d of (game.mechDrones || [])) { ctx.save(); ctx.translate(d.x,d.y); ctx.rotate(game.elapsed*2.5); ctx.shadowBlur=rr?28:q?24:16; ctx.shadowColor=rr?"#ff795f":q?"#b7f6ff":"#63d8ff"; ctx.fillStyle="#163c52"; ctx.strokeStyle=rr?"#ffb19a":"#a7f0ff"; ctx.lineWidth=2; ctx.beginPath();ctx.moveTo(0,-10);ctx.lineTo(10,-3);ctx.lineTo(7,7);ctx.lineTo(-7,7);ctx.lineTo(-10,-3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle=rr?"#fff0cf":"#eaffff";ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#63d8ff";ctx.globalAlpha=.6;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(-18,0);ctx.moveTo(12,0);ctx.lineTo(18,0);ctx.stroke();ctx.restore(); }
    if(q&&!rr){ctx.save();ctx.globalAlpha=.13+.08*Math.sin(game.elapsed*22);ctx.fillStyle="#55dfff";ctx.fillRect(0,0,game.width,game.height);ctx.restore();ctx.save();ctx.strokeStyle="#bff7ff";ctx.shadowBlur=16;ctx.shadowColor="#63d8ff";ctx.lineWidth=2;ctx.setLineDash([4,7]);ctx.beginPath();ctx.arc(p.x,p.y,p.radius+18+Math.sin(game.elapsed*18)*3,game.elapsed*2,game.elapsed*2+Math.PI*1.5);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
    if(rr){ctx.save();ctx.globalAlpha=.12+.06*Math.sin(game.elapsed*9);ctx.fillStyle="#ff593f";ctx.fillRect(0,0,game.width,game.height);ctx.restore();}
    if ((game.mechShield||0)>0) { ctx.save();ctx.globalAlpha=.45+Math.sin(game.elapsed*12)*.12;ctx.strokeStyle="#63d8ff";ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,p.radius+9,0,Math.PI*2);ctx.stroke();ctx.restore(); }
  }
  // 裁决者专属模型：冠冕、装甲躯干、核心宝石与三枚轨道刻印.
  if(character==="judge"){
    const q=(game.judgeQTimer||0)>0, rr=(game.judgeRTimer||0)>0, pulse=1+Math.sin(game.elapsed*7)*.06;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(game.elapsed*.18);ctx.globalAlpha=.7;ctx.strokeStyle=rr?"#ff526f":q?"#fff0ad":"#d6b46a";ctx.lineWidth=1.6;ctx.shadowBlur=rr?28:16;ctx.shadowColor=ctx.strokeStyle;ctx.beginPath();ctx.ellipse(0,0,p.radius+11,p.radius+6,0,0,Math.PI*2);ctx.stroke();ctx.rotate(-game.elapsed*.36);
    for(let i=0;i<3;i++){const a=game.elapsed*(rr?1.7:.7)+i*Math.PI*2/3;const x=Math.cos(a)*(p.radius+13),y=Math.sin(a)*(p.radius+13);ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=rr?"#ff607b":"#f1d58a";ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(4,0);ctx.lineTo(0,5);ctx.lineTo(-4,0);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(pulse, pulse);ctx.shadowBlur=rr?28:q?24:17;ctx.shadowColor=rr?"#ff4567":"#d9b55f";
    ctx.fillStyle="#342b25";ctx.strokeStyle="#fff0bd";ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(0,-p.radius*1.45);ctx.lineTo(p.radius*.78,-p.radius*.45);ctx.lineTo(p.radius*.62,p.radius*.72);ctx.lineTo(0,p.radius*1.1);ctx.lineTo(-p.radius*.62,p.radius*.72);ctx.lineTo(-p.radius*.78,-p.radius*.45);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle=rr?"#ff506e":q?"#fff0ad":"#d6b65f";ctx.beginPath();ctx.moveTo(0,-p.radius*1.72);ctx.lineTo(p.radius*.35,-p.radius*1.08);ctx.lineTo(-p.radius*.35,-p.radius*1.08);ctx.closePath();ctx.fill();
    ctx.fillStyle="#fff8dc";ctx.beginPath();ctx.arc(0,0,p.radius*.27,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff0bd";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-p.radius*.65,-p.radius*.2);ctx.lineTo(-p.radius*1.0,-p.radius*.48);ctx.lineTo(-p.radius*.78,p.radius*.25);ctx.moveTo(p.radius*.65,-p.radius*.2);ctx.lineTo(p.radius*1.0,-p.radius*.48);ctx.lineTo(p.radius*.78,p.radius*.25);ctx.stroke();ctx.restore();
    if(q||rr){ctx.save();ctx.globalAlpha=.12+(Math.sin(game.elapsed*13)+1)*.07;ctx.fillStyle=rr?"#ff3e60":"#ffe7a1";ctx.fillRect(0,0,game.width,game.height);ctx.restore();}
  }
  const color = character === "bulwark" ? COLORS.violet : character === "singularity" ? COLORS.orange : character === "phantom" ? "#b49aff" : character === "illusion" ? "#8e7bff" : character === "paradox" ? "#9d7cff" : COLORS.cyan;
  ctx.save(); ctx.translate(p.x, p.y);
  if (game.playerDying) {
    const progress = clamp(1 - (game.playerDeathTimer || 0) / 1.25, 0, 1);
    ctx.globalAlpha = 1 - progress;
    ctx.rotate(progress * 2.8);
    ctx.scale(Math.max(0.08, 1 - progress * 0.92), Math.max(0.08, 1 - progress * 0.92));
  }
  // 棱镜终结技期间：旋转双环与脉冲刻度，明确提示强化状态仍在持续。
  if (character === "prism" && (game.prismUltimateTimer || 0) > 0) {
    const t = game.prismUltimateTimer;
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(game.elapsed * 12) * 0.18;
    ctx.strokeStyle = "#7cf7ff"; ctx.lineWidth = 2; ctx.shadowBlur = 18; ctx.shadowColor = "#42eaff";
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 13 + Math.sin(game.elapsed * 8) * 2, game.elapsed * 2.4, game.elapsed * 2.4 + Math.PI * 1.65); ctx.stroke();
    ctx.setLineDash([3, 5]); ctx.beginPath(); ctx.arc(0, 0, p.radius + 20, -game.elapsed * 1.8, -game.elapsed * 1.8 + Math.PI * 1.5); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < 4; i++) { const a = game.elapsed * 2.1 + i * Math.PI / 2; ctx.fillStyle = "#d8ffff"; ctx.beginPath(); ctx.arc(Math.cos(a) * (p.radius + 18), Math.sin(a) * (p.radius + 18), 2.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  const phantomStealthActive = character === "phantom" && typeof phantomEnhancedStealth === "function" && phantomEnhancedStealth();
  if (phantomStealthActive) {
    // 潜行状态：半透明残影、脉冲光环和环绕碎片，让状态一眼可辨。
    ctx.globalAlpha = 0.48 + Math.sin(game.elapsed * 13) * 0.12;
    ctx.strokeStyle = "#d9c8ff"; ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 12 + Math.sin(game.elapsed * 8) * 3, game.elapsed * 1.6, game.elapsed * 1.6 + Math.PI * 1.65); ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 3; i++) {
      const a = game.elapsed * 2.2 + i * Math.PI * 2 / 3;
      ctx.fillStyle = "#eee5ff";
      ctx.beginPath(); ctx.arc(Math.cos(a) * (p.radius + 8), Math.sin(a) * (p.radius + 8), 2, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (game.invulnerable > 0 || (character === "bulwark" && (game.bulwarkAbsorbed || 0) > 0)) {
    ctx.strokeStyle = `${color}bb`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 9 + Math.sin(game.elapsed * 9) * 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.shadowBlur = 22; ctx.shadowColor = color; ctx.fillStyle = color; ctx.strokeStyle = "#f4fbff"; ctx.lineWidth = 1.5;
  if (character === "bulwark") {
    ctx.beginPath(); for (let i=0;i<6;i++){const a=-Math.PI/6+i*Math.PI/3;const x=Math.cos(a)*p.radius*1.15,y=Math.sin(a)*p.radius*1.15;i?ctx.lineTo(x,y):ctx.moveTo(x,y);} ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,4,0,Math.PI*2);ctx.fillStyle="#f6efff";ctx.fill();
  } else if (character === "singularity") {
    ctx.beginPath();ctx.moveTo(0,-p.radius*1.35);ctx.lineTo(p.radius*1.15,p.radius);ctx.lineTo(-p.radius*1.15,p.radius);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,3.5,0,Math.PI*2);ctx.fillStyle="#fff0df";ctx.fill();
  } else if (character === "paradox") {
    // 悖论专属：四向切割棱星 + 内部空洞，区别于棱镜方形与幻灵菱晶。
    ctx.rotate(game.elapsed*0.45); ctx.beginPath();
    for(let i=0;i<8;i++){const a=-Math.PI/2+i*Math.PI/4;const r=i%2===0?p.radius*1.45:p.radius*0.58;const x=Math.cos(a)*r,y=Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
    ctx.globalAlpha=.9;ctx.strokeStyle="#e7dcff";ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,p.radius*.42,0,Math.PI*2);ctx.stroke();ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(0,0,2.4,0,Math.PI*2);ctx.fill();
    for(let i=0;i<3;i++){const a=game.elapsed*1.7+i*Math.PI*2/3;ctx.fillStyle="#c9b4ff";ctx.beginPath();ctx.moveTo(Math.cos(a)*(p.radius+8),Math.sin(a)*(p.radius+8));ctx.lineTo(Math.cos(a+.18)*(p.radius+15),Math.sin(a+.18)*(p.radius+15));ctx.lineTo(Math.cos(a-.18)*(p.radius+15),Math.sin(a-.18)*(p.radius+15));ctx.closePath();ctx.fill();}
  } else if (character === "illusion") {
    // 幻影专属建模：双刃残影、面罩核心与偏移装甲翼。
    ctx.rotate(-0.16+Math.sin(game.elapsed*4)*0.05);
    ctx.beginPath();ctx.moveTo(0,-p.radius*1.55);ctx.lineTo(p.radius*.68,-p.radius*.35);ctx.lineTo(p.radius*.42,p.radius*.78);ctx.lineTo(0,p.radius*1.08);ctx.lineTo(-p.radius*.42,p.radius*.78);ctx.lineTo(-p.radius*.68,-p.radius*.35);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle="#e8e0ff";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-p.radius*.8,-p.radius*.35);ctx.lineTo(-p.radius*1.55,-p.radius*.95);ctx.lineTo(-p.radius*1.15,p.radius*.45);ctx.moveTo(p.radius*.8,-p.radius*.35);ctx.lineTo(p.radius*1.55,-p.radius*.95);ctx.lineTo(p.radius*1.15,p.radius*.45);ctx.stroke();
    ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(0,-p.radius*.18,2.5,0,Math.PI*2);ctx.fill();
    if(illusionFullDodgeActive()){
      const pulse=.5+.5*Math.sin(game.elapsed*15);
      ctx.globalAlpha=.9;ctx.strokeStyle="#d8caff";ctx.lineWidth=2.6;ctx.setLineDash([5,3]);
      ctx.beginPath();ctx.ellipse(0,0,p.radius*1.95,p.radius*1.35,-.25,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.globalAlpha=.45+.35*pulse;ctx.strokeStyle="#8b5cff";ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,p.radius*2.25,game.elapsed*3,game.elapsed*3+Math.PI*1.55);ctx.stroke();
      ctx.globalAlpha=.85;ctx.fillStyle="#f2eaff";
      for(let i=0;i<6;i++){const a=-game.elapsed*3+i*Math.PI/3;const rr=p.radius*2.1+(i%2)*3;ctx.beginPath();ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);ctx.lineTo(Math.cos(a+.13)*(rr+6),Math.sin(a+.13)*(rr+6));ctx.lineTo(Math.cos(a-.13)*(rr+6),Math.sin(a-.13)*(rr+6));ctx.closePath();ctx.fill();}
    }
  } else if (character === "phantom") {
    // 幻灵专属：竖向双层幽影菱晶，与棱镜的方形外观区分。
    ctx.beginPath(); ctx.moveTo(0, -p.radius * 1.35); ctx.lineTo(p.radius * 0.82, 0); ctx.lineTo(0, p.radius * 1.35); ctx.lineTo(-p.radius * 0.82, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha *= 0.82; ctx.strokeStyle = "#f0eaff"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -p.radius * 0.82); ctx.lineTo(p.radius * 0.42, 0); ctx.lineTo(0, p.radius * 0.82); ctx.lineTo(-p.radius * 0.42, 0); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
  } else if (character === "aleph") {
    // 阿尔法专属模型：白银面甲、分层胸甲、双翼与悬浮披帛。
    const qActive = (game.alephQTimer || 0) > 0;
    const pulse = 1 + Math.sin(game.elapsed * 5.5) * 0.035;
    ctx.rotate(-0.08 + Math.sin(game.elapsed * 2.2) * 0.035);
    ctx.scale(pulse, pulse);
    ctx.shadowBlur = qActive ? 30 : 19;
    ctx.shadowColor = qActive ? "#e7ffff" : "#62dfff";
    // 背后双翼
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#17384c"; ctx.strokeStyle = "#9cefff"; ctx.lineWidth = 1.35;
      ctx.beginPath();
      ctx.moveTo(side * p.radius * .38, -p.radius * .28);
      ctx.lineTo(side * p.radius * 1.58, -p.radius * 1.18);
      ctx.lineTo(side * p.radius * 1.28, -p.radius * .05);
      ctx.lineTo(side * p.radius * .88, p.radius * .48);
      ctx.lineTo(side * p.radius * .38, p.radius * .3);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#6fdcf5"; ctx.globalAlpha = .7;
      ctx.beginPath(); ctx.moveTo(side * p.radius * .58, -p.radius * .18); ctx.lineTo(side * p.radius * 1.25, -p.radius * .7); ctx.lineTo(side * p.radius * .92, p.radius * .18); ctx.stroke();
      ctx.globalAlpha = 1;
      // 披帛尾端
      ctx.fillStyle = "#21485c"; ctx.beginPath();
      ctx.moveTo(side * p.radius * .42, p.radius * .35);
      ctx.lineTo(side * p.radius * .92, p.radius * 1.35);
      ctx.lineTo(side * p.radius * .3, p.radius * .92);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // 装甲躯干
    ctx.fillStyle = "#173448"; ctx.strokeStyle = "#d8fbff"; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(0,-p.radius*1.02); ctx.lineTo(p.radius*.62,-p.radius*.48); ctx.lineTo(p.radius*.48,p.radius*.52); ctx.lineTo(0,p.radius*.88); ctx.lineTo(-p.radius*.48,p.radius*.52); ctx.lineTo(-p.radius*.62,-p.radius*.48); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#2b6075"; ctx.beginPath(); ctx.moveTo(0,-p.radius*.72); ctx.lineTo(p.radius*.38,-p.radius*.35); ctx.lineTo(p.radius*.27,p.radius*.34); ctx.lineTo(0,p.radius*.55); ctx.lineTo(-p.radius*.27,p.radius*.34); ctx.lineTo(-p.radius*.38,-p.radius*.35); ctx.closePath(); ctx.fill();
    // 头盔与面甲
    ctx.fillStyle = "#d9f7fb"; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(0,-p.radius*1.42); ctx.lineTo(p.radius*.42,-p.radius*.95); ctx.lineTo(p.radius*.3,-p.radius*.48); ctx.lineTo(0,-p.radius*.35); ctx.lineTo(-p.radius*.3,-p.radius*.48); ctx.lineTo(-p.radius*.42,-p.radius*.95); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#123448"; ctx.beginPath(); ctx.moveTo(-p.radius*.27,-p.radius*.84); ctx.lineTo(p.radius*.27,-p.radius*.84); ctx.lineTo(p.radius*.18,-p.radius*.64); ctx.lineTo(-p.radius*.18,-p.radius*.64); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#bdfaff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-p.radius*.16,-p.radius*.75); ctx.lineTo(-2,-p.radius*.72); ctx.moveTo(2,-p.radius*.72); ctx.lineTo(p.radius*.16,-p.radius*.75); ctx.stroke();
    // 胸口核心
    ctx.fillStyle = qActive ? "#ffffff" : "#9af3ff"; ctx.shadowBlur = qActive ? 34 : 22; ctx.shadowColor = "#8ce8ff";
    ctx.beginPath(); ctx.moveTo(0,-p.radius*.28); ctx.lineTo(p.radius*.2,0); ctx.lineTo(0,p.radius*.28); ctx.lineTo(-p.radius*.2,0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#efffff"; ctx.lineWidth = 1; ctx.stroke();
    // 肩部晶片
    for (const side of [-1,1]) { ctx.fillStyle="#a9f4ff"; ctx.beginPath(); ctx.moveTo(side*p.radius*.55,-p.radius*.48); ctx.lineTo(side*p.radius*.86,-p.radius*.32); ctx.lineTo(side*p.radius*.58,-p.radius*.12); ctx.closePath(); ctx.fill(); }
  } else if (character === "traveller") {
    // 旅者重制：披风剪影、偏斜冠冕、虚空胸核与三片轨道遗物，整体更接近一名漂泊者。
    const r = p.radius, active = (game.traveller?.rTimer || 0) > 0;
    ctx.save(); ctx.rotate((p.angle || 0) * .22);
    ctx.globalAlpha = .78; ctx.fillStyle = "#211b35"; ctx.strokeStyle = "#d8caff"; ctx.lineWidth = 1.35;
    ctx.beginPath(); ctx.moveTo(-r*.42,-r*.38); ctx.lineTo(-r*.82,r*.28); ctx.lineTo(-r*.52,r*1.28); ctx.lineTo(-r*.08,r*.88); ctx.lineTo(0,r*1.42); ctx.lineTo(r*.2,r*.78); ctx.lineTo(r*.72,r*1.12); ctx.lineTo(r*.78,r*.12); ctx.lineTo(r*.38,-r*.48); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = .95; ctx.fillStyle = "#45365f"; ctx.beginPath(); ctx.moveTo(-r*.48,-r*.2); ctx.lineTo(-r*.22,-r*.82); ctx.lineTo(r*.2,-r*.72); ctx.lineTo(r*.5,-r*.18); ctx.lineTo(r*.3,r*.54); ctx.lineTo(0,r*.82); ctx.lineTo(-r*.3,r*.48); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 兜帽/面部：用深色面罩与一条冷白目光形成清晰识别点。
    ctx.fillStyle = "#171324"; ctx.beginPath(); ctx.moveTo(-r*.34,-r*.62); ctx.lineTo(0,-r*1.22); ctx.lineTo(r*.36,-r*.6); ctx.lineTo(r*.27,-r*.12); ctx.lineTo(0,r*.08); ctx.lineTo(-r*.27,-r*.12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#fff4df"; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-r*.2,-r*.42); ctx.lineTo(-r*.04,-r*.36); ctx.moveTo(r*.04,-r*.36); ctx.lineTo(r*.2,-r*.42); ctx.stroke();
    // 胸口的虚空罗盘。
    ctx.shadowBlur = active ? 25 : 14; ctx.shadowColor = "#b9a6ff"; ctx.fillStyle = active ? "#fff8e6" : "#cbbcff";
    ctx.beginPath(); ctx.moveTo(0,-r*.22); ctx.lineTo(r*.2,r*.04); ctx.lineTo(0,r*.3); ctx.lineTo(-r*.2,r*.04); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = "#fff4df"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-r*.95,-r*.05); ctx.lineTo(-r*.58,r*.1); ctx.moveTo(r*.95,-r*.05); ctx.lineTo(r*.58,r*.1); ctx.stroke();
    ctx.restore();
    // 角色脚下的断续星轨和肩侧漂浮碎片。
    ctx.save(); ctx.globalAlpha = .58; ctx.strokeStyle = active ? "#fff1cf" : "#b9a6ff"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(0,r*.38,r*1.12,r*.48,-.2,game.elapsed*.45,game.elapsed*.45+Math.PI*1.45); ctx.stroke(); ctx.restore();
    for(let i=0;i<3;i++){const a=-game.elapsed*1.1+i*Math.PI*2/3;const x=Math.cos(a)*(r+9),y=Math.sin(a)*(r+7);ctx.save();ctx.translate(x,y);ctx.rotate(a+game.elapsed*.7);ctx.fillStyle=i===1?"#fff4df":"#b9a6ff";ctx.strokeStyle="#f4eaff";ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(3,0);ctx.lineTo(0,6);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
  } else {
    ctx.rotate(Math.PI/4);ctx.fillRect(-8,-8,16,16);ctx.fillStyle="#e7ffff";ctx.fillRect(-3,-3,6,6);
  }
  ctx.shadowBlur=0;ctx.restore();
  // 阿尔法 Q「清算」持续期间的专属环绕协议场。
  if (character === "aleph" && (game.alephQTimer || 0) > 0) {
    const remain = game.alephQTimer, phase = game.elapsed;
    ctx.save(); ctx.translate(p.x,p.y); ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = .72 + Math.sin(phase*9)*.12; ctx.strokeStyle = "#aaf5ff"; ctx.shadowBlur = 24; ctx.shadowColor = "#70eaff"; ctx.lineWidth = 1.7;
    ctx.beginPath(); ctx.ellipse(0,0,p.radius+18,p.radius+10,phase*.8,phase*1.5,phase*1.5+Math.PI*1.58); ctx.stroke();
    ctx.strokeStyle = "#e8ffff"; ctx.lineWidth = 1.15; ctx.beginPath(); ctx.ellipse(0,0,p.radius+29,p.radius+20,-phase*.55,-phase*1.8,-phase*1.8+Math.PI*1.35); ctx.stroke();
    ctx.strokeStyle = "#58d9f5"; ctx.setLineDash([3,6]); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0,0,p.radius+38,phase*1.25,phase*1.25+Math.PI*1.72); ctx.stroke(); ctx.setLineDash([]);
    for(let i=0;i<6;i++){const a=-phase*1.35+i*Math.PI/3;const r=p.radius+25+Math.sin(phase*5+i)*3;const x=Math.cos(a)*r,y=Math.sin(a)*r;ctx.save();ctx.translate(x,y);ctx.rotate(a+phase*1.8);ctx.fillStyle=i%2?"#80eaff":"#efffff";ctx.strokeStyle="#ffffff";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(3,0);ctx.lineTo(0,7);ctx.lineTo(-3,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
    for(let i=0;i<8;i++){const a=i*Math.PI/4+phase*.7;ctx.globalAlpha=.22;ctx.strokeStyle="#a8f6ff";ctx.beginPath();ctx.moveTo(Math.cos(a)*(p.radius+8),Math.sin(a)*(p.radius+8));ctx.lineTo(Math.cos(a)*(p.radius+43),Math.sin(a)*(p.radius+43));ctx.stroke();}
    ctx.globalAlpha=1;ctx.textAlign="center";ctx.font="bold 10px monospace";ctx.fillStyle="#eaffff";ctx.shadowBlur=12;ctx.fillText(`RECKONING  ${remain.toFixed(1)}s`,0,-p.radius-53);
    ctx.restore();
  }
  if (character === "illusion" && illusionFullDodgeActive()) {
    const pulse=.5+.5*Math.sin(game.elapsed*16);
    ctx.save(); ctx.globalCompositeOperation="lighter";
    ctx.strokeStyle=`rgba(176,130,255,${.55+.35*pulse})`; ctx.lineWidth=2.5; ctx.shadowBlur=24; ctx.shadowColor="#8d55ff";
    ctx.beginPath(); ctx.ellipse(p.x,p.y,p.radius+12+pulse*4,p.radius+8+pulse*3,game.elapsed*.7,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(226,214,255,.9)"; ctx.lineWidth=1.5; ctx.setLineDash([7,5]); ctx.beginPath(); ctx.arc(p.x,p.y,p.radius+19,game.elapsed*4,game.elapsed*4+Math.PI*1.55); ctx.stroke(); ctx.setLineDash([]);
    for(let i=0;i<3;i++){const a=game.elapsed*2.4+i*Math.PI*2/3;const x=p.x+Math.cos(a)*(p.radius+15),y=p.y+Math.sin(a)*(p.radius+15);ctx.fillStyle="#d8caff";ctx.beginPath();ctx.moveTo(x,y-4);ctx.lineTo(x+3,y);ctx.lineTo(x,y+4);ctx.lineTo(x-3,y);ctx.closePath();ctx.fill();}
    // 侧后方的短残影让 100% 闪避状态在复杂战斗背景下也能辨认。
    for(let i=1;i<=2;i++){ctx.globalAlpha=.22/i;ctx.fillStyle="#9b73ff";ctx.beginPath();ctx.moveTo(p.x-i*7,p.y-p.radius);ctx.lineTo(p.x-i*7+p.radius*.8,p.y);ctx.lineTo(p.x-i*7,p.y+p.radius);ctx.lineTo(p.x-i*7-p.radius*.8,p.y);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  if (phantomStealthActive) {
    ctx.save(); ctx.textAlign = "center"; ctx.font = "bold 11px monospace"; ctx.fillStyle = "#d9c8ff"; ctx.shadowBlur = 12; ctx.shadowColor = "#9d7cff";
    ctx.fillText("潜 行 中", p.x, p.y - p.radius - 23);
    const remaining = Math.max(0, game.phantomStealthTimer || 0);
    if (remaining > 0) { ctx.font = "10px monospace"; ctx.fillText(`${remaining.toFixed(1)}s`, p.x, p.y - p.radius - 10); }
    ctx.restore();
  }
  if (character === "singularity" && game.skillFieldTimer > 0) {
    const fx = game.skillFieldX ?? p.x, fy = game.skillFieldY ?? p.y;
    ctx.save();ctx.strokeStyle="rgba(255,155,66,.8)";ctx.fillStyle="rgba(255,155,66,.08)";ctx.lineWidth=2;ctx.setLineDash([5,7]);ctx.beginPath();ctx.arc(fx,fy,game.skillFieldRadius||210,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(fx,fy,16+Math.sin(game.elapsed*10)*3,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if (game.mouse.inside && game.running && !game.paused) {
    ctx.save();ctx.strokeStyle=`${color}55`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(game.mouse.x,game.mouse.y);ctx.stroke();ctx.beginPath();ctx.arc(game.mouse.x,game.mouse.y,7,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}

// ============================================================
// 绘制 BOSS
// ============================================================

function drawFuseDrones() {
  const b = game.boss;
  if (!b || b.type !== "fuse" || b.phase !== 4 || !b.fuseDronesSpawned) return;
  for (const d of (game.fuseDrones || [])) {
    if (d.dead || d.hp <= 0) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle + Math.PI / 4);
    ctx.shadowBlur = 12;
    ctx.shadowColor = COLORS.orange;
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(-d.radius * 0.72, -d.radius * 0.72, d.radius * 1.44, d.radius * 1.44);
    ctx.restore();
    const w = 22, ratio = clamp(d.hp / d.maxHp, 0, 1);
    ctx.fillStyle = "rgba(0,0,0,.7)";
    ctx.fillRect(d.x - w / 2, d.y - 17, w, 3);
    ctx.fillStyle = COLORS.orange;
    ctx.fillRect(d.x - w / 2, d.y - 17, w * ratio, 3);
  }
}

function drawFuseSummon() {
  const summons = (game.fuseSummons || []).filter(s => !s.dead && s.hp > 0);
  for (const s of summons) {
  const color = s.type === "observer" ? COLORS.violet : COLORS.pink;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(s.spin * 0.35);
  ctx.shadowBlur = s.hitFlash > 0 ? 28 : 17;
  ctx.shadowColor = s.hitFlash > 0 ? "#ffffff" : color;
  ctx.strokeStyle = s.hitFlash > 0 ? "#ffffff" : color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.rotate(-s.spin * 0.9);
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, s.radius + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  if (s.type === "observer") {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.lineTo(Math.cos(a) * (s.radius - 2), Math.sin(a) * (s.radius - 2));
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -s.radius + 3);
    ctx.lineTo(s.radius - 4, 0);
    ctx.lineTo(0, s.radius - 3);
    ctx.lineTo(-s.radius + 4, 0);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  const w = 74, ratio = clamp(s.hp / s.maxHp, 0, 1);
  ctx.fillStyle = "rgba(0,0,0,.78)";
  ctx.fillRect(s.x - w / 2, s.y - s.radius - 25, w, 5);
  ctx.fillStyle = color;
  ctx.fillRect(s.x - w / 2, s.y - s.radius - 25, w * ratio, 5);
  ctx.font = "11px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = color;
  ctx.fillText(`${s.name} ${Math.ceil(s.hp)}/${s.maxHp}`, s.x, s.y - s.radius - 31);
  }
}

function drawBoss() {
  const b = game.boss;
  if (!b || b.type === "rogue-wave-anchor") return;

  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.type === "zero") {
    const d = b.zeroDifficulty || 1;
    const core = b.phase === 3 ? "#ff365d" : b.phase === 2 ? "#ff765f" : "#ffad72";
    const pulse = 0.88 + Math.sin(game.elapsed * 5.2) * 0.07;
    ctx.save();
    ctx.rotate(Math.sin(game.elapsed * 0.8) * 0.035);
    // rear propulsion and asymmetric mechanical arms
    ctx.shadowBlur = 0; ctx.shadowColor = core;
    ctx.fillStyle = "#29313d"; ctx.strokeStyle = "#9ba9b8"; ctx.lineWidth = 2;
    for (const side of [-1,1]) {
      ctx.save(); ctx.translate(side*31, 5); ctx.rotate(side*(0.18+Math.sin(game.elapsed*2+side)*0.05));
      ctx.fillRect(-7,-5,14,38); ctx.strokeRect(-7,-5,14,38);
      ctx.fillStyle = "#596575"; ctx.fillRect(-11,25,22,9); ctx.strokeRect(-11,25,22,9);
      ctx.restore(); ctx.fillStyle = "#29313d";
    }
    ctx.fillStyle = "#374352"; ctx.beginPath(); ctx.moveTo(-24,-22); ctx.lineTo(22,-22); ctx.lineTo(31,8); ctx.lineTo(20,29); ctx.lineTo(-20,29); ctx.lineTo(-31,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#596575"; ctx.beginPath(); ctx.moveTo(-17,-29); ctx.lineTo(17,-29); ctx.lineTo(22,-14); ctx.lineTo(-22,-14); ctx.closePath(); ctx.fill(); ctx.stroke();
    // sensor slit and exposed core
    ctx.fillStyle = "#101722"; ctx.fillRect(-15,-9,30,9);
    ctx.fillStyle = core; ctx.shadowBlur = 0; ctx.shadowColor = core; ctx.fillRect(-11,-7,22,3);
    ctx.beginPath(); ctx.arc(0,10,10*pulse,0,Math.PI*2); ctx.fillStyle = core; ctx.fill();
    ctx.fillStyle = "#fff1df"; ctx.beginPath(); ctx.arc(0,10,3.2,0,Math.PI*2); ctx.fill();
    // back thrusters
    ctx.shadowBlur = 0; ctx.shadowColor = "#ff7b55"; ctx.fillStyle = "#ff8c62";
    for (const side of [-1,1]) { ctx.beginPath(); ctx.moveTo(side*12,25); ctx.lineTo(side*19,25); ctx.lineTo(side*16,39+Math.sin(game.elapsed*16+side)*3); ctx.closePath(); ctx.fill(); }
    // orbiting armor plates
    ctx.shadowBlur = 0; ctx.strokeStyle = core; ctx.lineWidth = 2;
    for(let i=0;i<4;i++){const a=game.elapsed*(i%2?-.8:1)+i*Math.PI/2;ctx.save();ctx.rotate(a);ctx.strokeRect(-3,-54,6,12);ctx.fillStyle="#9ba9b8";ctx.fillRect(-4,-52,8,5);ctx.restore();}
    if (b.phase === 3) { ctx.globalAlpha=.55+.35*Math.sin(game.elapsed*12);ctx.strokeStyle="#ff365d";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,57+Math.sin(game.elapsed*8)*4,0,Math.PI*2);ctx.stroke(); }
    ctx.restore();
    const w=90, ratio=clamp(b.hp/b.maxHp,0,1);ctx.fillStyle="rgba(0,0,0,.78)";ctx.fillRect(-w/2,-72, w,5);ctx.fillStyle=core;ctx.fillRect(-w/2,-72,w*ratio,5);
    ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillStyle="#f4e7e5";ctx.fillText(`ZERO · ${Math.ceil(b.hp).toLocaleString()}`,0,-79);
    ctx.restore(); return;
  }
  if (game.bossDying) {
    const duration = b.type === "zero" ? 3.25 : 1.9;
    const progress = clamp(1 - (game.bossDeathTimer || 0) / duration, 0, 1);
    ctx.globalAlpha = b.type === "zero" ? Math.max(0, 1-progress*1.25) : 1-progress;
    if (b.type === "zero") { ctx.rotate(progress * 2.8); const scale=Math.max(.04,1-progress*.96);ctx.scale(scale,scale); }
    else { ctx.rotate(progress * 1.5); const scale = 1 + progress * 1.4; ctx.scale(scale, scale); }
  } else if (b.type === "stalker" && b.transition === "stalker_warp") {
    // 跃迁阶段保持可见，短暂闪烁表现空间不稳定，而不是整段隐身。
    ctx.globalAlpha = 0.58 + 0.32 * Math.abs(Math.sin(game.elapsed * 15));
  }

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

  const bossColor = b.type === "stalker" ? COLORS.cyan : b.type === "fuse" ? (b.fuseShutdown ? COLORS.cyan : COLORS.orange) : COLORS.violet;
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
    const enemyColor = m.color || COLORS.orange;
    if (m.spawnTimer > 0) {
      const progress = 1 - m.spawnTimer / (m.spawnDuration || 0.72);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.65 * Math.abs(Math.sin(game.elapsed * 15));
      ctx.strokeStyle = enemyColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.radius * (0.5 + progress), Math.max(4, m.radius * 0.22), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius * (0.45 + progress * 0.55), -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = enemyColor;
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("INCOMING", m.x, m.y - m.radius - 16);
      ctx.restore();
      continue;
    }
    ctx.save();
    ctx.translate(m.x, m.y);
    if(game.character==="judge"&&(m.judgeSin||0)>0){
      const sin=Math.min(10,m.judgeSin||0), full=sin>=10, yy=-m.radius-17;
      ctx.save();ctx.translate(0, yy);ctx.globalAlpha=.96;
      // 旅者风格：悬浮小型状态胶囊 + 细刻度，锚定在怪物头顶。
      ctx.shadowBlur=full?12:5;ctx.shadowColor=full?"#ff5c78":"#a99aff";
      ctx.fillStyle=full?"rgba(55,12,30,.92)":"rgba(24,22,42,.86)";
      ctx.strokeStyle=full?"#ff6c86":"rgba(176,161,255,.78)";ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(-21,-8,42,16,7);ctx.fill();ctx.stroke();
      ctx.shadowBlur=0;ctx.fillStyle=full?"#fff0f3":"#e7e0ff";ctx.font="bold 10px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(`✦ ${sin}/10`,0,0);
      ctx.globalAlpha=.9;
      for(let i=0;i<10;i++){ctx.fillStyle=i<sin?(full?"#ff6d86":"#b6a4ff"):"rgba(255,255,255,.13)";ctx.fillRect(-19+i*3.9,10,2.8,2);}
      if(full){ctx.globalAlpha=.75+Math.sin(game.elapsed*18)*.25;ctx.strokeStyle="#ff9caf";ctx.beginPath();ctx.arc(0,0,25+Math.sin(game.elapsed*9)*2,0,Math.PI*2);ctx.stroke();}
      ctx.restore();}
    ctx.shadowBlur = 13;
    ctx.shadowColor = enemyColor;
    ctx.fillStyle = enemyColor;
    if (m.type === "zeroDrone") {
      const a=game.elapsed*2.8+m.age; ctx.rotate(a);
      ctx.fillStyle="#34404d";ctx.strokeStyle="#ffb29b";ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(0,-m.radius);ctx.lineTo(m.radius*.72,-4);ctx.lineTo(m.radius,0);ctx.lineTo(m.radius*.72,4);ctx.lineTo(0,m.radius);ctx.lineTo(-m.radius*.72,4);ctx.lineTo(-m.radius,0);ctx.lineTo(-m.radius*.72,-4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#ff765f";ctx.shadowBlur=15;ctx.shadowColor="#ff765f";ctx.beginPath();ctx.arc(0,0,4.2,0,Math.PI*2);ctx.fill();
      for(const side of [-1,1]){ctx.fillStyle="#ffad8d";ctx.fillRect(side*8-2,-3,8,6);}
    } else if (["prismWarden","riftHerald","shadeHound","nullCartographer","meltdownSeed"].includes(m.type)) {
      ctx.beginPath();
      if (m.type === "prismWarden") {
        ctx.moveTo(0,-m.radius); ctx.lineTo(m.radius*.85,-m.radius*.25); ctx.lineTo(m.radius*.7,m.radius*.7); ctx.lineTo(-m.radius*.7,m.radius*.7); ctx.lineTo(-m.radius*.85,-m.radius*.25); ctx.closePath(); ctx.fill();
        const parts=m.prismParts ?? 3; ctx.strokeStyle=parts?"#d8fbff":"#fff2b3";ctx.lineWidth=2;ctx.stroke();
        for(let i=0;i<parts;i++){const a=game.elapsed*.5+i*Math.PI*2/3;ctx.beginPath();ctx.arc(Math.cos(a)*(m.radius+7),Math.sin(a)*(m.radius+7),4,0,Math.PI*2);ctx.fillStyle="#d8fbff";ctx.fill();}
      } else if (m.type === "shadeHound") {
        ctx.moveTo(m.radius*1.18,0);ctx.lineTo(m.radius*.15,-m.radius*.28);ctx.lineTo(-m.radius*.72,-m.radius*.86);ctx.lineTo(-m.radius*.48,-m.radius*.18);ctx.lineTo(-m.radius*.9,0);ctx.lineTo(-m.radius*.48,m.radius*.18);ctx.lineTo(-m.radius*.72,m.radius*.86);ctx.lineTo(m.radius*.15,m.radius*.28);ctx.closePath();ctx.fill();
        ctx.strokeStyle="#ffe2eb";ctx.lineWidth=2;ctx.stroke();ctx.fillStyle="#fff";ctx.beginPath();ctx.arc(m.radius*.35,-m.radius*.16,2.2,0,Math.PI*2);ctx.arc(m.radius*.35,m.radius*.16,2.2,0,Math.PI*2);ctx.fill();
        if(m.houndState==="windup"){ctx.strokeStyle="#ffb5c9";ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,m.radius+13,0,Math.PI*2);ctx.stroke();}
      } else if (m.type === "meltdownSeed") {
        const pulse=.82+Math.sin(game.elapsed*5)*.08;
        ctx.rotate(game.elapsed*.18);ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=m.radius*(i%2?pulse*.72:pulse*1.08);if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();ctx.strokeStyle="#ffe1a8";ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle="#672b1d";ctx.beginPath();ctx.arc(0,0,m.radius*.48,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff0b0";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,m.radius*.34,game.elapsed,game.elapsed+Math.PI*1.45);ctx.stroke();
        for(let i=0;i<4;i++){const a=game.elapsed*.7+i*Math.PI/2;ctx.strokeStyle="#ffcf82";ctx.beginPath();ctx.moveTo(Math.cos(a)*m.radius*.8,Math.sin(a)*m.radius*.8);ctx.lineTo(Math.cos(a)*(m.radius+8),Math.sin(a)*(m.radius+8));ctx.stroke();}
      } else if (m.type === "nullCartographer") {
        ctx.rotate(game.elapsed*.2);ctx.rect(-m.radius*.62,-m.radius*.62,m.radius*1.24,m.radius*1.24);ctx.fill();
        ctx.strokeStyle="#dce7ff";ctx.lineWidth=2;ctx.stroke();
        ctx.rotate(-game.elapsed*.4);ctx.strokeStyle="#dce7ff";ctx.beginPath();ctx.moveTo(-m.radius*.9,0);ctx.lineTo(m.radius*.9,0);ctx.moveTo(0,-m.radius*.9);ctx.lineTo(0,m.radius*.9);ctx.stroke();
        ctx.strokeStyle="rgba(119,167,255,.9)";ctx.lineWidth=2;ctx.strokeRect(-m.radius*1.22,-m.radius*1.22,m.radius*2.44,m.radius*2.44);
        ctx.fillStyle="#eaf2ff";for(let i=0;i<4;i++){ctx.fillRect((i%2?1:-1)*m.radius*.72-2,(i<2?-1:1)*m.radius*.72-2,4,4);}
      } else if (m.type === "riftHerald") {
        ctx.rotate(game.elapsed*.25);ctx.beginPath();ctx.moveTo(0,-m.radius);ctx.lineTo(m.radius*.62,-m.radius*.38);ctx.lineTo(m.radius*.78,m.radius*.42);ctx.lineTo(0,m.radius*.82);ctx.lineTo(-m.radius*.78,m.radius*.42);ctx.lineTo(-m.radius*.62,-m.radius*.38);ctx.closePath();ctx.fill();
        ctx.strokeStyle="#f0ddff";ctx.lineWidth=2;ctx.stroke();
        ctx.strokeStyle="#d4a7ff";ctx.beginPath();ctx.ellipse(0,0,m.radius*1.42,m.radius*.48,game.elapsed*.7,0,Math.PI*2);ctx.stroke();
        ctx.beginPath();ctx.ellipse(0,0,m.radius*.48,m.radius*1.35,-game.elapsed*.55,0,Math.PI*2);ctx.stroke();
        for(let k=0;k<4;k++){const a=game.elapsed*1.4+k*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*(m.radius*.55),Math.sin(a)*(m.radius*.55));ctx.lineTo(Math.cos(a)*(m.radius+8),Math.sin(a)*(m.radius+8));ctx.stroke();ctx.beginPath();ctx.arc(Math.cos(a)*(m.radius+8),Math.sin(a)*(m.radius+8),3.5,0,Math.PI*2);ctx.fillStyle="#f3e6ff";ctx.fill();}
      } else { ctx.arc(0,0,m.radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#e6d7ff";ctx.stroke(); }
    } else if (m.type === "spikeTurret") {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-m.radius * .8, -m.radius * .8, m.radius * 1.6, m.radius * 1.6);
      ctx.strokeStyle = "rgba(255,255,255,.8)";
      ctx.strokeRect(-m.radius * .8, -m.radius * .8, m.radius * 1.6, m.radius * 1.6);
    } else if (m.type === "pulseCrawler" || m.type === "splinterMine") {
      ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.7)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, m.radius + 3 + Math.sin(game.elapsed * 5) * 1.5, 0, Math.PI * 2); ctx.stroke();
    } else if (m.type === "aegisWeaver") {
      ctx.beginPath(); ctx.moveTo(0, -m.radius); ctx.lineTo(m.radius, 0); ctx.lineTo(0, m.radius); ctx.lineTo(-m.radius, 0); ctx.closePath(); ctx.fill();
      if (m.shield) { ctx.strokeStyle = "#a8f0ff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, m.radius + 5, 0, Math.PI * 2); ctx.stroke(); }
    } else {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-m.radius * .7, -m.radius * .7, m.radius * 1.4, m.radius * 1.4);
    }

    ctx.restore();

    if (m.isElite) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(game.elapsed * (m.type === "shadeHound" ? -0.9 : 0.45));
      ctx.strokeStyle = enemyColor;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, m.radius + 8 + Math.sin(game.elapsed * 3) * 2, 0.25, Math.PI * 1.75);
      ctx.stroke();
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (m.radius + 3), Math.sin(a) * (m.radius + 3));
        ctx.lineTo(Math.cos(a) * (m.radius + 12), Math.sin(a) * (m.radius + 12));
        ctx.stroke();
      }
      ctx.restore();
    }

    // 小怪生命条
    const barWidth = m.isElite ? 142 : (m.radius > 18 ? 64 : 28);
    const ratio = clamp(m.hp / m.maxHp, 0, 1);

    const barY = m.y - (m.isElite ? m.radius + 18 : 19);
    ctx.fillStyle = "rgba(0,0,0,.78)";
    ctx.fillRect(m.x - barWidth / 2, barY, barWidth, m.isElite ? 6 : 4);
    ctx.fillStyle = m.color || COLORS.orange;
    ctx.fillRect(m.x - barWidth / 2, barY, barWidth * ratio, m.isElite ? 6 : 4);
    if (m.isElite) {
      ctx.fillStyle = "#f3f6ff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.font = "bold 13px sans-serif";
      ctx.shadowBlur = 8; ctx.shadowColor = enemyColor;
      ctx.fillText(m.name, m.x, m.y - m.radius - 25);
    }
  }
}

// ============================================================
// 绘制子弹
// ============================================================

function drawIllusionClones() {
  for(const c of (game.illusionClones||[])){ctx.save();ctx.globalAlpha=.45+.25*Math.sin(game.elapsed*12+c.seed);ctx.translate(c.x,c.y);ctx.rotate(c.angle*.25);ctx.shadowBlur=20;ctx.shadowColor="#9d82ff";ctx.fillStyle="#9d82ff";ctx.strokeStyle="#e4dcff";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-c.radius*1.8);ctx.lineTo(c.radius,-c.radius*.25);ctx.lineTo(c.radius*.55,c.radius*1.2);ctx.lineTo(-c.radius*.55,c.radius*1.2);ctx.lineTo(-c.radius,-c.radius*.25);ctx.closePath();ctx.fill();ctx.stroke();ctx.globalAlpha=.8;ctx.strokeStyle="#c9baff";ctx.beginPath();ctx.arc(0,0,c.radius+5+Math.sin(game.elapsed*10+c.seed)*2,0,Math.PI*2);ctx.stroke();ctx.restore();}
  for(const b of (game.illusionBullets||[])){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.shadowBlur=14;ctx.shadowColor="#b9a7ff";ctx.fillStyle="#d8ceff";ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(-5,-2.5);ctx.lineTo(-2,0);ctx.lineTo(-5,2.5);ctx.closePath();ctx.fill();ctx.restore();}
}
function drawAlephEffects() {
  for(const shot of (game.alephShots||[])){
    ctx.save(); ctx.translate(shot.x,shot.y); ctx.rotate(Math.atan2(shot.vy||-1,shot.vx||0));
    ctx.globalCompositeOperation="source-over"; ctx.shadowBlur=0; ctx.shadowColor="#8ce8ff";
    ctx.fillStyle=shot.kind==="Q"?"#8ce8ff":"#efffff"; ctx.strokeStyle="#ffffff"; ctx.lineWidth=1.1;
    ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(2,-3.5);ctx.lineTo(-9,0);ctx.lineTo(2,3.5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.globalAlpha=.28;ctx.strokeStyle="#9defff";ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-18,0);ctx.stroke();ctx.restore();
  }
  for(const t of [...(game.minions||[]),...(game.fuseSummons||[]),...(game.boss?[game.boss]:[])]){
    const n=Math.min(100,Math.max(0,Number(t?.alephRupture)||0)); if(!t||t.hp<=0||n<=0)continue;
    const r=(t.radius||12)+7+n*.045, pulse=.5+.5*Math.sin(game.elapsed*7+n*.13);
    ctx.save();ctx.translate(t.x,t.y);ctx.globalCompositeOperation="source-over";ctx.globalAlpha=.42+.2*pulse;
    ctx.strokeStyle="#8ce8ff";ctx.shadowBlur=0;ctx.shadowColor="#70eaff";ctx.lineWidth=1.35;
    // 三段断续锁定弧，随层数收紧并增强亮度
    for(let i=0;i<2;i++){const a=game.elapsed*(i%2?-.32:.38)+i*Math.PI;ctx.beginPath();ctx.arc(0,0,r+i*3,a,a+Math.PI*(.42+n/190));ctx.stroke();}
    // 目标表面裂隙
    ctx.strokeStyle="#d8fbff";ctx.lineWidth=1.15;ctx.globalAlpha=.35+.35*pulse;
    for(let i=0;i<Math.min(4,1+Math.floor(n/28));i++){const a=i*Math.PI*2/Math.min(8,2+Math.floor(n/14)) + .4;const x=Math.cos(a)*(t.radius||12)*.35,y=Math.sin(a)*(t.radius||12)*.35;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a+.45)*5,y+Math.sin(a+.45)*5);ctx.lineTo(x+Math.cos(a-.25)*9,y+Math.sin(a-.25)*9);ctx.stroke();}
    // 破裂晶片数量随层数增长
    const shards=Math.min(3,1+Math.floor(n/40));
    for(let i=0;i<shards;i++){const a=game.elapsed*(i%2?-.65:.8)+i*Math.PI*2/shards;const rr=r+5+Math.sin(game.elapsed*4+i)*2;const x=Math.cos(a)*rr,y=Math.sin(a)*rr;ctx.save();ctx.translate(x,y);ctx.rotate(a+game.elapsed);ctx.fillStyle=i%2?"#83eaff":"#efffff";ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(2.5,0);ctx.lineTo(0,5);ctx.lineTo(-2.5,0);ctx.closePath();ctx.fill();ctx.restore();}
    ctx.globalAlpha=.9;ctx.fillStyle="#e9fdff";ctx.font="bold 10px monospace";ctx.textAlign="center";ctx.shadowBlur=0;ctx.fillText(`裂 ${n}`,0,-r-10);ctx.restore();
  }
}

function drawBullets() {
  for (const bullet of (game.mechBullets || [])) { ctx.save(); ctx.translate(bullet.x,bullet.y); const a=Math.atan2(bullet.vy,bullet.vx); ctx.rotate(a); ctx.shadowBlur=bullet.trail?22:13;ctx.shadowColor=bullet.color;ctx.fillStyle=bullet.color;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-5,-3.5);ctx.lineTo(-2,0);ctx.lineTo(-5,3.5);ctx.closePath();ctx.fill();ctx.strokeStyle="#efffff";ctx.lineWidth=1;ctx.stroke();ctx.restore(); }
  for (const bullet of game.bullets) {
    ctx.save();

    ctx.shadowBlur = bullet.alephRupture ? 20 : 12;
    ctx.shadowColor = bullet.color;
    ctx.fillStyle = bullet.color;
    if (bullet.alephRupture) {
      ctx.translate(bullet.x,bullet.y); ctx.rotate(Math.atan2(bullet.vy,bullet.vx));
      ctx.globalCompositeOperation="lighter"; ctx.beginPath();ctx.moveTo(8,0);ctx.lineTo(1,-3);ctx.lineTo(-6,0);ctx.lineTo(1,3);ctx.closePath();ctx.fill();
      ctx.strokeStyle="#eaffff";ctx.lineWidth=1;ctx.stroke();ctx.globalAlpha=.45;ctx.strokeStyle="#8ce8ff";ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-14,0);ctx.stroke();
    } else { ctx.beginPath();ctx.arc(bullet.x,bullet.y,bullet.radius,0,Math.PI*2);ctx.fill(); }
    ctx.restore();
  }

  for (const bullet of game.enemyBullets) {
    ctx.save();
    if (bullet.zeroHoming) {
      const a=Math.atan2(bullet.vy,bullet.vx);ctx.translate(bullet.x,bullet.y);ctx.rotate(a);
      ctx.globalCompositeOperation="lighter";ctx.shadowBlur=22;ctx.shadowColor="#ff765f";
      ctx.fillStyle="#ff805f";ctx.strokeStyle="#ffe0c9";ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(13,0);ctx.lineTo(3,-5);ctx.lineTo(-9,-4);ctx.lineTo(-6,0);ctx.lineTo(-9,4);ctx.lineTo(3,5);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle="#fff0d9";ctx.beginPath();ctx.arc(1,0,2.2,0,Math.PI*2);ctx.fill();
      ctx.globalAlpha=.55;ctx.strokeStyle="#ff6b52";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,0);ctx.lineTo(-25,0);ctx.stroke();ctx.restore();continue;
    }
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

function drawDeathEffects() {
  for (const e of (game.deathEffects || [])) {
    const progress = clamp(1 - e.life / e.maxLife, 0, 1);
    const fade = clamp(e.life / e.maxLife, 0, 1);
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.globalAlpha = fade;
    ctx.strokeStyle = e.color;
    ctx.fillStyle = e.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = e.color;
    if (e.type === "zero-boss") {
      // ZERO's reactor is forcibly compressed, then vents a vertical core flare and ejects armor shards.
      const collapse = Math.max(0, 1-progress);
      ctx.save(); ctx.globalAlpha=fade;
      for(let i=0;i<4;i++){ctx.strokeStyle=i%2?"#ffb18a":"#ff4d61";ctx.lineWidth=2.5-i*.35;ctx.beginPath();ctx.arc(0,0,e.radius+progress*(95+i*24),game.elapsed*(i%2?-2.4:2.1)+i,game.elapsed*(i%2?-2.4:2.1)+i+Math.PI*1.35);ctx.stroke();}
      const coreR=Math.max(1,e.radius*(1-progress*.92));ctx.fillStyle="#fff0d5";ctx.shadowBlur=34;ctx.shadowColor="#ff4b42";ctx.beginPath();ctx.arc(0,0,coreR,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle="#ff684f";ctx.lineWidth=5*(1-progress)+1;ctx.beginPath();ctx.moveTo(0,-e.radius*1.5);ctx.lineTo(0,-e.radius*(2.5+progress*5));ctx.stroke();
      for(let i=0;i<10;i++){const a=e.seed+i*Math.PI*2/10+progress*.8;const dist=e.radius+progress*(115+(i%3)*24);ctx.save();ctx.translate(Math.cos(a)*dist,Math.sin(a)*dist);ctx.rotate(a+progress*2);ctx.fillStyle=i%2?"#8b9aab":"#ff805f";ctx.strokeStyle="#ffd0b5";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(6,-2);ctx.lineTo(3,10);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}
      ctx.restore();
    } else if (e.type === "boss") {
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 3 - i * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + progress * (70 + i * 22) - i * 10, game.elapsed * (i % 2 ? -1 : 1) * 2, game.elapsed * (i % 2 ? -1 : 1) * 2 + Math.PI * 1.65);
        ctx.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = e.seed + i * Math.PI / 6;
        const r = e.radius + progress * 90;
        ctx.beginPath(); ctx.arc(Math.cos(a) * r, Math.sin(a) * r, Math.max(1, 5 * fade), 0, Math.PI * 2); ctx.fill();
      }
    } else if (e.type === "player") {
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, e.radius + progress * 52, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-e.radius, -e.radius); ctx.lineTo(e.radius, e.radius); ctx.moveTo(e.radius, -e.radius); ctx.lineTo(-e.radius, e.radius); ctx.stroke();
    } else {
      const radius = e.radius * (1 + progress * (e.type === "drone" ? 2.3 : 1.8));
      ctx.lineWidth = Math.max(1, 3 * fade);
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = e.seed + i * Math.PI / 3;
        const r1 = radius * 0.45, r2 = radius * 1.25;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke();
      }
    }
    ctx.restore();
  }
}

function drawParadoxEffects() {
  if (game.character !== "paradox") return;
  // 固定在回溯锚点的时空乱流，不跟随角色移动。
  for (const h of (game.hazards || [])) {
    if (h.type === "paradox-chaos") {
      const fade = clamp(h.life / h.maxLife, 0, 1), pulse = 1 + Math.sin(game.elapsed*5)*0.025;
      ctx.save(); ctx.translate(h.x,h.y); ctx.globalAlpha=0.3+fade*0.35;
      ctx.fillStyle="#6c3bba"; ctx.beginPath(); ctx.arc(0,0,h.radius,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="#9d7cff"; ctx.shadowBlur=22; ctx.shadowColor="#9d7cff"; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(0,0,h.radius*pulse,game.elapsed*.4,game.elapsed*.4+Math.PI*2); ctx.stroke();
      ctx.globalAlpha=.75; ctx.setLineDash([10,8]); ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(0,0,h.radius*.78,-game.elapsed*.65,-game.elapsed*.65+Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      for(let i=0;i<8;i++){const a=game.elapsed*.25+i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*h.radius*.65,Math.sin(a)*h.radius*.65);ctx.lineTo(Math.cos(a)*h.radius,Math.sin(a)*h.radius);ctx.stroke();}
      ctx.restore();
    } else if (h.type === "paradox-rift") {
      const f=clamp(h.life/h.maxLife,0,1);ctx.save();ctx.translate(h.x,h.y);ctx.rotate(game.elapsed*4);ctx.globalAlpha=.35+.65*f;ctx.strokeStyle="#d9c8ff";ctx.fillStyle="#7e4be8";ctx.shadowBlur=18;ctx.shadowColor="#9d7cff";ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(0,-h.radius);ctx.lineTo(h.radius*.55,0);ctx.lineTo(0,h.radius);ctx.lineTo(-h.radius*.55,0);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,h.radius*(1.4-f*.35),0,Math.PI*2);ctx.stroke();ctx.restore();
    }
  }
  for (const shot of (game.paradoxRiftShots || [])) {
    ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(game.elapsed*5);ctx.fillStyle="#bda4ff";ctx.strokeStyle="#ffffff";ctx.shadowBlur=16;ctx.shadowColor="#9d7cff";ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(5,0);ctx.lineTo(0,9);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }
}

function drawParticles() {
  // ZERO / Aleph battles keep a tighter visual budget; combat logic is unaffected.
  const particleList = (game.boss?.type === "zero" || game.character === "aleph") ? (game.particles || []).slice(-100) : game.particles;
  // Quantized alpha buckets preserve fades while batching particles by color.
  const groups = new Map();
  for (const particle of particleList) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    if (alpha < .08) continue;
    const bucket = Math.max(1, Math.min(5, Math.round(alpha * 5)));
    const key = `${particle.color || "#ffffff"}|${bucket}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(particle);
  }
  ctx.save();
  for (const [key, particles] of groups) {
    const split = key.lastIndexOf("|");
    ctx.fillStyle = key.slice(0, split);
    ctx.globalAlpha = Number(key.slice(split + 1)) / 5;
    ctx.beginPath();
    for (const particle of particles) {
      ctx.moveTo(particle.x + particle.r, particle.y);
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
}

// ============================================================
// 绘制危险区域
// ============================================================

function drawHazards() {
  for (const hazard of game.hazards) {
    if (hazard.type === "illusion-shift" || hazard.type === "illusion-burst" || hazard.type === "illusion-fade" || hazard.type === "illusion-dodge") { const pr=1-hazard.life/Math.max(.001,hazard.maxLife||hazard.life);ctx.save();ctx.globalAlpha=1-pr;ctx.strokeStyle=hazard.type==="illusion-fade"?"#c7baff":"#9d82ff";ctx.shadowBlur=20;ctx.shadowColor="#9d82ff";ctx.lineWidth=hazard.type==="illusion-burst"?3:2;for(let i=0;i<(hazard.type==="illusion-burst"?3:2);i++){ctx.beginPath();ctx.arc(hazard.x,hazard.y,hazard.radius*(.25+pr*(.8+i*.28)),game.elapsed*(i%2? -1:1)+i,game.elapsed*(i%2?-1:1)+i+Math.PI*1.55);ctx.stroke();}for(let i=0;i<8;i++){const a=i*Math.PI/4+game.elapsed*2;ctx.beginPath();ctx.moveTo(hazard.x+Math.cos(a)*hazard.radius*.35,hazard.y+Math.sin(a)*hazard.radius*.35);ctx.lineTo(hazard.x+Math.cos(a)*hazard.radius*(.55+pr*.65),hazard.y+Math.sin(a)*hazard.radius*(.55+pr*.65));ctx.stroke();}ctx.restore();continue; }
    if (hazard.type === "aleph-launch" || hazard.type === "aleph-clearing" || hazard.type === "aleph-hit" || hazard.type === "aleph-heal" || hazard.type === "aleph-airstrike") {
      const pr=clamp(1-hazard.life/Math.max(.001,hazard.maxLife||hazard.life),0,1), fade=1-pr;
      ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalCompositeOperation="lighter";ctx.globalAlpha=fade;
      if(hazard.type==="aleph-airstrike"){
        const r=hazard.radius;ctx.shadowBlur=0;ctx.shadowColor="#9befff";
        ctx.fillStyle=`rgba(180,250,255,${.18*fade})`;ctx.beginPath();ctx.arc(0,0,r*(.18+pr*.5),0,Math.PI*2);ctx.fill();
        ctx.strokeStyle="#e9ffff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,-r*2.1);ctx.lineTo(0,-r*.12);ctx.stroke();
        ctx.strokeStyle="#83eaff";ctx.lineWidth=2;for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,r*(.28+i*.24)*( .65+pr*.45),r*(.13+i*.12),0,0,Math.PI*2);ctx.stroke();}
        ctx.strokeStyle="#f4ffff";ctx.lineWidth=1.4;for(let i=0;i<8;i++){const a=i*Math.PI/4+game.elapsed*.18;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.25,Math.sin(a)*r*.25);ctx.lineTo(Math.cos(a)*r*(.72+pr*.3),Math.sin(a)*r*(.72+pr*.3));ctx.stroke();}
        ctx.fillStyle="#ffffff";ctx.beginPath();ctx.arc(0,0,5+pr*5,0,Math.PI*2);ctx.fill();
      } else {
        const heal=hazard.type==="aleph-heal", hit=hazard.type==="aleph-hit";ctx.strokeStyle=heal?"#9dffd8":"#8ce8ff";ctx.shadowBlur=0;ctx.shadowColor=ctx.strokeStyle;ctx.lineWidth=hit?2.5:1.8;
        const base=hazard.radius*(.2+pr*(hit?1.3:1.15));
        for(let i=0;i<(hit?1:2);i++){ctx.beginPath();ctx.ellipse(0,0,base*(.65+i*.2),base*(.42+i*.16),i*.7+game.elapsed*.2,0,Math.PI*2);ctx.stroke();}
        for(let i=0;i<4;i++){const a=i*Math.PI/2+game.elapsed*(heal?-.5:.7);ctx.beginPath();ctx.moveTo(Math.cos(a)*base*.3,Math.sin(a)*base*.3);ctx.lineTo(Math.cos(a)*base*(.7+pr*.3),Math.sin(a)*base*(.7+pr*.3));ctx.stroke();}
      }
      ctx.restore();continue;
    }
    if (hazard.type === "mechanist-airstrike") {
      const progress=clamp(1-hazard.life/Math.max(.001,hazard.maxLife||hazard.life),0,1), pulse=.5+.5*Math.sin(game.elapsed*18); ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalAlpha=.55+progress*.4;
      // 多层锁定圈、旋转扫描刻度、垂直光束与爆心核心。
      ctx.fillStyle=`rgba(255,70,55,${.08+.08*pulse})`;ctx.beginPath();ctx.arc(0,0,hazard.radius*(.7+.3*progress),0,Math.PI*2);ctx.fill();
      for(let i=0;i<3;i++){ctx.strokeStyle=i===0?"#ff493d":i===1?"#ffb08a":"#fff0cf";ctx.lineWidth=i===0?3:1.4;ctx.setLineDash(i===1?[4,7]:[]);ctx.beginPath();ctx.arc(0,0,hazard.radius*(.35+i*.3),game.elapsed*(i%2?-.8:1.1),game.elapsed*(i%2?-.8:1.1)+Math.PI*1.65);ctx.stroke();}
      ctx.setLineDash([]);ctx.strokeStyle="#ffb09a";ctx.lineWidth=1.5;for(let i=0;i<16;i++){const a=i*Math.PI/8+game.elapsed*.35,r1=hazard.radius*.82,r2=hazard.radius*(.94+.04*pulse);ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);ctx.stroke();}
      ctx.strokeStyle="#ff4d40";ctx.lineWidth=3;ctx.shadowBlur=25;ctx.shadowColor="#ff4d40";ctx.beginPath();ctx.moveTo(0,-hazard.radius*1.7);ctx.lineTo(0,-10);ctx.stroke();ctx.fillStyle="#fff2d9";ctx.beginPath();ctx.arc(0,0,5+progress*5,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff2d9";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.moveTo(0,-12);ctx.lineTo(0,12);ctx.stroke();ctx.restore(); continue;
    }
    if (hazard.type === "mechanist-blast") { const pr=1-hazard.life/Math.max(.001,hazard.maxLife||hazard.life);ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalAlpha=1-pr;ctx.shadowBlur=28;ctx.shadowColor="#ff513d";ctx.fillStyle=`rgba(255,90,52,${.24*(1-pr)})`;ctx.beginPath();ctx.arc(0,0,hazard.radius*(.2+pr),0,Math.PI*2);ctx.fill();for(let i=0;i<3;i++){ctx.strokeStyle=i===1?"#fff1d4":"#ff644d";ctx.lineWidth=4-i;ctx.beginPath();ctx.arc(0,0,hazard.radius*(.25+pr*(i===1?0.55:0.35)),0,Math.PI*2);ctx.stroke();}for(let i=0;i<12;i++){const a=i*Math.PI/6+game.elapsed*2;ctx.strokeStyle="#ffd2a8";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(Math.cos(a)*hazard.radius*.25,Math.sin(a)*hazard.radius*.25);ctx.lineTo(Math.cos(a)*hazard.radius*(.55+pr*.35),Math.sin(a)*hazard.radius*(.55+pr*.35));ctx.stroke();}ctx.restore();continue; }
    if (hazard.type === "mechanist-hit") { const pr=1-hazard.life/Math.max(.001,hazard.maxLife||hazard.life);ctx.save();ctx.globalAlpha=1-pr;ctx.strokeStyle="#baf5ff";ctx.shadowBlur=14;ctx.shadowColor="#63d8ff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(hazard.x,hazard.y,hazard.radius*(.3+pr),0,Math.PI*2);ctx.stroke();ctx.restore();continue; }
    if (hazard.type === "zero-bombardment") {
      const progress=clamp(1-hazard.life/hazard.maxLife,0,1), pulse=.82+.18*Math.sin(game.elapsed*18);
      ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalCompositeOperation="lighter";
      ctx.globalAlpha=.35+progress*.55;ctx.strokeStyle="#ff604d";ctx.fillStyle="rgba(255,70,55,.12)";ctx.shadowBlur=22;ctx.shadowColor="#ff4e43";ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(0,0,hazard.radius*(.72+progress*.28),0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.globalAlpha=.9;ctx.setLineDash([7,5]);ctx.beginPath();ctx.arc(0,0,hazard.radius*(.28+.72*progress)*pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle="#ffd2b7";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.moveTo(0,-12);ctx.lineTo(0,12);ctx.stroke();
      ctx.fillStyle="#ffb29a";ctx.font="bold 10px monospace";ctx.textAlign="center";ctx.fillText("IMPACT",0,-hazard.radius-9);ctx.restore();continue;
    }
    if (hazard.type === "zero-blast") {
      const q=clamp(1-hazard.life/hazard.maxLife,0,1);ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalCompositeOperation="lighter";ctx.globalAlpha=1-q;ctx.strokeStyle="#ff775c";ctx.shadowBlur=26;ctx.shadowColor="#ff604c";ctx.lineWidth=7*(1-q)+1;ctx.beginPath();ctx.arc(0,0,hazard.radius*(.35+q),0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(255,105,75,.18)";ctx.beginPath();ctx.arc(0,0,hazard.radius*(.2+q*.8),0,Math.PI*2);ctx.fill();ctx.restore();continue;
    }
    if (hazard.type === "enemy-pulse" || hazard.type === "enemy-warning") {
      const progress = 1 - hazard.life / Math.max(0.001, hazard.maxLife || hazard.life);
      ctx.save(); ctx.globalAlpha = hazard.type === "enemy-warning" ? 0.35 + progress * 0.6 : 0.25 + progress * 0.65;
      ctx.strokeStyle = hazard.color || COLORS.pink; ctx.fillStyle = `${hazard.color || COLORS.pink}22`; ctx.lineWidth = 2;
      const r = hazard.type === "enemy-pulse" ? hazard.radius * (0.25 + progress * 0.75) : hazard.radius;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore(); continue;
    }
    // 旅者专属爆炸 / 光柱特效：分层冲击环、碎片放射与高亮核心。
    if (hazard.type === "traveller-explosion" || hazard.type === "traveller-pillar" || hazard.type === "traveller-hit" || hazard.type === "traveller-wave") {
      const progress = clamp(1 - hazard.life / Math.max(0.001, hazard.maxLife), 0, 1);
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = "#e4d9ff"; ctx.fillStyle = "rgba(228,217,255,.14)";
      ctx.shadowBlur = hazard.type === "traveller-pillar" ? 30 : 22; ctx.shadowColor = "#b9a6ff";
      if (hazard.type === "traveller-pillar") {
        const r = hazard.radius * (0.35 + progress * 1.8);
        ctx.fillStyle = `rgba(228,217,255,${0.18 * (1-progress)})`;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r, 0, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 7 * (1-progress) + 1;
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#fff8e6"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, -r * 1.65); ctx.lineTo(0, r * 1.65); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2); ctx.stroke();
      } else if (hazard.type === "traveller-wave") {
        const r = hazard.radius * progress;
        ctx.lineWidth = 8 * (1-progress) + 1;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#fff8e6"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r - 12), 0, Math.PI * 2); ctx.stroke();
      } else {
        const maxR = hazard.type === "traveller-explosion" ? hazard.radius : 20;
        const r = maxR * (0.25 + progress * 0.9);
        ctx.fillStyle = `rgba(185,166,255,${0.22 * (1-progress)})`;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = hazard.type === "traveller-explosion" ? 4 * (1-progress) + 1 : 2;
        ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = "#fff8e6"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI / 4 + progress * 0.7;
          const inner = r * 0.7, outer = r * (1.15 + (i % 2) * 0.2);
          ctx.beginPath(); ctx.moveTo(Math.cos(a)*inner, Math.sin(a)*inner); ctx.lineTo(Math.cos(a)*outer, Math.sin(a)*outer); ctx.stroke();
        }
        ctx.fillStyle = "#fff8e6"; ctx.beginPath(); ctx.arc(0, 0, Math.max(1, 5 * (1-progress)), 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();
      continue;
    }
    if (hazard.type === "phantom-heal" || hazard.type === "dodge-burst") {
      const progress = 1 - hazard.life / hazard.maxLife;
      ctx.save();
      ctx.globalAlpha = 1 - progress;
      ctx.strokeStyle = hazard.type === "phantom-heal" ? "#a8ffe0" : "#e9ddff";
      ctx.shadowBlur = 16; ctx.shadowColor = ctx.strokeStyle;
      ctx.lineWidth = hazard.type === "phantom-heal" ? 2 : 3;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius * (0.55 + progress * 1.1), 0, Math.PI * 2); ctx.stroke();
      if (hazard.type === "phantom-heal") {
        ctx.beginPath(); ctx.moveTo(hazard.x - 4, hazard.y); ctx.lineTo(hazard.x + 4, hazard.y); ctx.moveTo(hazard.x, hazard.y - 4); ctx.lineTo(hazard.x, hazard.y + 4); ctx.stroke();
      }
      ctx.restore();
    } else if (hazard.type === "phantom-domain") {
      const progress = 1 - hazard.life / hazard.maxLife;
      ctx.save();
      ctx.globalAlpha = 0.22 + Math.sin(game.elapsed * 5) * 0.06;
      ctx.fillStyle = "#9d7cff";
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.65 - progress * 0.25;
      ctx.strokeStyle = "#d6c8ff"; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius, game.elapsed * 0.35, game.elapsed * 0.35 + Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    } else if (hazard.type === "bulwark-ring" || hazard.type === "singularity-collapse") {
      const progress = 1 - hazard.life / hazard.maxLife;
      const color = hazard.type === "bulwark-ring" ? COLORS.violet : COLORS.orange;
      ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 1 - progress; ctx.lineWidth = hazard.type === "bulwark-ring" ? 4 : 6;
      ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius * progress, 0, Math.PI * 2); ctx.stroke();
      if (hazard.type === "singularity-collapse") { ctx.globalAlpha = .3 + progress * .4; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(hazard.x, hazard.y, hazard.radius * (1-progress) * .45, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    } else if (hazard.type === "judge-explosion") {
      const progress=1-hazard.life/hazard.maxLife, r=hazard.radius*(.18+progress*.95);
      ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalAlpha=1-progress;ctx.globalCompositeOperation="lighter";
      const grad=ctx.createRadialGradient(0,0,2,0,0,r);grad.addColorStop(0,"rgba(255,255,230,.9)");grad.addColorStop(.28,"rgba(255,195,82,.48)");grad.addColorStop(1,"rgba(255,93,54,0)");ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
      const rHit=!!hazard.judgeR;
      ctx.strokeStyle=rHit?"#ff536d":"#fff2bd";ctx.lineWidth=(rHit?5:3)*(1-progress)+.5;ctx.shadowBlur=rHit?30:20;ctx.shadowColor=rHit?"#ff315b":"#ffb94d";ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
      // 多层冲击环 + 十字裂光，让 R 的每次弹幕命中都能和普通命中区分开。
      ctx.strokeStyle=rHit?"#fff0b5":"#ffad4d";ctx.lineWidth=rHit?3:2;ctx.beginPath();ctx.arc(0,0,r*(.58+progress*.18),0,Math.PI*2);ctx.stroke();
      for(let i=0;i<(rHit?12:8);i++){const a=i*Math.PI/(rHit?6:4)+progress*.35,inner=r*(.38+progress*.2),outer=r*(.78+progress*.35);ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();}
      if(rHit){ctx.rotate(Math.PI/4+progress*.25);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-r*.75,0);ctx.lineTo(r*.75,0);ctx.moveTo(0,-r*.75);ctx.lineTo(0,r*.75);ctx.stroke();}
      ctx.restore();
    } else if (hazard.type === "judge-r-detonation") {
      const progress=clamp(1-hazard.life/Math.max(.001,hazard.maxLife),0,1);
      ctx.save();ctx.globalCompositeOperation="lighter";
      // 强制可见的 R 终结爆炸：先白金闪屏，再扩散金红环与放射裂光。
      ctx.globalAlpha=(1-progress)*.72;ctx.fillStyle="#fff2c2";ctx.fillRect(0,0,game.width,game.height);
      ctx.translate(hazard.x,hazard.y);
      const maxR=Math.hypot(game.width,game.height)*.78,r=maxR*(.08+progress*.92);
      ctx.globalAlpha=1-progress;const grad=ctx.createRadialGradient(0,0,1,0,0,r);grad.addColorStop(0,"rgba(255,255,245,.95)");grad.addColorStop(.18,"rgba(255,220,128,.72)");grad.addColorStop(.52,"rgba(255,70,100,.28)");grad.addColorStop(1,"rgba(255,55,95,0)");ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
      for(let i=0;i<28;i++){const a=i*Math.PI*2/28+progress*.22,inner=r*(.18+(i%3)*.035),outer=r*(.65+(i%4)*.09);ctx.strokeStyle=i%2?"#ff647e":"#fff1b5";ctx.globalAlpha=(1-progress)*.9;ctx.lineWidth=3*(1-progress)+.5;ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();}
      ctx.restore();
    } else if (hazard.type === "judge-execution-flash") {
      const progress=1-hazard.life/hazard.maxLife;ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalAlpha=1-progress;ctx.globalCompositeOperation="lighter";ctx.strokeStyle="#fff2bd";ctx.shadowBlur=32;ctx.shadowColor="#ffdb79";ctx.lineWidth=5*(1-progress)+.5;ctx.beginPath();ctx.arc(0,0,8+progress*(hazard.radius||90),0,Math.PI*2);ctx.stroke();ctx.fillStyle="rgba(255,235,170,.25)";ctx.beginPath();ctx.arc(0,0,progress*55,0,Math.PI*2);ctx.fill();ctx.restore();
    } else if (hazard.type === "judge-execution-burst") {
      const progress=1-hazard.life/hazard.maxLife, r=hazard.radius*(.15+progress);
      ctx.save();ctx.translate(hazard.x,hazard.y);ctx.globalAlpha=1-progress;ctx.globalCompositeOperation="lighter";
      const g=ctx.createRadialGradient(0,0,1,0,0,r);g.addColorStop(0,"rgba(255,255,245,.95)");g.addColorStop(.22,"rgba(255,217,119,.72)");g.addColorStop(.58,"rgba(255,77,109,.28)");g.addColorStop(1,"rgba(255,55,95,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
      for(let i=0;i<16;i++){const a=i*Math.PI/8+progress*.4,inner=r*(.3+progress*.2),outer=r*(.72+progress*.45);ctx.strokeStyle=i%2?"#ff6a86":"#fff0b5";ctx.lineWidth=2*(1-progress)+.4;ctx.beginPath();ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);ctx.stroke();}ctx.restore();
    } else if (hazard.type === "judge-cross") {
      const progress=1-hazard.life/hazard.maxLife;ctx.save();const pulse=.82+Math.sin(game.elapsed*18)*.08;ctx.globalAlpha=hazard.fired?.75:.35+progress*.55;ctx.translate(hazard.x,hazard.y);ctx.rotate(Math.PI/4);ctx.strokeStyle="#ffe6a1";ctx.fillStyle="rgba(255,211,104,.10)";ctx.lineWidth=2.5;ctx.shadowBlur=24;ctx.shadowColor="#ffe6a1";ctx.beginPath();ctx.arc(0,0,hazard.radius*pulse,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(0,0,hazard.radius*.78,-game.elapsed*2,Math.PI*2-game.elapsed*2);ctx.stroke();ctx.setLineDash([]);ctx.rotate(-Math.PI/4);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-hazard.radius*.72,0);ctx.lineTo(hazard.radius*.72,0);ctx.moveTo(0,-hazard.radius*.72);ctx.lineTo(0,hazard.radius*.72);ctx.stroke();ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-hazard.radius*.42,-hazard.radius*.42);ctx.lineTo(hazard.radius*.42,hazard.radius*.42);ctx.moveTo(hazard.radius*.42,-hazard.radius*.42);ctx.lineTo(-hazard.radius*.42,hazard.radius*.42);ctx.stroke();for(let k=0;k<8;k++){const a=k*Math.PI/4+game.elapsed*.3;ctx.beginPath();ctx.moveTo(Math.cos(a)*hazard.radius*.85,Math.sin(a)*hazard.radius*.85);ctx.lineTo(Math.cos(a)*hazard.radius,Math.sin(a)*hazard.radius);ctx.stroke();}ctx.restore();
    } else if (hazard.type === "judge-scales") {
      const progress=1-hazard.life/hazard.maxLife;ctx.save();ctx.globalAlpha=.35+Math.sin(game.elapsed*8)*.12;ctx.strokeStyle="#f7d985";ctx.fillStyle="rgba(247,217,133,.08)";ctx.lineWidth=2.4;ctx.shadowBlur=25;ctx.shadowColor="#f7d985";const cx=game.width*.5, top=game.height*.18, span=Math.min(game.width*.32,250);ctx.beginPath();ctx.arc(cx,top+game.height*.13,span*.9,0,Math.PI*2);ctx.stroke();
      // ornate balance beam, central pillar, chains and pans
      ctx.beginPath();ctx.moveTo(cx,top+game.height*.28);ctx.lineTo(cx,top);ctx.lineTo(cx-span*.72,top+game.height*.035);ctx.lineTo(cx+span*.72,top+game.height*.035);ctx.moveTo(cx-span*.72,top+game.height*.035);ctx.lineTo(cx-span*.72,top+game.height*.19);ctx.moveTo(cx+span*.72,top+game.height*.035);ctx.lineTo(cx+span*.72,top+game.height*.19);ctx.stroke();
      for(const side of [-1,1]){const x=cx+side*span*.72,y=top+game.height*.19;ctx.beginPath();ctx.moveTo(x-span*.2,y);ctx.quadraticCurveTo(x,y+14,x+span*.2,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-span*.2,y);ctx.lineTo(x+span*.2,y);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(cx-span*.12,top+game.height*.28);ctx.lineTo(cx,top+game.height*.23);ctx.lineTo(cx+span*.12,top+game.height*.28);ctx.closePath();ctx.stroke();for(let k=0;k<13;k++){const a=k*Math.PI*2/13+game.elapsed*.25;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*span*.98,top+game.height*.13+Math.sin(a)*span*.98);ctx.lineTo(cx+Math.cos(a)*(span*1.04),top+game.height*.13+Math.sin(a)*(span*1.04));ctx.stroke();}ctx.fillStyle="#fff2bb";ctx.font="bold 11px monospace";ctx.textAlign="center";ctx.fillText(game.judgeRTimer>0?`FINAL JUDGMENT · ${game.judgeRTimer.toFixed(1)}s`:`JUDGMENT · ${game.judgeQTimer.toFixed(1)}s`,cx,top+game.height*.34);ctx.restore();
    } else if (hazard.type === "ultimate") {
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

    if (hazard.type === "fuse-laser") {
      ctx.save();
      const charging = hazard.telegraph > 0;
      ctx.globalAlpha = charging ? 0.42 + Math.sin(game.elapsed * 24) * 0.18 : 0.95;
      ctx.strokeStyle = charging ? COLORS.orange : COLORS.pink;
      ctx.shadowBlur = charging ? 10 : 24;
      ctx.shadowColor = charging ? COLORS.orange : COLORS.pink;
      ctx.lineWidth = charging ? 2 : 10;
      ctx.beginPath();
      ctx.moveTo(hazard.x1, hazard.y1);
      ctx.lineTo(hazard.x2, hazard.y2);
      ctx.stroke();
      if (!charging) {
        ctx.strokeStyle = "#fff3f8";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hazard.x1, hazard.y1);
        ctx.lineTo(hazard.x2, hazard.y2);
        ctx.stroke();
      }
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
      ctx.strokeStyle = hazard.eliteAirstrike ? "#ff5c8a" : COLORS.orange;
      ctx.fillStyle = hazard.eliteAirstrike ? "rgba(255,70,125,.16)" : "rgba(255,180,110,.10)";
      ctx.lineWidth = 2;
      ctx.shadowBlur = 12;
      ctx.shadowColor = hazard.eliteAirstrike ? "#ff5c8a" : COLORS.orange;

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

    if (hazard.type === "stalker-phase-portal") {
      const pulse = 0.8 + Math.sin(game.elapsed * 9 + (hazard.spin || 0)) * 0.15;
      ctx.save();
      ctx.translate(hazard.x, hazard.y);
      ctx.rotate(game.elapsed * 1.6 + (hazard.spin || 0));
      ctx.globalAlpha = clamp(hazard.life / hazard.maxLife, 0.2, 1);
      ctx.strokeStyle = COLORS.pink; ctx.shadowBlur = 22; ctx.shadowColor = COLORS.pink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, hazard.radius * pulse, hazard.radius * 1.35, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, 0, hazard.radius * 0.55, hazard.radius * 1.05, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(-hazard.radius * 0.65, 0); ctx.lineTo(hazard.radius * 0.65, 0); ctx.moveTo(0, -hazard.radius * 0.8); ctx.lineTo(0, hazard.radius * 0.8); ctx.stroke();
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
  drawIllusionClones();
  drawFuseDrones();
  drawBoss();
  drawAlephEffects();
  drawFuseSummon();
  drawParadoxEffects();
  drawTravellerEffects();
  drawPlayer();
  drawParticles();
  drawDeathEffects();
}

function frame(now) {
  const dt = Math.min(
    (now - (game.lastTime || now)) / 1000,
    0.033
  );

  game.lastTime = now;

  update(dt);
  // ZERO / Aleph use denser bespoke rendering. Keep simulation at the display refresh
  // rate, but cap only their canvas paint pass at 45 FPS to reduce GPU pressure.
  const specialRender = game.boss?.type === "zero" || game.character === "aleph";
  const renderInterval = specialRender ? (1000 / 45) : 0;
  if (!specialRender || now - (game.lastSpecialRender || 0) >= renderInterval) {
    render();
    if (specialRender) game.lastSpecialRender = now;
  }

  requestAnimationFrame(frame);
}

