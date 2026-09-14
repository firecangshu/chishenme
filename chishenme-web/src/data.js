// 吃什么 · 饭点决策助手
// 纯前端实现，基于 SKILL.md v2.3.0 + 减肥功能扩展
// 2026-09-12：忌口体系结构化 —— 每道菜标注 spicy(辣度)/contain(成分标签)/veggie(素食)

// === 忌口规范标签命名空间（contain 与筛选器共用，禁止随手造词）===
// 肉类：猪肉 / 牛肉 / 羊肉 / 鸡肉 / 鱼 / 虾
// 过敏原：花生 / 海鲜 / 乳制品 / 鸡蛋 / 大豆 / 麸质 / 生食 / 坚果
// 口味：spicy 0=不辣 1=微辣 2=辣；veggie=true 为素食（无肉无鱼虾，蛋奶素算素）

// === 菜品库（48 道，按常见做法估算热量）===
export const DISHES = [
  { name: "麻辣香锅", type: "中餐", region: "川渝", tags: ["重口", "过瘾"], time: 25, price: "中", kcal: 950, spicy: 2, contain: ["猪肉", "鸡肉", "花生", "麸质"], veggie: false },
  { name: "火锅", type: "中餐", region: "川渝", tags: ["治愈", "重口", "聚会"], time: 30, price: "高", kcal: 1200, spicy: 2, contain: ["牛肉", "羊肉", "猪肉", "海鲜"], veggie: false },
  { name: "酸辣粉", type: "中餐", region: "川渝", tags: ["重口", "快捷"], time: 10, price: "低", kcal: 520, spicy: 1, contain: ["花生", "麸质"], veggie: true },
  { name: "宫保鸡丁", type: "中餐", region: "川渝", tags: ["重口", "下饭"], time: 20, price: "中", kcal: 780, spicy: 1, contain: ["鸡肉", "花生"], veggie: false },
  { name: "肠粉", type: "中餐", region: "广东", tags: ["清淡", "快捷"], time: 10, price: "低", kcal: 320, spicy: 0, contain: ["鸡蛋"], veggie: true },
  { name: "煲仔饭", type: "中餐", region: "广东", tags: ["清淡", "香"], time: 20, price: "中", kcal: 680, spicy: 0, contain: ["猪肉", "大豆"], veggie: false },
  { name: "白切鸡", type: "中餐", region: "广东", tags: ["清淡", "精致"], time: 30, price: "中", kcal: 450, spicy: 0, contain: ["鸡肉"], veggie: false },
  { name: "老火汤", type: "中餐", region: "广东", tags: ["清淡", "滋补"], time: 60, price: "中", kcal: 380, spicy: 0, contain: ["猪肉"], veggie: false },
  { name: "东坡肉", type: "中餐", region: "江浙", tags: ["治愈", "过瘾"], time: 30, price: "中", kcal: 850, spicy: 0, contain: ["猪肉", "大豆", "麸质"], veggie: false },
  { name: "小笼包", type: "中餐", region: "江浙", tags: ["清淡", "精致"], time: 15, price: "低", kcal: 280, spicy: 0, contain: ["猪肉", "麸质"], veggie: false },
  { name: "糖醋排骨", type: "中餐", region: "江浙", tags: ["咸鲜", "下饭"], time: 25, price: "中", kcal: 760, spicy: 0, contain: ["猪肉", "麸质", "鸡蛋"], veggie: false },
  { name: "饺子", type: "中餐", region: "东北", tags: ["治愈", "清淡"], time: 20, price: "低", kcal: 520, spicy: 0, contain: ["猪肉", "麸质"], veggie: false },
  { name: "锅包肉", type: "中餐", region: "东北", tags: ["过瘾", "咸香"], time: 30, price: "中", kcal: 680, spicy: 0, contain: ["猪肉", "麸质", "鸡蛋"], veggie: false },
  { name: "地三鲜", type: "中餐", region: "东北", tags: ["清淡", "下饭"], time: 15, price: "低", kcal: 340, spicy: 0, contain: [], veggie: true },
  { name: "牛肉面", type: "中餐", region: "西北", tags: ["过瘾", "治愈"], time: 15, price: "中", kcal: 620, spicy: 0, contain: ["牛肉", "麸质"], veggie: false },
  { name: "肉夹馍", type: "中餐", region: "西北", tags: ["快捷", "过瘾"], time: 10, price: "低", kcal: 480, spicy: 0, contain: ["猪肉", "麸质"], veggie: false },
  { name: "凉皮", type: "中餐", region: "西北", tags: ["快捷", "清爽"], time: 10, price: "低", kcal: 290, spicy: 0, contain: ["麸质"], veggie: true },
  { name: "剁椒鱼头", type: "中餐", region: "湖南", tags: ["重口", "过瘾"], time: 30, price: "中", kcal: 720, spicy: 2, contain: ["鱼", "海鲜"], veggie: false },
  { name: "小炒肉", type: "中餐", region: "湖南", tags: ["重口", "下饭"], time: 15, price: "低", kcal: 640, spicy: 2, contain: ["猪肉"], veggie: false },
  { name: "米粉", type: "中餐", region: "湖南", tags: ["重口", "快捷"], time: 10, price: "低", kcal: 420, spicy: 0, contain: ["牛肉", "猪肉"], veggie: false },
  { name: "番茄鸡蛋面", type: "中餐", region: "通用", tags: ["快捷", "清淡", "治愈"], time: 15, price: "低", kcal: 380, spicy: 0, contain: ["鸡蛋", "麸质"], veggie: true },
  { name: "蛋炒饭", type: "中餐", region: "通用", tags: ["快捷", "清淡"], time: 10, price: "低", kcal: 480, spicy: 0, contain: ["鸡蛋"], veggie: true },
  { name: "三明治", type: "西餐", region: "通用", tags: ["快捷", "清淡"], time: 10, price: "低", kcal: 420, spicy: 0, contain: ["猪肉", "乳制品", "麸质", "鸡蛋"], veggie: false },
  { name: "牛油果沙拉", type: "西餐", region: "通用", tags: ["清淡", "健康", "快捷"], time: 10, price: "中", kcal: 350, spicy: 0, contain: ["乳制品"], veggie: true },
  { name: "寿司拼盘", type: "日料", region: "通用", tags: ["清淡", "精致"], time: 20, price: "中", kcal: 300, spicy: 0, contain: ["鱼", "虾", "海鲜", "生食", "大豆"], veggie: false },
  { name: "抹茶拿铁+可颂", type: "饮品", region: "通用", tags: ["治愈", "轻食"], time: 5, price: "低", kcal: 380, spicy: 0, contain: ["乳制品", "麸质", "鸡蛋"], veggie: true },
  // === 2026-09-12 新增轻食菜品（≤500 kcal，扩充轻食选择池）===
  { name: "清蒸鲈鱼", type: "中餐", region: "广东", tags: ["清淡", "健康"], time: 20, price: "中", kcal: 300, spicy: 0, contain: ["鱼", "海鲜", "大豆"], veggie: false },
  { name: "虾仁蒸蛋", type: "中餐", region: "广东", tags: ["清淡", "快捷"], time: 15, price: "低", kcal: 400, spicy: 0, contain: ["虾", "海鲜", "鸡蛋"], veggie: false },
  { name: "蔬菜鸡肉卷", type: "西餐", region: "通用", tags: ["清淡", "健康", "快捷"], time: 10, price: "低", kcal: 420, spicy: 0, contain: ["鸡肉", "麸质"], veggie: false },
  { name: "燕麦牛奶粥", type: "中餐", region: "通用", tags: ["清淡", "治愈"], time: 15, price: "低", kcal: 350, spicy: 0, contain: ["乳制品"], veggie: true },
  { name: "荞麦冷面", type: "日料", region: "通用", tags: ["清爽", "快捷"], time: 15, price: "低", kcal: 380, spicy: 0, contain: ["麸质", "鸡蛋"], veggie: true },
  { name: "关东煮", type: "日料", region: "通用", tags: ["清淡", "治愈"], time: 10, price: "低", kcal: 350, spicy: 0, contain: ["鱼", "虾", "海鲜", "大豆", "猪肉"], veggie: false },
  { name: "南瓜小米粥", type: "中餐", region: "通用", tags: ["清淡", "治愈"], time: 20, price: "低", kcal: 260, spicy: 0, contain: [], veggie: true },
  { name: "紫菜包饭", type: "日料", region: "通用", tags: ["清淡", "快捷"], time: 10, price: "低", kcal: 380, spicy: 0, contain: ["猪肉", "鸡蛋", "大豆", "鱼", "海鲜"], veggie: false },
  { name: "卤肉盖浇饭", type: "中餐", region: "台式", tags: ["下饭", "治愈"], time: 15, price: "中", kcal: 720, spicy: 0, contain: ["猪肉", "大豆"], veggie: false },
  { name: "咖喱鸡肉盖浇饭", type: "中餐", region: "日式", tags: ["下饭", "治愈", "浓郁"], time: 20, price: "中", kcal: 680, spicy: 0, contain: ["鸡肉", "乳制品"], veggie: false },
  { name: "番茄鸡蛋盖浇饭", type: "中餐", region: "通用", tags: ["清淡", "下饭", "快捷"], time: 10, price: "低", kcal: 560, spicy: 0, contain: ["鸡蛋"], veggie: true },
  { name: "鱼香肉丝盖浇饭", type: "中餐", region: "川渝", tags: ["下饭", "重口"], time: 15, price: "中", kcal: 700, spicy: 1, contain: ["猪肉"], veggie: false },
  { name: "肥牛盖浇饭", type: "中餐", region: "日式", tags: ["下饭", "治愈", "浓郁"], time: 15, price: "中", kcal: 750, spicy: 0, contain: ["牛肉", "大豆"], veggie: false },
  { name: "猪脚饭", type: "中餐", region: "潮汕", tags: ["下饭", "治愈", "浓郁"], time: 20, price: "中", kcal: 780, spicy: 0, contain: ["猪肉", "大豆"], veggie: false },
  { name: "叉烧饭", type: "中餐", region: "广东", tags: ["下饭", "甜咸", "精致"], time: 15, price: "中", kcal: 680, spicy: 0, contain: ["猪肉", "大豆"], veggie: false },
  { name: "回锅肉盖浇饭", type: "中餐", region: "川渝", tags: ["下饭", "重口", "过瘾"], time: 20, price: "中", kcal: 760, spicy: 1, contain: ["猪肉"], veggie: false },
  { name: "麻婆豆腐盖浇饭", type: "中餐", region: "川渝", tags: ["下饭", "重口", "麻辣"], time: 15, price: "低", kcal: 620, spicy: 2, contain: ["猪肉", "大豆"], veggie: false },
  { name: "梅菜扣肉饭", type: "中餐", region: "江浙", tags: ["下饭", "治愈", "浓郁"], time: 30, price: "中", kcal: 820, spicy: 0, contain: ["猪肉", "大豆"], veggie: false },
  { name: "干炒牛河", type: "中餐", region: "广东", tags: ["重口", "过瘾", "锅气"], time: 15, price: "中", kcal: 720, spicy: 0, contain: ["牛肉", "麸质", "大豆"], veggie: false },
  { name: "炒米粉", type: "中餐", region: "通用", tags: ["快捷", "过瘾", "锅气"], time: 10, price: "低", kcal: 580, spicy: 0, contain: ["鸡蛋", "大豆"], veggie: true },
  { name: "炒面", type: "中餐", region: "通用", tags: ["快捷", "过瘾", "锅气"], time: 10, price: "低", kcal: 620, spicy: 0, contain: ["鸡蛋", "麸质", "大豆"], veggie: true },
  { name: "烧烤", type: "中餐", region: "通用", tags: ["重口", "过瘾", "聚会"], time: 20, price: "中", kcal: 550, spicy: 1, contain: ["羊肉", "牛肉", "猪肉", "鸡肉", "海鲜", "大豆"], veggie: false },
];

