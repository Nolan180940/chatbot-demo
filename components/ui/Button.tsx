"use client";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
}

const variants = {
  primary:
    "bg-gold hover:bg-gold-soft text-ink-950 font-semibold shadow-gold",
  ghost:
    "text-dim hover:text-white hover:bg-white/5",
  danger:
    "text-rose-400 hover:bg-rose-500/10",
  outline:
    "border border-line text-slate-200 hover:border-gold/50 hover:text-white hover:bg-gold-dim",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 font-display transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}
