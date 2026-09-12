// 吃什么 · 饭点决策助手
// 纯前端实现，基于 SKILL.md v2.3.0 + 减肥功能扩展

// === 菜品库（26 道，按常见做法估算热量）===
export const DISHES = [
  { name: "麻辣香锅", type: "中餐", region: "川渝", tags: ["重口", "过瘾"], time: 25, price: "中", avoid: ["海鲜(可选)"], kcal: 950 },
  { name: "火锅", type: "中餐", region: "川渝", tags: ["治愈", "重口", "聚会"], time: 30, price: "高", avoid: ["海鲜(可选)"], kcal: 1200 },
  { name: "酸辣粉", type: "中餐", region: "川渝", tags: ["重口", "快捷"], time: 10, price: "低", avoid: ["花生"], kcal: 520 },
  { name: "宫保鸡丁", type: "中餐", region: "川渝", tags: ["重口", "下饭"], time: 20, price: "中", avoid: ["花生"], kcal: 780 },
  { name: "肠粉", type: "中餐", region: "广东", tags: ["清淡", "快捷"], time: 10, price: "低", avoid: [], kcal: 320 },
  { name: "煲仔饭", type: "中餐", region: "广东", tags: ["清淡", "香"], time: 20, price: "中", avoid: [], kcal: 680 },
  { name: "白切鸡", type: "中餐", region: "广东", tags: ["清淡", "精致"], time: 30, price: "中", avoid: [], kcal: 450 },
  { name: "老火汤", type: "中餐", region: "广东", tags: ["清淡", "滋补"], time: 60, price: "中", avoid: [], kcal: 380 },
  { name: "东坡肉", type: "中餐", region: "江浙", tags: ["治愈", "过瘾"], time: 30, price: "中", avoid: [], kcal: 850 },
  { name: "小笼包", type: "中餐", region: "江浙", tags: ["清淡", "精致"], time: 15, price: "低", avoid: [], kcal: 280 },
  { name: "糖醋排骨", type: "中餐", region: "江浙", tags: ["咸鲜", "下饭"], time: 25, price: "中", avoid: [], kcal: 760 },
  { name: "饺子", type: "中餐", region: "东北", tags: ["治愈", "清淡"], time: 20, price: "低", avoid: [], kcal: 520 },
  { name: "锅包肉", type: "中餐", region: "东北", tags: ["过瘾", "咸香"], time: 30, price: "中", avoid: [], kcal: 680 },
  { name: "地三鲜", type: "中餐", region: "东北", tags: ["清淡", "下饭"], time: 15, price: "低", avoid: [], kcal: 340 },
  { name: "牛肉面", type: "中餐", region: "西北", tags: ["过瘾", "治愈"], time: 15, price: "中", avoid: [], kcal: 620 },
  { name: "肉夹馍", type: "中餐", region: "西北", tags: ["快捷", "过瘾"], time: 10, price: "低", avoid: [], kcal: 480 },
  { name: "凉皮", type: "中餐", region: "西北", tags: ["快捷", "清爽"], time: 10, price: "低", avoid: [], kcal: 290 },
  { name: "剁椒鱼头", type: "中餐", region: "湖南", tags: ["重口", "过瘾"], time: 30, price: "中", avoid: [], kcal: 720 },
  { name: "小炒肉", type: "中餐", region: "湖南", tags: ["重口", "下饭"], time: 15, price: "低", avoid: [], kcal: 640 },
  { name: "米粉", type: "中餐", region: "湖南", tags: ["重口", "快捷"], time: 10, price: "低", avoid: [], kcal: 420 },
  { name: "番茄鸡蛋面", type: "中餐", region: "通用", tags: ["快捷", "清淡", "治愈"], time: 15, price: "低", avoid: [], kcal: 380 },
  { name: "蛋炒饭", type: "中餐", region: "通用", tags: ["快捷", "清淡"], time: 10, price: "低", avoid: [], kcal: 480 },
  { name: "三明治", type: "西餐", region: "通用", tags: ["快捷", "清淡"], time: 10, price: "低", avoid: ["乳制品"], kcal: 420 },
  { name: "牛油果沙拉", type: "西餐", region: "通用", tags: ["清淡", "健康", "快捷"], time: 10, price: "中", avoid: ["乳制品"], kcal: 350 },
  { name: "寿司拼盘", type: "日料", region: "通用", tags: ["清淡", "精致"], time: 20, price: "中", avoid: ["生食"], kcal: 300 },
  { name: "抹茶拿铁+可颂", type: "饮品", region: "通用", tags: ["治愈", "轻食"], time: 5, price: "低", avoid: ["乳糖"], kcal: 380 },
];

export const EMOJI_MAP = { 中餐: "🍜", 西餐: "🥗", 日料: "🍣", 饮品: "☕", 小吃: "🍕" };

// === 决策引擎 ===

// 1. 忌口过滤
function filterAvoid(dishes, avoidList) {
  if (!avoidList || avoidList.length === 0) return dishes;
  const avoidSet = new Set(avoidList.map(a => a.trim().toLowerCase()));
  return dishes.filter(d => {
    if (!d.avoid || d.avoid.length === 0) return true;
    return !d.avoid.some(a => {
      const clean = a.replace("(可选)", "").trim().toLowerCase();
      return avoidSet.has(clean);
    });
  });
}

// 2. 轻食过滤
function filterCalorie(dishes, lightMode) {
  if (!lightMode) return dishes;
  return dishes.filter(d => d.kcal < 800); // 排除高卡
}

// 3. 地域匹配
function pickByRegion(dishes, regionHint) {
  if (!regionHint) return dishes;
  const match = dishes.find(d => d.region === regionHint);
  if (match && Math.random() < 0.7) return dishes.filter(d => d.region === regionHint);
  return dishes;
}

// 4. 随机 / 最优
function pickRandom(dishes) {
  if (dishes.length === 0) return null;
  return dishes[Math.floor(Math.random() * dishes.length)];
}
function pickTop(dishes, lightMode) {
  if (dishes.length === 0) return null;
  if (lightMode) {
    return dishes.slice().sort((a, b) => a.kcal - b.kcal)[0];
  }
  return pickRandom(dishes);
}

// 主决策
export function decide({ avoid = [], lightMode = false, region = "", mode = "recommend" }) {
  let pool = DISHES;
  pool = filterAvoid(pool, avoid);
  pool = filterCalorie(pool, lightMode);
  pool = pickByRegion(pool, region);

  if (pool.length === 0) {
    // 兜底：放宽热量
    pool = filterAvoid(DISHES, avoid);
  }
  if (pool.length === 0) {
    pool = DISHES; // 最终兜底
  }

  const result = mode === "blindbox" ? pickRandom(pool) : pickTop(pool, lightMode);
  return result;
}

// 生成理由
export function makeReason(dish, lightMode, region) {
  const parts = [];
  if (region && dish.region === region) parts.push(`匹配你${region}地域偏好`);
  else if (dish.region === "通用") parts.push("通用稳妥选择");
  if (lightMode && dish.kcal <= 500) parts.push(`低卡(${dish.kcal}kcal)适合减脂`);
  else if (lightMode) parts.push(`可接受热量(${dish.kcal}kcal)`);
  if (dish.tags.includes("治愈")) parts.push("带治愈感");
  if (dish.time <= 10) parts.push("10分钟搞定");
  return parts.join("，") || "随机挑选";
}

export const EMOJIS = ["🍜", "🍕", "🥗", "🍣", "☕", "🍲", "🥘"];
