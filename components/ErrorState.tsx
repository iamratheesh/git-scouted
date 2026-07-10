export default function ErrorState() {
  return (
    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-6 text-center text-rose-100">
      <p className="text-lg font-semibold">Unable to load GitHub data.</p>
      <p className="mt-2 text-sm text-rose-100/80">
        Check the username and try again. If GitHub is rate limiting, wait a
        moment and retry.
      </p>
    </div>
  );
}
