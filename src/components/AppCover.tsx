import { useState } from 'react';
import { AppWindow } from 'lucide-react';

interface AppCoverProps {
  src?: string;
  alt: string;
  title: string;
  className?: string;
  priority?: boolean;
}

export function AppCover({ src, alt, title, className = '', priority = false }: AppCoverProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    const initial = (title || 'A').trim().charAt(0).toUpperCase();
    return (
      <div
        className={`flex items-center justify-center bg-zinc-100 text-zinc-600 select-none font-display font-semibold ${className}`}
        aria-label={alt}
      >
        {initial ? (
          <span className="text-lg">{initial}</span>
        ) : (
          <AppWindow className="w-5 h-5 stroke-[1.75] text-zinc-400" aria-hidden="true" />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
