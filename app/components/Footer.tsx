const STYLES = {
  playfair: {
    fontFamily: "var(--font-playfair), serif",
    fontWeight: 300,
  },
  colors: {
    primary: "#333333",
    secondary: "#666666",
  },
} as const;

const NAV_LINKS = [
  { href: "https://jasonxu.me", label: "About Me" },
  { href: "https://resume.jasonxu.me", label: "Resume" },
  { href: "https://contact.jasonxu.me", label: "Contact" },
  { href: "https://github.jasonxu.me", label: "GitHub" },
  { href: "https://linkedin.jasonxu.me", label: "LinkedIn" },
] as const;

export default function Footer() {
  return (
    <footer className="py-20 px-6 md:px-12 text-center">
      <h2
        className="text-2xl md:text-3xl mb-6 leading-tight"
        style={{
          ...STYLES.playfair,
          color: STYLES.colors.primary,
        }}
      >
        <a
          href="https://email.jasonxu.me"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-link"
          style={{ textDecoration: "none" }}
        >
          him@jasonxu.me
        </a>
      </h2>
      <nav
        className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-8 text-sm"
        style={{ color: STYLES.colors.secondary }}
      >
        {NAV_LINKS.map(({ href, label }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            {label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
