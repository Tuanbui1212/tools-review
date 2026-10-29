import { ClapperIcon } from "./icons";

export function BrandLogo({ size = "md", tagline = "STUDIO" }: { size?: "md" | "lg"; tagline?: string }) {
  return (
    <span className={`crt-brand${size === "lg" ? " crt-brand--lg" : ""}`}>
      <span className="crt-brand__mark">
        <ClapperIcon size={size === "lg" ? 26 : 20} />
      </span>
      <span>
        <span className="crt-brand__name">Comic Review</span>
        <span className="crt-brand__tag">{tagline}</span>
      </span>
    </span>
  );
}
