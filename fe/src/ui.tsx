import type { CSSProperties, ReactNode } from "react"
import type {
  AppSurface,
  CareStatus,
  CheckResult,
  MemberStatus,
  MemberProfileStatus,
  PackageStatus,
  PaymentStatus,
  RegistrationStatus,
  SessionStatus,
  ThemeMode,
} from "./data"

export const palette = {
  company: "var(--color-company)",
  bg: "var(--color-bg)",
  shell: "var(--color-shell)",
  panel: "var(--color-panel)",
  panelSoft: "var(--color-panel-soft)",
  rail: "var(--color-rail)",
  border: "var(--color-border)",
  borderSoft: "var(--color-border-soft)",
  text: "var(--color-text)",
  muted: "var(--color-muted)",
  dim: "var(--color-dim)",
  faint: "var(--color-faint)",
  orange: "var(--color-accent)",
  orangeDark: "var(--color-accent-dark)",
  green: "var(--color-green)",
  amber: "var(--color-yellow)",
  red: "var(--color-red)",
  blue: "var(--color-blue)",
  purple: "var(--color-purple)",
  darkButton: "var(--color-dark-button)",
  pink: "var(--color-purple)",
  control: "var(--color-control)",
  hover: "var(--color-hover)",
}

const buttonPalette = {
  green: "#16A34A",
  purple: "#4338CA",
  red: "#EF4444",
  blue: "#2563EB",
  yellow: "#EAB308",
  dark: "#24272F",
} as const

const ICON_PATHS = {
  dashboard:
    "M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z",
  users:
    "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  package: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  signup:
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  trainer:
    "M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  calendar:
    "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  checkin: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  payment:
    "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
  bell: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  report:
    "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  branch:
    "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  settings:
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
  plus: "M12 4v16m8-8H4",
  filter: "M3 4h18M7 8h10M11 12h2M12 16h.01",
  chevDown: "M19 9l-7 7-7-7",
  chevLeft: "M15 19l-7-7 7-7",
  eye: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  edit: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
  x: "M6 18L18 6M6 6l12 12",
  check: "M5 13l4 4L19 7",
  warn: "M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z",
  barChart: "M12 20V10M6 20V4M18 20v-4",
  trending: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  clock:
    "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 6.477 2 12s4.477 10 10 10zM12 6v6l4 2",
  menu: "M4 6h16M4 12h16M4 18h16",
  export: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4",
  care: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  scan: "M7 3H5a2 2 0 00-2 2v2m18 0V5a2 2 0 00-2-2h-2M7 21H5a2 2 0 01-2-2v-2m18 0v2a2 2 0 01-2 2h-2M8 12h8",
  logout:
    "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  more: "M12 5h.01M12 12h.01M12 19h.01",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  refresh: "M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14.9-4M4 16a8 8 0 0014.9 4",
  shield: "M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z",
  phone:
    "M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2zM10 18h4",
  wallet:
    "M3 7a2 2 0 012-2h14v4H6a2 2 0 000 4h13v4H5a2 2 0 01-2-2V7zm14 4h4v4h-4a2 2 0 010-4z",
}

export type IconName = keyof typeof ICON_PATHS

export function Ic({
  k,
  size = 18,
  cls = "",
  style,
}: {
  k: IconName
  size?: number
  cls?: string
  style?: CSSProperties
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cls}
      style={style}
      aria-hidden="true"
    >
      <path d={ICON_PATHS[k]} />
    </svg>
  )
}

export function fmtVND(n: number) {
  return n === 0 ? "0 đ" : `${new Intl.NumberFormat("vi-VN").format(n)} đ`
}

export function shortMoney(n: number) {
  return `${new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(n)}đ`
}

export const surfaceLabels: Record<AppSurface, string> = {
  "web-admin": "Web QTV",
  "web-receptionist": "Web lễ tân",
  "mobile-receptionist": "Mobile lễ tân",
  "mobile-trainer": "Mobile PT",
  "mobile-member": "Mobile hội viên",
}

