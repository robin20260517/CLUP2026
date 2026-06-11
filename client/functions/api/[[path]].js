const BACKEND = 'https://clup2026.onrender.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = `${BACKEND}${url.pathname}${url.search}`;

  const res = await fetch(target, {
    method: context.request.method,
    headers: { 'content-type': 'application/json' },
    body: ['GET', 'HEAD'].includes(context.request.method) ? undefined : context.request.body,
  });

  return new Response(res.body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
  });
}
