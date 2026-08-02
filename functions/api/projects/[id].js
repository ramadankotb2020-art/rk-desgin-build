import { json } from "../../_utils.js";

// PUT /api/projects/:id — تعديل مشروع موجود
export async function onRequestPut({ request, env, params }) {
  let updates;
  try {
    updates = await request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة." }, 400);
  }

  const list = JSON.parse((await env.PROJECTS_KV.get("projects")) || "[]");
  const idx = list.findIndex((p) => p.id === params.id);
  if (idx === -1) return json({ ok: false, error: "المشروع ده مش موجود." }, 404);

  list[idx] = { ...list[idx], ...updates, id: params.id };
  await env.PROJECTS_KV.put("projects", JSON.stringify(list));

  return json({ ok: true, project: list[idx] });
}

// DELETE /api/projects/:id — حذف مشروع
export async function onRequestDelete({ env, params }) {
  const list = JSON.parse((await env.PROJECTS_KV.get("projects")) || "[]");
  const next = list.filter((p) => p.id !== params.id);

  if (next.length === list.length) {
    return json({ ok: false, error: "المشروع ده مش موجود أصلًا." }, 404);
  }

  await env.PROJECTS_KV.put("projects", JSON.stringify(next));
  return json({ ok: true });
}
