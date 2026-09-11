import { useState, type ReactNode } from "react"
import type { AppSurface, MobileRole, Session, ThemeMode } from "./data"
import {
  CARE_ITEMS,
  MEMBERS,
  PACKAGES,
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
  onLogout,
}: {
  role: MobileRole
  tab: string
  openAction: (kind: ActionKind) => void
  onLogout?: () => void
}) {
  if (role === "receptionist")
    return <ReceptionistMobile tab={tab} openAction={openAction} />
  if (role === "trainer")
    return <TrainerMobile tab={tab} openAction={openAction} />
  return <MemberMobile tab={tab} openAction={openAction} onLogout={onLogout} />
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
}: {
  openAction: (kind: ActionKind) => void
  memberView?: boolean
}) {
  const sessions = memberView
    ? SESSIONS.filter(
        (session) => session.memberId === "HV002" || session.status === "empty",
      )
    : SESSIONS

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {["07/09", "08/09", "09/09", "10/09", "11/09"].map((day, index) => (
          <button
            key={day}
            type="button"
            className="min-h-11 min-w-[70px] rounded-lg border text-[13px] font-semibold"
            style={{
              background:
                index === 0
                  ? "rgba(22,163,74,0.12)"
                  : palette.control,
              borderColor:
                index === 0 ? "rgba(22,163,74,0.4)" : palette.border,
              color: index === 0 ? palette.orange : palette.muted,
            }}
          >
            {day}
          </button>
        ))}
      </div>
      <ActionButton
        block
        icon="plus"
        onClick={() => openAction("schedule-booking")}
      >
        Đặt lịch PT
      </ActionButton>
      <MobileSection title={memberView ? "Lịch của tôi" : "Lịch trong ngày"}>
        {sessions.map((session) => (
          <MobileSessionRow
            key={session.id}
            session={session}
            openAction={openAction}
          />
        ))}
      </MobileSection>
    </div>
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
  onLogout,
}: {
  tab: string
  openAction: (kind: ActionKind) => void
  onLogout?: () => void
}) {
  if (tab === "HV02")
    return <MobileSchedule openAction={openAction} memberView />
  if (tab === "HV03") return <MemberPackages openAction={openAction} />
  if (tab === "HV04") return <MemberAccount openAction={openAction} onLogout={onLogout} />

  const member = MEMBERS[1]
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.blue}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[12px]" style={{ color: palette.dim }}>
              Gói hiện tại
            </div>
            <div className="mt-1 text-[18px] font-bold text-white">
              {member.packageName}
            </div>
            <div className="mt-1 text-[13px]" style={{ color: palette.muted }}>
              Hết hạn {member.validUntil} · còn {member.sessionsLeft} buổi
            </div>
          </div>
          <MemberBadge status={member.status} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ActionButton
            variant="secondary"
            icon="calendar"
            onClick={() => openAction("schedule-booking")}
          >
            Đặt lịch PT
          </ActionButton>
          <ActionButton
            variant="secondary"
            icon="refresh"
            onClick={() => openAction("renewal-request")}
          >
            Gia hạn
          </ActionButton>
        </div>
      </MobileCard>

      <MobileSection title="Lịch sắp tới">
        {SESSIONS.filter((session) => session.memberId === "HV002").map(
          (session) => (
            <MobileSessionRow
              key={session.id}
              session={session}
              openAction={openAction}
            />
          ),
        )}
      </MobileSection>

      <MobileCard>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              background: "rgba(245,158,11,0.12)",
              color: palette.amber,
            }}
          >
            <Ic k="warn" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-white">
              Gói sắp hết hạn
            </div>
            <div
              className="mt-1 text-[12px] leading-relaxed"
              style={{ color: palette.muted }}
            >
              Bạn có thể gửi yêu cầu để quầy xử lý. Gói hiện tại chỉ thay đổi
              sau khi quầy xác nhận.
            </div>
          </div>
        </div>
        <div className="mt-3">
          <ActionButton
            block
            icon="refresh"
            onClick={() => openAction("renewal-request")}
          >
            Gửi yêu cầu gia hạn
          </ActionButton>
        </div>
      </MobileCard>
    </div>
  )
}

