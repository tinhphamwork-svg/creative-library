# Hướng dẫn cài đặt Creative Library Sidebar

## Yêu cầu
- Google Sheets account
- Quyền truy cập Extensions → Apps Script trong Sheets

---

## 5 bước cài đặt

### Bước 1 — Tạo Google Sheets và các sheet tab

Tạo một Google Sheets mới (hoặc dùng file hiện có), sau đó tạo 3 tab với tên **chính xác**:

| Tên tab | Mục đích |
|---------|---------|
| `Creative Library` | Quản lý creative assets |
| `Concept Hub` | Quản lý concepts |
| `Config` | Danh sách brands |

**Thêm header row cho mỗi sheet:**

**Creative Library — Row 1:**
```
Asset Name | Brand | Product Line | Concept | Angle | Hook | Format | Campaign Objective | Status | Brief Status | Assignee | Launch Date | Spend | ROAS | CTR | CPM | CPC | Preview URL | Brief Notes | Performance Notes | Concept Hub ID
```

**Concept Hub — Row 1:**
```
Concept ID | Concept Name | Brand | Product Line | Format | Campaign Objective | Core Insight | Angles | Status | Total Assets | Winning Count
```

**Config — Row 1:**
```
Brand
```
(Row 2 trở đi: điền tên từng brand, mỗi brand 1 dòng)

---

### Bước 2 — Mở Apps Script Editor

Trong Google Sheets: **Extensions → Apps Script**

Apps Script Editor sẽ mở tab mới với file `Code.gs` mặc định.

---

### Bước 3 — Copy Code.gs

1. Trong Apps Script Editor, click vào file `Code.gs` bên trái
2. Xóa toàn bộ nội dung mặc định (Ctrl+A → Delete)
3. Copy toàn bộ nội dung từ file `src/Code.gs` trong repo này
4. Paste vào editor
5. Nhấn **Save** (Ctrl+S hoặc icon đĩa mềm)

---

### Bước 4 — Tạo file sidebar.html

1. Trong Apps Script Editor, nhấn dấu **`+`** cạnh "Files" bên trái
2. Chọn **HTML**
3. Đặt tên file là **`sidebar`** (không có .html — GAS tự thêm)
4. Xóa nội dung mặc định
5. Copy toàn bộ nội dung từ file `src/sidebar.html` trong repo này
6. Paste vào editor
7. Nhấn **Save**

---

### Bước 5 — Chạy lần đầu để authorize

1. Trong Apps Script Editor, chọn function `onOpen` từ dropdown function selector (góc trên bên trái editor)
2. Nhấn **Run** (▶)
3. Google sẽ yêu cầu **authorization** → click "Review permissions" → chọn tài khoản → "Allow"
4. Quay lại Google Sheets, **reload trang** (F5)
5. Menu **🎨 Creative Library** xuất hiện trên thanh menu
6. Click **🎨 Creative Library → Open App** để mở sidebar

---

## Thêm brand mới vào Config

1. Trong Google Sheets, chọn tab **Config**
2. Thêm tên brand vào cột A, bắt đầu từ row 2 (row 1 là header "Brand")
3. Mỗi brand 1 dòng, không để trùng tên
4. **Reload sidebar** (đóng và mở lại qua menu) để brand mới xuất hiện trong dropdown

Ví dụ Config sheet:
```
Brand          ← Row 1 (header)
Kreizi Beauty  ← Row 2
Kim Ecopak     ← Row 3
Curacoro       ← Row 4
```

---

## Troubleshooting

**Menu không xuất hiện sau reload:**
→ Vào Apps Script Editor → chạy function `onOpen` thủ công → reload Sheets

**Sidebar báo lỗi "Sheet không tồn tại":**
→ Kiểm tra tên 3 tab phải chính xác: `Creative Library`, `Concept Hub`, `Config` (phân biệt hoa thường, có dấu cách)

**Sidebar hiển thị "Lỗi tải data":**
→ Kiểm tra authorization đã được cấp chưa (bước 5)

**Concept Hub ID không có gì để chọn:**
→ Tạo ít nhất 1 concept trong tab Concept Hub trước, sau đó mở lại sidebar
