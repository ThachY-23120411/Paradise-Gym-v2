import { useMemo, useState, type ReactNode } from "react"
import type {
  AppSurface,
  CheckInEvent,
  Member,
  MemberStatus,
  MenuId,
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
}

export function WebShell({
  surface,
  theme,
  onSurfaceChange,
  onThemeChange,
  openAction,
}: {
  surface: AppSurface
  theme: ThemeMode
  onSurfaceChange: (surface: AppSurface) => void
  onThemeChange: (theme: ThemeMode) => void
  openAction: (kind: ActionKind) => void
}) {
  const role: WebRole =
    surface === "web-receptionist" ? "receptionist" : "admin"
  const [activeMenu, setActiveMenu] = useState<MenuId>("W01")
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
    default:
      return null
  }
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
          <ActionButton icon="plus" onClick={() => openAction("member-form")}>
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
                  "Gói hiện tại",
                  "Hiệu lực",
                  "Số buổi",
                  role === "admin" ? "Công nợ" : "Ghi chú",
                  "Trạng thái gói",
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
              {filtered.map((member) => (
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
                      <div>
                        <div className="font-semibold text-white">
                          {member.name}
                        </div>
                        <div style={{ color: palette.dim }}>{member.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#A0AABF" }}>
                    {member.packageName}
                  </td>
                  <td
                    className="px-4 py-3 font-mono"
                    style={{
                      color:
                        member.status === "expired"
                          ? palette.red
                          : member.status === "expiring"
                            ? palette.amber
                            : "#A0AABF",
                    }}
                  >
                    {member.validUntil}
                  </td>
                  <td
                    className="px-4 py-3 font-mono"
                    style={{ color: palette.muted }}
                  >
                    {member.sessionsLeft ?? "—"}
                  </td>
                  <td
                    className="px-4 py-3 font-mono"
                    style={{
                      color: member.debt > 0 ? palette.red : palette.dim,
                    }}
                  >
                    {role === "admin"
                      ? fmtVND(member.debt)
                      : member.debt > 0
                        ? "Cần thu"
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <MemberBadge status={member.status} />
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
                        onClick={() => openAction("member-form")}
                      />
                    </div>
                  </td>
                </tr>
              ))}
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
                    onClick={() => openAction("member-form")}
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
              Hồ sơ hội viên
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
              <MemberBadge status={selected.status} />
              <MemberProfileStatusBadge status={selected.profileStatus ?? "active"} />
            </div>

            <InfoStack
              items={[
                ["Số điện thoại", selected.phone],
                ["Email", selected.email ?? "Chưa có"],
                ["Chi nhánh", selected.branch],
                ["Gói hiện tại", selected.packageName],
                ["Hiệu lực", selected.validUntil],
                [
                  "Số buổi PT còn lại",
                  selected.sessionsLeft === null
                    ? "Không áp dụng"
                    : `${selected.sessionsLeft} buổi`,
                ],
                [
                  "Công nợ",
                  fmtVND(selected.debt),
                  selected.debt > 0 ? palette.red : undefined,
                ],
                ["Trạng thái hồ sơ", selected.profileStatus === "inactive" ? "Ngừng hoạt động" : selected.profileStatus === "archived" ? "Đã lưu trữ" : "Đang hoạt động"],
              ]}
            />

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
                icon="payment"
                onClick={() => openAction("payment-form")}
              >
                Ghi nhận thu tiền
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
        <ActionButton icon="plus" onClick={() => openAction("package-form")}>
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
                onClick={() => openAction("package-form")}
              >
                Sửa
              </ActionButton>
              <ActionButton
                variant={pkg.status === "selling" ? "danger" : "secondary"}
                onClick={() => openAction("package-form")}
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
  const [tab, setTab] = useState<"registrations" | "requests">("registrations")
  const rows =
    tab === "registrations"
      ? REGISTRATIONS.filter((item) => item.id.startsWith("DK"))
      : REGISTRATIONS.filter((item) => item.id.startsWith("REQ"))

  return (
    <div className="flex h-full flex-col">
      <Toolbar>
        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: "registrations", label: "Đăng ký" },
            { value: "requests", label: "Yêu cầu gia hạn" },
          ]}
        />
        <ActionButton
          icon="plus"
          onClick={() => openAction("registration-form")}
        >
          Đăng ký / gia hạn
        </ActionButton>
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
                "Mã",
                "Hội viên",
                "Gói / yêu cầu",
                "Từ ngày",
                "Đến ngày",
                "Tổng",
                "Đã thu",
                "PT",
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
            {rows.map((reg) => (
              <tr key={reg.id} className="transition-colors hover:bg-white/3">
                <td
                  className="px-4 py-3 font-mono"
                  style={{ color: palette.muted }}
                >
                  {reg.id}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-white">{reg.member}</div>
                  <div style={{ color: palette.dim }}>
                    {reg.memberId} · {reg.branch}
                  </div>
                </td>
                <td className="px-4 py-3 text-white">{reg.packageName}</td>
                <td
                  className="px-4 py-3 font-mono"
                  style={{ color: palette.muted }}
                >
                  {reg.from}
                </td>
                <td
                  className="px-4 py-3 font-mono"
                  style={{
                    color:
                      reg.status === "expired"
                        ? palette.red
                        : reg.status === "expiring"
                          ? palette.amber
                          : palette.muted,
                  }}
                >
                  {reg.to}
                </td>
                <td
                  className="px-4 py-3 font-mono"
                  style={{ color: palette.muted }}
                >
                  {fmtVND(reg.total)}
                </td>
                <td
                  className="px-4 py-3 font-mono"
                  style={{
                    color: reg.paid < reg.total ? palette.amber : palette.green,
                  }}
                >
                  {fmtVND(reg.paid)}
                </td>
                <td className="px-4 py-3" style={{ color: palette.muted }}>
                  {reg.pt ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <RegistrationBadge status={reg.status} />
                </td>
                <td className="px-4 py-3">
                  <ActionButton
                    variant="secondary"
                    onClick={() =>
                      openAction(
                        tab === "requests"
                          ? "registration-form"
                          : "payment-form",
                      )
                    }
                  >
                    {tab === "requests" ? "Xử lý" : "Thu tiền"}
                  </ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TrainersView({ openAction }: ScreenProps) {
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <span className="text-[14px]" style={{ color: palette.muted }}>
          {TRAINERS.length} huấn luyện viên · lọc theo chi nhánh và trạng thái
        </span>
        <ActionButton icon="plus" onClick={() => openAction("trainer-form")}>
          Thêm PT
        </ActionButton>
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {TRAINERS.map((trainer) => (
          <Panel key={trainer.id}>
            <div className="flex items-start gap-3">
              <Avatar name={trainer.name} tone={palette.purple} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="truncate font-bold text-white">
                    {trainer.name}
                  </div>
                  {trainer.status === "inactive" && (
                    <Pill>Ngừng hoạt động</Pill>
                  )}
                </div>
                <div
                  className="mt-0.5 font-mono text-[11px]"
                  style={{ color: palette.dim }}
                >
                  {trainer.id} · {trainer.phone} · {trainer.branch}
                </div>
                <div
                  className="mt-1 text-[12px]"
                  style={{ color: palette.muted }}
                >
                  {trainer.specialty}
                </div>
              </div>
            </div>
            <div
              className="mt-4 grid grid-cols-3 gap-2 border-t pt-3"
              style={{ borderColor: palette.border }}
            >
              <Metric label="Học viên" value={trainer.students} />
              <Metric label="Lịch kế tiếp" value={trainer.nextSlot} />
              <Metric label="Buổi/tuần TB" value={5} />
            </div>
            <div className="mt-3 flex gap-2">
              <ActionButton
                variant="secondary"
                icon="user"
                onClick={() => openAction("trainer-form")}
              >
                Hồ sơ
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon="calendar"
                onClick={() => openAction("work-schedule")}
              >
                Lịch làm
              </ActionButton>
              <ActionButton
                variant="secondary"
                icon="signup"
                onClick={() => openAction("registration-form")}
              >
                Phân công
              </ActionButton>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  )
}

function ScheduleView({ openAction }: ScreenProps) {
  const hours = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
  ]
  const trainers = TRAINERS.filter((trainer) => trainer.status === "active")

  return (
    <div className="flex h-full flex-col">
      <Toolbar>
        <Segment
          value="week"
          onChange={() => undefined}
          options={[
            { value: "week", label: "Tuần" },
            { value: "day", label: "Ngày" },
            { value: "list", label: "Danh sách" },
          ]}
        />
        <span
          className="font-mono text-[13px]"
          style={{ color: palette.muted }}
        >
          Tuần 37 · 07 - 13/09/2026
        </span>
        <ActionButton
          icon="plus"
          onClick={() => openAction("schedule-booking")}
        >
          Đặt lịch
        </ActionButton>
      </Toolbar>
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[820px] text-[12px]">
          <thead className="sticky top-0 z-10">
            <tr
              style={{
                background: "#0C1120",
                borderBottom: `1px solid ${palette.borderSoft}`,
              }}
            >
              <th
                className="w-20 px-4 py-3 text-left font-semibold"
                style={{ color: palette.dim }}
              >
                Giờ
              </th>
              {trainers.map((trainer) => (
                <th
                  key={trainer.id}
                  className="px-3 py-3 text-left font-semibold"
                  style={{ color: palette.dim }}
                >
                  <div>{trainer.name.split(" ").slice(-2).join(" ")}</div>
                  <div
                    className="font-mono font-normal"
                    style={{ color: palette.faint }}
                  >
                    {trainer.id}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => (
              <tr
                key={hour}
                className="h-14 border-b"
                style={{ borderColor: "#0F1820" }}
              >
                <td
                  className="px-4 py-2 font-mono"
                  style={{ color: "#3A4A60" }}
                >
                  {hour}
                </td>
                {trainers.map((trainer) => {
                  const session = SESSIONS.find(
                    (item) =>
                      item.trainerId === trainer.id && item.time === hour,
                  )
                  return (
                    <td key={trainer.id} className="px-3 py-2">
                      {session && session.status !== "empty" ? (
                        <button
                          type="button"
                          onClick={() =>
                            openAction(
                              session.status === "done"
                                ? "session-result"
                                : "schedule-change",
                            )
                          }
                          className="w-full rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5"
                          style={{
                            background: `${sessionColor(session.status)}18`,
                            borderLeft: `2px solid ${sessionColor(session.status)}`,
                          }}
                        >
                          <div className="truncate font-semibold text-white">
                            {session.member}
                          </div>
                          <div
                            style={{
                              color: `${sessionColor(session.status)}CC`,
                            }}
                          >
                            {session.packageName}
                          </div>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openAction("schedule-booking")}
                          className="h-full w-full rounded-md border border-dashed text-[11px] transition-colors hover:bg-white/3"
                          style={{
                            borderColor: palette.border,
                            color: palette.faint,
                          }}
                        >
                          Đặt lịch
                        </button>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                    onClick={() => openAction("member-form")}
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
                  onClick={() => openAction("member-form")}
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
  status: "done" | "ongoing" | "upcoming" | "empty" | "cancelled",
) {
  const colors = {
    done: palette.green,
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
