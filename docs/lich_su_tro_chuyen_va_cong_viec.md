# Lịch Sử Trò Chuyện & Báo Cáo Công Việc Đã Thực Hiện — Dự Án Paradise Gym-v2

> **Ngày cập nhật:** 14/09/2026  
> **Dự án:** Hệ thống Quản lý Phòng Gym — Paradise Gym-v2  
> **Môi trường / Scope:** Web QTV, Web Lễ tân, Mobile Hội viên, Mobile PT  

---

## I. LỊCH SỬ CÁC YÊU CẦU CỦA NGƯỜI DÙNG & DIỄN BIẾN THẢO LUẬN

Dưới đây là tổng hợp toàn bộ các yêu cầu của Người dùng (User Requests) và nội dung trao đổi qua từng giai đoạn của cuộc trò chuyện:

### 1. Rà soát & Tái cấu trúc Dashboard QTV-W01 (Xem tổng quan vận hành)
- **Yêu cầu:** Dashboard đang quá chung chung ("KPI, việc cần xử lý, lịch, cảnh báo"). Cần phân định rõ ràng giữa QTV và Lễ tân. Dashboard chỉ để nắm bắt tình hình hôm nay, không thực hiện toàn bộ nghiệp vụ tại đây.
- **Quyết định chốt:**
  - Với QTV, rút gọn còn **4 nhóm KPI chính**:
    1. *Hội viên đang hoạt động* & *Hội viên mới trong kỳ* (Registration mới, Gói hiệu lực).
    2. *Tổng tiền đã thu* & *Số Payment thành công* (Loại bỏ hoàn toàn chỉ số Công nợ, Còn phải thu, Thanh toán một phần).
    3. *Booking PT hôm nay* & *Buổi PT hoàn thành*.
    4. *Check-in hôm nay*.
  - **Loại bỏ:** Các thẻ cảnh báo "Gói sắp hết hạn 3 ngày", "Registration tồn lâu chưa thanh toán", "PT quá tải (>10 HV phụ trách)".

### 2. Chuẩn hóa Phân quyền QTV & Xử lý Trùng lặp
- **Yêu cầu:** Xác nhận quyền của QTV (QTV có toàn quyền theo hệ thống/branch scope được cấp) và xử lý tình trạng tài liệu bị đóng vòng (circular dependency/redundancy).

### 3. Tái cấu trúc Cây Thư Mục & Loại bỏ Tài liệu Legacy
- **Yêu cầu:** Hướng dẫn lọc và dọn dẹp các thư mục tài liệu chỉ giữ lại tài liệu còn sử dụng.
- **Thực hiện:** Phân định rõ tài liệu active trong `docs/` và chuyển/giữ tài liệu cũ ở `docs/user-stories-legacy/`.
- **Đánh giá `system-flow-specs`:** Xác nhận tầm quan trọng của `system-flow-specs` trong việc lưu giữ chỉ mục Flow Specs và Mermaid Swimlanes.

### 4. Quy tắc Đặc tả UI (Field-level specification)
- **Yêu cầu:** Xóa toàn bộ `Field-level specification` mô tả màn hình chung (Screen/Dashboard/Search Table). CHỈ giữ lại `Field-level specification` cho các **Modal / Drawer / Form nhập liệu**.
- **Thực hiện:** Đã quét và cập nhật toàn bộ codebase User Stories (QTV, Lễ tân, PT, Hội viên), loại bỏ bảng đặc tả màn hình chung (ví dụ: Màn hình đặt lịch PT, Màn hình danh sách gói), chỉ giữ bảng 5 cột cho Modal/Form.

### 5. Phác thảo UI cho Menu (Epic) và các US trong Epic (Bắt đầu với QTV-W02)
- **Yêu cầu:**
  1. Với Menu (Epic): Xác định các thành phần giao diện (UI components/layout) trên menu đó (Header, Search/Filter, Data Table, Pagination).
  2. Với các US có mở Modal/Drawer: Mô tả chi tiết các trường trên modal bằng bảng **Field-level specification** 5 cột chuẩn.
  3. Thực hiện mẫu bắt đầu với **`QTV-W02 · Hội viên & khách hàng`** và các US trong `QTV-W02` (US01, US02, US03, US04).

---

## II. BÁO CÁO CHI TIẾT CÁC CÔNG VIỆC ĐÃ HOÀN THÀNH

