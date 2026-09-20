# QTV-W16 — Lớp tập cộng đồng

- **Role:** QTV / Quản lý, Lễ tân
- **Platform:** Web only
- **Menu:** `W16`
- **Goal:** Lập lịch và quản lý các buổi tập nhóm cộng đồng (Cardio, Aerobic, Yoga, Zumba,...) do phòng gym tổ chức và thuê giáo viên hướng dẫn, kiểm soát số lượng học viên tối đa (slot) và quản lý danh sách đăng ký tham gia từ Hội viên.
- **Scope:**
  1. **Lập lịch lớp cộng đồng:** Tạo mới buổi tập nhóm: Tên lớp, Giáo viên đứng lớp, Ngày giờ, Chi nhánh, Số lượng người tối đa (ví dụ 40 người).
  2. **Theo dõi đăng ký:** Xem số lượng hội viên đã đăng ký / tối đa (ví dụ `25/40`), danh sách học viên tham gia.
  3. **Đăng ký học viên tại quầy:** Hỗ trợ Lễ tân ghi nhận hội viên đăng ký tham gia lớp trực tiếp tại quầy.

---

## Thành phần giao diện (UI Components & Layout)

### 1. Header & Bộ lọc lớp học
- Tiêu đề `Lớp tập cộng đồng`, bộ chọn ngày/tuần, bộ lọc chi nhánh, trạng thái lớp (`Sắp diễn ra`, `Đang mở đăng ký`, `Đã kết thúc`, `Đã hủy`).
- Nút `+ Thêm lớp cộng đồng mới`.

### 2. Bảng / Lưới thẻ các lớp tập cộng đồng
- Tên lớp (Aerobic, Cardio,...), ngày giờ diễn ra, HLV/Giáo viên đứng lớp.
- Chỉ số slot: Tiến độ đăng ký trực quan (ProgressBar `25/40 chỗ`).
- Nút `Xem danh sách học viên`, nút `Sửa/Hủy lớp`.

---

## User Stories trong Epic

| User Story | Loại giao diện | Khối UI tương ứng | Đặc tả chi tiết |
| :--- | :--- | :--- | :--- |
| [QTV-W16-US01 — Lập lịch và quản lý lớp tập cộng đồng](../../user-stories/qtv/QTV-W16-Lớp%20tập%20cộng%20đồng/QTV-W16-US01-Lập%20lịch%20và%20quản%20lý%20lớp%20tập%20cộng%20đồng.md) | Màn hình chính + Modal | Danh sách lớp nhóm & Modal tạo lớp | Tạo lịch lớp, gán giáo viên, giới hạn slot và theo dõi hội viên đăng ký |

---

## Traceability
- Product Spec: [`docs/product-spec.md`](../../product-spec.md) (Mục 4.2 - Loại 2)
- Phản hồi sếp Cường: Trang 2 file `ghi chú a Cường (1).pdf`.
