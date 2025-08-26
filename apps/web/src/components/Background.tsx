type Variant = "stars" | "blobs";

export default function Background({
  variant = "stars",
  speed = 2.5, // 1 = normal, 2 = 2x faster, 0.5 = slower
}: { variant?: Variant; speed?: number }) {
  return (
    <div
      aria-hidden="true"
      className={variant === "stars" ? "bg-stars" : "bg-blobs"}
      style={{ ["--bg-speed" as any]: speed }}
    />
  );
}