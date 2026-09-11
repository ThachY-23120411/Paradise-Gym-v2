export type MenuId = "W01" | "W02" | "W03" | "W04" | "W05" | "W06" | "W07" | "W08" | "W09" | "W10" | "W11" | "W12" | "W13"

export type WebRole = "admin" | "receptionist"
export type MobileRole = "receptionist" | "trainer" | "member"
export type AppSurface = "web-admin" | "web-receptionist" | "mobile-receptionist" | "mobile-trainer" | "mobile-member"
export type ThemeMode = "light" | "dark"

export type MemberStatus = "active" | "expiring" | "expired" | "none"
export type MemberProfileStatus = "active" | "inactive" | "archived"
export type TrainerStatus = "active" | "inactive"
export type PackageStatus = "draft" | "selling" | "stopped"
export type RegistrationStatus =
  | "PENDING_PAYMENT"
  | "SCHEDULED"
  | "ACTIVE"
  | "EXPIRED"
  | "EXHAUSTED"
  | "CANCELLED"

export interface Registration {
  id: string
  memberId: string
  member: string
  packageName: string
  from: string
  to: string
  total: number
  paid: number
  pt?: string
  branch: string
  status: RegistrationStatus
  warning?: string | null
  renewedFrom?: string
}

export const REGISTRATIONS: Registration[] = [
  {
    id: "DK001",
    memberId: "HV001",
    member: "Nguyễn Văn An",
    packageName: "Gói 3 tháng",
    from: "15/07/2026",
    to: "15/10/2026",
    total: 1350000,
    paid: 1350000,
    branch: "Quận 1",
    status: "ACTIVE",
    warning: null,
  },
  {
    id: "DK002",
    memberId: "HV002",
    member: "Trần Thị Bình",
    packageName: "Gói PT 20 buổi",
    from: "01/07/2026",
    to: "20/09/2026",
    total: 3800000,
    paid: 3300000,
    pt: "Nguyễn Thành Long",
    branch: "Quận 1",
    status: "PENDING_PAYMENT",
    warning: "Nợ 500.000 đ",
  },
  {
    id: "DK003",
    memberId: "HV005",
    member: "Hoàng Đức Em",
    packageName: "Gói 1 tháng",
    from: "30/07/2026",
    to: "30/08/2026",
    total: 500000,
    paid: 0,
    branch: "Quận 1",
    status: "PENDING_PAYMENT",
    warning: "Chưa nộp tiền",
  },
  {
    id: "DK004",
    memberId: "HV004",
    member: "Phạm Thu Dung",
    packageName: "Gói 6 tháng",
    from: "15/08/2026",
    to: "15/02/2027",
    total: 2400000,
    paid: 2400000,
    branch: "Bình Thạnh",
    status: "ACTIVE",
    warning: null,
  },
  {
    id: "DK005",
    memberId: "HV008",
    member: "Bùi Thị Hoa",
    packageName: "Gói 6 tháng",
    from: "18/03/2026",
    to: "18/09/2026",
    total: 2400000,
    paid: 2400000,
    branch: "Quận 1",
    status: "ACTIVE",
    warning: "Sắp hết hạn (còn 8 ngày)",
  },
  {
    id: "DK006",
    memberId: "HV012",
    member: "Đinh Thị Linh",
    packageName: "Gói PT 20 buổi",
    from: "09/08/2026",
    to: "08/12/2026",
    total: 3800000,
    paid: 3800000,
    pt: "Phạm Văn Mạnh",
    branch: "Quận 1",
    status: "ACTIVE",
    warning: null,
  },
  {
    id: "DK007",
    memberId: "HV010",
    member: "Trịnh Thị Lan",
    packageName: "Gói 1 năm",
    from: "10/10/2026",
    to: "10/10/2027",
    total: 4200000,
    paid: 4200000,
    branch: "Bình Thạnh",
    status: "SCHEDULED",
    warning: "Sắp tới ngày bắt đầu",
  },
  {
    id: "DK008",
    memberId: "HV013",
    member: "Cao Thanh Minh",
    packageName: "Combo Gym 3 tháng + PT 10 buổi",
    from: "05/09/2026",
    to: "03/12/2026",
    total: 3200000,
    paid: 3200000,
    pt: "Chưa phân công",
    branch: "Quận 1",
    status: "ACTIVE",
    warning: "PT chưa phân công",
  },
  {
    id: "DK009",
    memberId: "HV014",
    member: "Vũ Hoàng Nam",
    packageName: "Gói PT 10 buổi",
    from: "01/06/2026",
    to: "01/09/2026",
    total: 2000000,
    paid: 2000000,
    pt: "Nguyễn Thành Long",
    branch: "Quận 1",
    status: "EXHAUSTED",
    warning: "Đã tập hết 10/10 buổi",
  },
  {
    id: "DK010",
    memberId: "HV015",
    member: "Lê Văn Cường",
    packageName: "Gói 1 tháng",
    from: "01/05/2026",
    to: "01/06/2026",
    total: 500000,
    paid: 500000,
    branch: "Quận 1",
    status: "EXPIRED",
    warning: null,
  },
  {
    id: "DK011",
    memberId: "HV018",
    member: "Đỗ Minh Tâm",
    packageName: "Gói 3 tháng",
    from: "08/12/2026",
    to: "08/03/2027",
    total: 1350000,
    paid: 0,
    branch: "Quận 1",
    status: "PENDING_PAYMENT",
    renewedFrom: "DK001",
    warning: "Gia hạn chờ nộp tiền",
  },
]
export type PaymentStatus = "confirmed" | "pending" | "partial"
export type CheckResult = "ok" | "expiring" | "expired" | "manual" | "unknown" | "offline"
export type SessionStatus = "done" | "awaiting_confirmation" | "ongoing" | "upcoming" | "empty" | "cancelled"
export type CareStatus = "pending" | "sent" | "failed" | "followup"

