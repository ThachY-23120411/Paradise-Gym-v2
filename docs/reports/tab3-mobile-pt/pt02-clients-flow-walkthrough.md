# Báo Cáo Đối Chiếu & Hoàn Thiện Phân Hệ PT02 · Quản Lý Học Viên (Mobile PT App)

- **Phân hệ:** Menu PT02: Quản lý học viên (Footer tab `Học viên`)
- **Phụ trách:** Subagent `PT02-Clients-Flow` (Tab 3: `anti-3-PT`)
- **Tài liệu đối chiếu:**
  + Epic: `docs/epic/pt/PT02-Học viên.md`
  + User Story 1: `docs/user-stories/pt/PT02-Học viên/PT02-US01-Xem danh sách học viên được phân công.md`
  + User Story 2: `docs/user-stories/pt/PT02-Học viên/PT02-US02-Xem lộ trình và lịch sử tập luyện của học viên.md`
  + User Story 3: `docs/user-stories/pt/PT02-Học viên/PT02-US03-Tiếp nhận và xử lý yêu cầu phân công PT.md`
- **Tập tin mã nguồn hoàn thiện:**
  + `frontend/mobile/pt/js/clients.js`
  + `frontend/mobile/pt/js/app.js`

---

## 1. Kết Quả Đối Chiếu Main Flow & Activity Diagram

### 1.1. PT02-US01: Xem danh sách học viên được phân công
| Tiêu chí nghiệp vụ & Flow | Trạng thái đối chiếu | Chi tiết kỹ thuật & Xử lý |
| :--- | :---: | :--- |
| Nạp danh sách theo phạm vi phân công của PT (`trainerId` / `currentPtId`) | **Khớp 100%** | Kết hợp `apiClient.registrations.list()`, `apiClient.pt.listBookings()`, `apiClient.members.list()` và `apiClient.pt.listAssignmentRequests()`. Tự động nhận diện PT qua `currentUser` / `getUserContext`. |
| Tìm kiếm realtime (Họ tên, SĐT, Mã HV) | **Khớp 100%** | Lắng nghe sự kiện `input` trên `#ptClientsSearchInput`, có icon kính lúp, placeholder chuẩn và nút xóa nhanh `[×]` hiển thị/ẩn động. |
| Bộ chuyển phân loại 2 Tab | **Khớp 100%** | Gồm tab `Đang phụ trách (N)` (mặc định chọn) và `Yêu cầu phân công` kèm badge đỏ đếm chính xác số lượng yêu cầu `PENDING`. |
| Thẻ học viên & Dữ liệu hiển thị | **Khớp 100%** | Hiển thị: Avatar viết tắt chữ cái họ tên, Họ tên (in đậm), Mã HV, SĐT, Gói PT, Hạn dùng (`HSD: DD/MM/YYYY`), Badge `Đang hoạt động` / `Sắp hết hạn`. |
| Logic cảnh báo `Sắp hết hạn` | **Khớp 100%** | Kích hoạt badge vàng/cam khi thời hạn gói còn $\le 7$ ngày hoặc số buổi còn lại $\le 3$. Ngày hiện tại tính động theo thời gian thực. |
| Cụm 2 chỉ số chuyên môn | **Khớp 100%** | Ô 1: `Buổi PT còn lại` (số buổi). Ô 2: `Lần cuối` (ngày diễn ra buổi tập hoàn thành `COMPLETED` gần nhất `DD/MM/YYYY` hoặc `-` nếu chưa tập buổi nào). |
| Quy tắc cấm công nợ | **Khớp 100%** | Tuyệt đối không hiển thị bất kỳ thông tin tài chính, thanh toán hay công nợ nào trên màn hình HLV. |
| Thanh tiến độ lộ trình (Progress Bar) | **Khớp 100%** | Hiển thị dạng `Đã tập X / Y buổi` kèm tỷ lệ phần trăm `%` và thanh tiến trình đồ họa trực quan. |
| Điều hướng mở chi tiết | **Khớp 100%** | Chạm vào thẻ học viên kích hoạt `ParadisePTClients.openClientDetail(clientId)` mở màn hình PT02-US02. |
| Empty State & Exception Flow | **Khớp 100%** | Hiển thị "Chưa có học viên nào được phân công" / "Không tìm thấy học viên phù hợp". Xử lý lỗi mạng với toast cảnh báo và giữ nguyên trạng thái cũ. |

