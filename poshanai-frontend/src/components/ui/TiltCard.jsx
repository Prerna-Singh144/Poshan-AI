import { useState } from 'react';
import { ArrowUpRight, Leaf } from 'lucide-react';
import ClippedCircle from './ClippedCircle.jsx';
import Tilt from './Tilt.jsx';
import { cn } from './cn.js';

export default function TiltCard({
  title,
  description,
  badgeLabel = 'View Details',
  imageSrc,
  icon: Icon = Leaf,
  onClick,
  children,
  className,
}) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <Tilt
      onClick={onClick}
      onHoverChange={setIsRevealed}
      aria-label={`${badgeLabel}: ${title}`}
      className={cn(
        'group relative flex min-h-[19rem] cursor-pointer flex-col overflow-hidden rounded-3xl border border-emerald-100 bg-white text-left shadow-sm transition-shadow duration-300 hover:shadow-xl hover:shadow-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4',
        className,
      )}
    >
      <ClippedCircle
        isRevealed={isRevealed}
        className="right-[-4.5rem] top-[-5rem] h-56 w-56 sm:h-64 sm:w-64"
      />

      {children ? (
        <div className="relative z-10 flex-1 [transform-style:preserve-3d]">{children}</div>
      ) : (
        <div className="relative z-10 flex min-h-[19rem] flex-1 flex-col p-6 [transform:translateZ(28px)] sm:p-7">
          <div className="flex items-start justify-between gap-3">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt=""
                loading="lazy"
                className="h-14 w-14 rounded-2xl object-cover ring-1 ring-emerald-100"
              />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-orange-50 text-emerald-800 ring-1 ring-emerald-100">
                <Icon aria-hidden="true" className="h-7 w-7" />
              </span>
            )}
            <span className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 backdrop-blur">
              {badgeLabel}
            </span>
          </div>

          <div className="mt-auto max-w-[18rem] pt-8">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-emerald-950">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>

          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
            Explore nutrient
            <ArrowUpRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      )}
    </Tilt>
  );
}
