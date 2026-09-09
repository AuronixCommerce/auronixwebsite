import Link from "next/link";
import { ArrowRight } from "lucide-react";
export function CTASection({
  title,
  description,
  buttonText,
  buttonHref,
  variant = "light",
}: {
  title: string;
  description?: string;
  buttonText: string;
  buttonHref: string;
  variant?: "light" | "dark";
}) {
  return (
    <section
      className={`ac-final-cta ${variant === "dark" ? "bg-primary text-primary-foreground" : ""}`}
    >
      <div className="ac-container">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <Link href={buttonHref} className="ac-button">
          {buttonText}
          <ArrowRight size={19} />
        </Link>
      </div>
    </section>
  );
}
