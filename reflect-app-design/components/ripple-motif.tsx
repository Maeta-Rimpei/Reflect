import { cn } from "@/lib/utils";

interface RippleMotifProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RippleMotif({ size = "md", className }: RippleMotifProps) {
  const sizeMap = {
    sm: { container: "h-8 w-8", rings: 3, ringBase: 12, ringStep: 6, anim: "ripple-ring-sm" },
    md: { container: "h-32 w-32", rings: 4, ringBase: 28, ringStep: 18, anim: "ripple-ring" },
    lg: { container: "h-48 w-48", rings: 5, ringBase: 36, ringStep: 22, anim: "ripple-ring" },
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
          size === "sm" ? "h-1.5 w-1.5" : size === "md" ? "h-2 w-2" : "h-2.5 w-2.5"
        )}
      />

      {/* Expanding ripple rings */}
      {Array.from({ length: config.rings }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "absolute rounded-full border border-foreground/[0.08]",
            config.anim
          )}
          style={{
            width: config.ringBase + config.ringStep * (i + 1),
            height: config.ringBase + config.ringStep * (i + 1),
            animationDelay: `${i * 0.8}s`,
          }}
        />
      ))}
    </div>
  );
}
