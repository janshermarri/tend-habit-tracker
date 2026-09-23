import { PinForm } from './pin-form';

export const metadata = { title: 'Tend — locked' };

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  // Only ever hand an in-app path to the form.
  const safe = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2">
        <h1 className="font-display text-3xl">Tend</h1>
        <p className="text-sm text-ink-2">Enter your PIN to continue</p>
      </div>
      <PinForm next={safe} />
    </main>
  );
}
