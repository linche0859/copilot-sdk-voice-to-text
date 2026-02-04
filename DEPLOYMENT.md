# Zeabur 部署指南

## 部署選項

### 選項 1：使用遠端 Copilot CLI 伺服器（推薦）

這個選項適合無法直接從 Zeabur 訪問 GitHub 或 npm registry 的情況。

#### 步驟 1：設置 CLI 伺服器

在一台可以訪問 GitHub 的伺服器上：

```bash
# 安裝 Copilot CLI（如果尚未安裝）
npm install -g @github/copilot-cli

# 登入 GitHub
copilot login

# 以伺服器模式運行
copilot --headless --port 4321
```

#### 步驟 2：在 Zeabur 配置環境變數

在 Zeabur 專案設置中添加以下環境變數：

```env
COPILOT_CLI_URL=your-cli-server-ip:4321
GITHUB_PAT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
PORT=3000
```

> **注意**：`GITHUB_PAT_TOKEN` 需要有 Copilot 存取權限的 GitHub Personal Access Token

#### 步驟 3：部署

將代碼推送到 GitHub，Zeabur 會自動建置並部署。

---

### 選項 2：在容器內安裝 CLI（透過 npm）

這個選項在容器內通過 npm 安裝 Copilot CLI。

#### Dockerfile 配置

當前的 Dockerfile 已配置為嘗試透過 npm 安裝 CLI：

```dockerfile
RUN npm install -g @github/copilot-cli || echo "Warning: Failed to install Copilot CLI globally"
```

#### Zeabur 環境變數

```env
GITHUB_PAT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
PORT=3000
```

#### 限制

- 需要容器能夠訪問 npm registry
- 首次建置可能較慢
- 如果 npm 安裝失敗，應用程式會回退到本地處理（不使用 Copilot）

---

### 選項 3：使用 GitHub Copilot 雲端服務

如果你的 GitHub 帳號有 Copilot Business 或 Enterprise：

#### Zeabur 環境變數

```env
GITHUB_PAT_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
PORT=3000
```

這個選項不需要 `COPILOT_CLI_URL`，SDK 會自動使用 GitHub 的雲端服務。

---

## 如何取得 GitHub Personal Access Token

1. 前往 [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. 點擊 "Generate new token (classic)"
3. 給予 token 以下權限：
   - `copilot` - 訪問 GitHub Copilot
   - `read:user` - 讀取用戶資訊
4. 複製生成的 token（`ghp_` 開頭）
5. 在 Zeabur 環境變數中設置 `GITHUB_PAT_TOKEN`

---

## 測試部署

部署完成後，訪問你的應用程式 URL：

```bash
curl -X POST https://your-app.zeabur.app/rewrite \
  -H "Content-Type: application/json" \
  -d '{"text":"嗯那個就是我想要說的是呢我們應該要把這個功能做完"}'
```

成功的回應會包含重寫後的文字：

```json
{
  "rewritten": "我們應該要把這個功能做完。"
}
```

---

## 故障排除

### 問題：無法連接到 Copilot CLI

**症狀**：應用程式日誌顯示 "Copilot SDK unavailable, using local fallback"

**解決方案**：

1. 檢查 `COPILOT_CLI_URL` 是否正確設置
2. 確認遠端 CLI 伺服器正在運行
3. 檢查網路連接和防火牆設置

### 問題：認證失敗

**症狀**：日誌顯示認證錯誤

**解決方案**：

1. 確認 `GITHUB_PAT_TOKEN` 是有效的
2. 確認 token 有 `copilot` 權限
3. 檢查 GitHub Copilot 訂閱是否有效

### 問題：Dockerfile 建置失敗

**症狀**：npm 安裝 CLI 失敗

**解決方案**：

1. 使用選項 1（遠端 CLI 伺服器）
2. 檢查 Zeabur 的網路連接
3. 查看建置日誌獲取詳細錯誤信息

---

## 架構圖

```
┌─────────────────┐
│  Browser/Client │
└────────┬────────┘
         │ HTTP POST /rewrite
         ▼
┌─────────────────┐
│  Zeabur App     │
│  (Node.js)      │
└────────┬────────┘
         │ Copilot SDK
         ▼
┌─────────────────┐      ┌──────────────────┐
│  Remote CLI     │      │  GitHub Copilot  │
│  Server         │◄────►│  Cloud Service   │
│  (Option 1)     │      │  (Option 3)      │
└─────────────────┘      └──────────────────┘
         ▲
         │ or
         │
┌─────────────────┐
│  Local CLI      │
│  (in container) │
│  (Option 2)     │
└─────────────────┘
```

---

## 推薦方案

對於 Zeabur 部署，我們推薦 **選項 1（遠端 CLI 伺服器）**，因為：

✅ 避免容器建置時的網路問題  
✅ CLI 伺服器可以被多個應用實例共享  
✅ 更容易除錯和監控  
✅ 建置速度更快

如果你有 GitHub Copilot Business/Enterprise，**選項 3（雲端服務）** 是最簡單的選擇。
