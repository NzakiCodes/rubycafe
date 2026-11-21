import { useState } from 'react';
import { Coffee } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ResilientImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#EAE8E3] via-[#DFDDD6] to-[#D2CFC7] text-[#3F3E3A] p-6 ${className}`}
      >
        <Coffee className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        {fallbackTitle ? (
          <span className="text-xs font-medium tracking-wide text-center opacity-75">
            {fallbackTitle}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
