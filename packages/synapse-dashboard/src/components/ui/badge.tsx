import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

const variants: Record<string, string> = {
  default: "bg-gray-100 text-gray-800",
  hot: "bg-orange-100 text-orange-800",
  cold: "bg-blue-100 text-blue-800",
  archive: "bg-gray-200 text-gray-600",
  success: "bg-green-100 text-green-800",
  purple: "bg-purple-100 text-purple-800",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}
