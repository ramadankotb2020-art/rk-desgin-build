export async function onRequestPost() {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append("Set-Cookie", "rk_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
  return new Response(JSON.stringify({ ok: true }), { headers });
}
