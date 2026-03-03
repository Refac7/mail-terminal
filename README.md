# Tactical Mailer

Tactical Mailer 是一个基于 Astro (SSR) 构建的轻量级、高安全性邮件发送终端，用于快速发送带有富文本和附件的邮件。

该项目不依赖任何数据库，是一个纯粹的无状态 SMTP 客户端，支持深色/浅色模式切换，并强制执行严格的身份验证。

## 核心特性

- **安全优先**：基于 JWT 的 HttpOnly Cookie 验证，敏感配置完全通过环境变量隔离。
- **战术 UI**：独特的粗野主义设计，高对比度，配备系统级深色/浅色模式切换。
- **富文本编辑**：集成定制版 React Quill，支持复杂的文本格式、代码块及列表。
- **附件支持**：支持多文件流式上传和发送（Node.js Buffer）。
- **高性能**：基于 Astro 服务端渲染和 Node.js 适配器。
- **无状态**：移除数据库依赖，零维护成本，即部署即用。

## 技术栈

- **框架**：Astro v5 (Node.js Adapter)
- **前端**：React 18, Tailwind CSS (v3)
- **后端**：Node.js, Nodemailer
- **认证**：JSON Web Token (JWT)

## 快速开始

### 1. 环境准备

确保你的环境已安装：

- Node.js (v18 或更高版本)
- pnpm (推荐包管理器)

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

在项目根目录创建 `.env` 文件，并填入以下配置。  
注意：为了兼容 Resend 等服务商，我们分离了“登录用户”和“发件人邮箱”。

```ini
# --- 系统安全配置 ---
# [必须修改] 用于加密 Cookie 的随机字符串
JWT_SECRET="complex_random_string_here_32_chars"
# [必须修改] 登录控制台的密码
SYSTEM_PASSWORD="your_secure_password"

# --- SMTP 服务器配置 ---
# 示例: Resend, Gmail, 网易, 腾讯企业邮等
SMTP_HOST="smtp.example.com"
SMTP_PORT=465
SMTP_SECURE="true" # 465端口填true，587端口填false

# --- 认证信息 ---
# SMTP 用户名 (Resend 服务通常填 "resend")
SMTP_USER="your_smtp_user"
# SMTP 密码或 API Key
SMTP_PASS="your_smtp_password_or_apikey"

# --- 发件人配置 (关键) ---
# [重要] 实际显示的“发件人邮箱”。
# 某些服务商(如 Resend)要求此项必须是绑定的域名邮箱(如 admin@domain.com)，不能是 "resend"。
SENDER_EMAIL="admin@yourdomain.com"
# 发件人显示名称
SENDER_NAME="Tactical Terminal"
```

### 4. 开发模式运行

```bash
pnpm dev
```

访问 `http://localhost:4321`，使用你在 `.env` 中设置的 `SYSTEM_PASSWORD` 登录。

### 5. 生产环境构建

```bash
pnpm build
pnpm start
```

### 许可证

MIT
