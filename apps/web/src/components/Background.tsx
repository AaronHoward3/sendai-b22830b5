type Variant = "stars" | "blobs";

interface BackgroundProps {
  readonly variant?: Variant;
  readonly speed?: number;
}

export default function Background({
  variant = "stars",
  speed = 2.5, // 1 = normal, 2 = 2x faster, 0.5 = slower
}: BackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={variant === "stars" ? "bg-stars" : "bg-blobs"}
      style={{ "--bg-speed": speed } as React.CSSProperties}
    />
  );
}