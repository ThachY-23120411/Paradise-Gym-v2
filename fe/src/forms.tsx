import { useState, useRef, useEffect } from "react"
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

export type ActionKind =
  | "member-form"
  | "member-create"
  | "member-update"
  | "member-status"
  | "package-form"
  | "package-create"
  | "package-update"
  | "registration-create"
  | "registration-renew"
  | "registration-form"
  | "payment-form"
  | "bank-transfer-payment"
  | "payment-adjustment"
  | "trainer-form"
  | "work-schedule"
  | "schedule-booking"
  | "schedule-change"
  | "session-result"
  | "manual-checkin"
  | "notification-form"
  | "contact-log"
  | "branch-form"
  | "account-permissions"
  | "member-preferences"
  | "duplicate-resolve"
  | "device-settings"
  | "policy-settings"
  | "renewal-request"
  | "report-export"

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
  "registration-create": {
    title: "Tạo đăng ký gói mới",
    trace: "UX-F03 · W04 · QTV/LT web",
    intro:
      "Tạo lượt đăng ký mới cho hội viên. Chi nhánh bán tự động lấy theo chi nhánh làm việc hiện tại.",
    steps: ["Hội viên", "Chọn gói đăng ký", "Thời hạn [AUTO]", "Xác nhận & Thu tiền"],
    fields: [
      {
        label: "Hội viên",
        required: true,
        placeholder: "Nguyễn Văn An (HV001)",
        hint: "Mở từ hồ sơ hội viên thì điền sẵn và khóa chỉnh sửa.",
      },
      {
        label: "Chi nhánh bán",
        kind: "readonly",
        value: "Chi nhánh Quận 1 (Tự động lấy theo chi nhánh hiện tại)",
      },
      {
        label: "Gói đăng ký",
        required: true,
        kind: "select",
        options: [
          "Gói 1 tháng (Gym - 500.000đ)",
          "Gói 3 tháng (Gym - 1.350.000đ)",
          "Gói 6 tháng (Gym - 2.400.000đ)",
          "Gói 1 năm (Gym - 4.200.000đ)",
          "Gói PT 10 buổi (PT - 2.000.000đ)",
          "Gói PT 20 buổi (PT - 3.800.000đ)",
          "Combo Gym 3 tháng + PT 10 buổi (3.200.000đ)",
        ],
      },
      {
        label: "Ngày bắt đầu",
        required: true,
        kind: "date",
        placeholder: "10/09/2026",
      },
      {
        label: "Ngày kết thúc dự kiến [AUTO]",
        kind: "readonly",
        value: "10/12/2026 (Tự động tính theo thời hạn gói)",
      },
      {
        label: "PT phụ trách",
        kind: "readonly",
        value: "🔒 Chưa phân công (Gửi Yêu cầu chọn PT sau khi thu tiền 100%)",
        hint: "E02-US02: Đăng ký hoãn phân công PT. Sau khi thu đủ 100%, hội viên chọn PT và gửi Yêu cầu phân công.",
      },
      {
        label: "Giá gốc hiện hành",
        kind: "readonly",
        value: "Tự động lấy theo bảng giá niêm yết hiện tại",
      },
      {
        label: "Chính sách giảm giá",
        kind: "select",
        options: [
          "Không giảm giá",
          "Chính sách hợp lệ (-10%)",
          "Gửi QTV duyệt ngoài chính sách (-15%)",
        ],
      },
      {
        label: "Ghi chú đăng ký",
        kind: "textarea",
        placeholder: "Ghi chú yêu cầu đặc biệt của hội viên...",
      },
    ],
    checks: [
      "Chi nhánh bán tự động khóa theo chi nhánh làm việc.",
      "Tự động tính ngày kết thúc, giá gốc và quyền lợi snapshot.",
      "Tạo đăng ký thành công với status ban đầu là PENDING_PAYMENT.",
      "Tự động chuyển ngay sang bước thu tiền sau khi xác nhận.",
    ],
    exceptions: [
      "Gói chưa thu đủ 100% tiền sẽ không được phép Check-in hoặc đặt lịch PT.",
      "Gói PT/Combo: PT phụ trách ban đầu để trống, phân công sau khi thu đủ tiền.",
    ],
    result: "Đã tạo đăng ký mới DK012 (Trạng thái: PENDING_PAYMENT) và mở bước thu tiền.",
    primary: "Xác nhận tạo đăng ký & Chuyển thu tiền",
  },
  "registration-renew": {
    title: "Gia hạn đăng ký gói",
    trace: "UX-F03-RENEW · W04 · QTV/LT web",
    intro:
      "Tạo lượt gia hạn nối tiếp hợp đồng cũ. Ngày bắt đầu tự động bằng ngày sau end_date gói hiện tại.",
    steps: ["Hợp đồng cũ", "Chọn gói gia hạn", "Thời hạn nối tiếp [AUTO]", "Chuyển thu tiền"],
    fields: [
      {
        label: "Gia hạn từ hợp đồng cũ",
        kind: "readonly",
        value: "DK001 (Hợp đồng đang xem)",
      },
      {
        label: "Hội viên gia hạn",
        kind: "readonly",
        value: "Nguyễn Văn An (HV001) · SĐT: 0901234567 [Read-only]",
      },
      {
        label: "Chi nhánh bán",
        kind: "readonly",
        value: "Chi nhánh Quận 1 (Tự động lấy theo active branch)",
      },
      {
        label: "Gói hiện tại hết hạn ngày",
        kind: "readonly",
        value: "15/10/2026 (End date hợp đồng DK001)",
      },
      {
        label: "Gói gia hạn (Chọn gói hiện hành)",
        required: true,
        kind: "select",
        options: [
          "Gói 3 tháng (Gym - 1.350.000đ) [Prefilled]",
          "Gói 6 tháng (Gym - 2.400.000đ)",
          "Gói 1 năm (Gym - 4.200.000đ)",
          "Combo Gym 3 tháng + PT 10 buổi (3.200.000đ)",
        ],
        hint: "Tự động prefill gói cũ nếu gói còn được phép bán.",
      },
      {
        label: "Ngày bắt đầu mới [AUTO]",
        kind: "readonly",
        value: "16/10/2026 (Tự động = Ngày hết hạn cũ + 1 ngày)",
      },
      {
        label: "Ngày kết thúc mới [AUTO]",
        kind: "readonly",
        value: "16/01/2027 (Tự động tính theo thời hạn gói mới)",
      },
      {
        label: "Giá niêm yết hiện hành",
        kind: "readonly",
        value: "1.350.000 đ (Giá thời điểm gia hạn, không lấy giá cũ)",
      },
      {
        label: "PT phụ trách gia hạn",
        kind: "readonly",
        value: "🔒 Chưa phân công (Gửi Yêu cầu chọn PT sau khi thu tiền 100%)",
        hint: "Gia hạn gói PT/Combo hoãn chọn PT tới khi thu tiền 100%.",
      },
      {
        label: "Chính sách giảm giá",
        kind: "select",
        options: [
          "Không giảm giá",
          "Giảm giá gia hạn hội viên thân thiết (-5%)",
          "Chính sách khuyến mãi tháng",
        ],
      },
    ],
    checks: [
      "Tự động khóa Hội viên, Mã hợp đồng cũ và Chi nhánh bán.",
      "Tự động tính ngày bắt đầu mới = end_date cũ + 1 ngày.",
      "Giá và chính sách lấy theo thời điểm gia hạn hiện tại.",
      "Tạo đăng ký mới DK012 có renewedFrom = DK001 và status PENDING_PAYMENT.",
    ],
    exceptions: [
      "Gói gia hạn không cộng gộp số buổi PT của gói cũ vào gói mới.",
      "Gói PT/Combo: PT phụ trách ban đầu để trống, phân công sau khi thu đủ tiền.",
    ],
    result: "Đã tạo đăng ký gia hạn mới nối tiếp hợp đồng cũ DK001 (Trạng thái: PENDING_PAYMENT) và mở bước thu tiền.",
    primary: "Xác nhận gia hạn & Chuyển thu tiền",
  },
  "member-create": {
    title: "Thêm mới hồ sơ hội viên",
    trace: "UX-F01 · E01-US01 · QTV/LT",
    intro:
      "Tạo hồ sơ hội viên mới tại quầy. Nhập họ tên và số điện thoại để bắt đầu.",
    steps: ["Nhận diện", "Liên hệ", "Consent", "Kết quả"],
    fields: [
      {
        label: "Họ và tên",
        required: true,
        placeholder: "Ví dụ: Nguyễn Hoài Nam",
        hint: "Hỗ trợ dấu tiếng Việt, bỏ khoảng trắng thừa trước khi lưu.",
      },
      {
        label: "Mã hội viên",
        kind: "readonly",
        value: "(Tự động sinh)",
        hint: "Mã hội viên được hệ thống tự động sinh sau khi lưu thành công.",
      },
      {
        label: "Số điện thoại",
        required: true,
        placeholder: "Ví dụ: 0908 111 222",
        hint: "Dùng để tìm kiếm và cảnh báo trùng lặp hồ sơ; giữ nguyên số 0 đầu.",
      },
      {
        label: "Email",
        placeholder: "name@example.vn",
        hint: "Chỉ kiểm tra định dạng khi có nhập.",
      },
      {
        label: "Chi nhánh tiếp nhận",
        required: true,
        kind: "readonly",
        value: "Chi nhánh Quận 1",
        hint: "Trường cố định: Theo chi nhánh của tài khoản thao tác.",
      },
      {
        label: "Ngày sinh",
        kind: "date",
        placeholder: "DD/MM/YYYY",
        hint: "Không mặc định hôm nay; dùng cho nhắc sinh nhật nếu hội viên đồng ý.",
      },
      {
        label: "Ảnh hồ sơ",
        placeholder: "Chọn ảnh đại diện nếu khách đồng ý",
        hint: "Ảnh hồ sơ không tự trở thành dữ liệu nhận diện.",
      },
      {
        label: "Trạng thái hồ sơ",
        kind: "readonly",
        value: "Đang hoạt động",
        hint: "Hồ sơ mới mặc định ở trạng thái Đang hoạt động.",
      },
      {
        label: "Ghi chú vận hành",
        kind: "textarea",
        placeholder: "Thông tin phục vụ ngắn, không nhập dữ liệu nhạy cảm.",
      },
    ],
    checks: [
      "Nếu số liên hệ trùng hoặc gần trùng, hệ thống chuyển sang màn hình Xử lý nghi trùng.",
      "Sau khi lưu thành công, sinh mã hội viên mới và mở ngữ cảnh đăng ký gói.",
      "Hồ sơ chưa có email, ngày sinh hoặc ảnh vẫn tạo được.",
    ],
    exceptions: [
      "Thiếu tên, số điện thoại hoặc chi nhánh: giữ dữ liệu và báo lỗi.",
      "Mất kết nối: cho thử lại, không đóng form.",
    ],
    result: "Đã tạo mới hội viên HV003 thành công.",
    primary: "Thêm hội viên",
  },
  "member-update": {
    title: "Cập nhật hồ sơ hội viên",
    trace: "UX-F01-EDIT · E01-US02 · QTV/LT",
    intro:
      "Chỉnh sửa thông tin hồ sơ hội viên hiện có trên hệ thống.",
    steps: ["Nhận diện", "Liên hệ", "Consent", "Kết quả"],
    fields: [
      {
        label: "Mã hội viên",
        kind: "readonly",
        value: "HV001",
        hint: "Trường bắt buộc cố định: Không thể thay đổi mã hội viên đã cấp.",
      },
      {
        label: "Họ và tên",
        required: true,
        value: "Nguyễn Hoài Nam",
        placeholder: "Ví dụ: Nguyễn Hoài Nam",
        hint: "Hỗ trợ dấu tiếng Việt, bỏ khoảng trắng thừa trước khi lưu.",
      },
      {
        label: "Số điện thoại",
        required: true,
        value: "0908 111 222",
        placeholder: "0908 111 222",
        hint: "Dùng để tìm và cảnh báo nghi trùng; không làm mất số 0 đầu.",
      },
      {
        label: "Email",
        value: "nam.nguyen@example.vn",
        placeholder: "name@example.vn",
        hint: "Chỉ kiểm tra định dạng khi có nhập.",
      },
      {
        label: "Chi nhánh tiếp nhận",
        required: true,
        kind: "readonly",
        value: "Chi nhánh Quận 1",
        hint: "Trường bắt buộc cố định: Không thể thay đổi chi nhánh khởi tạo.",
      },
      {
        label: "Ngày sinh",
        kind: "date",
        value: "15/05/1990",
        placeholder: "DD/MM/YYYY",
        hint: "Không mặc định hôm nay; dùng cho nhắc sinh nhật nếu hội viên đồng ý.",
      },
      {
        label: "Ảnh hồ sơ",
        placeholder: "Chọn ảnh đại diện mới...",
        hint: "Ảnh hồ sơ không tự trở thành dữ liệu nhận diện.",
      },
      {
        label: "Trạng thái hồ sơ",
        kind: "readonly",
        value: "Đang hoạt động",
        hint: "Trường bắt buộc cố định: Phải dùng tính năng 'Thay đổi trạng thái' để cập nhật.",
      },
      {
        label: "Ghi chú vận hành",
        kind: "textarea",
        value: "Khách ưu tiên tập khung giờ sáng.",
        placeholder: "Thông tin phục vụ ngắn, không nhập dữ liệu nhạy cảm.",
      },
    ],
    checks: [
      "Kiểm tra và cảnh báo nếu thay đổi SĐT trùng với hội viên khác.",
      "Lưu lịch sử thay đổi thông tin hội viên.",
    ],
    exceptions: [
      "Không cho phép sửa các trường bắt buộc cố định: Mã hội viên, Chi nhánh, Trạng thái.",
    ],
    result: "Đã cập nhật thông tin hội viên HV001 thành công.",
    primary: "Cập nhật hồ sơ",
  },
  "member-form": {
    title: "Thêm mới hồ sơ hội viên",
    trace: "UX-F01 · E01-US01 · QTV/LT",
    intro:
      "Tạo hồ sơ hội viên mới tại quầy. Nhập họ tên và số điện thoại để bắt đầu.",
    steps: ["Nhận diện", "Liên hệ", "Consent", "Kết quả"],
    fields: [
      {
        label: "Họ và tên",
        required: true,
        placeholder: "Ví dụ: Nguyễn Hoài Nam",
        hint: "Hỗ trợ dấu tiếng Việt, bỏ khoảng trắng thừa trước khi lưu.",
      },
      {
        label: "Mã hội viên",
        kind: "readonly",
        value: "(Tự động sinh)",
        hint: "Mã hội viên được hệ thống tự động sinh sau khi lưu thành công.",
      },
      {
        label: "Số điện thoại",
        required: true,
        placeholder: "Ví dụ: 0908 111 222",
        hint: "Dùng để tìm kiếm và cảnh báo trùng lặp hồ sơ; giữ nguyên số 0 đầu.",
      },
      {
        label: "Email",
        placeholder: "name@example.vn",
        hint: "Chỉ kiểm tra định dạng khi có nhập.",
      },
      {
        label: "Chi nhánh tiếp nhận",
        required: true,
        kind: "readonly",
        value: "Chi nhánh Quận 1",
        hint: "Trường cố định: Theo chi nhánh của tài khoản thao tác.",
      },
      {
        label: "Ngày sinh",
        kind: "date",
        placeholder: "DD/MM/YYYY",
        hint: "Không mặc định hôm nay; dùng cho nhắc sinh nhật nếu hội viên đồng ý.",
      },
      {
        label: "Ảnh hồ sơ",
        placeholder: "Chọn ảnh đại diện nếu khách đồng ý",
        hint: "Ảnh hồ sơ không tự trở thành dữ liệu nhận diện.",
      },
      {
        label: "Trạng thái hồ sơ",
        kind: "readonly",
        value: "Đang hoạt động",
        hint: "Hồ sơ mới mặc định ở trạng thái Đang hoạt động.",
      },
      {
        label: "Ghi chú vận hành",
        kind: "textarea",
        placeholder: "Thông tin phục vụ ngắn, không nhập dữ liệu nhạy cảm.",
      },
    ],
    checks: [
      "Nếu số liên hệ trùng hoặc gần trùng, hệ thống chuyển sang màn hình Xử lý nghi trùng.",
      "Sau khi lưu thành công, sinh mã hội viên mới và mở ngữ cảnh đăng ký gói.",
      "Hồ sơ chưa có email, ngày sinh hoặc ảnh vẫn tạo được.",
    ],
    exceptions: [
      "Thiếu tên, số điện thoại hoặc chi nhánh: giữ dữ liệu và báo lỗi.",
      "Mất kết nối: cho thử lại, không đóng form.",
    ],
    result: "Đã tạo mới hội viên HV003 thành công.",
    primary: "Thêm hội viên",
  },
  "member-status": {
    title: "Thay đổi trạng thái hồ sơ hội viên",
    trace: "UX-F01-STATUS · W02 · QTV/LT theo quyền",
    intro:
      "Đổi trạng thái hồ sơ mà không thay đổi hiệu lực gói, công nợ hoặc số buổi.",
    steps: ["Đối tượng", "Trạng thái mới", "Lý do", "Xác nhận"],
    fields: [
      {
        label: "Hội viên",
        kind: "readonly",
        value: "HV001 · Nguyễn Văn An",
        hint: "Lấy từ hồ sơ đang mở; không cho nhập lại.",
      },
      {
        label: "Trạng thái hiện tại",
        kind: "readonly",
        value: "Đang hoạt động",
      },
      {
        label: "Trạng thái mới",
        required: true,
        kind: "select",
        options: ["Đang hoạt động", "Ngừng hoạt động", "Đã lưu trữ"],
        hint: "Trạng thái hồ sơ độc lập với trạng thái gói tập.",
      },
      {
        label: "Lý do thay đổi",
        required: true,
        kind: "textarea",
        placeholder: "Ví dụ: Hội viên yêu cầu tạm ngừng phục vụ",
        hint: "Bắt buộc khi ngừng hoạt động hoặc lưu trữ.",
      },
      {
        label: "Ảnh hưởng sau khi lưu",
        kind: "readonly",
        value: "Giữ nguyên gói, công nợ, lịch sử và giao dịch",
      },
    ],
    checks: [
      "Kiểm tra quyền và phạm vi chi nhánh trước khi thay đổi.",
      "Không xóa hồ sơ đã có lịch sử, gói hoặc giao dịch.",
      "Ghi nhận người thao tác, thời điểm, trạng thái cũ/mới và lý do vào audit.",
    ],
    exceptions: [
      "Không đủ quyền: từ chối thao tác và giữ nguyên trạng thái hiện tại.",
      "Thiếu lý do: giữ dữ liệu và yêu cầu bổ sung trước khi xác nhận.",
      "Lỗi khi lưu: không cập nhật dở dang và cho phép thử lại.",
    ],
    result:
      "Đã cập nhật trạng thái hồ sơ HV001 thành Ngừng hoạt động. Mã audit: AUD-DEMO-001.",
    primary: "Lưu trạng thái",
  },
  "package-create": {
    title: "Tạo mới danh mục gói tập",
    trace: "UX-F02 · E02-US01 · QTV",
    intro:
      "Thiết lập gói tập mới để bán tại quầy và hiển thị cho hội viên xem trên mobile.",
    steps: ["Thông tin", "Quyền tập", "Giá", "Mở bán"],
    fields: [
      {
        label: "Tên gói",
        required: true,
        placeholder: "Ví dụ: PT 10 buổi / 90 ngày",
        hint: "Bắt buộc nhập. Tên gói hiển thị trên ứng dụng và hóa đơn.",
      },
      {
        label: "Mã gói",
        kind: "readonly",
        value: "(Tự động sinh)",
        hint: "Mã gói tập do hệ thống tự động khởi tạo sau khi lưu.",
      },
      {
        label: "Loại gói",
        required: true,
        kind: "select",
        options: [
          "Gym theo thời gian",
          "Gym theo buổi",
          "PT theo buổi",
          "Combo Gym + PT",
        ],
        hint: "Chọn 1 trong 4 loại gói cơ sở chính thức theo quy định.",
      },
      {
        label: "Cách giới hạn",
        required: true,
        kind: "select",
        options: ["Theo thời gian", "Theo buổi", "Theo thời gian và buổi"],
      },
      {
        label: "Thời hạn",
        placeholder: "Ví dụ: 90 ngày",
        hint: "Bắt buộc nhập nếu gói có giới hạn thời gian sử dụng.",
      },
      {
        label: "Tổng số buổi",
        placeholder: "Ví dụ: 10",
        hint: "Nhập số buổi nếu là gói Gym theo buổi hoặc gói PT. Không dùng 0.",
      },
      {
        label: "Quyền Gym",
        placeholder: "Ví dụ: Vào tập Gym không giới hạn tại chi nhánh đăng ký",
        hint: "Để trống nếu gói không cấp quyền vào Gym.",
      },
      {
        label: "Quyền PT",
        placeholder: "Ví dụ: 10 buổi tập 1-on-1 cùng PT trong 90 ngày",
        hint: "Để trống nếu gói không có quyền PT.",
      },
      {
        label: "Giá bán",
        required: true,
        kind: "money",
        placeholder: "2.000.000",
        hint: "Giá niêm yết chính thức trước giảm giá hoặc khuyến mãi.",
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
        value: "Đang bán",
        options: ["Nháp", "Đang bán", "Ngừng bán"],
      },
      {
        label: "Mô tả quyền lợi",
        kind: "textarea",
        placeholder: "Nội dung ngắn hiển thị trên thẻ gói khi hội viên xem trên mobile...",
      },
    ],
    checks: [
      "Thẻ xem trước hiển thị tên, giá, hạn/số buổi và phạm vi chi nhánh trước khi lưu.",
      "Gói mới lưu thành công sẽ hiển thị ngay trong danh mục bán của quầy và mobile hội viên.",
      "Chỉ được tạo 1 trong 4 loại gói chính thức: Gym thời gian, Gym theo buổi, PT theo buổi và Combo.",
    ],
    exceptions: [
      "Thiếu tên gói, giá bán hoặc loại gói bắt buộc: giữ nguyên form và báo lỗi.",
    ],
    result: "Đã tạo mới thành công gói tập G09.",
    primary: "Tạo gói tập",
  },
  "package-update": {
    title: "Cập nhật danh mục gói tập",
    trace: "UX-F02-EDIT · E02-US01 · QTV",
    intro:
      "Chỉnh sửa điều kiện gói tập hiện có. Thay đổi chỉ áp dụng cho các lần đăng ký/gia hạn mới.",
    steps: ["Thông tin", "Quyền tập", "Giá", "Mở bán"],
    fields: [
      {
        label: "Mã gói",
        kind: "readonly",
        value: "G02",
        hint: "Trường cố định: Không thể thay đổi mã gói đã cấp.",
      },
      {
        label: "Tên gói",
        required: true,
        value: "Gói 3 tháng",
        placeholder: "Ví dụ: Gói 3 tháng",
        hint: "Cập nhật tên hiển thị của gói tập.",
      },
      {
        label: "Loại gói",
        required: true,
        kind: "select",
        value: "Gym theo thời gian",
        options: [
          "Gym theo thời gian",
          "Gym theo buổi",
          "PT theo buổi",
          "Combo Gym + PT",
        ],
        hint: "Loại gói chính thức.",
      },
      {
        label: "Cách giới hạn",
        required: true,
        kind: "select",
        value: "Theo thời gian",
        options: ["Theo thời gian", "Theo buổi", "Theo thời gian và buổi"],
      },
      {
        label: "Thời hạn",
        value: "90 ngày",
        placeholder: "Ví dụ: 90 ngày",
        hint: "Thời hạn hiệu lực của gói.",
      },
      {
        label: "Tổng số buổi",
        value: "—",
        placeholder: "10",
        hint: "Không áp dụng cho gói Gym theo thời gian.",
      },
      {
        label: "Quyền Gym",
        value: "Vào tập Gym không giới hạn trong 90 ngày",
        placeholder: "Quyền Gym",
      },
      {
        label: "Quyền PT",
        value: "Không cấp quyền PT",
        placeholder: "Quyền PT",
      },
      {
        label: "Giá bán",
        required: true,
        kind: "money",
        value: "1.350.000",
        placeholder: "1.350.000",
        hint: "Cập nhật giá bán mới.",
      },
      {
        label: "Chi nhánh áp dụng",
        required: true,
        kind: "select",
        value: "Cả hai chi nhánh",
        options: ["Quận 1", "Bình Thạnh", "Cả hai chi nhánh"],
      },
      {
        label: "Trạng thái bán",
        required: true,
        kind: "select",
        value: "Đang bán",
        options: ["Nháp", "Đang bán", "Ngừng bán"],
      },
      {
        label: "Mô tả quyền lợi",
        kind: "textarea",
        value: "Gói tập phổ thông 3 tháng, áp dụng tại tất cả các chi nhánh.",
        placeholder: "Mô tả ngắn",
      },
    ],
    checks: [
      "Sửa giá hoặc điều kiện chỉ áp dụng cho các lần đăng ký mới.",
      "Các đăng ký đã bán trước đó giữ nguyên điều kiện đã snapshot.",
    ],
    exceptions: [
      "Không được sửa trực tiếp điều kiện của các đăng ký cũ đã phát sinh giao dịch.",
    ],
    result: "Đã cập nhật thông tin gói tập G02 thành công.",
    primary: "Cập nhật gói tập",
  },
  "package-form": {
    title: "Tạo mới danh mục gói tập",
    trace: "UX-F02 · E02-US01 · QTV",
    intro:
      "Thiết lập gói tập mới để bán tại quầy và hiển thị cho hội viên xem trên mobile.",
    steps: ["Thông tin", "Quyền tập", "Giá", "Mở bán"],
    fields: [
      {
        label: "Tên gói",
        required: true,
        placeholder: "Ví dụ: PT 10 buổi / 90 ngày",
        hint: "Bắt buộc nhập. Tên gói hiển thị trên ứng dụng và hóa đơn.",
      },
      {
        label: "Mã gói",
        kind: "readonly",
        value: "(Tự động sinh)",
        hint: "Mã gói tập do hệ thống tự động khởi tạo sau khi lưu.",
      },
      {
        label: "Loại gói",
        required: true,
        kind: "select",
        options: [
          "Gym theo thời gian",
          "Gym theo buổi",
          "PT theo buổi",
          "Combo Gym + PT",
        ],
        hint: "Chọn 1 trong 4 loại gói cơ sở chính thức theo quy định.",
      },
      {
        label: "Cách giới hạn",
        required: true,
        kind: "select",
        options: ["Theo thời gian", "Theo buổi", "Theo thời gian và buổi"],
      },
      {
        label: "Thời hạn",
        placeholder: "Ví dụ: 90 ngày",
        hint: "Bắt buộc nhập nếu gói có giới hạn thời gian sử dụng.",
      },
      {
        label: "Tổng số buổi",
        placeholder: "Ví dụ: 10",
        hint: "Nhập số buổi nếu là gói Gym theo buổi hoặc gói PT. Không dùng 0.",
      },
      {
        label: "Quyền Gym",
        placeholder: "Ví dụ: Vào tập Gym không giới hạn tại chi nhánh đăng ký",
        hint: "Để trống nếu gói không cấp quyền vào Gym.",
      },
      {
        label: "Quyền PT",
        placeholder: "Ví dụ: 10 buổi tập 1-on-1 cùng PT trong 90 ngày",
        hint: "Để trống nếu gói không có quyền PT.",
      },
      {
        label: "Giá bán",
        required: true,
        kind: "money",
        placeholder: "2.000.000",
        hint: "Giá niêm yết chính thức trước giảm giá hoặc khuyến mãi.",
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
        value: "Đang bán",
        options: ["Nháp", "Đang bán", "Ngừng bán"],
      },
      {
        label: "Mô tả quyền lợi",
        kind: "textarea",
        placeholder: "Nội dung ngắn hiển thị trên thẻ gói khi hội viên xem trên mobile...",
      },
    ],
    checks: [
      "Thẻ xem trước hiển thị tên, giá, hạn/số buổi và phạm vi chi nhánh trước khi lưu.",
      "Gói mới lưu thành công sẽ hiển thị ngay trong danh mục bán của quầy và mobile hội viên.",
      "Chỉ được tạo 1 trong 4 loại gói chính thức: Gym thời gian, Gym theo buổi, PT theo buổi và Combo.",
    ],
    exceptions: [
      "Thiếu tên gói, giá bán hoặc loại gói bắt buộc: giữ nguyên form và báo lỗi.",
    ],
    result: "Đã tạo mới thành công gói tập G09.",
    primary: "Tạo gói tập",
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
          "Gói Gym 10 lượt",
          "Gói PT 10 buổi",
          "Gói PT 20 buổi",
          "Combo Gym 3 tháng + PT 10 buổi",
        ],
      },
      {
        label: "Ngày bắt đầu",
        required: true,
        kind: "date",
        placeholder: "07/09/2026",
      },
      {
        label: "Ngày kết thúc dự kiến",
        kind: "readonly",
        value: "Tính theo quy tắc gói và ngày bắt đầu",
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
        label: "Quyền lợi snapshot",
        kind: "readonly",
        value: "Tên gói, giá, hạn/số buổi, quyền Gym/PT và phạm vi chi nhánh",
      },
      {
        label: "Chính sách giảm giá",
        kind: "select",
        options: [
          "Không giảm giá",
          "Chính sách hợp lệ",
          "Gửi QTV duyệt ngoài chính sách",
        ],
      },
      {
        label: "Mức giảm + lý do",
        placeholder: "Bắt buộc khi gửi QTV duyệt ngoài chính sách",
      },
      {
        label: "Ghi chú",
        kind: "textarea",
        placeholder: "Nhu cầu hoặc ngoại lệ đã được phép ghi nhận.",
      },
    ],
    checks: [
      "Hiển thị tên + mã hội viên, ngày hết hạn cụ thể và tổng phải thu.",
      "Gói PT/Combo chưa phân công PT vẫn lưu và thu được nhưng chặn đặt lịch PT.",
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
      "Tự động cập nhật công nợ, chuyển trạng thái hợp đồng và sinh phiếu thu sau khi xác nhận thanh toán.",
    steps: [],
    fields: [
      {
        label: "Hội viên / đăng ký",
        kind: "readonly",
        value: "DK002 · Trần Thị Bình · Gói PT 20 buổi",
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
        value: "500.000",
        placeholder: "500.000",
        hint: "Mặc định thu đủ số tiền còn thiếu (500.000 đ). Không vượt quá nợ.",
      },
      {
        label: "Phương thức",
        required: true,
        kind: "select",
        options: ["Tiền mặt", "Chuyển khoản (Banking / VietQR)"],
      },
      {
        label: "Ghi chú thu tiền",
        kind: "textarea",
        placeholder: "Nhập ghi chú thu tiền (tùy chọn)...",
      },
    ],
    checks: [
      "Tên/mã hội viên, gói đăng ký và số tiền prefill chính xác.",
      "Tiền mặt: Ghi nhận trực tiếp và xác nhận tại quầy.",
      "Chuyển khoản: Tạo VietQR & tự động xác nhận qua IPN/Webhook.",
      "Tự động cập nhật công nợ còn 0 đ, chuyển trạng thái đăng ký và sinh Phiếu thu.",
    ],
    exceptions: [
      "Số tiền thực thu không được vượt quá số tiền còn thiếu (500.000 đ).",
      "User không tự chọn/cập nhật trạng thái payment hoặc registration.",
      "Đối soát chỉ hiển thị khi có giao dịch bất thường.",
    ],
    result: "Đã ghi nhận thu 500.000 đ thành công cho DK002. Còn thiếu sau thu: 0 đ. Đã phát hành Phiếu thu PT-2026-0082 và cập nhật đăng ký.",
    primary: "Xác nhận thu",
  },
  "bank-transfer-payment": {
    title: "Khởi tạo thanh toán chuyển khoản",
    trace: "UX-F04B · E04-US02 · Mobile nội bộ",
    intro:
      "Tạo yêu cầu chuyển khoản cho đăng ký còn phải thu và theo dõi xác nhận tự động.",
    steps: ["Đăng ký", "Thông tin CK", "Chờ xác nhận", "Phiếu"],
    fields: [
      {
        label: "Hội viên / đăng ký còn phải thu",
        required: true,
        kind: "select",
        options: [
          "DK002 · Trần Thị Bình · còn 500.000 đ",
          "REQ-018 · Đỗ Minh Tâm · chờ xử lý",
        ],
      },
      {
        label: "Số tiền cần chuyển",
        required: true,
        kind: "money",
        placeholder: "500.000",
      },
      {
        label: "Ngân hàng nhận",
        required: true,
        kind: "select",
        options: ["VCB · Paradise Gym", "ACB · Paradise Gym"],
      },
      {
        label: "Nội dung chuyển khoản",
        kind: "readonly",
        value: "DK002 HV002 PARADISE",
      },
      {
        label: "QR / thông tin thụ hưởng",
        kind: "readonly",
        value: "Hiển thị cho hội viên quét hoặc chuyển khoản thủ công",
      },
      {
        label: "Ảnh chứng từ hỗ trợ",
        placeholder: "Tùy chọn, không dùng để tự xác nhận đã thu",
      },
      {
        label: "Trạng thái IPN/Webhook",
        kind: "readonly",
        value: "Đang chờ thông báo hợp lệ từ ngân hàng/provider",
      },
      {
        label: "Phiếu thu",
        kind: "readonly",
        value: "Chỉ tạo sau khi payment được xác nhận",
      },
    ],
    checks: [
      "Chỉ xác nhận khi provider gửi đúng giao dịch, đúng số tiền và thành công.",
      "Provider gửi lại cùng event không tạo thêm khoản thu.",
      "Thanh toán một phần vẫn giữ công nợ cho tới khi đủ tiền.",
    ],
    exceptions: [
      "Sai nội dung/số tiền: chuyển sang chờ đối soát, không kích hoạt quyền.",
      "Hết thời gian chờ: cho tiếp tục theo dõi trạng thái, không tạo lệnh trùng.",
      "Thu tiền mặt và điều chỉnh nhạy cảm vẫn thực hiện trên Web.",
    ],
    result: "Đã khởi tạo yêu cầu CK-DEMO-001. Trạng thái: Chờ IPN/Webhook xác nhận.",
    primary: "Khởi tạo chuyển khoản",
  },
  "payment-adjustment": {
    title: "Điều chỉnh payment đã xác nhận",
    trace: "UX-F04C · E04-US05 · QTV web",
    intro:
      "Ghi bản điều chỉnh có phê duyệt, giữ nguyên payment gốc và audit đầy đủ.",
    steps: ["Payment gốc", "Điều chỉnh", "Phê duyệt", "Audit"],
    fields: [
      {
        label: "Payment gốc",
        required: true,
        kind: "select",
        options: [
          "PT00123 · DK001 · 1.350.000 đ",
          "PT00121 · DK006 · 3.800.000 đ",
        ],
      },
      {
        label: "Đăng ký / công nợ liên quan",
        kind: "readonly",
        value: "DK001 · Nguyễn Văn An · còn thiếu sau điều chỉnh sẽ tính lại",
      },
      {
        label: "Loại điều chỉnh",
        required: true,
        kind: "select",
        options: [
          "Giảm số tiền đã ghi nhận",
          "Chuyển trạng thái sang chờ đối soát",
          "Ghi nhận tranh chấp",
        ],
      },
      {
        label: "Số tiền điều chỉnh",
        required: true,
        kind: "money",
        placeholder: "500.000",
      },
      {
        label: "Lý do điều chỉnh",
        required: true,
        kind: "textarea",
        placeholder: "Bắt buộc để gửi duyệt và ghi audit.",
      },
      {
        label: "Người phê duyệt",
        required: true,
        kind: "select",
        options: ["QTV có quyền tài chính", "Quản lý toàn chuỗi"],
      },
      {
        label: "Tác động quyền sử dụng",
        kind: "readonly",
        value: "Nếu còn nợ sau điều chỉnh, quyền gói được rà soát lại.",
      },
      {
        label: "Bản ghi audit",
        kind: "readonly",
        value: "Lưu người thực hiện, role/chi nhánh, trước/sau, lý do và thời điểm",
      },
    ],
    checks: [
      "Payment gốc không bị sửa đè hoặc xóa.",
      "Thiếu permission hoặc thiếu lý do thì không gửi duyệt.",
      "Điều chỉnh được lọc theo branch scope và permission tài chính.",
    ],
    exceptions: [
      "Lễ tân chỉ ghi nhận sai sót và chuyển QTV có quyền xử lý.",
      "Payment chưa xác nhận không đi theo luồng điều chỉnh này.",
      "Quy trình hoàn tiền/tranh chấp ngoài phạm vi được ghi thành nhu cầu xử lý.",
    ],
    result: "Đã gửi yêu cầu điều chỉnh ADJ-DEMO-001. Payment gốc vẫn được giữ nguyên.",
    primary: "Gửi duyệt điều chỉnh",
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
        label: "Thời điểm ghi nhận",
        required: true,
        placeholder: "09/09/2026 09:45",
        hint: "Không dùng để vượt điều kiện gói; hệ thống vẫn lưu người ghi và thời điểm thao tác.",
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
        label: "Tham chiếu sự kiện thiết bị",
        placeholder: "Gate-Q1-01#event-id nếu có",
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
      {
        label: "Lịch tuần",
        required: true,
        placeholder: "T2-CN · 06:00 - 22:00",
        hint: "Ngày nghỉ/ngoại lệ cụ thể được ưu tiên hơn lịch tuần.",
      },
      {
        label: "Ngày nghỉ / ngoại lệ",
        kind: "textarea",
        placeholder: "Ví dụ: 02/09 nghỉ lễ, 24/12 đóng cửa lúc 18:00.",
      },
      { label: "Múi giờ", kind: "readonly", value: "Asia/Ho_Chi_Minh" },
      {
        label: "Trạng thái",
        required: true,
        kind: "select",
        options: ["Nháp", "Hoạt động", "Ngừng hoạt động"],
      },
      {
        label: "Rà soát khi ngừng hoạt động",
        kind: "textarea",
        placeholder: "Gói, lịch tương lai, công nợ và thiết bị cần xử lý trước khi ngừng.",
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
  "member-preferences": {
    title: "Thông tin cá nhân và tùy chọn",
    trace: "UX-F18 · M04 · Hội viên tự cập nhật",
    intro: "Tự cập nhật thông tin cá nhân và quản lý tùy chọn hệ thống.",
    steps: ["Cá nhân", "Liên hệ", "Tùy chọn"],
    fields: [
      {
        label: "Ảnh đại diện",
        placeholder: "Tải lên ảnh đại diện mới",
        hint: "Giúp nhân viên nhận diện khi bạn đến tập.",
      },
      {
        label: "Họ và tên",
        required: true,
        value: "Nguyễn Hoài Nam",
        placeholder: "Tên đầy đủ của bạn",
        hint: "Cần khớp với giấy tờ tùy thân.",
      },
      {
        label: "Số điện thoại",
        kind: "readonly",
        value: "0908 111 222",
        hint: "Liên hệ QTV/Lễ tân nếu muốn đổi số đăng nhập.",
      },
      {
        label: "Email",
        value: "nam.nguyen@email.com",
        placeholder: "Email để nhận hóa đơn và thông báo",
      },
      {
        label: "Ngày sinh",
        kind: "date",
        value: "15/05/1990",
        placeholder: "Chọn ngày sinh",
      },
      {
        label: "Tùy chọn hiển thị sinh nhật",
        kind: "select",
        value: "Chỉ mình tôi",
        options: ["Công khai", "Chỉ mình tôi"],
      },
    ],
    checks: [
      "Kiểm tra định dạng email và ngày sinh hợp lệ.",
      "Lưu tùy chọn bảo mật cá nhân chính xác.",
    ],
    exceptions: [
      "Không được để trống Họ và tên.",
      "Không tự đổi số điện thoại dùng làm định danh đăng nhập.",
    ],
    result: "Đã cập nhật thông tin cá nhân và tùy chọn hệ thống.",
    primary: "Lưu thay đổi",
  },
  "duplicate-resolve": {
    title: "Xử lý hồ sơ nghi trùng",
    trace: "UX-F01-DUP · Hệ thống tự rẽ nhánh khi nhập trùng số điện thoại",
    intro: "Vui lòng đối chiếu thông tin khách đang tạo với hồ sơ trùng khớp trên hệ thống.",
    steps: ["Đối chiếu", "Quyết định xử lý"],
    fields: [
      {
        label: "Họ tên (Khách mới)",
        kind: "readonly",
        value: "Nguyễn Hoài Nam",
      },
      {
        label: "Danh sách nghi trùng",
        kind: "select",
        value: "HV001 · Nguyễn Hoài Nam",
        options: ["HV001 · Nguyễn Hoài Nam", "HV042 · Nguyễn Văn Bé"],
        hint: "Chọn từng hồ sơ để đối chiếu thông tin bên dưới.",
      },
      {
        label: "Số điện thoại (Khách mới)",
        kind: "readonly",
        value: "0908 111 222",
      },
      {
        label: "Họ tên (Trên hệ thống)",
        kind: "readonly",
        value: "Nguyễn Hoài Nam",
      },
      {
        label: "Email (Khách mới)",
        kind: "readonly",
        value: "nam.nguyen@example.vn",
      },
      {
        label: "Số điện thoại (Trên hệ thống)",
        kind: "readonly",
        value: "0908 111 222",
      },
      {
        label: "Ngày sinh (Khách mới)",
        kind: "readonly",
        value: "15/05/1990",
      },
      {
        label: "Email (Trên hệ thống)",
        kind: "readonly",
        value: "(Chưa cập nhật)",
      },
      {
        label: "Quyết định xử lý",
        required: true,
        kind: "select",
        value: "Dùng hồ sơ: HV001",
        options: ["Dùng hồ sơ: HV001", "Dùng hồ sơ: HV042", "Vẫn tạo hồ sơ mới"],
      },
      {
        label: "Ngày sinh (Trên hệ thống)",
        kind: "readonly",
        value: "15/05/1990",
      },
      {
        label: "Lý do xác nhận (Tạo hồ sơ mới)",
        kind: "textarea",
        placeholder: "Ví dụ: Mẹ đăng ký cho con nhỏ dùng chung SĐT...",
        hint: "Bắt buộc nhập nếu vẫn tạo hồ sơ mới. Lịch sử sẽ được ghi nhận.",
      },
    ],
    checks: [
      "Ưu tiên cảnh báo trùng số điện thoại. Email/ngày sinh để tăng độ tin cậy.",
      "Không có lý do thì không được phép tạo mới.",
    ],
    exceptions: [
      "Số điện thoại đăng nhập đã thuộc tài khoản khác sẽ không được đăng nhập.",
    ],
    result: "Đã xử lý nghi trùng. Tiếp tục tạo hồ sơ mới.",
    primary: "Xác nhận xử lý",
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
        placeholder: "Số điện thoại đã xác minh; email là kênh khôi phục",
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
        options: ["Chờ kích hoạt", "Đang hoạt động", "Đã khóa", "Ngừng sử dụng"],
      },
      {
        label: "Consent thông báo",
        kind: "select",
        options: [
          "Giao dịch bắt buộc",
          "Giao dịch + chăm sóc",
          "Giao dịch + chăm sóc + tiếp thị",
        ],
      },
      {
        label: "Sinh nhật công khai tại K01",
        kind: "select",
        options: ["Không đồng ý", "Đồng ý hiển thị tối thiểu", "Chưa hỏi"],
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
        options: ["Máy nhận diện", "Đầu đọc ra/vào", "Màn hình K01", "Khóa cửa", "Máy in"],
      },
      {
        label: "Mục đích IN/OUT",
        required: true,
        kind: "select",
        options: ["IN", "OUT", "BOTH nếu chi nhánh hỗ trợ"],
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
      {
        label: "Trạng thái thiết bị",
        kind: "select",
        options: ["Online", "Offline", "Error", "Pending Sync"],
      },
      {
        label: "Consent nhận diện hội viên",
        kind: "select",
        options: [
          "Chưa đăng ký",
          "Đã consent và sẵn sàng",
          "Đã rút consent",
          "Đang chờ xóa dữ liệu",
        ],
      },
      {
        label: "Kết quả thử nhận diện",
        kind: "readonly",
        value: "Chỉ xác nhận sẵn sàng sau khi thử nhận diện thành công",
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
        label: "Chính sách giảm giá",
        required: true,
        kind: "select",
        options: [
          "Không bật giảm giá",
          "Giảm theo phần trăm",
          "Giảm số tiền cố định",
          "Cần QTV duyệt ngoài chính sách",
        ],
      },
      {
        label: "Mức giảm tối đa / quota",
        placeholder: "Ví dụ: tối đa 10% hoặc 300.000 đ/tháng",
      },
      {
        label: "Phạm vi áp dụng giảm giá",
        kind: "select",
        options: ["Toàn bộ được cấp", "Quận 1", "Bình Thạnh", "Theo gói cụ thể"],
      },
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

interface MemberItem {
  phone: string
  name: string
}

const MOCK_MEMBERS: MemberItem[] = [
  { phone: "0901234567", name: "Nguyễn Văn An" },
  { phone: "0912345678", name: "Trần Thị Bình" },
  { phone: "0988777666", name: "Lê Hoàng Nam" },
  { phone: "0933222111", name: "Phạm Thanh Hà" },
  { phone: "0905111222", name: "Vũ Quốc Việt" },
  { phone: "0977888999", name: "Đặng Thu Thảo" },
  { phone: "0966444555", name: "Hoàng Minh Trí" },
]

export function MemberSearchCombobox({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState(value || "0901234567 - Nguyễn Văn An")
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value && value !== query) {
      setQuery(value)
    }
  }, [value])

  const filtered = MOCK_MEMBERS.filter((m) => {
    const q = query.toLowerCase().trim()
    if (!q) return true
    const displayStr = `${m.phone} - ${m.name}`.toLowerCase()
    const cleanPhone = m.phone.replace(/\s/g, "")
    const cleanQ = q.replace(/\s/g, "")
    return (
      displayStr.includes(q) ||
      cleanPhone.includes(cleanQ) ||
      m.name.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="relative flex items-center">
        <input
          type="text"
          className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition pr-8"
          style={{
            background: palette.control,
            borderColor: isOpen ? palette.orange : palette.border,
            color: palette.text,
          }}
          placeholder="Nhập SĐT hoặc tên hội viên..."
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
        />
        <span
          className="absolute right-2.5 cursor-pointer text-[10px]"
          style={{ color: palette.muted }}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border shadow-xl py-1 text-[13px]"
          style={{
            background: palette.panel,
            borderColor: palette.border,
            color: palette.text,
          }}
        >
          {filtered.length > 0 ? (
            filtered.map((m) => {
              const displayVal = `${m.phone} - ${m.name}`
              const isSelected = query === displayVal
              return (
                <div
                  key={m.phone}
                  className="flex items-center justify-between px-3 py-2 cursor-pointer transition hover:bg-white/10"
                  style={{
                    background: isSelected ? "rgba(22, 163, 74, 0.15)" : "transparent",
                    color: isSelected ? palette.orange : palette.text,
                  }}
                  onClick={() => {
                    setQuery(displayVal)
                    onChange(displayVal)
                    setIsOpen(false)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold" style={{ color: palette.green }}>
                      {m.phone}
                    </span>
                    <span>-</span>
                    <span className="font-medium">{m.name}</span>
                  </div>
                  {isSelected && <span className="text-[12px]">✓</span>}
                </div>
              )
            })
          ) : (
            <div className="px-3 py-3 text-center text-[12px]" style={{ color: palette.muted }}>
              Không tìm thấy hội viên phù hợp với "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface RegPackageItem {
  name: string
  type: "GYM" | "PT" | "COMBO"
  price: number
  gymMonths?: number
  ptSessions?: number
  ptMonths?: number
  scope: string
}

const REG_PACKAGE_CATALOG: Record<string, RegPackageItem> = {
  "Gói 1 tháng (Gym - 500.000đ)": {
    name: "Gói 1 tháng Gym",
    type: "GYM",
    price: 500000,
    gymMonths: 1,
    scope: "Chi nhánh Quận 1 (Full-time)",
  },
  "Gói 3 tháng (Gym - 1.350.000đ)": {
    name: "Gói 3 tháng Gym",
    type: "GYM",
    price: 1350000,
    gymMonths: 3,
    scope: "Chi nhánh Quận 1 (Full-time)",
  },
  "Gói 6 tháng (Gym - 2.400.000đ)": {
    name: "Gói 6 tháng Gym",
    type: "GYM",
    price: 2400000,
    gymMonths: 6,
    scope: "Toàn hệ thống (Full-time)",
  },
  "Gói 1 năm (Gym - 4.200.000đ)": {
    name: "Gói 1 năm Gym",
    type: "GYM",
    price: 4200000,
    gymMonths: 12,
    scope: "Toàn hệ thống (Full-time)",
  },
  "Gói PT 10 buổi (PT - 2.000.000đ)": {
    name: "Gói PT 10 buổi",
    type: "PT",
    price: 2000000,
    ptSessions: 10,
    ptMonths: 3,
    scope: "Chi nhánh Quận 1",
  },
  "Gói PT 20 buổi (PT - 3.800.000đ)": {
    name: "Gói PT 20 buổi",
    type: "PT",
    price: 3800000,
    ptSessions: 20,
    ptMonths: 6,
    scope: "Chi nhánh Quận 1",
  },
  "Combo Gym 3 tháng + PT 10 buổi (3.200.000đ)": {
    name: "Combo Gym 3 tháng + PT 10 buổi",
    type: "COMBO",
    price: 3200000,
    gymMonths: 3,
    ptSessions: 10,
    ptMonths: 3,
    scope: "Chi nhánh Quận 1",
  },
}

const AN_CONTRACTS: Record<string, { label: string; endDate: string; pkgKey: string }> = {
  "DK001": {
    label: "DK001 - Gói 3 tháng Gym (Hết hạn 15/10/2026)",
    endDate: "15/10/2026",
    pkgKey: "Gói 3 tháng (Gym - 1.350.000đ)",
  },
  "DK004": {
    label: "DK004 - Gói PT 10 buổi (Hết hạn 30/11/2026)",
    endDate: "30/11/2026",
    pkgKey: "Gói PT 10 buổi (PT - 2.000.000đ)",
  },
}

function addOneDay(dateStr: string): string {
  const parts = dateStr.split("/")
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10)
    let m = parseInt(parts[1], 10)
    let y = parseInt(parts[2], 10)
    const dt = new Date(y, m - 1, d)
    dt.setDate(dt.getDate() + 1)
    const dd = dt.getDate() < 10 ? `0${dt.getDate()}` : `${dt.getDate()}`
    const mm = dt.getMonth() + 1 < 10 ? `0${dt.getMonth() + 1}` : `${dt.getMonth() + 1}`
    return `${dd}/${mm}/${dt.getFullYear()}`
  }
  return dateStr
}

function computeEndDate(startDateStr: string, months: number): string {
  const parts = startDateStr.split("/")
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10) || 10
    let m = parseInt(parts[1], 10) || 9
    let y = parseInt(parts[2], 10) || 2026
    m += months
    while (m > 12) {
      m -= 12
      y += 1
    }
    const mm = m < 10 ? `0${m}` : `${m}`
    const dd = d < 10 ? `0${d}` : `${d}`
    return `${dd}/${mm}/${y}`
  }
  return "10/12/2026"
}

export function ActionModal({
  action,
  onClose,
}: {
  action: ActionKind | null
  onClose: () => void
}) {
  const [phase, setPhase] = useState<"idle" | "saving" | "success">("idle")
  const [pkgType, setPkgType] = useState<string>("Gym theo thời gian")

  // Controlled states for payment-form
  const [payMethod, setPayMethod] = useState<string>("Tiền mặt")
  const [amountInput, setAmountInput] = useState<string>("500.000")
  const [noteInput, setNoteInput] = useState<string>("")
  const [qrCreated, setQrCreated] = useState<boolean>(false)

  // Controlled dynamic states for registration-create & registration-renew & registration-form
  const [regTab, setRegTab] = useState<"create" | "renew">("create")
  const [selectedContractKey, setSelectedContractKey] = useState<string>("DK001")
  const [regMember, setRegMember] = useState<string>("Nguyễn Văn An - 0901 234 567")
  const [regPkgKey, setRegPkgKey] = useState<string>("Gói 1 tháng (Gym - 500.000đ)")
  const [regStartDate, setRegStartDate] = useState<string>("10/09/2026")
  const [regDiscount, setRegDiscount] = useState<string>("Không giảm giá")
  const [regNote, setRegNote] = useState<string>("")

  if (!action) return null

  const config = ACTIONS[action]

  const isPackageAction =
    action === "package-create" ||
    action === "package-update" ||
    action === "package-form"

  const isRegistrationCreate = action === "registration-create"
  const isRegistrationRenew = action === "registration-renew"
  const isRegistrationFormModal = action === "registration-form"
  const isRegistrationForm = isRegistrationCreate || isRegistrationRenew || isRegistrationFormModal

  const isEffectiveRenew = isRegistrationRenew || (isRegistrationFormModal && regTab === "renew")

  const displayFields = config.fields.filter((field) => {
    if (!isPackageAction) return true
    if (pkgType === "Gym theo thời gian") {
      return field.label !== "Quyền PT" && field.label !== "Tổng số buổi"
    }
    if (pkgType === "Gym theo buổi") {
      return field.label !== "Quyền PT"
    }
    if (pkgType === "PT theo buổi") {
      return field.label !== "Quyền Gym"
    }
    return true
  })

  // Dynamic calculations for registration form
  const selectedPkg = REG_PACKAGE_CATALOG[regPkgKey] || REG_PACKAGE_CATALOG["Gói 1 tháng (Gym - 500.000đ)"]
  const durationMonths = selectedPkg.gymMonths || selectedPkg.ptMonths || 3
  const selectedContract = AN_CONTRACTS[selectedContractKey] || AN_CONTRACTS["DK001"]

  const effectiveStartDate = isEffectiveRenew
    ? (isRegistrationFormModal ? addOneDay(selectedContract.endDate) : "16/10/2026")
    : regStartDate

  const computedEnd = computeEndDate(effectiveStartDate, durationMonths)

  let discountRate = 0
  if (regDiscount.includes("-10%")) discountRate = 0.10
  else if (regDiscount.includes("-5%")) discountRate = 0.05
  else if (regDiscount.includes("-15%")) discountRate = 0.15

  const finalPrice = Math.round(selectedPkg.price * (1 - discountRate))

  // Parse debt & validation check for payment-form
  const isPaymentForm = action === "payment-form"
  const debtMax = 500000
  const parsedAmount = parseInt(amountInput.replace(/\D/g, "") || "0", 10)
  const isAmountOver = parsedAmount > debtMax

  const submit = () => {
    if (isPaymentForm && isAmountOver) return
    setPhase("saving")
    window.setTimeout(() => setPhase("success"), 500)
  }

  // Dynamic checks and exceptions for right panel
  const dynamicChecks = isRegistrationForm
    ? [
        "Chi nhánh bán tự động khóa theo chi nhánh làm việc.",
        "Tự động tính ngày kết thúc, giá gốc và quyền lợi snapshot.",
        "Tạo đăng ký thành công với status ban đầu là PENDING_PAYMENT.",
        "Tự động chuyển ngay sang bước thu tiền sau khi xác nhận.",
      ]
    : config.checks

  const dynamicExceptions = isRegistrationForm
    ? [
          "Gói chưa thu đủ 100% tiền sẽ không được phép Check-in.",
        ]
    : config.exceptions

  return (
    <Modal
      title={config.title}
      onClose={onClose}
    >
      {phase === "success" ? (
        <div className="space-y-4">
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
                  Thanh toán thành công & Đã tạo Phiếu thu
                </div>
                <p
                  className="mt-1 text-[13px] leading-relaxed"
                  style={{ color: palette.muted }}
                >
                  {isPaymentForm
                    ? `Đã ghi nhận thanh toán ${amountInput} đ (${payMethod}) cho hợp đồng DK002 (Trần Thị Bình). Công nợ còn lại: 0 đ. Đăng ký gói đã chuyển sang trạng thái SCHEDULED / ACTIVE. Mã phiếu thu: PT-2026-0082.`
                    : config.result}
                </p>
                {isPaymentForm && (
                  <div className="mt-3 flex gap-2">
                    <ActionButton variant="secondary">
                      🖨️ In phiếu thu (PT-2026-0082)
                    </ActionButton>
                  </div>
                )}
              </div>
            </div>
          </Panel>
          <div className="flex justify-end gap-2">
            <ActionButton
              onClick={() => {
                setPhase("idle")
                setQrCreated(false)
              }}
              variant="secondary"
            >
              Xem lại form
            </ActionButton>
            <ActionButton onClick={onClose}>Đóng</ActionButton>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
          className="space-y-4"
        >
          <Panel>
            {isRegistrationForm ? (
              <div className="space-y-4">
                {/* Tab bar for W02 Modal */}
                {isRegistrationFormModal && (
                  <div
                    className="flex items-center gap-2 rounded-xl p-1 border mb-2"
                    style={{ background: palette.control, borderColor: palette.border }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRegTab("create")
                        setRegPkgKey("Gói 1 tháng (Gym - 500.000đ)")
                      }}
                      className="flex-1 rounded-lg py-2 text-[13px] font-bold transition-all text-center"
                      style={{
                        background: regTab === "create" ? "rgba(147, 51, 234, 0.2)" : "transparent",
                        color: regTab === "create" ? palette.purple : palette.muted,
                        border: regTab === "create" ? `1px solid ${palette.purple}` : "1px solid transparent",
                      }}
                    >
                      📝 Đăng ký gói mới
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRegTab("renew")
                        setSelectedContractKey("DK001")
                        setRegPkgKey(AN_CONTRACTS["DK001"].pkgKey)
                      }}
                      className="flex-1 rounded-lg py-2 text-[13px] font-bold transition-all text-center"
                      style={{
                        background: regTab === "renew" ? "rgba(147, 51, 234, 0.2)" : "transparent",
                        color: regTab === "renew" ? palette.purple : palette.muted,
                        border: regTab === "renew" ? `1px solid ${palette.purple}` : "1px solid transparent",
                      }}
                    >
                      🔄 Gia hạn gói
                    </button>
                  </div>
                )}

                {/* Clean 2-column Registration Form Inputs */}
                <div className="grid gap-4 md:grid-cols-2">
                  {isEffectiveRenew ? (
                    <>
                      <Field label="Gia hạn từ hợp đồng cũ" required hint={isRegistrationFormModal ? "Chọn hợp đồng cũ cần gia hạn" : "Mã hợp đồng hiện tại"}>
                        {isRegistrationFormModal ? (
                          <SelectInput
                            options={Object.values(AN_CONTRACTS).map((c) => c.label)}
                            value={selectedContract.label}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              const foundKey = Object.keys(AN_CONTRACTS).find(
                                (k) => AN_CONTRACTS[k].label === e.target.value
                              )
                              if (foundKey) {
                                setSelectedContractKey(foundKey)
                                setRegPkgKey(AN_CONTRACTS[foundKey].pkgKey)
                              }
                            }}
                          />
                        ) : (
                          <TextInput value="DK001 (Hợp đồng đang chọn gia hạn)" readOnly />
                        )}
                      </Field>

                      <Field label="Hội viên gia hạn" required hint={isRegistrationFormModal ? "Cố định từ hồ sơ hội viên" : "Gõ SĐT hoặc Họ tên để chọn hội viên"}>
                        {isRegistrationFormModal ? (
                          <TextInput value="Nguyễn Văn An · SĐT: 0901 234 567" readOnly />
                        ) : (
                          <MemberSearchCombobox
                            value={regMember}
                            onChange={(val) => setRegMember(val)}
                          />
                        )}
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label="Hội viên" required hint={isRegistrationFormModal ? "Cố định từ hồ sơ hội viên" : "Gõ SĐT hoặc Họ tên để tìm & chọn hội viên"}>
                        {isRegistrationFormModal ? (
                          <TextInput value="Nguyễn Văn An · SĐT: 0901 234 567" readOnly />
                        ) : (
                          <MemberSearchCombobox
                            value={regMember}
                            onChange={(val) => setRegMember(val)}
                          />
                        )}
                      </Field>

                      <Field label="Chi nhánh bán" hint="Tự động lấy theo chi nhánh làm việc">
                        <TextInput value="Chi nhánh Quận 1 (Tự động lấy theo chi nhánh hiện tại)" readOnly />
                      </Field>
                    </>
                  )}

                  <Field label={isEffectiveRenew ? "Gói gia hạn (Chọn gói hiện hành)" : "Gói đăng ký"} required hint="Danh mục gói hiện đang mở bán">
                    <SelectInput
                      options={Object.keys(REG_PACKAGE_CATALOG)}
                      value={regPkgKey}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRegPkgKey(e.target.value)}
                    />
                  </Field>

                  {isEffectiveRenew ? (
                    <Field label="Ngày bắt đầu mới [AUTO]" hint="Tự động = End date cũ + 1 ngày">
                      <TextInput value={`${effectiveStartDate} (Ngày sau khi hợp đồng cũ hết hạn)`} readOnly />
                    </Field>
                  ) : (
                    <Field label="Ngày bắt đầu" required hint="Mặc định ngày hôm nay hoặc tùy chỉnh">
                      <TextInput
                        value={regStartDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegStartDate(e.target.value)}
                        placeholder="DD/MM/YYYY"
                      />
                    </Field>
                  )}

                  <Field label={isEffectiveRenew ? "Ngày kết thúc mới [AUTO]" : "Ngày kết thúc dự kiến [AUTO]"} hint={`Tự động cộng ${durationMonths} tháng theo gói`}>
                    <TextInput value={`${computedEnd} (Tự động tính theo thời hạn gói)`} readOnly />
                  </Field>

                  <Field label={isEffectiveRenew ? "Giá niêm yết hiện hành" : "Giá gốc hiện hành"} hint="Niêm yết tại thời điểm đăng ký">
                    <TextInput value={`${selectedPkg.price.toLocaleString("vi-VN")} đ`} readOnly />
                  </Field>

                  <Field label="Chính sách giảm giá" hint="Chọn chính sách ưu đãi áp dụng">
                    <SelectInput
                      options={[
                        "Không giảm giá",
                        "Chính sách hợp lệ (-10%)",
                        "Giảm giá gia hạn/thân thiết (-5%)",
                        "Gửi QTV duyệt ngoài chính sách (-15%)",
                      ]}
                      value={regDiscount}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRegDiscount(e.target.value)}
                    />
                  </Field>
                </div>

                {/* Note Field (Full width) */}
                <Field label={isEffectiveRenew ? "Ghi chú gia hạn (Tùy chọn)" : "Ghi chú đăng ký (Tùy chọn)"}>
                  <TextArea
                    value={regNote}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRegNote(e.target.value)}
                    placeholder="Ghi chú yêu cầu đặc biệt của hội viên..."
                  />
                </Field>
              </div>
            ) : isPaymentForm ? (
              <div className="space-y-4">
                {/* Read-Only Prefill Header & Financial Stat Cards */}
                <div className="space-y-3">
                  <Field label="Hội viên & Đơn đăng ký" required hint="Cố định từ hợp đồng">
                    <div
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-[13px] font-medium"
                      style={{ background: palette.control, borderColor: palette.border, color: palette.text }}
                    >
                      <span>
                        <strong style={{ color: palette.purple }}>DK002</strong> · Trần Thị Bình · Gói PT 20 buổi
                      </span>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "rgba(234, 179, 8, 0.15)", color: palette.amber }}>
                        ⏳ Chờ thanh toán
                      </span>
                    </div>
                  </Field>

                  {/* Financial Stat Cards (Separate Labels/Badges) */}
                  <div>
                    <div className="text-[12px] font-semibold mb-1.5" style={{ color: palette.muted }}>
                      Thông tin tài chính & công nợ hợp đồng
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div
                        className="rounded-xl border p-3 flex flex-col justify-center"
                        style={{ background: palette.control, borderColor: palette.border }}
                      >
                        <span className="text-[11px] font-medium" style={{ color: palette.dim }}>
                          Phải thu (Tổng tiền)
                        </span>
                        <span className="text-[15px] font-bold mt-0.5" style={{ color: palette.text }}>
                          3.800.000 đ
                        </span>
                      </div>

                      <div
                        className="rounded-xl border p-3 flex flex-col justify-center"
                        style={{ background: "rgba(16, 185, 129, 0.08)", borderColor: "rgba(16, 185, 129, 0.25)" }}
                      >
                        <span className="text-[11px] font-medium text-emerald-600">
                          Đã thu
                        </span>
                        <span className="text-[15px] font-bold mt-0.5 text-emerald-500">
                          3.300.000 đ
                        </span>
                      </div>

                      <div
                        className="rounded-xl border p-3 flex flex-col justify-center"
                        style={{ background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.25)" }}
                      >
                        <span className="text-[11px] font-medium text-red-500">
                          Còn thiếu (Nợ)
                        </span>
                        <span className="text-[15px] font-bold mt-0.5 text-red-500">
                          500.000 đ
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Inputs */}
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Số thực thu (VNĐ)"
                    required
                    hint="Mặc định bằng số tiền còn thiếu"
                  >
                    <TextInput
                      value={amountInput}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountInput(e.target.value)}
                      placeholder="500.000"
                    />
                    {isAmountOver && (
                      <div className="mt-1 text-[12px] font-semibold text-red-500">
                        ⚠️ Số tiền thu không được vượt quá số tiền còn thiếu (500.000 đ)
                      </div>
                    )}
                  </Field>

                  <Field label="Phương thức thanh toán" required>
                    <SelectInput
                      options={["Tiền mặt", "Chuyển khoản (Banking / VietQR)"]}
                      value={payMethod}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        setPayMethod(e.target.value)
                        setQrCreated(false)
                      }}
                    />
                  </Field>
                </div>

                {/* Dynamic VietQR Box when Chuyển khoản */}
                {payMethod.includes("Chuyển khoản") && (
                  <div
                    className="rounded-xl border p-4"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                    }}
                  >
                    {!qrCreated ? (
                      <div className="flex flex-col items-center justify-center space-y-2 text-center py-2">
                        <div className="text-[13px] font-medium" style={{ color: palette.muted }}>
                          Nhấp nút <strong>"Tạo QR thanh toán"</strong> bên dưới để tạo mã VietQR động theo số tiền thực thu.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: palette.border }}>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[14px]" style={{ color: palette.text }}>
                              VietQR Thanh toán
                            </span>
                            <span
                              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                              style={{
                                background: "rgba(234, 179, 8, 0.15)",
                                color: palette.amber,
                              }}
                            >
                              ⏳ PENDING (Chờ IPN/Webhook)
                            </span>
                          </div>
                          <span className="text-[12px] font-mono" style={{ color: palette.dim }}>
                            NH: Vietcombank
                          </span>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-[110px_1fr] items-center">
                          {/* Mock QR Code */}
                          <div className="flex h-[110px] w-[110px] items-center justify-center rounded-lg border bg-white p-2 text-center shadow-sm">
                            <div className="text-[10px] font-mono text-gray-800">
                              [VIETQR]
                              <br />
                              {amountInput} đ
                              <br />
                              DK002
                            </div>
                          </div>

                          <div className="space-y-1 text-[12px]">
                            <div>
                              <span style={{ color: palette.dim }}>Số tài khoản: </span>
                              <strong className="font-mono" style={{ color: palette.text }}>999888777</strong>
                            </div>
                            <div>
                              <span style={{ color: palette.dim }}>Chủ tài khoản: </span>
                              <strong style={{ color: palette.text }}>PARADISE GYM COMPANY</strong>
                            </div>
                            <div>
                              <span style={{ color: palette.dim }}>Số tiền: </span>
                              <strong className="font-mono text-green-600 font-bold">
                                {amountInput} đ
                              </strong>
                            </div>
                            <div>
                              <span style={{ color: palette.dim }}>Nội dung CK: </span>
                              <strong className="font-mono" style={{ color: palette.orange }}>
                                DK002 HV002
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between rounded-lg border p-2 text-[12px]" style={{ borderColor: palette.border, background: palette.panel }}>
                          <span style={{ color: palette.muted }}>
                            Đang lắng nghe Webhook ngân hàng...
                          </span>
                          <ActionButton
                            type="button"
                            onClick={() => {
                              setPhase("saving")
                              window.setTimeout(() => setPhase("success"), 500)
                            }}
                            variant="purple"
                          >
                            ⚡ Mô phỏng IPN nhận tiền thành công
                          </ActionButton>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Note input */}
                <Field label="Ghi chú thu tiền (Tùy chọn)">
                  <TextArea
                    value={noteInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNoteInput(e.target.value)}
                    placeholder="Nhập ghi chú thu tiền..."
                  />
                </Field>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {displayFields.map((field) => (
                  <Field
                    key={field.label}
                    label={field.label}
                    required={field.required}
                    hint={field.hint}
                  >
                    {field.label === "Loại gói" ? (
                      <SelectInput
                        options={field.options ?? []}
                        defaultValue={field.value ?? pkgType}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPkgType(e.target.value)}
                      />
                    ) : (
                      renderField(field)
                    )}
                  </Field>
                ))}
              </div>
            )}
          </Panel>

          {/* Form Actions Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <ActionButton onClick={onClose} variant="secondary">
              Hủy
            </ActionButton>
            {isPaymentForm && payMethod.includes("Chuyển khoản") && !qrCreated ? (
              <ActionButton
                type="button"
                onClick={() => setQrCreated(true)}
                variant="purple"
              >
                📲 Tạo QR thanh toán
              </ActionButton>
            ) : (
              <ActionButton
                type="submit"
                disabled={phase === "saving" || (isPaymentForm && isAmountOver)}
                variant="purple"
              >
                {phase === "saving"
                  ? "Đang ghi nhận..."
                  : isPaymentForm
                  ? "Xác nhận thu"
                  : config.primary}
              </ActionButton>
            )}
          </div>
        </form>
      )}
    </Modal>
  )
}