export const EMOJI_MAP = { 中餐: "🍜", 西餐: "🥗", 日料: "🍣", 饮品: "☕", 小吃: "🍕" };

// === 菜品配图（2026-09-12 生成，治愈系插画，与菜名一一对应）===
// 图片存放于部署目录 images/ 下，加载失败时回退到 EMOJI_MAP
export const DISH_IMAGE_MAP = {
  "麻辣香锅": "dish-01.jpg",
  "火锅": "dish-02.jpg",
  "酸辣粉": "dish-03.jpg",
  "宫保鸡丁": "dish-04.jpg",
  "肠粉": "dish-05.jpg",
  "煲仔饭": "dish-06.jpg",
  "白切鸡": "dish-07.jpg",
  "老火汤": "dish-08.jpg",
  "东坡肉": "dish-09.jpg",
  "小笼包": "dish-10.jpg",
  "糖醋排骨": "dish-11.jpg",
  "饺子": "dish-12.jpg",
  "锅包肉": "dish-13.jpg",
  "地三鲜": "dish-14.jpg",
  "牛肉面": "dish-15.jpg",
  "肉夹馍": "dish-16.jpg",
  "凉皮": "dish-17.jpg",
  "剁椒鱼头": "dish-18.jpg",
  "小炒肉": "dish-19.jpg",
  "米粉": "dish-20.jpg",
  "番茄鸡蛋面": "dish-21.jpg",
  "蛋炒饭": "dish-22.jpg",
  "三明治": "dish-23.jpg",
  "牛油果沙拉": "dish-24.jpg",
  "寿司拼盘": "dish-25.jpg",
  "抹茶拿铁+可颂": "dish-26.jpg",
  "清蒸鲈鱼": "dish-27.jpg",
  "虾仁蒸蛋": "dish-28.jpg",
  "蔬菜鸡肉卷": "dish-29.jpg",
  "燕麦牛奶粥": "dish-30.jpg",
  "荞麦冷面": "dish-31.jpg",
  "关东煮": "dish-32.jpg",
  "南瓜小米粥": "dish-33.jpg",
  "紫菜包饭": "dish-34.jpg",
  "卤肉盖浇饭": "dish-35.jpg",
  "咖喱鸡肉盖浇饭": "dish-36.jpg",
  "番茄鸡蛋盖浇饭": "dish-37.jpg",
  "鱼香肉丝盖浇饭": "dish-38.jpg",
  "肥牛盖浇饭": "dish-39.jpg",
  "猪脚饭": "dish-40.jpg",
  "叉烧饭": "dish-41.jpg",
  "回锅肉盖浇饭": "dish-42.jpg",
  "麻婆豆腐盖浇饭": "dish-43.jpg",
  "梅菜扣肉饭": "dish-44.jpg",
  "干炒牛河": "dish-45.jpg",
  "炒米粉": "dish-46.jpg",
  "炒面": "dish-47.jpg",
  "烧烤": "dish-48.jpg",
};

