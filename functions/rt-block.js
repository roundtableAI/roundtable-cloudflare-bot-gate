// functions/rt-block.js   (Pages Function)  OR  _worker.js route handler
export const onRequestPost = async ({ request, env }) => {
  const secret = env.RT_WEBHOOK_TOKEN;              // set as Secret in dashboard

  // bearer-token auth
  if (request.headers.get('authorization') !== `Bearer ${secret}`)
    return new Response(null, { status: 401 });

  const { sid, ttl = 86_400 } = await request.json();
  if (!sid) return new Response('sid required', { status: 400 });

  await env.RT_BLOCKED.put(`sid:${sid}`, '', { expirationTtl: ttl }); // 24 h default
  return new Response(null, { status: 204 });
};