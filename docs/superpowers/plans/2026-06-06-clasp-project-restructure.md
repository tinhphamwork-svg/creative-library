# Clasp Project Restructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến project thành một GAS development project chuẩn với clasp CLI — xóa các folder marketing không liên quan, thêm config files cần thiết, và kết nối với Google Apps Script project thực tế để deploy bằng `clasp push` thay vì copy/paste thủ công.

**Architecture:** Project root chứa config files (`.clasp.json`, `.gitignore`, `CLAUDE.md`); `src/` là `rootDir` — mọi file trong đây sẽ được clasp push lên GAS. `appsscript.json` (GAS manifest) cũng phải nằm trong `src/`. Không có build step, không có `node_modules` runtime.

**Tech Stack:** `@google/clasp` (CLI tool, global install), Google Apps Script, npm (chỉ dùng để install clasp — không có runtime deps)

---

## File Structure (sau khi plan hoàn tất)

```
Creative app/
├── src/                       # rootDir — tất cả files này push lên GAS
│   ├── appsscript.json        # GAS manifest (bắt buộc phải trong rootDir)
│   ├── Code.gs                # Backend server-side (đã có)
│   └── sidebar.html           # Frontend sidebar (đã có)
├── docs/
│   ├── INSTALL.md             # Di chuyển từ src/ (chỉ dùng cho on-boarding thủ công)
│   └── superpowers/
│       └── plans/             # Plans (đã có)
├── .clasp.json                # Clasp config: scriptId + rootDir
├── .claspignore               # Loại trừ file không cần push lên GAS
├── .gitignore                 # Loại trừ .clasprc.json và node_modules nếu có
└── CLAUDE.md                  # Project-specific — override global CLAUDE.md
```

**Folders bị xóa (không liên quan đến app dev):**
`Ads/`, `Presentations/`, `Report/`, `Research/`, `wiki/`, `_Context/`, `_data-source/`, `_product info/`, `_sop/`, `_template/`, `AI Workflow/`

---

## Constraint chung

- `appsscript.json` phải nằm trong `src/` (rootDir), không phải root project
- `.clasp.json` phải nằm ở root project (không phải trong `src/`)
- Không commit `.clasprc.json` (chứa OAuth token) — phải có trong `.gitignore`
- `scriptId` lấy từ GAS project URL: `https://script.google.com/d/<SCRIPT_ID>/edit`

---

## Task 1: Cài đặt clasp global

**Files:** Không có file thay đổi — chỉ cài tool.

- [ ] **Step 1: Cài clasp global**

```bash
npm install -g @google/clasp
```

- [ ] **Step 2: Xác nhận cài thành công**

```bash
clasp --version
```

Expected output: `2.x.x` (ví dụ `2.4.2`)

- [ ] **Step 3: Login vào Google account**

```bash
clasp login
```

Browser sẽ tự mở → chọn Google account → "Allow" → quay lại terminal, thấy `Authorization successful`.

Token được lưu vào `~/.clasprc.json` (global, không phải trong project).

---

## Task 2: Xóa các folder marketing không liên quan

**Lý do:** Các folder này được tạo tự động từ global CLAUDE.md template cho marketing workspace — không liên quan đến app development.

- [ ] **Step 1: Xóa tất cả folder marketing**

```bash
rm -rf \
  "/Users/tinhpham/Documents/Creative app/Ads" \
  "/Users/tinhpham/Documents/Creative app/Presentations" \
  "/Users/tinhpham/Documents/Creative app/Report" \
  "/Users/tinhpham/Documents/Creative app/Research" \
  "/Users/tinhpham/Documents/Creative app/wiki" \
  "/Users/tinhpham/Documents/Creative app/_Context" \
  "/Users/tinhpham/Documents/Creative app/_data-source" \
  "/Users/tinhpham/Documents/Creative app/_product info" \
  "/Users/tinhpham/Documents/Creative app/_sop" \
  "/Users/tinhpham/Documents/Creative app/_template" \
  "/Users/tinhpham/Documents/Creative app/AI Workflow"
```

