const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

// 加载 CSS 内容
const css = fs.readFileSync("dist/assets/index-9nXAPP7o.css", "utf8");

// 创建 DOM
const dom = new JSDOM(`<!DOCTYPE html><html><head><style>${css}</style></head><body><div id="app"></div></body></html>`, {
  runScripts: "dangerously",
  resources: "usable",
  url: "http://localhost/"
});

const { window } = dom;

// 把 window/document 等暴露到 global（built JS 需要）
global.window = window;
global.document = window.document;
global.navigator = window.navigator;
global.history = window.history;
global.location = window.location;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// 捕获错误
window.addEventListener("error", (e) => {
  console.error("❌ 全局错误:", e.message, "\n  文件:", e.filename, "\n  行:", e.lineno);
  if (e.error?.stack) console.error("  堆栈:", e.error.stack.split("\n").slice(0,5).join("\n"));
});

console.log("=== 模拟浏览器环境就绪 ===");
console.log("document.getElementById('app'):", !!window.document.getElementById("app"));

// 读取并执行 built JS
const js = fs.readFileSync(path.resolve("dist/assets/index-BRuM8MyL.js"), "utf8");
console.log("built JS 大小:", js.length, "chars");
console.log("JS 前 200 字符:", js.substring(0, 200));

// 尝试在 vm context 里跑
const vm = require("vm");
const context = vm.createContext({
  window, document, navigator, history, location,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  URL, Map, Set, Symbol, Promise, Array, Object, String, Number, Boolean, Math, Date, RegExp, Error, TypeError, RangeError, ReferenceError, JSON,
  performance: { now: () => Date.now() },
  __DEV__: false,
});

console.log("\n=== 开始执行 built JS ===");
try {
  vm.runInContext(js, context, { timeout: 5000 });
  console.log("✅ JS 执行完毕");
  
  // 检查结果
  const app = window.document.getElementById("app");
  console.log("\n=== #app 渲染结果 ===");
  console.log("innerHTML 长度:", app.innerHTML.length);
  console.log("内容预览:", app.innerHTML.substring(0, 300));
  
  if (app.innerHTML.includes("吃什么")) {
    console.log("✅ React 渲染成功!");
  } else {
    console.log("❌ 没看到 吃什么");
  }
} catch(e) {
  console.error("❌ 执行出错:", e.message);
  console.error("堆栈:", e.stack?.split("\n").slice(0,5).join("\n"));
}
