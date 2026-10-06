import { hubDashboard, isHubRequest, unauthorized } from '@/lib/hub';

export async function GET(request: Request) {
  if (!isHubRequest(request)) return unauthorized();
  return Response.json(await hubDashboard());
}
