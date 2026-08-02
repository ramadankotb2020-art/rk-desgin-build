/* ============================================================
   RK DESIGN — أدوات مشتركة لكل الـ Functions
   ============================================================ */

// بيحول كلمة السر لتوكن ثابت (hash) عشان منخزنش كلمة السر نفسها في الكوكيز
export async function sessionToken(secret) {
  const enc = new TextEncoder().encode("rk-admin-session:" + (secret || ""));
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function slugify(str) {
  return (
    (str || "")
      .toString()
      .toLowerCase()
      .replace(/[^\u0621-\u064Aa-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 40) || "project"
  );
}

export async function isAuthenticated(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/rk_session=([a-f0-9]+)/);
  if (!match) return false;
  const expected = await sessionToken(env.ADMIN_PASSWORD);
  return match[1] === expected;
}
