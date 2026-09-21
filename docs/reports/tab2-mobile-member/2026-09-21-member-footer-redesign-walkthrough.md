# Walkthrough — Chuẩn Hóa Màu Sắc Footer (Bottom Navigation) Mobile Hội Viên Đồng Bộ Với Header

**Ngày thực hiện:** 21/09/2026  
**Phân hệ phụ trách:** Mobile Member Lead (`anti-2-HV`)  
**Trạng thái kiểm thử:** ✅ PASSED 100% trên giao diện thật (Headless Chrome E2E).

---

## 1. Yêu Cầu & Mục Tiêu

Đổi màu thanh điều hướng chân trang (Bottom Navigation / Footer) của ứng dụng Mobile Hội viên từ nền trắng cũ sang màu xanh rừng rậm (`var(--forest)`, `#185740`) đồng nhất 100% với màu sắc thanh tiêu đề (Header):
1. **Nền thanh điều hướng (`.bottom-nav`):**
   - Màu nền: `var(--forest)` (`#185740`).
   - Đường viền trên: `1px solid rgba(255, 255, 255, 0.18)`.
   - Hiệu ứng đổ bóng mờ lên trên: `box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15)`.
2. **Nút điều hướng (`button` / `.nav-item`):**
   - Trạng thái bình thường (Inactive): Chữ và icon màu xanh phấn nhạt `#e0eee7`, font-size 11px, font-weight 600.
   - Trạng thái đang chọn (Active): Nền mờ `rgba(255, 255, 255, 0.18)`, chữ và icon màu trắng `#ffffff`, font-weight 700, kèm vạch chỉ báo (indicator bar) màu xanh chanh `#b2d988` bo tròn 3px ở cạnh dưới.
   - Hiệu ứng hover/tap: Nền sáng nhẹ `rgba(255, 255, 255, 0.1)`.

---

## 2. Chi Tiết Thay Đổi Code

### 2.1. CSS Styling (`frontend/mobile/member/css/member.css`)
- Cập nhật quy chuẩn thiết kế khối `.bottom-nav` và các `button` bên trong sang nền `var(--forest)`.
- Tạo vạch chỉ báo active bằng `::after` với màu `#b2d988` (khớp với chữ GYM trên Header).
- Nâng cấp phiên bản cache buster: `css/member.css?v=12` trong `frontend/mobile/member/index.html`.

---

## 3. Bằng Chứng Kiểm Thử UI Thực Tế

- **Tab Lịch tập (`#schedule`):** `verify_member_footer_schedule.png`  
  *Footer chuyển sang nền xanh rừng rậm `#185740` liền mạch và hài hòa tuyệt đối với Header. Nút "Lịch tập" active nổi bật với nền highlight mờ và vạch chỉ báo màu xanh chanh.*
- **Tab Gói của tôi (`#packages/mine`):** `verify_member_footer_packages.png`  
  *Footer duy trì sự nhất quán, cao cấp và đồng bộ trên mọi tab.*
