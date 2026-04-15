import type { StaticImageData } from "next/image";

declare module "react" {
  interface ImgHTMLAttributes<T> {
    src?: string | StaticImageData | undefined;
  }
}

export {};