### 1. Chuẩn hóa Cấu trúc Tài liệu & Phân định Platform theo Role
Đã thiết lập ranh giới nền tảng (Platform Boundary) nghiêm ngặt trong tài liệu:
- **QTV / Quản lý:** Chỉ sử dụng Web (`W01`–`W13`).
- **Lễ tân:** Chỉ sử dụng Web (`W01`, `W02`, `W04`, `W06`, `W07`, `W08`, `W09`).
- **Hội viên:** Chỉ sử dụng Mobile App (`HV01`–`HV05`).
- **PT (Huấn luyện viên):** Chỉ sử dụng Mobile App (`PT01`–`PT04`).

### 2. Loại bỏ Hoàn toàn Khái niệm "Công Nợ / Trả Góp / Thanh Toán Nhiều Lần"
- **Thay đổi nghiệp vụ cốt lõi:** Hệ thống chuyển sang mô hình **Thanh toán 100% 1 lần duy nhất** để kích hoạt gói dịch vụ (Cash tại quầy hoặc VietQR/Bank Transfer xác nhận qua Webhook/IPN).
- **Hệ quả cập nhật:**
  - Loại bỏ tất cả các cột "Công nợ", "Còn thiếu", "Thu nợ", "Thanh toán một phần".
  - Đổi tên & refactor các User Story:
    - `LT-W08-US03` & `QTV-W08-US03`: Đổi thành "Theo dõi lịch sử thanh toán và trạng thái gói".
    - `QTV-W10-US01`: Đổi thành "Xem báo cáo thanh toán và doanh thu" (Giá trị đăng ký = Tiền thực thu 100%).
  - Các gói dịch vụ chỉ ở trạng thái `ACTIVE` / `SCHEDULED` sau khi đã nhận đủ 100% tiền thanh toán.

### 3. Refactor Toàn bộ User Stories theo Standard Format
Đã tiến hành refactor chuẩn hóa 100% các file User Story của QTV, Lễ tân, PT và Hội viên với cấu trúc:
1. **## Preconditions:** Dạng 5 dòng chuẩn (`Role/Platform/Epic`, `Canonical story/operation/actors`, Điều kiện vận hành, Branch scope, Traceability).
2. **## Trigger:** Định dạng gồm hành động kích hoạt và màn hình liên quan.
3. **### Field-level specification:** Chuẩn hóa bảng 5 cột cho Modal/Form:
   `| Field / control | State | Required | Conditional / dynamic | Source / validation |`
   State sử dụng: `USER-INPUT`, `AUTO-FILL`, `PREFILL`, `READONLY`, `READONLY (PREFILL)`.
   *Không đưa nút Lưu/Hủy hay các trường ngầm backend vào bảng UI.*
4. **## Result:** Gồm Postconditions, Permission/branch scope, Related screens, Mục tiêu nghiệp vụ.
5. **## Activity Diagram — Swimlane:** Biểu đồ Mermaid `flowchart TB` phân chia swimlane UML chuẩn.

### 4. Đặc tả Giao diện Chi tiết cho Epic QTV-W02 & các US

#### A. Phác thảo Menu `QTV-W02 · Hội viên & khách hàng` (Epic Level)
- **Khối 1 (Header & Action Bar):** Tiêu đề trang, Breadcrumb, Nút Primary CTA `[+ Thêm hội viên]` mở modal US01.
- **Khối 2 (Search & Filter Bar):** Ô tìm kiếm tự do (Tên/SĐT/Mã HV), Dropdown Lọc Trạng thái (`Tất cả`, `Đang hoạt động`, `Ngừng hoạt động`, `Đã lưu trữ`), Dropdown Lọc Chi nhánh (Multi-branch), Nút Đặt lại bộ lọc.
- **Khối 3 (Data Table - US04):** Bảng danh sách gồm 7 cột: `Mã hội viên`, `Họ và tên`, `Số điện thoại`, `Email`, `Chi nhánh tiếp nhận`, `Trạng thái (Badge)`, `Thao tác (Sửa, Đổi trạng thái, Xem gói tập)`.
- **Khối 4 (Pagination):** Bộ chọn số dòng/trang (10/20/50), Bộ chuyển trang.

#### B. Field-level Specification của các Modal trong QTV-W02

