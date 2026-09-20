# Sổ Tay Giải Thích Nghiệp Vụ Vận Hành — Paradise Gym (Business Q&A)

Tài liệu này ghi lại các câu hỏi thắc mắc về nghiệp vụ thực tế trong quá trình phát triển và vận hành hệ thống Paradise Gym, kèm lời giải thích chi tiết, cơ chế kỹ thuật và quy trình xử lý thực tế tại phòng tập.

---

## Mục lục tra cứu
- [Q1: Nghiệp vụ "Chờ nhắc gia hạn (14 ngày qua)" tại Trang tổng quan là gì?](#q1-nghiệp-vụ-chờ-nhắc-gia-hạn-14-ngày-qua-tại-trang-tổng-quan-là-gì)

---

<a name="q1-nghiệp-vụ-chờ-nhắc-gia-hạn-14-ngày-qua-tại-trang-tổng-quan-là-gì"></a>
## Q1: Nghiệp vụ "Chờ nhắc gia hạn (14 ngày qua)" tại Trang tổng quan là gì?

* **Ngày hỏi:** 19/09/2026
* **Màn hình liên quan:** 
  - `W01 · Tổng quan vận hành` (Thẻ KPI khối Chăm sóc khách hàng & Vận hành)
  - `W14 · Chăm sóc khách hàng` (Tab "Chờ nhắc gia hạn")
* **Câu hỏi của Người Dùng:**
  > *"chờ nhắc gia hạn là sao nhỉ? tôi chưa hiểu lắm"*

---

### Trả lời chi tiết:

Chỉ số **"Chờ nhắc gia hạn (14 ngày qua)"** (mã kỹ thuật: `pending_renewals`) là nghiệp vụ **Chăm sóc khách hàng & Giữ chân hội viên (Customer Retention / Win-back)** cực kỳ quan trọng trong thực tế vận hành các chuỗi phòng tập Gym & Fitness.

---

### 1. Phân biệt rõ 2 giai đoạn nhắc gia hạn gói tập

Trong quy trình CRM của phòng gym, khách hàng cận hạn và hết hạn được chia làm 2 nhóm độc lập với mục tiêu tác nghiệp khác nhau:

| Tiêu chí | Giai đoạn 1: Sắp hết hạn | Giai đoạn 2: Chờ nhắc gia hạn |
| :--- | :--- | :--- |
| **Tên Thẻ KPI** | **Gói sắp hết hạn (`<= 4 ngày`)** | **Chờ nhắc gia hạn (`14 ngày qua`)** |
| **Trạng thái hội viên** | Gói tập **vẫn còn hạn** (còn 1 đến 4 ngày nữa mới hết hạn). Khách vẫn đang có quyền quét thẻ vào phòng tập bình thường. | Gói tập **đã chính thức hết hạn** trong vòng từ 1 đến 14 ngày gần đây, và hội viên **chưa mua tiếp bất kỳ gói mới nào**. |
| **Mục đích nghiệp vụ** | **Nhắc trước để không gián đoạn tập luyện**: Thông báo để khách chủ động chuẩn bị tiền hoặc gia hạn nối tiếp ngay khi gói cũ chưa hết. | **Giữ chân & Kéo khách quay lại (Retention / Win-back)**: Tìm hiểu lý do khách dừng tập, xử lý phản hồi và đưa ưu đãi để mời khách tái ký gói mới. |
| **Kịch bản giao tiếp** | *"Em chào anh/chị, gói tập của mình còn 3 ngày nữa là hết hạn. Em gọi hỗ trợ anh/chị gia hạn sớm để không bị gián đoạn lịch tập nhé."* | *"Em chào anh/chị, gói tập của mình vừa hết hạn tuần trước. Đợt này anh/chị có bận công việc không ạ? Phòng tập đang có chương trình tri ân dành riêng cho hội viên cũ tái ký..."* |

---

### 2. Tại sao lại lấy mốc thời gian "14 ngày qua"?

- **Quy luật tâm lý khách hàng (Retention Golden Window):**
  - Trong ngành thể hình, thói quen tập luyện của con người rất dễ bị phá vỡ. Khoảng thời gian từ **1 đến 14 ngày ngay sau khi hết hạn** được xem là **"Giai đoạn vàng để giữ chân khách"**.
  - Nếu trong 2 tuần đầu tiên sau khi hết hạn mà nhân viên phòng gym **không liên hệ hỏi thăm**, tỷ lệ khách bỏ tập luôn hoặc chuyển sang phòng gym khác gần nhà/mới mở lên tới **hơn 80%**.
  - Sau 14 ngày không tập, khách sẽ rơi vào nhóm "Hội viên ngủ đông / Churn" và chi phí để kéo họ quay lại sẽ tốn kém hơn gấp nhiều lần.
- **Tập trung nguồn lực:** Thẻ KPI này giúp nhân viên Lễ tân / CSKH / Telesale biết chính xác mỗi ngày có bao nhiêu khách vừa rơi vào "giai đoạn vàng" này để ưu tiên gọi điện chăm sóc ngay lập tức.

---

### 3. Cơ chế xử lý dữ liệu thông minh trong hệ thống

Hệ thống Paradise Gym áp dụng các logic tự động để đảm bảo dữ liệu luôn chuẩn xác:

1. **Lọc tự động trong CSDL PostgreSQL:**
   - Điều kiện: Gói có `status = 'EXPIRED'` hoặc `end_date < CURRENT_DATE` và `end_date >= CURRENT_DATE - INTERVAL '14 days'`.
   - **Tự động loại trừ (Auto-exclude):** Nếu hội viên đó **đã mua gói mới** (có đăng ký `ACTIVE` hoặc `PENDING_PAYMENT` có hạn đến tương lai), hệ thống sẽ tự động gạch tên họ ra khỏi danh sách này. Điều này giúp nhân viên **không bao giờ bị gọi nhầm làm phiền khách hàng đã gia hạn**.
2. **Thao tác 1 chạm trên giao diện:**
   - Khi click vào Thẻ KPI tại Dashboard &rarr; Hệ thống mở danh sách chi tiết: Tên khách, số điện thoại, tên gói cũ đã tập, ngày hết hạn.
   - Nút **`Gọi`**: Mở popup quay số và lưu ngay nhật ký cuộc gọi (khách hẹn ngày đến, khách đi công tác, khách khiếu nại dịch vụ...).
   - Nút **`Tái ký gói`**: Mở form đăng ký mới với thông tin hội viên đã được điền sẵn (PREFILL), nhân viên chỉ cần chọn gói mới và thu tiền.

---

### 4. Gợi ý các cách đặt tên nhãn thay thế (Nếu muốn đổi tên cho thân thiện)

Nếu tên gọi *"Chờ nhắc gia hạn (14 ngày qua)"* gây băn khoăn cho nhân sự mới, có thể đổi tên hiển thị trên thẻ sang một trong các phương án sau:
1. **"Gói vừa hết hạn (14 ngày qua)"** *(Trực diện, dễ hiểu nhất)*
2. **"Chăm sóc tái ký (14 ngày qua)"**
3. **"Khách hết hạn chưa mua tiếp"**

---
*Tài liệu được cập nhật tự động bởi Antigravity — Hệ thống Paradise Gym.*