// === 忌口体系 ===

// Step1 快捷分类（UI 按此渲染；key 为特殊开关，tag 为成分标签，每个 tag 都是独立忌口项）
export const AVOID_CATEGORIES = [
  { key: "spicy",  emoji: "🌶️", label: "忌辣",   group: "口味" },
  { tag: "猪肉",   emoji: "🐷", label: "猪肉",   group: "肉类" },
  { tag: "牛肉",   emoji: "🐂", label: "牛肉",   group: "肉类" },
  { tag: "羊肉",   emoji: "🐑", label: "羊肉",   group: "肉类" },
  { tag: "鸡肉",   emoji: "🐔", label: "鸡肉",   group: "肉类" },
  { tag: "海鲜",   emoji: "🦐", label: "海鲜水产", group: "过敏原" },
  { tag: "花生",   emoji: "🥜", label: "花生",   group: "过敏原" },
  { tag: "乳制品", emoji: "🥛", label: "乳制品", group: "过敏原" },
  { tag: "鸡蛋",   emoji: "🥚", label: "鸡蛋",   group: "过敏原" },
  { tag: "大豆",   emoji: "🌱", label: "大豆",   group: "过敏原" },
  { tag: "麸质",   emoji: "🌾", label: "麸质面食", group: "过敏原" },
  { key: "veggie", emoji: "🌿", label: "全素",   group: "饮食" },
];