export function SurfaceSwitcher({
  value,
  onChange,
  compact = false,
  inverted = false,
}: {
  value: AppSurface
  onChange: (value: AppSurface) => void
  compact?: boolean
  inverted?: boolean
}) {
  const options = Object.keys(surfaceLabels) as AppSurface[]

  return (
    <label
      className="flex items-center gap-2 text-[13px]"
      style={{ color: inverted ? "rgba(255,255,255,0.72)" : palette.dim }}
    >
      <span className={compact ? "sr-only" : ""}>Không gian</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as AppSurface)}
        className="min-h-10 rounded-full border px-4 py-1.5 text-[14px] font-semibold outline-none focus:ring-2"
        style={{
          background: inverted ? "rgba(255,255,255,0.14)" : palette.control,
          borderColor: inverted ? "rgba(255,255,255,0.28)" : palette.border,
          color: inverted ? "#FFFFFF" : palette.text,
          ["--tw-ring-color" as string]: palette.green,
        }}
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
            style={{ background: palette.shell }}
          >
            {surfaceLabels[option]}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ThemeToggle({
  value,
  onChange,
  inverted = false,
}: {
  value: ThemeMode
  onChange: (value: ThemeMode) => void
  inverted?: boolean
}) {
  return (
    <div
      className="inline-flex min-h-10 items-center rounded-full border p-1"
      style={{
        background: inverted ? "rgba(255,255,255,0.14)" : palette.control,
        borderColor: inverted ? "rgba(255,255,255,0.28)" : palette.border,
      }}
      aria-label="Chọn giao diện"
    >
      {(["light", "dark"] as ThemeMode[]).map((mode) => {
        const active = value === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => onChange(mode)}
            className="min-h-8 rounded-full px-3 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2"
            style={{
              background: active
                ? inverted
                  ? "rgba(255,255,255,0.24)"
                  : palette.company
                : "transparent",
              color: active
                ? "#FFFFFF"
                : inverted
                  ? "rgba(255,255,255,0.72)"
                  : palette.dim,
              ["--tw-ring-color" as string]: palette.green,
            }}
          >
            {mode === "light" ? "Sáng" : "Tối"}
          </button>
        )
      })}
    </div>
  )
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}

export function Avatar({
  name,
  tone = palette.blue,
  size = 36,
}: {
  name: string
  tone?: string
  size?: number
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        background: `${tone}22`,
        color: tone,
        fontSize: size > 44 ? 18 : 11,
      }}
    >
      {initials(name)}
    </div>
  )
}

const toneStyles = {
  green: { color: palette.green, background: "rgba(22,163,74,0.14)", borderColor: "rgba(22,163,74,0.28)" },
  amber: { color: palette.amber, background: "rgba(234,179,8,0.14)", borderColor: "rgba(234,179,8,0.28)" },
  red: { color: palette.red, background: "rgba(239,68,68,0.14)", borderColor: "rgba(239,68,68,0.28)" },
  blue: { color: palette.blue, background: "rgba(37,99,235,0.14)", borderColor: "rgba(37,99,235,0.28)" },
  slate: { color: palette.muted, background: "rgba(36,39,47,0.12)", borderColor: "rgba(36,39,47,0.24)" },
  purple: { color: palette.purple, background: "rgba(67,56,202,0.14)", borderColor: "rgba(67,56,202,0.28)" },
} as const

export type Tone = keyof typeof toneStyles