- [ ] **Step 2: Xác nhận chỉ còn đúng các folder cần thiết**

```bash
ls "/Users/tinhpham/Documents/Creative app/"
```

Expected: chỉ thấy `src/`, `docs/`, `.claude/`

---

## Task 3: Di chuyển INSTALL.md ra khỏi src/

`INSTALL.md` là documentation, không phải GAS source code — nếu để trong `src/` thì clasp sẽ push nó lên GAS (lỗi hoặc rác thừa).

- [ ] **Step 1: Di chuyển file**

```bash
mv "/Users/tinhpham/Documents/Creative app/src/INSTALL.md" \
   "/Users/tinhpham/Documents/Creative app/docs/INSTALL.md"
```

- [ ] **Step 2: Xác nhận**

```bash
ls "/Users/tinhpham/Documents/Creative app/src/"
ls "/Users/tinhpham/Documents/Creative app/docs/"
```

Expected `src/`: `Code.gs`, `sidebar.html`
Expected `docs/`: `INSTALL.md`, `superpowers/`

---

## Task 4: Tạo appsscript.json trong src/

GAS manifest file — bắt buộc phải có trong rootDir để clasp hoạt động đúng.

- [ ] **Step 1: Tạo file `src/appsscript.json`**

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.container.ui"
  ]
}
```

- [ ] **Step 2: Xác nhận file tồn tại**

```bash
cat "/Users/tinhpham/Documents/Creative app/src/appsscript.json"
```

---

## Task 5: Tạo .clasp.json ở root project

`scriptId` được lấy từ GAS project đang dùng. Có 2 trường hợp:

**Trường hợp A — đã có GAS project (đã cài theo INSTALL.md):**
Mở Apps Script Editor → URL trông như: `https://script.google.com/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit`
→ `scriptId` = `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms`

**Trường hợp B — chưa có GAS project:**
```bash
cd "/Users/tinhpham/Documents/Creative app"
clasp create --type sheets --rootDir src --title "Creative Library"
```
Lệnh này tạo GAS project mới và tự động tạo `.clasp.json`.

- [ ] **Step 1: Tạo `.clasp.json` ở root project**

Nếu Trường hợp A (thay `YOUR_SCRIPT_ID` bằng ID thực):
```json
{
  "scriptId": "YOUR_SCRIPT_ID",
  "rootDir": "src"
}
```

Nếu Trường hợp B — clasp create đã tạo tự động, kiểm tra nội dung:
```bash
cat "/Users/tinhpham/Documents/Creative app/.clasp.json"
```

- [ ] **Step 2: Xác nhận rootDir là "src"**

```bash
cat "/Users/tinhpham/Documents/Creative app/.clasp.json"
```

Expected:
```json
{
  "scriptId": "<some-id>",
  "rootDir": "src"
}
```

---

## Task 6: Tạo .claspignore

Clasp mặc định push tất cả files trong rootDir — cần loại trừ files không phải GAS code.

- [ ] **Step 1: Tạo `.claspignore` ở root project**

```
# Không push files này lên GAS
**/*.md
**/.DS_Store
**/node_modules
```

- [ ] **Step 2: Xác nhận**

```bash
cat "/Users/tinhpham/Documents/Creative app/.claspignore"
```

---

## Task 7: Tạo .gitignore

- [ ] **Step 1: Tạo `.gitignore` ở root project**

```
# Clasp OAuth token — chứa credentials, KHÔNG commit
.clasprc.json

# macOS
.DS_Store

# Node (nếu sau này thêm dev deps)
node_modules/
```

---

## Task 8: Tạo CLAUDE.md project-specific

File này override global CLAUDE.md — thay thế toàn bộ marketing template bằng dev conventions phù hợp với GAS project.

- [ ] **Step 1: Tạo `CLAUDE.md` ở root project**

