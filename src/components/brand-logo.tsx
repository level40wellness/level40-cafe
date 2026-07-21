import Image from "next/image";
import Link from "next/link";

type Props = {
  variant?: "header" | "footer";
  className?: string;
};

/**
 * The source app pointed at a Lovable-hosted URL that dies with the old
 * deployment. The logo now ships in /public.
 */
export function BrandLogo({ variant = "header", className }: Props) {
  const height = variant === "footer" ? 80 : 48;

  return (
    <Link
      href="/"
      aria-label="Level 40 — Integrated Wellness Café"
      className={className ? `logo-link ${className}` : "logo-link"}
    >
      <Image
        className="logo-img"
        src="/level40-logo.png"
        alt="Level 40 — Integrated Wellness Café"
        height={height}
        width={height * 3}
        style={{ height, width: "auto" }}
        priority={variant === "header"}
      />
    </Link>
  );
}