export function Pill({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[12px] font-semibold ${className}`}
      style={toneStyles[tone]}
    >
      {children}
    </span>
  )
}

export function MemberBadge({ status }: { status: MemberStatus }) {
  const map: Record<MemberStatus, { label: string; tone: Tone }> = {
    active: { label: "Đang hoạt động", tone: "green" },
    expiring: { label: "Sắp hết hạn", tone: "amber" },
    expired: { label: "Đã hết hạn", tone: "red" },
    none: { label: "Chưa có gói", tone: "slate" },
  }
  const item = map[status]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function MemberProfileStatusBadge({
  status,
}: {
  status: MemberProfileStatus
}) {
  const map: Record<MemberProfileStatus, { label: string; tone: Tone }> = {
    active: { label: "Hồ sơ đang hoạt động", tone: "green" },
    inactive: { label: "Hồ sơ ngừng hoạt động", tone: "amber" },
    archived: { label: "Hồ sơ đã lưu trữ", tone: "slate" },
  }
  const item = map[status]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function RegistrationBadge({ status }: { status: RegistrationStatus }) {
  const map: Record<RegistrationStatus, { label: string; tone: Tone }> = {
    PENDING_PAYMENT: { label: "Chờ thanh toán", tone: "amber" },
    SCHEDULED: { label: "Sắp hiệu lực", tone: "blue" },
    ACTIVE: { label: "Đang hiệu lực", tone: "green" },
    EXPIRED: { label: "Đã hết hạn", tone: "red" },
    EXHAUSTED: { label: "Đã dùng hết", tone: "purple" },
    CANCELLED: { label: "Đã hủy", tone: "slate" },
  }
  const item = map[status] ?? { label: status, tone: "slate" }
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  const map: Record<PaymentStatus, { label: string; tone: Tone }> = {
    confirmed: { label: "Đã xác nhận", tone: "green" },
    pending: { label: "Chờ đối soát", tone: "amber" },
    partial: { label: "Thu một phần", tone: "blue" },
  }
  const item = map[status]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function PackageBadge({ status }: { status: PackageStatus }) {
  const map: Record<PackageStatus, { label: string; tone: Tone }> = {
    draft: { label: "Nháp", tone: "slate" },
    selling: { label: "Đang bán", tone: "green" },
    stopped: { label: "Ngừng bán", tone: "slate" },
  }
  const item = map[status]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function CheckBadge({ result }: { result: CheckResult }) {
  const map: Record<CheckResult, { label: string; tone: Tone }> = {
    ok: { label: "Hợp lệ", tone: "green" },
    expiring: { label: "Sắp hết hạn", tone: "amber" },
    expired: { label: "Không đủ điều kiện", tone: "red" },
    manual: { label: "Thủ công", tone: "blue" },
    unknown: { label: "Không nhận diện", tone: "slate" },
    offline: { label: "Mất kết nối", tone: "red" },
  }
  const item = map[result]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function SessionBadge({ status }: { status: SessionStatus }) {
  const map: Record<SessionStatus, { label: string; tone: Tone }> = {
    done: { label: "Đã ghi nhận", tone: "green" },
    ongoing: { label: "Đang diễn ra", tone: "amber" },
    upcoming: { label: "Sắp tới", tone: "blue" },
    empty: { label: "Trống", tone: "slate" },
    cancelled: { label: "Đã hủy", tone: "red" },
  }
  const item = map[status]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function CareBadge({ status }: { status: CareStatus }) {
  const map: Record<CareStatus, { label: string; tone: Tone }> = {
    pending: { label: "Chờ xử lý", tone: "amber" },
    sent: { label: "Đã gửi", tone: "green" },
    failed: { label: "Gửi lỗi", tone: "red" },
    followup: { label: "Cần theo dõi", tone: "blue" },
  }
  const item = map[status]
  return <Pill tone={item.tone}>{item.label}</Pill>
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  padded = true,
}: {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <section
      className={`theme-card-shadow rounded-lg border ${className}`}
      style={{ background: palette.panel, borderColor: palette.border }}
    >
      {(title || subtitle || action) && (
        <div
          className="flex items-start justify-between gap-3 border-b px-4 py-3"
          style={{ borderColor: palette.border }}
        >
          <div className="min-w-0">
            {title && (
              <div className="truncate text-[15px] font-semibold text-white">
                {title}
              </div>
            )}
            {subtitle && (
              <div
                className="mt-0.5 text-[13px]"
                style={{ color: palette.dim }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {action}
        </div>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  )
}

export function ActionButton({
  children,
  onClick,
  variant = "primary",
  icon,
  block = false,
  type = "button",
  disabled = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger" | "purple" | "blue" | "warning" | "dark"
  icon?: IconName
  block?: boolean
  type?: "button" | "submit"
  disabled?: boolean
}) {
  const styleByVariant: Record<"primary" | "secondary" | "ghost" | "danger" | "purple" | "blue" | "warning" | "dark", CSSProperties> =
    {
      primary: {
        background: buttonPalette.green,
        color: "#fff",
        borderColor: buttonPalette.green,
      },
      secondary: {
        background: buttonPalette.dark,
        color: "#fff",
        borderColor: buttonPalette.dark,
      },
      ghost: {
        background: "transparent",
        color: palette.muted,
        borderColor: "transparent",
      },
      danger: {
        background: buttonPalette.red,
        color: "#fff",
        borderColor: buttonPalette.red,
      },
      purple: {
        background: buttonPalette.purple,
        color: "#fff",
        borderColor: buttonPalette.purple,
      },
      blue: {
        background: buttonPalette.blue,
        color: "#fff",
        borderColor: buttonPalette.blue,
      },
      warning: {
        background: buttonPalette.yellow,
        color: "#1F2937",
        borderColor: buttonPalette.yellow,
      },
      dark: {
        background: buttonPalette.dark,
        color: "#fff",
        borderColor: buttonPalette.dark,
      },
    }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border px-5 py-2 text-[14px] font-semibold shadow-sm transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${
        block ? "w-full" : ""
      }`}
      style={{
        ...styleByVariant[variant],
        boxShadow: disabled ? "none" : "0 8px 18px rgba(0,0,0,0.12)",
        ["--tw-ring-color" as string]: palette.green,
      }}
    >
      {icon && <Ic k={icon} size={15} />}
      {children}
    </button>
  )
}