export interface MemberPackage {
  name: string
  type: "Gym" | "PT" | "Combo"
  validUntil?: string
  sessionsLeft?: number | null
  status: MemberStatus
}

export interface Member {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  packageName: string
  validUntil: string
  status: MemberStatus
  profileStatus?: MemberProfileStatus
  debt: number
  branch: string
  sessionsLeft: number | null
  trainerId?: string
  birthday?: string
  lastVisit?: string
  packages?: MemberPackage[]
}

export type TrainerAccountStatus = "active" | "pending_activation" | "suspended"

export interface Trainer {
  id: string
  name: string
  phone: string
  email: string
  specialty: string
  students: number
  pendingRequests?: number
  todaySessions?: number
  status: TrainerStatus
  accountStatus: TrainerAccountStatus
  branch: string
  nextSlot?: string
  startDate?: string
  notes?: string
}

export interface GymPackage {
  id: string
  name: string
  service: "Gym" | "PT" | "Combo"
  limitType: "time" | "session" | "hybrid"
  price: number
  duration: string | null
  sessions: number | null
  branches: string[]
  status: PackageStatus
}

export interface Registration {
  id: string
  memberId: string
  member: string
  packageName: string
  from: string
  to: string
  total: number
  paid: number
  pt?: string
  branch: string
  status: RegistrationStatus
}

export interface Payment {
  id: string
  time: string
  member: string
  ref: string
  method: "Tiền mặt" | "Chuyển khoản"
  amount: number
  status: PaymentStatus
  by: string
  branch: string
}

export interface CheckInEvent {
  id: number
  time: string
  member: string
  memberId: string
  direction: "in" | "out"
  pkg: string
  result: CheckResult
  device: string
}

export interface Session {
  id: string
  date: string
  time: string
  trainerId: string
  trainer: string
  memberId?: string
  member?: string
  packageName?: string
  branch: string
  status: SessionStatus
  note?: string
  cancelledAt?: string
  auditNote?: string
}

export interface CareItem {
  id: string
  type: "expiring" | "birthday" | "debt" | "schedule"
  title: string
  member: string
  memberId: string
  detail: string
  status: CareStatus
  owner: string
  created: string
}

export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  open: string
  members: number
  trainers: number
  status: "active" | "inactive"
}

export const TODAY_LABEL = "Thứ hai, 07/09/2026"
export const SHORT_TODAY = "T2 · 07/09/2026"

