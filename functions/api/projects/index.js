import { json, slugify } from "../../_utils.js";

// GET /api/projects — عام، بيستخدمه الموقع نفسه لعرض المشاريع
export async function onRequestGet({ env }) {
  const raw = await env.PROJECTS_KV.get("projects");
  return json(raw ? JSON.parse(raw) : []);
}

// POST /api/projects — إضافة مشروع جديد (محمي بكلمة السر عبر الـ middleware)
export async function onRequestPost({ request, env }) {
  let project;
  try {
    project = await request.json();
  } catch {
    return json({ ok: false, error: "بيانات غير صالحة." }, 400);
  }

  if (!project.title || !project.discipline || !project.excerpt || !project.description) {
    return json({ ok: false, error: "فيه حقول أساسية ناقصة." }, 400);
  }

  const list = JSON.parse((await env.PROJECTS_KV.get("projects")) || "[]");

  project.id = slugify(project.title) + "-" + Date.now().toString(36);
  project.before = project.before || null;
  project.cover = project.cover || null;
  project.gallery = Array.isArray(project.gallery) ? project.gallery : [];
  project.materials = Array.isArray(project.materials) ? project.materials : [];
  project.tags = Array.isArray(project.tags) ? project.tags : [];

  list.unshift(project);
  await env.PROJECTS_KV.put("projects", JSON.stringify(list));

  return json({ ok: true, project });
}
