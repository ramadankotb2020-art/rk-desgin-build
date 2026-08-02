import { json } from "../_utils.js";

// POST /api/seed — بيستورد قائمة المشاريع الحالية جوّه KV لأول مرة بس
// (بيتنفذ مرة واحدة من لوحة التحكم زرار "استيراد البيانات الحالية")
export async function onRequestPost({ request, env }) {
  let list;
  try {
    list = await request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة." }, 400);
  }
  if (!Array.isArray(list)) {
    return json({ ok: false, error: "المتوقع مصفوفة مشاريع." }, 400);
  }

  const existing = await env.PROJECTS_KV.get("projects");
  if (existing && JSON.parse(existing).length) {
    return json(
      { ok: false, error: "فيه بيانات موجودة بالفعل في KV — الاستيراد اتعمل قبل كده." },
      409
    );
  }

  await env.PROJECTS_KV.put("projects", JSON.stringify(list));
  return json({ ok: true, count: list.length });
}
