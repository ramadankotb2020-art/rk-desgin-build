/* ============================================================
   RK DESIGN — أداة "صمم غرفتك مجانًا"
   أداة بسيطة: رسم حوائط + أبواب/شبابيك + سحب أثاث
   ============================================================ */
(function () {
  const canvas = document.getElementById("plannerCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const COLORS = {
    bg: "#16130D",
    grid: "rgba(255,255,255,.05)",
    wall: "#C9C0AC",
    wallSelected: "#E4C88F",
    window: "#8FC4D8",
    doorLine: "#C9A768",
    text: "#F3EEE2",
    subtext: "#948A75"
  };

  const GRID = 20;
  const W = canvas.width;
  const H = canvas.height;

  /* ---------------- Furniture catalog ---------------- */
  const FURNITURE = {
    living: [
      { id: "l1", label: "كنبة", w: 200, h: 80, color: "#8a6d3b", shape: "sofa" },
      { id: "l2", label: "طاولة وسط", w: 90, h: 50, color: "#c9a768", shape: "table" },
      { id: "l3", label: "وحدة تلفزيون", w: 160, h: 40, color: "#5c5346", shape: "tvunit" },
      { id: "l4", label: "كرسي", w: 60, h: 60, color: "#a98a52", shape: "chair" }
    ],
    bedroom: [
      { id: "r1", label: "سرير", w: 160, h: 200, color: "#a9865a", shape: "bed" },
      { id: "r2", label: "دولاب", w: 180, h: 60, color: "#8a6d3b", shape: "wardrobe" },
      { id: "r3", label: "تسريحة", w: 110, h: 45, color: "#c9a768", shape: "dresser" },
      { id: "r4", label: "كومودينو", w: 45, h: 45, color: "#7d7368", shape: "nightstand" }
    ],
    kitchen: [
      { id: "k1", label: "خزانة مطبخ", w: 160, h: 60, color: "#b98f4e", shape: "counter" },
      { id: "k2", label: "ثلاجة", w: 70, h: 70, color: "#8fa7ad", shape: "fridge" },
      { id: "k3", label: "جزيرة مطبخ", w: 120, h: 80, color: "#9c7a42", shape: "island" },
      { id: "k4", label: "فرن", w: 60, h: 60, color: "#7d7368", shape: "oven" }
    ],
    bathroom: [
      { id: "b1", label: "حوض", w: 60, h: 45, color: "#8fa7ad", shape: "sink" },
      { id: "b2", label: "مرحاض", w: 45, h: 55, color: "#a9b8bc", shape: "toilet" },
      { id: "b3", label: "بانيو", w: 160, h: 70, color: "#7fa0a8", shape: "tub" },
      { id: "b4", label: "دش", w: 90, h: 90, color: "#6e8f97", shape: "shower" }
    ],
    kids: [
      { id: "c1", label: "سرير أطفال", w: 130, h: 180, color: "#a9865a", shape: "bed" },
      { id: "c2", label: "مكتب", w: 110, h: 55, color: "#c9a768", shape: "desk" },
      { id: "c3", label: "مكتبة", w: 90, h: 35, color: "#8a6d3b", shape: "bookshelf" },
      { id: "c4", label: "خزانة ألعاب", w: 100, h: 45, color: "#7d7368", shape: "cabinet" }
    ]
  };
  const ROOM_LABELS = {
    living: "غرفة معيشة",
    bedroom: "غرفة نوم",
    kitchen: "مطبخ",
    bathroom: "حمام",
    kids: "غرفة أطفال"
  };

  /* ---------------- State ---------------- */
  let roomType = "living";
  let tool = "wall";
  let walls = [];       // {x1,y1,x2,y2}
  let openings = [];    // {wallIndex, t, type}
  let placed = [];      // {defId,label,color,x,y,w,h,rot}
  let selectedIndex = null;
  let iconPositions = null; // {del:{x,y,r}, rot:{x,y,r}}

  let drawingWall = null;     // {x1,y1,x2,y2} preview
  let draggingItem = null;    // {index, offX, offY}
  let placeCounter = 0;

  /* ---------------- Helpers ---------------- */
  function snap(v) { return Math.round(v / GRID) * GRID; }

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function distToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + dx * t, cy = y1 + dy * t;
    return { dist: Math.hypot(px - cx, py - cy), t };
  }

  function nearestWall(px, py, threshold) {
    let best = null;
    walls.forEach((w, i) => {
      const r = distToSegment(px, py, w.x1, w.y1, w.x2, w.y2);
      if (r.dist <= threshold && (!best || r.dist < best.dist)) {
        best = { index: i, t: r.t, dist: r.dist };
      }
    });
    return best;
  }

  function snapToWallEndpoints(x, y, threshold) {
    let best = { x: snap(x), y: snap(y) };
    let bestDist = Infinity;
    walls.forEach((w) => {
      [[w.x1, w.y1], [w.x2, w.y2]].forEach(([ex, ey]) => {
        const d = Math.hypot(x - ex, y - ey);
        if (d < threshold && d < bestDist) {
          bestDist = d;
          best = { x: ex, y: ey };
        }
      });
    });
    return best;
  }

  function itemBox(item) {
    const rotated = item.rot === 90;
    const ew = rotated ? item.h : item.w;
    const eh = rotated ? item.w : item.h;
    return { x: item.x - ew / 2, y: item.y - eh / 2, w: ew, h: eh };
  }

  function pointInBox(px, py, box) {
    return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
  }

  /* ---------------- Drawing ---------------- */
  function drawGrid() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += GRID) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += GRID) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function wallLengthCm(w) {
    return Math.round(Math.hypot(w.x2 - w.x1, w.y2 - w.y1));
  }

  function drawWallLabel(w, dashed) {
    const len = wallLengthCm(w);
    if (len < 20) return;
    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
    const horizontal = Math.abs(w.x2 - w.x1) >= Math.abs(w.y2 - w.y1);
    const lx = horizontal ? mx : mx + 18;
    const ly = horizontal ? my - 12 : my;
    ctx.save();
    ctx.font = "600 11px Tajawal, Cairo, sans-serif";
    const text = len + " سم";
    const tw = ctx.measureText(text).width + 10;
    ctx.fillStyle = "rgba(15,12,8,.72)";
    roundRect(ctx, lx - tw / 2, ly - 9, tw, 18, 4);
    ctx.fill();
    ctx.fillStyle = dashed ? COLORS.wallSelected : "#D8CFB8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, lx, ly + 1);
    ctx.restore();
  }

  function drawWalls() {
    ctx.lineCap = "square";
    walls.forEach((w) => {
      ctx.strokeStyle = COLORS.wall;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    });
    walls.forEach((w) => drawWallLabel(w, false));
    if (drawingWall) {
      ctx.strokeStyle = COLORS.wallSelected;
      ctx.lineWidth = 10;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(drawingWall.x1, drawingWall.y1);
      ctx.lineTo(drawingWall.x2, drawingWall.y2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawWallLabel(drawingWall, true);
    }
  }

  function drawOpenings() {
    openings.forEach((o) => {
      const w = walls[o.wallIndex];
      if (!w) return;
      const angle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);
      const px = w.x1 + (w.x2 - w.x1) * o.t;
      const py = w.y1 + (w.y2 - w.y1) * o.t;
      const len = 40;
      const x1 = px - Math.cos(angle) * len / 2, y1 = py - Math.sin(angle) * len / 2;
      const x2 = px + Math.cos(angle) * len / 2, y2 = py + Math.sin(angle) * len / 2;

      // erase wall segment
      ctx.save();
      ctx.strokeStyle = COLORS.bg;
      ctx.lineWidth = 12;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.restore();

      if (o.type === "window") {
        ctx.save();
        ctx.strokeStyle = COLORS.window;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.restore();
      } else {
        // door: swing symbol
        const perp = angle - Math.PI / 2;
        const panelX = x1 + Math.cos(perp) * len;
        const panelY = y1 + Math.sin(perp) * len;
        ctx.save();
        ctx.strokeStyle = COLORS.doorLine;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(panelX, panelY); ctx.stroke();
        ctx.beginPath();
        ctx.arc(x1, y1, len, perp, angle, false);
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  function shade(hex, percent) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + (percent / 100) * 255)));
    g = Math.max(0, Math.min(255, Math.round(g + (percent / 100) * 255)));
    b = Math.max(0, Math.min(255, Math.round(b + (percent / 100) * 255)));
    return "rgb(" + r + "," + g + "," + b + ")";
  }

  function baseRect(w, h, color, selected) {
    ctx.fillStyle = color;
    ctx.strokeStyle = selected ? COLORS.wallSelected : "rgba(0,0,0,.35)";
    ctx.lineWidth = selected ? 2 : 1;
    roundRect(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.fill();
    ctx.stroke();
  }

  /* Each shape drawer renders a top-view icon centered at (0,0),
     within a footprint of w × h (already translated/rotated). */
  const SHAPES = {
    sofa(w, h, color) {
      baseRect(w, h, color);
      const backH = h * 0.3, armW = Math.min(w * 0.14, 22);
      ctx.fillStyle = shade(color, -16);
      roundRect(ctx, -w / 2, -h / 2, w, backH, 4); ctx.fill();
      roundRect(ctx, -w / 2, -h / 2, armW, h, 4); ctx.fill();
      roundRect(ctx, w / 2 - armW, -h / 2, armW, h, 4); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.22)"; ctx.lineWidth = 1;
      const seats = Math.max(2, Math.round((w - 2 * armW) / 70));
      for (let i = 1; i < seats; i++) {
        const x = -w / 2 + armW + ((w - 2 * armW) * i) / seats;
        ctx.beginPath(); ctx.moveTo(x, -h / 2 + backH); ctx.lineTo(x, h / 2 - 4); ctx.stroke();
      }
    },
    chair(w, h, color) {
      const seatW = w * 0.72, seatH = h * 0.72;
      ctx.fillStyle = shade(color, -18);
      roundRect(ctx, -w / 2, -h / 2, w, h * 0.22, 3); ctx.fill();
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
      roundRect(ctx, -seatW / 2, -seatH / 2 + h * 0.06, seatW, seatH, 6);
      ctx.fill(); ctx.stroke();
    },
    table(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.18)"; ctx.lineWidth = 1;
      roundRect(ctx, -w / 2 + 6, -h / 2 + 6, w - 12, h - 12, 4); ctx.stroke();
    },
    tvunit(w, h, color) {
      baseRect(w, h, color);
      ctx.fillStyle = shade(color, -22);
      const sw = w * 0.6, sh = h * 0.35;
      ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
    },
    bed(w, h, color) {
      baseRect(w, h, color);
      ctx.fillStyle = shade(color, 22);
      const pillowW = w * 0.4, pillowH = h * 0.14, gap = w * 0.06;
      roundRect(ctx, -pillowW - gap / 2, -h / 2 + 8, pillowW, pillowH, 5); ctx.fill();
      roundRect(ctx, gap / 2, -h / 2 + 8, pillowW, pillowH, 5); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.2)"; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w / 2 + 6, h / 2 - h * 0.22);
      ctx.lineTo(w / 2 - 6, h / 2 - h * 0.22);
      ctx.stroke();
    },
    wardrobe(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.5;
      const doors = w > 130 ? 3 : 2;
      for (let i = 1; i < doors; i++) {
        const x = -w / 2 + (w * i) / doors;
        ctx.beginPath(); ctx.moveTo(x, -h / 2 + 4); ctx.lineTo(x, h / 2 - 4); ctx.stroke();
      }
      ctx.fillStyle = "rgba(0,0,0,.35)";
      for (let i = 0; i < doors; i++) {
        const cx = -w / 2 + (w * (i + 1)) / doors - w / doors / 2;
        ctx.beginPath(); ctx.arc(cx + w / doors * 0.32, 0, 1.6, 0, Math.PI * 2); ctx.fill();
      }
    },
    dresser(w, h, color) {
      ctx.save();
      ctx.fillStyle = "rgba(180,200,210,.35)";
      ctx.strokeStyle = "rgba(180,200,210,.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -h / 2 - 8, w * 0.28, 8, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
      for (let i = 1; i < 3; i++) {
        const x = -w / 2 + (w * i) / 3;
        ctx.beginPath(); ctx.moveTo(x, -h / 2 + 4); ctx.lineTo(x, h / 2 - 4); ctx.stroke();
      }
    },
    nightstand(w, h, color) {
      baseRect(w, h, color);
      ctx.fillStyle = "rgba(230,210,150,.5)";
      ctx.beginPath(); ctx.arc(w * 0.22, -h * 0.22, Math.min(w, h) * 0.16, 0, Math.PI * 2); ctx.fill();
    },
    counter(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1;
      for (let x = -w / 2 + 10; x < w / 2; x += 10) {
        ctx.beginPath(); ctx.moveTo(x, -h / 2 + 4); ctx.lineTo(x, -h / 2 + 4 + h * 0.18); ctx.stroke();
      }
    },
    fridge(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -h / 2 + 4); ctx.lineTo(0, h / 2 - 4); ctx.stroke();
      ctx.beginPath(); ctx.arc(-6, 0, 2, 0, Math.PI * 2); ctx.fill();
    },
    island(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.15)"; ctx.lineWidth = 1;
      for (let x = -w / 2 + 8; x < w / 2; x += 14) {
        for (let y = -h / 2 + 8; y < h / 2; y += 14) {
          ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.stroke();
        }
      }
    },
    oven(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 2, Math.min(w, h) * 0.28, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(-w * 0.28, -h / 2 + 5, w * 0.56, 3);
    },
    sink(w, h, color) {
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(0, h * 0.05, w / 2, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,.3)";
      ctx.fillRect(-4, -h / 2, 8, h * 0.18);
    },
    toilet(w, h, color) {
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5;
      roundRect(ctx, -w / 2, -h / 2, w, h * 0.32, 3); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, h * 0.14, w * 0.4, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    },
    tub(w, h, color) {
      ctx.fillStyle = color;
      ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1.5;
      roundRect(ctx, -w / 2, -h / 2, w, h, Math.min(w, h) / 2.2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "rgba(0,0,0,.2)";
      roundRect(ctx, -w / 2 + 8, -h / 2 + 8, w - 16, h - 16, Math.min(w, h) / 2.6);
      ctx.stroke();
    },
    shower(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-w / 2, -h / 2); ctx.lineTo(w / 2, h / 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, Math.min(w, h) * 0.12, 0, Math.PI * 2); ctx.stroke();
    },
    desk(w, h, color) {
      baseRect(w, h, color);
      ctx.fillStyle = shade(color, -20);
      const mw = w * 0.32, mh = h * 0.4;
      ctx.fillRect(-mw / 2, -h / 2 + 5, mw, mh);
    },
    bookshelf(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1;
      const sections = Math.max(3, Math.round(w / 30));
      for (let i = 1; i < sections; i++) {
        const x = -w / 2 + (w * i) / sections;
        ctx.beginPath(); ctx.moveTo(x, -h / 2 + 3); ctx.lineTo(x, h / 2 - 3); ctx.stroke();
      }
    },
    cabinet(w, h, color) {
      baseRect(w, h, color);
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, -h / 2 + 3); ctx.lineTo(0, h / 2 - 3); ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,.35)";
      ctx.beginPath(); ctx.arc(-6, 0, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(6, 0, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  };

  function drawFurniturePiece(item, selected) {
    const drawer = SHAPES[item.shape];
    if (drawer) drawer(item.w, item.h, item.color);
    else baseRect(item.w, item.h, item.color, selected);
    if (selected) {
      ctx.strokeStyle = COLORS.wallSelected;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      roundRect(ctx, -item.w / 2 - 3, -item.h / 2 - 3, item.w + 6, item.h + 6, 6);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawFurnitureLabel(item) {
    if (item.w < 55 && item.h < 55) return; // too small — icon alone is enough
    const label = item.label;
    const dims = Math.round(item.w) + "×" + Math.round(item.h) + " سم";
    ctx.font = "700 11px Tajawal, Cairo, sans-serif";
    const w1 = ctx.measureText(label).width;
    ctx.font = "500 9.5px Tajawal, Cairo, sans-serif";
    const w2 = ctx.measureText(dims).width;
    const boxW = Math.max(w1, w2) + 14;
    const boxH = 30;
    ctx.fillStyle = "rgba(15,12,8,.58)";
    roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, 5);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#F3EEE2";
    ctx.font = "700 11px Tajawal, Cairo, sans-serif";
    ctx.fillText(label, 0, -6);
    ctx.fillStyle = "#C9C0AC";
    ctx.font = "500 9.5px Tajawal, Cairo, sans-serif";
    ctx.fillText(dims, 0, 7);
  }

  function drawFurniture() {
    iconPositions = null;
    placed.forEach((item, i) => {
      const selected = i === selectedIndex;
      ctx.save();
      ctx.translate(item.x, item.y);
      if (item.rot === 90) ctx.rotate(Math.PI / 2);
      drawFurniturePiece(item, selected);
      drawFurnitureLabel(item);
      ctx.restore();

      if (selected) {
        const box = itemBox(item);
        const delX = box.x + box.w + 12, delY = box.y - 2;
        const rotX = box.x - 12, rotY = box.y - 2;
        drawIconBubble(delX, delY, "✕");
        drawIconBubble(rotX, rotY, "↻");
        iconPositions = {
          del: { x: delX, y: delY, r: 11 },
          rot: { x: rotX, y: rotY, r: 11 }
        };
      }
    });
  }

  function drawIconBubble(x, y, symbol) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = "#C9A768";
    ctx.fill();
    ctx.fillStyle = "#16130D";
    ctx.font = "700 11px Tajawal, Cairo, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(symbol, x, y + 1);
    ctx.restore();
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawHint() {
    if (walls.length === 0 && !drawingWall) {
      ctx.save();
      ctx.fillStyle = COLORS.subtext;
      ctx.font = "500 14px Tajawal, Cairo, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("اسحب على اللوحة عشان ترسم أول حائط", W / 2, H / 2);
      ctx.restore();
    }
  }

  function render() {
    drawGrid();
    drawWalls();
    drawOpenings();
    drawFurniture();
    drawHint();
  }

  /* ---------------- Furniture palette ---------------- */
  const furnitureGrid = document.getElementById("furnitureGrid");
  const furnitureRoomLabel = document.getElementById("furnitureRoomLabel");

  function renderFurniturePalette() {
    furnitureGrid.innerHTML = "";
    (FURNITURE[roomType] || []).forEach((def) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = def.label;
      btn.addEventListener("click", () => addFurniture(def));
      furnitureGrid.appendChild(btn);
    });
    if (furnitureRoomLabel) furnitureRoomLabel.textContent = ROOM_LABELS[roomType];
  }

  function addFurniture(def) {
    placeCounter++;
    const offset = (placeCounter % 5) * 18;
    placed.push({
      defId: def.id,
      label: def.label,
      color: def.color,
      shape: def.shape,
      w: def.w,
      h: def.h,
      rot: 0,
      x: W / 2 + offset,
      y: H / 2 + offset
    });
    selectedIndex = placed.length - 1;
    render();
  }

  /* ---------------- Room type chips ---------------- */
  const roomChips = document.getElementById("roomTypeChips");
  roomChips.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      roomChips.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      roomType = btn.dataset.room;
      renderFurniturePalette();
    });
  });
  roomChips.querySelector('[data-room="living"]').classList.add("is-active");

  /* ---------------- Tool buttons ---------------- */
  const toolButtons = document.getElementById("toolButtons");
  toolButtons.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      toolButtons.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      tool = btn.dataset.tool;
      selectedIndex = null;
      render();
    });
  });

  /* ---------------- Clear all ---------------- */
  document.getElementById("clearAll").addEventListener("click", () => {
    if (!confirm("متأكد إنك عايز تمسح كل حاجة وتبدأ من جديد؟")) return;
    walls = [];
    openings = [];
    placed = [];
    selectedIndex = null;
    render();
  });

  /* ---------------- Canvas interaction ---------------- */
  function onDown(evt) {
    evt.preventDefault();
    const pos = getPos(evt);

    // 1) icons on the currently selected item
    if (selectedIndex !== null && iconPositions) {
      if (Math.hypot(pos.x - iconPositions.del.x, pos.y - iconPositions.del.y) <= iconPositions.del.r + 4) {
        placed.splice(selectedIndex, 1);
        selectedIndex = null;
        render();
        return;
      }
      if (Math.hypot(pos.x - iconPositions.rot.x, pos.y - iconPositions.rot.y) <= iconPositions.rot.r + 4) {
        placed[selectedIndex].rot = placed[selectedIndex].rot === 90 ? 0 : 90;
        render();
        return;
      }
    }

    // 2) hit test furniture (topmost first)
    for (let i = placed.length - 1; i >= 0; i--) {
      const box = itemBox(placed[i]);
      if (pointInBox(pos.x, pos.y, box)) {
        selectedIndex = i;
        draggingItem = { index: i, offX: pos.x - placed[i].x, offY: pos.y - placed[i].y };
        render();
        return;
      }
    }
    selectedIndex = null;

    // 3) structural tools
    if (tool === "wall") {
      const start = snapToWallEndpoints(pos.x, pos.y, 16);
      drawingWall = { x1: start.x, y1: start.y, x2: start.x, y2: start.y };
    } else if (tool === "door" || tool === "window") {
      const hit = nearestWall(pos.x, pos.y, 14);
      if (hit) {
        const t = Math.max(0.08, Math.min(0.92, hit.t));
        openings.push({ wallIndex: hit.index, t, type: tool });
      }
    } else if (tool === "erase") {
      const hitFurn = null; // already checked above
      const hitOpening = openings.findIndex((o) => {
        const w = walls[o.wallIndex];
        if (!w) return false;
        const px = w.x1 + (w.x2 - w.x1) * o.t;
        const py = w.y1 + (w.y2 - w.y1) * o.t;
        return Math.hypot(pos.x - px, pos.y - py) < 20;
      });
      if (hitOpening !== -1) {
        openings.splice(hitOpening, 1);
      } else {
        const hitWall = nearestWall(pos.x, pos.y, 12);
        if (hitWall) {
          walls.splice(hitWall.index, 1);
          openings = openings
            .filter((o) => o.wallIndex !== hitWall.index)
            .map((o) => ({ ...o, wallIndex: o.wallIndex > hitWall.index ? o.wallIndex - 1 : o.wallIndex }));
        }
      }
    }
    render();
  }

  function onMove(evt) {
    const pos = getPos(evt);
    if (drawingWall) {
      let x2 = pos.x, y2 = pos.y;
      // axis snap
      if (Math.abs(x2 - drawingWall.x1) < 14) x2 = drawingWall.x1;
      if (Math.abs(y2 - drawingWall.y1) < 14) y2 = drawingWall.y1;
      const endSnap = snapToWallEndpoints(x2, y2, 16);
      drawingWall.x2 = endSnap.x;
      drawingWall.y2 = endSnap.y;
      render();
    } else if (draggingItem) {
      evt.preventDefault();
      const item = placed[draggingItem.index];
      item.x = Math.max(0, Math.min(W, pos.x - draggingItem.offX));
      item.y = Math.max(0, Math.min(H, pos.y - draggingItem.offY));
      render();
    }
  }

  function onUp() {
    if (drawingWall) {
      const len = Math.hypot(drawingWall.x2 - drawingWall.x1, drawingWall.y2 - drawingWall.y1);
      if (len > 12) {
        walls.push({ x1: drawingWall.x1, y1: drawingWall.y1, x2: drawingWall.x2, y2: drawingWall.y2 });
      }
      drawingWall = null;
      render();
    }
    draggingItem = null;
  }

  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
  canvas.addEventListener("touchstart", onDown, { passive: false });
  canvas.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onUp);

  /* ---------------- Export / WhatsApp ---------------- */
  document.getElementById("downloadDesign").addEventListener("click", () => {
    selectedIndex = null;
    render();
    const link = document.createElement("a");
    link.download = "تصميم-مساحتي.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  document.getElementById("sendWhatsapp").addEventListener("click", (e) => {
    e.preventDefault();
    selectedIndex = null;
    render();
    const link = document.createElement("a");
    link.download = "تصميم-مساحتي.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
    const msg = encodeURIComponent(
      "أهلاً، عملت تصميم أولي لـ" + (ROOM_LABELS[roomType] || "مساحتي") +
      " باستخدام أداة الموقع، وحابب أرسله وأطلب استشارة تصميم مجانية. (التصميم اتنزل الآن، هبعتهولك هنا)"
    );
    window.open("https://wa.me/201112630681?text=" + msg, "_blank");
  });

  /* ---------------- Init ---------------- */
  renderFurniturePalette();
  render();
})();
