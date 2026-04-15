import Image from "next/image";
import { cn } from "@/lib/utils";

type TadaLogoProps = {
  className?: string;
  alt?: string;
  priority?: boolean;
};

export function TadaLogo({
  className,
  alt = "Tada",
  priority = false,
}: TadaLogoProps) {
  return (
    <Image
      src="/tada-logo.svg"
      alt={alt}
      priority={priority}
      width={40}
      height={40}
      className={cn("h-7 w-7", className)}
    />
  );
}
