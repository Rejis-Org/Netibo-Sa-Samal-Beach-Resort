import type { ReactNode } from "react";

type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Svg({ size = 20, strokeWidth = 2.25, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export const ArrowLeftIcon = (props: IconProps) => <Svg {...props}><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></Svg>;
export const ArrowRightIcon = (props: IconProps) => <Svg {...props}><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></Svg>;
export const ArrowUpRightIcon = ({ size = 16, ...props }: IconProps) => <Svg size={size} {...props}><path d="M7 7h10v10" /><path d="M7 17 17 7" /></Svg>;
export const ChevronLeftIcon = (props: IconProps) => <Svg {...props}><path d="m15 18-6-6 6-6" /></Svg>;
export const ChevronRightIcon = (props: IconProps) => <Svg {...props}><path d="m9 18 6-6-6-6" /></Svg>;
export const CloseIcon = (props: IconProps) => <Svg {...props}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>;
export const MenuIcon = (props: IconProps) => <Svg {...props}><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></Svg>;
export const CheckIcon = (props: IconProps) => <Svg {...props}><path d="M20 6 9 17l-5-5" /></Svg>;
export const ChatIcon = (props: IconProps) => <Svg {...props}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></Svg>;
export const CalendarIcon = (props: IconProps) => <Svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></Svg>;
export const HomeIcon = (props: IconProps) => <Svg {...props}><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" /><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></Svg>;
export const UtensilsIcon = (props: IconProps) => <Svg {...props}><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></Svg>;
export const GlassIcon = (props: IconProps) => <Svg {...props}><path d="M8 22h8" /><path d="M12 11v11" /><path d="m19 3-7 8-7-8Z" /></Svg>;
export const SunIcon = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </Svg>
);

export const FacebookIcon = ({ size = 20, className }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true" focusable="false"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z" /></svg>;

export const PhoneIcon = (props: IconProps) => <Svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></Svg>;
export const MessengerIcon = ({ size = 20, className }: IconProps) => <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden="true" focusable="false"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.2 5.42 3.15 7.16.16.14.26.35.27.57l.05 1.78c.02.57.6.94 1.12.71l1.98-.87c.17-.07.36-.09.53-.04.91.25 1.87.38 2.9.38 5.64 0 10-4.13 10-9.7S17.64 2 12 2Zm6 7.46-2.94 4.66a1.5 1.5 0 0 1-2.17.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.19-.69-.64l2.94-4.66a1.5 1.5 0 0 1 2.17-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.19.69.64Z" /></svg>;