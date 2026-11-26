import { ArrowUpRight } from 'lucide-react';

interface HeaderProps {
  studioName: string;
  githubUrl: string;
  websiteUrl: string;
}

export function Header({ studioName, githubUrl, websiteUrl }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F5F5F7]/85 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between gap-6">
        <a
          href="#top"
          className="font-display text-base sm:text-lg font-bold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
        >
          {studioName}
        </a>

        <nav
          aria-label="Links"
          className="flex items-center gap-5 sm:gap-7 text-xs sm:text-sm font-medium text-zinc-500"
        >
          <a
            href={websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            <span>Website</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
          </a>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-zinc-950 transition-colors whitespace-nowrap shrink-0"
          >
            <span>GitHub</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}
