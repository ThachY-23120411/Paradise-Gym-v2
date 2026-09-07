import { useState } from "react"
import {
  ActionButton,
  Field,
  Ic,
  Modal,
  Panel,
  SelectInput,
  TextArea,
  TextInput,
  palette,
} from "./ui"

export type ActionKind = "member-form" | "package-form" | "registration-form" | "payment-form" | "trainer-form" | "work-schedule" | "schedule-booking" | "schedule-change" | "session-result" | "manual-checkin" | "notification-form" | "contact-log" | "branch-form" | "account-permissions" | "device-settings" | "policy-settings" | "renewal-request" | "report-export"

type FieldSpec = {
  label: string
  required?: boolean
  hint?: string
  placeholder?: string
  value?: string
  kind?: "text" | "select" | "textarea" | "readonly" | "date" | "money"
  options?: string[]
}

type ActionConfig = {
  title: string
  trace: string
  intro: string
  steps: string[]
  fields: FieldSpec[]
  checks: string[]
  exceptions: string[]
  result: string
  primary: string
}

const ACTIONS: Record<ActionKind, ActionConfig> = {
  "member-form": {
    title: "Thêm / sửa hồ sơ hội viên",
    trace: "UX-F01 · W02 · QTV/LT",
    intro:
      "Tạo hồ sơ nhanh tại quầy, không bắt mua gói hoặc tạo tài khoản ngay.",
    steps: ["Nhận diện", "Liên hệ", "Bổ sung", "Kết quả"],
    fields: [
      {
        label: "Họ và tên",
        required: true,
        placeholder: "Ví dụ: Nguyễn Hoài Nam",
        hint: "Hỗ trợ dấu tiếng Việt, bỏ khoảng trắng thừa trước khi lưu.",
      },
      {
        label: "Số điện thoại",
        placeholder: "0908 111 222",
        hint: "Dùng để tìm và cảnh báo nghi trùng; không làm mất số 0 đầu.",
      },
      {
        label: "Email",
        placeholder: "name@example.vn",
        hint: "Chỉ kiểm tra định dạng khi có nhập.",
      },
      {
        label: "Chi nhánh tiếp nhận",
        kind: "readonly",
        value: "Chi nhánh Quận 1",
        hint: "Điền theo ca làm việc hiện tại.",
      },
      {
        label: "Ngày sinh",
        kind: "date",
        placeholder: "DD/MM/YYYY",
        hint: "Không mặc định hôm nay; dùng cho nhắc sinh nhật nếu hội viên đồng ý.",
      },
      {
        label: "Ghi chú vận hành",
        kind: "textarea",
        placeholder: "Thông tin phục vụ ngắn, không nhập dữ liệu nhạy cảm.",
      },
    ],
    checks: [
      "Nếu số liên hệ gần trùng, hiển thị hồ sơ gần khớp để mở đối chiếu.",
      "Sau khi lưu, sinh mã hội viên và giữ ngữ cảnh để đăng ký gói tiếp.",
      "Hồ sơ chưa có liên hệ vẫn tạo được; tài khoản mobile là bước riêng.",
    ],
    exceptions: [
      "Thiếu tên: giữ dữ liệu, focus tới tóm tắt lỗi.",
      "Mất kết nối: cho thử lại, không đóng form.",
      "Không tự xóa hồ sơ đã có giao dịch.",
    ],
    result: "Đã tạo hội viên HV-DEMO-001. Hồ sơ mở với nút Đăng ký gói.",
    primary: "Lưu hội viên",
  },
  "package-form": {
    title: "Tạo / sửa danh mục gói tập",
    trace: "UX-F02 · W03 · QTV",
    intro:
      "Thiết lập gói để lễ tân chọn đúng điều kiện, giá và phạm vi khi bán.",
    steps: ["Thông tin", "Quyền tập", "Giá", "Mở bán"],
    fields: [
      { label: "Tên gói", required: true, placeholder: "PT 10 buổi / 90 ngày" },
      { label: "Mã gói", kind: "readonly", value: "Hệ thống tự sinh" },
      {
        label: "Dịch vụ",
        required: true,
        kind: "select",
        options: ["Gym", "PT"],
      },
      {
        label: "Cách giới hạn",
        required: true,
        kind: "select",
        options: ["Theo thời gian", "Theo buổi", "Theo thời gian và buổi"],
      },
      {
        label: "Thời hạn",
        placeholder: "90 ngày",
        hint: "Bắt buộc nếu gói có hạn dùng.",
      },
      {
        label: "Tổng số buổi",
        placeholder: "10",
        hint: "Không dùng 0 để ngầm hiểu không giới hạn.",
      },
      {
        label: "Giá bán",
        required: true,
        kind: "money",
        placeholder: "2.000.000",
      },
      {
        label: "Chi nhánh áp dụng",
        required: true,
        kind: "select",
        options: ["Quận 1", "Bình Thạnh", "Cả hai chi nhánh"],
      },
      {
        label: "Trạng thái bán",
        required: true,
        kind: "select",
        options: ["Nháp", "Đang bán", "Ngừng bán"],
      },
      {
        label: "Mô tả quyền lợi",
        kind: "textarea",
        placeholder: "Nội dung ngắn hiển thị ở thẻ gói.",
      },
    ],
    checks: [
      "Thẻ xem trước hiển thị tên, giá, hạn/số buổi và phạm vi trước khi lưu.",
      "Gói đã bán giữ điều kiện tại thời điểm đăng ký.",
      "Ngừng bán không hủy gói hội viên đang dùng.",
    ],
    exceptions: [
      "Tên dễ nhầm trong cùng chi nhánh: cảnh báo trước khi mở bán.",
      "Đổi điều kiện ảnh hưởng lịch cũ: yêu cầu quy trình điều chỉnh riêng.",
    ],
    result: "Đã lưu phiên bản gói. Lần đăng ký sau dùng điều kiện mới.",
    primary: "Lưu gói tập",
  },
  "registration-form": {
    title: "Đăng ký / gia hạn gói",
    trace: "UX-F03 · W04 · QTV/LT web",
    intro:
      "Chọn đúng hội viên, gói, hiệu lực và số tiền trước khi chuyển sang thu.",
    steps: ["Hội viên", "Gói", "Hiệu lực", "Kiểm tra"],
    fields: [
      {
        label: "Hội viên",
        required: true,
        placeholder: "Tìm theo mã, tên hoặc số điện thoại",
        hint: "Mở từ hồ sơ thì điền sẵn và chỉ đọc.",
      },
      {
        label: "Kiểu nghiệp vụ",
        kind: "select",
        options: ["Mua mới", "Gia hạn gói hiện có"],
      },
      {
        label: "Gói đăng ký",
        required: true,
        kind: "select",
        options: [
          "Gói 1 tháng",
          "Gói 3 tháng",
          "Gói PT 10 buổi",
          "Gói PT 20 buổi",
        ],
      },
      {
        label: "Ngày bắt đầu",
        required: true,
        kind: "date",
        placeholder: "07/09/2026",
      },
      {
        label: "PT phụ trách",
        kind: "select",
        options: [
          "Chưa phân công",
          "Nguyễn Thành Long",
          "Phạm Văn Mạnh",
          "Lê Thị Ngọc",
        ],
        hint: "Chỉ có tác dụng với gói PT; chưa phân công thì chưa đặt lịch được.",
      },
      {
        label: "Giá gốc / tổng phải thu",
        kind: "readonly",
        value: "Tính từ gói đã chọn",
      },
      {
        label: "Giảm giá + lý do",
        placeholder: "Ẩn nếu chính sách chưa duyệt",
      },
      {
        label: "Ghi chú",
        kind: "textarea",
        placeholder: "Nhu cầu hoặc ngoại lệ đã được phép ghi nhận.",
      },
    ],
    checks: [
      "Hiển thị tên + mã hội viên, ngày hết hạn cụ thể và tổng phải thu.",
      "Nếu gói đổi giá trong lúc nhập, yêu cầu xem lại trước khi lưu.",
      "Sang thu tiền không nhập lại hội viên, gói hoặc số phải thu.",
    ],
    exceptions: [
      "Gói cũ còn hạn: hiện cảnh báo chồng gói.",
      "Còn nợ: nêu rõ gói đã/chưa có hiệu lực theo chính sách.",
      "Gia hạn từ yêu cầu mobile không tự kích hoạt cho đến khi quầy xử lý.",
    ],
    result: "Đã lưu đăng ký DK-DEMO-001 và mở bước ghi nhận thu tiền.",
    primary: "Lưu và chuyển thu tiền",
  },
  "payment-form": {
    title: "Ghi nhận thu tiền",
    trace: "UX-F04 · W08 hoặc sau W04 · QTV/LT web",
    intro:
      "Ghi đúng tiền thực nhận, tách trạng thái chờ đối soát và đã xác nhận.",
    steps: ["Nghĩa vụ", "Khoản thu", "Đối soát", "Phiếu"],
    fields: [
      {
        label: "Hội viên / đăng ký",
        required: true,
        placeholder: "Chọn đăng ký còn phải thu",
      },
      {
        label: "Phải thu / đã thu / còn thiếu",
        kind: "readonly",
        value: "3.800.000 / 3.300.000 / 500.000 đ",
      },
      {
        label: "Số thực thu",
        required: true,
        kind: "money",
        placeholder: "500.000",
      },
      {
        label: "Phương thức",
        required: true,
        kind: "select",
        options: ["Tiền mặt", "Chuyển khoản"],
      },
      {
        label: "Mã tham chiếu",
        placeholder: "Bắt buộc khi chuyển khoản đã xác nhận",
      },
      { label: "Ảnh chứng từ", placeholder: "JPG/PNG tối đa 5 MB" },
      {
        label: "Trạng thái xác nhận",
        kind: "select",
        options: ["Xác nhận đã thu", "Lưu chờ đối soát"],
      },
      {
        label: "Ghi chú / lý do ngoại lệ",
        kind: "textarea",
        placeholder: "Bắt buộc khi lùi thời điểm hoặc điều chỉnh.",
      },
    ],
    checks: [
      "Bước kiểm tra nêu tên/mã hội viên, gói, tiền, phương thức và còn thiếu sau thu.",
      "Chỉ sau xác nhận thành công mới hiện mã phiếu và nút xem/in.",
      "Ảnh chứng từ không tự đồng nghĩa đã nhận tiền.",
    ],
    exceptions: [
      "Bấm nhiều lần không tạo nhiều khoản thu.",
      "Hết thời gian chờ: hiển thị đang kiểm tra kết quả, không mời thu lại ngay.",
      "Không có nút xóa trực tiếp giao dịch đã xác nhận.",
    ],
    result: "Đã ghi nhận phiếu PT-DEMO-001. Còn thiếu sau thu: 0 đ.",
    primary: "Kiểm tra và ghi nhận",
  },
  "trainer-form": {
    title: "Hồ sơ huấn luyện viên",
    trace: "UX-F05 · W05 · QTV",
    intro:
      "Quản lý thông tin phục vụ phân công, không mở rộng sang hồ sơ nhân sự.",
    steps: ["Cơ bản", "Chi nhánh", "Chuyên môn", "Tài khoản"],
    fields: [
      {
        label: "Tên PT",
        required: true,
        placeholder: "Ví dụ: Nguyễn Thành Long",
      },
      { label: "Mã PT", kind: "readonly", value: "Hệ thống tự sinh" },
      {
        label: "Điện thoại hoặc email",
        placeholder: "Cần khi gửi lời mời tài khoản",
      },
      {
        label: "Chi nhánh làm việc",
        required: true,
        kind: "select",
        options: ["Quận 1", "Bình Thạnh"],
      },
      { label: "Chuyên môn", placeholder: "Cardio, Strength, Yoga..." },
      {
        label: "Trạng thái",
        required: true,
        kind: "select",
        options: ["Hoạt động", "Ngừng hoạt động"],
      },
      {
        label: "Giới thiệu ngắn",
        kind: "textarea",
        placeholder: "Thông tin giúp điều phối chọn PT phù hợp.",
      },
    ],
    checks: [
      "PT ngừng hoạt động không nhận lịch mới.",
      "Muốn tạo tài khoản thì mở form phân quyền có sẵn liên kết PT.",
      "Phân công hội viên thực hiện trong đăng ký/gia hạn gói PT.",
    ],
    exceptions: [
      "Không bỏ chi nhánh đang có lịch tương lai nếu chưa xử lý ảnh hưởng.",
      "Không thêm tính lương/hoa hồng vào phạm vi prototype này.",
    ],
    result: "Đã lưu hồ sơ PT-DEMO-001.",
    primary: "Lưu PT",
  },
  "work-schedule": {
    title: "Lịch làm việc PT",
    trace: "UX-F06 · PT01/W06 · PT/QTV",
    intro: "Tạo khung làm việc hoặc bận để hệ thống tìm giờ trống đúng.",
    steps: ["PT", "Khoảng ngày", "Giờ", "Xung đột"],
    fields: [
      {
        label: "PT / chi nhánh",
        required: true,
        kind: "select",
        options: [
          "Nguyễn Thành Long · Quận 1",
          "Phạm Văn Mạnh · Quận 1",
          "Lê Thị Ngọc · Bình Thạnh",
        ],
      },
      {
        label: "Ngày bắt đầu",
        required: true,
        kind: "date",
        placeholder: "09/09/2026",
      },
      { label: "Ngày kết thúc", kind: "date", placeholder: "30/09/2026" },
      { label: "Giờ bắt đầu", required: true, placeholder: "06:00" },
      { label: "Giờ kết thúc", required: true, placeholder: "12:00" },
      {
        label: "Lặp lại",
        kind: "select",
        options: ["Không lặp", "Thứ 2, 4, 6", "Cuối tuần"],
      },
      {
        label: "Loại khung",
        required: true,
        kind: "select",
        options: ["Làm việc", "Bận"],
      },
      { label: "Lý do bận", placeholder: "Không công khai với hội viên" },
    ],
    checks: [
      "Kết thúc phải sau bắt đầu và nằm trong giờ mở cửa chi nhánh.",
      "Xem trước các ngày được tạo khi bật lặp lại.",
      "Thay đổi lịch làm không tự hủy buổi đã đặt.",
    ],
    exceptions: [
      "Nếu có lịch đã đặt bị ảnh hưởng, hiển thị danh sách xung đột.",
      "Không ghi đè lịch cũ khi chưa xác nhận tác động.",
    ],
    result: "Đã lưu 6 khung làm việc, 1 khung cần xử lý xung đột.",
    primary: "Lưu lịch làm",
  },
  "schedule-booking": {
    title: "Đặt lịch PT",
    trace: "UX-F07 · W06/mobile LT/HV",
    intro: "Tìm giờ phù hợp và biết chắc lịch đã được đặt hay chưa.",
    steps: ["Gói", "PT/ngày", "Giờ", "Xác nhận"],
    fields: [
      {
        label: "Hội viên",
        required: true,
        placeholder: "HV002 · Trần Thị Bình",
      },
      {
        label: "Gói PT sử dụng",
        required: true,
        kind: "select",
        options: ["Gói PT 20 buổi · còn 3 buổi", "Gói PT 10 buổi · còn 5 buổi"],
      },
      {
        label: "Chi nhánh",
        required: true,
        kind: "select",
        options: ["Quận 1", "Bình Thạnh"],
      },
      {
        label: "PT",
        required: true,
        kind: "select",
        options: ["Nguyễn Thành Long", "Phạm Văn Mạnh", "Lê Thị Ngọc"],
      },
      {
        label: "Ngày tập",
        required: true,
        kind: "date",
        placeholder: "09/09/2026",
      },
      {
        label: "Khung giờ",
        required: true,
        kind: "select",
        options: ["09:00 - 10:00", "11:00 - 12:00", "16:00 - 17:00"],
      },
      {
        label: "Thời lượng",
        kind: "readonly",
        value: "60 phút theo cấu hình gói",
      },
      {
        label: "Ghi chú cho buổi",
        kind: "textarea",
        placeholder: "Ai được xem ghi chú này phải được thể hiện rõ.",
      },
    ],
    checks: [
      "Màn kiểm tra có ngày, giờ, chi nhánh, PT, gói và hạn hủy.",
      "Thành công có mã lịch và cập nhật lịch của HV/PT/LT.",
      "Buổi đã giữ chỗ không bị trừ hai lần khi ghi kết quả.",
    ],
    exceptions: [
      "Khung giờ vừa bị đặt: giữ PT/ngày/gói và gợi ý giờ khác.",
      "Gói hết buổi hoặc quá hạn: mở hướng dẫn gia hạn, không cho đặt.",
      "Chưa rõ kết quả sau gửi: tra cứu lịch trước khi đặt lại.",
    ],
    result: "Đã đặt lịch LICH-DEMO-001 lúc 09:00 ngày 09/09/2026.",
    primary: "Xác nhận đặt lịch",
  },
  "schedule-change": {
    title: "Đổi / hủy lịch PT",
    trace: "UX-F08 · W06/mobile LT/HV/PT",
    intro: "Thay đổi từ chi tiết buổi; không bắt xóa rồi đặt lại.",
    steps: ["Lịch cũ", "Chỗ mới", "Hậu quả", "Xác nhận"],
    fields: [
      {
        label: "Lịch cũ",
        kind: "readonly",
        value: "LICH-004 · 10:00 07/09 · Lê Thị Ngọc · Bùi Thị Hoa",
      },
      {
        label: "Thao tác",
        required: true,
        kind: "select",
        options: ["Đổi lịch", "Hủy lịch"],
      },
      { label: "Ngày mới", kind: "date", placeholder: "10/09/2026" },
      {
        label: "Khung giờ mới",
        kind: "select",
        options: ["08:00 - 09:00", "17:00 - 18:00"],
      },
      {
        label: "Lý do",
        kind: "textarea",
        placeholder: "Bắt buộc nếu vượt hạn hoặc nhân viên xử lý ngoại lệ.",
      },
      {
        label: "Hậu quả",
        kind: "readonly",
        value: "Trong hạn: giữ nguyên quyền buổi. Quá hạn cần quyền ngoại lệ.",
      },
    ],
    checks: [
      "Chỉ thay lịch cũ sau khi chỗ mới đã xác nhận.",
      "Nếu cập nhật thất bại, lịch cũ vẫn giữ nguyên.",
      "Quá hạn mà thiếu quyền: giải thích và cho liên hệ quầy.",
    ],
    exceptions: [
      "Không trừ buổi khi chỉ đổi lịch trong hạn.",
      "Hủy yêu cầu gia hạn không hủy đăng ký đã xử lý trước đó.",
    ],
    result: "Đã cập nhật lịch. Lịch cũ được thay bằng khung mới đã xác nhận.",
    primary: "Xác nhận thay đổi",
  },
  "session-result": {
    title: "Ghi nhận kết quả buổi PT",
    trace: "UX-F09 · PT01/QTV",
    intro:
      "PT ghi đúng buổi được phân công và thấy tác động số buổi trước khi lưu.",
    steps: ["Buổi tập", "Kết quả", "Tác động", "Lưu"],
    fields: [
      {
        label: "Buổi tập / học viên",
        kind: "readonly",
        value: "LICH-003 · 09:00 · Trần Thị Bình · PT 20 buổi",
      },
      {
        label: "Kết quả buổi",
        required: true,
        kind: "select",
        options: ["Hoàn thành", "Hội viên vắng", "Chưa diễn ra"],
      },
      {
        label: "Ghi chú buổi tập",
        kind: "textarea",
        placeholder: "Ghi rõ ghi chú nào là nội bộ, ghi chú nào HV được xem.",
      },
      {
        label: "Tác động số buổi",
        kind: "readonly",
        value: "Hoàn thành: trừ 1 buổi sau khi lưu thành công.",
      },
      {
        label: "Lý do sửa kết quả",
        placeholder: "Bắt buộc nếu sửa kết quả đã lưu.",
      },
    ],
    checks: [
      "Check-in vào gym không tự hoàn tất buổi PT.",
      "Gửi kết quả lặp lại không trừ buổi thêm lần nữa.",
      "PT chỉ ghi buổi của mình hoặc được phân công.",
    ],
    exceptions: [
      "Không cho chỉnh trực tiếp số buổi còn lại tại form này.",
      "Sửa kết quả đã lưu phải ghi trước/sau và người tác động.",
    ],
    result:
      "Đã ghi kết quả buổi PT. Số buổi còn lại được cập nhật theo chính sách.",
    primary: "Lưu kết quả",
  },
  "manual-checkin": {
    title: "Ghi nhận ra/vào thủ công",
    trace: "UX-F10 · W07/mobile LT",
    intro: "Hỗ trợ nhận diện thất bại mà không bỏ qua điều kiện tập.",
    steps: ["Hội viên", "Điểm vào", "Điều kiện", "Lý do"],
    fields: [
      {
        label: "Hội viên",
        required: true,
        placeholder: "Tìm mã, tên hoặc số điện thoại",
      },
      {
        label: "Chi nhánh / điểm vào",
        kind: "readonly",
        value: "Quận 1 · Gate-Q1-01",
      },
      {
        label: "Loại sự kiện",
        required: true,
        kind: "select",
        options: ["Vào", "Ra"],
      },
      {
        label: "Gói / điều kiện sử dụng",
        kind: "readonly",
        value: "Hệ thống kiểm tra hạn, buổi và chi nhánh",
      },
      {
        label: "Lý do thủ công",
        required: true,
        kind: "select",
        options: ["Thiết bị lỗi", "Không nhận diện", "Khác"],
      },
      {
        label: "Mô tả lý do khác",
        kind: "textarea",
        placeholder: "Bắt buộc khi chọn Khác.",
      },
      {
        label: "Phê duyệt ngoại lệ",
        placeholder: "Chỉ hiện nếu gói không đủ điều kiện.",
      },
    ],
    checks: [
      "Tách ghi nhật ký và lệnh mở cửa.",
      "Màn hình công cộng K01 không hiện số điện thoại hoặc công nợ.",
      "Thành công có mã nhật ký; mở cửa chỉ hiện khi thiết bị xác nhận.",
    ],
    exceptions: [
      "Không đủ quyền: gửi yêu cầu quản lý, không tự mở cửa.",
      "Không có hồ sơ: quay sang tiếp nhận, không tạo mã tạm tùy ý.",
      "Mất kết nối thiết bị: ghi trạng thái giả lập rõ ràng.",
    ],
    result: "Đã ghi nhật ký RV-DEMO-001. Trạng thái mở cửa: giả lập.",
    primary: "Ghi nhận thủ công",
  },
  "notification-form": {
    title: "Soạn / gửi nhắc",
    trace: "UX-F11 · W09/mobile LT",
    intro: "Chọn đúng đối tượng, nội dung mẫu và xem trước trước khi gửi.",
    steps: ["Lý do", "Người nhận", "Nội dung", "Gửi"],
    fields: [
      {
        label: "Lý do / loại nhắc",
        required: true,
        kind: "select",
        options: ["Sắp hết hạn", "Lịch PT", "Sinh nhật"],
      },
      {
        label: "Người nhận",
        required: true,
        placeholder: "Từ hồ sơ hoặc danh sách lọc",
      },
      {
        label: "Kênh gửi",
        required: true,
        kind: "select",
        options: ["Trong ứng dụng", "SMS/Zalo/Email chưa bật"],
      },
      {
        label: "Mẫu nội dung",
        required: true,
        kind: "select",
        options: ["Nhắc gia hạn", "Nhắc lịch PT", "Chúc sinh nhật riêng"],
      },
      {
        label: "Nội dung xem trước",
        kind: "textarea",
        placeholder: "Xin chào {{ten}}, gói {{goi}} sẽ hết hạn ngày {{ngay}}.",
      },
      {
        label: "Thời điểm gửi",
        kind: "select",
        options: ["Gửi ngay", "Hẹn giờ khi được duyệt"],
      },
    ],
    checks: [
      "Gửi nhiều người phải xem số lượng, tiêu chí lọc và người bị loại.",
      "Kết quả tách thành công, thất bại và bị bỏ qua.",
      "Không tạo nút SMS/Zalo thật khi chưa có tích hợp.",
    ],
    exceptions: [
      "Trùng nhắc: bỏ qua hoặc yêu cầu xác nhận.",
      "Người nhận thiếu kênh: đưa vào danh sách bị loại.",
      "Sinh nhật công khai tôn trọng tùy chọn riêng tư.",
    ],
    result:
      "Đã gửi nhắc trong ứng dụng cho 3 người, 1 người bị bỏ qua do thiếu điều kiện.",
    primary: "Xem trước và gửi",
  },
  "contact-log": {
    title: "Ghi nhận liên hệ chăm sóc",
    trace: "UX-F12 · W09/mobile LT",
    intro: "Gắn kết quả chăm sóc với đúng hồ sơ và việc cần xử lý.",
    steps: ["Việc cần xử lý", "Kênh", "Kết quả", "Theo dõi"],
    fields: [
      {
        label: "Hội viên / việc cần xử lý",
        kind: "readonly",
        value: "CS001 · Trần Thị Bình · Gia hạn gói",
      },
      {
        label: "Kênh liên hệ",
        required: true,
        kind: "select",
        options: ["Gọi điện", "Tại quầy", "Trong ứng dụng"],
      },
      {
        label: "Kết quả liên hệ",
        required: true,
        kind: "select",
        options: ["Đã trao đổi", "Chưa liên hệ được", "Cần theo dõi"],
      },
      {
        label: "Ngày liên hệ lại",
        kind: "date",
        placeholder: "Bắt buộc nếu cần theo dõi",
      },
      {
        label: "Ghi chú nội bộ",
        kind: "textarea",
        placeholder: "Không tự gửi ghi chú này cho hội viên.",
      },
    ],
    checks: [
      "Đã đọc, đã liên hệ và gửi thành công là các trạng thái khác nhau.",
      "Người ghi và thời điểm lấy từ tài khoản/giờ hệ thống.",
      "Mở từ danh sách hoặc hồ sơ đều giữ ngữ cảnh.",
    ],
    exceptions: [
      "Không lộ ghi chú nội bộ cho HV/PT.",
      "Không đánh dấu đã gửi chỉ vì lễ tân đã gọi điện.",
    ],
    result: "Đã ghi nhận liên hệ. Việc chăm sóc chuyển sang Cần theo dõi.",
    primary: "Lưu liên hệ",
  },
  "branch-form": {
    title: "Tạo / sửa chi nhánh",
    trace: "UX-F13 · W11 · QTV",
    intro:
      "Quản lý thông tin vận hành và phạm vi áp dụng dữ liệu theo chi nhánh.",
    steps: ["Định danh", "Liên hệ", "Giờ mở", "Ảnh hưởng"],
    fields: [
      { label: "Mã chi nhánh", required: true, placeholder: "CN03" },
      {
        label: "Tên chi nhánh",
        required: true,
        placeholder: "Chi nhánh Thủ Đức",
      },
      {
        label: "Địa chỉ",
        required: true,
        placeholder: "Địa chỉ văn bản dễ hiểu",
      },
      { label: "Liên hệ công khai", placeholder: "Điện thoại hoặc email" },
      {
        label: "Giờ mở / đóng cửa",
        required: true,
        placeholder: "06:00 - 22:00",
      },
      { label: "Múi giờ", kind: "readonly", value: "Asia/Ho_Chi_Minh" },
      {
        label: "Trạng thái",
        required: true,
        kind: "select",
        options: ["Nháp", "Hoạt động", "Ngừng hoạt động"],
      },
    ],
    checks: [
      "Thay đổi giờ mở kiểm tra lịch hiện hữu.",
      "Ngừng hoạt động cho thấy lịch/gói bị ảnh hưởng.",
      "Không xóa chi nhánh đang có dữ liệu nghiệp vụ.",
    ],
    exceptions: [
      "Quản lý chi nhánh không mặc định được thêm chi nhánh mới.",
      "Không tự đổi mã chi nhánh đã có lịch sử.",
    ],
    result: "Đã lưu thông tin chi nhánh, 2 lịch cần xem lại do đổi giờ mở.",
    primary: "Lưu chi nhánh",
  },
  "account-permissions": {
    title: "Tài khoản và phân quyền",
    trace: "UX-F14 · W12 · quản lý tài khoản",
    intro:
      "Cấp đúng người, đúng vai trò, đúng phạm vi; tránh lộ quyền quản trị.",
    steps: ["Tài khoản", "Liên kết", "Vai trò", "Xem trước quyền"],
    fields: [
      { label: "Tên hiển thị", required: true, placeholder: "Lê Thị Thanh Hà" },
      {
        label: "Định danh đăng nhập",
        required: true,
        placeholder: "email hoặc số điện thoại đã duyệt",
      },
      {
        label: "Hồ sơ liên kết",
        placeholder: "PT001 hoặc HV001 khi vai trò yêu cầu",
      },
      {
        label: "Vai trò",
        required: true,
        kind: "select",
        options: ["Lễ tân", "PT", "Hội viên", "Quản trị viên"],
      },
      {
        label: "Chi nhánh / phạm vi",
        kind: "select",
        options: ["Quận 1", "Bình Thạnh", "Toàn bộ được cấp"],
      },
      {
        label: "Quyền nhạy cảm",
        kind: "select",
        options: [
          "Theo mẫu vai trò",
          "Có quyền thu tiền",
          "Có quyền báo cáo",
          "Có quyền ngoại lệ",
        ],
      },
      {
        label: "Trạng thái tài khoản",
        kind: "select",
        options: ["Chờ kích hoạt", "Đang hoạt động", "Đã khóa"],
      },
      {
        label: "Lý do thay quyền/khóa",
        kind: "textarea",
        placeholder: "Bắt buộc khi sửa quyền nhạy cảm hoặc khóa.",
      },
    ],
    checks: [
      "Bản xem trước nêu menu được thấy, dữ liệu được đọc và thao tác được làm.",
      "Không yêu cầu quản trị viên nhập hoặc nhìn mật khẩu người dùng.",
      "Tài khoản nhiều vai trò chỉ chuyển giữa vai trò được cấp.",
    ],
    exceptions: [
      "Không tự nâng quyền từ hồ sơ cá nhân.",
      "Không khóa nhầm tài khoản quản trị cuối cùng.",
      "Tài khoản HV không có ô xem tất cả chi nhánh.",
    ],
    result: "Đã gửi lời mời kích hoạt. Quyền hiệu lực được ghi vào nhật ký.",
    primary: "Xem trước quyền",
  },
  "device-settings": {
    title: "Thiết bị và kết nối",
    trace: "UX-F15 · W12 · QTV",
    intro:
      "Quản lý nguồn sự kiện ra/vào, trạng thái kết nối và điểm lắp theo chi nhánh.",
    steps: ["Thiết bị", "Điểm lắp", "Kết nối", "Đồng bộ"],
    fields: [
      { label: "Tên / mã thiết bị", required: true, placeholder: "Gate-Q1-01" },
      {
        label: "Chi nhánh / điểm lắp",
        required: true,
        kind: "select",
        options: ["Quận 1 · Cổng chính", "Bình Thạnh · Cổng chính"],
      },
      {
        label: "Loại thiết bị",
        required: true,
        kind: "select",
        options: ["Máy nhận diện", "Khóa cửa", "Máy in"],
      },
      {
        label: "Thông số kết nối",
        placeholder: "Chỉ hiện khi loại thiết bị cần cấu hình",
      },
      {
        label: "Thông tin xác thực",
        placeholder: "Được che nội dung sau khi lưu",
      },
      {
        label: "Kết nối / lần đồng bộ",
        kind: "readonly",
        value: "Online · đồng bộ 09:43 hôm nay",
      },
    ],
    checks: [
      "Cảnh báo mã thiết bị trùng.",
      "Nút kiểm tra kết nối có trạng thái đang chạy, thành công hoặc lỗi.",
      "Không đặt khóa thật trong prototype.",
    ],
    exceptions: [
      "Thiết bị không ở ngữ cảnh toàn chuỗi.",
      "Chưa chốt tích hợp thì không bắt mọi trường kỹ thuật.",
    ],
    result: "Kiểm tra kết nối thành công. Sự kiện mới sẽ gắn với Gate-Q1-01.",
    primary: "Kiểm tra kết nối",
  },
  "policy-settings": {
    title: "Cấu hình chính sách",
    trace: "UX-F16 · W12 · QTV",
    intro:
      "Chia chính sách thành các form ngắn có lưu riêng và xem trước tác động.",
    steps: ["Nhắc hạn", "Lịch", "Công nợ", "Riêng tư"],
    fields: [
      { label: "Nhắc trước hết hạn", required: true, placeholder: "7 ngày" },
      {
        label: "Hạn hủy/đổi lịch",
        required: true,
        placeholder: "6 giờ trước buổi",
      },
      {
        label: "Quy tắc giữ/trừ/hoàn buổi",
        required: true,
        kind: "select",
        options: [
          "Trừ khi hoàn thành",
          "Giữ chỗ khi đặt",
          "Theo duyệt thủ công",
        ],
      },
      {
        label: "Kích hoạt khi còn nợ",
        required: true,
        kind: "select",
        options: [
          "Không kích hoạt",
          "Kích hoạt khi thu một phần",
          "Theo quản lý duyệt",
        ],
      },
      {
        label: "Chào mừng/sinh nhật K01",
        required: true,
        kind: "select",
        options: ["Tắt mặc định", "Bật khi HV đồng ý", "Chỉ lời chào chung"],
      },
      {
        label: "Hiệu lực thay đổi / lý do",
        kind: "textarea",
        placeholder: "Nêu phạm vi mới/cũ và thời điểm áp dụng.",
      },
    ],
    checks: [
      "Không lưu ngầm tất cả khi đổi một công tắc.",
      "Giá trị mẫu gắn nhãn giả định demo.",
      "Thay đổi nhạy cảm phải xem trước và xác nhận.",
    ],
    exceptions: [
      "Không cho công thức tự do nếu chưa có kiểm tra.",
      "Cấu hình toàn hệ thống không ghi đè quyền riêng tư của HV.",
    ],
    result: "Đã lưu chính sách nhắc hạn. Các lịch hiện hữu không bị đổi ngầm.",
    primary: "Xem trước thay đổi",
  },
  "renewal-request": {
    title: "Hội viên yêu cầu gia hạn",
    trace: "UX-F19 · HV03 mobile",
    intro:
      "Gửi yêu cầu cho quầy xử lý mà không khiến hội viên hiểu nhầm đã mua gói.",
    steps: ["Gói hiện tại", "Mong muốn", "Liên hệ", "Gửi"],
    fields: [
      {
        label: "Hội viên / gói hiện tại",
        kind: "readonly",
        value: "HV002 · Gói PT 20 buổi · hết hạn 20/09/2026",
      },
      {
        label: "Gói muốn gia hạn",
        required: true,
        kind: "select",
        options: ["Gói PT 20 buổi", "Gói PT 10 buổi", "Nhờ quầy tư vấn"],
      },
      {
        label: "Ngày mong muốn bắt đầu",
        kind: "date",
        placeholder: "Dự kiến 21/09/2026",
      },
      {
        label: "Kênh liên hệ phản hồi",
        kind: "select",
        options: ["Thông báo trong ứng dụng", "Gọi điện", "Email"],
      },
      {
        label: "Giá tham khảo",
        kind: "readonly",
        value: "3.800.000 đ · cần quầy xác nhận",
      },
      {
        label: "Ghi chú",
        kind: "textarea",
        placeholder:
          "Tối đa 500 ký tự, không nhập thông tin thanh toán nhạy cảm.",
      },
    ],
    checks: [
      "Thành công có mã và trạng thái Chờ quầy xử lý.",
      "Gói hiện tại chưa thay đổi sau khi gửi yêu cầu.",
      "Yêu cầu xuất hiện trong W04 của lễ tân.",
    ],
    exceptions: [
      "Đã có yêu cầu đang mở: mở yêu cầu cũ, không tạo thêm.",
      "Hủy yêu cầu không hủy đăng ký/gói đã xử lý.",
    ],
    result: "Đã gửi yêu cầu REQ-DEMO-001. Gói hiện tại chưa thay đổi.",
    primary: "Gửi yêu cầu gia hạn",
  },
  "report-export": {
    title: "Bộ lọc và xuất báo cáo",
    trace: "UX-R01 · W10 · QTV",
    intro:
      "Xuất đúng tập dữ liệu đang xem, đúng quyền và đúng định nghĩa chỉ số.",
    steps: ["Loại báo cáo", "Kỳ", "Chi nhánh", "Xuất"],
    fields: [
      {
        label: "Loại báo cáo",
        required: true,
        kind: "select",
        options: ["Tiền thực thu", "Gói tập", "Ra/vào", "Hoạt động PT"],
      },
      {
        label: "Từ ngày",
        required: true,
        kind: "date",
        placeholder: "01/09/2026",
      },
      {
        label: "Đến ngày",
        required: true,
        kind: "date",
        placeholder: "07/09/2026",
      },
      {
        label: "Chi nhánh",
        required: true,
        kind: "select",
        options: ["Toàn bộ chi nhánh được cấp", "Quận 1", "Bình Thạnh"],
      },
      {
        label: "Bộ lọc phụ",
        kind: "select",
        options: ["Tất cả trạng thái", "Đã xác nhận", "Chờ đối soát"],
      },
      { label: "Định dạng xuất", kind: "select", options: ["CSV", "XLSX mẫu"] },
      {
        label: "Phạm vi xuất",
        kind: "readonly",
        value: "37 dòng · 8 cột · theo bộ lọc hiện tại",
      },
    ],
    checks: [
      "Đổi bộ lọc rồi xuất dùng đúng tập dữ liệu mới.",
      "Phân biệt tiền thực thu, giá trị gói đã bán và khoản còn phải thu.",
      "Dữ liệu cá nhân không tự thêm vào file.",
    ],
    exceptions: [
      "Đang tải hoặc dữ liệu cũ không trình bày như số mới.",
      "Dữ liệu trống phải khác lỗi tải.",
    ],
    result: "Đã tạo file xuất mẫu theo bộ lọc hiện tại.",
    primary: "Xuất báo cáo",
  },
}