export const MEMBERS: Member[] = [
  {
    id: "HV001",
    name: "Nguyễn Văn An",
    phone: "0901 234 567",
    email: "an.nguyen@example.vn",
    packageName: "Gói 3 tháng + PT 10 buổi",
    validUntil: "15/10/2026",
    status: "active",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: 6,
    lastVisit: "09:42 hôm nay",
    packages: [
      {
        name: "Gói Gym 3 tháng",
        type: "Gym",
        validUntil: "15/10/2026",
        status: "active",
      },
      {
        name: "Gói PT 10 buổi",
        type: "PT",
        sessionsLeft: 6,
        validUntil: "30/11/2026",
        status: "active",
      },
    ],
  },
  {
    id: "HV002",
    name: "Trần Thị Bình",
    phone: "0902 345 678",
    email: "binh.tran@example.vn",
    packageName: "Gói PT 20 buổi",
    validUntil: "20/09/2026",
    status: "expiring",
    debt: 500000,
    branch: "Quận 1",
    sessionsLeft: 3,
    trainerId: "PT001",
    lastVisit: "04/09/2026",
    packages: [
      {
        name: "Gói PT 20 buổi",
        type: "PT",
        sessionsLeft: 3,
        validUntil: "20/09/2026",
        status: "expiring",
      },
      {
        name: "Gói Gym 1 tháng (Gia hạn)",
        type: "Gym",
        validUntil: "Dự kiến 21/09/2026",
        status: "none",
      },
    ],
  },
  {
    id: "HV003",
    name: "Lê Minh Cường",
    phone: "0903 456 789",
    packageName: "Gói 1 tháng",
    validUntil: "10/09/2026",
    status: "expiring",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: null,
    lastVisit: "06/09/2026",
  },
  {
    id: "HV004",
    name: "Phạm Thu Dung",
    phone: "0904 567 890",
    email: "dung.pham@example.vn",
    packageName: "Gói 6 tháng",
    validUntil: "15/02/2027",
    status: "active",
    debt: 0,
    branch: "Bình Thạnh",
    sessionsLeft: null,
    lastVisit: "09:38 hôm nay",
  },
  {
    id: "HV005",
    name: "Hoàng Đức Em",
    phone: "0905 678 901",
    packageName: "Gói 1 tháng",
    validUntil: "30/08/2026",
    status: "expired",
    debt: 800000,
    branch: "Quận 1",
    sessionsLeft: null,
    lastVisit: "28/08/2026",
  },
  {
    id: "HV006",
    name: "Vũ Thị Phương",
    phone: "0906 789 012",
    packageName: "Gói Gym 6T + PT 10B",
    validUntil: "01/11/2026",
    status: "active",
    debt: 0,
    branch: "Bình Thạnh",
    sessionsLeft: 7,
    trainerId: "PT003",
    lastVisit: "08:30 hôm nay",
    packages: [
      {
        name: "Gói Gym 6 tháng",
        type: "Gym",
        validUntil: "15/10/2026",
        status: "active",
      },
      {
        name: "Gói PT 10 buổi",
        type: "PT",
        sessionsLeft: 7,
        validUntil: "01/11/2026",
        status: "active",
      },
    ],
  },
  {
    id: "HV007",
    name: "Đặng Văn Giang",
    phone: "0907 890 123",
    packageName: "Gói 3 tháng",
    validUntil: "05/10/2026",
    status: "active",
    debt: 200000,
    branch: "Quận 1",
    sessionsLeft: null,
    lastVisit: "07:35 hôm nay",
  },
  {
    id: "HV008",
    name: "Bùi Thị Hoa",
    phone: "0908 901 234",
    packageName: "Gói 6 tháng",
    validUntil: "18/09/2026",
    status: "expiring",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: null,
    birthday: "07/09",
    lastVisit: "09:21 hôm nay",
  },
  {
    id: "HV009",
    name: "Ngô Quang Hải",
    phone: "0909 012 345",
    packageName: "Chưa có gói",
    validUntil: "—",
    status: "none",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: null,
  },
  {
    id: "HV010",
    name: "Trịnh Thị Lan",
    phone: "0900 123 456",
    email: "lan.trinh@example.vn",
    packageName: "Gói 1 năm",
    validUntil: "10/07/2027",
    status: "active",
    debt: 0,
    branch: "Bình Thạnh",
    sessionsLeft: null,
    birthday: "07/09",
  },
  {
    id: "HV011",
    name: "Mai Văn Khoa",
    phone: "0911 234 567",
    packageName: "Gói 3 tháng",
    validUntil: "22/11/2026",
    status: "active",
    debt: 0,
    branch: "Bình Thạnh",
    sessionsLeft: null,
    birthday: "07/09",
  },
  {
    id: "HV012",
    name: "Đinh Thị Linh",
    phone: "0922 345 678",
    packageName: "Gói Gym 3T + PT 20B",
    validUntil: "08/12/2026",
    status: "active",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: 14,
    trainerId: "PT002",
    packages: [
      {
        name: "Gói Gym 3 tháng",
        type: "Gym",
        validUntil: "22/11/2026",
        status: "active",
      },
      {
        name: "Gói PT 20 buổi",
        type: "PT",
        sessionsLeft: 14,
        validUntil: "08/12/2026",
        status: "active",
      },
    ],
  },
  {
    id: "HV013",
    name: "Cao Thanh Minh",
    phone: "0933 456 789",
    packageName: "Gói 6 tháng",
    validUntil: "25/01/2027",
    status: "active",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: null,
  },
  {
    id: "HV014",
    name: "Lý Thị Nhung",
    phone: "0944 567 890",
    packageName: "Gói 1 tháng",
    validUntil: "12/09/2026",
    status: "expiring",
    debt: 300000,
    branch: "Bình Thạnh",
    sessionsLeft: null,
  },
  {
    id: "HV015",
    name: "Tô Văn Phong",
    phone: "0955 678 901",
    packageName: "Gói PT 10 buổi",
    validUntil: "30/10/2026",
    status: "active",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: 5,
    trainerId: "PT001",
  },
  {
    id: "HV016",
    name: "Phan Gia Hân",
    phone: "0966 789 012",
    packageName: "Gói PT 10 buổi",
    validUntil: "20/10/2026",
    status: "active",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: 0,
    trainerId: "PT002",
  },
  {
    id: "HV017",
    name: "Huỳnh Quốc Việt",
    phone: "0977 890 123",
    packageName: "Gói 1 tháng",
    validUntil: "05/09/2026",
    status: "expired",
    debt: 0,
    branch: "Bình Thạnh",
    sessionsLeft: null,
  },
  {
    id: "HV018",
    name: "Đỗ Minh Tâm",
    phone: "0988 901 234",
    packageName: "Gói 3 tháng",
    validUntil: "07/12/2026",
    status: "active",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: null,
  },
  {
    id: "HV019",
    name: "Võ Ngọc Mai",
    phone: "0999 012 345",
    packageName: "Gói PT 20 buổi",
    validUntil: "28/12/2026",
    status: "active",
    debt: 0,
    branch: "Bình Thạnh",
    sessionsLeft: 11,
    trainerId: "PT003",
  },
  {
    id: "HV020",
    name: "Nguyễn Hoài Nam",
    phone: "0908 111 222",
    packageName: "Chưa có gói",
    validUntil: "—",
    status: "none",
    debt: 0,
    branch: "Quận 1",
    sessionsLeft: null,
  },
]

