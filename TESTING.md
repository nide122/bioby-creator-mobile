# Mobile 自动化测试

## 快速命令

```bash
cd mobile
npm install

npm run test:smoke          # tsc + Jest（CI 同款）
npm test                    # Jest watch
npm run test:e2e            # Maestro 全部 flows 目录
npm run test:e2e:all        # 单文件串联冒烟 smoke-all.yaml
npm run test:e2e:web        # Playwright（需 npx playwright install chromium）
```

可选环境变量：

```bash
RUN_PLAYWRIGHT=1 npm run test:smoke   # 外加 Web E2E
RUN_MAESTRO=1 npm run test:smoke      # 外加模拟器 Maestro（需 Metro + 模拟器）
EXPO_URL=exp://192.168.x.x:8081 npm run test:e2e
```

---

## 1. Jest（单元 / 集成）

| 测试文件 | 内容 |
|----------|------|
| `route-guard.test.ts` | 登录 / 入驻 / 主工作区路由守卫 |
| `session-store.test.ts` | Demo 会话与入驻状态机 |
| `locales.test.ts` | en/zh 文案 key |
| `mock-creator-profile.test.ts` | 主页 URL 解析 |
| `mock-deals.test.ts` | Mock 商机列表与详情 |
| `NavigationBootstrap.test.tsx` | 守卫 + expo-router |

逻辑优先写成 **纯函数**（`src/lib/route-guard.ts`），UI 守卫用 mock router 测组件。

---

## 2. Maestro（iOS / Android 模拟器）

**前置**： [Maestro CLI](https://maestro.mobile.dev/docs/getting-started/installing-maestro)、`npm start`、Expo Go / dev client。

| Flow | 说明 |
|------|------|
| `smoke-session.yaml` | 开发跳过 → Inbox（被其它 flow 复用） |
| `smoke-workspace.yaml` | 切换全部 Tab |
| `smoke-onboarding.yaml` | `clearState` → 注册 → 完整入驻 |
| `smoke-today-decisions.yaml` | Today：推迟 → 撤销 → 上传凭证跳转 |
| `smoke-inbox-thread.yaml` | Inbox → `thread-skincare` 详情 |
| `smoke-deal-navigation.yaml` | Deals → `mock-deal-beta` 详情 |
| `smoke-routes.yaml` | 深链：verification / draft / proposal / team |
| `smoke-all.yaml` | 以上工作区相关串联 |
| `smoke-deal-stack.yaml` | 兼容别名 → deal-navigation + routes |

**testID 约定**

| ID | 位置 |
|----|------|
| `welcome-dev-skip` | Welcome 研发跳过 |
| `tab-*` | 底部 Tab |
| `screen-inbox` / `screen-deals` | 列表页 |
| `inbox-thread-{id}` | Inbox 线程卡片 |
| `screen-inbox-thread-detail` | 线程详情 |
| `deal-card-{id}` | Deals 卡片 |
| `screen-deal-detail` | Deal 详情 |
| `screen-today` | Today 决策流 |
| `today-decision-card-{id}` | 当前决策卡 |
| `today-action-{cardId}-{actionId}` | 决策按钮（如 `later` / `upload`） |
| `today-undo` | 撤销上一决策 |
| `auth-register-*` / `onboarding-*` | 注册与入驻 |

---

## 3. Playwright Web

```bash
npx playwright install chromium   # 首次；Apple Silicon 需 arm64 构建
npm run test:e2e:web
npm run test:e2e:web -- --no-server   # Metro 已在 8081 运行
```

| 文件 | 内容 |
|------|------|
| `e2e-web/smoke.spec.ts` | 开发跳过、守卫、注册表单、栈页标题 |
| `e2e-web/routes.spec.ts` | 19+ 受保护路由可加载（demo 会话） |
| `e2e-web/today.spec.ts` | Today 决策卡、推迟/撤销、跳转 verification |

---

## 4. CI

| Workflow | 内容 |
|----------|------|
| `mobile-test.yml` | 每次 PR：`test:ci` + `tsc` |
| `mobile-e2e-web.yml` | `main` 推送或手动：`Playwright`（`macos-latest`） |

Maestro 仍需本地模拟器 + Metro。
