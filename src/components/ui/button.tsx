import { clsx } from "clsx";
import type { ButtonHTMLAttributes } from "react";
export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={clsx("btn", `btn-${variant}`, className)} {...props} />
  );
}
