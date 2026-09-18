# Hướng Dẫn Truy Cập & Quản Trị Cơ Sở Dữ Liệu PostgreSQL (pgAdmin 4 GUI)

Tài liệu này ghi lại toàn bộ thông tin đăng nhập, thông số cổng (port), tài khoản và hướng dẫn chi tiết cách xem, thêm, sửa, xóa dữ liệu trực tiếp trên giao diện **pgAdmin 4**.

---

## 1. Bảng Thông Số Đăng Nhập & Cổng Kết Nối

### A. Đăng nhập vào Giao diện Web pgAdmin 4
| Thông số | Giá trị | Ghi chú |
| :--- | :--- | :--- |
| **Đường dẫn Web** | [**http://localhost:5050**](http://localhost:5050) | Mở bằng trình duyệt Chrome, Edge, Brave,... |
| **Email đăng nhập** | `admin@paradisegym.vn` | Tài khoản quản trị viên pgAdmin |
| **Mật khẩu (Password)** | `admin` | Mật khẩu truy cập trang quản trị |

---

### B. Kết nối Database PostgreSQL (Modal "Connect to Server")
Khi mở pgAdmin và bấm vào server **`Paradise Gym (Docker - 5435)`**, hệ thống hiện popup yêu cầu mật khẩu:

| Thông số | Giá trị | Hướng dẫn thao tác |
| :--- | :--- | :--- |
| **Mật khẩu Database** | `postgres` | **Nhập `postgres` vào ô Password** |
| **Ghi nhớ mật khẩu** | Tích chọn `[x] Save Password` | Để các lần sau tự động vào không cần gõ lại |
| **Host (Nội bộ Docker)** | `paradise-postgres` | Cổng nội bộ: `5432` |
| **Host (Từ máy ngoài / DBeaver)** | `localhost` | **Cổng ngoài: `5435`** |
| **Database Name** | `paradise_gym` | Cơ sở dữ liệu chính của dự án |
| **Username** | `postgres` | Người dùng superuser của PostgreSQL |

> [!NOTE]
> Nếu bạn thấy thông báo màu đỏ: `FATAL: password authentication failed for user "postgres"` như trong hình chụp, nguyên nhân là do ô mật khẩu đang để trống hoặc gõ chưa đúng. Bạn chỉ cần gõ chính xác chữ: **`postgres`** (chữ thường, không có dấu cách) rồi bấm **OK** là kết nối thành công 100%.

---

## 2. Cách Xem Dữ Liệu Trong Từng Bảng (View Data)

Sau khi kết nối thành công, bạn mở cây thư mục ở thanh bên trái theo đường dẫn:
```
Servers
 └── Paradise Gym
      └── Paradise Gym (Docker - 5435)
           └── Databases
                └── paradise_gym
                     └── Schemas
                          └── public
                               └── Tables (22 bảng)
```

### Các bước mở bảng:
1. Bạn sẽ thấy danh sách toàn bộ 22 bảng: `accounts`, `branches`, `member_profiles`, `packages`, `payments`, `pt_bookings`, `pt_profiles`, `receipts`, `registrations`,...
2. **Xem toàn bộ dòng dữ liệu:**
   - **Nhấp chuột phải** vào tên bảng muốn xem (ví dụ: `pt_bookings` hoặc `registrations`).
   - Chọn **View/Edit Data** $\rightarrow$ chọn **All Rows** (hoặc **First 100 Rows**).
3. Giao diện dạng bảng tính (Grid View) sẽ mở ra ở khung bên phải với đầy đủ các cột (columns) và từng dòng dữ liệu (rows).

---

## 3. Cách THÊM, SỬA, XÓA Dữ Liệu Thủ Công Trực Tiếp Trên Giao Diện pgAdmin (GUI)

Bạn có thể chỉnh sửa dữ liệu trực tiếp như thao tác trên file Excel mà không cần phải viết câu lệnh SQL:

### 3.1. Cách SỬA dữ liệu (Edit):
1. Trong màn hình xem bảng (**View/Edit Data**), tìm đến dòng và cột cần sửa.
2. **Nhấp đúp chuột (Double-click)** vào ô dữ liệu muốn sửa.
3. Gõ nội dung mới (ví dụ: đổi trạng thái `status` từ `BOOKED` sang `COMPLETED`, đổi số điện thoại, sửa ghi chú bài tập,...).
4. Nhấn phím **Enter** trên bàn phím.
5. **LƯU THAY ĐỔI:** Nhấn vào biểu tượng **Save Data Changes** (hình chiếc đĩa mềm 💾 ở thanh công cụ phía trên) hoặc bấm phím tắt **`Ctrl + S`** (trên Windows có thể dùng **`F6`**). Ô dữ liệu sẽ đổi từ viền xanh sang bình thường, báo hiệu dữ liệu đã được lưu vĩnh viễn vào Database.

---

### 3.2. Cách THÊM dòng mới (Add / Insert):
1. Trong màn hình xem bảng (**View/Edit Data**):
   - **Cách 1:** Cuộn chuột xuống dòng cuối cùng của bảng, bạn sẽ thấy một dòng trống có biểu tượng **dấu sao `*`** ở cột đầu tiên. Nhấp chuột vào các ô trên dòng đó để nhập dữ liệu.
   - **Cách 2:** Nhấn vào biểu tượng **Add row** (dấu cộng `+` màu xanh) trên thanh công cụ phía trên.
2. Nhập các giá trị cho từng cột:
   - Với cột khóa chính `id` (`UUID`): Nếu bảng có cấu hình `gen_random_uuid()`, bạn có thể để trống để PostgreSQL tự sinh ID ngẫu nhiên, hoặc gõ một mã UUID hợp lệ.
   - Với các khóa ngoại (như `member_id`, `pt_id`, `registration_id`): Bắt buộc phải nhập ID thực tế đang tồn tại ở bảng cha để đảm bảo tính toàn vẹn dữ liệu (tuân thủ Rule 5 & Rule 6 trong `AGENTS.md`).
3. **LƯU DÒNG MỚI:** Nhấn biểu tượng **Save Data Changes** (hình đĩa mềm 💾 hoặc phím tắt **`Ctrl + S`**).

---

### 3.3. Cách XÓA dòng dữ liệu (Delete):
1. Trong màn hình xem bảng (**View/Edit Data**), nhấp chuột vào **số thứ tự dòng** ở cột ngoài cùng bên trái để bôi đen toàn bộ dòng cần xóa.
   *(Nếu muốn xóa nhiều dòng cùng lúc, giữ phím `Ctrl` hoặc `Shift` rồi nhấp chọn các dòng).*
2. Nhấn vào biểu tượng **Delete selected row(s)** (hình thùng rác 🗑️ hoặc dấu trừ `-`) trên thanh công cụ.
3. Dòng dữ liệu sẽ bị gạch ngang.
4. **XÁC NHẬN XÓA:** Nhấn biểu tượng **Save Data Changes** (hình đĩa mềm 💾 hoặc **`Ctrl + S`**). Dòng dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.

---

## 4. Cách Dùng Query Tool Viết Câu Lệnh SQL Trực Tiếp

Nếu bạn muốn truy vấn nâng cao hoặc lọc dữ liệu theo điều kiện:
1. Nhấp chuột vào tên database `paradise_gym` hoặc tên bảng.
2. Bấm vào biểu tượng **Query Tool** (hình tia sét ⚡ hoặc chiếc kính lúp trên thanh công cụ phía trên) hoặc bấm phím tắt **`Alt + Shift + Q`**.
3. Khung soạn thảo SQL hiện ra, bạn có thể gõ các câu lệnh:

```sql
-- 1. Xem Buổi 17 ngày 04/09/2026 của học viên Trần Thị Bình
SELECT session_number, booking_date, start_time, pt_name, member_name, status, workout_notes 
FROM pt_bookings 
WHERE session_number = 17;

-- 2. Xem các gói đăng ký hợp đồng và số buổi PT còn lại
SELECT reg_code, member_name, assigned_pt_name, total_pt_sessions_snapshot, used_pt_sessions, remaining_pt_sessions, status 
FROM registrations;

-- 3. Xem danh sách toàn bộ Huấn luyện viên
SELECT pt_code, full_name, phone, rating, total_reviews 
FROM pt_profiles;

-- 4. Thêm nhanh 1 ghi chú bài tập bằng SQL
UPDATE pt_bookings 
SET workout_notes = 'Tập thêm 15 phút cardio cuối buổi' 
WHERE session_number = 17;
```

4. Nhấn phím **`F5`** (hoặc biểu tượng nút **Play ▶**) để thực thi câu lệnh và xem kết quả bên dưới.

---

## 5. Các Lệnh Quản Lý Container Bằng Terminal (Khi Cần)

- Khởi động lại pgAdmin:
  ```powershell
  docker restart paradise-pgadmin
  ```
- Khởi động lại PostgreSQL:
  ```powershell
  docker restart paradise-postgres
  ```
- Chạy lại script seed dữ liệu mẫu 22 bảng:
  ```powershell
  cd backend
  npm run db:seed
  ```
