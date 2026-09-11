import { useState, type ReactNode } from "react"
import type { AppSurface, GymPackage, MobileRole, Session, ThemeMode } from "./data"
import {
  CARE_ITEMS,
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
  Ic,
  type IconName,
  MemberBadge,
  palette,
  Pill,
  SessionBadge,
  SurfaceSwitcher,
  ThemeToggle,
  fmtVND,
} from "./ui"

type MobileNavItem = { id: string; label: string; icon: IconName }

const MOBILE_NAV: Record<MobileRole, MobileNavItem[]> = {
  receptionist: [
    { id: "M01", label: "Trang chủ", icon: "home" },
    { id: "M02", label: "Hội viên", icon: "users" },
    { id: "M03", label: "Lịch tập", icon: "calendar" },
    { id: "M04", label: "Thông báo", icon: "bell" },
    { id: "M05", label: "Thêm", icon: "more" },
  ],
  trainer: [
    { id: "PT01", label: "Lịch", icon: "calendar" },
    { id: "PT02", label: "Học viên", icon: "users" },
    { id: "PT03", label: "Thông báo", icon: "bell" },
    { id: "PT04", label: "Tài khoản", icon: "user" },
  ],
  member: [
    { id: "HV01", label: "Trang chủ", icon: "home" },
    { id: "HV02", label: "Lịch tập", icon: "calendar" },
    { id: "HV03", label: "Gói của tôi", icon: "package" },
    { id: "HV04", label: "Tài khoản", icon: "user" },
  ],
}

const DEFAULT_TAB: Record<MobileRole, string> = {
  receptionist: "M01",
  trainer: "PT01",
  member: "HV01",
}

const ROLE_INFO: Record<MobileRole, {
  title: string
  user: string
  branch: string
}> = {
  receptionist: { title: "Lễ tân", user: "Lê Thị Thanh Hà", branch: "Quận 1" },
  trainer: {
    title: "Huấn luyện viên",
    user: "Nguyễn Thành Long",
    branch: "Quận 1",
  },
  member: { title: "Hội viên", user: "Trần Thị Bình", branch: "Quận 1" },
}

export function MobileShell({
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
  const role: MobileRole =
    surface === "mobile-trainer"
      ? "trainer"
      : surface === "mobile-member"
        ? "member"
        : "receptionist"
  const [tabs, setTabs] = useState<Record<MobileRole, string>>(DEFAULT_TAB)
  const [isLoggedIn, setIsLoggedIn] = useState<Record<MobileRole, boolean>>({
    receptionist: true,
    trainer: true,
    member: false,
  })
  const [memberTrainerAssignments, setMemberTrainerAssignments] = useState<Record<string, string>>({
    // Seed demo: DK002 đã được PT001 chấp nhận phụ trách.
    DK002: "PT001",
  })
  const [memberTrainerRequests, setMemberTrainerRequests] = useState<Record<string, string>>({})

  const activeTab = tabs[role]
  const nav = MOBILE_NAV[role]
  const info = ROLE_INFO[role]
  const isLoggedOut = role === "member" && !isLoggedIn.member

  return (
    <div
      className="flex min-h-full flex-col items-center gap-4 overflow-auto p-4"
      style={{ background: palette.bg }}
    >
      <div className="flex w-full max-w-[430px] items-center justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold text-white">Ứng dụng mobile</div>
          <div className="text-[13px]" style={{ color: palette.dim }}>
            {info.title} · mô phỏng theo vai trò
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle value={theme} onChange={onThemeChange} />
          <SurfaceSwitcher value={surface} onChange={onSurfaceChange} compact />
        </div>
      </div>

      <div
        className="flex h-[calc(100vh-96px)] min-h-[680px] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border shadow-2xl"
        style={{ background: palette.shell, borderColor: palette.border }}
      >
        {!isLoggedOut && (
          <header
            className="app-chrome shrink-0 border-b px-4 pb-3 pt-4"
            style={{ background: palette.company, borderColor: "rgba(255,255,255,0.14)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-[12px] font-medium"
                  style={{ color: "rgba(255,255,255,0.72)" }}
                >
                  {SHORT_TODAY}
                </div>
                <h1 className="truncate text-[18px] font-bold text-white">
                  {mobileTitle(role, activeTab)}
                </h1>
              </div>
              <button
                type="button"
                className="relative flex h-11 w-11 items-center justify-center rounded-lg border"
                style={{
                  background: "rgba(255,255,255,0.14)",
                  borderColor: "rgba(255,255,255,0.28)",
                  color: "#FFFFFF",
                }}
                aria-label="Thông báo"
              >
                <Ic k="bell" size={18} />
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full"
                  style={{ background: palette.red }}
                />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Avatar
                name={info.user}
                tone={
                  role === "member"
                    ? palette.blue
                    : role === "trainer"
                      ? palette.purple
                      : palette.orange
                }
                size={34}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-white">
                  {info.user}
                </div>
                <div className="app-chrome-muted text-[11px]">
                  {info.title} · {info.branch}
                </div>
              </div>
              <span
                className="inline-flex items-center rounded border px-2 py-0.5 text-[12px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.16)",
                  borderColor: "rgba(255,255,255,0.28)",
                  color: "#FFFFFF",
                }}
              >
                Đang online
              </span>
            </div>
          </header>
        )}

        <main className={`min-h-0 flex-1 overflow-y-auto ${isLoggedOut ? "p-0" : "px-4 py-4"}`}>
          {isLoggedOut ? (
            <MemberAuthFlow onLoginSuccess={() => setIsLoggedIn((prev) => ({ ...prev, member: true }))} />
          ) : (
            <MobileContent
              role={role}
              tab={activeTab}
              openAction={openAction}
              memberTrainerAssignments={memberTrainerAssignments}
              onAssignMemberTrainer={(registrationId, trainerId) => setMemberTrainerAssignments((prev) => ({ ...prev, [registrationId]: trainerId }))}
              memberTrainerRequests={memberTrainerRequests}
              onRequestMemberTrainer={(registrationId, trainerId) => setMemberTrainerRequests((prev) => ({ ...prev, [registrationId]: trainerId }))}
              onNavigateMemberTab={(tab) => setTabs((prev) => ({ ...prev, member: tab }))}
              onLogout={() => setIsLoggedIn((prev) => ({ ...prev, member: false }))}
            />
          )}
        </main>

        {!isLoggedOut && (
          <nav
            className="app-chrome grid shrink-0 border-t px-2 pb-3 pt-2"
            style={{
              background: palette.company,
              borderColor: "rgba(255,255,255,0.14)",
              gridTemplateColumns: `repeat(${nav.length}, 1fr)`,
            }}
          >
            {nav.map((item) => {
              const active = activeTab === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setTabs((current) => ({ ...current, [role]: item.id }))
                  }
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2"
                  style={{
                    color: active ? "#FFFFFF" : "rgba(255,255,255,0.68)",
                    background: active ? "rgba(255,255,255,0.14)" : "transparent",
                    ["--tw-ring-color" as string]: "#FFFFFF",
                  }}
                >
                  <Ic k={item.icon} size={18} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        )}
      </div>
    </div>
  )
}

function MobileContent({
  role,
  tab,
  openAction,
  memberTrainerAssignments,
  onAssignMemberTrainer,
  memberTrainerRequests,
  onRequestMemberTrainer,
  onNavigateMemberTab,
  onLogout,
}: {
  role: MobileRole
  tab: string
  openAction: (kind: ActionKind) => void
  memberTrainerAssignments: Record<string, string>
  onAssignMemberTrainer: (registrationId: string, trainerId: string) => void
  memberTrainerRequests: Record<string, string>
  onRequestMemberTrainer: (registrationId: string, trainerId: string) => void
  onNavigateMemberTab: (tab: string) => void
  onLogout?: () => void
}) {
  if (role === "receptionist")
    return <ReceptionistMobile tab={tab} openAction={openAction} />
  if (role === "trainer")
    return <TrainerMobile tab={tab} openAction={openAction} />
  return <MemberMobile tab={tab} openAction={openAction} memberTrainerAssignments={memberTrainerAssignments} onAssignMemberTrainer={onAssignMemberTrainer} memberTrainerRequests={memberTrainerRequests} onRequestMemberTrainer={onRequestMemberTrainer} onNavigateMemberTab={onNavigateMemberTab} onLogout={onLogout} />
}

function ReceptionistMobile({
  tab,
  openAction,
}: {
  tab: string
  openAction: (kind: ActionKind) => void
}) {
  if (tab === "M02")
    return <MobileMembers openAction={openAction} receptionist />
  if (tab === "M03") return <MobileSchedule openAction={openAction} />
  if (tab === "M04") return <MobileCare openAction={openAction} />
  if (tab === "M05") return <ReceptionistMore openAction={openAction} />

  return (
    <div className="space-y-4">
      <MobileCard accent={palette.orange}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px]" style={{ color: palette.dim }}>
              Ca hiện tại
            </div>
            <div className="text-[16px] font-bold text-white">Quầy Quận 1</div>
          </div>
          <Pill tone="blue">06:00 - 14:00</Pill>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <TinyMetric label="Lịch PT" value="8" />
          <TinyMetric label="Cần xử lý" value="4" />
          <TinyMetric label="Ra/vào" value="8" />
        </div>
      </MobileCard>

      <div className="relative">
        <Ic
          k="search"
          size={16}
          cls="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: palette.dim }}
        />
        <input
          className="min-h-12 w-full rounded-lg border py-3 pl-10 pr-3 text-[15px] outline-none focus:ring-2"
          style={{
            background: palette.control,
            borderColor: palette.border,
            color: palette.text,
            ["--tw-ring-color" as string]: palette.green,
          }}
          placeholder="Tìm hội viên, mã HV, số điện thoại"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <QuickAction
          icon="plus"
          label="Thêm HV"
          onClick={() => openAction("member-create")}
        />
        <QuickAction
          icon="calendar"
          label="Đặt lịch"
          onClick={() => openAction("schedule-booking")}
        />
        <QuickAction
          icon="scan"
          label="Ra/vào"
          onClick={() => openAction("manual-checkin")}
        />
      </div>

      <MobileSection title="Lịch hôm nay">
        {SESSIONS.filter((session) => session.status !== "empty")
          .slice(0, 4)
          .map((session) => (
            <MobileSessionRow
              key={session.id}
              session={session}
              openAction={openAction}
            />
          ))}
      </MobileSection>

      <MobileSection title="Cần chăm sóc">
        {CARE_ITEMS.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => openAction("contact-log")}
            className="flex w-full items-start gap-3 rounded-lg border p-3 text-left"
            style={{
              borderColor: palette.border,
              background: palette.panel,
            }}
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "rgba(245,158,11,0.12)",
                color: palette.amber,
              }}
            >
              <Ic
                k={
                  item.type === "debt"
                    ? "payment"
                    : item.type === "birthday"
                      ? "care"
                      : "warn"
                }
                size={17}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white">
                {item.title}
              </div>
              <div
                className="truncate text-[12px]"
                style={{ color: palette.dim }}
              >
                {item.member} · {item.detail}
              </div>
            </div>
            <CareBadge status={item.status} />
          </button>
        ))}
      </MobileSection>
    </div>
  )
}

