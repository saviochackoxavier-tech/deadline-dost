import { useApp } from '../context/AppContext.jsx';
import { Icon } from './Icons.jsx';

const TONES = {
  success: { wrap: 'border-mint/35', chip: 'bg-mint/10 text-mint', icon: 'check' },
  info: { wrap: 'border-cyan/30', chip: 'bg-cyan/10 text-cyan', icon: 'info' },
  error: { wrap: 'border-urgent/35', chip: 'bg-urgent/10 text-urgent', icon: 'alert' },
};

export default function Toast() {
  const { toast, dismissToast } = useApp();
  if (!toast) return null;

  const tone = TONES[toast.tone] ?? TONES.info;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 lg:bottom-8">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border ${tone.wrap} bg-panel px-4 py-3 shadow-xl shadow-black/40`}
      >
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tone.chip}`}>
          <Icon name={tone.icon} className="h-3.5 w-3.5" strokeWidth={2} />
        </span>
        <p className="flex-1 text-sm leading-relaxed text-ink">{toast.message}</p>
        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss notification"
          className="-mr-1 mt-0.5 rounded p-1 text-muted transition hover:text-ink"
        >
          <Icon name="x" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