---

### 1.2. PT02-US02: Xem lộ trình và lịch sử tập luyện của học viên
| Tiêu chí nghiệp vụ & Flow | Trạng thái đối chiếu | Chi tiết kỹ thuật & Xử lý |
| :--- | :---: | :--- |
| Nút quay lại `[←]` (Back Button) | **Khớp 100%** | Nằm góc trên bên trái thanh tiêu đề con, gọi `ParadisePTClients.closeClientDetail()` để đóng subscreen và quay lại danh sách. |
| Khối tóm tắt hồ sơ & gói tập | **Khớp 100%** | Hiển thị Avatar lớn, Họ tên, Mã HV, SĐT, Chi nhánh tập luyện, Tên gói PT, Tổng số buổi và Ngày hết hạn gói. Hỗ trợ nút gọi điện thoại trực tiếp `tel:`. |
| Thanh tiến độ lộ trình (Progress Bar) | **Khớp 100%** | Thể hiện trực quan `Đã tập X / Y buổi - Còn lại Z buổi` kèm % tiến độ hoàn thành. |
| Timeline các buổi tập đã hoàn thành | **Khớp 100%** | Lọc chuẩn xác các buổi tập có trạng thái `COMPLETED` / `DONE`. Hiển thị: Thứ tự buổi (`Buổi 1`, `Buổi 2`...), Ngày tập (`DD/MM/YYYY`), Khung giờ (`HH:mm - HH:mm`), Badge xanh lá `Hoàn thành`. |
| Ghi chú giáo án & Đánh giá thể lực | **Khớp 100%** | 2 khối riêng biệt: `Nội dung bài tập & mức tạ:` và `Đánh giá thể lực PT:` ghi nhận sau buổi tập để PT liên tục điều chỉnh giáo án. |
| Trạng thái rỗng (Empty State) | **Khớp 100%** | Nếu học viên mới chưa hoàn thành buổi nào (`0 / Y buổi`), hiển thị thông báo: *"Học viên chưa có buổi tập hoàn thành nào trong lộ trình"*. |

---

### 1.3. PT02-US03: Tiếp nhận và xử lý yêu cầu phân công PT
| Tiêu chí nghiệp vụ & Flow | Trạng thái đối chiếu | Chi tiết kỹ thuật & Xử lý |
| :--- | :---: | :--- |
| Danh sách yêu cầu phân công PENDING | **Khớp 100%** | Nạp từ API `GET /pt-bookings/assignment-requests?pt_id=...&status=PENDING`. |
| Thẻ yêu cầu phân công | **Khớp 100%** | Hiển thị Avatar, Họ tên, Mã HV, SĐT, Chi nhánh đăng ký, Gói PT yêu cầu, Thời gian gửi (`DD/MM/YYYY HH:mm`) và Ghi chú mong muốn của Hội viên. |
| Nút `[ Đồng ý tiếp nhận ]` | **Khớp 100%** | Gọi API `POST /pt-bookings/assignment-request/:id/respond` với body `{ status: 'ACCEPTED', response_note: '...' }`. Cập nhật trạng thái, đồng bộ database, nạp lại dữ liệu đưa học viên vào danh sách phụ trách chính thức của PT và kích hoạt quyền đặt lịch. |
| Nút `[ Từ chối ]` & Bottom Sheet | **Khớp 100%** | Mở Bottom Sheet với thẻ tóm tắt học viên và gói bị từ chối tiếp nhận. |
| 4 Lý do từ chối định sẵn (`TRIGGER`) | **Khớp 100%** | Gồm 4 tùy chọn: `Trùng ca làm việc`, `Đã kín ca phụ trách`, `Không phù hợp mục tiêu tập luyện`, `Khác`. |
| Chi tiết lý do khác (`CONDITIONAL`) | **Khớp 100%** | Ô textarea nhập lý do chi tiết kèm đếm ký tự `0/255`. **Hiện khi** chọn `Khác`, **Ẩn khi** chọn bất kỳ lý do nào khác. Bắt buộc nhập khi chọn `Khác`. |
| Xử lý từ chối hoàn tất | **Khớp 100%** | Gọi API `POST /pt-bookings/assignment-request/:id/respond` với body `{ status: 'REJECTED', response_note: finalNote }`. Đóng modal, cập nhật danh sách và badge đếm. |
| Exception Flow xử lý lỗi mạng | **Khớp 100%** | Bắt lỗi mạng thực tế từ API; nếu lỗi, hiển thị toast thông báo lỗi và giữ nguyên trạng thái cũ để PT có thể thử lại, không tự ý ẩn hay xóa thẻ yêu cầu. |