function MobileMembers({
  openAction,
  receptionist = false,
}: {
  openAction: (kind: ActionKind) => void
  receptionist?: boolean
}) {
  const visible = receptionist
    ? MEMBERS.slice(0, 8)
    : MEMBERS.filter((member) => member.trainerId === "PT001").slice(0, 5)
  return (
    <div className="space-y-4">
      <div className="relative">
        <Ic
          k="search"
          size={16}
          cls="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: palette.dim }}
        />
        <input
          className="min-h-12 w-full rounded-lg border py-3 pl-10 pr-3 text-[15px] outline-none focus:ring-2"
          style={{
            background: palette.control,
            borderColor: palette.border,
            color: palette.text,
            ["--tw-ring-color" as string]: palette.green,
          }}
          placeholder={
            receptionist
              ? "Tên, mã HV, số điện thoại"
              : "Tìm học viên được phân công"
          }
        />
      </div>
      {receptionist && (
        <ActionButton
          block
          icon="plus"
          onClick={() => openAction("member-create")}
        >
          Thêm hội viên
        </ActionButton>
      )}
      <div className="space-y-2">
        {visible.map((member) => (
          <button
            key={member.id}
            type="button"
            onClick={() =>
              openAction(receptionist ? "member-update" : "session-result")
            }
            className="w-full rounded-lg border p-3 text-left"
            style={{ background: palette.panel, borderColor: palette.border }}
          >
            <div className="flex items-start gap-3">
              <Avatar name={member.name} tone={palette.blue} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-bold text-white">
                  {member.name}
                </div>
                <div
                  className="mt-0.5 text-[12px]"
                  style={{ color: palette.dim }}
                >
                  {member.id} · {member.phone}
                </div>
                <div
                  className="mt-1 text-[12px]"
                  style={{ color: palette.muted }}
                >
                  {member.packageName} · {member.validUntil}
                </div>
              </div>
              <MemberBadge status={member.status} />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <TinyMetric label="Buổi PT" value={member.sessionsLeft ?? "—"} />
              <TinyMetric
                label="Công nợ"
                value={member.debt ? fmtVND(member.debt) : "0 đ"}
              />
              <TinyMetric label="Lần cuối" value={member.lastVisit ?? "—"} />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function MobileSchedule({
  openAction,
  memberView = false,
  memberTrainerAssignments = {},
}: {
  openAction: (kind: ActionKind) => void
  memberView?: boolean
  memberTrainerAssignments?: Record<string, string>
}) {
  const [scheduleTab, setScheduleTab] = useState<"mine" | "book">("mine")
  const [statusFilter, setStatusFilter] = useState<"all" | "awaiting_confirmation" | "upcoming" | "cancelled" | "done">("all")
  const [sessionOverrides, setSessionOverrides] = useState<Record<string, Session["status"]>>({})
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>("DK002")
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-11")
  const memberRegistrations = REGISTRATIONS.filter((registration) => registration.memberId === "HV002")
  const selectedRegistration = memberRegistrations.find((registration) => registration.id === selectedRegistrationId) ?? memberRegistrations[0]
  const selectedTrainerId = selectedRegistration ? memberTrainerAssignments[selectedRegistration.id] : undefined
  const selectedTrainer = selectedTrainerId ? TRAINERS.find((trainer) => trainer.id === selectedTrainerId) : undefined
  const sessions = memberView
    ? SESSIONS.filter((session) => session.memberId === "HV002").map((session) => ({ ...session, status: sessionOverrides[session.id] ?? session.status }))
    : SESSIONS
  const filteredSessions = statusFilter === "all" ? sessions : sessions.filter((session) => session.status === statusFilter)
  const statusFilters: { id: typeof statusFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "awaiting_confirmation", label: "Chờ xác nhận" },
    { id: "upcoming", label: "Đã đặt" },
    { id: "cancelled", label: "Đã hủy" },
    { id: "done", label: "Hoàn thành" },
  ]
  const selectedDay = selectedDate.split("-").slice(1).reverse().join("/")
  const selectedDateLabel = selectedDate.split("-").reverse().join("/")
  const slots = ["08:00 - 10:00", "10:00 - 12:00", "12:00 - 14:00", "14:00 - 16:00", "16:00 - 18:00"]
  const trainerSessions = selectedTrainer
    ? SESSIONS.filter((session) => session.trainerId === selectedTrainer.id && session.date === selectedDateLabel && session.status !== "cancelled")
    : []

  if (!memberView) {
    return (
      <div className="space-y-4">
        <MobileSection title="Lịch trong ngày">
          {sessions.map((session) => <MobileSessionRow key={session.id} session={session} openAction={openAction} />)}
        </MobileSection>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-xl border p-1" style={{ background: palette.control, borderColor: palette.border }}>
        <button type="button" onClick={() => setScheduleTab("mine")} className="rounded-lg px-3 py-2 text-[12px] font-bold" style={{ background: scheduleTab === "mine" ? palette.company : "transparent", color: scheduleTab === "mine" ? "#FFFFFF" : palette.muted }}>
          Lịch của tôi
        </button>
        <button type="button" onClick={() => setScheduleTab("book")} className="rounded-lg px-3 py-2 text-[12px] font-bold" style={{ background: scheduleTab === "book" ? palette.company : "transparent", color: scheduleTab === "book" ? "#FFFFFF" : palette.muted }}>
          Đặt lịch PT
        </button>
      </div>

      {scheduleTab === "mine" ? (
        <>
          <MobileDatePicker value={selectedDate} onChange={setSelectedDate} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statusFilters.map((filter) => {
              const count = filter.id === "all" ? sessions.length : sessions.filter((session) => session.status === filter.id).length
              return <button key={filter.id} type="button" onClick={() => setStatusFilter(filter.id)} className="shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold" style={{ background: statusFilter === filter.id ? palette.company : palette.control, borderColor: statusFilter === filter.id ? palette.company : palette.border, color: statusFilter === filter.id ? "#FFFFFF" : palette.muted }}>{filter.label} ({count})</button>
            })}
          </div>
          <MobileSection title="Lịch của tôi">
            {filteredSessions.length > 0 ? filteredSessions.map((session) => <div key={session.id} className="space-y-2"><MobileSessionRow session={session} openAction={openAction} />{session.status === "upcoming" && <ActionButton block variant="danger" onClick={() => setSessionOverrides((prev) => ({ ...prev, [session.id]: "cancelled" }))}>Hủy lịch</ActionButton>}{session.status === "awaiting_confirmation" && <ActionButton block onClick={() => setSessionOverrides((prev) => ({ ...prev, [session.id]: "done" }))}>Xác nhận hoàn thành</ActionButton>}</div>) : <MobileCard><div className="text-center text-[13px]" style={{ color: palette.muted }}>Chưa có buổi tập ở trạng thái này.</div></MobileCard>}
          </MobileSection>
        </>
      ) : (
        <>
          <MobileCard accent={palette.green}>
            <div className="text-[13px] font-bold text-white">Chọn gói muốn sử dụng</div>
            <div className="mt-1 text-[11px]" style={{ color: palette.muted }}>Lịch bên dưới sẽ hiển thị theo PT phụ trách của gói.</div>
            <select value={selectedRegistration?.id ?? ""} onChange={(event) => setSelectedRegistrationId(event.target.value)} className="mt-3 h-10 w-full rounded-lg border px-3 text-[12px] font-semibold outline-none" style={{ background: palette.control, borderColor: palette.border, color: palette.text }}>
              {memberRegistrations.map((registration) => <option key={registration.id} value={registration.id}>{registration.packageName} · {registration.id}</option>)}
            </select>
          </MobileCard>

          {selectedTrainer ? <MobileCard accent={palette.blue}><div className="flex items-center gap-3"><Avatar name={selectedTrainer.name} tone={palette.blue} size={42} /><div className="min-w-0 flex-1"><div className="text-[12px]" style={{ color: palette.dim }}>Lịch của PT</div><div className="truncate text-[15px] font-bold text-white">{selectedTrainer.name}</div><div className="text-[11px]" style={{ color: palette.muted }}>{selectedTrainer.branch} · Mỗi buổi 2 giờ</div></div></div></MobileCard> : <MobileCard><div className="text-[13px] font-bold text-white">Gói này chưa có PT phụ trách</div><div className="mt-1 text-[12px]" style={{ color: palette.muted }}>Vào Gói của tôi để chọn PT và gửi yêu cầu. Chỉ đặt lịch sau khi PT chấp nhận.</div></MobileCard>}

          <MobileDatePicker value={selectedDate} onChange={setSelectedDate} />
          <div className="space-y-2"><div className="text-[12px] font-bold uppercase tracking-wider text-white">Khung giờ · {selectedDay}/2026</div>{slots.map((slot) => { const bookedSession = trainerSessions.find((session) => session.time === slot.split(" - ")[0]); const occupied = Boolean(bookedSession); return <button key={slot} type="button" disabled={!selectedTrainer || occupied} onClick={() => openAction("schedule-booking")} className="w-full rounded-xl border p-3 text-left" style={{ background: occupied ? "rgba(148,163,184,0.08)" : palette.panel, borderColor: occupied ? palette.border : "rgba(16,185,129,0.35)", opacity: selectedTrainer ? 1 : 0.6 }}><div className="flex items-center gap-3"><span className="w-[92px] shrink-0 whitespace-pre-line font-mono text-[12px] font-bold" style={{ color: palette.muted }}>{slot.replace(" - ", " -\n")}</span>{bookedSession ? <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-bold text-white">{bookedSession.member}</div><div className="truncate text-[11px]" style={{ color: palette.muted }}>{bookedSession.packageName}</div></div> : <span className="flex-1 text-[12px]" style={{ color: selectedTrainer ? palette.green : palette.muted }}>{selectedTrainer ? "Khung giờ trống · Chọn để đặt" : "Chưa thể chọn"}</span>}{bookedSession ? <SessionBadge status={bookedSession.status} /> : <Ic k="plus" size={16} style={{ color: palette.green }} />}</div></button> })}</div>
        </>
      )}
    </div>
  )
}

function MobileDatePicker({
  value,
  onChange,
}: {
  value: string
  onChange: (date: string) => void
}) {
  const [month, setMonth] = useState(() => {
    const [year, monthNumber] = value.split("-").map(Number)
    return new Date(year, monthNumber - 1, 1)
  })
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const firstDayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const monthLabel = month.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })
  const calendarCells = Array.from({ length: firstDayOffset + daysInMonth }, (_, index) => index < firstDayOffset ? null : index - firstDayOffset + 1)

  return (
    <MobileCard>
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-bold text-white capitalize">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Tháng trước" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px]" style={{ color: palette.muted }}>‹</button>
          <button type="button" aria-label="Tháng sau" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px]" style={{ color: palette.muted }}>›</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-semibold" style={{ color: palette.muted }}>
        {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
        {calendarCells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} className="h-8" />
          const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
          const selected = date === value
          return <button key={date} type="button" onClick={() => onChange(date)} className="mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold" style={{ background: selected ? palette.blue : "transparent", color: selected ? "#FFFFFF" : palette.text }}>{day}</button>
        })}
      </div>
    </MobileCard>
  )
}

function MobileCare({
  openAction,
}: {
  openAction: (kind: ActionKind) => void
}) {
  return (
    <div className="space-y-3">
      {CARE_ITEMS.map((item) => (
        <MobileCard key={item.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-white">
                {item.title}
              </div>
              <div
                className="mt-1 text-[12px]"
                style={{ color: palette.muted }}
              >
                {item.member} · {item.memberId}
              </div>
              <div
                className="mt-1 text-[12px] leading-relaxed"
                style={{ color: palette.dim }}
              >
                {item.detail}
              </div>
            </div>
            <CareBadge status={item.status} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <ActionButton
              variant="secondary"
              icon="send"
              onClick={() => openAction("notification-form")}
            >
              Gửi nhắc
            </ActionButton>
            <ActionButton
              variant="secondary"
              icon="care"
              onClick={() => openAction("contact-log")}
            >
              Liên hệ
            </ActionButton>
          </div>
        </MobileCard>
      ))}
    </div>
  )
}

function ReceptionistMore({
  openAction,
}: {
  openAction: (kind: ActionKind) => void
}) {
  return (
    <div className="space-y-3">
      <MoreRow
        icon="scan"
        title="Ra/vào thủ công"
        detail="Ghi nhận khi thiết bị lỗi hoặc không nhận diện"
        onClick={() => openAction("manual-checkin")}
      />
      <MoreRow
        icon="wallet"
        title="Thanh toán chuyển khoản"
        detail="Khởi tạo lệnh CK, theo dõi IPN/Webhook và xem phiếu sau xác nhận"
        onClick={() => openAction("bank-transfer-payment")}
      />
      <MoreRow
        icon="branch"
        title="Liên hệ chi nhánh"
        detail="Quận 1 · 028 3911 2026 · 06:00 - 22:00"
        onClick={() => openAction("branch-form")}
      />
      <MoreRow
        icon="user"
        title="Tài khoản cá nhân"
        detail="Hồ sơ, tùy chọn thông báo và đăng xuất"
        onClick={() => openAction("account-permissions")}
      />
      <MoreRow
        icon="settings"
        title="Thiết bị quầy"
        detail="Gate-Q1-01 · Online · đồng bộ 09:43"
        onClick={() => openAction("device-settings")}
      />
    </div>
  )
}

function TrainerMobile({
  tab,
  openAction,
}: {
  tab: string
  openAction: (kind: ActionKind) => void
}) {
  if (tab === "PT02") return <MobileMembers openAction={openAction} />
  if (tab === "PT03") return <TrainerNotifications openAction={openAction} />
  if (tab === "PT04") return <TrainerAccount openAction={openAction} />

  const mine = SESSIONS.filter(
    (session) => session.trainerId === "PT001" && session.status !== "empty",
  )
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.purple}>
        <div className="text-[12px]" style={{ color: palette.dim }}>
          Buổi tiếp theo
        </div>
        <div className="mt-1 text-[18px] font-bold text-white">
          09:00 · Trần Thị Bình
        </div>
        <div className="mt-1 text-[13px]" style={{ color: palette.muted }}>
          Gói PT 20 buổi · Quận 1 · còn 3 buổi
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ActionButton
            variant="secondary"
            icon="check"
            onClick={() => openAction("session-result")}
          >
            Ghi kết quả
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon="calendar"
            onClick={() => openAction("schedule-change")}
          >
            Đổi lịch
          </ActionButton>
        </div>
      </MobileCard>

      <MobileSection title="Lịch của tôi">
        {mine.map((session) => (
          <MobileSessionRow
            key={session.id}
            session={session}
            openAction={openAction}
            trainerView
          />
        ))}
      </MobileSection>

      <ActionButton
        block
        variant="secondary"
        icon="calendar"
        onClick={() => openAction("work-schedule")}
      >
        Cập nhật lịch làm việc
      </ActionButton>
    </div>
  )
}

function TrainerNotifications({
  openAction,
}: {
  openAction: (kind: ActionKind) => void
}) {
  const notices = [
    ["Lịch mới", "Mai Văn Khoa đặt lịch 14:00 hôm nay"],
    ["Đổi lịch", "Vũ Thị Phương muốn đổi sang 17:00"],
    ["Cần ghi kết quả", "Buổi 07:00 đã kết thúc, chưa ghi nhận"],
  ]
  return (
    <div className="space-y-3">
      {notices.map(([title, detail]) => (
        <MobileCard key={title}>
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "rgba(139,92,246,0.14)",
                color: palette.purple,
              }}
            >
              <Ic k="bell" size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-bold text-white">{title}</div>
              <div
                className="mt-1 text-[12px]"
                style={{ color: palette.muted }}
              >
                {detail}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <ActionButton
              variant="secondary"
              icon="eye"
              onClick={() =>
                openAction(
                  title === "Đổi lịch" ? "schedule-change" : "session-result",
                )
              }
            >
              Mở chi tiết
            </ActionButton>
          </div>
        </MobileCard>
      ))}
    </div>
  )
}