// 自由文本 → 规范类别的同义词词典（命中即归入对应标签/开关）
const SYNONYM_RULES = [
  { key: "spicy", words: ["辣", "辛辣", "辣椒", "忌辣", "太辣"] },
  { key: "veggie", words: ["全素", "素食", "吃素", "素菜", "斋", "素"] },
  { tag: "猪肉", words: ["猪肉", "排骨", "五花", "腊肉", "腊肠", "火腿", "培根", "午餐肉", "肘子", "肉丸", "里脊", "猪"] },
  { tag: "牛肉", words: ["牛肉", "牛排", "牛腩", "肥牛"] },
  { tag: "羊肉", words: ["羊肉", "羊排", "羔羊"] },
  { tag: "鸡肉", words: ["鸡肉", "鸡腿", "鸡胸", "禽类", "禽肉", "吃鸡"] },
  { tag: "鱼", words: ["鱼"] },
  { tag: "虾", words: ["虾", "蟹", "贝壳"] },
  { tag: "海鲜", words: ["海鲜", "水产", "河鲜", "刺身", "生鲜"] },
  { tag: "花生", words: ["花生"] },
  { tag: "乳制品", words: ["乳制品", "牛奶", "乳糖", "芝士", "奶酪", "奶油", "黄油", "拿铁", "酸奶", "奶"] },
  { tag: "鸡蛋", words: ["鸡蛋", "蛋类", "蛋"] },
  { tag: "大豆", words: ["大豆", "黄豆", "豆制品", "豆腐", "酱油"] },
  { tag: "麸质", words: ["麸质", "面筋", "小麦", "面粉", "面食", "面"] },
  { tag: "生食", words: ["生食", "生冷", "生鱼片", "生的"] },
  { tag: "坚果", words: ["坚果"] },
];
const EMPTY_WORDS = ["没有", "无", "不忌口", "啥都吃", "随便", "都行", "无禁忌"];

