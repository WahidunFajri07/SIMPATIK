export function Logo({ small = false }: { small?: boolean }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg
        width="34"
        height="34"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M11 27L29 13M11 13L29 27"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <circle cx="11" cy="13" r="5" fill="currentColor" />
        <circle cx="29" cy="27" r="5" fill="currentColor" />
        <circle cx="29" cy="13" r="4" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="11" cy="27" r="4" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      {!small && (
        <span>
          SIMPATIK<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}
