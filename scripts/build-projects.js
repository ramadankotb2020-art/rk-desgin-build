// scripts/build-projects.js
//
// السكريبت ده بيشتغل تلقائي مع كل رفعة على Cloudflare (Build command).
// شغله: يفتح مجلد images/projects-by-name، يقرا كل فولدر مشروع،
// ويولّد ملف js/projects-data.js اللي الموقع بيقرا منه.
//
// إزاي تضيف مشروع جديد:
//   1) روح لمجلد images/projects-by-name/<القسم>/  (تصميم-داخلي أو تصميم-خارجي أو تصميم-جرافيك)
//   2) اعمل فولدر جديد باسم المشروع اللي عايزه يظهر بيه على الموقع
//   3) حط جوّاه صور المشروع (أول صورة أبجديًا = صورة الغلاف)
//   4) (اختياري) اعمل ملف info.txt جواه لتفاصيل إضافية — لو مش عملته، الموقع
//      هيحط قيم افتراضية بسيطة وتقدر تعدّلها بعدين
//   5) ادفع (Commit + Push) — الموقع هيتحدث لوحده تلقائي
//
// إزاي تعدّل مشروع موجود:
//   - غيّر اسم الفولدر = يتغيّر اسم المشروع على الموقع
//   - ضيف/امسح صورة من جوه الفولدر = تتضاف/تتمسح من الموقع
//   - عدّل info.txt = تتحدث التفاصيل
//
// إزاي تمسح مشروع:
//   - امسح الفولدر بتاعه بالكامل
//
// إزاي تتحكم في صور "الأعمال المميزة" في الصفحة الرئيسية:
//   - افتح info.txt بتاع أي مشروع عايزه يظهر في الصفحة الرئيسية
//   - ضيف سطر: مميز: نعم
//   - تقدر تعمل كده لحد 6 مشاريع. لو معملتش أي مشروع "مميز"، الموقع
//     هيعرض تلقائي أول 6 مشاريع بس كحل بديل.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const IMAGES_ROOT = path.join(ROOT, "images", "projects-by-name");
const OUTPUT_FILE = path.join(ROOT, "js", "projects-data.js");

const DISCIPLINE_FOLDERS = {
  "تصميم-داخلي": "interior",
  "تصميم-خارجي": "exterior",
  "تصميم-جرافيك": "graphic"
};

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

function slugify(str) {
  return (
    (str || "")
      .toString()
      .toLowerCase()
      .replace(/[^\u0621-\u064Aa-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) || "project"
  );
}

function parseInfoTxt(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const text = fs.readFileSync(filePath, "utf8");
  const map = {
    "العنوان": "title",
    "التصنيف": "category",
    "الموقع": "location",
    "السنة": "year",
    "المساحة": "area",
    "الوصف": "description",
    "الفكرة": "idea",
    "الخامات": "materials",
    "الوسوم": "tags",
    "مميز": "featured"
  };
  const out = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    const field = map[key];
    if (!field || !value) continue;
    if (field === "materials" || field === "tags") {
      out[field] = value.split(",").map((s) => s.trim()).filter(Boolean);
    } else if (field === "featured") {
      out[field] = ["نعم", "yes", "true", "y"].includes(value.toLowerCase());
    } else {
      out[field] = value;
    }
  }
  return out;
}

function buildProjectFromFolder(disciplineKey, folderName, folderPath) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const images = entries
    .filter((e) => e.isFile() && IMAGE_EXT.includes(path.extname(e.name).toLowerCase()))
    .map((e) => e.name)
    .sort();

  if (!images.length) return null; // فولدر من غير صور = مش مشروع جاهز، اتجاهله

  const cover = `images/projects-by-name/${disciplineKey}/${folderName}/${images[0]}`;
  const gallery = images
    .slice(1)
    .map((img) => `images/projects-by-name/${disciplineKey}/${folderName}/${img}`);

  const info = parseInfoTxt(path.join(folderPath, "info.txt"));
  const discipline = DISCIPLINE_FOLDERS[disciplineKey] || disciplineKey;
  const title = info.title || folderName;

  return {
    id: slugify(title) + "-" + Buffer.from(folderName).toString("hex").slice(0, 8),
    discipline,
    category: info.category || "",
    title,
    location: info.location || "",
    area: info.area || null,
    year: info.year || "",
    cover,
    before: null,
    gallery,
    excerpt: info.description ? info.description.slice(0, 120) : `مشروع ${title}`,
    description: info.description || `مشروع ${title}.`,
    idea: info.idea || "",
    materials: info.materials || [],
    tags: info.tags || [],
    featured: !!info.featured
  };
}

function main() {
  const projects = [];

  if (!fs.existsSync(IMAGES_ROOT)) {
    console.log("مفيش مجلد images/projects-by-name — هيتم الاحتفاظ بالبيانات الحالية.");
    return;
  }

  for (const disciplineFolder of fs.readdirSync(IMAGES_ROOT)) {
    const disciplinePath = path.join(IMAGES_ROOT, disciplineFolder);
    if (!fs.statSync(disciplinePath).isDirectory()) continue;

    for (const projectFolder of fs.readdirSync(disciplinePath)) {
      const projectPath = path.join(disciplinePath, projectFolder);
      if (!fs.statSync(projectPath).isDirectory()) continue;

      const project = buildProjectFromFolder(disciplineFolder, projectFolder, projectPath);
      if (project) projects.push(project);
    }
  }

  const fileContent =
    "/* الملف ده بيتولّد تلقائيًا من مجلدات المشاريع — متعدّلوش يدويًا. */\n" +
    "const PROJECTS_FALLBACK = " +
    JSON.stringify(projects, null, 2) +
    ";\n" +
    "const projectsData = PROJECTS_FALLBACK;\n";

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, fileContent, "utf8");

  console.log(`تم توليد ${projects.length} مشروع في js/projects-data.js`);
}

main();
