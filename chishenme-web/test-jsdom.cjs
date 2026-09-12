const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

const css = fs.readFileSync("dist/assets/index-9nXAPP7o.css", "utf8");

const dom = new JSDOM(`<!DOCTYPE html><html><head><style>${css}</style></head><body><div id="app"></div></body></html>`, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/"
});

const { window } = dom;

window.addEventListener("error", (e) => {
  console.error("❌ 全局错误:", e.message, "@ line", e.lineno);
  if (e.error?.stack) console.error(e.error.stack.split("\n").slice(0,5).join("\n"));
});

console.log("=== 环境就绪 ===");

const js = fs.readFileSync(path.resolve("dist/assets/index-BRuM8MyL.js"), "utf8");
console.log("built JS:", js.length, "chars");

const vm = require("vm");
const context = vm.createContext({
  window, document: window.document, navigator: window.navigator,
  history: window.history, location: window.location,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  URL, Map, Set, Symbol, Promise, Array, Object, String, Number, Boolean, Math, Date, RegExp, Error, TypeError, RangeError, ReferenceError, JSON,
  performance: { now: () => Date.now() },
  __DEV__: false,
});

console.log("\n=== 执行 built JS ===");
try {
  vm.runInContext(js, context, { timeout: 5000 });
  console.log("✅ JS 执行完毕");
  
  const app = window.document.getElementById("app");
  console.log("\n=== #app 结果 ===");
  console.log("innerHTML:", app.innerHTML.length, "chars");
  console.log("预览:", app.innerHTML.substring(0, 500));
  console.log("\n含 '吃什么':", app.innerHTML.includes("吃什么"));
} catch(e) {
  console.error("❌ 执行出错:", e.message);
  console.error(e.stack?.split("\n").slice(0,8).join("\n"));
}
