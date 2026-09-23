# Báo Cáo Nghiệm Thu: Chuẩn Hóa Dữ Liệu Seed Đúng 2 HLV & Ban Hành Skill db-seed-integrity

- **Ngày thực hiện:** 2026-09-22
- **Phân hệ phụ trách:** Tab 1 - Web Admin Lead (`anti-1-QTV-LT`)
- **Phạm vi tác động:** Database PostgreSQL, Script Seed, Base SQL Seeds, Kỹ năng hệ thống `.agents/skills/db-seed-integrity/SKILL.md`, Quy tắc dự án `AGENTS.md`, Giao diện Web Admin W16 Lớp tập cộng đồng.

---

## 1. Vấn Đề Gốc Đã Xử Lý (Root Cause & Problem Resolution)

1. **Phát hiện:** Trước đây một số script seed (`reseed_distinct_community_classes.js`, `seed_community_timetable.js`) đã tự ý sinh các tên Huấn luyện viên lạ ("HLV Quỳnh Trâm", "HLV Lyn Lyn", "HLV Raymond", "HLV Joy", "HLV Đặng Minh Tuấn", "HLV Trần Thị Mai") trên màn hình *Lớp tập cộng đồng (W16)*, vi phạm quy định chỉ có đúng 2 HLV trong chuỗi Paradise Gym.
2. **Khắc phục triệt để:**
   - Cố định danh mục Huấn luyện viên duy nhất của hệ thống:
     * **PT001: Nguyễn Văn Thể** (SĐT: `0900000003`, Profile ID: `50000000-0000-0000-0000-000000000001`, Chi nhánh: Paradise Gym Quận 1).
     * **PT002: Lê Văn Hùng** (SĐT: `0900000004`, Profile ID: `50000000-0000-0000-0000-000000000002`, Chi nhánh: Paradise Gym Bình Thạnh).
   - Xóa bỏ toàn bộ tài khoản, hồ sơ và dữ liệu liên quan của các PT ảo/dư thừa (PT003, PT004, PT005).
   - Tái cấu trúc và gán lại toàn bộ lớp cộng đồng tuần 21/09 - 27/09/2026:
     * Lớp tại **Bình Thạnh**: 100% do **HLV Lê Văn Hùng** đứng lớp.
     * Lớp tại **Quận 1**: 100% do **HLV Nguyễn Văn Thể** đứng lớp.
     * Giờ học các lớp cộng đồng được tính toán không chồng lấn giờ dạy PT 1:1 đã đặt.
   - Sửa đổi các file seed gốc `backend/src/db/seeds/001_seed_data.sql` và `002_boss_feedback_seed.sql`.
   - Vô hiệu hóa và chuyển hướng các script seed cũ về `scripts/fix_seed_exact_two_pts.js`.

---

## 2. Ban Hành Skill Mới: `.agents/skills/db-seed-integrity/SKILL.md`

Đã biên soạn và đưa vào vận hành kỹ năng chuẩn hóa toàn diện:
- **Nguyên tắc 1:** Cấm tuyệt đối tên nhân sự ảo (No Ghost/Phantom Instructors).
- **Nguyên tắc 2:** Ràng buộc chi nhánh 1-1 (HLV chi nhánh nào chỉ dạy chi nhánh đó).
- **Nguyên tắc 3:** Ràng buộc không trùng giờ giữa Lớp cộng đồng và Lịch tập PT 1:1.
- **Nguyên tắc 4:** Tính nhất quán toán học trong hợp đồng (`total = used + remaining + booked`).
- **Nguyên tắc 5:** Toàn vẹn tham chiếu khóa ngoại và snapshot giá.
- **Nguyên tắc 6:** Khớp nối kế toán thanh toán - phiếu thu.
- **Quy tắc bắt buộc trong `AGENTS.md`:** Thêm cảnh báo tối thượng tại Mục 5 yêu cầu mọi Agent phải chạy bộ SQL Audit kiểm tra tính toàn vẹn dữ liệu trước khi kết thúc tác vụ.

---

## 3. Kết Quả Kiểm Tra Tự Động (SQL Audit)

Thực thi file kiểm toán tự động `scripts/audit_seed_integrity.js`:
- **Tiêu chí 1 (Tổng số HLV = 2):** `total_pts = 2` ➔ **PASS**
- **Tiêu chí 2 (HLV lạ/ma trong Lớp cộng đồng = 0):** `ghost_instructors = 0` ➔ **PASS**
- **Tiêu chí 3 (HLV bị phân công sai chi nhánh = 0):** `branch_mismatch = 0` ➔ **PASS**
- **Tiêu chí 4 (Xung đột lịch dạy Lớp CĐ vs PT 1:1 = 0):** `schedule_overlap = 0` ➔ **PASS**
- **Tiêu chí 5 (Lệch số dư buổi tập hợp đồng = 0):** `session_mismatch = 0` ➔ **PASS**

---

## 4. Nghiệm Thu Giao Diện Thực Tế (UI Verification)

Đã chạy kiểm thử E2E bằng Headless Chrome và chụp screenshot full-page:
- **Ảnh 1:** `verify_community_classes_binh_thanh_exact_pt.png`: Toàn bộ các thẻ lớp tại chi nhánh Paradise Gym Bình Thạnh hiển thị duy nhất **HLV Lê Văn Hùng**.
- **Ảnh 2:** `verify_community_classes_quan1_exact_pt.png`: Toàn bộ các thẻ lớp tại chi nhánh Paradise Gym Quận 1 hiển thị duy nhất **HLV Nguyễn Văn Thể**.
