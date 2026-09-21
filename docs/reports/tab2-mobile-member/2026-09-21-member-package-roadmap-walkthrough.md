# Báo Cáo Bàn Giao: Tính Năng "Xem Lộ Trình" Gói Tập Mobile Hội Viên

- **Thời gian:** 2026-09-21
- **Phân hệ:** Mobile Hội viên (Tab 2 - `anti-2-HV`, thực hiện bởi `anti-3-PT` theo ủy quyền của Người Dùng)
- **Màn hình:** Gói của tôi (`#packages/mine`)
- **Tài liệu đặc tả:** [HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md](../../user-stories/hoi-vien/HV03-Gói%20của%20tôi/HV03-US01-Xem%20gói,%20quyền%20lợi%20và%20tiến%20độ%20sử%20dụng.md)

---

## 1. Yêu Cầu & Mục Tiêu Nghiệp Vụ

Hội viên khi vào menu **Gói của tôi** (`#packages/mine`) cần có nút **`[ Xem lộ trình ]`** trên các thẻ gói tập có trạng thái:
- `Đang sử dụng` (`ACTIVE`)
- `Đang đóng băng` (`FROZEN` / `is_frozen = true`)
- `Đã hết hạn` (`EXPIRED`)
- `Sắp hết hạn` (`EXPIRING` / cận ngày/buổi)

Khi bấm vào nút này (hoặc nút tương ứng bên trong modal "Chi tiết gói"), hệ thống mở modal **Lộ trình tập luyện** giúp Hội viên theo dõi trực quan:
1. **Thông tin hợp đồng:** Tên gói, Mã hợp đồng, HLV phụ trách, Chi nhánh đăng ký, Hiệu lực.
2. **Thanh tiến độ lộ trình:**
   - Số buổi đã tập / tổng số buổi, số buổi khả dụng còn lại.
   - Thanh progress bar trực quan (màu xanh dương).
   - Tỷ lệ hoàn thành (%) và số buổi đang giữ chỗ (nếu có).
3. **Dòng thời gian (Timeline) lịch sử các buổi đã hoàn thành:**
   - Tải động 100% từ Database PostgreSQL qua API `GET /api/v1/pt-bookings?registration_id=:id`.
   - Mỗi thẻ buổi tập hiển thị: Số thứ tự buổi (`Buổi 1`, `Buổi 2`...), Ngày tập, Khung giờ, Badge `Hoàn thành`.
   - Khối bài tập: Nội dung bài tập & mức tạ (`workout_notes`).
   - Khối thể lực: Đánh giá thể lực từ HLV (`fitness_assessment`).
4. **Trạng thái rỗng (Empty state):** Nếu gói chưa có buổi tập hoàn thành nào, hiển thị icon thân thiện và văn bản giải thích rõ ràng.

---

## 2. Các Thay Đổi Chi Tiết Trong Mã Nguồn

### 2.1. Logic Giao Diện JavaScript (`frontend/mobile/member/js/packages-notifications.js`)
- Trong `renderMine()`:
  - Bổ sung kiểm tra điều kiện hiển thị nút `canViewRoadmap`:
    ```javascript
    const canViewRoadmap = ['ACTIVE', 'SCHEDULED', 'FROZEN', 'EXPIRED'].includes(r.status) || isFrozen || expiring;
    if (canViewRoadmap) {
      const roadmapBtn = A.button("Xem lộ trình", "route", "secondary");
      roadmapBtn.onclick = () => openMemberRoadmapModal(r);
      row.append(roadmapBtn);
    }
    ```
- Trong `openPackageDetailModal(r)`:
  - Bổ sung nút `[ Xem lộ trình ]` trong thanh công cụ chân modal (`modalRoadmapBtn`), cho phép chuyển tiếp mượt mà sang modal lộ trình.
- Xây dựng hàm `openMemberRoadmapModal(r)`:
  - Gọi `GET /api/v1/pt-bookings?registration_id=${r.id}`.
  - Lọc và sắp xếp các buổi tập `COMPLETED` / `DONE` theo thứ tự buổi và ngày tập.
  - Render đầy đủ header, thẻ tiến độ và timeline buổi tập.

### 2.2. CSS Design System (`frontend/mobile/member/css/member.css`)
- Bổ sung các class chuẩn phong cách Paradise Gym:
  - `.member-roadmap-modal`
  - `.roadmap-summary-box`
  - `.roadmap-progress-card`
  - `.roadmap-timeline`
  - `.roadmap-timeline-card`
  - `.roadmap-card-header`
  - `.roadmap-card-body`
  - `.roadmap-assessment-block` (phân nhánh màu xanh dương cho bài tập và xanh lá cho thể lực)

### 2.3. Đồng Bộ Tài Liệu Đặc Tả (`docs/user-stories/hoi-vien/HV03-Gói của tôi/HV03-US01-Xem gói, quyền lợi và tiến độ sử dụng.md`)
- **Main Flow (Mục 6):** Bổ sung đặc tả nút `[ Xem lộ trình ]` và luồng hiển thị modal Lộ trình tập luyện.
- **Field-level specification:** Thêm 2 hàng đặc tả cho `Nút [ Xem lộ trình ] trên thẻ` và `Modal Lộ trình tập luyện` (rõ ràng các thuộc tính `CONDITIONAL`, `USER-INPUT`, `READONLY`).
- **Alternate Flows:** Bổ sung luồng `AF-07 — Xem lộ trình tập luyện của gói`.
- **Activity Diagram (Mermaid):** Bổ sung nhánh rẽ từ `D01` sang Action node `A16["Bấm nút [ Xem lộ trình ] trên Card"]` -> `S09["Nạp pt-bookings theo registration_id và hiển thị modal Lộ trình tập luyện"]` -> `A17["Xem tiến độ, timeline buổi tập và bấm [ Đóng ]"]` -> Final node `F06`. Đảm bảo chuẩn UML Swimlane và số lượng mũi tên (1 IN - 1 OUT).

---

## 3. Kết Quả Kiểm Thử Tự Động (Playwright E2E)

Đã chạy kiểm thử E2E tự động thông qua script `tests/scratch/test_member_roadmap.cjs`. Toàn bộ 4 kịch bản đều đạt kết quả 100% PASS:

| STT | Bước kiểm chứng | Kết quả | Hình ảnh bằng chứng |
| :--- | :--- | :--- | :--- |
| 1 | Các thẻ gói thỏa điều kiện đều hiển thị nút `[ Xem lộ trình ]` | PASS | `tests/e2e/hv/evidence-roadmap/01_packages_mine_roadmap_buttons.png` |
| 2 | Mở modal Lộ trình gói Combo VIP có 5 buổi hoàn thành | PASS | `tests/e2e/hv/evidence-roadmap/02_roadmap_modal_combo_vip.png` |
| 3 | Cuộn xem chi tiết timeline từng buổi tập kèm bài tập & thể lực | PASS | `tests/e2e/hv/evidence-roadmap/03_roadmap_modal_timeline_scroll.png` |
| 4 | Mở modal Lộ trình gói 0 buổi hoàn thành (Empty state chuẩn) | PASS | `tests/e2e/hv/evidence-roadmap/04_roadmap_modal_empty_state.png` |
