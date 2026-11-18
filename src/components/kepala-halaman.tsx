import { Logo } from "./logo";
import { CircleHelp } from "lucide-react";
export function KepalaHalaman({
  bagian,
  demo,
}: {
  bagian: string;
  demo?: boolean;
}) {
  return (
    <header className="page-header">
      <div>
        <Logo />
        <span className="header-divider" />
        <span className="header-section">{bagian}</span>
      </div>
      <div>
        <span className="environment">
          <span />
          {demo ? "Ruang demo lokal" : "Ruang kerja tim"}
        </span>
        <a href="/panduan" className="icon-btn" aria-label="Panduan penggunaan">
          <CircleHelp size={18} />
        </a>
        <span className="avatar">SP</span>
      </div>
    </header>
  );
}