function MemberPackages({
  openAction,
}: {
  openAction: (kind: ActionKind) => void
}) {
  const member = MEMBERS[1]
  const currentPackage = PACKAGES.find((pkg) => pkg.name === "Gói PT 20 buổi")
  const pkgs = member.packages ?? [
    {
      name: member.packageName,
      type: "PT" as const,
      validUntil: member.validUntil,
      sessionsLeft: member.sessionsLeft,
      status: member.status,
    },
  ]
  return (
    <div className="space-y-4">
      <div className="px-1 text-[12px] font-bold uppercase tracking-wider text-white">
        Các gói đang sở hữu ({pkgs.length})
      </div>
      {pkgs.map((pkg, idx) => (
        <MobileCard key={idx} accent={pkg.type === "PT" ? palette.blue : palette.green}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[16px] font-bold text-white">
                {pkg.name}
              </div>
              <div className="mt-1 text-[13px]" style={{ color: palette.muted }}>
                {pkg.type === "PT" && pkg.sessionsLeft !== undefined && pkg.sessionsLeft !== null
                  ? `Còn ${pkg.sessionsLeft} buổi PT · Hạn ${pkg.validUntil}`
                  : `Hiệu lực đến ${pkg.validUntil}`}
              </div>
            </div>
            <MemberBadge status={pkg.status} />
          </div>
        </MobileCard>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <TinyMetric label="Chi nhánh" value={member.branch} />
        <TinyMetric label="Công nợ" value={fmtVND(member.debt)} />
      </div>

      {currentPackage && (
        <MobileCard>
          <div className="text-[14px] font-bold text-white">Giá tham khảo</div>
          <div
            className="mt-1 text-[22px] font-bold"
            style={{ color: palette.orange }}
          >
            {fmtVND(currentPackage.price)}
          </div>
          <div className="text-[12px]" style={{ color: palette.dim }}>
            Cần quầy xác nhận trước khi tạo đăng ký chính thức.
          </div>
        </MobileCard>
      )}

      <ActionButton
        block
        icon="refresh"
        onClick={() => openAction("renewal-request")}
      >
        Yêu cầu gia hạn
      </ActionButton>

      <MobileCard>
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ background: "rgba(234,179,8,0.14)", color: palette.amber }}
          >
            <Ic k="wallet" size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-white">
              Chuyển khoản đang chờ xác nhận
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
              DK002 · 500.000 đ · chờ IPN/Webhook hợp lệ từ ngân hàng
            </div>
            <div className="mt-1 text-[11px]" style={{ color: palette.dim }}>
              Ảnh chứng từ chỉ là bằng chứng hỗ trợ; phiếu thu xuất hiện sau khi xác nhận.
            </div>
          </div>
        </div>
      </MobileCard>

      <MobileSection title="Phiếu thu của tôi">
        {[
          ["PT00118", "01/07/2026", "3.300.000 đ", "Đã xác nhận"],
          ["PT00109", "20/05/2026", "500.000 đ", "Đã xác nhận"],
        ].map(([id, date, amount, status]) => (
          <div
            key={id}
            className="flex items-center justify-between rounded-lg border p-3"
            style={{
              borderColor: palette.border,
              background: palette.panel,
            }}
          >
            <div>
              <div className="font-mono text-[13px] font-semibold text-white">
                {id}
              </div>
              <div className="text-[12px]" style={{ color: palette.dim }}>
                {date}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-mono text-[13px] font-bold"
                style={{ color: palette.green }}
              >
                {amount}
              </div>
              <div className="text-[11px]" style={{ color: palette.dim }}>
                {status}
              </div>
            </div>
          </div>
        ))}
      </MobileSection>
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
      <PreferenceRow title="Sinh nhật công khai tại K01" />
      <PreferenceRow title="Nhận nội dung tiếp thị" />
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
          variant="red"
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
