# Hướng Dẫn Tích Hợp & Sử Dụng Codebase Memory MCP

Tài liệu hướng dẫn sử dụng và quản trị **Codebase Memory MCP** (Model Context Protocol) trong dự án **Paradise Gym-v2**.

Repository gốc: [DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)

---

## 1. Giới Thiệu & Kiến Trúc

**Codebase Memory MCP** là một công cụ phân tích mã nguồn và duy trì Đồ thị Tri thức AST (AST Knowledge Graph) siêu tốc cho AI Coding Agents:
- **Ngôn ngữ hỗ trợ:** 162 ngôn ngữ lập trình qua Tree-sitter AST (đã nhận diện JS, HTML, CSS, SQL, YAML trong dự án).
- **Lưu trữ tri thức:** Đồ thị SQLite lưu trữ bền vững tại `~/.cache/codebase-memory-mcp/`.
- **Giao diện trực quan:** Tích hợp sẵn Web UI 3D Graph Visualization tại `http://localhost:9749`.
- **Tối ưu Token:** Trả về kết quả cấu trúc chính xác chỉ ~500 tokens thay vì quét mã hàng chục nghìn tokens qua grep.

### Thông Số Đồ Thị Dự Án Paradise Gym Đã Index:
- **Tên dự án trong đồ thị:** `E-Desktop-Paradise-Gym-v2`
- **Tổng số AST Nodes:** `2,805` nodes (bao gồm 22 bảng PostgreSQL, 391 hàm, 70 methods, 59 HTTP routes,...)
- **Tổng số Graph Edges:** `4,115` liên kết (DEFINES, CALLS, USAGE, IMPORTS, HTTP_CALLS, HANDLES,...)

---

## 2. Vị Trí Cài Đặt & Cấu Hình

1. **File thực thi Binary:**
   - Native binary: `E:\Antigravity - Copy\Profiles\Profile3\.local\bin\codebase-memory-mcp.exe`
   - Node / npm shim: `E:\Antigravity - Copy\Profiles\Profile3\AppData\Roaming\npm\codebase-memory-mcp.cmd`

2. **Cấu hình MCP cho Antigravity:**
   - File cấu hình: `~/.gemini/config/mcp_config.json` (tương đương `E:\Antigravity - Copy\Profiles\Profile3\.gemini\config\mcp_config.json`)
   - Nội dung cấu hình:
     ```json
     {
       "mcpServers": {
         "codebase-memory": {
           "command": "E:/Antigravity - Copy/Profiles/Profile3/.local/bin/codebase-memory-mcp.exe",
           "args": []
         }
       }
     }
     ```

3. **Cấu hình tự động:**
   - `auto_index`: `true` (tự động cập nhật đồ thị)
   - `auto_watch`: `true` (theo dõi thay đổi file thời gian thực)
   - `watcher_enabled`: `true`
   - `ui_enabled`: `true`
   - `ui_port`: `9749`

4. **Chỉ dẫn Agent (Agent Instructions):**
   - Đã được cập nhật vào: `~/.gemini/GEMINI.md`

---

## 3. Danh Sách 15 Công Cụ MCP Có Sẵn

| Công cụ (Tool) | Chức năng | Ví dụ / Khi nào sử dụng |
|---|---|---|
| `search_graph` | Tìm kiếm symbol theo regex pattern, nhãn node | Tìm các hàm xử lý booking: `search_graph(name_pattern=".*booking.*")` |
| `trace_path` | Dò vết chuỗi gọi hàm (call hierarchy) | Ai gọi hàm X? `trace_path(direction="inbound")`<br>Hàm X gọi những ai? `trace_path(direction="outbound")` |
| `get_code_snippet` | Lấy chính xác phần thân hàm/class mà không cần đọc cả file | `get_code_snippet(symbol="createBooking")` |
| `query_graph` | Truy vấn Cypher trực tiếp trên đồ thị | Tìm liên kết đa tầng giữa Database table và Route |
| `get_architecture` | Báo cáo kiến trúc tổng thể, tỷ lệ fan-in/fan-out, phân tầng modules | `get_architecture(aspects=["all"])` |
| `search_code` | Tìm kiếm văn bản code có kết hợp ngữ cảnh AST | Tìm kiếm text hoặc chuỗi logic |
| `detect_changes` | Phân tích tác động của các thay đổi git chưa commit | Đánh giá rủi ro trước khi commit |
| `check_index_coverage` | Kiểm tra độ phủ của index và các file bị bỏ qua | Xác thực các file chưa được lập chỉ mục |
| `list_projects` | Liệt kê các dự án đang có trong bộ nhớ tri thức | `list_projects()` |
| `index_repository` | Quét và lập chỉ mục cho một thư mục dự án | `index_repository(repo_path="...")` |
| `index_status` | Xem trạng thái lập chỉ mục chi tiết | Kiểm tra tiến độ lập chỉ mục |
| `get_file_outline` | Lấy cấu trúc phác thảo (outline) các hàm/class trong file | Xem nhanh cấu trúc một module lớn |
| `get_graph_schema` | Xem schema các node labels và edge types trong đồ thị | Khám phá cấu trúc đồ thị hiện tại |
| `compare_graphs` | So sánh sự thay đổi giữa 2 thế hệ đồ thị | Đánh giá diff kiến trúc |
| `manage_adr` | Quản lý Architecture Decision Records bền vững | Ghi lại quyết định kiến trúc |

---

## 4. Các Lệnh CLI Thường Dùng

Khi cần thao tác nhanh từ dòng lệnh PowerShell/CMD:

```powershell
# 1. Kiểm tra trạng thái và phiên bản
codebase-memory-mcp --version
codebase-memory-mcp config list

# 2. Xem danh sách dự án đã index
codebase-memory-mcp cli list_projects

# 3. Lập chỉ mục lại dự án (khi có thay đổi lớn)
codebase-memory-mcp cli index_repository --repo-path "E:\Desktop\Paradise Gym-v2"

# 4. Xem tổng quan kiến trúc dự án
codebase-memory-mcp cli get_architecture --project E-Desktop-Paradise-Gym-v2

# 5. Tìm kiếm symbol trong đồ thị
codebase-memory-mcp cli search_graph --name-pattern ".*booking.*" --project E-Desktop-Paradise-Gym-v2

# 6. Mở Daemon và Web UI (nếu muốn xem UI độc lập ngoài phiên agent)
codebase-memory-mcp daemon start
# Truy cập UI tại trình duyệt: http://localhost:9749
```

---

## 5. Kích Hoạt Trong IDE

- **Trong Antigravity / Gemini:**
  Khi bạn mở Antigravity hoặc bắt đầu một phiên làm việc mới, Antigravity sẽ tự động đọc `~/.gemini/config/mcp_config.json` và nạp toàn bộ 15 công cụ của `codebase-memory-mcp`.
  Bạn có thể kiểm tra danh sách công cụ trong menu **Options (...) > MCP Servers** trong giao diện Antigravity.
- Bạn có thể yêu cầu Agent truy vấn cấu trúc, dò vết luồng xử lý hoặc kiểm tra kiến trúc mà không lo tốn context token!
