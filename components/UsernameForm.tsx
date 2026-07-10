import type { FormEvent } from "react";

type UsernameFormProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

function isValidUsername(value: string): boolean {
  return value.trim().length > 0 && !/\s/.test(value);
}

export default function UsernameForm({
  value,
  onChange,
  onSubmit
}: UsernameFormProps) {
  const isValid = isValidUsername(value);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValid) {
      return;
    }

    onSubmit();
  }

  return (
    <form className="w-full space-y-1.5" onSubmit={handleSubmit}>
      <label htmlFor="github-username" className="sr-only">
        GitHub Username
      </label>
      <div className="flex flex-col gap-3 sm:flex-row items-stretch">
        <div className="relative flex-grow flex items-center">
          <span className="absolute left-4 text-slate-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" />
            </svg>
          </span>
          <input
            id="github-username"
            name="github-username"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-invalid={!isValid}
            aria-describedby="github-username-help"
            className="w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 py-3.5 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-sm text-sm"
            placeholder="Enter your GitHub username"
          />
        </div>
        <button
          type="submit"
          disabled={!isValid}
          className="rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] px-6 py-3.5 font-bold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-violet-300 text-sm shadow-md shadow-violet-200 hover:shadow-violet-300 flex items-center justify-center gap-1.5 select-none"
        >
          <span>Scout Me</span>
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>
      {value && !isValid && (
        <p id="github-username-help" className="text-[11px] text-red-500 px-1">
          Username cannot contain spaces.
        </p>
      )}
    </form>
  );
}
