/*
 * NULL//CORE split loader.
 * Keep index.html's <script type="module" src="./js/main.js"> entry point,
 * or point it at this file if you place this loader at the project root.
 * Classic scripts are loaded in order so the original shared global scope is preserved.
 */
const BASE_URL = new URL("./", import.meta.url);
const FILES = [
  "core.js",
  "game-flow.js",
  "rogue-map.js",
  "player.js",
  "judge.js",
  "traveller.js",
  "minions.js",
  "bosses.js",
  "combat.js",
  "renderer.js",
  "input.js",
];

function loadScript(path) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, BASE_URL).href;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${path}`));
    document.head.appendChild(script);
  });
}

for (const file of FILES) {
  await loadScript(file);
}
