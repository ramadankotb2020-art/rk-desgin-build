# دليل إضافة الفيديو للمشاريع — RK Design Studio

## الإعداد المطلوب للفيديو

| الخاصية | القيمة المطلوبة |
|---------|----------------|
| المدة | 5 – 15 ثانية |
| الحجم | أقل من 5 MB |
| الدقة | 1280×720 (720p) أو 1920×1080 (1080p) |
| معدل البت | 2–4 Mbps |
| الصوت | **لا يوجد** (muted بالكامل) |
| التكرار | seamless loop |

---

## طريقة إضافة فيديو لمشروع

### الخطوة 1 — تجهيز الفيديو

**باستخدام FFmpeg (مجاناً):**

```bash
# ضغط إلى MP4 (H.264) — فولباك أساسي
ffmpeg -i input.mp4 -an -vcodec libx264 -crf 28 -preset slow \
       -vf "scale=1280:-2" -movflags +faststart output.mp4

# تحويل إلى WebM (VP9) — أولوية أعلى (أصغر حجماً)
ffmpeg -i input.mp4 -an -c:v libvpx-vp9 -crf 33 -b:v 0 \
       -vf "scale=1280:-2" output.webm
```

**بدون FFmpeg:**
- استخدم [HandBrake](https://handbrake.fr) (مجاني)
- أو [Cloudconvert.com](https://cloudconvert.com)
- أو [Ezgif Video Optimizer](https://ezgif.com/optimize-video)

---

### الخطوة 2 — رفع الملفات

ضع الفيديو جنب صور المشروع:

```
images/
  projects-by-name/
    interior/
      اسم-المشروع/
        01-cover.jpg      ← الـ poster
        cover.mp4         ← الفيديو MP4
        cover.webm        ← الفيديو WebM (اختياري لكن مفضّل)
```

---

### الخطوة 3 — إضافة الحقول في projects-data.js

```js
{
  "id": "اسم-المشروع-abc123",
  "title": "اسم المشروع",
  "cover": "images/projects-by-name/interior/اسم-المشروع/01-cover.jpg",
  "video_mp4":  "images/projects-by-name/interior/اسم-المشروع/cover.mp4",
  "video_webm": "images/projects-by-name/interior/اسم-المشروع/cover.webm",
  // ... باقي الحقول
}
```

---

## كيف بيشتغل النظام تلقائياً

1. **الكارت يظهر في الشاشة** → الفيديو يبدأ يتحمّل
2. **تحميل الـ metadata** → الـ poster (الصورة) بتظهر فوراً
3. **جاهز للتشغيل** → الفيديو بيشتغل بدون صوت
4. **الكارت يخرج من الشاشة** → الفيديو بيتوقف (توفير باور)
5. **يرجع للشاشة** → يكمّل تلقائياً

## حالات الفولباك التلقائية

| الحالة | السلوك |
|--------|--------|
| الفيديو مش موجود | الصورة العادية بتظهر |
| الفيديو فشل في التحميل | الصورة العادية بتظهر |
| المتصفح منع autoplay | الـ poster بيفضل ظاهر |
| شبكة بطيئة / save-data | الفيديو مش بيتحمّل خالص |
| reduce-motion مفعّل | الفيديو مش بيتحمّل خالص |
| WebM مش مدعوم | بيرجع للـ MP4 تلقائياً |

---

## WebM vs MP4

| | WebM (VP9) | MP4 (H.264) |
|--|--|--|
| الحجم | أصغر بـ 30-40% | أكبر |
| الدعم | Chrome, Firefox, Edge | **كل المتصفحات** |
| الأولوية | **أول** | فولباك |

**دايماً ارفع الاتنين.** النظام بياخد WebM لو موجود.
