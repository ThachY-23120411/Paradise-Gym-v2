import { useMemo, useState, type ReactNode } from "react"
import type {
  AppSurface,
  CheckInEvent,
  Member,
  MemberStatus,
  MenuId,
  Registration,
  RegistrationStatus,
  Session,
  ThemeMode,
  WebRole,
} from "./data"
import {
  BRANCHES,
  CARE_ITEMS,
  CHECKIN_EVENTS,
  MEMBERS,
  PACKAGES,
  PAYMENTS,
  REGISTRATIONS,
  SESSIONS,
  SHORT_TODAY,
  TODAY_LABEL,
  TRAINERS,
} from "./data"
import type { ActionKind } from "./forms"
import {
  ActionButton,
  Avatar,
  CareBadge,
  CheckBadge,
  EmptyState,
  Ic,
  type IconName,
  IconButton,
  MemberBadge,
  MemberProfileStatusBadge,
  Modal,
  PackageBadge,
  palette,
  Panel,
  PaymentBadge,
  Pill,
  RegistrationBadge,
  Segment,
  SessionBadge,
  SurfaceSwitcher,
  ThemeToggle,
  fmtVND,
  shortMoney,
} from "./ui"

type ScreenProps = {
  role: WebRole
  branch: string
  openAction: (kind: ActionKind) => void
  openScheduleBooking?: (context?: { time?: string; trainerId?: string; date?: string }) => void
  onNavigateToSchedule?: (ptId: string) => void
  selectedPtIdForSchedule?: string | null
}

const NAV_ITEMS: {
  id: MenuId
  label: string
  icon: IconName
  adminOnly?: boolean
}[] = [
  { id: "W01", label: "Tổng quan", icon: "dashboard" },
  { id: "W02", label: "Hội viên & KH", icon: "users" },
  { id: "W03", label: "Gói tập", icon: "package", adminOnly: true },
  { id: "W04", label: "Đăng ký & gia hạn", icon: "signup" },
  { id: "W05", label: "Huấn luyện viên", icon: "trainer", adminOnly: true },
  { id: "W06", label: "Lịch tập & buổi PT", icon: "calendar" },
  { id: "W07", label: "Ra / Vào", icon: "checkin" },
  { id: "W08", label: "Thu tiền & công nợ", icon: "payment" },
  { id: "W09", label: "Chăm sóc & thông báo", icon: "care" },
  { id: "W10", label: "Báo cáo", icon: "report", adminOnly: true },
  { id: "W11", label: "Chi nhánh", icon: "branch", adminOnly: true },
  {
    id: "W12",
    label: "Hệ thống & thiết bị",
    icon: "settings",
    adminOnly: true,
  },
  {
    id: "W13",
    label: "Tài khoản & phân quyền",
    icon: "user",
    adminOnly: true,
  },
]

const SCREEN_TITLES: Record<MenuId, { title: string; sub: string }> = {
  W01: {
    title: "Tổng quan",
    sub: `${TODAY_LABEL} · dữ liệu demo theo chi nhánh`,
  },
  W02: {
    title: "Hội viên & khách hàng",
    sub: "Tìm kiếm, hồ sơ, gói, lịch PT, công nợ và lịch sử phục vụ",
  },
  W03: {
    title: "Gói tập",
    sub: "Danh mục gói Gym/PT, giá, thời hạn, số buổi và phạm vi áp dụng",
  },
  W04: {
    title: "Đăng ký & gia hạn",
    sub: "Tạo đăng ký, xử lý yêu cầu gia hạn và chuyển sang thu tiền",
  },
  W05: {
    title: "Huấn luyện viên",
    sub: "Hồ sơ PT, học viên phụ trách và lịch làm việc",
  },
  W06: {
    title: "Lịch tập & buổi PT",
    sub: "Đặt, đổi, hủy lịch và ghi nhận kết quả buổi tập",
  },
  W07: {
    title: "Ra / Vào",
    sub: "Theo dõi sự kiện thiết bị, xử lý ngoại lệ và màn hình chào mừng K01",
  },
  W08: {
    title: "Thu tiền & công nợ",
    sub: "Giao dịch thu, chờ đối soát, phiếu thu và khoản còn phải thu",
  },
  W09: {
    title: "Chăm sóc & thông báo",
    sub: "Nhắc hạn, sinh nhật, công nợ, trạng thái gửi và ghi nhận liên hệ",
  },
  W10: {
    title: "Báo cáo",
    sub: "Tiền thực thu, gói tập, ra/vào và hoạt động PT theo kỳ/chi nhánh",
  },
  W11: {
    title: "Chi nhánh",
    sub: "Thông tin chi nhánh, phạm vi hoạt động và liên kết dữ liệu vận hành",
  },
  W12: {
    title: "Hệ thống & thiết bị",
    sub: "Tài khoản, quyền, chính sách, thiết bị và nhật ký thao tác",
  },
  W13: {
    title: "Tài khoản & phân quyền",
    sub: "Quản lý tài khoản toàn hệ thống, gán vai trò, phân quyền chi nhánh và khóa/kích hoạt tài khoản",
  },
}

export function WebShell({
  surface,
  theme,
  onSurfaceChange,
  onThemeChange,
  openAction,
  openScheduleBooking,
}: {
  surface: AppSurface
  theme: ThemeMode
  onSurfaceChange: (surface: AppSurface) => void
  onThemeChange: (theme: ThemeMode) => void
  openAction: (kind: ActionKind) => void
  openScheduleBooking?: (context?: { time?: string; trainerId?: string; date?: string }) => void
}) {
  const role: WebRole =
    surface === "web-receptionist" ? "receptionist" : "admin"
  const [activeMenu, setActiveMenu] = useState<MenuId>("W01")
  const [selectedPtIdForSchedule, setSelectedPtIdForSchedule] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [branch, setBranch] = useState("Chi nhánh Quận 1")
  const visibleItems =
    role === "admin" ? NAV_ITEMS : NAV_ITEMS.filter((item) => !item.adminOnly)
  const currentMenu = visibleItems.some((item) => item.id === activeMenu)
    ? activeMenu
    : "W01"
  const info = SCREEN_TITLES[currentMenu]

  return (
    <div
      className="flex h-full overflow-hidden"
      style={{ background: palette.bg }}
    >
      <Sidebar
        active={currentMenu}
        items={visibleItems}
        collapsed={collapsed}
        role={role}
        onNav={setActiveMenu}
        onToggle={() => setCollapsed((value) => !value)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          title={info.title}
          subtitle={info.sub}
          role={role}
          branch={branch}
          onBranch={setBranch}
          surface={surface}
          theme={theme}
          onSurfaceChange={onSurfaceChange}
          onThemeChange={onThemeChange}
        />
        <main
          className="flex-1 overflow-auto"
          style={{ background: palette.bg }}
        >
          <ScreenContent
            menuId={currentMenu}
            role={role}
            branch={branch}
            openAction={openAction}
            openScheduleBooking={openScheduleBooking}
            onNavigateToSchedule={(ptId) => {
              setSelectedPtIdForSchedule(ptId)
              setActiveMenu("W06")
            }}
            selectedPtIdForSchedule={selectedPtIdForSchedule}
          />
        </main>
      </div>
    </div>
  )
}

function Sidebar({
  active,
  items,
  collapsed,
  role,
  onNav,
  onToggle,
}: {
  active: MenuId
  items: typeof NAV_ITEMS
  collapsed: boolean
  role: WebRole
  onNav: (id: MenuId) => void
  onToggle: () => void
}) {
  return (
    <aside
      className="app-chrome flex shrink-0 flex-col border-r transition-all duration-300"
      style={{
        width: collapsed ? 60 : 232,
        background: palette.rail,
        borderColor: "rgba(255,255,255,0.14)",
      }}
    >
      <div
        className="flex min-h-[60px] items-center gap-3 border-b px-3 py-4"
        style={{ borderColor: "rgba(255,255,255,0.14)" }}
      >
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "rgba(255,255,255,0.16)",
          }}
        >
          <span className="text-sm font-bold leading-none text-white">G</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <div className="truncate text-sm font-bold leading-tight text-white">
              GymPro
            </div>
            <div className="app-chrome-muted text-[11px] leading-tight">
              Quản lý phòng Gym
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {items.map((item) => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNav(item.id)}
              className="group relative mx-0 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 focus:outline-none focus:ring-2"
              style={{
                color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.72)",
                background: isActive ? "rgba(255,255,255,0.14)" : "transparent",
                ["--tw-ring-color" as string]: "#FFFFFF",
              }}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r"
                  style={{ background: "#FFFFFF" }}
                />
              )}
              <Ic k={item.icon} size={17} />
              {!collapsed && (
                <span className="truncate text-[14px] font-medium">
                  {item.label}
                </span>
              )}
              {!collapsed && item.id === "W09" && (
                <span
                  className="ml-auto flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold"
                  style={{ background: palette.red, color: "#fff" }}
                >
                  3
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div
        className="flex items-center gap-2.5 border-t p-3"
        style={{ borderColor: "rgba(255,255,255,0.14)" }}
      >
        <Avatar
          name={role === "admin" ? "Quản trị viên" : "Lê Thị Thanh Hà"}
          tone={palette.orange}
          size={32}
        />
        {!collapsed && (
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="truncate text-[13px] font-semibold text-white">
              {role === "admin" ? "Nguyễn Quản Lý" : "Lê Thị Thanh Hà"}
            </div>
            <div className="app-chrome-muted text-[11px]">
              {role === "admin"
                ? "Quản trị viên · Toàn chuỗi"
                : "Lễ tân · Quận 1"}
            </div>
          </div>
        )}
        {!collapsed && (
          <Ic
            k="logout"
            size={14}
            cls="shrink-0"
            style={{ color: "rgba(255,255,255,0.52)" }}
          />
        )}
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-center border-t py-2 transition-colors hover:bg-white/5"
        style={{
          borderColor: "rgba(255,255,255,0.14)",
          color: "rgba(255,255,255,0.72)",
        }}
        aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
      >
        <Ic k={collapsed ? "menu" : "chevLeft"} size={14} />
      </button>
    </aside>
  )
}

