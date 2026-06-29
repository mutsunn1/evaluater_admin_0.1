# 中文水平评测系统 · 管理后台 MVP

基于 Vben Admin v5 (`web-antd`) 的管理后台前端，配合 `evaluater_backend_0.1` 后端提供的 `/admin/v1/*` 接口。

## 功能

- 仅密码登录：使用后端 `ADMIN_PASSWORD` 验证，返回 JWT。
- Dashboard：展示总用户数、平均 HSK 等级、HSK 分布。
- 用户列表：分页、HSK 等级筛选、用户 ID 搜索。
- 用户详情：用户画像、技能等级、顽固错误、优势、下一阶段重点。
- 主题切换：顶部工具栏支持明暗/自动主题切换和语言切换。

## 环境准备

```bash
pnpm install --ignore-scripts
```

> 当前目录未初始化为 git，Vben 的 `prepare` 脚本会尝试安装 lefthook 并失败，因此使用 `--ignore-scripts`。

## 开发

```bash
# 在 evaluater_admin_0.1 根目录
pnpm dev:antd
```

默认代理到 `http://localhost:8000`（由 `apps/web-antd/.env.development` 的 `VITE_GLOB_API_URL` 指定）。

## 构建

```bash
pnpm build:antd
```

产物在 `apps/web-antd/dist/`，同时生成 `apps/web-antd/dist.zip`。

## 关键目录

```
apps/web-antd/src
├── api/core              # admin 相关 API
│   ├── admin-auth.ts     # /admin/v1/login
│   ├── admin-dashboard.ts
│   ├── admin-users.ts
│   └── user.ts           # /admin/v1/user/info
├── router/routes/modules
│   ├── dashboard.ts      # Dashboard 路由
│   └── users.ts          # 用户管理路由
├── views
│   ├── dashboard/analytics
│   └── users
│       ├── list
│       └── detail
├── store/auth.ts         # 登录态
├── api/request.ts        # adminRequestClient
└── preferences.ts        # 默认主题/语言/widget 配置
```

## 后端接口依赖

| 前端功能 | 后端接口 |
|---|---|
| 登录 | `POST /admin/v1/login` |
| 登录后获取用户信息 | `GET /admin/v1/user/info` |
| 权限码 | `GET /admin/v1/auth/codes` |
| Dashboard | `GET /admin/v1/dashboard` |
| 用户列表 | `GET /admin/v1/users` |
| 用户详情 | `GET /admin/v1/users/{user_id}` |

## 配置

后端需要在 `.env` 中配置：

```env
ADMIN_PASSWORD=admin
ADMIN_JWT_SECRET=change-me
ADMIN_JWT_EXPIRE_HOURS=8
```

> MVP 阶段密码使用明文比较，生产环境务必改为 bcrypt。

## 验证

```bash
# 前端类型检查 + 构建
cd apps/web-antd
pnpm run typecheck
pnpm run build

# 后端 admin 测试
cd ../../evaluater_backend_0.1
python -m pytest tests/test_admin_auth.py tests/test_admin_routes.py -v
```
