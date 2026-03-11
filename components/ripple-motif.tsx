import { cn } from "@/lib/utils";

interface RippleMotifProps {
  size?: "xs" | "sm" | "md" | "lg";
  animate?: boolean;
  className?: string;
}

export function RippleMotif({ size = "md", animate = true, className }: RippleMotifProps) {
  const sizeMap = {
    xs: { container: "h-14 w-14", rings: 3, ringBase: 14, ringStep: 8, anim: "animate-ripple-ring-sm" },
    sm: { container: "h-8 w-8", rings: 3, ringBase: 12, ringStep: 6, anim: "animate-ripple-ring-sm" },
    md: { container: "h-32 w-32", rings: 4, ringBase: 28, ringStep: 18, anim: "animate-ripple-ring" },
    lg: { container: "h-48 w-48", rings: 5, ringBase: 36, ringStep: 22, anim: "animate-ripple-ring" },
  };

  const config = sizeMap[size];

  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        config.container,
        className
      )}
    >
      {/* Static center dot */}
      <div
        className={cn(
          "absolute rounded-full bg-foreground/20",
          size === "xs" || size === "sm" ? "h-1.5 w-1.5" : size === "md" ? "h-2 w-2" : "h-2.5 w-2.5"
        )}
      />

      {/* Expanding ripple rings */}
      {Array.from({ length: config.rings }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-full border border-foreground/[0.08]",
            animate && (size === "xs" || size === "sm" ? "animate-ripple-ring-sm" : "animate-ripple-ring"),
          )}
          style={{
            width: config.ringBase + config.ringStep * (i + 1),
            height: config.ringBase + config.ringStep * (i + 1),
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    <div className="hidden animate-ripple-ring" />
    </div>
  );
}
