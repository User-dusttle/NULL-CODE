# NULL//CORE 本地拆分测试包

本包把 `main.js` 拆成多个 JavaScript 文件，并补入原项目页面与样式资源，方便整体本地测试。没有更新仓库。

## 文件结构

- `index.html`：页面入口
- `css/style.css`、`css/lobby.css`：原项目样式
- `js/lobby.js`：原项目大厅逻辑
- `main.js`：按顺序加载拆分后的战斗逻辑
- `js/core.js`、`js/game-flow.js`、`js/player.js`、`js/minions.js`、`js/bosses.js`、`js/combat.js`、`js/renderer.js`、`js/input.js`：拆分文件

## 本地测试

1. 解压后从项目目录启动 HTTP 服务，不要直接双击 `index.html` 用 `file://` 打开。
2. 如果你的实际入口是 `index.html`，保留 `<script type="module" src="./js/main.js"></script>` 这一行，并将根目录的 `main.js` 作为加载器入口的做法改为把加载器放到 `js/main.js`。当前包为了兼容已有目录结构，将拆分文件放在 `js/` 下，建议将根目录 `main.js` 内容复制到 `js/main.js` 前先备份原文件。
3. 用 `?debug=1` 测试原调试开关。
4. 打开开发者工具检查 Console 和 Network；若报错，先记录第一条错误。

注意：本包尚未经过浏览器端完整回归测试。请先保留原目录备份。
