import { useMemo } from "react";
import NextImage from "next/image";
import { Buffer } from "buffer";
import { cn } from "@/lib/utils";
import type { Experimental_GeneratedImage } from "ai";

export type ImageProps = Experimental_GeneratedImage & {
  className?: string;
  alt?: string;
  width: any;
  height: any;
};

const toBase64 = (array?: Uint8Array) => {
  if (!array) return "";
  if (typeof window === "undefined") {
    return Buffer.from(array).toString("base64");
  }
  let binary = "";
  array.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export const Image = ({
  base64,
  uint8Array,
  mediaType,
  className,
  alt,
  width,
  height,
  ...props
}: ImageProps) => {
  const dataSrc = useMemo(() => {
    const source = base64 || toBase64(uint8Array);
    return source ? `data:${mediaType};base64,${source}` : "";
  }, [base64, mediaType, uint8Array]);

  if (!dataSrc) {
    return null;
  }

  const resolvedWidth = width ?? 512;
  const resolvedHeight = height ?? 512;

  return (
    <NextImage
      {...props}
      alt={alt ?? "Generated image"}
      className={cn(
        "h-auto max-w-full overflow-hidden rounded-md",
        className
      )}
      src={dataSrc}
      width={resolvedWidth}
      height={resolvedHeight}
      unoptimized
    />
  );
};