function TopBar({
  title,
  subtitle,
  branch,
  onBranch,
  surface,
  theme,
  onSurfaceChange,
  onThemeChange,
  role,
}: {
  title: string
  subtitle: string
  branch: string
  onBranch: (branch: string) => void
  surface: AppSurface
  theme: ThemeMode
  onSurfaceChange: (surface: AppSurface) => void
  onThemeChange: (theme: ThemeMode) => void
  role: WebRole
}) {
  const [open, setOpen] = useState(false)
  const branches = [
    "Chi nhánh Quận 1",
    "Chi nhánh Bình Thạnh",
    "Toàn bộ chi nhánh được cấp",
  ]

  return (
    <header
      className="app-chrome flex h-[68px] shrink-0 items-center gap-4 border-b px-6"
      style={{
        borderColor: "rgba(255,255,255,0.14)",
        background: palette.company,
      }}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[16px] font-bold leading-tight text-white">
          {title}
        </h1>
        <p className="app-chrome-muted truncate text-[13px]">
          {subtitle}
        </p>
      </div>

      <SurfaceSwitcher value={surface} onChange={onSurfaceChange} inverted />
      <ThemeToggle value={theme} onChange={onThemeChange} inverted />

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 focus:outline-none focus:ring-2"
          style={{
            background: "rgba(255,255,255,0.14)",
            borderColor: "rgba(255,255,255,0.28)",
            color: "#FFFFFF",
            ["--tw-ring-color" as string]: "#FFFFFF",
          }}
        >
          <Ic k="branch" size={14} />
          {role === "receptionist" ? "Chi nhánh Quận 1" : branch}
          <Ic k="chevDown" size={12} />
        </button>
        {open && role === "admin" && (
          <div
            className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-lg border shadow-xl"
            style={{ background: palette.shell, borderColor: palette.border }}
          >
            {branches.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  onBranch(item)
                  setOpen(false)
                }}
                className="w-full px-3 py-2.5 text-left text-[13px] transition-colors hover:bg-white/5"
                style={{ color: item === branch ? palette.green : palette.muted }}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      <IconButton icon="bell" label="Thông báo" inverted />
      <div className="app-chrome-muted text-[13px] font-mono">
        {SHORT_TODAY}
      </div>
    </header>
  )
}

function ScreenContent({ menuId, ...props }: ScreenProps & { menuId: MenuId }) {
  switch (menuId) {
    case "W01":
      return <DashboardView {...props} />
    case "W02":
      return <MembersView {...props} />
    case "W03":
      return <PackagesView {...props} />
    case "W04":
      return <RegistrationsView {...props} />
    case "W05":
      return <TrainersView {...props} />
    case "W06":
      return <ScheduleView {...props} />
    case "W07":
      return <CheckInView {...props} />
    case "W08":
      return <PaymentsView {...props} />
    case "W09":
      return <CareView {...props} />
    case "W10":
      return <ReportsView {...props} />
    case "W11":
      return <BranchesView {...props} />
    case "W12":
      return <SystemView {...props} />
    case "W13":
      return <AccountPermissionsView {...props} />
    default:
      return null
  }
}

function AccountPermissionsView({ openAction }: ScreenProps) {
  const [query, setQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("Tất cả")
  const [statusFilter, setStatusFilter] = useState("Tất cả")

  const accounts = [
    { phone: "0901 234 567", name: "Nguyễn Văn An", role: "Hội viên", branch: "Quận 1", status: "ACTIVE", profile: "HV001" },
    { phone: "0908 111 222", name: "Nguyễn Hoài Nam", role: "Hội viên", branch: "Quận 1", status: "ACTIVE", profile: "HV002" },
    { phone: "0912 345 678", name: "Trần Thị Bình", role: "Hội viên", branch: "Bình Thạnh", status: "LOCKED", profile: "HV003" },
    { phone: "0903 888 999", name: "Lê Thị Thanh Hà", role: "Lễ tân", branch: "Quận 1", status: "ACTIVE", profile: "NV001" },
    { phone: "0904 777 666", name: "Phạm Quốc Bảo", role: "PT (Huấn luyện viên)", branch: "Quận 1", status: "ACTIVE", profile: "PT001" },
    { phone: "0909 999 000", name: "Đặng Văn Hùng", role: "QTV (Quản trị viên)", branch: "Toàn hệ thống", status: "ACTIVE", profile: "QTV001" },
    { phone: "0933 222 111", name: "Lê Văn Tùng", role: "Hội viên", branch: "Quận 1", status: "PENDING_ACTIVATION", profile: "HV004" },
    { phone: "0977 444 555", name: "Hoàng Minh Đức", role: "PT (Huấn luyện viên)", branch: "Bình Thạnh", status: "INACTIVE", profile: "PT002" },
  ]

  const activeCount = accounts.filter((a) => a.status === "ACTIVE").length
  const pendingCount = accounts.filter((a) => a.status === "PENDING_ACTIVATION").length
  const lockedCount = accounts.filter((a) => a.status === "LOCKED" || a.status === "INACTIVE").length

  const filtered = accounts.filter((acc) => {
    const matchQ = !query || acc.phone.includes(query) || acc.name.toLowerCase().includes(query.toLowerCase())
    const matchR = roleFilter === "Tất cả" || acc.role.includes(roleFilter)
    const matchS = statusFilter === "Tất cả" || acc.status === statusFilter
    return matchQ && matchR && matchS
  })

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Stat Overview Cards */}
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <KpiCard label="Tổng tài khoản hệ thống" value={accounts.length} sub="Định danh SĐT duy nhất" icon="users" accent={palette.blue} />
        <KpiCard label="Tài khoản đang Hoạt động" value={activeCount} sub="Có thể đăng nhập hệ thống" icon="check" accent={palette.green} />
        <KpiCard label="Tài khoản Chờ kích hoạt" value={pendingCount} sub="Chưa xác thực OTP/mật khẩu" icon="warn" accent={palette.amber} />
        <KpiCard label="Tài khoản Đã khóa / Tạm dừng" value={lockedCount} sub="Bị khóa hoặc ngưng sử dụng" icon="logout" accent={palette.red} />
      </div>

      {/* Main Table Panel */}
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-4" style={{ borderColor: palette.border }}>
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            <SearchBox value={query} onChange={setQuery} placeholder="Tìm SĐT đăng nhập, Tên người dùng..." />
            
            {/* Role Filter Pills with Counts */}
            <div className="flex items-center gap-1 rounded-lg border p-1" style={{ background: palette.control, borderColor: palette.border }}>
              {[
                { key: "Tất cả", label: "Tất cả", count: accounts.length },
                { key: "QTV", label: "QTV", count: accounts.filter(a => a.role.includes("QTV")).length },
                { key: "Lễ tân", label: "Lễ tân", count: accounts.filter(a => a.role.includes("Lễ tân")).length },
                { key: "PT", label: "PT", count: accounts.filter(a => a.role.includes("PT")).length },
                { key: "Hội viên", label: "Hội viên", count: accounts.filter(a => a.role.includes("Hội viên")).length },
              ].map((r) => {
                const active = roleFilter === r.key
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setRoleFilter(r.key)}
                    className="rounded-md px-2.5 py-1 text-[12px] font-semibold transition cursor-pointer"
                    style={{
                      background: active ? palette.green : "transparent",
                      color: active ? "#ffffff" : palette.muted,
                    }}
                  >
                    {r.label} ({r.count})
                  </button>
                )
              })}
            </div>

            {/* Status Filter Combobox (Dynamic Light/Dark Theme palette) */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border py-2 px-3 text-[13px] font-semibold outline-none cursor-pointer transition"
              style={{
                background: palette.control,
                borderColor: palette.border,
                color: palette.text,
              }}
            >
              <option value="Tất cả" style={{ background: palette.panel, color: palette.text }}>Trạng thái: Tất cả</option>
              <option value="ACTIVE" style={{ background: palette.panel, color: palette.text }}>Trạng thái: Active</option>
              <option value="PENDING_ACTIVATION" style={{ background: palette.panel, color: palette.text }}>Trạng thái: Pending</option>
              <option value="LOCKED" style={{ background: palette.panel, color: palette.text }}>Trạng thái: Locked</option>
              <option value="INACTIVE" style={{ background: palette.panel, color: palette.text }}>Trạng thái: Inactive</option>
            </select>
          </div>

        </div>

        {/* Account Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b font-medium" style={{ borderColor: palette.border, color: palette.muted }}>
                <th className="py-3 px-3">SĐT Đăng nhập</th>
                <th className="py-3 px-3">Người sử dụng</th>
                <th className="py-3 px-3">Vai trò (Role)</th>
                <th className="py-3 px-3">Chi nhánh áp dụng</th>
                <th className="py-3 px-3">Trạng thái</th>
                <th className="py-3 px-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((acc) => (
                <tr key={acc.phone} className="hover:bg-white/5 transition">
                  <td className="py-3 px-3 font-mono font-bold" style={{ color: palette.text }}>{acc.phone}</td>
                  <td className="py-3 px-3 font-semibold" style={{ color: palette.text }}>
                    {acc.name}
                    {acc.profile && (
                      <span className="block text-[11px] font-mono font-normal" style={{ color: palette.dim }}>
                        Hồ sơ: {acc.profile}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex max-w-[190px] flex-wrap gap-1.5">
                      {acc.role.split(/\s*[,|+]\s*/).filter(Boolean).map((role) => (
                        <Pill
                          key={role}
                          tone={
                            role.includes("QTV")
                              ? "red"
                              : role.includes("Lễ tân") || role.includes("RECEPTIONIST")
                              ? "blue"
                              : role.includes("PT")
                              ? "purple"
                              : "green"
                          }
                        >
                          {role.trim()}
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3" style={{ color: palette.muted }}>{acc.branch}</td>
                  <td className="py-3 px-3">
                    {acc.status === "ACTIVE" ? (
                      <Pill tone="green">Hoạt động</Pill>
                    ) : acc.status === "PENDING_ACTIVATION" ? (
                      <Pill tone="amber">Chờ kích hoạt</Pill>
                    ) : acc.status === "LOCKED" ? (
                      <Pill tone="red">Đã khóa</Pill>
                    ) : (
                      <Pill tone="slate">Ngừng sử dụng</Pill>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <ActionButton
                      variant="secondary"
                      icon="edit"
                      onClick={() => openAction("account-edit")}
                    >
                      Sửa
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function DashboardView({ role, openAction }: ScreenProps) {
  const activeMembers = MEMBERS.filter(
    (member) => member.status === "active",
  ).length
  const expiring = MEMBERS.filter(
    (member) => member.status === "expiring",
  ).length
  const todayIncome = PAYMENTS.filter(
    (payment) => payment.status === "confirmed",
  ).reduce((sum, payment) => sum + payment.amount, 0)
  const upcoming = SESSIONS.filter(
    (session) => session.status === "upcoming",
  ).length
  const tasks = CARE_ITEMS.filter((item) => item.status !== "sent").slice(0, 4)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <KpiCard
          label="Hội viên đang hoạt động"
          value={activeMembers}
          sub="Không gộp với trạng thái thanh toán"
          icon="users"
          accent={palette.blue}
        />
        {role === "admin" && (
          <KpiCard
            label="Tiền thực thu hôm nay"
            value={fmtVND(todayIncome)}
            sub="Giao dịch đã xác nhận"
            icon="payment"
            accent={palette.green}
          />
        )}
        <KpiCard
          label="Gói sắp hết hạn"
          value={expiring}
          sub="Trong 14 ngày tới"
          icon="warn"
          accent={palette.amber}
        />
        <KpiCard
          label="Buổi PT hôm nay"
          value={SESSIONS.length}
          sub={`${upcoming} buổi sắp tới`}
          icon="calendar"
          accent={palette.purple}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Cần xử lý hôm nay"
          subtitle="Bấm việc để mở đúng hồ sơ hoặc form xử lý"
          action={
            <ActionButton
              variant="secondary"
              icon="care"
              onClick={() => openAction("contact-log")}
            >
              Ghi nhận
            </ActionButton>
          }
        >
          <div
            className="divide-y"
            style={{ ["--tw-divide-color" as string]: palette.border }}
          >
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() =>
                  openAction(
                    task.type === "debt" ? "payment-form" : "contact-log",
                  )
                }
                className="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-white/3"
              >
                <TaskIcon type={task.type} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {task.title} · {task.member}
                  </div>
                  <div className="text-[12px]" style={{ color: palette.dim }}>
                    {task.detail}
                  </div>
                </div>
                <CareBadge status={task.status} />
              </button>
            ))}
          </div>
        </Panel>

        <Panel
          title="Ra/vào gần đây"
          subtitle="Phân biệt nhận diện, điều kiện gói và ghi thủ công"
          action={
            <ActionButton
              variant="secondary"
              icon="scan"
              onClick={() => openAction("manual-checkin")}
            >
              Thủ công
            </ActionButton>
          }
        >
          <div
            className="divide-y"
            style={{ ["--tw-divide-color" as string]: palette.border }}
          >
            {CHECKIN_EVENTS.slice(0, 6).map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-2.5">
                <div
                  className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                  style={{
                    background:
                      event.direction === "in"
                        ? "rgba(16,185,129,0.12)"
                        : "rgba(100,116,139,0.12)",
                    color: event.direction === "in" ? palette.green : "#64748B",
                  }}
                >
                  {event.direction === "in" ? "VÀO" : "RA"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-white">
                    {event.member}
                  </div>
                  <div className="text-[11px]" style={{ color: palette.dim }}>
                    {event.memberId} · {event.pkg} · {event.device}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-mono text-[12px]"
                    style={{ color: palette.muted }}
                  >
                    {event.time}
                  </div>
                  <CheckBadge result={event.result} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title={`Lịch PT hôm nay · ${TODAY_LABEL}`}
        action={
          <ActionButton
            icon="plus"
            onClick={() => openAction("schedule-booking")}
          >
            Đặt lịch
          </ActionButton>
        }
      >
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {SESSIONS.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() =>
                openAction(
                  session.status === "empty"
                    ? "schedule-booking"
                    : "session-result",
                )
              }
              className="rounded-lg border p-3 text-left transition-colors hover:bg-white/3"
              style={{
                borderColor:
                  session.status === "empty"
                    ? "#243149"
                    : `${sessionColor(session.status)}44`,
                background:
                  session.status === "empty"
                    ? "rgba(255,255,255,0.02)"
                    : `${sessionColor(session.status)}10`,
              }}
            >
              <div
                className="font-mono text-[12px] font-semibold"
                style={{ color: sessionColor(session.status) }}
              >
                {session.time}
              </div>
              <div className="mt-1 truncate text-[13px] font-semibold text-white">
                {session.member ?? "Khung trống"}
              </div>
              <div
                className="truncate text-[11px]"
                style={{ color: palette.dim }}
              >
                {session.trainer}
              </div>
              <div className="mt-2">
                <SessionBadge status={session.status} />
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function MembersView({ role, openAction }: ScreenProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<MemberStatus | "all">("all")
  const [selected, setSelected] = useState<Member | null>(MEMBERS[0])
  const [selectedPkgIndex, setSelectedPkgIndex] = useState<Record<string, number>>({})

  const filtered = useMemo(() => {
    return MEMBERS.filter((member) => {
      const cleanSearch = search.toLowerCase().replace(/\s/g, "")
      const matchSearch =
        !cleanSearch ||
        member.name.toLowerCase().includes(search.toLowerCase()) ||
        member.phone.replace(/\s/g, "").includes(cleanSearch) ||
        member.id.toLowerCase().includes(cleanSearch)
      const matchStatus =
        statusFilter === "all" || member.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const tabs: { value: MemberStatus | "all"; label: string }[] = [
    { value: "all", label: `Tất cả (${MEMBERS.length})` },
    { value: "active", label: "Đang tập" },
    { value: "expiring", label: "Sắp hết hạn" },
    { value: "expired", label: "Hết hạn" },
    { value: "none", label: "Chưa gói" },
  ]

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tên, mã HV, số điện thoại..."
          />
          <Segment
            value={statusFilter}
            options={tabs}
            onChange={setStatusFilter}
          />
          <ActionButton icon="plus" onClick={() => openAction("member-create")}>
            Thêm hội viên
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon="export"
            onClick={() => openAction("report-export")}
          >
            Xuất
          </ActionButton>
        </Toolbar>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[880px] text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr
                style={{
                  background: "#0C1120",
                  borderBottom: `1px solid ${palette.borderSoft}`,
                }}
              >
                {[
                  "Mã HV",
                  "Họ và tên",
                  "Số điện thoại",
                  "Email",
                  "Chi nhánh",
                  "Trạng thái hồ sơ",
                  "",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left font-semibold"
                    style={{ color: palette.dim }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ ["--tw-divide-color" as string]: palette.borderSoft }}
            >
              {filtered.map((member) => {
                return (
                  <tr
                    key={member.id}
                    className="cursor-pointer transition-colors hover:bg-white/3"
                    onClick={() => setSelected(member)}
                    style={{
                      background:
                        selected?.id === member.id
                          ? "rgba(22,163,74,0.05)"
                          : undefined,
                    }}
                  >
                    <td
                      className="px-4 py-3 font-mono"
                      style={{ color: palette.muted }}
                    >
                      {member.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar
                          name={member.name}
                          tone={palette.blue}
                          size={30}
                        />
                        <div className="font-semibold text-white">
                          {member.name}
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 font-mono"
                      style={{ color: palette.text }}
                    >
                      {member.phone}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: palette.muted }}
                    >
                      {member.email ?? "Chưa cập nhật"}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: palette.text }}
                    >
                      {member.branch}
                    </td>
                    <td className="px-4 py-3">
                      <MemberProfileStatusBadge
                        status={member.profileStatus ?? "active"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <IconButton
                          icon="eye"
                          label="Xem hồ sơ"
                          onClick={() => setSelected(member)}
                        />
                        <IconButton
                          icon="edit"
                          label="Chỉnh sửa"
                          onClick={() => openAction("member-update")}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-6">
              <EmptyState
                title="Không tìm thấy hội viên"
                detail="Bộ lọc đang giữ nguyên để bạn có thể xóa hoặc thêm hồ sơ mới từ cùng ngữ cảnh."
                action={
                  <ActionButton
                    icon="plus"
                    onClick={() => openAction("member-create")}
                  >
                    Thêm hội viên
                  </ActionButton>
                }
              />
            </div>
          )}
        </div>
      </div>

      {selected && (
        <aside
          className="flex w-80 shrink-0 flex-col overflow-y-auto border-l"
          style={{
            background: palette.panelSoft,
            borderColor: palette.borderSoft,
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: palette.borderSoft }}
          >
            <span className="text-[14px] font-semibold text-white">
              Hồ sơ hội viên (US04)
            </span>
            <IconButton
              icon="x"
              label="Đóng hồ sơ"
              onClick={() => setSelected(null)}
            />
          </div>
          <div className="flex flex-col gap-4 p-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <Avatar name={selected.name} tone={palette.blue} size={64} />
              <div className="text-center">
                <div className="font-bold text-white">{selected.name}</div>
                <div
                  className="font-mono text-[12px]"
                  style={{ color: palette.dim }}
                >
                  {selected.id}
                </div>
              </div>
              <MemberProfileStatusBadge
                status={selected.profileStatus ?? "active"}
              />
            </div>

            <InfoStack
              items={[
                ["Số điện thoại", selected.phone],
                ["Email", selected.email ?? "Chưa có"],
                ["Chi nhánh tiếp nhận", selected.branch],
                ["Lần ghé gần nhất", selected.lastVisit ?? "Chưa ghi nhận"],
                [
                  "Công nợ",
                  fmtVND(selected.debt),
                  selected.debt > 0 ? palette.red : undefined,
                ],
              ]}
            />

            {(() => {
              const memberPackages = selected.packages ?? [
                {
                  name: selected.packageName,
                  type: selected.sessionsLeft ? "PT" : ("Gym" as const),
                  validUntil: selected.validUntil,
                  sessionsLeft: selected.sessionsLeft,
                  status: selected.status,
                },
              ]
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[12px] font-bold tracking-wider text-white uppercase">
                      📦 Các gói đang sở hữu ({memberPackages.length})
                    </span>
                  </div>
                  <div className="space-y-2">
                    {memberPackages.map((pkg, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border p-3"
                        style={{
                          background: palette.panel,
                          borderColor: palette.border,
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-white text-[13px]">
                            {pkg.name}
                          </span>
                          <MemberBadge status={pkg.status} />
                        </div>
                        <div
                          className="mt-2 flex items-center justify-between border-t pt-2 text-[12px]"
                          style={{
                            borderColor: palette.borderSoft,
                            color: palette.muted,
                          }}
                        >
                          <span>
                            {pkg.type === "PT" ? "Số buổi PT" : "Thời hạn dùng"}
                          </span>
                          <span className="font-mono font-medium text-white">
                            {pkg.sessionsLeft !== undefined &&
                            pkg.sessionsLeft !== null
                              ? `Còn ${pkg.sessionsLeft} buổi`
                              : pkg.validUntil}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            <div className="grid gap-2">
              <ActionButton
                block
                icon="signup"
                onClick={() => openAction("registration-form")}
              >
                Đăng ký / gia hạn
              </ActionButton>
              <ActionButton
                block
                variant="secondary"
                icon="calendar"
                onClick={() => openAction("schedule-booking")}
              >
                Đặt lịch PT
              </ActionButton>
              <ActionButton
                block
                variant="secondary"
                icon="care"
                onClick={() => openAction("contact-log")}
              >
                Ghi nhận chăm sóc
              </ActionButton>
              <ActionButton
                block
                variant="secondary"
                icon="settings"
                onClick={() => openAction("member-status")}
              >
                Đổi trạng thái hồ sơ
              </ActionButton>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}

function PackagesView({ openAction }: ScreenProps) {
  const [filter, setFilter] = useState<"all" | "selling" | "stopped">("all")
  const shown = PACKAGES.filter(
    (pkg) => filter === "all" || pkg.status === filter,
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Segment
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Tất cả" },
            { value: "selling", label: "Đang bán" },
            { value: "stopped", label: "Ngừng bán" },
          ]}
        />
        <ActionButton icon="plus" onClick={() => openAction("package-create")}>
          Tạo gói mới
        </ActionButton>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
        {shown.map((pkg) => (
          <Panel key={pkg.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold text-white">
                  {pkg.name}
                </div>
                <div
                  className="mt-0.5 text-[11px]"
                  style={{ color: palette.dim }}
                >
                  {pkg.id} · {pkg.service} ·{" "}
                  {pkg.limitType === "time"
                    ? "Theo thời gian"
                    : pkg.limitType === "session"
                      ? "Theo buổi"
                      : "Thời gian + buổi"}
                </div>
              </div>
              <PackageBadge status={pkg.status} />
            </div>
            <div
              className="mt-3 text-2xl font-bold"
              style={{ color: palette.orange }}
            >
              {fmtVND(pkg.price)}
            </div>
            <div className="mt-1 text-[13px]" style={{ color: palette.muted }}>
              {pkg.limitType === "hybrid"
                ? `Thời hạn: ${pkg.duration} · PT: ${pkg.sessions} buổi`
                : pkg.duration
                  ? `Thời hạn: ${pkg.duration}`
                  : `Số buổi: ${pkg.sessions} buổi PT`}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.dim }}>
              Áp dụng: {pkg.branches.join(", ")}
            </div>
            <div
              className="mt-4 flex gap-2 border-t pt-3"
              style={{ borderColor: palette.border }}
            >
              <ActionButton
                variant="secondary"
                icon="edit"
                onClick={() => openAction("package-update")}
              >
                Sửa
              </ActionButton>
              <ActionButton
                variant={pkg.status === "selling" ? "danger" : "secondary"}
                onClick={() => openAction("package-update")}
              >
                {pkg.status === "selling" ? "Ngừng bán" : "Mở bán lại"}
              </ActionButton>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function RegistrationsView({ openAction }: ScreenProps) {
  const [filter, setFilter] = useState<"ALL" | RegistrationStatus>("ALL")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedReg, setSelectedReg] = useState<Registration | null>(REGISTRATIONS[1]) // Default select DK002

  const rows = REGISTRATIONS.filter((item) => {
    if (filter !== "ALL" && item.status !== filter) return false
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim()
      const memberObj = MEMBERS.find((m) => m.id === item.memberId || m.name === item.member)
      const phone = memberObj ? memberObj.phone : ""
      const cleanQ = q.replace(/\s+/g, "")
      const matchName = item.member.toLowerCase().includes(q)
      const matchMemberId = item.memberId.toLowerCase().includes(q)
      const matchRegId = item.id.toLowerCase().includes(q)
      const matchPhone = phone.replace(/\s+/g, "").includes(cleanQ)
      return matchName || matchMemberId || matchRegId || matchPhone
    }
    return true
  })

  // Calculate usage stats mock helper
  const getUsageDetails = (reg: Registration) => {
    const isPtPackage = reg.packageName.includes("PT")
    const isCombo = reg.packageName.includes("Combo")
    const isGym = !isPtPackage || isCombo

    let ptStats = null
    if (isPtPackage || isCombo) {
      const totalSessions = reg.packageName.includes("20") ? 20 : 10
      // Business rule: if PENDING_PAYMENT, sessions used = 0!
      const usedSessions = reg.status === "PENDING_PAYMENT" ? 0 : reg.status === "EXHAUSTED" ? totalSessions : reg.id === "DK006" ? 8 : 4
      ptStats = { total: totalSessions, used: usedSessions, remaining: totalSessions - usedSessions }
    }

    let gymStats = null
    if (isGym) {
      const totalDays = reg.packageName.includes("1 năm") ? 365 : reg.packageName.includes("6 tháng") ? 180 : reg.packageName.includes("3 tháng") ? 90 : 30
      const usedDays = reg.status === "PENDING_PAYMENT" ? 0 : reg.status === "EXPIRED" ? totalDays : reg.id === "DK001" ? 57 : reg.id === "DK004" ? 26 : reg.id === "DK005" ? 172 : 12
      gymStats = { total: totalDays, used: usedDays, remaining: Math.max(0, totalDays - usedDays) }
    }

    return { ptStats, gymStats }
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar>
        <Segment
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "Tất cả" },
            { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
            { value: "SCHEDULED", label: "Sắp hiệu lực" },
            { value: "ACTIVE", label: "Đang hiệu lực" },
            { value: "EXPIRED", label: "Hết hạn" },
            { value: "EXHAUSTED", label: "Đã dùng hết" },
            { value: "CANCELLED", label: "Đã hủy" },
          ]}
        />
        <div className="relative min-w-[200px] max-w-[260px] flex-1">
          <input
            type="text"
            placeholder="🔍 Tìm theo SĐT, Tên, Mã HV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 w-full rounded-lg border px-3 text-[12px] transition-colors focus:border-purple-500 focus:outline-none"
            style={{
              background: palette.control,
              borderColor: palette.border,
              color: palette.text,
            }}
          />
        </div>
        <ActionButton
          icon="plus"
          onClick={() => openAction("registration-create")}
        >
          Tạo đăng ký
        </ActionButton>
      </Toolbar>

      <div className="flex flex-1 overflow-hidden">
        {/* Left DataGrid */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[950px] text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr
                style={{
                  background: palette.shell,
                  borderBottom: `1px solid ${palette.border}`,
                }}
              >
                {[
                  "Mã",
                  "Hội viên",
                  "Gói đăng ký",
                  "Kỳ hiệu lực",
                  "Phải thu",
                  "Đã thu",
                  "Còn thiếu",
                  "PT phụ trách",
                  "Trạng thái",
                  "Thao tác",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-3.5 py-3 text-left font-semibold"
                    style={{ color: palette.dim }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ ["--tw-divide-color" as string]: palette.borderSoft }}
            >
              {rows.map((reg) => {
                const isSelected = selectedReg?.id === reg.id
                const debt = reg.total - reg.paid
                return (
                  <tr
                    key={reg.id}
                    onClick={() => setSelectedReg(reg)}
                    className="cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      background: isSelected ? "rgba(16, 185, 129, 0.12)" : undefined,
                    }}
                  >
                    <td
                      className="px-3.5 py-3 font-mono font-medium"
                      style={{ color: isSelected ? palette.green : palette.muted }}
                    >
                      {reg.id}
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold" style={{ color: palette.text }}>{reg.member}</div>
                      <div style={{ color: palette.dim }}>
                        {reg.memberId} · {reg.branch}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 font-medium" style={{ color: palette.text }}>{reg.packageName}</td>
                    <td className="px-3.5 py-3 font-mono text-[12px]" style={{ color: palette.muted }}>
                      {reg.from} → {reg.to}
                    </td>
                    <td className="px-3.5 py-3 font-mono" style={{ color: palette.muted }}>
                      {fmtVND(reg.total)}
                    </td>
                    <td
                      className="px-3.5 py-3 font-mono font-medium"
                      style={{
                        color: reg.paid < reg.total ? palette.amber : palette.green,
                      }}
                    >
                      {fmtVND(reg.paid)}
                    </td>
                    <td className="px-3.5 py-3 font-mono font-bold" style={{ color: debt > 0 ? palette.red : palette.muted }}>
                      {debt > 0 ? fmtVND(debt) : "0 đ"}
                    </td>
                    <td className="px-3.5 py-3" style={{ color: palette.muted }}>
                      {reg.pt ?? "—"}
                    </td>
                    <td className="px-3.5 py-3">
                      <RegistrationBadge status={reg.status} />
                    </td>
                    <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {reg.status === "PENDING_PAYMENT" && (
                          <>
                            <ActionButton
                              variant="warning"
                              onClick={() => openAction("payment-form")}
                            >
                              Thu tiền
                            </ActionButton>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="rounded-lg px-2 py-1 text-[12px] font-medium transition-all"
                              style={{ color: palette.muted }}
                            >
                              Chi tiết
                            </button>
                          </>
                        )}

                        {reg.status === "SCHEDULED" && (
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="rounded-lg px-2.5 py-1 text-[12px] font-medium border hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ color: palette.text, borderColor: palette.border }}
                          >
                            Chi tiết
                          </button>
                        )}

                        {reg.status === "ACTIVE" && (
                          <>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="rounded-lg px-2 py-1 text-[12px] font-medium hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: palette.muted }}
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => openAction("registration-renew")}
                              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                            >
                              Gia hạn
                            </button>
                          </>
                        )}

                        {reg.status === "EXPIRED" && (
                          <>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="rounded-lg px-2 py-1 text-[12px] font-medium hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: palette.muted }}
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => openAction("registration-renew")}
                              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20"
                            >
                              Gia hạn / Mua lại
                            </button>
                          </>
                        )}

                        {reg.status === "EXHAUSTED" && (
                          <>
                            <button
                              onClick={() => setSelectedReg(reg)}
                              className="rounded-lg px-2 py-1 text-[12px] font-medium hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ color: palette.muted }}
                            >
                              Chi tiết
                            </button>
                            <button
                              onClick={() => openAction("registration-renew")}
                              className="rounded-lg px-2.5 py-1 text-[12px] font-semibold text-purple-600 bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20"
                            >
                              Mua thêm / Gia hạn
                            </button>
                          </>
                        )}

                        {reg.status === "CANCELLED" && (
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="rounded-lg px-2.5 py-1 text-[12px] font-medium border"
                            style={{ color: palette.dim, borderColor: palette.border }}
                          >
                            Chi tiết
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Right Detail Panel / Sidebar */}
        {selectedReg && (
          <div
            className="w-[380px] border-l p-4 overflow-y-auto flex flex-col gap-4 shadow-xl"
            style={{
              borderColor: palette.border,
              background: palette.panel,
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: palette.border }}>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] font-bold" style={{ color: palette.green }}>
                    {selectedReg.id}
                  </span>
                  <RegistrationBadge status={selectedReg.status} />
                </div>
                <h3 className="text-[15px] font-bold leading-tight mt-1" style={{ color: palette.text }}>
                  Chi tiết Lượt Đăng ký Gói
                </h3>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="text-[12px] px-2 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10"
                style={{ color: palette.muted }}
              >
                ✕ Đóng
              </button>
            </div>

            {/* 1. Member Profile & Renewal History */}
            <div
              className="rounded-xl p-3.5 flex flex-col gap-2"
              style={{ background: palette.control, border: `1px solid ${palette.border}` }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={selectedReg.member} tone={palette.green} size={42} />
                <div>
                  <div className="font-bold text-[14px]" style={{ color: palette.text }}>{selectedReg.member}</div>
                  <div className="text-[12px] font-mono" style={{ color: palette.muted }}>
                    Mã HV: {selectedReg.memberId} · {selectedReg.branch}
                  </div>
                </div>
              </div>
              {selectedReg.renewedFrom && (
                <div className="mt-1 pt-2 border-t flex items-center justify-between text-[11px]" style={{ borderColor: palette.border }}>
                  <span style={{ color: palette.muted }}>Lịch sử gia hạn:</span>
                  <span className="font-mono font-semibold bg-emerald-500/10 px-2 py-0.5 rounded" style={{ color: palette.green }}>
                    Nối tiếp từ {selectedReg.renewedFrom}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Package Title & Scope */}
            <div
              className="rounded-xl p-3.5 flex flex-col gap-2"
              style={{ background: "rgba(16, 185, 129, 0.08)", border: `1px solid rgba(16, 185, 129, 0.25)` }}
            >
              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: palette.green }}>
                Gói dịch vụ
              </div>
              <div className="text-[16px] font-extrabold" style={{ color: palette.text }}>
                {selectedReg.packageName}
              </div>
              <div className="flex items-center justify-between text-[12px] pt-1 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                <span style={{ color: palette.muted }}>Kỳ hiệu lực:</span>
                <span className="font-mono font-medium" style={{ color: palette.text }}>{selectedReg.from} → {selectedReg.to}</span>
              </div>
            </div>

            {/* 3. Payment Status & Financial Breakdown */}
            <div
              className="rounded-xl p-3.5 flex flex-col gap-2.5"
              style={{ background: palette.control, border: `1px solid ${palette.border}` }}
            >
              <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: palette.text }}>
                Tài chính & Công nợ hợp đồng
              </div>

              <div className="flex justify-between text-[13px]">
                <span style={{ color: palette.muted }}>Tổng tiền phải thu:</span>
                <span className="font-mono font-bold" style={{ color: palette.text }}>{fmtVND(selectedReg.total)}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span style={{ color: palette.muted }}>Đã thanh toán:</span>
                <span className="font-mono font-bold" style={{ color: palette.green }}>{fmtVND(selectedReg.paid)}</span>
              </div>

              <div className="pt-2 border-t flex justify-between items-center text-[13px]" style={{ borderColor: palette.border }}>
                <span style={{ color: palette.muted }}>Còn thiếu (Công nợ):</span>
                {selectedReg.total - selectedReg.paid > 0 ? (
                  <span className="font-mono font-bold" style={{ color: palette.amber }}>
                    {fmtVND(selectedReg.total - selectedReg.paid)}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold bg-emerald-500/10 px-2 py-0.5 rounded" style={{ color: palette.green }}>
                    Đã thu 100%
                  </span>
                )}
              </div>
            </div>

            {/* 4. Entitlements & Usage Stats */}
            {(() => {
              const { ptStats, gymStats } = getUsageDetails(selectedReg)
              return (
                <div className="flex flex-col gap-3">
                  <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: palette.text }}>
                    Quyền lợi & Tiến độ sử dụng
                  </div>

                  {selectedReg.status === "PENDING_PAYMENT" ? (
                    <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-[12px] leading-relaxed" style={{ color: palette.amber }}>
                      ⚠️ <strong>Gói chưa kích hoạt:</strong> Do chưa hoàn thành nghĩa vụ thanh toán, hội viên chưa được phép sử dụng gói này để Check-in hoặc Booking PT.
                    </div>
                  ) : (
                    <>
                      {/* Gym Entitlement Section */}
                      {gymStats && (
                        <div
                          className="rounded-xl p-3 flex flex-col gap-2"
                          style={{ background: palette.control, border: `1px solid ${palette.border}` }}
                        >
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-semibold" style={{ color: palette.text }}>🏋️ Quyền tập Gym:</span>
                            <span className="font-mono font-bold" style={{ color: palette.green }}>Còn {gymStats.remaining} ngày</span>
                          </div>
                          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((gymStats.used / gymStats.total) * 100))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px]" style={{ color: palette.muted }}>
                            <span>Đã trôi qua: {gymStats.used} ngày</span>
                            <span>Tổng cấp: {gymStats.total} ngày</span>
                          </div>
                          <div className="pt-2 border-t text-[11px]" style={{ color: palette.muted, borderColor: palette.border }}>
                            Chi nhánh áp dụng: <span className="font-medium" style={{ color: palette.text }}>{selectedReg.branch}</span>
                          </div>
                        </div>
                      )}

                      {/* PT Entitlement Section */}
                      {ptStats && (
                        <div
                          className="rounded-xl p-3 flex flex-col gap-2"
                          style={{ background: palette.control, border: `1px solid ${palette.border}` }}
                        >
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-semibold" style={{ color: palette.text }}>🥊 Quyền huấn luyện PT:</span>
                            <span className="font-mono font-bold" style={{ color: palette.amber }}>Còn {ptStats.remaining} buổi</span>
                          </div>
                          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.round((ptStats.used / ptStats.total) * 100))}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px]" style={{ color: palette.muted }}>
                            <span>Đã tập: {ptStats.used} buổi</span>
                            <span>Tổng cấp: {ptStats.total} buổi</span>
                          </div>
                          <div className="pt-2 border-t text-[12px] flex items-center justify-between" style={{ borderColor: palette.border }}>
                            <span style={{ color: palette.muted }}>HLV phụ trách:</span>
                            <span className="font-semibold" style={{ color: palette.text }}>{selectedReg.pt ?? "Chưa phân công"}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}

            {/* 5. Warning Section */}
            {selectedReg.warning && (
              <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-[12px]" style={{ color: palette.amber }}>
                <strong>Cảnh báo:</strong> {selectedReg.warning}
              </div>
            )}

            {/* 6. Quick Action Buttons */}
            <div className="mt-auto pt-3 border-t flex flex-col gap-2" style={{ borderColor: palette.border }}>
              {selectedReg.status === "PENDING_PAYMENT" && (
                <ActionButton
                  variant="warning"
                  block
                  onClick={() => openAction("payment-form")}
                >
                  💳 Thu tiền công nợ
                </ActionButton>
              )}

              {(selectedReg.status === "ACTIVE" || selectedReg.status === "EXPIRED" || selectedReg.status === "EXHAUSTED") && (
                <ActionButton
                  variant="primary"
                  block
                  onClick={() => openAction("registration-renew")}
                >
                  ⚡ Gia hạn gói mới
                </ActionButton>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TrainersView({ openAction, onNavigateToSchedule }: ScreenProps) {
  const [search, setSearch] = useState("")
  const [branchFilter, setBranchFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [selectedPt, setSelectedPt] = useState<typeof TRAINERS[0] | null>(TRAINERS[0] ?? null)
  const [activeTabInPanel, setActiveTabInPanel] = useState<"members" | "requests" | "info">("members")

  // Mock pending requests data per PT
  const mockRequests: Record<string, { memberId: string; memberName: string; packageName: string; date: string }[]> = {
    PT001: [
      { memberId: "HV008", memberName: "Bùi Thị Hoa", packageName: "Gói PT 10 buổi", date: "Hôm nay 08:30" },
      { memberId: "HV012", memberName: "Đinh Thị Linh", packageName: "Gói PT 20 buổi", date: "Hôm qua 15:45" },
    ],
    PT002: [
      { memberId: "HV014", memberName: "Vũ Hoàng Nam", packageName: "Gói PT 10 buổi", date: "Hôm nay 10:15" },
    ],
  }

  // Mock assigned students list per PT
  const mockStudents: Record<string, { id: string; name: string; phone: string; pkg: string; completed: number; total: number }[]> = {
    PT001: [
      { id: "HV001", name: "Nguyễn Văn An", phone: "0901 234 567", pkg: "Gói 3 tháng + PT 10 buổi", completed: 4, total: 10 },
      { id: "HV002", name: "Trần Thị Bình", phone: "0912 345 678", pkg: "Gói PT 20 buổi", completed: 4, total: 20 },
      { id: "HV005", name: "Hoàng Đức Em", phone: "0905 111 222", pkg: "Gói PT 10 buổi", completed: 0, total: 10 },
    ],
    PT002: [
      { id: "HV004", name: "Phạm Thu Dung", phone: "0933 222 111", pkg: "Gói 6 tháng Gym + PT 10 buổi", completed: 2, total: 10 },
      { id: "HV013", name: "Cao Thanh Minh", phone: "0977 888 999", pkg: "Combo Gym 3 tháng + PT 10 buổi", completed: 1, total: 10 },
    ],
    PT003: [
      { id: "HV010", name: "Trịnh Thị Lan", phone: "0966 444 555", pkg: "Gói PT 20 buổi", completed: 0, total: 20 },
    ],
    PT004: [
      { id: "HV018", name: "Đỗ Minh Tâm", phone: "0988 111 222", pkg: "Gói 3 tháng Gym", completed: 0, total: 0 },
    ],
  }

  const filteredTrainers = useMemo(() => {
    return TRAINERS.filter((t) => {
      const cleanSearch = search.toLowerCase().replace(/\s/g, "")
      const matchSearch =
        !cleanSearch ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.phone.replace(/\s/g, "").includes(cleanSearch) ||
        t.id.toLowerCase().includes(cleanSearch) ||
        t.specialty.toLowerCase().includes(search.toLowerCase())

      const matchBranch = branchFilter === "ALL" || t.branch.includes(branchFilter)

      let matchStatus = true
      if (statusFilter === "ACTIVE") matchStatus = t.status === "active" && t.accountStatus === "active"
      else if (statusFilter === "INACTIVE") matchStatus = t.status === "inactive"
      else if (statusFilter === "PENDING") matchStatus = t.accountStatus === "pending_activation"

      return matchSearch && matchBranch && matchStatus
    })
  }, [search, branchFilter, statusFilter])

  return (
    <div className="flex h-full">
      {/* Left DataGrid / Table Container */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Toolbar>
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder="Tên PT, mã PT, SĐT, chuyên môn..."
          />
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-lg border px-3 text-[13px] outline-none focus:ring-2"
            style={{
              background: palette.control,
              borderColor: palette.border,
              color: palette.text,
              ["--tw-ring-color" as string]: palette.green,
            }}
          >
            <option value="ALL">Tất cả chi nhánh</option>
            <option value="Quận 1">Chi nhánh Quận 1</option>
            <option value="Bình Thạnh">Chi nhánh Bình Thạnh</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border px-3 text-[13px] outline-none focus:ring-2"
            style={{
              background: palette.control,
              borderColor: palette.border,
              color: palette.text,
              ["--tw-ring-color" as string]: palette.green,
            }}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động (Ready)</option>
            <option value="PENDING">Chưa kích hoạt Acc (Pending)</option>
            <option value="INACTIVE">Ngừng hoạt động (Inactive)</option>
          </select>
          <ActionButton icon="plus" onClick={() => openAction("trainer-form")}>
            + Thêm PT
          </ActionButton>
        </Toolbar>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[920px] text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr
                style={{
                  background: palette.shell,
                  borderBottom: `1px solid ${palette.borderSoft}`,
                }}
              >
                {[
                  "Mã PT",
                  "HLV & SĐT",
                  "Chi nhánh",
                  "Chuyên môn",
                  "Hồ sơ",
                  "Tài khoản",
                  "HV phụ trách",
                  "Yêu cầu",
                  "Buổi hôm nay",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left font-semibold"
                    style={{ color: palette.dim }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ ["--tw-divide-color" as string]: palette.borderSoft }}
            >
              {filteredTrainers.map((trainer) => {
                const isSelected = selectedPt?.id === trainer.id
                const isPending = trainer.accountStatus === "pending_activation"
                const isInactive = trainer.status === "inactive"

                return (
                  <tr
                    key={trainer.id}
                    className="cursor-pointer transition-colors hover:bg-white/3"
                    onClick={() => setSelectedPt(trainer)}
                    style={{
                      background: isSelected ? "rgba(22,163,74,0.05)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3 font-mono" style={{ color: palette.muted }}>
                      {trainer.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={trainer.name} tone={palette.purple} size={30} />
                        <div>
                          <div className="font-semibold" style={{ color: palette.text }}>{trainer.name}</div>
                          <div className="font-mono text-[11px]" style={{ color: palette.dim }}>
                            {trainer.phone}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: palette.text }}>
                      {trainer.branch}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: palette.purple }}>
                      {trainer.specialty}
                    </td>
                    <td className="px-4 py-3">
                      {isInactive ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-gray-500/20 text-gray-500 border border-gray-500/30">
                          Inactive
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isPending ? (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Pending OTP
                        </span>
                      ) : (
                        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: palette.text }}>
                      {trainer.students} HV
                    </td>
                    <td className="px-4 py-3">
                      {trainer.pendingRequests ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5 text-[11px]">
                          {trainer.pendingRequests} chờ
                        </span>
                      ) : (
                        <span style={{ color: palette.dim }}>0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: palette.green }}>
                      {trainer.todaySessions || 0} buổi
                    </td>
                  </tr>
                )
              })}
              {filteredTrainers.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-[13px]" style={{ color: palette.dim }}>
                    Không tìm thấy huấn luyện viên nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Detail Panel (Inspector) */}
      <div
        className="w-[400px] shrink-0 border-l overflow-y-auto p-4 space-y-4"
        style={{ borderColor: palette.borderSoft, background: palette.shell }}
      >
        {selectedPt ? (
          <>
            {/* Header PT Profile Info */}
            <div className="flex items-start gap-3 pb-3 border-b" style={{ borderColor: palette.borderSoft }}>
              <Avatar name={selectedPt.name} tone={palette.purple} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-[16px] truncate" style={{ color: palette.text }}>{selectedPt.name}</h3>
                  <span className="font-mono text-[12px]" style={{ color: palette.muted }}>({selectedPt.id})</span>
                </div>
                <div className="text-[12px] mt-0.5" style={{ color: palette.text }}>
                  SĐT: <span className="font-medium">{selectedPt.phone}</span>
                </div>
                <div className="text-[12px]" style={{ color: palette.text }}>
                  Chi nhánh: <span className="font-medium">{selectedPt.branch}</span>
                </div>
                <div className="text-[12px] font-medium mt-0.5" style={{ color: palette.text }}>
                  Chuyên môn: <span style={{ color: palette.purple }}>{selectedPt.specialty}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                variant="secondary"
                icon="user"
                block
                onClick={() => openAction("trainer-form")}
              >
                Sửa hồ sơ
              </ActionButton>
              <ActionButton
                variant="purple"
                icon="calendar"
                block
                onClick={() => onNavigateToSchedule && onNavigateToSchedule(selectedPt.id)}
              >
                Xem lịch tập
              </ActionButton>
            </div>

            {/* Status Warning Banners */}
            {selectedPt.accountStatus === "pending_activation" && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] space-y-1" style={{ color: palette.text }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: palette.amber }}>
                  <span>⚠️</span>
                  <span>Tài khoản chưa kích hoạt (PENDING_ACTIVATION)</span>
                </div>
                <p style={{ color: palette.muted }}>
                  PT tự kích hoạt bằng OTP để cài password. Khi ở trạng thái Pending, PT chưa thể nhận hội viên mới.
                </p>
              </div>
            )}
            {selectedPt.status === "inactive" && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[12px] space-y-1" style={{ color: palette.text }}>
                <div className="font-bold flex items-center gap-1.5" style={{ color: palette.red }}>
                  <span>⛔</span>
                  <span>Hồ sơ tạm dừng hoạt động (INACTIVE)</span>
                </div>
                <p style={{ color: palette.muted }}>
                  PT đang ngừng tiếp nhận yêu cầu mới. Vui lòng rà soát toàn bộ học viên và lịch tập còn dở dở trước khi đóng hồ sơ.
                </p>
              </div>
            )}

            {/* Panel Tabs Navigation */}
            <div className="flex border-b text-[13px]" style={{ borderColor: palette.borderSoft }}>
              <button
                type="button"
                onClick={() => setActiveTabInPanel("members")}
                className="flex-1 pb-2 font-medium border-b-2 transition-colors text-center"
                style={{
                  borderColor: activeTabInPanel === "members" ? palette.green : "transparent",
                  color: activeTabInPanel === "members" ? palette.green : palette.dim,
                }}
              >
                Hội viên ({selectedPt.students})
              </button>
              <button
                type="button"
                onClick={() => setActiveTabInPanel("requests")}
                className="flex-1 pb-2 font-medium border-b-2 transition-colors text-center relative"
                style={{
                  borderColor: activeTabInPanel === "requests" ? palette.green : "transparent",
                  color: activeTabInPanel === "requests" ? palette.green : palette.dim,
                }}
              >
                Yêu cầu ({selectedPt.pendingRequests || 0})
                {!!selectedPt.pendingRequests && (
                  <span className="ml-1 rounded-full bg-amber-500 text-black font-bold text-[10px] px-1.5 py-0.2">
                    {selectedPt.pendingRequests}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTabInPanel("info")}
                className="flex-1 pb-2 font-medium border-b-2 transition-colors text-center"
                style={{
                  borderColor: activeTabInPanel === "info" ? palette.green : "transparent",
                  color: activeTabInPanel === "info" ? palette.green : palette.dim,
                }}
              >
                Chi tiết
              </button>
            </div>

            {/* Tab 1: Assigned Members */}
            {activeTabInPanel === "members" && (
              <div className="space-y-2.5">
                <div className="text-[12px] font-medium mb-1" style={{ color: palette.dim }}>
                  Danh sách hội viên đã gán cho {selectedPt.name}:
                </div>
                {(mockStudents[selectedPt.id] || []).map((m) => {
                  const percent = m.total > 0 ? Math.min(100, Math.round((m.completed / m.total) * 100)) : 0
                  return (
                    <div
                      key={m.id}
                      className="rounded-lg border p-3 text-[12px] space-y-2"
                      style={{ background: palette.control, borderColor: palette.border }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold" style={{ color: palette.text }}>
                            {m.name} <span className="font-mono font-normal" style={{ color: palette.muted }}>({m.id})</span>
                          </div>
                          <div className="text-[11px]" style={{ color: palette.muted }}>SĐT: {m.phone}</div>
                          <div className="text-[11px] font-medium" style={{ color: palette.text }}>{m.pkg}</div>
                        </div>
                        {m.total > 0 ? (
                          <div className="text-right shrink-0">
                            <span className="inline-block rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              Đã tập {m.completed}/{m.total} buổi
                            </span>
                            <div className="text-[10px] mt-0.5 font-semibold" style={{ color: palette.dim }}>
                              Còn {m.total - m.completed} buổi
                            </div>
                          </div>
                        ) : (
                          <span className="rounded-full bg-gray-500/15 border border-gray-500/30 px-2.5 py-0.5 text-[11px] font-bold text-gray-500 shrink-0">
                            Gói hết hạn
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {m.total > 0 && (
                        <div className="space-y-1 pt-1 border-t" style={{ borderColor: palette.border }}>
                          <div className="flex items-center justify-between text-[10px] font-semibold" style={{ color: palette.dim }}>
                            <span>Tiến trình hoàn thành</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
                {!(mockStudents[selectedPt.id]?.length) && (
                  <div className="p-6 text-center text-[12px]" style={{ color: palette.dim }}>
                    Chưa có hội viên nào gán cho PT này.
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Pending Assignment Requests */}
            {activeTabInPanel === "requests" && (
              <div className="space-y-3">
                <div className="text-[12px]" style={{ color: palette.dim }}>
                  Yêu cầu hội viên gửi tới PT <strong>{selectedPt.name}</strong> sau khi thanh toán:
                </div>
                {(mockRequests[selectedPt.id] || []).map((req, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border p-3 text-[12px] space-y-2"
                    style={{ background: palette.control, borderColor: palette.border }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold" style={{ color: palette.text }}>
                          {req.memberName} <span className="font-mono" style={{ color: palette.muted }}>({req.memberId})</span>
                        </div>
                        <div className="font-medium text-[11px]" style={{ color: palette.amber }}>
                          {req.packageName} · {req.date}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1 border-t" style={{ borderColor: palette.border }}>
                      <ActionButton
                        variant="purple"
                        block
                        onClick={() => alert(`Đã chấp nhận (ACCEPT) yêu cầu của hội viên ${req.memberName}!`)}
                      >
                        ✓ Accept
                      </ActionButton>
                      <ActionButton
                        variant="secondary"
                        block
                        onClick={() => alert(`Đã từ chối (REJECT) yêu cầu của hội viên ${req.memberName}!`)}
                      >
                        ✕ Reject
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {!(mockRequests[selectedPt.id]?.length) && (
                  <div className="p-6 text-center text-[12px]" style={{ color: palette.dim }}>
                    Không có yêu cầu chọn PT nào đang chờ duyệt.
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Detail Info */}
            {activeTabInPanel === "info" && (
              <div className="space-y-3">
                <InfoStack
                  items={[
                    ["Mã huấn luyện viên", selectedPt.id],
                    ["Họ và tên", selectedPt.name],
                    ["Số điện thoại", selectedPt.phone],
                    ["Chi nhánh hoạt động", selectedPt.branch],
                    ["Chuyên môn chính", selectedPt.specialty],
                    ["Trạng thái hồ sơ", selectedPt.status === "active" ? "Hoạt động (ACTIVE)" : "Ngừng hoạt động (INACTIVE)", selectedPt.status === "active" ? palette.green : palette.muted],
                    ["Trạng thái tài khoản", selectedPt.accountStatus === "active" ? "Đã kích hoạt (ROLE_PT)" : "Chờ kích hoạt OTP (PENDING_ACTIVATION)", selectedPt.accountStatus === "active" ? palette.blue : palette.amber],
                    ["Số hội viên phụ trách", `${selectedPt.students} hội viên`],
                    ["Số buổi dạy hôm nay", `${selectedPt.todaySessions || 0} buổi`],
                    ["Ngày bắt đầu làm việc", selectedPt.startDate || "01/01/2024"],
                    ["Ghi chú hệ thống", selectedPt.notes || "PT chuyên trách mảng Gym Fitness & Bodybuilding tại chi nhánh."],
                  ]}
                />
              </div>
            )}
          </>
        ) : (
          <div className="p-8 text-center text-[13px]" style={{ color: palette.dim }}>
            Chọn một huấn luyện viên trong bảng bên trái để xem thông tin chi tiết.
          </div>
        )}
      </div>
    </div>
  )
}

function ScheduleView({ openAction, openScheduleBooking, selectedPtIdForSchedule }: ScreenProps) {
  const [ptQuery, setPtQuery] = useState("")
  const [ptFilter, setPtFilter] = useState<string>(selectedPtIdForSchedule || "")
  const [viewDate, setViewDate] = useState("07/09/2026")
  const [calendarMonth, setCalendarMonth] = useState(8)
  const [calendarYear, setCalendarYear] = useState(2026)
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, Session["status"]>>({})
  const todayDate = "11/09/2026"
  const toDateKey = (date: string) => {
    const [day, month, year] = date.split("/")
    return `${year}-${month}-${day}`
  }
  const isPastDate = toDateKey(viewDate) < toDateKey(todayDate)
  const monthLabel = new Date(calendarYear, calendarMonth, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
  const firstWeekday = new Date(calendarYear, calendarMonth, 1).getDay()
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const calendarCells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) =>
    index < firstWeekday ? null : index - firstWeekday + 1,
  )

  const workingHours = ["08:00", "10:00", "12:00", "14:00", "16:00"]
  const slotEndTimes: Record<string, string> = {
    "08:00": "10:00",
    "10:00": "12:00",
    "12:00": "14:00",
    "14:00": "16:00",
    "16:00": "18:00",
  }
  const availableTrainers = TRAINERS.filter(
    (trainer) => trainer.status === "active",
  )
  const matchedTrainers = availableTrainers.filter((trainer) => {
    const query = ptQuery.trim().toLowerCase()
    return (
      !query ||
      trainer.name.toLowerCase().includes(query) ||
      trainer.phone.includes(query) ||
      trainer.id.toLowerCase().includes(query)
    )
  })
  const selectedTrainer = availableTrainers.find((trainer) => trainer.id === ptFilter)
  const selectedSessions = selectedTrainer
    ? SESSIONS.filter(
        (session) =>
          session.trainerId === selectedTrainer.id &&
          session.date === viewDate &&
          session.status !== "empty",
      ).map((session) => ({
        ...session,
        status: sessionOverrides[session.id] ?? session.status,
      }))
    : []
  const sessionStatusLabel = (status: Session["status"]) => {
    if (status === "done") return "Hoàn thành"
    if (status === "awaiting_confirmation") return "Chờ xác nhận hoàn thành"
    if (status === "cancelled") return "Đã hủy"
    if (status === "ongoing") return "Đang diễn ra"
    return "Đã đặt"
  }
  const canCancelSession = (session: Session) =>
    session.status === "upcoming" || session.status === "ongoing"
  const canConfirmCompletion = (session: Session) =>
    session.status === "upcoming" || session.status === "ongoing"
  const sessionHasEnded = (session: Session) =>
    isPastDate || (viewDate === todayDate && session.time < "12:00")

  const getSessionAt = (time: string) =>
    selectedSessions.find((session) => session.time === time)

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-5">
      <section
        className="rounded-2xl border p-4"
        style={{ background: palette.panel, borderColor: palette.border }}
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: palette.green }}
            >
              W06 · Lịch tập PT
            </p>
            <h2 className="mt-1 text-[20px] font-bold" style={{ color: palette.text }}>
              Chọn HLV để xem lịch
            </h2>
            <p className="mt-1 text-[12px]" style={{ color: palette.muted }}>
              Khung làm việc cố định 08:00–18:00. Mỗi buổi mặc định kéo dài 2 giờ.
            </p>
          </div>
          <div className="flex min-w-[300px] flex-1 flex-wrap justify-end gap-2 sm:flex-none">
            <div className="relative min-w-[220px]">
              <input
                value={ptQuery}
                onChange={(event) => setPtQuery(event.target.value)}
                placeholder="Tìm theo tên, SĐT hoặc mã PT"
                className="h-9 w-full rounded-xl border px-3 text-[12px] outline-none"
                style={{
                  background: palette.control,
                  borderColor: palette.border,
                  color: palette.text,
                }}
              />
            </div>
            <select
              value={ptFilter}
              onChange={(event) => setPtFilter(event.target.value)}
              className="h-9 min-w-[220px] rounded-xl border px-3 text-[12px] font-semibold outline-none"
              style={{
                background: palette.control,
                borderColor: palette.border,
                color: palette.text,
              }}
            >
              <option value="">Chọn huấn luyện viên</option>
              {matchedTrainers.map((trainer) => (
                <option key={trainer.id} value={trainer.id}>
                  {trainer.name} · {trainer.phone} · {trainer.id}
                </option>
              ))}
            </select>
          </div>
        </div>
        {ptQuery && matchedTrainers.length === 0 && (
          <p className="mt-3 text-[12px]" style={{ color: palette.amber }}>
            Không tìm thấy HLV đang hoạt động với thông tin này.
          </p>
        )}
      </section>

      {!selectedTrainer ? (
        <section
          className="flex min-h-[300px] flex-1 items-center justify-center rounded-2xl border border-dashed p-8 text-center"
          style={{ borderColor: palette.border, background: palette.panel }}
        >
          <div className="max-w-[420px]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">
              ◷
            </div>
            <h3 className="text-[16px] font-bold" style={{ color: palette.text }}>
              Chưa có HLV được chọn
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed" style={{ color: palette.muted }}>
              Tìm theo tên hoặc số điện thoại, sau đó chọn một HLV để xem các buổi đã đặt và khung giờ còn trống.
            </p>
          </div>
        </section>
      ) : (
        <section
          className="flex flex-1 flex-col overflow-hidden rounded-2xl border"
          style={{ background: palette.panel, borderColor: palette.border }}
        >
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
            style={{ borderColor: palette.border }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-[14px] font-bold" style={{ color: palette.green }}>
                PT
              </div>
              <div>
                <div className="text-[15px] font-bold" style={{ color: palette.text }}>
                  {selectedTrainer.name}
                </div>
                <div className="text-[11px]" style={{ color: palette.muted }}>
                  {selectedTrainer.id} · {selectedTrainer.phone} · {selectedTrainer.branch}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  value={viewDate}
                  readOnly
                  className="h-9 w-[125px] rounded-lg border px-3 text-[12px] outline-none"
                  style={{ background: palette.control, borderColor: palette.border, color: palette.text }}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px]" style={{ color: palette.muted }}>▣</span>
              </div>

            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid min-w-[880px] grid-cols-[230px_88px_1fr]">
              <aside className="border-r p-4" style={{ borderColor: palette.border }}>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[15px] font-semibold capitalize" style={{ color: palette.text }}>{monthLabel}</span>
                  <div className="flex gap-1">
                    <button type="button" className="rounded-md px-2 py-1 text-[16px]" style={{ color: palette.muted }} onClick={() => {
                      const previous = new Date(calendarYear, calendarMonth - 1, 1)
                      setCalendarMonth(previous.getMonth())
                      setCalendarYear(previous.getFullYear())
                    }}>‹</button>
                    <button type="button" className="rounded-md px-2 py-1 text-[16px]" style={{ color: palette.muted }} onClick={() => {
                      const next = new Date(calendarYear, calendarMonth + 1, 1)
                      setCalendarMonth(next.getMonth())
                      setCalendarYear(next.getFullYear())
                    }}>›</button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-y-2 text-center text-[10px] font-semibold" style={{ color: palette.dim }}>
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((day) => <span key={day}>{day}</span>)}
                </div>
                <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px]">
                  {calendarCells.map((day, index) => {
                    if (!day) return <span key={`empty-${index}`} />
                    const dateValue = `${String(day).padStart(2, "0")}/${String(calendarMonth + 1).padStart(2, "0")}/${calendarYear}`
                    const selected = dateValue === viewDate
                    const past = toDateKey(dateValue) < toDateKey(todayDate)
                    return (
                      <button
                        key={dateValue}
                        type="button"
                        onClick={() => setViewDate(dateValue)}
                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-emerald-500/10"
                        style={{ background: selected ? palette.blue : "transparent", color: past ? palette.dim : selected ? "#fff" : palette.text }}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </aside>
              <div className="border-r" style={{ borderColor: palette.border }}>
                <div className="h-12 border-b px-4 py-4 text-[11px] font-bold uppercase tracking-wider" style={{ borderColor: palette.border, color: palette.dim }}>
                  Giờ
                </div>
                {workingHours.map((time) => (
                  <div key={time} className="h-24 border-b px-4 py-4 font-mono text-[12px]" style={{ borderColor: palette.border, color: palette.muted }}>
                    {time} → {slotEndTimes[time]}
                  </div>
                ))}
              </div>
              <div>
                <div className="h-12 border-b px-4 py-3" style={{ borderColor: palette.border }}>
                  <div className="text-[12px] font-semibold" style={{ color: palette.text }}>{viewDate}</div>
                  <div className="text-[10px]" style={{ color: palette.dim }}>
                    Khung làm việc cố định · 08:00–18:00
                  </div>

                </div>
                {workingHours.map((time) => {
                  const session = getSessionAt(time)
                  return (
                    <div key={time} className="h-24 border-b p-2" style={{ borderColor: palette.border }}>
                      {session ? (
                        <div
                          className="relative grid h-full w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-xl p-3 text-left transition hover:brightness-110"
                          style={{ background: `${sessionColor(session.status)}18`, borderLeft: `3px solid ${sessionColor(session.status)}` }}
                        >
                          <button
                            type="button"
                            onClick={() => openAction(session.status === "done" ? "session-result" : "schedule-change")}
                            className="flex min-w-0 flex-col items-start text-left"
                          >
                            <div className="truncate text-[13px] font-bold" style={{ color: palette.text }}>{session.member || "Đã giữ lịch"}</div>
                            <div className="mt-1 text-[11px]" style={{ color: sessionColor(session.status) }}>{session.packageName || "Buổi PT"}</div>
                            <div className="mt-1 text-[11px] font-semibold" style={{ color: sessionColor(session.status) }}>{sessionStatusLabel(session.status)}</div>
                          </button>
                          <div className="flex items-center justify-end gap-2">
                            <div className="flex shrink-0 items-center gap-2">
                              {session.status === "upcoming" && (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-md px-3 py-1.5 text-[10px] font-bold text-white shadow-sm"
                                    style={{ background: "#EF4444", color: "#FFFFFF" }}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      openAction("schedule-change")
                                    }}
                                  >
                                    Hủy lịch
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!sessionHasEnded(session)}
                                    className="rounded-md px-3 py-1.5 text-[10px] font-bold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                                    style={{ background: sessionHasEnded(session) ? palette.green : palette.muted, color: "#FFFFFF" }}
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setSessionOverrides((current) => ({ ...current, [session.id]: "awaiting_confirmation" }))
                                    }}
                                  >
                                    Xác nhận hoàn thành
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (isPastDate) return
                            if (openScheduleBooking) {
                              openScheduleBooking({
                                time: `${time} - ${slotEndTimes[time]}`,
                                trainerId: selectedTrainer.id,
                                date: viewDate,
                              })
                            } else {
                              openAction("schedule-booking")
                            }
                          }}
                          disabled={isPastDate}
                          className="flex h-full w-full items-center justify-between rounded-xl border border-dashed px-4 text-left transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ borderColor: palette.border, color: palette.muted }}
                        >
                          <span className="text-[12px]">Khung giờ trống</span>
                          <span className="text-[11px] font-semibold" style={{ color: palette.green }}>Chọn khung giờ +</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function CheckInView({ openAction }: ScreenProps) {
  const [query, setQuery] = useState("")
  const [lastResult, setLastResult] = useState<{
    member?: Member
    result: CheckInEvent["result"]
    message: string
  } | null>(null)
  const [events, setEvents] = useState<CheckInEvent[]>(CHECKIN_EVENTS)
  const [showK01, setShowK01] = useState(false)

  const handleSearch = () => {
    if (!query.trim()) return
    const clean = query.toLowerCase().replace(/\s/g, "")
    const found = MEMBERS.find(
      (member) =>
        member.name.toLowerCase().includes(query.toLowerCase()) ||
        member.phone.replace(/\s/g, "").includes(clean) ||
        member.id.toLowerCase() === clean,
    )
    if (!found) {
      setLastResult({
        result: "unknown",
        message: "Không nhận diện được hồ sơ. Vui lòng kiểm tra với lễ tân.",
      })
      setQuery("")
      return
    }
    const result: CheckInEvent["result"] =
      found.status === "expired" || found.status === "none"
        ? "expired"
        : found.status === "expiring"
          ? "expiring"
          : "ok"
    setLastResult({
      member: found,
      result,
      message:
        result === "expired"
          ? "Không đủ điều kiện vào tập. Cần kiểm tra gói hoặc ngoại lệ."
          : result === "expiring"
            ? "Cho phép vào, đồng thời nhắc sắp hết hạn."
            : "Cho phép vào tập.",
    })
    if (result !== "expired") {
      const newEvent: CheckInEvent = {
        id: Date.now(),
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        member: found.name,
        memberId: found.id,
        direction: "in",
        pkg: found.packageName,
        result,
        device: "Quầy lễ tân",
      }
      setEvents((items) => [newEvent, ...items])
      setShowK01(true)
      window.setTimeout(() => setShowK01(false), 3500)
    }
    setQuery("")
  }

  return (
    <div className="relative flex h-full">
      <div
        className="flex w-96 shrink-0 flex-col border-r"
        style={{ borderColor: palette.borderSoft, background: palette.shell }}
      >
        <div className="flex flex-col gap-4 p-5">
          <div>
            <div className="text-[15px] font-bold text-white">
              Kiểm soát ra/vào
            </div>
            <div className="text-[12px]" style={{ color: palette.dim }}>
              Nhập mã HV, tên hoặc số điện thoại
            </div>
          </div>
          <div className="relative">
            <Ic
              k="scan"
              size={16}
              cls="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: palette.orange }}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSearch()}
              placeholder="HV001 · Nguyễn Văn An · 0901..."
              className="w-full rounded-lg border py-3 pl-10 pr-3 text-[14px] outline-none focus:ring-2"
              style={{
                background: "rgba(22,163,74,0.06)",
                borderColor: "rgba(22,163,74,0.3)",
                color: palette.text,
                ["--tw-ring-color" as string]: palette.orange,
              }}
              autoFocus
            />
          </div>
          <ActionButton block icon="scan" onClick={handleSearch}>
            Kiểm tra / ghi nhận vào
          </ActionButton>

          {lastResult && (
            <Panel>
              {lastResult.member ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={lastResult.member.name}
                      tone={palette.blue}
                      size={36}
                    />
                    <div>
                      <div className="text-[14px] font-bold text-white">
                        {lastResult.member.name}
                      </div>
                      <div
                        className="font-mono text-[11px]"
                        style={{ color: palette.dim }}
                      >
                        {lastResult.member.id}
                      </div>
                    </div>
                  </div>
                  <InfoStack
                    items={[
                      ["Gói", lastResult.member.packageName],
                      ["Hiệu lực", lastResult.member.validUntil],
                      ["Thông báo", lastResult.message],
                    ]}
                  />
                  <CheckBadge result={lastResult.result} />
                  {lastResult.result === "expired" && (
                    <ActionButton
                      block
                      variant="danger"
                      icon="warn"
                      onClick={() => openAction("manual-checkin")}
                    >
                      Ghi nhận ngoại lệ
                    </ActionButton>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <CheckBadge result="unknown" />
                  <p className="text-[13px]" style={{ color: palette.muted }}>
                    {lastResult.message}
                  </p>
                  <ActionButton
                    block
                    variant="secondary"
                    icon="plus"
                    onClick={() => openAction("member-create")}
                  >
                    Tiếp nhận hồ sơ
                  </ActionButton>
                </div>
              )}
            </Panel>
          )}

          <Panel title="Thiết bị" subtitle="Gate-Q1-01 · đồng bộ 09:43">
            <div className="flex gap-2">
              <Pill tone="green">Online</Pill>
              <Pill tone="blue">K01 sẵn sàng</Pill>
            </div>
            <div className="mt-3 flex gap-2">
              <ActionButton
                variant="secondary"
                icon="settings"
                onClick={() => openAction("device-settings")}
              >
                Cấu hình
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon="refresh"
                onClick={() => openAction("manual-checkin")}
              >
                Thủ công
              </ActionButton>
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {showK01 && lastResult?.member && (
          <K01Overlay member={lastResult.member} result={lastResult.result} />
        )}
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: palette.borderSoft }}
        >
          <span className="text-[14px] font-semibold text-white">
            Nhật ký ra/vào hôm nay
          </span>
          <span
            className="font-mono text-[12px]"
            style={{ color: palette.dim }}
          >
            {events.length} sự kiện · 07/09/2026
          </span>
        </div>
        <div className="flex-1 overflow-auto">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-4 border-b px-5 py-3 transition-colors hover:bg-white/3"
              style={{ borderColor: "#0F1820" }}
            >
              <div
                className="w-12 shrink-0 font-mono text-[14px] font-semibold"
                style={{ color: palette.muted }}
              >
                {event.time}
              </div>
              <div
                className="flex h-8 w-10 shrink-0 items-center justify-center rounded-md text-[11px] font-bold"
                style={{
                  background:
                    event.direction === "in"
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(100,116,139,0.12)",
                  color: event.direction === "in" ? palette.green : "#64748B",
                }}
              >
                {event.direction === "in" ? "VÀO" : "RA"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold text-white">
                  {event.member}
                </div>
                <div className="text-[12px]" style={{ color: palette.dim }}>
                  {event.memberId} · {event.pkg} · {event.device}
                </div>
              </div>
              <CheckBadge result={event.result} />
              <IconButton icon="eye" label="Xem sự kiện" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PaymentsView({ role, openAction }: ScreenProps) {
  const debt = MEMBERS.reduce((sum, member) => sum + member.debt, 0)
  const confirmed = PAYMENTS.filter(
    (payment) => payment.status === "confirmed",
  ).reduce((sum, payment) => sum + payment.amount, 0)

  return (
    <div className="flex h-full flex-col">
      <Toolbar>
        <div className="flex gap-3">
          <MiniStat
            label="Đã thu xác nhận"
            value={fmtVND(confirmed)}
            tone={palette.green}
          />
          <MiniStat
            label="Còn công nợ"
            value={fmtVND(debt)}
            tone={palette.red}
          />
          <MiniStat label="Chờ đối soát" value="1 phiếu" tone={palette.amber} />
        </div>
        <ActionButton icon="plus" onClick={() => openAction("payment-form")}>
          Ghi nhận thu tiền
        </ActionButton>
        <ActionButton
          variant="secondary"
          icon="wallet"
          onClick={() => openAction("bank-transfer-payment")}
        >
          Khởi tạo CK
        </ActionButton>
        {role === "admin" && (
          <ActionButton
            variant="secondary"
            icon="edit"
            onClick={() => openAction("payment-adjustment")}
          >
            Điều chỉnh
          </ActionButton>
        )}
      </Toolbar>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[920px] text-[13px]">
          <thead className="sticky top-0 z-10">
            <tr
              style={{
                background: "#0C1120",
                borderBottom: `1px solid ${palette.borderSoft}`,
              }}
            >
              {[
                "Mã phiếu",
                "Thời gian",
                "Hội viên",
                "Đăng ký",
                "Phương thức",
                "Số tiền",
                "Người thu",
                "Chi nhánh",
                "Trạng thái",
                "",
              ].map((header) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: palette.dim }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y"
            style={{ ["--tw-divide-color" as string]: palette.borderSoft }}
          >
            {PAYMENTS.map((payment) => (
              <tr
                key={payment.id}
                className="transition-colors hover:bg-white/3"
              >
                <td
                  className="px-4 py-3 font-mono text-[12px]"
                  style={{ color: palette.muted }}
                >
                  {payment.id}
                </td>
                <td
                  className="px-4 py-3 font-mono text-[12px]"
                  style={{ color: palette.muted }}
                >
                  {payment.time}
                </td>
                <td className="px-4 py-3 font-semibold text-white">
                  {payment.member}
                </td>
                <td
                  className="px-4 py-3 font-mono text-[12px]"
                  style={{ color: palette.muted }}
                >
                  {payment.ref}
                </td>
                <td className="px-4 py-3" style={{ color: palette.muted }}>
                  {payment.method}
                </td>
                <td
                  className="px-4 py-3 font-mono font-semibold"
                  style={{ color: palette.green }}
                >
                  {fmtVND(payment.amount)}
                </td>
                <td className="px-4 py-3" style={{ color: palette.muted }}>
                  {payment.by}
                </td>
                <td className="px-4 py-3" style={{ color: palette.muted }}>
                  {payment.branch}
                </td>
                <td className="px-4 py-3">
                  <PaymentBadge status={payment.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <IconButton icon="eye" label="Xem phiếu thu" />
                    {role === "admin" && (
                      <IconButton
                        icon="edit"
                        label="Điều chỉnh payment"
                        onClick={() => openAction("payment-adjustment")}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CareView({ openAction }: ScreenProps) {
  const [filter, setFilter] = useState<"all" | "pending" | "sent" | "failed">(
    "pending",
  )
  const shown = CARE_ITEMS.filter(
    (item) =>
      filter === "all" ||
      item.status === filter ||
      (filter === "pending" && item.status === "followup"),
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Segment
          value={filter}
          onChange={setFilter}
          options={[
            { value: "pending", label: "Cần xử lý" },
            { value: "sent", label: "Đã gửi" },
            { value: "failed", label: "Gửi lỗi" },
            { value: "all", label: "Tất cả" },
          ]}
        />
        <ActionButton
          variant="secondary"
          icon="bell"
          onClick={() => openAction("notification-form")}
        >
          Soạn thông báo
        </ActionButton>
      </div>

      <div className="flex flex-col gap-2">
        {shown.map((item) => (
          <Panel key={item.id}>
            <div className="flex items-start gap-4">
              <TaskIcon type={item.type} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[14px] font-semibold text-white">
                    {item.title}
                  </div>
                  <CareBadge status={item.status} />
                </div>
                <div
                  className="mt-0.5 text-[13px] font-medium"
                  style={{ color: palette.muted }}
                >
                  {item.member} · {item.memberId}
                </div>
                <div
                  className="mt-0.5 text-[12px]"
                  style={{ color: palette.dim }}
                >
                  {item.detail}
                </div>
                <div
                  className="mt-1 text-[11px]"
                  style={{ color: palette.faint }}
                >
                  {item.created} · phụ trách: {item.owner}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {item.status !== "sent" && (
                  <ActionButton
                    variant="secondary"
                    icon="send"
                    onClick={() => openAction("notification-form")}
                  >
                    Gửi
                  </ActionButton>
                )}
                <ActionButton
                  variant="secondary"
                  icon="care"
                  onClick={() => openAction("contact-log")}
                >
                  Liên hệ
                </ActionButton>
                <ActionButton
                  variant="ghost"
                  icon="eye"
                  onClick={() => openAction("member-update")}
                >
                  Hồ sơ
                </ActionButton>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function ReportsView({ openAction }: ScreenProps) {
  const revenues = [38500000, 42100000, 18200000]
  const months = ["T7", "T8", "T9"]
  const maxRev = Math.max(...revenues)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Segment
          value="month"
          onChange={() => undefined}
          options={[
            { value: "month", label: "Tháng" },
            { value: "quarter", label: "Quý" },
            { value: "year", label: "Năm" },
          ]}
        />
        <Pill tone="blue">Tiền thực thu · Toàn bộ chi nhánh được cấp</Pill>
        <ActionButton icon="export" onClick={() => openAction("report-export")}>
          Xuất báo cáo
        </ActionButton>
      </div>

      <div className="grid gap-4 xl:grid-cols-4 md:grid-cols-2">
        <KpiCard
          label="Tiền thực thu tháng 9"
          value="18.200.000 đ"
          sub="Tính đến 07/09/2026"
          icon="payment"
          accent={palette.green}
        />
        <KpiCard
          label="Giá trị gói đã bán"
          value="21.300.000 đ"
          sub="Không đồng nghĩa đã thu"
          icon="package"
          accent={palette.blue}
        />
        <KpiCard
          label="Gói đã bán"
          value={12}
          sub="Tháng 9"
          icon="signup"
          accent={palette.purple}
        />
        <KpiCard
          label="Buổi PT đã dạy"
          value={64}
          sub="Đã ghi kết quả"
          icon="trainer"
          accent={palette.orange}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Panel
          title="Doanh thu 3 tháng gần nhất"
          subtitle="Cột tháng 9 là dữ liệu chưa kết thúc kỳ"
        >
          <div className="flex h-40 items-end gap-6">
            {revenues.map((value, index) => (
              <div
                key={months[index]}
                className="flex flex-1 flex-col items-center gap-1.5"
              >
                <div
                  className="font-mono text-[11px]"
                  style={{ color: palette.dim }}
                >
                  {shortMoney(value)}
                </div>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${(value / maxRev) * 120}px`,
                    background:
                      index === 2 ? "rgba(22,163,74,0.7)" : palette.border,
                  }}
                />
                <div
                  className="text-[12px] font-medium"
                  style={{ color: index === 2 ? palette.orange : "#3A4A60" }}
                >
                  {months[index]}
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Gói tập đã bán">
          <div className="flex flex-col gap-3">
            {[
              ["Gói PT 20 buổi", 3, 42, palette.purple],
              ["Gói 3 tháng", 4, 33, palette.blue],
              ["Gói 1 tháng", 2, 17, palette.green],
              ["Gói khác", 1, 8, palette.amber],
            ].map(([label, count, pct, color]) => (
              <div key={label as string}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span style={{ color: palette.muted }}>{label}</span>
                  <span className="font-mono" style={{ color: palette.dim }}>
                    {count as number} · {pct as number}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full"
                  style={{ background: palette.border }}
                >
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${pct}%`, background: color as string }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Bảng đối chiếu giao dịch"
        subtitle="Số tổng phía trên phải khớp với dòng chi tiết"
      >
        <table className="w-full min-w-[760px] text-[13px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${palette.border}` }}>
              {[
                "Ngày",
                "Nhóm",
                "Thực thu",
                "Giá trị bán",
                "Còn phải thu",
                "Nguồn",
              ].map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left"
                  style={{ color: palette.dim }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["07/09", "PT", "7.550.000 đ", "8.050.000 đ", "500.000 đ", "W08"],
              ["06/09", "Gym", "500.000 đ", "500.000 đ", "0 đ", "W04/W08"],
              ["05/09", "Ra/vào", "0 đ", "0 đ", "0 đ", "W07"],
            ].map((row) => (
              <tr
                key={row.join("-")}
                style={{ borderBottom: `1px solid ${palette.borderSoft}` }}
              >
                {row.map((cell) => (
                  <td
                    key={cell}
                    className="px-3 py-2"
                    style={{
                      color: cell.includes("đ") ? palette.text : palette.muted,
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  )
}

function BranchesView({ openAction }: ScreenProps) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex justify-end">
        <ActionButton icon="plus" onClick={() => openAction("branch-form")}>
          Thêm chi nhánh
        </ActionButton>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {BRANCHES.map((branch) => (
          <Panel key={branch.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[15px] font-bold text-white">
                  {branch.name}
                </div>
                <div
                  className="mt-0.5 font-mono text-[11px]"
                  style={{ color: palette.dim }}
                >
                  {branch.id}
                </div>
              </div>
              <Pill tone="green">Đang hoạt động</Pill>
            </div>
            <div className="mt-3 text-[13px]" style={{ color: palette.muted }}>
              {branch.address}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.dim }}>
              {branch.phone} · Giờ mở cửa: {branch.open}
            </div>
            <div
              className="mt-4 grid grid-cols-3 gap-2 border-t pt-3"
              style={{ borderColor: palette.border }}
            >
              <Metric label="Hội viên" value={branch.members} />
              <Metric label="Huấn luyện viên" value={branch.trainers} />
              <Metric
                label="Đang tập"
                value={Math.floor(branch.members * 0.4)}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <ActionButton
                variant="secondary"
                icon="eye"
                onClick={() => openAction("report-export")}
              >
                Số liệu
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon="edit"
                onClick={() => openAction("branch-form")}
              >
                Chỉnh sửa
              </ActionButton>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function SystemView({ openAction }: ScreenProps) {
  const groups: {
    title: string
    icon: IconName
    color: string
    desc: string
    action: ActionKind
  }[] = [
    {
      title: "Tài khoản & phân quyền",
      icon: "user",
      color: palette.blue,
      desc: "Cấp vai trò, liên kết hồ sơ và xem trước quyền hiệu lực.",
      action: "account-permissions",
    },
    {
      title: "Chính sách vận hành",
      icon: "bell",
      color: palette.amber,
      desc: "Nhắc hạn, hủy/đổi lịch, trừ buổi, kích hoạt khi còn nợ.",
      action: "policy-settings",
    },
    {
      title: "Màn hình chào mừng K01",
      icon: "scan",
      color: palette.green,
      desc: "Nội dung công cộng, quyền riêng tư sinh nhật và trạng thái chờ.",
      action: "manual-checkin",
    },
    {
      title: "Thiết bị & kết nối",
      icon: "settings",
      color: palette.purple,
      desc: "Máy nhận diện, khóa cửa, máy in, đồng bộ và kiểm tra kết nối.",
      action: "device-settings",
    },
    {
      title: "Nhật ký thao tác",
      icon: "report",
      color: palette.orange,
      desc: "Theo dõi đổi quyền, ngoại lệ ra/vào, thu tiền và thay đổi chính sách.",
      action: "report-export",
    },
  ]

  return (
    <div className="grid gap-3 p-6 xl:grid-cols-2">
      {groups.map((group) => (
        <button
          key={group.title}
          type="button"
          onClick={() => openAction(group.action)}
          className="rounded-lg border p-5 text-left transition-colors hover:border-[#2A3A55]"
          style={{ background: palette.panel, borderColor: palette.border }}
        >
          <div className="mb-2 flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: `${group.color}18`, color: group.color }}
            >
              <Ic k={group.icon} size={18} />
            </div>
            <div className="text-[14px] font-bold text-white">
              {group.title}
            </div>
          </div>
          <div className="text-[13px]" style={{ color: palette.muted }}>
            {group.desc}
          </div>
          <div
            className="mt-3 text-[12px] font-medium"
            style={{ color: palette.orange }}
          >
            Cấu hình
          </div>
        </button>
      ))}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  icon: IconName
  accent: string
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="text-[12px] font-medium"
            style={{ color: palette.muted }}
          >
            {label}
          </div>
          <div className="mt-1 truncate text-2xl font-bold leading-none text-white">
            {value}
          </div>
          {sub && (
            <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
              {sub}
            </div>
          )}
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `${accent}20`, color: accent }}
        >
          <Ic k={icon} size={18} />
        </div>
      </div>
    </Panel>
  )
}

function Toolbar({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-3 border-b px-6 py-3"
      style={{ borderColor: palette.borderSoft, background: palette.shell }}
    >
      {children}
    </div>
  )
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="relative min-w-[240px] max-w-sm flex-1">
      <Ic
        k="search"
        size={14}
        cls="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: palette.dim }}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border py-2 pl-8 pr-3 text-[13px] outline-none focus:ring-2"
        style={{
          background: palette.control,
          borderColor: palette.border,
          color: palette.text,
          ["--tw-ring-color" as string]: palette.green,
        }}
      />
    </div>
  )
}

function InfoStack({ items }: { items: [string, string, string?][] }) {
  return (
    <div className="grid gap-3">
      {items.map(([label, value, color]) => (
        <div key={label}>
          <div
            className="mb-0.5 text-[11px] font-medium"
            style={{ color: palette.dim }}
          >
            {label}
          </div>
          <div
            className="text-[13px] font-semibold"
            style={{ color: color ?? palette.text }}
          >
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: palette.panelSoft }}
    >
      <div className="truncate text-[15px] font-bold text-white">{value}</div>
      <div className="text-[11px]" style={{ color: palette.dim }}>
        {label}
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: string
}) {
  return (
    <div
      className="rounded-lg border px-4 py-2"
      style={{ background: `${tone}10`, borderColor: `${tone}33` }}
    >
      <div className="text-[11px]" style={{ color: palette.dim }}>
        {label}
      </div>
      <div className="font-mono font-bold" style={{ color: tone }}>
        {value}
      </div>
    </div>
  )
}

function TaskIcon({
  type,
}: {
  type: "expiring" | "birthday" | "debt" | "schedule"
}) {
  const map = {
    expiring: { icon: "warn", color: palette.amber },
    birthday: { icon: "care", color: palette.pink },
    debt: { icon: "payment", color: palette.red },
    schedule: { icon: "calendar", color: palette.blue },
  } as const
  const item = map[type]
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
      style={{ background: `${item.color}18`, color: item.color }}
    >
      <Ic k={item.icon} size={18} />
    </div>
  )
}

function sessionColor(
  status: "done" | "awaiting_confirmation" | "ongoing" | "upcoming" | "empty" | "cancelled",
) {
  const colors = {
    done: palette.green,
    awaiting_confirmation: palette.amber,
    ongoing: palette.orange,
    upcoming: palette.blue,
    empty: palette.faint,
    cancelled: palette.red,
  }
  return colors[status]
}

function K01Overlay({
  member,
  result,
}: {
  member: Member
  result: CheckInEvent["result"]
}) {
  const allowed = result === "ok" || result === "expiring"
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.86)" }}
    >
      <div
        className="w-full max-w-lg rounded-lg border p-10 text-center"
        style={{
          background: "#0E1A2E",
          borderColor: allowed ? palette.green : palette.red,
        }}
      >
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: allowed
              ? "rgba(16,185,129,0.12)"
              : "rgba(239,68,68,0.12)",
            color: allowed ? palette.green : palette.red,
          }}
        >
          <Ic k={allowed ? "check" : "warn"} size={34} />
        </div>
        <div className="mb-1 text-3xl font-bold text-white">
          {allowed ? "Chào mừng" : "Vui lòng liên hệ lễ tân"}
        </div>
        {allowed && (
          <div
            className="text-[20px] font-semibold"
            style={{ color: palette.green }}
          >
            {member.name}
          </div>
        )}
        {allowed && (
          <div className="mt-2 text-[14px]" style={{ color: palette.dim }}>
            {member.packageName}
          </div>
        )}
        <div className="mt-5 text-[12px]" style={{ color: "#2A4060" }}>
          K01 · Chi nhánh Quận 1 · không hiển thị số điện thoại hoặc công nợ
        </div>
      </div>
    </div>
  )
}