function TrainerAccount({
  openAction,
}: {
  openAction: (kind: ActionKind) => void
}) {
  const trainer = TRAINERS[0]
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.purple}>
        <div className="flex items-center gap-3">
          <Avatar name={trainer.name} tone={palette.purple} size={56} />
          <div>
            <div className="text-[16px] font-bold text-white">
              {trainer.name}
            </div>
            <div className="text-[12px]" style={{ color: palette.dim }}>
              {trainer.id} · {trainer.branch}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
              {trainer.specialty}
            </div>
          </div>
        </div>
      </MobileCard>
      <PreferenceRow title="Nhận thông báo lịch mới" checked />
      <PreferenceRow title="Nhắc ghi kết quả sau buổi" checked />
      <PreferenceRow title="Hiển thị số điện thoại cho học viên" />
      <ActionButton
        block
        variant="secondary"
        icon="user"
        onClick={() => openAction("account-permissions")}
      >
        Hồ sơ và quyền
      </ActionButton>
    </div>
  )
}

export function MemberAuthFlow({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void
}) {
  const [step, setStep] = useState<
    | "login"
    | "check_phone"
    | "case1_exists"
    | "case2_info"
    | "case2_otp"
    | "case3_info"
    | "case3_otp"
    | "success"
  >("login")

  const [phone, setPhone] = useState("0902 345 678")
  const [password, setPassword] = useState("••••••••")
  const [regPhone, setRegPhone] = useState("0901 234 567")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [pwdError, setPwdError] = useState("")
  const [resendNotice, setResendNotice] = useState("")

  const [matchedMember, setMatchedMember] = useState<{ id: string; name: string; branch: string } | null>(null)
  const [successMsg, setSuccessMsg] = useState("")

  const handleCheckPhone = () => {
    const clean = regPhone.replace(/\D/g, "")
    // Case 1: Existing Account (e.g. 0902 345 678 - HV002 Trần Thị Bình)
    if (clean === "0902345678") {
      setStep("case1_exists")
      return
    }
    // Case 2: Existing Profile at desk, NO account yet (e.g. 0901 234 567 - HV001 Nguyễn Văn An)
    const found = MEMBERS.find((m) => m.phone.replace(/\D/g, "") === clean)
    if (found) {
      setMatchedMember({ id: found.id, name: found.name, branch: found.branch })
      setNewPassword("")
      setConfirmPassword("")
      setPwdError("")
      setStep("case2_info")
      return
    }
    // Case 3: NO profile exists -> Self registration
    setNewPassword("")
    setConfirmPassword("")
    setPwdError("")
    setStep("case3_info")
  }

  const handleCase2InfoSubmit = () => {
    if (!newPassword) {
      setPwdError("Vui lòng nhập mật khẩu mới")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Mật khẩu xác nhận không khớp")
      return
    }
    setPwdError("")
    setOtp("")
    setResendNotice("")
    setStep("case2_otp")
  }

  const handleCase3InfoSubmit = () => {
    if (!fullname.trim()) {
      setPwdError("Vui lòng nhập họ và tên")
      return
    }
    if (!newPassword) {
      setPwdError("Vui lòng tạo mật khẩu")
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdError("Mật khẩu xác nhận không khớp")
      return
    }
    setPwdError("")
    setOtp("")
    setResendNotice("")
    setStep("case3_otp")
  }

  return (
    <div className="h-full min-h-[600px] w-full">
      {step === "login" && (
        <div className="flex flex-col items-center justify-between h-full min-h-[600px] p-6 text-white bg-[#121212]">
          <div className="w-full flex-1 flex flex-col items-center justify-center space-y-8">
            {/* PARADISE GYM Brand Logo */}
            <div className="text-center">
              <h1 className="text-[28px] font-black tracking-wider text-[#10B981] leading-none">
                PARADISE
              </h1>
              <h1 className="text-[28px] font-black tracking-wider text-[#10B981] leading-none mt-1">
                GYM
              </h1>
            </div>

            {/* Input Card */}
            <div className="w-full space-y-3">
              <div className="rounded-xl bg-[#262626] border border-white/10 overflow-hidden divide-y divide-white/10">
                <div className="flex items-center px-4 py-3 gap-3">
                  <Ic k="phone" size={18} style={{ color: palette.dim }} />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Số điện thoại"
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center px-4 py-3 gap-3">
                  <Ic k="shield" size={18} style={{ color: palette.dim }} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full bg-transparent text-[14px] text-white outline-none placeholder-gray-400"
                  />
                </div>
              </div>

              {/* SIGN IN Button */}
              <button
                type="button"
                onClick={onLoginSuccess}
                className="w-full py-3.5 rounded-full bg-[#059669] hover:bg-[#10B981] text-white font-bold text-[14px] tracking-wide transition shadow-lg cursor-pointer text-center"
              >
                ĐĂNG NHẬP (SIGN IN)
              </button>

              {/* Links */}
              <div className="pt-2 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => setStep("check_phone")}
                  className="text-[13px] font-medium text-[#10B981] hover:underline cursor-pointer"
                >
                  Chưa có tài khoản? Tạo tài khoản ngay →
                </button>
              </div>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="text-center text-[11px] text-gray-500 leading-relaxed px-4 pt-6">
            Bằng việc sử dụng ứng dụng này, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của Paradise Gym.
          </div>
        </div>
      )}

      {step === "check_phone" && (
        <div className="p-4">
          <MobileCard>
            <div className="space-y-4">
              <div>
                <div className="text-[16px] font-bold text-white">Tạo tài khoản mới</div>
                <div className="text-[12px] mt-0.5" style={{ color: palette.muted }}>
                  Nhập số điện thoại của bạn để đăng ký hoặc kích hoạt tài khoản.
                </div>
              </div>

              <div>
                <label className="text-[12px] font-semibold text-white block mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="Ví dụ: 0901 234 567"
                  className="w-full rounded-xl border px-3 py-2.5 text-[13px] outline-none transition"
                  style={{
                    background: palette.control,
                    borderColor: palette.border,
                    color: palette.text,
                  }}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton variant="secondary" onClick={() => setStep("login")}>
                  ← Quay lại
                </ActionButton>
                <ActionButton block variant="purple" onClick={handleCheckPhone}>
                  Tiếp tục →
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {step === "case1_exists" && (
        <div className="p-4">
          <MobileCard accent={palette.red}>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-[14px]">
                <Ic k="warn" size={18} />
                <span>Số điện thoại đã được đăng ký</span>
              </div>
              <p className="text-[13px] leading-relaxed text-gray-300">
                Số điện thoại <strong>{regPhone}</strong> đã có tài khoản trên ứng dụng Paradise Gym.
              </p>
              <p className="text-[12px] text-gray-400">
                Vui lòng quay lại màn hình Đăng nhập để truy cập tài khoản của bạn.
              </p>
              <div className="pt-2">
                <ActionButton block variant="purple" onClick={() => setStep("login")}>
                  Quay lại Đăng nhập
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {step === "case2_info" && matchedMember && (
        <div className="p-4">
          <MobileCard accent={palette.green}>
            <div className="space-y-4">
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
                  Xác nhận hồ sơ hội viên
                </span>
                <div className="text-[16px] font-bold text-white mt-2">
                  Kích hoạt tài khoản
                </div>
              </div>

              <div className="rounded-xl border p-3 space-y-1" style={{ background: palette.panel, borderColor: palette.border }}>
                <div className="text-[13px] font-bold text-white">
                  {matchedMember.name}
                </div>
                <div className="text-[12px]" style={{ color: palette.muted }}>
                  Mã hội viên: <strong className="font-mono text-white">{matchedMember.id}</strong> · Chi nhánh: {matchedMember.branch}
                </div>
              </div>

              {pwdError && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-[12px] text-red-400 font-semibold">
                  ⚠️ {pwdError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-semibold text-white block mb-1">
                    Tạo mật khẩu cá nhân *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-white block mb-1">
                    Xác nhận mật khẩu *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton variant="secondary" onClick={() => setStep("check_phone")}>
                  ← Quay lại
                </ActionButton>
                <ActionButton
                  block
                  variant="purple"
                  onClick={handleCase2InfoSubmit}
                >
                  Tiếp tục → Gửi mã OTP
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {step === "case2_otp" && matchedMember && (
        <div className="p-4">
          <MobileCard accent={palette.green}>
            <div className="space-y-4">
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
                  Xác thực OTP
                </span>
                <div className="text-[16px] font-bold text-white mt-2">
                  Nhập mã xác thực
                </div>
                <div className="text-[12px] mt-1" style={{ color: palette.muted }}>
                  Mã OTP gồm 6 chữ số đã được gửi đến số điện thoại <strong className="text-white font-mono">{regPhone}</strong>.
                </div>
              </div>

              {resendNotice && (
                <div className="rounded-lg bg-green-500/15 border border-green-500/30 p-2.5 text-[12px] text-green-400">
                  ✓ {resendNotice}
                </div>
              )}

              <div>
                <label className="text-[12px] font-semibold text-white block mb-1">
                  Mã xác thực OTP *
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Nhập mã OTP 6 chữ số..."
                  className="w-full rounded-xl border px-3 py-2 text-[13px] font-mono outline-none transition"
                  style={{
                    background: palette.control,
                    borderColor: palette.border,
                    color: palette.text,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400">Chưa nhận được mã?</span>
                <button
                  type="button"
                  onClick={() => setResendNotice(`Đã gửi lại mã OTP mới đến SĐT ${regPhone}`)}
                  className="text-[12px] font-semibold text-[#10B981] hover:underline cursor-pointer"
                >
                  Gửi lại mã OTP
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton variant="secondary" onClick={() => setStep("case2_info")}>
                  ← Quay lại
                </ActionButton>
                <ActionButton
                  block
                  variant="purple"
                  onClick={() => {
                    setSuccessMsg(`Tài khoản hội viên đã kích hoạt và liên kết thành công với hồ sơ ${matchedMember.name} (${matchedMember.id})!`)
                    setStep("success")
                  }}
                >
                  Kích hoạt & Đăng nhập
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {step === "case3_info" && (
        <div className="p-4">
          <MobileCard accent={palette.orange}>
            <div className="space-y-4">
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  Đăng ký hồ sơ mới
                </span>
                <div className="text-[16px] font-bold text-white mt-2">
                  Thông tin cá nhân & Mật khẩu
                </div>
                <div className="text-[12px]" style={{ color: palette.muted }}>
                  Vui lòng điền thông tin để đăng ký hồ sơ và tạo mật khẩu cho tài khoản.
                </div>
              </div>

              {pwdError && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-[12px] text-red-400 font-semibold">
                  ⚠️ {pwdError}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="text-[12px] font-semibold text-white block mb-1">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-white block mb-1">
                    Email (Tùy chọn)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.vn"
                    className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-white block mb-1">
                    Tạo mật khẩu cá nhân *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  />
                </div>

                <div>
                  <label className="text-[12px] font-semibold text-white block mb-1">
                    Xác nhận mật khẩu *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu..."
                    className="w-full rounded-xl border px-3 py-2 text-[13px] outline-none transition"
                    style={{
                      background: palette.control,
                      borderColor: palette.border,
                      color: palette.text,
                    }}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton variant="secondary" onClick={() => setStep("check_phone")}>
                  ← Quay lại
                </ActionButton>
                <ActionButton
                  block
                  variant="purple"
                  onClick={handleCase3InfoSubmit}
                >
                  Tiếp tục → Gửi mã OTP
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {step === "case3_otp" && (
        <div className="p-4">
          <MobileCard accent={palette.orange}>
            <div className="space-y-4">
              <div>
                <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                  Xác thực OTP
                </span>
                <div className="text-[16px] font-bold text-white mt-2">
                  Nhập mã xác thực
                </div>
                <div className="text-[12px] mt-1" style={{ color: palette.muted }}>
                  Mã OTP gồm 6 chữ số đã được gửi đến số điện thoại <strong className="text-white font-mono">{regPhone}</strong>.
                </div>
              </div>

              {resendNotice && (
                <div className="rounded-lg bg-green-500/15 border border-green-500/30 p-2.5 text-[12px] text-green-400">
                  ✓ {resendNotice}
                </div>
              )}

              <div>
                <label className="text-[12px] font-semibold text-white block mb-1">
                  Mã xác thực OTP *
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Nhập mã OTP 6 chữ số..."
                  className="w-full rounded-xl border px-3 py-2 text-[13px] font-mono outline-none transition"
                  style={{
                    background: palette.control,
                    borderColor: palette.border,
                    color: palette.text,
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-gray-400">Chưa nhận được mã?</span>
                <button
                  type="button"
                  onClick={() => setResendNotice(`Đã gửi lại mã OTP mới đến SĐT ${regPhone}`)}
                  className="text-[12px] font-semibold text-[#10B981] hover:underline cursor-pointer"
                >
                  Gửi lại mã OTP
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <ActionButton variant="secondary" onClick={() => setStep("case3_info")}>
                  ← Quay lại
                </ActionButton>
                <ActionButton
                  block
                  variant="purple"
                  onClick={() => {
                    setSuccessMsg(`Tạo mới Hồ sơ hội viên & Tài khoản cho ${fullname || "Hội viên mới"} thành công!`)
                    setStep("success")
                  }}
                >
                  Hoàn tất đăng ký
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}

      {step === "success" && (
        <div className="p-4">
          <MobileCard accent={palette.green}>
            <div className="space-y-3 text-center py-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 text-green-400 mx-auto">
                <Ic k="check" size={24} />
              </div>
              <div className="text-[16px] font-bold text-white">Đăng ký thành công!</div>
              <p className="text-[13px] leading-relaxed text-gray-300">
                {successMsg}
              </p>
              <div className="pt-2">
                <ActionButton block variant="purple" onClick={onLoginSuccess}>
                  Vào ứng dụng ngay
                </ActionButton>
              </div>
            </div>
          </MobileCard>
        </div>
      )}
    </div>
  )
}

function MemberMobile({
  tab,
  openAction,
  memberTrainerAssignments,
  onAssignMemberTrainer,
  memberTrainerRequests,
  onRequestMemberTrainer,
  onNavigateMemberTab,
  onLogout,
}: {
  tab: string
  openAction: (kind: ActionKind) => void
  memberTrainerAssignments: Record<string, string>
  onAssignMemberTrainer: (registrationId: string, trainerId: string) => void
  memberTrainerRequests: Record<string, string>
  onRequestMemberTrainer: (registrationId: string, trainerId: string) => void
  onNavigateMemberTab: (tab: string) => void
  onLogout?: () => void
}) {
  const memberRegistration = REGISTRATIONS.find((registration) => registration.memberId === "HV002")
  const requestedTrainerId = memberRegistration ? memberTrainerRequests[memberRegistration.id] : undefined
  const requestedTrainer = requestedTrainerId ? TRAINERS.find((trainer) => trainer.id === requestedTrainerId) : undefined
  if (tab === "HV02")
    return <MobileSchedule openAction={openAction} memberView memberTrainerAssignments={memberTrainerAssignments} />
  if (tab === "HV03") return <MemberPackages openAction={openAction} memberTrainerAssignments={memberTrainerAssignments} onAssignMemberTrainer={onAssignMemberTrainer} memberTrainerRequests={memberTrainerRequests} onRequestMemberTrainer={onRequestMemberTrainer} />
  if (tab === "HV04") return <MemberAccount openAction={openAction} onLogout={onLogout} />

  const upcomingSession = SESSIONS.find((session) => session.memberId === "HV002" && session.status === "upcoming")
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.blue}>
        <div className="text-[12px]" style={{ color: palette.dim }}>Xin chào, Trần Thị Bình</div>
        <div className="mt-1 text-[20px] font-bold text-white">Hôm nay bạn muốn làm gì?</div>
        <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>Trang tổng quan để bạn biết việc cần làm và đi nhanh đến đúng chức năng.</div>
      </MobileCard>

      <MobileCard accent={requestedTrainer ? palette.amber : palette.green}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: requestedTrainer ? "rgba(245,158,11,0.14)" : "rgba(16,185,129,0.14)", color: requestedTrainer ? palette.amber : palette.green }}>
            <Ic k={requestedTrainer ? "clock" : "check"} size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-white">{requestedTrainer ? "Yêu cầu PT đang chờ phản hồi" : "Không có việc cần xử lý"}</div>
            <div className="mt-1 text-[12px] leading-relaxed" style={{ color: palette.muted }}>{requestedTrainer ? `${requestedTrainer.name} đang xem yêu cầu chọn PT của bạn.` : "Bạn có thể mua gói mới hoặc đặt một buổi trong lịch PT."}</div>
          </div>
        </div>
        {requestedTrainer && <div className="mt-3"><ActionButton block variant="secondary" onClick={() => onNavigateMemberTab("HV03")}>Xem yêu cầu PT</ActionButton></div>}
      </MobileCard>

      <MobileCard>
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-[12px]" style={{ color: palette.dim }}>Lịch sắp tới</div><div className="mt-1 text-[15px] font-bold text-white">{upcomingSession ? `${upcomingSession.date} · ${upcomingSession.time}` : "Chưa có lịch sắp tới"}</div>{upcomingSession && <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>{upcomingSession.trainer} · {upcomingSession.packageName}</div>}</div>
          <Ic k="calendar" size={22} style={{ color: palette.blue }} />
        </div>
        <div className="mt-3"><ActionButton block variant="secondary" onClick={() => onNavigateMemberTab("HV02")}>Xem lịch của tôi</ActionButton></div>
      </MobileCard>

      <MobileCard accent={palette.green}>
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[12px]" style={{ color: palette.dim }}>Thao tác nhanh</div><div className="mt-1 text-[16px] font-bold text-white">Quản lý gói tập</div><div className="mt-1 text-[12px] leading-relaxed" style={{ color: palette.muted }}>Mua gói, xem tiến độ sử dụng và quản lý PT phụ trách.</div></div>
          <Ic k="package" size={22} style={{ color: palette.green }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2"><ActionButton block onClick={() => onNavigateMemberTab("HV03")}>Mua gói</ActionButton><ActionButton block variant="secondary" onClick={() => onNavigateMemberTab("HV03")}>Gói của tôi</ActionButton></div>
      </MobileCard>
    </div>
  )
}

function MemberPackages({
  openAction,
  memberTrainerAssignments,
  onAssignMemberTrainer,
  memberTrainerRequests,
  onRequestMemberTrainer,
}: {
  openAction: (kind: ActionKind) => void
  memberTrainerAssignments: Record<string, string>
  onAssignMemberTrainer: (registrationId: string, trainerId: string) => void
  memberTrainerRequests: Record<string, string>
  onRequestMemberTrainer: (registrationId: string, trainerId: string) => void
}) {
  const member = MEMBERS[1]

  const [view, setView] = useState<"owned" | "buy" | "pay" | "trainer" | "requests" | "details">("owned")
  const [packageStatusFilter, setPackageStatusFilter] = useState<"active" | "pending" | "expired">("active")
  const [selectedPackage, setSelectedPackage] = useState<GymPackage | null>(null)
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string>("DK002")
  const [paymentMethod, setPaymentMethod] = useState<"Chuyển khoản" | "Ví điện tử">("Chuyển khoản")
  const memberRegistrations = REGISTRATIONS.filter((registration) => registration.memberId === member.id)
  const selectedRegistration = memberRegistrations.find((registration) => registration.id === selectedRegistrationId)
  const assignedTrainerId = selectedRegistration ? memberTrainerAssignments[selectedRegistration.id] : undefined
  const assignedTrainer = assignedTrainerId ? TRAINERS.find((trainer) => trainer.id === assignedTrainerId) : undefined
  const requestedTrainerId = selectedRegistration ? memberTrainerRequests[selectedRegistration.id] : undefined
  const requestedTrainer = requestedTrainerId ? TRAINERS.find((trainer) => trainer.id === requestedTrainerId) : undefined
  const sellingPackages = PACKAGES.filter((pkg) => pkg.status === "selling")
  const [memberPaymentHistory, setMemberPaymentHistory] = useState(() => PAYMENTS.filter((payment) => payment.member === member.name))
  const pkgs = member.packages ?? [
    {
      name: member.packageName,
      type: "PT" as const,
      validUntil: member.validUntil,
      sessionsLeft: member.sessionsLeft,
      status: member.status,
    },
  ]
  if (view === "buy") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 rounded-xl border p-1" style={{ background: palette.control, borderColor: palette.border }}>
          <button type="button" onClick={() => setView("owned")} className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: palette.muted }}>Gói của tôi</button>
          <button type="button" className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ background: palette.company, color: "#FFFFFF" }}>Mua gói</button>
          <button type="button" onClick={() => setView("requests")} className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: palette.muted }}>Yêu cầu PT</button>
        </div>
        <div>
          <div className="text-[18px] font-bold text-white">Mua gói tập</div>
          <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>Chọn gói phù hợp, sau đó thanh toán trực tuyến.</div>
        </div>
        {sellingPackages.map((pkg) => (
          <MobileCard key={pkg.id} accent={pkg.service === "PT" || pkg.service === "Combo" ? palette.blue : palette.green}>
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-[15px] font-bold text-white">{pkg.name}</div><div className="mt-1 text-[12px]" style={{ color: palette.muted }}>{pkg.duration ?? "Theo buổi"} · {pkg.sessions ? `${pkg.sessions} buổi PT` : "Không giới hạn lượt"}</div></div>
              <div className="text-right font-mono text-[14px] font-bold" style={{ color: palette.orange }}>{fmtVND(pkg.price)}</div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton block variant="secondary" onClick={() => { setSelectedPackage(pkg); setView("details") }}>Xem chi tiết</ActionButton>
              <ActionButton block onClick={() => { setSelectedPackage(pkg); setView("pay") }}>Mua gói</ActionButton>
            </div>
          </MobileCard>
        ))}
        <ActionButton block variant="secondary" onClick={() => setView("owned")}>← Gói của tôi</ActionButton>
      </div>
    )
  }

  if (view === "requests") {
    const requests = Object.entries(memberTrainerRequests)
      .map(([registrationId, trainerId]) => ({
        registration: memberRegistrations.find((registration) => registration.id === registrationId),
        trainer: TRAINERS.find((trainer) => trainer.id === trainerId),
      }))
      .filter((request) => request.registration && request.trainer)
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 rounded-xl border p-1" style={{ background: palette.control, borderColor: palette.border }}>
          <button type="button" onClick={() => setView("owned")} className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: palette.muted }}>Gói của tôi</button>
          <button type="button" onClick={() => setView("buy")} className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: palette.muted }}>Mua gói</button>
          <button type="button" className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ background: palette.company, color: "#FFFFFF" }}>Yêu cầu PT</button>
        </div>
        <div><div className="text-[18px] font-bold text-white">Yêu cầu PT</div><div className="mt-1 text-[12px]" style={{ color: palette.muted }}>Theo dõi các yêu cầu chọn PT đang chờ phản hồi.</div></div>
        {requests.length > 0 ? requests.map(({ registration, trainer }) => <MobileCard key={registration!.id} accent={palette.amber}><div className="flex items-center gap-3"><Avatar name={trainer!.name} tone={palette.blue} size={42} /><div className="min-w-0 flex-1"><div className="text-[14px] font-bold text-white">{registration!.packageName}</div><div className="mt-1 text-[12px]" style={{ color: palette.muted }}>PT được yêu cầu: {trainer!.name}</div><div className="mt-1 text-[11px] font-semibold" style={{ color: palette.amber }}>Chờ PT phản hồi</div></div></div></MobileCard>) : <MobileCard><div className="text-center text-[13px]" style={{ color: palette.muted }}>Chưa có yêu cầu PT nào.</div></MobileCard>}
      </div>
    )
  }

  if (view === "details" && selectedPackage) {
    return (
      <div className="space-y-4">
        <MobileCard accent={selectedPackage.service === "PT" || selectedPackage.service === "Combo" ? palette.blue : palette.green}><div className="text-[18px] font-bold text-white">{selectedPackage.name}</div><div className="mt-2 text-[13px]" style={{ color: palette.muted }}>{selectedPackage.duration ?? "Theo buổi"} · {selectedPackage.sessions ? `${selectedPackage.sessions} buổi PT` : "Không giới hạn lượt"}</div><div className="mt-3 text-[22px] font-bold" style={{ color: palette.orange }}>{fmtVND(selectedPackage.price)}</div></MobileCard>
        <MobileCard><div className="text-[13px] font-bold text-white">Quyền lợi gói</div><div className="mt-2 space-y-2 text-[12px]" style={{ color: palette.muted }}><div>✓ Sử dụng tại các chi nhánh áp dụng</div><div>✓ Theo dõi lịch và trạng thái gói trên mobile</div>{(selectedPackage.service === "PT" || selectedPackage.service === "Combo") && <div>✓ Chọn PT phụ trách sau khi thanh toán</div>}</div></MobileCard>
        <ActionButton block onClick={() => setView("pay")}>Mua gói</ActionButton>
        <ActionButton block variant="secondary" onClick={() => setView("buy")}>← Danh sách gói</ActionButton>
      </div>
    )
  }

  if (view === "pay" && selectedPackage) {
    return (
      <div className="space-y-4">
        <MobileCard accent={palette.orange}><div className="text-[16px] font-bold text-white">Thanh toán gói</div><div className="mt-2 flex justify-between text-[13px]" style={{ color: palette.muted }}><span>{selectedPackage.name}</span><strong className="text-white">{fmtVND(selectedPackage.price)}</strong></div></MobileCard>
        <MobileCard><div className="text-[13px] font-bold text-white">Phương thức thanh toán</div><div className="mt-3 grid grid-cols-2 gap-2">{(["Chuyển khoản", "Ví điện tử"] as const).map((method) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} className="rounded-lg border p-3 text-[12px] font-semibold" style={{ borderColor: paymentMethod === method ? palette.green : palette.border, color: paymentMethod === method ? palette.green : palette.muted }}>{method}</button>)}</div><div className="mt-3 rounded-lg p-3 text-[12px]" style={{ background: palette.control, color: palette.muted }}>{paymentMethod === "Chuyển khoản" ? "Tạo QR thanh toán và chờ ngân hàng xác nhận." : "Thanh toán qua ví điện tử liên kết."}</div></MobileCard>
        <ActionButton block variant="purple" onClick={() => { setMemberPaymentHistory((payments) => [{ id: `PT-MOBILE-${payments.length + 1}`, time: "Vừa xong", member: member.name, ref: selectedPackage.id, method: "Chuyển khoản", amount: selectedPackage.price, status: "pending", by: "Thanh toán mobile", branch: member.branch }, ...payments]); setView(selectedPackage.service === "PT" || selectedPackage.service === "Combo" ? "trainer" : "owned") }}>Thanh toán {fmtVND(selectedPackage.price)}</ActionButton>
        <ActionButton block variant="secondary" onClick={() => setView("buy")}>← Chọn gói khác</ActionButton>
      </div>
    )
  }

  if (view === "trainer" && selectedPackage) {
    return (
      <div className="space-y-4">
        <MobileCard accent={palette.blue}><div className="text-[16px] font-bold text-white">Chọn PT phụ trách</div><div className="mt-1 text-[12px]" style={{ color: palette.muted }}>Chọn PT để gửi yêu cầu. PT cần phản hồi trước khi bạn có thể đặt lịch.</div></MobileCard>
        {TRAINERS.filter((trainer) => trainer.status === "active").map((trainer) => <button key={trainer.id} type="button" className="w-full text-left" onClick={() => { onRequestMemberTrainer(selectedRegistrationId, trainer.id); setView("owned") }}><MobileCard><div className="flex items-center gap-3"><Avatar name={trainer.name} tone={palette.blue} size={44} /><div className="min-w-0 flex-1"><div className="truncate text-[14px] font-bold text-white">{trainer.name}</div><div className="text-[11px]" style={{ color: palette.muted }}>{trainer.specialty} · {trainer.branch}</div></div><span className="text-[12px] font-bold" style={{ color: palette.green }}>Gửi yêu cầu</span></div></MobileCard></button>)}
      </div>
    )
  }

  const visiblePackages = pkgs.filter((pkg) => {
    if (packageStatusFilter === "active") return pkg.status === "active" || pkg.status === "expiring"
    if (packageStatusFilter === "pending") return pkg.status === "none"
    return pkg.status === "expired"
  })
  const packageStatusTabs: { id: typeof packageStatusFilter; label: string }[] = [
    { id: "active", label: "Đang sử dụng" },
    { id: "pending", label: "Chờ xử lý" },
    { id: "expired", label: "Đã hết hạn" },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 rounded-xl border p-1" style={{ background: palette.control, borderColor: palette.border }}>
        <button type="button" className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ background: palette.company, color: "#FFFFFF" }}>Gói của tôi</button>
        <button type="button" onClick={() => setView("buy")} className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: palette.muted }}>Mua gói</button>
        <button type="button" onClick={() => setView("requests")} className="rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: palette.muted }}>Yêu cầu PT</button>
      </div>
      <div className="px-1 text-[12px] font-bold uppercase tracking-wider text-white">Gói của tôi ({pkgs.length})</div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {packageStatusTabs.map((tab) => {
          const count = tab.id === "active" ? pkgs.filter((pkg) => pkg.status === "active" || pkg.status === "expiring").length : tab.id === "pending" ? pkgs.filter((pkg) => pkg.status === "none").length : pkgs.filter((pkg) => pkg.status === "expired").length
          return <button key={tab.id} type="button" onClick={() => setPackageStatusFilter(tab.id)} className="shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold" style={{ background: packageStatusFilter === tab.id ? palette.company : palette.control, borderColor: packageStatusFilter === tab.id ? palette.company : palette.border, color: packageStatusFilter === tab.id ? "#FFFFFF" : palette.muted }}>{tab.label} ({count})</button>
        })}
      </div>
      {requestedTrainer && !assignedTrainer && <MobileCard accent={palette.amber}><div className="flex items-start gap-3"><Ic k="clock" size={18} style={{ color: palette.amber }} /><div><div className="text-[13px] font-bold text-white">Yêu cầu PT đang chờ duyệt</div><div className="mt-1 text-[12px]" style={{ color: palette.muted }}>{requestedTrainer.name} · Gói PT 20 buổi</div><div className="mt-1 text-[11px]" style={{ color: palette.dim }}>Bạn sẽ nhận thông báo khi PT phản hồi. Chưa thể đặt lịch trong thời gian chờ duyệt.</div></div></div></MobileCard>}
      {visiblePackages.length > 0 ? visiblePackages.map((pkg, idx) => {
        const packageRegistration = memberRegistrations.find((registration) => registration.packageName === pkg.name)
        const packageAssignedTrainerId = packageRegistration ? memberTrainerAssignments[packageRegistration.id] : undefined
        const packageAssignedTrainer = packageAssignedTrainerId ? TRAINERS.find((trainer) => trainer.id === packageAssignedTrainerId) : undefined
        const packageRequestedTrainerId = packageRegistration ? memberTrainerRequests[packageRegistration.id] : undefined
        const packageRequestedTrainer = packageRequestedTrainerId ? TRAINERS.find((trainer) => trainer.id === packageRequestedTrainerId) : undefined
        const needsTrainer = pkg.type === "PT" || pkg.type === "Combo"
        return (
        <MobileCard key={idx} accent={pkg.type === "PT" || pkg.type === "Combo" ? palette.blue : palette.green}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[16px] font-bold text-white">
                {pkg.name}
              </div>
              <div className="mt-1 text-[13px]" style={{ color: palette.muted }}>
                {pkg.progress ?? (pkg.type === "PT" && pkg.sessionsLeft !== undefined && pkg.sessionsLeft !== null ? `Còn ${pkg.sessionsLeft} buổi PT` : `Hiệu lực đến ${pkg.validUntil}`)}
              </div>
              {pkg.status === "active" || pkg.status === "expiring" ? <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: palette.control }}><div className="h-full rounded-full" style={{ width: pkg.type === "PT" ? "85%" : pkg.type === "Combo" ? "35%" : "60%", background: pkg.type === "PT" ? palette.blue : palette.green }} /></div> : null}
            </div>
            <div className="text-right"><MemberBadge status={pkg.status} />{needsTrainer && <div className="mt-2 text-[11px]" style={{ color: packageAssignedTrainer ? palette.green : packageRequestedTrainer ? palette.amber : palette.muted }}>{packageAssignedTrainer ? `PT: ${packageAssignedTrainer.name}` : packageRequestedTrainer ? `Đang chờ: ${packageRequestedTrainer.name}` : "PT: Chưa chọn"}</div>}</div>
          </div>
        {needsTrainer && !packageAssignedTrainer && !packageRequestedTrainer && packageRegistration && (
          <div className="mt-3"><ActionButton block variant="secondary" onClick={() => { setSelectedRegistrationId(packageRegistration.id); setSelectedPackage(PACKAGES.find((item) => item.name === pkg.name) ?? null); setView("trainer") }}>Chọn PT phụ trách</ActionButton></div>
        )}
        </MobileCard>
      )}) : <MobileCard><div className="text-center text-[13px]" style={{ color: palette.muted }}>Chưa có gói ở trạng thái này.</div></MobileCard>}

      <MobileCard>
        <div className="flex items-center justify-between"><div className="text-[14px] font-bold text-white">Lịch sử thanh toán</div><Ic k="wallet" size={18} style={{ color: palette.green }} /></div>
        <div className="mt-1 text-[11px]" style={{ color: palette.muted }}>Các giao dịch mua và thanh toán gói của bạn.</div>
        <div className="mt-3 space-y-2">
          {memberPaymentHistory.length > 0 ? memberPaymentHistory.map((payment) => {
            const registration = memberRegistrations.find((item) => item.id === payment.ref)
            const statusLabel = payment.status === "confirmed" ? "Đã xác nhận" : payment.status === "partial" ? "Thanh toán một phần" : "Đang chờ xác nhận"
            const statusColor = payment.status === "confirmed" ? palette.green : payment.status === "partial" ? palette.amber : palette.blue
            return <div key={payment.id} className="rounded-lg border p-3" style={{ borderColor: palette.border, background: palette.panel }}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-mono text-[12px] font-bold text-white">{payment.id}</div><div className="mt-1 truncate text-[12px]" style={{ color: palette.muted }}>{registration?.packageName ?? payment.ref} · {payment.time}</div><div className="mt-1 text-[11px]" style={{ color: palette.dim }}>{payment.method}</div></div><div className="text-right"><div className="font-mono text-[13px] font-bold" style={{ color: palette.green }}>{fmtVND(payment.amount)}</div><div className="mt-1 text-[10px] font-semibold" style={{ color: statusColor }}>{statusLabel}</div></div></div></div>
          }) : <div className="text-center text-[12px]" style={{ color: palette.muted }}>Chưa có giao dịch thanh toán.</div>}
        </div>
      </MobileCard>
    </div>
  )
}