export const TRAINERS: Trainer[] = [
  {
    id: "PT001",
    name: "Nguyễn Thành Long",
    phone: "0911 111 111",
    email: "long.pt@example.vn",
    specialty: "Cardio, HIIT",
    students: 8,
    pendingRequests: 2,
    todaySessions: 4,
    status: "active",
    accountStatus: "active",
    branch: "Quận 1",
    nextSlot: "09:00 hôm nay",
    startDate: "15/01/2025",
  },
  {
    id: "PT002",
    name: "Phạm Văn Mạnh",
    phone: "0922 222 222",
    email: "manh.pt@example.vn",
    specialty: "Powerlifting, Strength",
    students: 6,
    pendingRequests: 1,
    todaySessions: 3,
    status: "active",
    accountStatus: "active",
    branch: "Quận 1",
    nextSlot: "10:00 hôm nay",
    startDate: "01/03/2025",
  },
  {
    id: "PT003",
    name: "Lê Thị Ngọc",
    phone: "0933 333 333",
    email: "ngoc.pt@example.vn",
    specialty: "Yoga, Pilates",
    students: 10,
    pendingRequests: 0,
    todaySessions: 5,
    status: "active",
    accountStatus: "pending_activation",
    branch: "Bình Thạnh",
    nextSlot: "11:00 hôm nay",
    startDate: "10/08/2026",
  },
  {
    id: "PT004",
    name: "Võ Đức Phú",
    phone: "0944 444 444",
    email: "phu.pt@example.vn",
    specialty: "Bodybuilding, Nutrition",
    students: 4,
    pendingRequests: 0,
    todaySessions: 0,
    status: "inactive",
    accountStatus: "active",
    branch: "Quận 1",
    nextSlot: "Tạm ngừng nhận lịch",
    startDate: "20/11/2024",
  },
]

