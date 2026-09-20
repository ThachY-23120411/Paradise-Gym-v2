# QTV-W17 — Khuyến mãi & giảm giá

- **Role:** QTV / Quản lý
- **Platform:** Web only
- **Menu:** `W17`
- **Goal:** Quản lý các chương trình khuyến mãi, mã voucher giảm giá áp dụng khi hội viên mua mới hoặc gia hạn gói tập tại quầy, phục vụ các chiến dịch kích cầu kinh doanh và tăng doanh thu bán gói.
- **Scope:**
  1. **Danh sách chương trình khuyến mãi & Voucher:** Xem danh sách mã giảm giá, giá trị giảm, hạn sử dụng, số lượt đã dùng / tối đa và trạng thái hoạt động.
  2. **Tạo mã giảm giá mới:** Thiết lập mã code (ví dụ `SUMMER2026`), loại giảm (% hoặc tiền mặt cố định), giá trị đơn hàng tối thiểu, mức giảm tối đa, hạn sử dụng.
  3. **Ngừng áp dụng / Kích hoạt lại:** Bật hoặc tắt mã giảm giá khi hết ngân sách hoặc hết chiến dịch.

---

## Thành phần giao diện (UI Components & Layout)

### 1. Header & Nút hành động
- Tiêu đề `Khuyến mãi & giảm giá`, bộ lọc chi nhánh, ô tìm kiếm theo mã code/tên chương trình.
- Nút `+ Tạo mã khuyến mãi mới`.

### 2. Bảng dữ liệu mã giảm giá (dxDataGrid)
- Mã Code (in hoa nổi bật), Tên chương trình, Loại & Mức giảm (ví dụ: `15% (tối đa 500.000 đ)` hoặc `200.000 đ`), Đơn hàng tối thiểu, Thời gian áp dụng, Số lượt dùng (`12/50`), Trạng thái (`Đang chạy`, `Hết hạn`, `Tạm dừng`).
- Thao tác: Bật/Tắt kích hoạt, Sửa thời hạn, Xem lịch sử áp dụng.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W17-US01 — Quản lý chương trình khuyến mãi và mã giảm giá](../../user-stories/qtv/QTV-W17-Khuyến%20mãi%20&%20giảm%20giá/QTV-W17-US01-Quản%20lý%20chương%20trình%20khuyến%20mãi%20và%20mã%20giảm%20giá.md) | Màn hình chính + Modal | Bảng mã giảm giá & Modal tạo mã | Tạo, chỉnh sửa, bật tắt mã giảm giá và theo dõi số lượt sử dụng |

---

## Traceability
- Product Spec: [`docs/product-spec.md`](../../product-spec.md) (Mục 3 - W17)
- Phản hồi sếp Cường: Trang 1 file `ghi chú a Cường (1).pdf`.
