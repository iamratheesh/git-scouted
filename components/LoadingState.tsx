"use client";

export default function LoadingState() {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full max-w-5xl mx-auto animate-pulse p-4">
      {/* Front Card Skeleton */}
      <div className="w-[380px] h-[570px] rounded-[1rem] border border-slate-200 bg-white/70 shadow-lg p-8 flex flex-col justify-between relative overflow-hidden">
        {/* Top Header Skeletal Lines */}
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-2">
            <div className="h-10 w-16 bg-slate-300/60 rounded-lg" />
            <div className="h-6 w-32 bg-slate-300/60 rounded-md" />
          </div>
          <div className="h-12 w-12 bg-slate-300/60 rounded-lg" />
        </div>

        {/* Mid Stats Skeleton (Left Column) */}
        <div className="grid grid-cols-2 gap-3.5 w-[160px] mt-16">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-[74px] h-[62px] bg-slate-300/40 rounded-lg" />
          ))}
        </div>

        {/* Bottom Star & Rating Skeleton */}
        <div className="space-y-3 mt-auto">
          <div className="h-4 w-24 bg-slate-300/50 rounded-md" />
          <div className="h-12 w-16 bg-slate-300/60 rounded-lg" />
        </div>

        {/* Skeletal Avatar Overlay in Bottom Right */}
        <div className="absolute bottom-0 right-0 w-[240px] h-[340px] bg-slate-300/30 rounded-tl-full" />
      </div>

      {/* Back Card Skeleton */}
      <div className="w-[380px] h-[570px] rounded-[1rem] border border-slate-200 bg-white/70 shadow-lg p-8 flex flex-col justify-between overflow-hidden">
        {/* Header Skeleton */}
        <div className="flex justify-between items-start border-b border-slate-200 pb-4">
          <div className="space-y-2">
            <div className="h-6 w-28 bg-slate-300/60 rounded-md" />
            <div className="h-3.5 w-20 bg-slate-300/40 rounded-md" />
          </div>
          <div className="h-4 w-12 bg-slate-300/40 rounded-md" />
        </div>

        {/* Body Metrics Skeleton */}
        <div className="flex-grow flex flex-col justify-center gap-4.5 py-6">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between items-end">
                <div className="h-3 w-28 bg-slate-300/40 rounded-md" />
                <div className="h-4 w-8 bg-slate-300/60 rounded-md" />
              </div>
              <div className="h-2 w-full bg-slate-300/30 rounded-full" />
            </div>
          ))}
        </div>

        {/* Footer Skeleton */}
        <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
          <div className="h-3.5 w-32 bg-slate-300/40 rounded-md" />
          <div className="h-3.5 w-16 bg-slate-300/40 rounded-md" />
        </div>
      </div>
    </div>
  );
}