export const PACKAGES: GymPackage[] = [
  {
    id: "G01",
    name: "Gói 1 tháng",
    service: "Gym",
    limitType: "time",
    price: 500000,
    duration: "30 ngày",
    sessions: null,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G02",
    name: "Gói 3 tháng",
    service: "Gym",
    limitType: "time",
    price: 1350000,
    duration: "90 ngày",
    sessions: null,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G03",
    name: "Gói 6 tháng",
    service: "Gym",
    limitType: "time",
    price: 2400000,
    duration: "180 ngày",
    sessions: null,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G04",
    name: "Gói 1 năm",
    service: "Gym",
    limitType: "time",
    price: 4200000,
    duration: "365 ngày",
    sessions: null,
    branches: ["Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G05",
    name: "Gói Gym 10 lượt",
    service: "Gym",
    limitType: "session",
    price: 800000,
    duration: "60 ngày",
    sessions: 10,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G06",
    name: "Gói PT 10 buổi",
    service: "PT",
    limitType: "session",
    price: 2000000,
    duration: "90 ngày",
    sessions: 10,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G07",
    name: "Gói PT 20 buổi",
    service: "PT",
    limitType: "session",
    price: 3800000,
    duration: "120 ngày",
    sessions: 20,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G08",
    name: "Combo Gym 3 tháng + PT 10 buổi",
    service: "Combo",
    limitType: "hybrid",
    price: 3200000,
    duration: "90 ngày",
    sessions: 10,
    branches: ["Quận 1", "Bình Thạnh"],
    status: "selling",
  },
  {
    id: "G09",
    name: "Gói 1 tháng (cũ)",
    service: "Gym",
    limitType: "time",
    price: 450000,
    duration: "30 ngày",
    sessions: null,
    branches: ["Quận 1"],
    status: "stopped",
  },
]



export const PAYMENTS: Payment[] = [
  {
    id: "PT00123",
    time: "09:15",
    member: "Nguyễn Văn An",
    ref: "DK001",
    method: "Tiền mặt",
    amount: 1350000,
    status: "confirmed",
    by: "Lê Thị Thanh Hà",
    branch: "Quận 1",
  },
  {
    id: "PT00122",
    time: "08:55",
    member: "Phạm Thu Dung",
    ref: "DK004",
    method: "Chuyển khoản",
    amount: 2400000,
    status: "pending",
    by: "Lê Thị Thanh Hà",
    branch: "Bình Thạnh",
  },
  {
    id: "PT00121",
    time: "08:30",
    member: "Đinh Thị Linh",
    ref: "DK006",
    method: "Tiền mặt",
    amount: 3800000,
    status: "confirmed",
    by: "Lê Thị Thanh Hà",
    branch: "Quận 1",
  },
  {
    id: "PT00120",
    time: "Hôm qua",
    member: "Đặng Văn Giang",
    ref: "DK003",
    method: "Tiền mặt",
    amount: 200000,
    status: "partial",
    by: "Trần Văn Bảo",
    branch: "Quận 1",
  },
  {
    id: "PT00119",
    time: "06/09/2026",
    member: "Lê Minh Cường",
    ref: "DK005",
    method: "Tiền mặt",
    amount: 500000,
    status: "confirmed",
    by: "Trần Văn Bảo",
    branch: "Quận 1",
  },
]

export const CHECKIN_EVENTS: CheckInEvent[] = [
  {
    id: 1,
    time: "09:42",
    member: "Nguyễn Văn An",
    memberId: "HV001",
    direction: "in",
    pkg: "Gói 3 tháng",
    result: "ok",
    device: "Gate-Q1-01",
  },
  {
    id: 2,
    time: "09:38",
    member: "Phạm Thu Dung",
    memberId: "HV004",
    direction: "in",
    pkg: "Gói 6 tháng",
    result: "ok",
    device: "Gate-BT-01",
  },
  {
    id: 3,
    time: "09:21",
    member: "Bùi Thị Hoa",
    memberId: "HV008",
    direction: "in",
    pkg: "Gói 6 tháng",
    result: "expiring",
    device: "Gate-Q1-01",
  },
  {
    id: 4,
    time: "08:55",
    member: "Hoàng Đức Em",
    memberId: "HV005",
    direction: "in",
    pkg: "Gói 1 tháng",
    result: "expired",
    device: "Gate-Q1-01",
  },
  {
    id: 5,
    time: "08:30",
    member: "Vũ Thị Phương",
    memberId: "HV006",
    direction: "in",
    pkg: "Gói PT 10 buổi",
    result: "ok",
    device: "Gate-BT-01",
  },
  {
    id: 6,
    time: "07:58",
    member: "Lê Minh Cường",
    memberId: "HV003",
    direction: "in",
    pkg: "Gói 1 tháng",
    result: "expiring",
    device: "Gate-Q1-01",
  },
  {
    id: 7,
    time: "07:35",
    member: "Đặng Văn Giang",
    memberId: "HV007",
    direction: "in",
    pkg: "Gói 3 tháng",
    result: "manual",
    device: "Quầy lễ tân",
  },
  {
    id: 8,
    time: "07:01",
    member: "Nguyễn Văn An",
    memberId: "HV001",
    direction: "out",
    pkg: "Gói 3 tháng",
    result: "ok",
    device: "Gate-Q1-01",
  },
]

export const SESSIONS: Session[] = [
  {
    id: "LICH-001",
    date: "07/09/2026",
    time: "07:00",
    trainerId: "PT001",
    trainer: "Nguyễn Thành Long",
    memberId: "HV007",
    member: "Đặng Văn Giang",
    packageName: "PT 20 buổi",
    branch: "Quận 1",
    status: "done",
  },
  {
    id: "LICH-002",
    date: "07/09/2026",
    time: "08:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV012",
    member: "Đinh Thị Linh",
    packageName: "PT 20 buổi",
    branch: "Quận 1",
    status: "done",
  },
  {
    id: "LICH-003",
    date: "07/09/2026",
    time: "09:00",
    trainerId: "PT001",
    trainer: "Nguyễn Thành Long",
    memberId: "HV002",
    member: "Trần Thị Bình",
    packageName: "PT 20 buổi",
    branch: "Quận 1",
    status: "awaiting_confirmation",
    auditNote: "Chờ PT và hội viên cùng xác nhận buổi đã diễn ra.",
  },
  {
    id: "LICH-004",
    date: "07/09/2026",
    time: "10:00",
    trainerId: "PT003",
    trainer: "Lê Thị Ngọc",
    memberId: "HV008",
    member: "Bùi Thị Hoa",
    packageName: "PT 10 buổi",
    branch: "Bình Thạnh",
    status: "upcoming",
  },
  {
    id: "LICH-005",
    date: "07/09/2026",
    time: "11:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    branch: "Quận 1",
    status: "empty",
  },
  {
    id: "LICH-006",
    date: "07/09/2026",
    time: "14:00",
    trainerId: "PT001",
    trainer: "Nguyễn Thành Long",
    memberId: "HV015",
    member: "Tô Văn Phong",
    packageName: "PT 10 buổi",
    branch: "Quận 1",
    status: "upcoming",
  },
  {
    id: "LICH-007",
    date: "07/09/2026",
    time: "15:00",
    trainerId: "PT003",
    trainer: "Lê Thị Ngọc",
    memberId: "HV006",
    member: "Vũ Thị Phương",
    packageName: "PT 10 buổi",
    branch: "Bình Thạnh",
    status: "upcoming",
  },
  {
    id: "LICH-008",
    date: "07/09/2026",
    time: "16:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    branch: "Quận 1",
    status: "empty",
  },
  {
    id: "LICH-015",
    date: "11/09/2026",
    time: "10:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV012",
    member: "Đinh Thị Linh",
    packageName: "PT 20 buổi",
    branch: "Quận 1",
    status: "upcoming",
    auditNote: "Booking đã qua giờ 10:00–12:00; chờ xác nhận hoàn thành.",
  },
  {
    id: "LICH-012",
    date: "12/09/2026",
    time: "08:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV001",
    member: "Nguyễn Văn An",
    packageName: "PT 10 buổi",
    branch: "Quận 1",
    status: "upcoming",
    auditNote: "Booking còn hiệu lực; đã qua giờ tập, chờ xác nhận hoàn thành.",
  },
  {
    id: "LICH-013",
    date: "12/09/2026",
    time: "12:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV002",
    member: "Trần Thị Bình",
    packageName: "PT 20 buổi",
    branch: "Quận 1",
    status: "awaiting_confirmation",
    auditNote: "Chờ PT và hội viên cùng xác nhận sau buổi tập.",
  },
  {
    id: "LICH-014",
    date: "12/09/2026",
    time: "16:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV008",
    member: "Bùi Thị Hoa",
    packageName: "PT 10 buổi",
    branch: "Quận 1",
    status: "done",
    auditNote: "Đã xác nhận kép và trừ 1 buổi.",
  },
  {
    id: "LICH-009",
    date: "14/08/2026",
    time: "08:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV008",
    member: "Bùi Thị Hoa",
    packageName: "PT 10 buổi",
    branch: "Quận 1",
    status: "done",
    note: "Đã xác nhận đủ hai phía.",
  },
  {
    id: "LICH-010",
    date: "14/08/2026",
    time: "12:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV012",
    member: "Đinh Thị Linh",
    packageName: "PT 20 buổi",
    branch: "Quận 1",
    status: "awaiting_confirmation",
    auditNote: "Chờ PT và hội viên cùng xác nhận buổi đã diễn ra.",
  },
  {
    id: "LICH-011",
    date: "14/08/2026",
    time: "16:00",
    trainerId: "PT002",
    trainer: "Phạm Văn Mạnh",
    memberId: "HV014",
    member: "Vũ Hoàng Nam",
    packageName: "PT 10 buổi",
    branch: "Quận 1",
    status: "cancelled",
    cancelledAt: "13/08/2026 16:20",
    auditNote: "Hủy trước hạn 12 giờ; slot đã được release.",
  },
]

export const CARE_ITEMS: CareItem[] = [
  {
    id: "CS001",
    type: "expiring",
    title: "Gia hạn gói",
    member: "Trần Thị Bình",
    memberId: "HV002",
    detail: "Hết hạn 20/09 · Gói PT 20 buổi · Còn nợ 500.000 đ",
    status: "pending",
    owner: "Lê Thị Thanh Hà",
    created: "Hôm nay 08:00",
  },
  {
    id: "CS002",
    type: "expiring",
    title: "Nhắc sắp hết hạn",
    member: "Lê Minh Cường",
    memberId: "HV003",
    detail: "Hết hạn 10/09 · Gói 1 tháng · Còn 3 ngày",
    status: "pending",
    owner: "Lê Thị Thanh Hà",
    created: "Hôm nay 08:00",
  },
  {
    id: "CS003",
    type: "birthday",
    title: "Sinh nhật hôm nay",
    member: "Trịnh Thị Lan",
    memberId: "HV010",
    detail: "Gói 1 năm · Sinh nhật 07/09 · Đồng ý nhận lời chúc riêng",
    status: "pending",
    owner: "Hệ thống",
    created: "Hôm nay 07:00",
  },
  {
    id: "CS004",
    type: "birthday",
    title: "Sinh nhật hôm nay",
    member: "Mai Văn Khoa",
    memberId: "HV011",
    detail: "Gói 3 tháng · Sinh nhật 07/09",
    status: "sent",
    owner: "Hệ thống",
    created: "Hôm nay 07:00",
  },
  {
    id: "CS005",
    type: "debt",
    title: "Công nợ chưa thanh toán",
    member: "Hoàng Đức Em",
    memberId: "HV005",
    detail: "800.000 đ còn thiếu · Gói hết hạn 30/08",
    status: "followup",
    owner: "Trần Văn Bảo",
    created: "Hôm qua 09:00",
  },
  {
    id: "CS006",
    type: "schedule",
    title: "Lịch PT cần xác nhận",
    member: "Vũ Thị Phương",
    memberId: "HV006",
    detail: "Đổi lịch 15:00 sang 17:00 · Chờ PT phản hồi",
    status: "failed",
    owner: "Lê Thị Thanh Hà",
    created: "Hôm nay 09:12",
  },
]

export const BRANCHES: Branch[] = [
  {
    id: "CN01",
    name: "Chi nhánh Quận 1",
    address: "123 Lê Lai, P. Bến Thành, Q.1, TP.HCM",
    phone: "028 3911 2026",
    open: "06:00 - 22:00",
    members: 12,
    trainers: 2,
    status: "active",
  },
  {
    id: "CN02",
    name: "Chi nhánh Bình Thạnh",
    address: "456 Xô Viết Nghệ Tĩnh, P.25, Q. Bình Thạnh",
    phone: "028 3899 2026",
    open: "06:00 - 22:00",
    members: 8,
    trainers: 2,
    status: "active",
  },
]
