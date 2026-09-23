import { connection } from 'next/server';
import TendApp from './tend-app';
import { getDashboard } from '@/lib/queries';

/**
 * Server shell: fetches every row once and hands them to the client container.
 * Mutations run as Server Actions and call revalidatePath('/'), which re-runs
 * this component with fresh data.
 */
export default async function Page() {
  // The dashboard is per-request, private data — never prerender it at build time.
  await connection();
  const data = await getDashboard();
  return <TendApp data={data} />;
}
