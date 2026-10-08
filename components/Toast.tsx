'use client';

/** Quiet confirmation after one-tap logging: "Gym logged · Add note · Undo". `onDismiss` is for notices and errors: "OK". */
export function Toast({ text, onNote, onUndo, onDismiss }: { text: string; onNote?: () => void; onUndo?: () => void; onDismiss?: () => void }) {
  return (
    <div role="status" className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-70 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-0.5 rounded-full bg-ink py-[5px] pr-[5px] pl-[18px] text-sm whitespace-nowrap text-bg shadow-lg animate-rise wide:bottom-8">
      <span className="mr-2 truncate">{text}</span>
      {onNote && <button type="button" onClick={onNote} className="h-9 rounded-full px-3 font-semibold hover:bg-bg/15">Add note</button>}
      {onUndo && <button type="button" onClick={onUndo} className="h-9 rounded-full px-3.5 font-semibold hover:bg-bg/15">Undo</button>}
      {onDismiss && <button type="button" onClick={onDismiss} className="h-9 rounded-full px-3.5 font-semibold hover:bg-bg/15">OK</button>}
    </div>
  );
}