function MemberAccount({
  openAction,
  onLogout,
}: {
  openAction: (kind: ActionKind) => void
  onLogout?: () => void
}) {
  const member = MEMBERS[1]
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.blue}>
        <div className="flex items-center gap-3">
          <Avatar name={member.name} tone={palette.blue} size={56} />
          <div>
            <div className="text-[16px] font-bold text-white">
              {member.name}
            </div>
            <div className="text-[12px]" style={{ color: palette.dim }}>
              {member.id} · {member.phone}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
              Tài khoản hội viên
            </div>
          </div>
        </div>
      </MobileCard>
      <PreferenceRow title="Nhận thông báo trong ứng dụng" checked />
      <PreferenceRow title="Nhắc lịch PT trước buổi" checked />

      <ActionButton
        block
        variant="secondary"
        icon="user"
        onClick={() => openAction("member-preferences")}
      >
        Cập nhật hồ sơ
      </ActionButton>
      {onLogout && (
        <ActionButton
          block
          variant="danger"
          icon="logout"
          onClick={onLogout}
        >
          Đăng xuất tài khoản
        </ActionButton>
      )}
    </div>
  )
}

function MobileSessionRow({
  session,
  openAction,
  trainerView = false,
}: {
  session: Session
  openAction: (kind: ActionKind) => void
  trainerView?: boolean
}) {
  const empty = session.status === "empty"
  return (
    <button
      type="button"
      onClick={() =>
        openAction(
          empty
            ? "schedule-booking"
            : trainerView || session.status === "done"
              ? "session-result"
              : "schedule-change",
        )
      }
      className="flex min-h-[74px] w-full items-center gap-3 rounded-lg border p-3 text-left"
      style={{
        borderColor: palette.border,
        background: empty ? palette.panelSoft : palette.panel,
      }}
    >
      <div className="w-14 shrink-0">
        <div
          className="font-mono text-[15px] font-bold"
          style={{ color: empty ? palette.faint : palette.orange }}
        >
          {session.time}
        </div>
        <div className="text-[11px]" style={{ color: palette.dim }}>
          {session.branch}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold text-white">
          {session.member ?? "Khung giờ trống"}
        </div>
        <div className="truncate text-[12px]" style={{ color: palette.muted }}>
          {session.trainer}
        </div>
        <div className="truncate text-[11px]" style={{ color: palette.dim }}>
          {session.packageName ?? "Có thể đặt lịch"}
        </div>
      </div>
      <SessionBadge status={session.status} />
    </button>
  )
}