##### 1. Modal "Thêm mới hồ sơ hội viên" (QTV-W02-US01)
| Field / control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- |
| **Họ và tên** | `USER-INPUT` | required | Không | QTV nhập tự do (ví dụ: "Nguyễn Hoài Nam"); hỗ trợ tiếng Việt, tự động trim khoảng trắng |
| **Số điện thoại** | `USER-INPUT` | required | `DYNAMIC`: Chuẩn hóa & kiểm tra trùng realtime | QTV nhập (ví dụ: "0908 111 222"); 10 số bắt đầu bằng 0, bắt buộc `UNIQUE` toàn hệ thống |
| **Email** | `USER-INPUT` | optional | Không | QTV nhập nếu có; validate cú pháp email chuẩn RFC |
| **Chi nhánh tiếp nhận** | `PREFILL` + `READONLY` | required | Không | Tự động điền theo chi nhánh active của QTV đang thao tác; khóa cố định |
| **Ngày sinh** | `USER-INPUT` | optional | Không | Chọn qua **Date Picker** (`DD/MM/YYYY`); giới hạn không quá ngày hiện tại |

##### 2. Modal "Sửa hồ sơ hội viên" (QTV-W02-US02)
| Field / control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- |
| **Họ và tên** | `USER-INPUT` | required | Không | Giá trị hiện tại `PREFILL`, QTV có thể chỉnh sửa; hỗ trợ tiếng Việt |
| **Số điện thoại** | `READONLY (PREFILL)` | required | Không | Giá trị hiện tại hiển thị cố định (ví dụ: "0901 234 567"); khóa cứng không cho sửa (định danh duy nhất) |
| **Email** | `USER-INPUT` | optional | Không | Giá trị hiện tại `PREFILL`, QTV có thể sửa/xóa rỗng; validate email nếu có nhập |
| **Chi nhánh tiếp nhận** | `READONLY (PREFILL)` | required | Không | Lấy từ hồ sơ gốc (ví dụ: "Chi nhánh Quận 1"); khóa cố định không cho đổi |
| **Ngày sinh** | `USER-INPUT` | optional | Không | Giá trị hiện tại `PREFILL`, chọn qua **Date Picker** (`DD/MM/YYYY`) |

##### 3. Modal "Đổi trạng thái hội viên" (QTV-W02-US03)
| Field / control | State | Required | Conditional / dynamic | Source / validation |
| :--- | :--- | :--- | :--- | :--- |
| **Hội viên** | `READONLY` | required | Không | Hiển thị mã và tên hội viên: `Mã HV - Họ và tên` |
| **Trạng thái hiện tại** | `READONLY` | required | `DYNAMIC`: Lấy từ record | Hiển thị badge trạng thái hiện tại từ `MEMBER_PROFILE` |
| **Trạng thái mới** | `USER-INPUT` | required | Không | Select chọn: `Đang hoạt động`, `Ngừng hoạt động`, `Đã lưu trữ` |
| **Lý do đổi trạng thái** | `USER-INPUT` | optional | Không | Textarea cho phép QTV nhập ghi chú lý do để ghi audit log |

---

## III. TỔNG HỢP CÁC QUY TẮC NGHIỆP VỤ (BUSINESS RULES) CHỐT

1. **SĐT là Khóa Duy Nhất (Unique Key):** Mỗi hội viên có duy nhất 1 SĐT trên toàn hệ thống. Không cho phép sửa SĐT tại form Sửa hồ sơ.
2. **Chi nhánh tiếp nhận cố định:** Được tự động gán theo Chi nhánh làm việc của nhân viên tạo hồ sơ và không thể thay đổi sau khi khởi tạo.
3. **Trạng thái độc lập:** Trạng thái hồ sơ hội viên (Đang hoạt động/Ngừng/Lưu trữ) độc lập với trạng thái của từng gói tập cụ thể.
4. **Bảo tồn Dữ liệu:** Đổi trạng thái hoặc ngừng hoạt động không xóa vật lý hồ sơ, lịch sử tập hay lịch sử giao dịch.
5. **Thanh toán 100%:** Gói dịch vụ chỉ chuyển sang `ACTIVE` / `SCHEDULED` sau khi xác nhận thanh toán đủ 100%.

---

## IV. TRẠNG THÁI HIỆN TẠI & BƯỚC TIẾP THEO

- **Trạng thái:** Đã hoàn thành xong phác thảo UI Menu và đặc tả Modal cho `QTV-W02`.
- **Bước tiếp theo:** 
  1. Đồng bộ các UI components vào tài liệu Epic [QTV-W02-Hội viên & khách hàng.md](file:///e:/Desktop/Paradise%20Gym-v2/docs/epic/qtv/QTV-W02-H%E1%BB%99i%20vi%C3%AAn%20&%20kh%C3%A1ch%20h%C3%A0ng.md).
  2. Tiếp tục phác thảo UI & Modal Field-level specification cho Epic **`QTV-W03 · Gói tập`** và các US liên quan (`QTV-W03-US01`, `QTV-W03-US02`, `QTV-W03-US03`).
