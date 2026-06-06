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
~/.npm-global/bin/clasp push          # Push src/ lên GAS
~/.npm-global/bin/clasp push --watch  # Auto-push khi file thay đổi
~/.npm-global/bin/clasp open          # Mở GAS editor trong browser
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