```markdown
# Creative Library App — GAS Project

## Project Type
Google Apps Script (GAS) sidebar app chạy trong Google Sheets.
Deploy bằng clasp CLI, không có build step, không có npm runtime deps.

## File Structure
- `src/Code.gs` — Backend server-side: menu, CRUD, config
- `src/sidebar.html` — Frontend: HTML + CSS + Vanilla JS (single file)
- `src/appsscript.json` — GAS manifest
- `.clasp.json` — Clasp config (scriptId + rootDir)
- `docs/INSTALL.md` — Hướng dẫn cài thủ công (không dùng clasp)

## Deploy Workflow
```bash
clasp push          # Push src/ lên GAS
clasp push --watch  # Auto-push khi file thay đổi
clasp open          # Mở GAS editor trong browser
```

## GAS Constraints
- Runtime: V8 (ES2019, nhưng không có fetch, module, import)
- Frontend (sidebar.html): browser JS thuần, không có Node APIs
- Server-client bridge: `google.script.run` — async, callback-based
- Không dùng external CDN hay npm packages trong GAS code

## Code Conventions
- Không dùng `var` trong code mới — dùng `let`/`const`
- Tất cả `google.script.run` calls phải wrap qua `gasRun()` Promise helper (đã có trong sidebar.html)
- Validation bắt buộc trước khi ghi sheet
- Tiếng Việt trong comments và UI strings

## Communication
- Tiếng Việt với user
- Marketing/perf terms giữ tiếng Anh: ROAS, CTR, CPM, AOV, CTA
```

- [ ] **Step 2: Xác nhận file tồn tại**

```bash
cat "/Users/tinhpham/Documents/Creative app/CLAUDE.md"
```

---

## Task 9: Test clasp push lần đầu

- [ ] **Step 1: Push code lên GAS**

```bash
cd "/Users/tinhpham/Documents/Creative app"
clasp push
```

Expected output:
```
└─ src/appsscript.json
└─ src/Code.gs
└─ src/sidebar.html
Pushed 3 files.
```

Nếu thấy lỗi `Could not find .clasp.json` → đảm bảo bạn đang ở root project, không phải trong `src/`.

Nếu thấy lỗi `Script file is larger than allowed` → không xảy ra với file size hiện tại.

- [ ] **Step 2: Verify trên GAS Editor**

```bash
clasp open
```

Browser mở GAS Editor → kiểm tra:
- `Code.gs` — nội dung khớp với local
- `sidebar.html` — nội dung khớp với local
- `appsscript.json` — hiển thị trong project files

- [ ] **Step 3: Test app chạy trong Sheets**

1. Mở Google Sheets đã link với GAS project
2. Reload trang
3. Menu `🎨 Creative Library` xuất hiện
4. Click **Open App** → sidebar mở, data load được

---

## Task 10: Khởi tạo git repository

- [ ] **Step 1: Init git**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git init
git add .clasp.json .claspignore .gitignore CLAUDE.md src/ docs/
git commit -m "feat: set up clasp project structure for GAS development"
```

- [ ] **Step 2: Xác nhận không có file nhạy cảm trong commit**

```bash
git show --stat HEAD
```

Đảm bảo `.clasprc.json` **KHÔNG** có trong danh sách (file đó nằm ở `~/.clasprc.json`, không phải trong project — nên không cần lo).

---

## Self-Review

**Spec coverage:**
- ✅ Xóa marketing folders không liên quan
- ✅ Cài clasp và authenticate
- ✅ Tạo appsscript.json (GAS manifest)
- ✅ Tạo .clasp.json với rootDir = "src"
- ✅ Tạo .claspignore và .gitignore
- ✅ Tạo CLAUDE.md project-specific override
- ✅ Test clasp push thực tế
- ✅ Init git với commit sạch

**Placeholder check:** Không có TBD hay TODO trong plan này. scriptId cần user tự điền — đã ghi rõ cách lấy.

**Dependency order:** Task 1 (install clasp) → Task 5 (create .clasp.json, cần clasp login) → Task 9 (push, cần .clasp.json). Các task còn lại độc lập.
