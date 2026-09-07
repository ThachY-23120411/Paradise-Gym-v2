import { useState, type ReactNode } from "react"
import type { AppSurface, MobileRole, Session } from "./data"
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
  onSurfaceChange,
  openAction,
}: {
  surface: AppSurface
  onSurfaceChange: (surface: AppSurface) => void
  openAction: (kind: ActionKind) => void
}) {
  const role: MobileRole =
    surface === "mobile-trainer"
      ? "trainer"
      : surface === "mobile-member"
        ? "member"
        : "receptionist"
  const [tabs, setTabs] = useState<Record<MobileRole, string>>(DEFAULT_TAB)
  const activeTab = tabs[role]
  const nav = MOBILE_NAV[role]
  const info = ROLE_INFO[role]

  return (
    <div
      className="flex min-h-full flex-col items-center gap-4 overflow-auto p-4"
      style={{ background: palette.bg }}
    >
      <div className="flex w-full max-w-[430px] items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-semibold text-white">Ứng dụng mobile</div>
          <div className="text-[11px]" style={{ color: palette.dim }}>
            {info.title} · mô phỏng theo vai trò
          </div>
        </div>
        <SurfaceSwitcher value={surface} onChange={onSurfaceChange} compact />
      </div>

      <div
        className="flex h-[calc(100vh-96px)] min-h-[680px] w-full max-w-[430px] flex-col overflow-hidden rounded-[28px] border shadow-2xl"
        style={{ background: "#0B111D", borderColor: "#26344F" }}
      >
        <header
          className="shrink-0 border-b px-4 pb-3 pt-4"
          style={{ borderColor: palette.border }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div
                className="text-[11px] font-medium"
                style={{ color: palette.dim }}
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
                background: "rgba(255,255,255,0.04)",
                borderColor: palette.border,
                color: palette.muted,
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
              <div className="truncate text-[12px] font-semibold text-white">
                {info.user}
              </div>
              <div className="text-[10px]" style={{ color: palette.dim }}>
                {info.title} · {info.branch}
              </div>
            </div>
            <Pill tone="green">Đang online</Pill>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <MobileContent role={role} tab={activeTab} openAction={openAction} />
        </main>

        <nav
          className="grid shrink-0 border-t px-2 pb-3 pt-2"
          style={{
            borderColor: palette.border,
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
                className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2"
                style={{
                  color: active ? palette.orange : palette.dim,
                  background: active ? "rgba(249,115,22,0.1)" : "transparent",
                  ["--tw-ring-color" as string]: palette.orange,
                }}
              >
                <Ic k={item.icon} size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

function MobileContent({
  role,
  tab,
  openAction,
}: {
  role: MobileRole
  tab: string
  openAction: (kind: ActionKind) => void
}) {
  if (role === "receptionist")
    return <ReceptionistMobile tab={tab} openAction={openAction} />
  if (role === "trainer")
    return <TrainerMobile tab={tab} openAction={openAction} />
  return <MemberMobile tab={tab} openAction={openAction} />
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
            <div className="text-[11px]" style={{ color: palette.dim }}>
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
          className="min-h-12 w-full rounded-lg border py-3 pl-10 pr-3 text-[14px] outline-none focus:ring-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: palette.border,
            color: palette.text,
            ["--tw-ring-color" as string]: palette.orange,
          }}
          placeholder="Tìm hội viên, mã HV, số điện thoại"
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <QuickAction
          icon="plus"
          label="Thêm HV"
          onClick={() => openAction("member-form")}
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
              background: "rgba(255,255,255,0.025)",
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
              <div className="text-[12px] font-semibold text-white">
                {item.title}
              </div>
              <div
                className="truncate text-[11px]"
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
          className="min-h-12 w-full rounded-lg border py-3 pl-10 pr-3 text-[14px] outline-none focus:ring-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderColor: palette.border,
            color: palette.text,
            ["--tw-ring-color" as string]: palette.orange,
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
          onClick={() => openAction("member-form")}
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
              openAction(receptionist ? "member-form" : "session-result")
            }
            className="w-full rounded-lg border p-3 text-left"
            style={{ background: palette.panel, borderColor: palette.border }}
          >
            <div className="flex items-start gap-3">
              <Avatar name={member.name} tone={palette.blue} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-white">
                  {member.name}
                </div>
                <div
                  className="mt-0.5 text-[11px]"
                  style={{ color: palette.dim }}
                >
                  {member.id} · {member.phone}
                </div>
                <div
                  className="mt-1 text-[11px]"
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
            className="min-h-11 min-w-[70px] rounded-lg border text-[12px] font-semibold"
            style={{
              background:
                index === 0
                  ? "rgba(249,115,22,0.12)"
                  : "rgba(255,255,255,0.03)",
              borderColor:
                index === 0 ? "rgba(249,115,22,0.4)" : palette.border,
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
              <div className="text-[13px] font-bold text-white">
                {item.title}
              </div>
              <div
                className="mt-1 text-[11px]"
                style={{ color: palette.muted }}
              >
                {item.member} · {item.memberId}
              </div>
              <div
                className="mt-1 text-[11px] leading-relaxed"
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
        <div className="text-[11px]" style={{ color: palette.dim }}>
          Buổi tiếp theo
        </div>
        <div className="mt-1 text-[18px] font-bold text-white">
          09:00 · Trần Thị Bình
        </div>
        <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
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
              <div className="text-[13px] font-bold text-white">{title}</div>
              <div
                className="mt-1 text-[11px]"
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
            <div className="text-[11px]" style={{ color: palette.dim }}>
              {trainer.id} · {trainer.branch}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: palette.muted }}>
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

function MemberMobile({
  tab,
  openAction,
}: {
  tab: string
  openAction: (kind: ActionKind) => void
}) {
  if (tab === "HV02")
    return <MobileSchedule openAction={openAction} memberView />
  if (tab === "HV03") return <MemberPackages openAction={openAction} />
  if (tab === "HV04") return <MemberAccount openAction={openAction} />

  const member = MEMBERS[1]
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.blue}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px]" style={{ color: palette.dim }}>
              Gói hiện tại
            </div>
            <div className="mt-1 text-[18px] font-bold text-white">
              {member.packageName}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
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
            <div className="text-[13px] font-bold text-white">
              Gói sắp hết hạn
            </div>
            <div
              className="mt-1 text-[11px] leading-relaxed"
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
  return (
    <div className="space-y-4">
      <MobileCard accent={palette.blue}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[17px] font-bold text-white">
              {member.packageName}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: palette.muted }}>
              Hiệu lực đến {member.validUntil}
            </div>
          </div>
          <MemberBadge status={member.status} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <TinyMetric label="Còn lại" value={`${member.sessionsLeft} buổi`} />
          <TinyMetric label="Phạm vi" value={member.branch} />
          <TinyMetric label="Công nợ" value={fmtVND(member.debt)} />
        </div>
      </MobileCard>

      {currentPackage && (
        <MobileCard>
          <div className="text-[13px] font-bold text-white">Giá tham khảo</div>
          <div
            className="mt-1 text-[22px] font-bold"
            style={{ color: palette.orange }}
          >
            {fmtVND(currentPackage.price)}
          </div>
          <div className="text-[11px]" style={{ color: palette.dim }}>
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
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <div>
              <div className="font-mono text-[12px] font-semibold text-white">
                {id}
              </div>
              <div className="text-[11px]" style={{ color: palette.dim }}>
                {date}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-mono text-[12px] font-bold"
                style={{ color: palette.green }}
              >
                {amount}
              </div>
              <div className="text-[10px]" style={{ color: palette.dim }}>
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
}: {
  openAction: (kind: ActionKind) => void
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
            <div className="text-[11px]" style={{ color: palette.dim }}>
              {member.id} · {member.phone}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: palette.muted }}>
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
        onClick={() => openAction("account-permissions")}
      >
        Cập nhật hồ sơ
      </ActionButton>
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
        background: empty ? "rgba(255,255,255,0.02)" : palette.panel,
      }}
    >
      <div className="w-14 shrink-0">
        <div
          className="font-mono text-[14px] font-bold"
          style={{ color: empty ? palette.faint : palette.orange }}
        >
          {session.time}
        </div>
        <div className="text-[10px]" style={{ color: palette.dim }}>
          {session.branch}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-bold text-white">
          {session.member ?? "Khung giờ trống"}
        </div>
        <div className="truncate text-[11px]" style={{ color: palette.muted }}>
          {session.trainer}
        </div>
        <div className="truncate text-[10px]" style={{ color: palette.dim }}>
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
        <h2 className="text-[13px] font-bold text-white">{title}</h2>
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
      className="flex min-h-[76px] flex-col items-center justify-center gap-2 rounded-lg border text-[11px] font-semibold"
      style={{
        background: "rgba(255,255,255,0.035)",
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
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <div className="truncate text-[13px] font-bold text-white">{value}</div>
      <div className="mt-0.5 text-[10px]" style={{ color: palette.dim }}>
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
        style={{ background: "rgba(249,115,22,0.12)", color: palette.orange }}
      >
        <Ic k={icon} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-bold text-white">{title}</div>
        <div
          className="mt-1 text-[11px] leading-relaxed"
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
      <span className="text-[13px] font-semibold text-white">{title}</span>
      <span
        className="relative h-6 w-11 rounded-full transition-colors"
        style={{ background: checked ? palette.orange : "#26344F" }}
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
