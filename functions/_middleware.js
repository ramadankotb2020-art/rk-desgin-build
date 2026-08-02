/* ============================================================
   RK DESIGN — حماية الـ API
   أي طلب مش GET على /api/* (يعني إضافة/تعديل/حذف/رفع صور)
   لازم يكون معاه كوكيز تسجيل دخول صحيحة، ما عدا /api/login نفسه.
   ============================================================ */
import { isAuthenticated, json } from "./_utils.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  const isWriteApi =
    url.pathname.startsWith("/api/") &&
    request.method !== "GET" &&
    url.pathname !== "/api/login";

  if (isWriteApi) {
    const ok = await isAuthenticated(request, env);
    if (!ok) {
      return json({ ok: false, error: "محتاج تسجّل دخول الأول." }, 401);
    }
  }

  return next();
}