---

## 2. Các Điểm Đã Được Rà Soát & Tối Ưu Hóa Trong Mã Nguồn

1. **Lọc dữ liệu buổi tập hoàn thành cho Timeline (`PT02-US02`):**
   - Trước đây: `memberBookings` đưa tất cả các ca (kể cả ca sắp diễn ra) vào timeline và gán nhãn Hoàn thành.
   - Đã sửa: Phân tách rõ ràng `completedBookings = memberBookings.filter(b => b.status === 'COMPLETED' || b.status === 'DONE')`. Chỉ những ca đã hoàn tất và khấu trừ mới hiển thị trong timeline lộ trình.
2. **Khắc phục trường dữ liệu trên Thẻ yêu cầu phân công (`PT02-US03`):**
   - Khớp nối `requestedAt` với helper `formatDateTimeDisplay()` (`DD/MM/YYYY HH:mm`).
   - Khớp nối `note` / `notes` (`r.request_note`) để hiển thị trọn vẹn lời nhắn từ Hội viên.
   - Bổ sung tra cứu `branchName` từ registration hoặc profile chi nhánh.
3. **Chuẩn hóa tính toán `Lần cuối` (`PT02-US01`):**
   - `lastSessionDate` được lấy từ buổi tập đã hoàn thành gần nhất (`lastCompletedBooking`), không lấy nhầm các lịch hẹn tương lai.
4. **Bảo toàn dữ liệu khi có lỗi kết nối mạng (Exception Flows):**
   - Loại bỏ cơ chế tự xóa bản ghi khi API thất bại ở `confirmReject` và `acceptRequest`. Đảm bảo tuân thủ nghiêm ngặt Exception Flow: thông báo lỗi mạng và giữ nguyên dữ liệu trên UI để người dùng thử lại.
5. **Cơ chế tải lại động khi chuyển tab:**
   - Bổ sung phương thức `refresh()` vào `ParadisePTClients`.
   - Cập nhật `app.js` tự động kích hoạt `window.ParadisePTClients.refresh()` khi HLV bấm vào tab `Học viên` (`members`) hoặc đăng nhập thành công.

---

## 3. Xác Nhận Mức Độ Tuân Thủ

- **Quy tắc cô lập source code (Rule 4.1):** 100% chỉ tác động vào `frontend/mobile/pt/js/clients.js` và `frontend/mobile/pt/js/app.js`.
- **Quy tắc cấm mock data hardcoded (Rule 5):** 100% dữ liệu nạp động từ PostgreSQL qua `apiClient`. Không có mảng tĩnh giả lập.
- **Tính toàn vẹn tài liệu:** Tuyệt đối không can thiệp hay sửa đổi file tài liệu `docs/epic/` và `docs/user-stories/`.
- **Mức độ tuân thủ Main Flow & Activity Diagram:** Đạt **100%**.
