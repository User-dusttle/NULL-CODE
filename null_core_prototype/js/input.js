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
  if (key === "r") useParadoxR();

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

