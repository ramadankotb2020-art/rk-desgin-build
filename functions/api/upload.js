import { json, isAuthenticated } from "../_utils.js";

/* ============================================================
   UPLOAD API — Cloudinary
   صور: JPG/PNG/WebP/GIF — حد أقصى 10MB
   فيديو: MP4/WebM/MOV   — حد أقصى 50MB
   ============================================================ */

const IMAGE_TYPES = new Set(["image/jpeg","image/jpg","image/png","image/webp","image/gif","image/avif"]);
const VIDEO_TYPES = new Set(["video/mp4","video/webm","video/quicktime","video/x-msvideo"]);
const VIDEO_EXTS  = new Set([".mp4",".webm",".mov",".avi"]);

export async function onRequestPost({ request, env }) {
  if (!await isAuthenticated(request, env)) {
    return json({ ok: false, error: "غير مصرح." }, 401);
  }

  const cloudName = env.CLOUDINARY_CLOUD_NAME || "jtjr4dxi";
  const apiKey    = env.CLOUDINARY_API_KEY    || "278168968525742";
  const apiSecret = env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    return json({ ok: false, error: "CLOUDINARY_API_SECRET غير موجود في Environment Variables." }, 500);
  }

  let form;
  try { form = await request.formData(); }
  catch { return json({ ok: false, error: "تنسيق الطلب غير صحيح." }, 400); }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return json({ ok: false, error: "لم يتم إرسال أي ملف." }, 400);
  }

  const mimeType = (file.type || "").toLowerCase();
  const fileName = (file.name || "upload").toLowerCase();
  const ext      = "." + fileName.split(".").pop();
  const isImage  = IMAGE_TYPES.has(mimeType) || [".jpg",".jpeg",".png",".webp",".gif"].includes(ext);
  const isVideo  = VIDEO_TYPES.has(mimeType) || VIDEO_EXTS.has(ext);

  if (!isImage && !isVideo) {
    return json({ ok: false, error: `نوع الملف غير مدعوم. المسموح: صور JPG/PNG/WebP أو فيديو MP4/WebM/MOV.` }, 415);
  }

  const maxBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
  const fileBytes = await file.arrayBuffer();
  if (fileBytes.byteLength > maxBytes) {
    return json({ ok: false, error: `حجم الملف كبير جداً. الحد الأقصى ${isVideo ? 50 : 10}MB.` }, 413);
  }

  // توقيع Cloudinary
  const timestamp  = Math.floor(Date.now() / 1000).toString();
  const folder     = "rk-design";
  const resourceType = isVideo ? "video" : "image";

  // إنشاء الـ signature
  const strToSign  = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const msgBuffer  = new TextEncoder().encode(strToSign);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  const signature  = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0")).join("");

  // بناء الـ FormData لـ Cloudinary
  const cloudForm = new FormData();
  cloudForm.append("file",       new Blob([fileBytes], { type: mimeType }));
  cloudForm.append("api_key",    apiKey);
  cloudForm.append("timestamp",  timestamp);
  cloudForm.append("signature",  signature);
  cloudForm.append("folder",     folder);

  // تحسين الصور تلقائياً
  if (isImage) {
    cloudForm.append("transformation", "q_auto,f_auto,w_1600");
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  let cloudRes;
  try {
    cloudRes = await fetch(uploadUrl, { method: "POST", body: cloudForm });
  } catch(e) {
    return json({ ok: false, error: "تعذر الاتصال بـ Cloudinary: " + e.message }, 502);
  }

  const cloudData = await cloudRes.json();

  if (!cloudRes.ok) {
    return json({ ok: false, error: cloudData.error?.message || "فشل الرفع على Cloudinary." }, 500);
  }

  return json({
    ok:     true,
    url:    cloudData.secure_url,
    type:   isVideo ? "video" : "image",
    sizeMB: +(fileBytes.byteLength / 1024 / 1024).toFixed(2),
    width:  cloudData.width,
    height: cloudData.height,
  });
}