// 把一段自然语言解析成结构化忌口 { spicy, veggie, tags:[] }
export function parseAvoidText(text) {
  const cats = { spicy: false, veggie: false, tags: [] };
  if (!text || !text.trim()) return cats;
  const raw = text.trim().toLowerCase();
  if (EMPTY_WORDS.some(w => raw === w || raw.includes(w) && raw.length <= 4)) return cats;
  for (const rule of SYNONYM_RULES) {
    if (rule.words.some(w => raw.includes(w))) {
      if (rule.key === "spicy") cats.spicy = true;
      else if (rule.key === "veggie") cats.veggie = true;
      else if (!cats.tags.includes(rule.tag)) cats.tags.push(rule.tag);
    }
  }
  return cats;
}

// 合并两个结构化忌口（快捷选择 + 文本解析）
export function mergeAvoidCats(a, b) {
  const tags = [...(a?.tags || []), ...(b?.tags || [])];
  return {
    spicy: !!(a?.spicy || b?.spicy),
    veggie: !!(a?.veggie || b?.veggie),
    tags: [...new Set(tags)],
  };
}

// 结构化硬过滤：辣度 / 素食 / 成分标签（过敏原与肉类同走 contain，命中即排除，不放宽）
export function filterRestrictions(dishes, cats) {
  if (!cats) return dishes;
  const spicy = !!cats.spicy;
  const veggie = !!cats.veggie;
  const tagSet = new Set(cats.tags || []);
  if (!spicy && !veggie && tagSet.size === 0) return dishes;
  return dishes.filter(d => {
    if (spicy && d.spicy > 0) return false;
    if (veggie && !d.veggie) return false;
    for (const t of d.contain) if (tagSet.has(t)) return false;
    return true;
  });
}

