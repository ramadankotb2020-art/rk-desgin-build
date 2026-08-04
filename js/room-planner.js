/* ============================================================
   RK DESIGN — مخطط الغرف 2D — Upgraded Professional Edition
   ============================================================ */
(function () {
  const canvas = document.getElementById("plannerCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  /* ── Colors ─────────────────────────────────────────────── */
  const C = {
    bg:          "#16130D",
    grid:        "rgba(255,255,255,.05)",
    gridMajor:   "rgba(255,255,255,.1)",
    wall:        "#C9C0AC",
    wallSel:     "#E4C88F",
    window:      "#8FC4D8",
    door:        "#C9A768",
    text:        "#F3EEE2",
    sub:         "#948A75",
    selFill:     "rgba(228,200,143,.08)",
    selStroke:   "#E4C88F",
    hoverFill:   "rgba(201,192,172,.06)",
    handleFill:  "#E4C88F",
    handleStroke:"#16130D",
    rotateFill:  "#8FC4D8",
    snapLine:    "rgba(143,196,216,.5)",
    multiSelBox: "rgba(228,200,143,.15)"
  };

  const GRID = 20;
  const SNAP_THRESHOLD = 10;
  const MAX_HISTORY = 100;

  /* ── Canvas size ─────────────────────────────────────────── */
  const W = canvas.width;
  const H = canvas.height;

  /* ── Furniture catalog ───────────────────────────────────── */
  const FURNITURE = {
    living: [
      { id:"l1", label:"كنبة",        w:200, h:80,  color:"#8a6d3b", shape:"sofa"      },
      { id:"l2", label:"طاولة وسط",   w:90,  h:50,  color:"#c9a768", shape:"table"     },
      { id:"l3", label:"وحدة تلفزيون",w:160, h:40,  color:"#5c5346", shape:"tvunit"    },
      { id:"l4", label:"كرسي",        w:60,  h:60,  color:"#a98a52", shape:"chair"     },
      { id:"l5", label:"بوفيه",       w:140, h:45,  color:"#7d6a40", shape:"wardrobe"  }
    ],
    bedroom: [
      { id:"r1", label:"سرير مزدوج", w:160, h:200, color:"#a9865a", shape:"bed"       },
      { id:"r2", label:"سرير فردي",  w:100, h:200, color:"#9a7850", shape:"bed"       },
      { id:"r3", label:"دولاب",      w:180, h:60,  color:"#8a6d3b", shape:"wardrobe"  },
      { id:"r4", label:"تسريحة",     w:110, h:45,  color:"#c9a768", shape:"dresser"   },
      { id:"r5", label:"كومودينو",   w:45,  h:45,  color:"#7d7368", shape:"nightstand"},
      { id:"r6", label:"مكتب",       w:110, h:55,  color:"#c9a768", shape:"desk"      }
    ],
    kitchen: [
      { id:"k1", label:"خزانة مطبخ", w:160, h:60, color:"#b98f4e", shape:"counter"   },
      { id:"k2", label:"ثلاجة",      w:70,  h:70, color:"#8fa7ad", shape:"fridge"    },
      { id:"k3", label:"جزيرة",      w:120, h:80, color:"#9c7a42", shape:"island"    },
      { id:"k4", label:"فرن",        w:60,  h:60, color:"#7d7368", shape:"oven"      },
      { id:"k5", label:"حوض مطبخ",   w:80,  h:50, color:"#7fa0a8", shape:"sink"      }
    ],
    bathroom: [
      { id:"b1", label:"حوض",   w:60,  h:45, color:"#8fa7ad", shape:"sink"   },
      { id:"b2", label:"مرحاض", w:45,  h:55, color:"#a9b8bc", shape:"toilet" },
      { id:"b3", label:"بانيو", w:160, h:70, color:"#7fa0a8", shape:"tub"    },
      { id:"b4", label:"دش",    w:90,  h:90, color:"#6e8f97", shape:"shower" }
    ],
    kids: [
      { id:"c1", label:"سرير أطفال", w:130, h:180, color:"#a9865a", shape:"bed"       },
      { id:"c2", label:"مكتب",       w:110, h:55,  color:"#c9a768", shape:"desk"      },
      { id:"c3", label:"مكتبة",      w:90,  h:35,  color:"#8a6d3b", shape:"bookshelf" },
      { id:"c4", label:"خزانة",      w:100, h:45,  color:"#7d7368", shape:"cabinet"   }
    ]
  };
  const ROOM_LABELS = { living:"غرفة معيشة", bedroom:"غرفة نوم", kitchen:"مطبخ", bathroom:"حمام", kids:"غرفة أطفال" };

  /* ── State ───────────────────────────────────────────────── */
  let roomType = "living";
  let tool     = "wall";
  let walls    = [];   // {x1,y1,x2,y2}
  let openings = [];   // {wallIndex, t, type}
  let placed   = [];   // {defId,label,color,shape,x,y,w,h,rot,flipH,flipV}

  let selectedIndices = [];   // multi-select
  let hoveredIndex    = -1;
  let drawingWall     = null;
  let dragging        = null; // {indices[], startPositions[], startX, startY}
  let resizing        = null; // {index, handle, startX,startY,startW,startH,startItemX,startItemY}
  let rotating        = null; // {index, cx,cy, startAngle, startRot}
  let selectionBox    = null; // {x,y,x2,y2}  rubber-band select
  let clipboard       = [];
  let placeCounter    = 0;
  let snapEnabled     = true;
  let snapGrid        = true;
  let snapWalls       = true;
  let snapCorners     = true;
  let snapCenters     = true;
  let snapGuides      = [];   // lines to flash

  /* ── History ─────────────────────────────────────────────── */
  let history = [];
  let historyIndex = -1;

  function cloneState() {
    return { walls: JSON.parse(JSON.stringify(walls)), openings: JSON.parse(JSON.stringify(openings)), placed: JSON.parse(JSON.stringify(placed)) };
  }
  function pushHistory() {
    history = history.slice(0, historyIndex + 1);
    history.push(cloneState());
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
  }
  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreState(history[historyIndex]);
  }
  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreState(history[historyIndex]);
  }
  function restoreState(s) {
    walls    = JSON.parse(JSON.stringify(s.walls));
    openings = JSON.parse(JSON.stringify(s.openings));
    placed   = JSON.parse(JSON.stringify(s.placed));
    selectedIndices = [];
    render();
    updatePropsPanel();
  }
  pushHistory(); // initial blank state

  /* ── Helpers ─────────────────────────────────────────────── */
  function snap(v) { return Math.round(v / GRID) * GRID; }
  function deg(r)  { return r * 180 / Math.PI; }
  function rad(d)  { return d * Math.PI / 180; }

  function getPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const src = evt.touches ? evt.touches[0] : evt;
    return { x: (src.clientX - rect.left) * sx, y: (src.clientY - rect.top) * sy };
  }

  function distToSeg(px, py, x1, y1, x2, y2) {
    const dx = x2-x1, dy = y2-y1, len2 = dx*dx+dy*dy;
    let t = len2 === 0 ? 0 : ((px-x1)*dx+(py-y1)*dy)/len2;
    t = Math.max(0, Math.min(1, t));
    return { dist: Math.hypot(px-(x1+dx*t), py-(y1+dy*t)), t };
  }
  function nearestWall(px, py, thr) {
    let best = null;
    walls.forEach((w,i)=>{
      const r = distToSeg(px,py,w.x1,w.y1,w.x2,w.y2);
      if (r.dist<=thr && (!best||r.dist<best.dist)) best={index:i,t:r.t,dist:r.dist};
    });
    return best;
  }
  function snapToWallEndpoints(x, y, thr) {
    let best={x:snap(x),y:snap(y)}, bd=Infinity;
    walls.forEach(w=>{
      [[w.x1,w.y1],[w.x2,w.y2]].forEach(([ex,ey])=>{
        const d=Math.hypot(x-ex,y-ey);
        if(d<thr&&d<bd){bd=d;best={x:ex,y:ey};}
      });
    });
    return best;
  }

  /* rotated bounding box helpers */
  function getTransformMatrix(item) {
    const cos = Math.cos(rad(item.rot)), sin = Math.sin(rad(item.rot));
    return { cos, sin, cx: item.x, cy: item.y };
  }
  function localToWorld(item, lx, ly) {
    const {cos,sin,cx,cy} = getTransformMatrix(item);
    const sx = item.flipH ? -1 : 1;
    const sy = item.flipV ? -1 : 1;
    return { x: cx + cos*(lx*sx) - sin*(ly*sy), y: cy + sin*(lx*sx) + cos*(ly*sy) };
  }
  function worldToLocal(item, wx, wy) {
    const {cos,sin,cx,cy} = getTransformMatrix(item);
    const dx=wx-cx, dy=wy-cy;
    const sx = item.flipH ? -1 : 1;
    const sy = item.flipV ? -1 : 1;
    return { x: (cos*dx+sin*dy)*sx, y: (-sin*dx+cos*dy)*sy };
  }
  function pointInItem(px, py, item) {
    const l = worldToLocal(item, px, py);
    return Math.abs(l.x) <= item.w/2 && Math.abs(l.y) <= item.h/2;
  }

  /* bounding box (axis-aligned) for rotated item */
  function getAABB(item) {
    const corners = [
      localToWorld(item,-item.w/2,-item.h/2),
      localToWorld(item, item.w/2,-item.h/2),
      localToWorld(item, item.w/2, item.h/2),
      localToWorld(item,-item.w/2, item.h/2)
    ];
    const xs = corners.map(c=>c.x), ys = corners.map(c=>c.y);
    return { x:Math.min(...xs), y:Math.min(...ys), x2:Math.max(...xs), y2:Math.max(...ys),
             w:Math.max(...xs)-Math.min(...xs), h:Math.max(...ys)-Math.min(...ys) };
  }

  /* ── Snap system ─────────────────────────────────────────── */
  function snapPosition(item, nx, ny) {
    if (!snapEnabled) return { x: nx, y: ny };
    let sx = nx, sy = ny;
    snapGuides = [];

    if (snapGrid) {
      sx = snap(nx); sy = snap(ny);
    }

    const hw = item.w/2, hh = item.h/2;

    if (snapWalls) {
      walls.forEach(w => {
        const pts = [[w.x1,w.y1],[w.x2,w.y2]];
        pts.forEach(([ex,ey]) => {
          if (Math.abs(nx-ex) < SNAP_THRESHOLD) { sx=ex; snapGuides.push({x1:ex,y1:0,x2:ex,y2:H}); }
          if (Math.abs(ny-ey) < SNAP_THRESHOLD) { sy=ey; snapGuides.push({x1:0,y1:ey,x2:W,y2:ey}); }
        });
      });
    }

    if (snapCenters) {
      placed.forEach((other, oi) => {
        if (selectedIndices.includes(oi)) return;
        if (Math.abs(nx - other.x) < SNAP_THRESHOLD) { sx=other.x; snapGuides.push({x1:other.x,y1:0,x2:other.x,y2:H}); }
        if (Math.abs(ny - other.y) < SNAP_THRESHOLD) { sy=other.y; snapGuides.push({x1:0,y1:other.y,x2:W,y2:other.y}); }
      });
    }

    if (snapCorners) {
      placed.forEach((other, oi) => {
        if (selectedIndices.includes(oi)) return;
        const aabb = getAABB(other);
        const edges = [aabb.x, aabb.x2, aabb.x+aabb.w/2];
        const vedges = [aabb.y, aabb.y2, aabb.y+aabb.h/2];
        edges.forEach(ex => {
          if (Math.abs(nx-hw - ex) < SNAP_THRESHOLD) { sx=ex+hw; snapGuides.push({x1:ex,y1:0,x2:ex,y2:H}); }
          if (Math.abs(nx+hw - ex) < SNAP_THRESHOLD) { sx=ex-hw; snapGuides.push({x1:ex,y1:0,x2:ex,y2:H}); }
        });
        vedges.forEach(ey => {
          if (Math.abs(ny-hh - ey) < SNAP_THRESHOLD) { sy=ey+hh; snapGuides.push({x1:0,y1:ey,x2:W,y2:ey}); }
          if (Math.abs(ny+hh - ey) < SNAP_THRESHOLD) { sy=ey-hh; snapGuides.push({x1:0,y1:ey,x2:W,y2:ey}); }
        });
      });
    }

    return { x: sx, y: sy };
  }

  /* ── Properties panel ────────────────────────────────────── */
  const propsPanel  = document.getElementById("propsPanel");
  const propX       = document.getElementById("propX");
  const propY       = document.getElementById("propY");
  const propW       = document.getElementById("propW");
  const propH       = document.getElementById("propH");
  const propRot     = document.getElementById("propRot");
  const propMirrorH = document.getElementById("propMirrorH");
  const propMirrorV = document.getElementById("propMirrorV");
  const propDelete  = document.getElementById("propDelete");
  const propDup     = document.getElementById("propDup");

  function updatePropsPanel() {
    if (!propsPanel) return;
    if (selectedIndices.length === 1) {
      const item = placed[selectedIndices[0]];
      propsPanel.style.display = "flex";
      propX.value   = Math.round(item.x);
      propY.value   = Math.round(item.y);
      propW.value   = Math.round(item.w);
      propH.value   = Math.round(item.h);
      propRot.value = Math.round(item.rot);
    } else if (selectedIndices.length > 1) {
      propsPanel.style.display = "flex";
      propX.value = propY.value = propW.value = propH.value = propRot.value = "—";
    } else {
      propsPanel.style.display = "none";
    }
  }

  function bindPropsInput(el, apply) {
    if (!el) return;
    el.addEventListener("change", () => {
      const v = parseFloat(el.value);
      if (isNaN(v)) return;
      pushHistory();
      selectedIndices.forEach(i => apply(placed[i], v));
      render();
      updatePropsPanel();
    });
  }
  bindPropsInput(propX,   (item,v) => item.x   = v);
  bindPropsInput(propY,   (item,v) => item.y   = v);
  bindPropsInput(propW,   (item,v) => item.w   = Math.max(20, v));
  bindPropsInput(propH,   (item,v) => item.h   = Math.max(20, v));
  bindPropsInput(propRot, (item,v) => item.rot  = ((v % 360) + 360) % 360);

  if (propMirrorH) propMirrorH.addEventListener("click", () => {
    if (!selectedIndices.length) return;
    pushHistory();
    selectedIndices.forEach(i => { placed[i].flipH = !placed[i].flipH; });
    render();
  });
  if (propMirrorV) propMirrorV.addEventListener("click", () => {
    if (!selectedIndices.length) return;
    pushHistory();
    selectedIndices.forEach(i => { placed[i].flipV = !placed[i].flipV; });
    render();
  });
  if (propDelete) propDelete.addEventListener("click", () => deleteSelected());
  if (propDup)    propDup.addEventListener("click",    () => duplicateSelected());

  /* ── Snap toggles in sidebar ────────────────────────────── */
  function bindSnapToggle(id, set) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => { set(el.checked); render(); });
  }
  bindSnapToggle("snapEnabled", v => snapEnabled = v);
  bindSnapToggle("snapGrid",    v => snapGrid    = v);
  bindSnapToggle("snapWalls",   v => snapWalls   = v);
  bindSnapToggle("snapCorners", v => snapCorners = v);
  bindSnapToggle("snapCenters", v => snapCenters = v);

  /* ── Actions ─────────────────────────────────────────────── */
  function deleteSelected() {
    if (!selectedIndices.length) return;
    pushHistory();
    placed = placed.filter((_,i) => !selectedIndices.includes(i));
    selectedIndices = [];
    render();
    updatePropsPanel();
  }
  function copySelected() {
    clipboard = selectedIndices.map(i => JSON.parse(JSON.stringify(placed[i])));
  }
  function pasteClipboard() {
    if (!clipboard.length) return;
    pushHistory();
    const newItems = clipboard.map(item => ({ ...JSON.parse(JSON.stringify(item)), x: item.x+20, y: item.y+20 }));
    const start = placed.length;
    placed.push(...newItems);
    selectedIndices = newItems.map((_,i) => start+i);
    clipboard = newItems.map(item => JSON.parse(JSON.stringify(item)));
    render();
    updatePropsPanel();
  }
  function duplicateSelected() {
    if (!selectedIndices.length) return;
    pushHistory();
    const newItems = selectedIndices.map(i => ({ ...JSON.parse(JSON.stringify(placed[i])), x: placed[i].x+20, y: placed[i].y+20 }));
    const start = placed.length;
    placed.push(...newItems);
    selectedIndices = newItems.map((_,i) => start+i);
    render();
    updatePropsPanel();
  }
  function moveSelected(dx, dy) {
    if (!selectedIndices.length) return;
    pushHistory();
    selectedIndices.forEach(i => { placed[i].x += dx; placed[i].y += dy; });
    render();
    updatePropsPanel();
  }

  /* ── Keyboard shortcuts ──────────────────────────────────── */
  document.addEventListener("keydown", e => {
    const tag = document.activeElement?.tagName;
    const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
    if (inInput && e.key !== "Escape") return;

    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key==="z" && !e.shiftKey) { e.preventDefault(); undo(); }
    if (ctrl && (e.key==="Z" || (e.key==="z"&&e.shiftKey))) { e.preventDefault(); redo(); }
    if (ctrl && e.key==="c") { e.preventDefault(); copySelected(); }
    if (ctrl && e.key==="v") { e.preventDefault(); pasteClipboard(); }
    if (ctrl && e.key==="d") { e.preventDefault(); duplicateSelected(); }
    if ((e.key==="Delete"||e.key==="Backspace") && !inInput) { e.preventDefault(); deleteSelected(); }
    if (e.key==="Escape") { selectedIndices=[]; render(); updatePropsPanel(); }

    const step = e.shiftKey ? 10 : 1;
    if (e.key==="ArrowLeft")  { e.preventDefault(); moveSelected(-step, 0); }
    if (e.key==="ArrowRight") { e.preventDefault(); moveSelected( step, 0); }
    if (e.key==="ArrowUp")    { e.preventDefault(); moveSelected(0, -step); }
    if (e.key==="ArrowDown")  { e.preventDefault(); moveSelected(0,  step); }
  });

  /* ── Handle positions for selected item ─────────────────── */
  const HANDLES = ["nw","n","ne","e","se","s","sw","w"];
  function getHandlePos(item, handle) {
    const w2=item.w/2, h2=item.h/2;
    const map = { nw:[-w2,-h2], n:[0,-h2], ne:[w2,-h2], e:[w2,0], se:[w2,h2], s:[0,h2], sw:[-w2,h2], w:[-w2,0] };
    const [lx,ly] = map[handle];
    return localToWorld(item, lx, ly);
  }
  function getRotateHandlePos(item) {
    return localToWorld(item, 0, -item.h/2 - 24);
  }
  function hitTestHandle(px, py, item) {
    for (const h of HANDLES) {
      const p = getHandlePos(item, h);
      if (Math.hypot(px-p.x, py-p.y) <= 7) return h;
    }
    const rp = getRotateHandlePos(item);
    if (Math.hypot(px-rp.x, py-rp.y) <= 9) return "rotate";
    return null;
  }

  /* ── Drawing helpers ─────────────────────────────────────── */
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
    c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
  }
  function shade(hex, pct) {
    const n=parseInt(hex.slice(1),16);
    let r=(n>>16)&255,g=(n>>8)&255,b=n&255;
    r=Math.max(0,Math.min(255,Math.round(r+pct/100*255)));
    g=Math.max(0,Math.min(255,Math.round(g+pct/100*255)));
    b=Math.max(0,Math.min(255,Math.round(b+pct/100*255)));
    return "rgb("+r+","+g+","+b+")";
  }
  function baseRect(w,h,color,selected){
    ctx.fillStyle=color; ctx.strokeStyle=selected?C.selStroke:"rgba(0,0,0,.35)"; ctx.lineWidth=selected?2:1;
    roundRect(ctx,-w/2,-h/2,w,h,5); ctx.fill(); ctx.stroke();
  }

  /* ── Shape drawers (same as original, unchanged) ──────────── */
  const SHAPES = {
    sofa(w,h,color){
      baseRect(w,h,color);
      const bh=h*.3,aw=Math.min(w*.14,22);
      ctx.fillStyle=shade(color,-16);
      roundRect(ctx,-w/2,-h/2,w,bh,4);ctx.fill();
      roundRect(ctx,-w/2,-h/2,aw,h,4);ctx.fill();
      roundRect(ctx,w/2-aw,-h/2,aw,h,4);ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,.22)";ctx.lineWidth=1;
      const seats=Math.max(2,Math.round((w-2*aw)/70));
      for(let i=1;i<seats;i++){const x=-w/2+aw+((w-2*aw)*i)/seats;ctx.beginPath();ctx.moveTo(x,-h/2+bh);ctx.lineTo(x,h/2-4);ctx.stroke();}
    },
    chair(w,h,color){
      const sw=w*.72,sh=h*.72;
      ctx.fillStyle=shade(color,-18);
      roundRect(ctx,-w/2,-h/2,w,h*.22,3);ctx.fill();
      ctx.fillStyle=color;ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1;
      roundRect(ctx,-sw/2,-sh/2+h*.06,sw,sh,6);ctx.fill();ctx.stroke();
    },
    table(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.18)";ctx.lineWidth=1;
      roundRect(ctx,-w/2+6,-h/2+6,w-12,h-12,4);ctx.stroke();
    },
    tvunit(w,h,color){
      baseRect(w,h,color);ctx.fillStyle=shade(color,-22);
      const sw=w*.6,sh=h*.35;ctx.fillRect(-sw/2,-sh/2,sw,sh);
    },
    bed(w,h,color){
      baseRect(w,h,color);ctx.fillStyle=shade(color,22);
      const pw=w*.4,ph=h*.14,g=w*.06;
      roundRect(ctx,-pw-g/2,-h/2+8,pw,ph,5);ctx.fill();
      roundRect(ctx,g/2,-h/2+8,pw,ph,5);ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,.2)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(-w/2+6,h/2-h*.22);ctx.lineTo(w/2-6,h/2-h*.22);ctx.stroke();
    },
    wardrobe(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.3)";ctx.lineWidth=1.5;
      const d=w>130?3:2;
      for(let i=1;i<d;i++){const x=-w/2+(w*i)/d;ctx.beginPath();ctx.moveTo(x,-h/2+4);ctx.lineTo(x,h/2-4);ctx.stroke();}
      ctx.fillStyle="rgba(0,0,0,.35)";
      for(let i=0;i<d;i++){const cx=-w/2+(w*(i+1))/d-w/d/2;ctx.beginPath();ctx.arc(cx+w/d*.32,0,1.6,0,Math.PI*2);ctx.fill();}
    },
    dresser(w,h,color){
      ctx.save();ctx.fillStyle="rgba(180,200,210,.35)";ctx.strokeStyle="rgba(180,200,210,.7)";ctx.lineWidth=1;
      ctx.beginPath();ctx.ellipse(0,-h/2-8,w*.28,8,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.25)";ctx.lineWidth=1;
      for(let i=1;i<3;i++){const x=-w/2+(w*i)/3;ctx.beginPath();ctx.moveTo(x,-h/2+4);ctx.lineTo(x,h/2-4);ctx.stroke();}
    },
    nightstand(w,h,color){
      baseRect(w,h,color);ctx.fillStyle="rgba(230,210,150,.5)";
      ctx.beginPath();ctx.arc(w*.22,-h*.22,Math.min(w,h)*.16,0,Math.PI*2);ctx.fill();
    },
    counter(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.3)";ctx.lineWidth=1;
      for(let x=-w/2+10;x<w/2;x+=10){ctx.beginPath();ctx.moveTo(x,-h/2+4);ctx.lineTo(x,-h/2+4+h*.18);ctx.stroke();}
    },
    fridge(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.3)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(0,-h/2+4);ctx.lineTo(0,h/2-4);ctx.stroke();
      ctx.beginPath();ctx.arc(-6,0,2,0,Math.PI*2);ctx.fill();
    },
    island(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.15)";ctx.lineWidth=1;
      for(let x=-w/2+8;x<w/2;x+=14)for(let y=-h/2+8;y<h/2;y+=14){ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);ctx.stroke();}
    },
    oven(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(0,2,Math.min(w,h)*.28,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(-w*.28,-h/2+5,w*.56,3);
    },
    sink(w,h,color){
      ctx.fillStyle=color;ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.ellipse(0,h*.05,w/2,h*.42,0,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle="rgba(0,0,0,.3)";ctx.fillRect(-4,-h/2,8,h*.18);
    },
    toilet(w,h,color){
      ctx.fillStyle=color;ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1.5;
      roundRect(ctx,-w/2,-h/2,w,h*.32,3);ctx.fill();ctx.stroke();
      ctx.beginPath();ctx.ellipse(0,h*.14,w*.4,h*.34,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    },
    tub(w,h,color){
      ctx.fillStyle=color;ctx.strokeStyle="rgba(0,0,0,.35)";ctx.lineWidth=1.5;
      roundRect(ctx,-w/2,-h/2,w,h,Math.min(w,h)/2.2);ctx.fill();ctx.stroke();
      ctx.strokeStyle="rgba(0,0,0,.2)";
      roundRect(ctx,-w/2+8,-h/2+8,w-16,h-16,Math.min(w,h)/2.6);ctx.stroke();
    },
    shower(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.25)";ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(-w/2,-h/2);ctx.lineTo(w/2,h/2);ctx.stroke();
      ctx.beginPath();ctx.arc(0,0,Math.min(w,h)*.12,0,Math.PI*2);ctx.stroke();
    },
    desk(w,h,color){
      baseRect(w,h,color);ctx.fillStyle=shade(color,-20);
      const mw=w*.32,mh=h*.4;ctx.fillRect(-mw/2,-h/2+5,mw,mh);
    },
    bookshelf(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.3)";ctx.lineWidth=1;
      const s=Math.max(3,Math.round(w/30));
      for(let i=1;i<s;i++){const x=-w/2+(w*i)/s;ctx.beginPath();ctx.moveTo(x,-h/2+3);ctx.lineTo(x,h/2-3);ctx.stroke();}
    },
    cabinet(w,h,color){
      baseRect(w,h,color);ctx.strokeStyle="rgba(0,0,0,.3)";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(0,-h/2+3);ctx.lineTo(0,h/2-3);ctx.stroke();
      ctx.fillStyle="rgba(0,0,0,.35)";
      ctx.beginPath();ctx.arc(-6,0,1.6,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.arc(6,0,1.6,0,Math.PI*2);ctx.fill();
    }
  };

  /* ── Render ───────────────────────────────────────────────── */
  let rafPending = false;
  function render() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(_render);
  }
  function _render() {
    rafPending = false;
    drawGrid();
    drawSnapGuides();
    drawWalls();
    drawOpenings();
    drawFurniture();
    drawSelectionBox();
    if (walls.length===0 && !drawingWall) drawHint();
  }

  function drawGrid() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0,0,W,H);
    for (let x=0;x<=W;x+=GRID) {
      ctx.strokeStyle = (x % (GRID*5)===0) ? C.gridMajor : C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
    }
    for (let y=0;y<=H;y+=GRID) {
      ctx.strokeStyle = (y % (GRID*5)===0) ? C.gridMajor : C.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();
    }
  }

  function drawSnapGuides() {
    if (!snapGuides.length) return;
    ctx.save();
    ctx.strokeStyle = C.snapLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([4,4]);
    snapGuides.forEach(g => {
      ctx.beginPath();ctx.moveTo(g.x1,g.y1);ctx.lineTo(g.x2,g.y2);ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  function wallLengthCm(w) { return Math.round(Math.hypot(w.x2-w.x1,w.y2-w.y1)); }
  function drawWallLabel(w, dashed) {
    const len = wallLengthCm(w);
    if (len<20) return;
    const mx=(w.x1+w.x2)/2, my=(w.y1+w.y2)/2;
    const horiz = Math.abs(w.x2-w.x1) >= Math.abs(w.y2-w.y1);
    const lx = horiz?mx:mx+18, ly = horiz?my-12:my;
    ctx.save();
    ctx.font="600 11px Cairo,sans-serif";
    const text=len+" سم", tw=ctx.measureText(text).width+10;
    ctx.fillStyle="rgba(15,12,8,.72)";
    roundRect(ctx,lx-tw/2,ly-9,tw,18,4);ctx.fill();
    ctx.fillStyle=dashed?C.wallSel:"#D8CFB8";
    ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText(text,lx,ly+1);
    ctx.restore();
  }
  function drawWalls() {
    ctx.lineCap="square";
    walls.forEach(w=>{
      ctx.strokeStyle=C.wall;ctx.lineWidth=10;
      ctx.beginPath();ctx.moveTo(w.x1,w.y1);ctx.lineTo(w.x2,w.y2);ctx.stroke();
    });
    walls.forEach(w=>drawWallLabel(w,false));
    if (drawingWall) {
      ctx.strokeStyle=C.wallSel;ctx.lineWidth=10;ctx.setLineDash([6,6]);
      ctx.beginPath();ctx.moveTo(drawingWall.x1,drawingWall.y1);ctx.lineTo(drawingWall.x2,drawingWall.y2);ctx.stroke();
      ctx.setLineDash([]);
      drawWallLabel(drawingWall,true);
    }
  }
  function drawOpenings() {
    openings.forEach(o=>{
      const w=walls[o.wallIndex]; if(!w) return;
      const angle=Math.atan2(w.y2-w.y1,w.x2-w.x1);
      const px=w.x1+(w.x2-w.x1)*o.t, py=w.y1+(w.y2-w.y1)*o.t;
      const len=40;
      const x1=px-Math.cos(angle)*len/2,y1=py-Math.sin(angle)*len/2;
      const x2=px+Math.cos(angle)*len/2,y2=py+Math.sin(angle)*len/2;
      ctx.save();ctx.strokeStyle=C.bg;ctx.lineWidth=12;
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
      if(o.type==="window"){
        ctx.save();ctx.strokeStyle=C.window;ctx.lineWidth=6;
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();
      } else {
        const perp=angle-Math.PI/2;
        const px2=x1+Math.cos(perp)*len, py2=y1+Math.sin(perp)*len;
        ctx.save();ctx.strokeStyle=C.door;ctx.lineWidth=2;
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(px2,py2);ctx.stroke();
        ctx.beginPath();ctx.arc(x1,y1,len,perp,angle,false);ctx.stroke();ctx.restore();
      }
    });
  }

  function drawFurniturePiece(item, selected, hovered) {
    const drawer = SHAPES[item.shape];

    // Hover highlight
    if (hovered && !selected) {
      ctx.save();
      ctx.fillStyle = C.hoverFill;
      ctx.strokeStyle = "rgba(201,192,172,.3)";
      ctx.lineWidth = 1;
      roundRect(ctx,-item.w/2-4,-item.h/2-4,item.w+8,item.h+8,7);
      ctx.fill();ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    if (item.flipH) ctx.scale(-1,1);
    if (item.flipV) ctx.scale(1,-1);
    if (drawer) drawer(item.w,item.h,item.color,selected);
    else baseRect(item.w,item.h,item.color,selected);
    ctx.restore();

    // Label
    if (item.w>=55 || item.h>=55) {
      const label=item.label, dims=Math.round(item.w)+"×"+Math.round(item.h)+" سم";
      ctx.font="700 11px Cairo,sans-serif";
      const w1=ctx.measureText(label).width;
      ctx.font="500 9.5px Cairo,sans-serif";
      const w2=ctx.measureText(dims).width;
      const bw=Math.max(w1,w2)+14;
      ctx.fillStyle="rgba(15,12,8,.58)";
      roundRect(ctx,-bw/2,-15,bw,30,5);ctx.fill();
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#F3EEE2";ctx.font="700 11px Cairo,sans-serif";ctx.fillText(label,0,-6);
      ctx.fillStyle="#C9C0AC";ctx.font="500 9.5px Cairo,sans-serif";ctx.fillText(dims,0,7);
    }

    if (selected) {
      // dashed bounding outline
      ctx.strokeStyle=C.selStroke;ctx.lineWidth=1.5;ctx.setLineDash([4,3]);
      roundRect(ctx,-item.w/2-4,-item.h/2-4,item.w+8,item.h+8,7);ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function drawResizeHandles(item) {
    HANDLES.forEach(h=>{
      const p = getHandlePos(item,h);
      ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);
      ctx.fillStyle=C.handleFill;ctx.strokeStyle=C.handleStroke;ctx.lineWidth=1.5;
      ctx.fill();ctx.stroke();
    });
    // rotate handle
    const rp = getRotateHandlePos(item);
    const lc = localToWorld(item,0,-item.h/2);
    ctx.save();
    ctx.strokeStyle=C.rotateFill;ctx.lineWidth=1.5;ctx.setLineDash([2,2]);
    ctx.beginPath();ctx.moveTo(lc.x,lc.y);ctx.lineTo(rp.x,rp.y);ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(rp.x,rp.y,7,0,Math.PI*2);
    ctx.fillStyle=C.rotateFill;ctx.strokeStyle=C.handleStroke;ctx.lineWidth=1.5;
    ctx.fill();ctx.stroke();
    // rotate icon
    ctx.fillStyle="#16130D";ctx.font="bold 9px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
    ctx.fillText("↻",rp.x,rp.y+1);
    ctx.restore();
  }

  function drawFurniture() {
    placed.forEach((item,i) => {
      const selected = selectedIndices.includes(i);
      const hovered  = i === hoveredIndex && !selected;
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(rad(item.rot));
      drawFurniturePiece(item, selected, hovered);
      ctx.restore();
      if (selected && selectedIndices.length===1) drawResizeHandles(item);
    });

    // Multi-select bounding box
    if (selectedIndices.length > 1) {
      const boxes = selectedIndices.map(i => getAABB(placed[i]));
      const x  = Math.min(...boxes.map(b=>b.x));
      const y  = Math.min(...boxes.map(b=>b.y));
      const x2 = Math.max(...boxes.map(b=>b.x2));
      const y2 = Math.max(...boxes.map(b=>b.y2));
      ctx.save();
      ctx.fillStyle=C.multiSelBox;ctx.strokeStyle=C.selStroke;ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
      ctx.beginPath();ctx.rect(x-4,y-4,x2-x+8,y2-y+8);ctx.fill();ctx.stroke();
      ctx.setLineDash([]);ctx.restore();
    }
  }

  function drawSelectionBox() {
    if (!selectionBox) return;
    const {x,y,x2,y2}=selectionBox;
    ctx.save();
    ctx.fillStyle="rgba(228,200,143,.08)";ctx.strokeStyle=C.selStroke;ctx.lineWidth=1;ctx.setLineDash([4,3]);
    ctx.beginPath();ctx.rect(Math.min(x,x2),Math.min(y,y2),Math.abs(x2-x),Math.abs(y2-y));
    ctx.fill();ctx.stroke();ctx.setLineDash([]);ctx.restore();
  }

  function drawHint() {
    ctx.save();ctx.fillStyle=C.sub;ctx.font="500 14px Cairo,sans-serif";ctx.textAlign="center";
    ctx.fillText("اسحب على اللوحة عشان ترسم أول حائط",W/2,H/2);ctx.restore();
  }

  /* ── Canvas interaction ───────────────────────────────────── */
  function onDown(evt) {
    evt.preventDefault();
    const pos = getPos(evt);
    const shift = evt.shiftKey;

    // structural tools bypass furniture selection
    if (tool === "wall") {
      pushHistory();
      const start = snapToWallEndpoints(pos.x,pos.y,16);
      drawingWall = {x1:start.x,y1:start.y,x2:start.x,y2:start.y};
      selectedIndices=[];
      render(); updatePropsPanel();
      return;
    }
    if (tool==="door"||tool==="window") {
      const hit=nearestWall(pos.x,pos.y,14);
      if(hit){ pushHistory(); openings.push({wallIndex:hit.index,t:Math.max(.08,Math.min(.92,hit.t)),type:tool}); }
      render(); return;
    }
    if (tool==="erase") {
      const hitOp=openings.findIndex(o=>{ const w=walls[o.wallIndex]; if(!w)return false; return Math.hypot(pos.x-w.x1-(w.x2-w.x1)*o.t,pos.y-w.y1-(w.y2-w.y1)*o.t)<20; });
      if(hitOp!==-1){ pushHistory(); openings.splice(hitOp,1); render(); return; }
      const hitW=nearestWall(pos.x,pos.y,12);
      if(hitW){ pushHistory(); walls.splice(hitW.index,1); openings=openings.filter(o=>o.wallIndex!==hitW.index).map(o=>({...o,wallIndex:o.wallIndex>hitW.index?o.wallIndex-1:o.wallIndex})); }
      // also hit furniture with erase tool
      for(let i=placed.length-1;i>=0;i--){ if(pointInItem(pos.x,pos.y,placed[i])){ pushHistory(); placed.splice(i,1); selectedIndices=[]; break; } }
      render(); return;
    }

    // select tool — test resize/rotate handles first if single selected
    if (selectedIndices.length===1) {
      const item=placed[selectedIndices[0]];
      const h=hitTestHandle(pos.x,pos.y,item);
      if (h==="rotate") {
        rotating = { index:selectedIndices[0], cx:item.x, cy:item.y, startAngle:Math.atan2(pos.y-item.y,pos.x-item.x), startRot:item.rot };
        return;
      }
      if (h) {
        resizing = { index:selectedIndices[0], handle:h, startX:pos.x, startY:pos.y, startW:item.w, startH:item.h, startItemX:item.x, startItemY:item.y, startRot:item.rot };
        pushHistory();
        return;
      }
    }

    // hit test furniture
    let hitIdx = -1;
    for (let i=placed.length-1;i>=0;i--) {
      if (pointInItem(pos.x,pos.y,placed[i])) { hitIdx=i; break; }
    }

    if (hitIdx !== -1) {
      if (shift) {
        const idx = selectedIndices.indexOf(hitIdx);
        if (idx===-1) selectedIndices.push(hitIdx);
        else selectedIndices.splice(idx,1);
      } else {
        if (!selectedIndices.includes(hitIdx)) selectedIndices = [hitIdx];
      }
      dragging = {
        indices: [...selectedIndices],
        startPositions: selectedIndices.map(i => ({x:placed[i].x,y:placed[i].y})),
        startX: pos.x, startY: pos.y,
        moved: false
      };
      render(); updatePropsPanel();
    } else {
      // rubber-band start
      if (!shift) selectedIndices=[];
      selectionBox = { x:pos.x, y:pos.y, x2:pos.x, y2:pos.y };
      render(); updatePropsPanel();
    }
  }

  function onMove(evt) {
    if (evt.touches) evt.preventDefault();
    const pos = getPos(evt);

    if (drawingWall) {
      let x2=pos.x,y2=pos.y;
      if(Math.abs(x2-drawingWall.x1)<14) x2=drawingWall.x1;
      if(Math.abs(y2-drawingWall.y1)<14) y2=drawingWall.y1;
      const e=snapToWallEndpoints(x2,y2,16);
      drawingWall.x2=e.x; drawingWall.y2=e.y;
      render(); return;
    }

    if (rotating) {
      const angle = Math.atan2(pos.y-rotating.cy, pos.x-rotating.cx);
      let rot = rotating.startRot + deg(angle - rotating.startAngle);
      if (!evt.shiftKey) rot = Math.round(rot/15)*15; // 15° steps without shift
      rot = ((rot%360)+360)%360;
      placed[rotating.index].rot = rot;
      render(); updatePropsPanel(); return;
    }

    if (resizing) {
      const item = placed[resizing.index];
      const dx=pos.x-resizing.startX, dy=pos.y-resizing.startY;
      // Project delta onto item's local axes
      const cosR=Math.cos(rad(item.rot)), sinR=Math.sin(rad(item.rot));
      const ldx= dx*cosR+dy*sinR;
      const ldy=-dx*sinR+dy*cosR;
      const h=resizing.handle;
      let nw=resizing.startW, nh=resizing.startH;
      let ox=0, oy=0;
      if(h.includes("e")){ nw=Math.max(20,resizing.startW+ldx); ox=(nw-resizing.startW)/2; }
      if(h.includes("w")){ nw=Math.max(20,resizing.startW-ldx); ox=-(nw-resizing.startW)/2; }
      if(h.includes("s")){ nh=Math.max(20,resizing.startH+ldy); oy=(nh-resizing.startH)/2; }
      if(h.includes("n")){ nh=Math.max(20,resizing.startH-ldy); oy=-(nh-resizing.startH)/2; }
      item.w=nw; item.h=nh;
      item.x = resizing.startItemX + ox*cosR - oy*sinR;
      item.y = resizing.startItemY + ox*sinR + oy*cosR;
      render(); updatePropsPanel(); return;
    }

    if (dragging) {
      const dx=pos.x-dragging.startX, dy=pos.y-dragging.startY;
      if (Math.abs(dx)>2||Math.abs(dy)>2) {
        if (!dragging.moved) { pushHistory(); dragging.moved=true; }
        dragging.indices.forEach((idx,k) => {
          const sp = dragging.startPositions[k];
          const np = snapPosition(placed[idx], sp.x+dx, sp.y+dy);
          placed[idx].x = np.x; placed[idx].y = np.y;
        });
        render(); updatePropsPanel();
      }
      return;
    }

    if (selectionBox) {
      selectionBox.x2=pos.x; selectionBox.y2=pos.y;
      render(); return;
    }

    // hover
    let hi=-1;
    for(let i=placed.length-1;i>=0;i--){ if(pointInItem(pos.x,pos.y,placed[i])){ hi=i; break; } }
    if(hi!==hoveredIndex){ hoveredIndex=hi; render(); }

    // cursor
    if (selectedIndices.length===1) {
      const item=placed[selectedIndices[0]];
      const h=hitTestHandle(pos.x,pos.y,item);
      canvas.style.cursor = h==="rotate" ? "grab" : h ? "nwse-resize" : (hi!==-1?"move":"default");
    } else {
      canvas.style.cursor = hi!==-1 ? "move" : "default";
    }
  }

  function onUp(evt) {
    snapGuides=[];
    if (drawingWall) {
      const len=Math.hypot(drawingWall.x2-drawingWall.x1,drawingWall.y2-drawingWall.y1);
      if(len>12){ walls.push({x1:drawingWall.x1,y1:drawingWall.y1,x2:drawingWall.x2,y2:drawingWall.y2}); pushHistory(); }
      drawingWall=null; render(); return;
    }
    if (rotating)  { rotating=null;  pushHistory(); render(); updatePropsPanel(); return; }
    if (resizing)  { resizing=null;   render(); updatePropsPanel(); return; }
    if (dragging)  { dragging=null;   render(); updatePropsPanel(); return; }

    // rubber-band selection
    if (selectionBox) {
      const {x,y,x2,y2}=selectionBox;
      const rx=Math.min(x,x2), ry=Math.min(y,y2), rw=Math.abs(x2-x), rh=Math.abs(y2-y);
      if (rw>4||rh>4) {
        placed.forEach((item,i)=>{
          const b=getAABB(item);
          if(b.x>=rx&&b.y>=ry&&b.x2<=rx+rw&&b.y2<=ry+rh){
            if(!selectedIndices.includes(i)) selectedIndices.push(i);
          }
        });
      }
      selectionBox=null;
      render(); updatePropsPanel();
    }
  }

  canvas.addEventListener("mousedown", onDown);
  canvas.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup",   onUp);
  canvas.addEventListener("touchstart", onDown, {passive:false});
  canvas.addEventListener("touchmove",  onMove, {passive:false});
  window.addEventListener("touchend",   onUp);

  /* ── Furniture palette ───────────────────────────────────── */
  const furnitureGrid     = document.getElementById("furnitureGrid");
  const furnitureRoomLabel = document.getElementById("furnitureRoomLabel");

  function renderFurniturePalette() {
    furnitureGrid.innerHTML="";
    (FURNITURE[roomType]||[]).forEach(def=>{
      const btn=document.createElement("button");
      btn.type="button"; btn.textContent=def.label;
      btn.title=`${def.label} — ${def.w}×${def.h} سم`;
      btn.addEventListener("click",()=>addFurniture(def));
      furnitureGrid.appendChild(btn);
    });
    if(furnitureRoomLabel) furnitureRoomLabel.textContent=ROOM_LABELS[roomType];
  }

  function addFurniture(def) {
    placeCounter++;
    const offset=(placeCounter%5)*18;
    pushHistory();
    placed.push({ defId:def.id, label:def.label, color:def.color, shape:def.shape,
      w:def.w, h:def.h, rot:0, flipH:false, flipV:false,
      x:W/2+offset, y:H/2+offset });
    selectedIndices=[placed.length-1];
    render(); updatePropsPanel();
  }

  /* ── Room type chips ─────────────────────────────────────── */
  const roomChips=document.getElementById("roomTypeChips");
  roomChips.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      roomChips.querySelectorAll("button").forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");
      roomType=btn.dataset.room;
      renderFurniturePalette();
    });
  });
  roomChips.querySelector('[data-room="living"]').classList.add("is-active");

  /* ── Tool buttons ────────────────────────────────────────── */
  const toolButtons=document.getElementById("toolButtons");
  toolButtons.querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click",()=>{
      toolButtons.querySelectorAll("button").forEach(b=>b.classList.remove("is-active"));
      btn.classList.add("is-active");
      tool=btn.dataset.tool;
      selectedIndices=[]; hoveredIndex=-1;
      render(); updatePropsPanel();
    });
  });

  /* ── Clear all ───────────────────────────────────────────── */
  document.getElementById("clearAll").addEventListener("click",()=>{
    if(!confirm("متأكد إنك عايز تمسح كل حاجة وتبدأ من جديد؟")) return;
    pushHistory();
    walls=[]; openings=[]; placed=[]; selectedIndices=[];
    render(); updatePropsPanel();
  });

  /* ── Export ──────────────────────────────────────────────── */
  document.getElementById("downloadDesign").addEventListener("click",()=>{
    selectedIndices=[]; snapGuides=[]; _render();
    const link=document.createElement("a");
    link.download="تصميم-مساحتي.png"; link.href=canvas.toDataURL("image/png"); link.click();
  });
  document.getElementById("sendWhatsapp").addEventListener("click",e=>{
    e.preventDefault();
    selectedIndices=[]; snapGuides=[]; _render();
    const link=document.createElement("a");
    link.download="تصميم-مساحتي.png"; link.href=canvas.toDataURL("image/png"); link.click();
    const msg=encodeURIComponent("أهلاً، عملت تصميم أولي لـ"+(ROOM_LABELS[roomType]||"مساحتي")+" باستخدام أداة الموقع، وحابب أرسله وأطلب استشارة تصميم مجانية. (التصميم اتنزل الآن، هبعتهولك هنا)");
    window.open("https://wa.me/201112630681?text="+msg,"_blank");
  });

  /* ── Init ────────────────────────────────────────────────── */
  renderFurniturePalette();
  render();
})();
