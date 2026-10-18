import type { ReactNode } from 'react';

// Small stroke icons from the mockups. Decorative: the button or link that
// holds them carries the accessible name.
function Icon({
  size = 16,
  width = 2.2,
  children,
}: {
  size?: number;
  width?: number;
  children: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: number };

export const PlusIcon = ({ size = 18 }: IconProps) => (
  <Icon size={size} width={2.4}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

export const CloseIcon = ({ size = 16 }: IconProps) => (
  <Icon size={size}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </Icon>
);

export const ChevronLeftIcon = ({ size = 16 }: IconProps) => (
  <Icon size={size}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = ({ size = 14 }: IconProps) => (
  <Icon size={size}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);

export const LockIcon = ({ size = 12 }: IconProps) => (
  <Icon size={size} width={2.4}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 018 0v4" />
  </Icon>
);

export const PersonIcon = ({ size = 11 }: IconProps) => (
  <Icon size={size}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 20c.6-3.6 3.1-5.6 6.5-5.6s5.9 2 6.5 5.6" />
  </Icon>
);

export const FiltersIcon = ({ size = 17 }: IconProps) => (
  <Icon size={size}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="7" cy="18" r="2" fill="currentColor" stroke="none" />
  </Icon>
);

export const WarningIcon = ({ size = 17 }: IconProps) => (
  <Icon size={size}>
    <path d="M12 3l9 16H3z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
);

export const CheckIcon = ({ size = 16 }: IconProps) => (
  <Icon size={size} width={2.6}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

export const BankIcon = ({ size = 18 }: IconProps) => (
  <Icon size={size} width={2}>
    <path d="M3 10l9-6 9 6" />
    <line x1="5" y1="10" x2="19" y2="10" />
    <line x1="6.5" y1="13" x2="6.5" y2="18" />
    <line x1="12" y1="13" x2="12" y2="18" />
    <line x1="17.5" y1="13" x2="17.5" y2="18" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </Icon>
);

export const CardIcon = ({ size = 18 }: IconProps) => (
  <Icon size={size} width={2}>
    <rect x="3" y="6" width="18" height="12" rx="3" />
    <line x1="3" y1="10.5" x2="21" y2="10.5" />
    <line x1="7" y1="15" x2="10" y2="15" />
  </Icon>
);

export const CashIcon = ({ size = 18 }: IconProps) => (
  <Icon size={size} width={2}>
    <rect x="3" y="7" width="18" height="10" rx="2.5" />
    <circle cx="12" cy="12" r="2.4" />
  </Icon>
);

export const InfoIcon = ({ size = 16 }: IconProps) => (
  <Icon size={size} width={2}>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="11" x2="12" y2="16" />
    <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
  </Icon>
);
