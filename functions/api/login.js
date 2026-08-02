import { sessionToken, json } from "../_utils.js";

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "لسه مفيش كلمة سر متظبطة في إعدادات Cloudflare." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "طلب غير صالح." }, 400);
  }

  if (!body.password || body.password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "كلمة السر غلط." }, 401);
  }

  const token = await sessionToken(env.ADMIN_PASSWORD);
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  headers.append(
    "Set-Cookie",
    `rk_session=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`
  );
  return new Response(JSON.stringify({ ok: true }), { headers });
}