function renderField(field: FieldSpec) {
  if (field.kind === "select") {
    return (
      <SelectInput options={field.options ?? []} defaultValue={field.value} />
    )
  }
  if (field.kind === "textarea") {
    return (
      <TextArea placeholder={field.placeholder} defaultValue={field.value} />
    )
  }
  if (field.kind === "readonly") {
    return <TextInput defaultValue={field.value} readOnly />
  }
  return (
    <TextInput
      placeholder={field.placeholder}
      defaultValue={field.value}
      type={field.kind === "date" ? "text" : "text"}
    />
  )
}

export function ActionModal({
  action,
  onClose,
}: {
  action: ActionKind | null
  onClose: () => void
}) {
  const [phase, setPhase] = useState<"idle" | "saving" | "success">("idle")

  if (!action) return null

  const config = ACTIONS[action]
  const submit = () => {
    setPhase("saving")
    window.setTimeout(() => setPhase("success"), 500)
  }

  return (
    <Modal
      title={config.title}
      subtitle={`${config.trace} · ${config.intro}`}
      onClose={onClose}
    >
      {phase === "success" ? (
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <Panel>
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "rgba(16,185,129,0.14)",
                  color: palette.green,
                }}
              >
                <Ic k="check" size={20} />
              </div>
              <div>
                <div className="text-[15px] font-bold text-white">
                  Hoàn tất thao tác
                </div>
                <p
                  className="mt-1 text-[12px] leading-relaxed"
                  style={{ color: palette.muted }}
                >
                  {config.result}
                </p>
              </div>
            </div>
          </Panel>
          <Panel title="Bước tiếp theo">
            <div
              className="space-y-2 text-[12px]"
              style={{ color: palette.muted }}
            >
              {config.checks.slice(0, 3).map((item) => (
                <div key={item} className="flex gap-2">
                  <Ic
                    k="check"
                    size={14}
                    cls="mt-0.5 shrink-0"
                    style={{ color: palette.green }}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <ActionButton
                onClick={() => setPhase("idle")}
                variant="secondary"
              >
                Xem lại form
              </ActionButton>
              <ActionButton onClick={onClose}>Đóng</ActionButton>
            </div>
          </Panel>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="grid gap-4 lg:grid-cols-[1fr_280px]"
        >
          <div className="space-y-4">
            <Panel>
              <div className="flex flex-wrap gap-2">
                {config.steps.map((step, index) => (
                  <span
                    key={step}
                    className="inline-flex min-h-8 items-center rounded-full border px-3 text-[11px] font-semibold"
                    style={{
                      borderColor:
                        index === 0 ? "rgba(249,115,22,0.35)" : palette.border,
                      color: index === 0 ? palette.orange : palette.dim,
                      background:
                        index === 0
                          ? "rgba(249,115,22,0.1)"
                          : "rgba(255,255,255,0.03)",
                    }}
                  >
                    {index + 1}. {step}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel>
              <div className="grid gap-4 md:grid-cols-2">
                {config.fields.map((field) => (
                  <Field
                    key={field.label}
                    label={field.label}
                    required={field.required}
                    hint={field.hint}
                  >
                    {renderField(field)}
                  </Field>
                ))}
              </div>
            </Panel>
          </div>

          <aside className="space-y-4">
            <Panel title="Kiểm tra trước khi lưu">
              <div
                className="space-y-2 text-[12px]"
                style={{ color: palette.muted }}
              >
                {config.checks.map((item) => (
                  <div key={item} className="flex gap-2">
                    <Ic
                      k="check"
                      size={14}
                      cls="mt-0.5 shrink-0"
                      style={{ color: palette.green }}
                    />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Ngoại lệ cần xử lý">
              <div
                className="space-y-2 text-[12px]"
                style={{ color: palette.muted }}
              >
                {config.exceptions.map((item) => (
                  <div key={item} className="flex gap-2">
                    <Ic
                      k="warn"
                      size={14}
                      cls="mt-0.5 shrink-0"
                      style={{ color: palette.amber }}
                    />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </Panel>

            <div className="flex gap-2">
              <ActionButton type="submit" block disabled={phase === "saving"}>
                {phase === "saving" ? "Đang lưu..." : config.primary}
              </ActionButton>
              <ActionButton onClick={onClose} variant="secondary">
                Hủy
              </ActionButton>
            </div>
          </aside>
        </form>
      )}
    </Modal>
  )
}
