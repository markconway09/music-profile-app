export function CollapsibleGroup({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-lg border border-black/10 dark:border-white/15">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 20 20"
          className="h-4 w-4 shrink-0 text-black/40 transition-transform group-open:rotate-90 dark:text-white/40"
          fill="currentColor"
        >
          <path d="M7 4l6 6-6 6V4z" />
        </svg>
        <span className="text-sm font-medium">{title}</span>
        {subtitle && (
          <span className="text-xs text-black/40 dark:text-white/40">{subtitle}</span>
        )}
      </summary>
      <div className="border-t border-black/10 px-3 py-3 dark:border-white/15">{children}</div>
    </details>
  );
}