export function IconButton({
  icon,
  label,
  onClick,
  active = false,
  inverted = false,
}: {
  icon: IconName
  label: string
  onClick?: () => void
  active?: boolean
  inverted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border transition-colors focus:outline-none focus:ring-2"
      style={{
        background: inverted
          ? "rgba(255,255,255,0.14)"
          : active
            ? "rgba(22,163,74,0.14)"
            : palette.control,
        borderColor: inverted
          ? "rgba(255,255,255,0.28)"
          : active
            ? "rgba(22,163,74,0.35)"
            : palette.border,
        color: inverted ? "#FFFFFF" : active ? palette.green : palette.muted,
        ["--tw-ring-color" as string]: inverted ? "#FFFFFF" : palette.green,
      }}
    >
      <Ic k={icon} size={16} />
    </button>
  )
}

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <div
        className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold"
        style={{ color: palette.muted }}
      >
        <span>{label}</span>
        <span
          className="font-normal"
          style={{ color: required ? palette.amber : palette.dim }}
        >
          {required ? "Bắt buộc" : "Tùy chọn"}
        </span>
      </div>
      {children}
      {hint && (
        <div
          className="mt-1 text-[12px] leading-relaxed"
          style={{ color: palette.dim }}
        >
          {hint}
        </div>
      )}
    </label>
  )
}

export const inputStyle: CSSProperties = {
  background: palette.control,
  borderColor: palette.border,
  color: palette.text,
  ["--tw-ring-color" as string]: palette.green,
}

export function TextInput({
  placeholder,
  defaultValue,
  value,
  onChange,
  readOnly = false,
  type = "text",
}: {
  placeholder?: string
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  readOnly?: boolean
  type?: string
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      readOnly={readOnly}
      className="w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
      style={inputStyle}
    />
  )
}

export function SelectInput({
  options,
  defaultValue,
  value,
  onChange,
}: {
  options: string[]
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
  return (
    <select
      defaultValue={value === undefined ? (defaultValue ?? options[0]) : undefined}
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
      style={inputStyle}
    >
      {options.map((option) => (
        <option
          key={option}
          value={option}
          style={{ background: palette.shell }}
        >
          {option}
        </option>
      ))}
    </select>
  )
}

export function TextArea({
  placeholder,
  defaultValue,
  value,
  onChange,
}: {
  placeholder?: string
  defaultValue?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <textarea
      rows={4}
      placeholder={placeholder}
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
      className="w-full resize-none rounded-lg border px-3 py-2.5 text-[14px] outline-none focus:ring-2"
      style={inputStyle}
    />
  )
}

export function Segment<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-lg border p-1"
      style={{
        background: palette.control,
        borderColor: palette.border,
      }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className="min-h-8 rounded-md px-3 text-[13px] font-semibold transition-colors focus:outline-none focus:ring-2"
          style={{
            background:
              value === option.value ? "rgba(22,163,74,0.15)" : "transparent",
            color: value === option.value ? palette.green : palette.dim,
            ["--tw-ring-color" as string]: palette.green,
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: ReactNode
}) {
  return (
    <div
      className="flex min-h-44 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center"
      style={{ borderColor: palette.border, color: palette.dim }}
    >
      <div className="text-[15px] font-semibold text-white">{title}</div>
      <div className="mt-1 max-w-md text-[14px] leading-relaxed">{detail}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        style={{ background: "rgba(2,6,12,0.78)" }}
        aria-label="Đóng"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border shadow-2xl"
        style={{ background: palette.shell, borderColor: palette.border }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-5 py-4"
          style={{ borderColor: palette.border }}
        >
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold text-white">{title}</h2>
            {subtitle && (
              <p
                className="mt-1 text-[14px] leading-relaxed"
                style={{ color: palette.dim }}
              >
                {subtitle}
              </p>
            )}
          </div>
          <IconButton icon="x" label="Đóng" onClick={onClose} />
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
        {footer && (
          <div
            className="border-t px-5 py-4"
            style={{ borderColor: palette.border }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
