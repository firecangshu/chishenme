import { useState, useRef } from "react";
import { decide, makeReason, EMOJIS, EMOJI_MAP } from "./data.js";
import { 
  Button, Card, Input, Badge, Text, Stack, Group, Paper, 
  Anchor, Box, Container, ThemeIcon, useMantineTheme
} from "@mantine/core";
import { 
  ChefHat, Shuffle, Search, Lightbulb, X, RotateCcw, 
  UtensilsCrossed, Flame, Clock, Wallet, MapPin
} from "lucide-react";
import "./App.css";

export default function App() {
  const theme = useMantineTheme();
  const [step, setStep] = useState(0);
  const [avoid, setAvoid] = useState("");
  const [lightMode, setLightMode] = useState(false);
  const [result, setResult] = useState(null);
  const [mode, setMode] = useState("recommend");
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState([]);
  const avoidRef = useRef(null);

  function handleRecommend(userMode = "recommend") {
    setMode(userMode);
    setStep(1);
    setResult(null);
    if (avoidRef.current) avoidRef.current.focus();
  }

  function confirmAvoid() {
    const list = avoid.split(/[,，、\s]+/).filter(Boolean);
    setAvoid(list);
    setStep(2);
  }

  function confirmLight(want) {
    setLightMode(want);
    runDecision();
  }

  function runDecision() {
    if (mode === "blindbox") {
      setRolling(true);
      setTimeout(() => {
        const dish = decide({ avoid, lightMode, mode });
        setResult({ dish, reason: makeReason(dish, lightMode, "") });
        setRolling(false);
        if (dish) setHistory(h => [...h, dish.name]);
      }, 1200);
    } else {
      const dish = decide({ avoid, lightMode, mode });
      setResult({ dish, reason: makeReason(dish, lightMode, "") });
      if (dish) setHistory(h => [...h, dish.name]);
    }
    setStep(3);
  }

  function reset() {
    setStep(0);
    setAvoid("");
    setLightMode(false);
    setResult(null);
    setHistory([]);
  }

  function changeOne() {
    runDecision();
  }

  return (
    <div className="app">
      <header className="header">
        <h1>🍜 吃什么</h1>
        <p className="subtitle">饭点决策助手 · 30 秒搞定，不纠结</p>
      </header>

      <main className="main">
        {step === 0 && (
          <Container size="xs" px="md">
            <Stack align="center" gap="lg">
              <Group justify="center" gap="md">
                <Button 
                  size="xl" 
                  leftSection={<ChefHat size={24} />}
                  onClick={() => handleRecommend("recommend")}
                  styles={{ root: { width: 200, height: 56 } }}
                >
                  吃啥？
                </Button>
                <Button 
                  size="xl" 
                  color="grape"
                  leftSection={<Shuffle size={24} />}
                  onClick={() => handleRecommend("blindbox")}
                  styles={{ root: { width: 200, height: 56 } }}
                >
                  摇一个
                </Button>
              </Group>
              <Group justify="center" gap="sm">
                <Badge 
                  size="lg" 
                  radius="xl" 
                  variant="outline" 
                  style={{ cursor: "pointer" }}
                  onClick={() => handleRecommend("recommend")}
                >☀️ 中午吃啥</Badge>
                <Badge 
                  size="lg" 
                  radius="xl" 
                  variant="outline"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleRecommend("blindbox")}
                >🎰 来个盲盒</Badge>
                <Badge 
                  size="lg" 
                  radius="xl" 
                  variant="outline"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleRecommend("recommend")}
                >🌶️ 我不吃辣</Badge>
              </Group>
            </Stack>
          </Container>
        )}

        {step === 1 && (
          <Container size="xs" px="md" style={{ marginTop: 40 }}>
            <Stack align="center" gap="md">
              <Text size="xl" fw={700}>第 1 步 · 忌口调查</Text>
              <Text size="sm" c="dimmed">有什么忌口、过敏或不吃的东西吗？</Text>
              <Input
                ref={avoidRef}
                size="lg"
                radius="md"
                placeholder="比如：海鲜、花生、辣、生食、乳制品... 没有就填「没有」"
                value={avoid}
                onChange={e => setAvoid(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmAvoid()}
                style={{ width: "100%" }}
              />
              <Button size="lg" leftSection={<Search size={18} />} onClick={confirmAvoid}>
                确认 →
              </Button>
            </Stack>
          </Container>
        )}

        {step === 2 && (
          <Container size="xs" px="md" style={{ marginTop: 40 }}>
            <Stack align="center" gap="md">
              <Text size="xl" fw={700}>第 2 步 · 需求澄清</Text>
              <Text size="sm" c="dimmed">今天有减脂/控制热量的需求吗？</Text>
              <Group justify="center" gap="md">
                <Button 
                  size="lg" 
                  variant="outline" 
                  color="orange"
                  leftSection={<Lightbulb size={18} />}
                  onClick={() => confirmLight(true)}
                >
                  要，推荐轻食
                </Button>
                <Button 
                  size="lg" 
                  leftSection={<UtensilsCrossed size={18} />}
                  onClick={() => confirmLight(false)}
                >
                  不用，随便吃
                </Button>
              </Group>
            </Stack>
          </Container>
        )}

        {step === 3 && result && (
          <Container size="xs" px="md" style={{ marginTop: 20 }}>
            {rolling && (
              <Stack align="center" gap="md" style={{ marginTop: 80 }}>
                <Text size="xl" className="slot">{EMOJIS.join(" ")}</Text>
                <Text c="dimmed">旋转中...</Text>
              </Stack>
            )}
            {!rolling && result.dish && (
              <Stack gap="lg">
                {mode === "blindbox" && (
                  <Text size="lg" fw={700} c="grape" ta="center">🎰 {EMOJIS.join(" ")} 🎰</Text>
                )}
                <Card shadow="lg" radius="lg" padding="xl" withBorder>
                  <Stack align="center" gap="sm">
                    <div className="dish-emoji">{EMOJI_FOR(result.dish)}</div>
                    <Text size="2xl" fw={800}>{result.dish.name}</Text>
                    <Group justify="center" gap="xs">
                      <Badge size="lg" color="orange" variant="light">
                        <Flame size={12} style={{ marginRight: 4 }} />
                        约 {result.dish.kcal} kcal
                      </Badge>
                      <Badge size="lg" variant="light">
                        <MapPin size={12} style={{ marginRight: 4 }} />
                        {result.dish.region}
                      </Badge>
                      <Badge size="lg" variant="light">
                        <Clock size={12} style={{ marginRight: 4 }} />
                        {result.dish.time}min
                      </Badge>
                      <Badge size="lg" variant="light">
                        <Wallet size={12} style={{ marginRight: 4 }} />
                        {result.dish.price}
                      </Badge>
                    </Group>
                    <Paper 
                      p="md" 
                      radius="md" 
                      bg="orange.0" 
                      style={{ width: "100%", borderLeft: "3px solid #ff6b35" }}
                    >
                      <Text size="sm">💡 {result.reason}</Text>
                    </Paper>
                    {lightMode && result.dish.kcal <= 500 && (
                      <Badge color="green" size="md">✅ 属于轻食范围（≤500 kcal）</Badge>
                    )}
                  </Stack>
                </Card>
                <Group justify="center" gap="md">
                  <Button size="lg" leftSection={<RotateCcw size={18} />} onClick={changeOne}>
                    换一个
                  </Button>
                  <Button size="lg" color="grape" leftSection={<X size={18} />} onClick={reset}>
                    换顿再说
                  </Button>
                </Group>
              </Stack>
            )}
            {!rolling && !result.dish && (
              <Stack align="center" gap="md" style={{ marginTop: 40 }}>
                <Text c="dimmed">😅 过滤后没有合适的，已帮你放宽条件</Text>
                <Button size="lg" onClick={runDecision}>再试一次</Button>
              </Stack>
            )}
          </Container>
        )}
      </main>

      {history.length > 0 && (
        <Paper p="sm" radius="md" withBorder style={{ marginTop: 24, textAlign: "center" }}>
          <Text size="sm" c="dimmed">🔁 本轮试过：</Text>
          <Group justify="center" gap="xs" mt="xs">
            {history.slice(-5).map((d, i) => (
              <Badge key={i} size="sm" variant="outline">{d}</Badge>
            ))}
          </Group>
        </Paper>
      )}

      <footer className="disclaimer">
        ⚠️ 本应用为娱乐决策工具，所有推荐仅供参考，不构成任何医疗、营养、食品安全建议。热量值按常见做法估算，实际可因食材/做法不同有 ±200 kcal 浮动。
      </footer>
    </div>
  );
}

function EMOJI_FOR(dish) {
  return EMOJI_MAP[dish.type] || "🍽️";
}