function MobileCard({
  children,
  accent,
}: {
  children: ReactNode
  accent?: string
}) {
  return (
    <section
      className="rounded-lg border p-4"
      style={{
        background: accent
          ? `linear-gradient(135deg, ${accent}14, ${palette.panel} 42%)`
          : palette.panel,
        borderColor: accent ? `${accent}45` : palette.border,
      }}
    >
      {children}
    </section>
  )
}

function MobileSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: IconName
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border text-[12px] font-semibold"
      style={{
        background: palette.panel,
        borderColor: palette.border,
        color: palette.muted,
      }}
    >
      <Ic k={icon} size={18} style={{ color: palette.orange }} />
      {label}
    </button>
  )
}

function TinyMetric({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div
      className="rounded-lg p-2 text-center"
      style={{ background: palette.panelSoft }}
    >
      <div className="truncate text-[14px] font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[11px]" style={{ color: palette.dim }}>
        {label}
      </div>
    </div>
  )
}

function MoreRow({
  icon,
  title,
  detail,
  onClick,
}: {
  icon: IconName
  title: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[72px] w-full items-center gap-3 rounded-lg border p-3 text-left"
      style={{ background: palette.panel, borderColor: palette.border }}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(22,163,74,0.12)", color: palette.orange }}
      >
        <Ic k={icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold text-white">{title}</div>
        <div
          className="mt-1 text-[12px] leading-relaxed"
          style={{ color: palette.dim }}
        >
          {detail}
        </div>
      </div>
      <Ic
        k="chevDown"
        size={14}
        style={{ color: palette.dim, transform: "rotate(-90deg)" }}
      />
    </button>
  )
}

function PreferenceRow({
  title,
  checked = false,
}: {
  title: string
  checked?: boolean
}) {
  return (
    <div
      className="flex min-h-14 items-center justify-between rounded-lg border p-3"
      style={{ background: palette.panel, borderColor: palette.border }}
    >
      <span className="text-[14px] font-semibold text-white">{title}</span>
      <span
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? palette.green : palette.faint }}
        aria-hidden="true"
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ left: checked ? 22 : 4 }}
        />
      </span>
    </div>
  )
}

function mobileTitle(role: MobileRole, tab: string) {
  const item = MOBILE_NAV[role].find((nav) => nav.id === tab)
  if (item) return item.label
  return role === "trainer"
    ? "Lịch của tôi"
    : role === "member"
      ? "Trang chủ"
      : "Trang chủ"
}