// 轻食过滤
function filterCalorie(dishes, lightMode) {
  if (!lightMode) return dishes;
  return dishes.filter(d => d.kcal < 800); // 排除高卡
}

// 随机 / 最优
function pickRandom(dishes, exclude) {
  const pool = exclude ? dishes.filter(d => d.name !== exclude) : dishes;
  if (pool.length === 0) return dishes[0] || null;
  return pool[Math.floor(Math.random() * pool.length)];
}
function pickTop(dishes, lightMode, exclude) {
  const pool = exclude ? dishes.filter(d => d.name !== exclude) : dishes;
  if (pool.length === 0) return dishes[0] || null;
  if (lightMode) {
    // 轻食：从低卡（≤500 kcal）池随机轮换，避免永远推荐同一道
    const light = pool.filter(d => d.kcal <= 500);
    const source = light.length > 0 ? light : pool;
    return source[Math.floor(Math.random() * source.length)];
  }
  return pickRandom(pool);
}

// 忌口确定后的「针对性候选池」：先从素材库剔除含忌口材料的菜，再按轻食过滤热量
// 这是 UI 展示与 decide 共用的唯一口径，保证"看到的候选数 = 实际随机池"
export function getCandidatePool(avoidCats, lightMode = false) {
  const base = filterRestrictions(DISHES, avoidCats); // 硬剔除：辣度/素食/成分标签
  if (base.length === 0) return [];
  const cal = filterCalorie(base, lightMode);
  return cal.length > 0 ? cal : base; // 热量层空了才放宽，忌口层不放宽
}

// 忌口项计数（spicy/veggie 各算 1 项，tags 各算 1 项）
export function countAvoidCats(cats) {
  if (!cats) return 0;
  return (cats.spicy ? 1 : 0) + (cats.veggie ? 1 : 0) + (cats.tags ? cats.tags.length : 0);
}

// 主决策：从「忌口剔除后的候选池」里随机分配
// 入参：avoidCats {spicy,veggie,tags[]}；忌口为硬过滤绝不放宽，仅热量可放宽兜底
export function decide({ avoidCats = null, lightMode = false, mode = "recommend", exclude = "" }) {
  const pool = getCandidatePool(avoidCats, lightMode);
  if (pool.length === 0) return null; // 结构化过滤后无菜（极端组合），交由 UI 提示而非偷偷放宽过敏原
  return mode === "blindbox" ? pickRandom(pool, exclude) : pickTop(pool, lightMode, exclude);
}

// 生成理由
export function makeReason(dish, lightMode, region) {
  const parts = [];
  if (region && dish.region === region) parts.push(`匹配你${region}地域偏好`);
  else if (dish.region === "通用") parts.push("通用稳妥选择");
  if (lightMode && dish.kcal <= 500) parts.push(`低卡(${dish.kcal}kcal)适合减脂`);
  else if (lightMode) parts.push(`可接受热量(${dish.kcal}kcal)`);
  if (dish.tags.includes("治愈")) parts.push("带治愈感");
  return parts.join("，") || "随机挑选";
}

export const EMOJIS = ["🍜", "🍕", "🥗", "🍣", "☕", "🍲", "🥘"];
