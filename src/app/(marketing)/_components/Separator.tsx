interface SeparatorProps {
  direction?: "vertical" | "horizontal";
  className?: string;
}

export function Separator({
  direction = "vertical",
  className = "",
}: SeparatorProps) {
  const base =
    direction === "vertical" ? "h-[23px] w-[1px]" : "w-[250px] h-[1px]";

  return <div className={`${base} ${className}`} />;
}
