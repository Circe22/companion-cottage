import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
function showErr(m) {
  const n = document.getElementById("note");
  if (n)
    n.textContent = "出错了：" + m;
  const ld = document.getElementById("load");
  if (ld)
    ld.textContent = "推门的时候卡住了：" + m;
}
window.onerror = (m) => showErr(m);
addEventListener("unhandledrejection", (e) => showErr(e.reason?.message || e.reason));
setTimeout(() => {
  if (!window.DOOR_OPEN) {
    const ld = document.getElementById("load");
    if (ld && !/卡住/.test(ld.textContent))
      ld.textContent = modelsTotal ? `还在推门……（${coreDone}/${CORE.length}，第一次要下 1MB 多，以后就快了）` : "还在推门……（小屋有 30MB，网慢会久一点）";
  }
}, 15000);
var R = new THREE.WebGLRenderer({ antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
R.setSize(innerWidth, innerHeight);
R.outputColorSpace = THREE.SRGBColorSpace;
R.toneMapping = THREE.ACESFilmicToneMapping;
R.toneMappingExposure = 1.15;
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(R.domElement);
var world = new THREE.Scene;
world.background = new THREE.Color(722951);
world.fog = new THREE.Fog(722951, 12, 22);
var ROOMS = { cottage: new THREE.Group, ship: new THREE.Group };
for (const g of Object.values(ROOMS))
  world.add(g);
var scene = ROOMS.cottage;
var curRoom = "cottage";
var cam = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.05, 50);
cam.position.set(4.2, 2.9, 4.4);
var ctl = new OrbitControls(cam, R.domElement);
ctl.target.set(-0.2, 0.6, -0.4);
ctl.enableDamping = true;
ctl.enablePan = true;
ctl.screenSpacePanning = false;
ctl.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
ctl.addEventListener("change", () => {
  const lim = ROOM / 2 - 0.4, tg = ctl.target, d = new THREE.Vector3(Math.max(-lim, Math.min(lim, tg.x)) - tg.x, Math.max(0.3, Math.min(1.8, tg.y)) - tg.y, Math.max(-lim, Math.min(lim, tg.z)) - tg.z);
  if (d.lengthSq()) {
    tg.add(d);
    cam.position.add(d);
  }
});
ctl.minDistance = 1.6;
ctl.maxDistance = 9;
ctl.minPolarAngle = 0.5;
ctl.maxPolarAngle = 1.35;
ctl.minAzimuthAngle = -Infinity;
ctl.maxAzimuthAngle = Infinity;
var hour = () => {
  const d = new Date;
  return d.getHours() + d.getMinutes() / 60;
};
var isNight = () => {
  const h = hour();
  return h < 6 || h >= 18.5;
};
function canvasTex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...rep);
  t.anisotropy = 4;
  return t;
}
var floorTex = canvasTex(512, 512, (g, w, h) => {
  for (let i = 0;i < 8; i++) {
    const y = i * h / 8, base = 92 + i * 37 % 23;
    g.fillStyle = `rgb(${base + 40},${base + 10},${base - 30})`;
    g.fillRect(0, y, w, h / 8);
    for (let k = 0;k < 40; k++) {
      g.fillStyle = `rgba(60,35,20,${Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, y + Math.random() * h / 8, 40 + Math.random() * 120, 1);
    }
    g.fillStyle = "rgba(40,22,12,.6)";
    g.fillRect(0, y, w, 2);
    g.fillRect(i * 173 % w, y, 2, h / 8);
  }
}, [2, 2]);
var wallTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#c9b49a";
  g.fillRect(0, 0, w, h);
  for (let k = 0;k < 2500; k++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,240,220" : "90,70,55"},${Math.random() * 0.06})`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
}, [3, 1.5]);
var ROOM = 6;
var WALL_H = 3;
var floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
var wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.95 });
var wainMat = new THREE.MeshStandardMaterial({ color: 5913128, roughness: 0.7 });
function wall(w, x, z, ry) {
  const g = new THREE.Group;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wallMat);
  m.position.y = WALL_H / 2;
  m.receiveShadow = true;
  g.add(m);
  const wa = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, 0.04), wainMat);
  wa.position.set(0, 0.45, 0.02);
  wa.receiveShadow = true;
  g.add(wa);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.08), wainMat);
  rail.position.set(0, 0.92, 0.04);
  g.add(rail);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  scene.add(g);
  return g;
}
var back = wall(ROOM, 0, -ROOM / 2, 0);
var left = wall(ROOM, -ROOM / 2, 0, Math.PI / 2);
for (let i = -2;i <= -1; i++) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM), wainMat);
  b.position.set(i * 1.3, WALL_H - 0.09, 0);
  b.castShadow = true;
  scene.add(b);
}
var skyCanvas = document.createElement("canvas");
skyCanvas.width = 832;
skyCanvas.height = 960;
var skyTex = new THREE.CanvasTexture(skyCanvas);
skyTex.colorSpace = THREE.SRGBColorSpace;
var stars = Array.from({ length: 70 }, () => [Math.random() * 256, Math.random() * 180, Math.random() * 6]);
function drawSkyOld(t) {
  const g = skyCanvas.getContext("2d"), h = hour();
  g.setTransform(skyCanvas.width / 256, 0, 0, skyCanvas.height / 256, 0, 0);
  let top, bot;
  if (isNight()) {
    top = "#16204a";
    bot = "#3c4280";
  } else if (h < 8) {
    top = "#7d8fc4";
    bot = "#f2b48a";
  } else if (h > 16.5) {
    top = "#5d6aa8";
    bot = "#f0a070";
  } else {
    top = "#7fb2e8";
    bot = "#d8ecf8";
  }
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top);
  gr.addColorStop(1, bot);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  if (isNight()) {
    for (const [x, y, p] of stars) {
      g.fillStyle = `rgba(240,235,255,${0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.3 + p))})`;
      g.fillRect(x, y, 3, 3);
    }
    const glow = g.createRadialGradient(170, 70, 10, 170, 70, 70);
    glow.addColorStop(0, "rgba(255,240,200,.45)");
    glow.addColorStop(1, "rgba(255,240,200,0)");
    g.fillStyle = glow;
    g.fillRect(90, 0, 166, 150);
    g.fillStyle = "#f6edd0";
    g.beginPath();
    g.arc(170, 70, 24, 0, 6.28);
    g.fill();
    g.fillStyle = "rgba(200,190,160,.5)";
    g.beginPath();
    g.arc(162, 64, 5, 0, 6.28);
    g.arc(178, 78, 4, 0, 6.28);
    g.fill();
  } else {
    g.fillStyle = "rgba(255,255,255,.7)";
    for (let i = 0;i < 3; i++) {
      const x = (t * 4 + i * 90) % 300 - 40;
      g.beginPath();
      g.ellipse(x, 60 + i * 30, 34, 10, 0, 0, 6.28);
      g.fill();
    }
  }
  g.fillStyle = isNight() ? "#141428" : "#6f8a78";
  g.beginPath();
  g.moveTo(0, 256);
  for (let x = 0;x <= 256; x += 16)
    g.lineTo(x, 200 - 24 * Math.sin(x / 40) - 10 * Math.sin(x / 13));
  g.lineTo(256, 256);
  g.fill();
  g.setTransform(1, 0, 0, 1, 0, 0);
  skyTex.needsUpdate = true;
}
var WIN_IMG = {};
for (const [k, src] of Object.entries(window.WINDOW || {})) {
  const im = new Image;
  im.src = src;
  WIN_IMG[k] = im;
}
var WEATHERS = ["clear", "rain", "snow"];
var WEATHER_ICON = { clear: "☀", rain: "☂", snow: "❄" };
var timeSlot = () => {
  const h = hour();
  return h < 6 || h >= 18.5 ? "night" : h < 8 ? "dawn" : h < 16.5 ? "day" : "dusk";
};
function todayWeather() {
  const d = new Date, saved = JSON.parse(localStorage.getItem("cottage-weather") || "null");
  if (saved && saved.day === d.toDateString())
    return saved.w;
  const r = ((d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) * 9301 + 49297) % 233280 / 233280;
  return r < 0.55 ? "clear" : r < 0.8 ? "rain" : "snow";
}
var weather = (location.hash.match(/weather=(clear|rain|snow)/) || [])[1] || todayWeather();
function cycleWeather() {
  weather = WEATHERS[(WEATHERS.indexOf(weather) + 1) % WEATHERS.length];
  localStorage.setItem("cottage-weather", JSON.stringify({ day: new Date().toDateString(), w: weather }));
  return weather;
}
var rainDrops = Array.from({ length: 150 }, () => [Math.random(), Math.random(), 0.6 + Math.random() * 0.8]);
var flakes = Array.from({ length: 110 }, () => [Math.random(), Math.random(), 1.2 + Math.random() * 2.6, Math.random() * 6]);
var twinkles = Array.from({ length: 26 }, () => [Math.random(), Math.random() * 0.38, Math.random() * 6]);
var skyShown = null;
var skyPrev = null;
var skyFade = 1;
var skyStill = null;
function drawSky(t, dt = 0) {
  const want = timeSlot() + "-" + weather, img = WIN_IMG[want] || WIN_IMG[timeSlot() + "-clear"];
  if (!img || !img.complete || !img.naturalWidth)
    return drawSkyOld(t);
  const w = WIN_IMG[want] ? weather : "clear", still = w === "clear" && timeSlot() !== "night";
  if (img !== skyShown) {
    skyPrev = skyShown;
    skyShown = img;
    skyFade = skyPrev ? 0 : 1;
    skyStill = null;
  }
  skyFade = Math.min(1, skyFade + dt / 2.5);
  if (still && skyFade >= 1 && skyStill === img)
    return;
  const g = skyCanvas.getContext("2d"), { width: W, height: H } = skyCanvas;
  if (skyPrev && skyFade < 1) {
    g.drawImage(skyPrev, 0, 0, W, H);
    g.globalAlpha = skyFade;
  }
  g.drawImage(img, 0, 0, W, H);
  g.globalAlpha = 1;
  if (w === "rain") {
    g.strokeStyle = "rgba(215,228,242,.45)";
    g.lineWidth = 2.2;
    g.beginPath();
    for (const d of rainDrops) {
      const y = ((d[1] + t * 0.9 * d[2]) % 1.1 - 0.05) * H, x = (d[0] * 1.2 - 0.1) * W + y * 0.12;
      g.moveTo(x, y);
      g.lineTo(x + 5, y + 26 * d[2]);
    }
    g.stroke();
  } else if (w === "snow") {
    g.fillStyle = "rgba(255,255,255,.85)";
    for (const f of flakes) {
      const y = ((f[1] + t * 0.05 * (1 + f[2] / 3)) % 1.05 - 0.025) * H, x = f[0] * W + Math.sin(t * 0.8 + f[3]) * 14;
      g.beginPath();
      g.arc(x, y, f[2], 0, 6.28);
      g.fill();
    }
  } else if (timeSlot() === "night") {
    for (const [x, y, p] of twinkles) {
      const a = Math.max(0, Math.sin(t * 1.3 + p)) ** 3;
      if (a < 0.05)
        continue;
      g.fillStyle = `rgba(255,250,235,${a * 0.9})`;
      const X = x * W, Y = y * H;
      g.fillRect(X - 0.75, Y - 6 * a, 1.5, 12 * a);
      g.fillRect(X - 6 * a, Y - 0.75, 12 * a, 1.5);
    }
  }
  if (still && skyFade >= 1)
    skyStill = img;
  skyTex.needsUpdate = true;
}
drawSky(0);
var win = new THREE.Group;
var pane = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshBasicMaterial({ map: skyTex, toneMapped: false, fog: false }));
win.add(pane);
var frameMat = new THREE.MeshStandardMaterial({ color: 4861984, roughness: 0.6 });
for (const [w, h, x, y] of [[1.46, 0.1, 0, 0.8], [1.46, 0.1, 0, -0.8], [0.1, 1.7, 0.7, 0], [0.1, 1.7, -0.7, 0], [1.3, 0.05, 0, 0], [0.05, 1.5, 0, 0]]) {
  const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frameMat);
  f.position.set(x, y, 0.04);
  f.castShadow = true;
  win.add(f);
}
var sill = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.25), frameMat);
sill.position.set(0, -0.85, 0.12);
win.add(sill);
win.position.set(0.9, 1.75, -ROOM / 2 + 0.01);
scene.add(win);
var rugTex = canvasTex(256, 256, (g) => {
  for (let r = 128;r > 0; r -= 14) {
    g.fillStyle = ["#7a2f36", "#c79a6a", "#5a2a30", "#e0c9a0"][(r / 14 | 0) % 4];
    g.beginPath();
    g.arc(128, 128, r, 0, 6.28);
    g.fill();
  }
});
var rug = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, transparent: true }));
rug.rotation.x = -Math.PI / 2;
rug.position.set(-0.6, 0.005, 0.2);
rug.receiveShadow = true;
scene.add(rug);
var curtainTex = canvasTex(256, 512, (g, w, h) => {
  for (let x = 0;x < w; x++) {
    const f = 0.78 + 0.22 * Math.cos(x / w * Math.PI * 10);
    g.fillStyle = `rgb(${190 * f | 0},${132 * f | 0},${128 * f | 0})`;
    g.fillRect(x, 0, 1, h);
  }
  g.fillStyle = "rgba(255,240,230,.12)";
  for (let y = 0;y < h; y += 6)
    g.fillRect(0, y, w, 1);
});
var curtains = [-1, 1].map((sx) => {
  const c = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 1.72, 12, 1), new THREE.MeshStandardMaterial({ map: curtainTex, roughness: 1, side: THREE.DoubleSide }));
  const p = c.geometry.attributes.position;
  for (let i = 0;i < p.count; i++)
    p.setZ(i, Math.sin(p.getX(i) * 22) * 0.03);
  c.geometry.computeVertexNormals();
  c.position.set(0.9 + sx * 0.82, 1.94, -ROOM / 2 + 0.14);
  c.castShadow = true;
  c.userData.sx = sx;
  scene.add(c);
  return c;
});
var rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.4, 8), frameMat);
rod.rotation.z = Math.PI / 2;
rod.position.set(0.9, 2.82, -ROOM / 2 + 0.14);
scene.add(rod);
var stringWires = [];
var bulbs = [];
var bulbGeo = new THREE.SphereGeometry(0.032, 10, 8);
function stringLights(a, b, n, sag) {
  const pts = [];
  for (let i = 0;i <= n; i++) {
    const t = i / n, v = a.clone().lerp(b, t);
    v.y -= Math.sin(t * Math.PI) * sag;
    pts.push(v);
  }
  const wire = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 2759700 }));
  scene.add(wire);
  stringWires.push(wire);
  pts.forEach((v, i) => {
    if (i === 0 || i === n)
      return;
    const m = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: [16765562, 16757611, 16773296][i % 3], toneMapped: false }));
    m.position.copy(v);
    m.position.y -= 0.03;
    scene.add(m);
    bulbs.push(m);
  });
}
stringLights(new THREE.Vector3(-ROOM / 2 + 0.05, 2.75, -ROOM / 2 + 0.06), new THREE.Vector3(0.05, 2.75, -ROOM / 2 + 0.06), 14, 0.25);
stringLights(new THREE.Vector3(1.75, 2.75, -ROOM / 2 + 0.06), new THREE.Vector3(ROOM / 2 - 0.2, 2.75, -ROOM / 2 + 0.06), 6, 0.15);
stringLights(new THREE.Vector3(-ROOM / 2 + 0.06, 2.75, -ROOM / 2 + 0.05), new THREE.Vector3(-ROOM / 2 + 0.06, 2.75, 2.6), 18, 0.28);
var bulbLight = new THREE.PointLight(16761466, 0.5, 5, 2);
bulbLight.position.set(-1.6, 2.4, -2.4);
scene.add(bulbLight);
function frame(key, w, x, y, z, ry, parent = scene) {
  const src = (window.PICS || {})[key];
  if (!src)
    return;
  const img = new Image;
  img.src = src;
  const tex = new THREE.Texture(img);
  tex.colorSpace = THREE.SRGBColorSpace;
  img.onload = () => {
    tex.needsUpdate = true;
  };
  const h = w * 4 / 3, g = new THREE.Group;
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }));
  pic.position.z = 0.022;
  g.add(pic);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, h + 0.1, 0.04), new THREE.MeshStandardMaterial({ color: 2824208, roughness: 0.5 }));
  g.add(fr);
  g.position.set(x, y, z);
  g.rotation.y = ry;
  g.traverse((n) => n.castShadow = true);
  parent.add(g);
  return g;
}
frame("art-a", 0.42, -0.35, 2.05, -ROOM / 2 + 0.03, 0);
frame("art-b", 0.36, -ROOM / 2 + 0.03, 1.95, -1.75, Math.PI / 2);
frame("art-c", 0.34, -ROOM / 2 + 0.03, 2, 1.75, Math.PI / 2);
var hemi = new THREE.HemisphereLight(16771276, 3811872, 1.15);
var amb = new THREE.AmbientLight(16769216, 0.25);
scene.add(hemi, amb);
var LIGHTS_KEY = "cottage-lights";
var lights = { main: true, lamp: true, string: false, ...(() => {
  try {
    return JSON.parse(localStorage.getItem(LIGHTS_KEY)) || {};
  } catch {
    return {};
  }
})() };
var winLight = new THREE.DirectionalLight(12571903, 0.6);
winLight.position.set(1, 3, -6);
winLight.target.position.set(0, 0, 0);
scene.add(winLight, winLight.target);
var fire = new THREE.PointLight(16747068, 2.2, 7, 1.6);
fire.castShadow = true;
fire.shadow.mapSize.set(1024, 1024);
fire.shadow.bias = -0.003;
scene.add(fire);
var lampLight = new THREE.PointLight(16765594, 1.4, 5, 1.8);
scene.add(lampLight);
var fill = new THREE.DirectionalLight(16773344, 0.7);
world.add(fill, fill.target);
var loader = new GLTFLoader;
loader.setMeshoptDecoder(MeshoptDecoder);
var MODEL_URLS = window.MODEL_URLS || {};
var modelBufs = {};
var modelsDone = 0;
var modelsTotal = Object.keys(MODEL_URLS).length;
function sha1hex(buf) {
  const b = new Uint8Array(buf), n = b.length, words = ((n + 8 >> 6) + 1) * 16, w = new Uint32Array(words);
  for (let i = 0;i < n; i++)
    w[i >> 2] |= b[i] << 24 - (i & 3) * 8;
  w[n >> 2] |= 128 << 24 - (n & 3) * 8;
  w[words - 1] = n * 8 >>> 0;
  w[words - 2] = Math.floor(n / 536870912);
  let h0 = 1732584193, h1 = 4023233417, h2 = 2562383102, h3 = 271733878, h4 = 3285377520;
  const W = new Uint32Array(80);
  for (let o = 0;o < words; o += 16) {
    for (let i = 0;i < 16; i++)
      W[i] = w[o + i];
    for (let i = 16;i < 80; i++) {
      const x = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
      W[i] = x << 1 | x >>> 31;
    }
    let a = h0, bb = h1, c = h2, d = h3, e = h4;
    for (let i = 0;i < 80; i++) {
      const f = i < 20 ? (bb & c | ~bb & d) + 1518500249 : i < 40 ? (bb ^ c ^ d) + 1859775393 : i < 60 ? (bb & c | bb & d | c & d) + 2400959708 : (bb ^ c ^ d) + 3395469782;
      const tmp = (a << 5 | a >>> 27) + f + e + W[i] >>> 0;
      e = d;
      d = c;
      c = bb << 30 | bb >>> 2;
      bb = a;
      a = tmp;
    }
    h0 = h0 + a >>> 0;
    h1 = h1 + bb >>> 0;
    h2 = h2 + c >>> 0;
    h3 = h3 + d >>> 0;
    h4 = h4 + e >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((x) => x.toString(16).padStart(8, "0")).join("");
}
async function fetchBuf(u, tries = 4) {
  const want = u.split("/").pop().split(".").slice(-2, -1)[0];
  for (let i = 0;i < tries; i++) {
    try {
      const r = await fetch(u, i ? { cache: "reload" } : {});
      if (r.ok) {
        const buf = await r.arrayBuffer();
        if (!/^[0-9a-f]{10}$/.test(want) || sha1hex(buf).startsWith(want))
          return buf;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  const n = document.getElementById("note");
  if (n) {
    n.textContent = "有个家具没下下来，刷新一下就补上：" + u.split("/").pop().split(".")[0];
    document.getElementById("hud")?.classList.add("open");
  }
  return null;
}
var CORE = ["sofa", "fireplace", "bookshelf", "lamp", "table", "bed"].filter((k) => MODEL_URLS[k]);
var coreDone = 0;
var fetchOne = (k) => fetchBuf(MODEL_URLS[k]).finally(() => {
  modelsDone++;
  if (CORE.includes(k))
    coreDone++;
  const ld = document.getElementById("load");
  if (ld && !window.DOOR_OPEN && !/卡住/.test(ld.textContent))
    ld.textContent = `推门进小屋……（${coreDone}/${CORE.length}）`;
});
for (const k of CORE)
  modelBufs[k] = fetchOne(k);
var coreFetched = Promise.all(CORE.map((k) => modelBufs[k]));
for (const k of Object.keys(MODEL_URLS))
  if (!CORE.includes(k))
    modelBufs[k] = coreFetched.then(() => fetchOne(k));
function loadModel(key) {
  return new Promise(async (res) => {
    let buf = null;
    if (window.MODELS?.[key])
      buf = Uint8Array.from(atob(window.MODELS[key]), (c) => c.charCodeAt(0)).buffer;
    else if (modelBufs[key])
      buf = await modelBufs[key];
    if (!buf)
      return res(null);
    loader.parse(buf, "", (g) => {
      g.scene.traverse((n) => {
        if (n.isMesh) {
          n.castShadow = true;
          n.receiveShadow = true;
        }
      });
      res(g.scene);
    }, () => res(null));
  });
}
function place(obj, { h, w, x, z, ry = 0 }) {
  const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3), c = box.getCenter(new THREE.Vector3);
  const k = h ? h / s.y : w / Math.max(s.x, s.z);
  obj.scale.setScalar(k);
  obj.position.set(-c.x * k, -box.min.y * k, -c.z * k);
  const pivot = new THREE.Group;
  pivot.add(obj);
  pivot.position.set(x, 0, z);
  pivot.rotation.y = ry;
  scene.add(pivot);
  return pivot;
}
var SPOTS = {
  fire: new THREE.Vector3(-1.7, 0, 0.3),
  window: new THREE.Vector3(0.45, 0, -1.75),
  rug: new THREE.Vector3(-0.6, 0, 0.4),
  sofa: new THREE.Vector3(0.3, 0, 1.6),
  shelf: new THREE.Vector3(-1.4, 0, -2),
  bed: new THREE.Vector3(1.6, 0, -0.4),
  tv: new THREE.Vector3(-1.6, 0, -1.4),
  catbed: new THREE.Vector3(-1.5, 0, 1.1),
  music: new THREE.Vector3(-2, 0, 1.9)
};
var clawd;
var mew;
var props = {};
var PC_SINK = 0.38;
var PC_SCREEN = new THREE.Vector3(-0.416, 1.18, -2.546);
SPOTS.pc = new THREE.Vector3(-0.35, 0, -2);
var pcCanvas = document.createElement("canvas");
pcCanvas.width = 160;
pcCanvas.height = 120;
var pcTex = new THREE.CanvasTexture(pcCanvas);
pcTex.colorSpace = THREE.SRGBColorSpace;
pcTex.magFilter = THREE.NearestFilter;
var pcLines = Array.from({ length: 40 }, () => ({ ind: (Math.random() * 4 | 0) * 10, segs: Array.from({ length: 1 + Math.random() * 4 | 0 }, () => [6 + Math.random() * 30 | 0, ["#7fe3ff", "#ffd166", "#f07a8c", "#9be39b", "#d8c6ff", "#c8c8c8"][Math.random() * 6 | 0]]) }));
var pcOn = 0;
var pcScroll = 0;
function drawPc(dt) {
  const g = pcCanvas.getContext("2d");
  g.fillStyle = "#0d1418";
  g.fillRect(0, 0, 160, 120);
  if (pcOn > 0.02) {
    pcScroll += dt * 9;
    const first = pcScroll | 0, off = pcScroll % 1 * 8;
    g.globalAlpha = pcOn;
    for (let r = 0;r < 16; r++) {
      const L = pcLines[(first + r) % pcLines.length];
      let x = 8 + L.ind;
      for (const [w, c] of L.segs) {
        g.fillStyle = c;
        g.fillRect(x, 6 + r * 8 - off, w, 4);
        x += w + 4;
      }
    }
    if ((performance.now() / 500 | 0) % 2) {
      g.fillStyle = "#e8f0ff";
      g.fillRect(8, 110, 5, 6);
    }
    g.globalAlpha = 1;
  }
  pcTex.needsUpdate = true;
}
drawPc(0);
var pcScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.27), new THREE.MeshBasicMaterial({ map: pcTex, toneMapped: false }));
var pcGlow = new THREE.PointLight(10475775, 0, 1.4, 2);
var FX = "#F1C166";
var FX_EDGE = "#2a1d14";
var PIX_ICON = {
  "♥": [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
  "✦": ["...#...", "...#...", "..###..", "#######", "..###..", "...#...", "...#..."],
  "✓": ["......#", ".....##", "#...##.", "##.##..", ".###...", "..#...."],
  "☀": ["....#....", ".#.....#.", "...###...", "..#####..", "#.#####.#", "..#####..", "...###...", ".#.....#.", "....#...."],
  "☂": ["....#....", "..#####..", ".#######.", "#########", "....#....", "....#....", "....#....", "..#.#....", "...#....."],
  "♪": ["..##..", "..#.#.", "..#..#", "..#...", "..#...", "###...", "###...", ".#...."],
  "❄": ["#...#...#", ".#..#..#.", "..#.#.#..", "...###...", "#########", "...###...", "..#.#.#..", ".#..#..#.", "#...#...#"]
};
try {
  await Promise.race([document.fonts.load('12px "FusionPixel"', "咕"), new Promise((r) => setTimeout(r, 1500))]);
} catch (e) {}
function pixelMask(txt) {
  const icon = PIX_ICON[txt];
  if (icon)
    return { w: icon[0].length, h: icon.length, m: icon.flatMap((r) => [...r].map((ch) => ch === "#" ? 1 : 0)) };
  const c = document.createElement("canvas"), g = c.getContext("2d"), font = '12px "FusionPixel", monospace';
  g.font = font;
  c.width = Math.ceil(g.measureText(txt).width) + 4;
  c.height = 18;
  g.font = font;
  g.textBaseline = "alphabetic";
  g.fillStyle = "#000";
  g.fillText(txt, 2, 14);
  const a = g.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, x1 = -1, y0 = c.height, y1 = -1;
  for (let y = 0;y < c.height; y++)
    for (let x = 0;x < c.width; x++)
      if (a[(y * c.width + x) * 4 + 3] >= 128) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
  if (x1 < 0)
    return { w: 1, h: 1, m: [0] };
  const w = x1 - x0 + 1, h = y1 - y0 + 1, m = [];
  for (let y = y0;y <= y1; y++)
    for (let x = x0;x <= x1; x++)
      m.push(a[(y * c.width + x) * 4 + 3] >= 128 ? 1 : 0);
  return { w, h, m };
}
function pixelSprite(txt, color = FX, px = 0.016) {
  const { w, h, m } = pixelMask(txt), c = document.createElement("canvas");
  c.width = w + 2;
  c.height = h + 2;
  const g = c.getContext("2d");
  const on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x];
  g.fillStyle = FX_EDGE;
  for (let y = -1;y <= h; y++)
    for (let x = -1;x <= w; x++)
      if (!on(x, y) && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)))
        g.fillRect(x + 1, y + 1, 1, 1);
  g.fillStyle = color;
  for (let y = 0;y < h; y++)
    for (let x = 0;x < w; x++)
      if (on(x, y))
        g.fillRect(x + 1, y + 1, 1, 1);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
  s.scale.set(c.width * px, c.height * px, 1);
  return s;
}
function textSprite(txt, color) {
  return pixelSprite(txt, color, PIX_ICON[txt] ? 0.02 : 0.014);
}
var floaters = [];
function emit(txt, color, pos, life = 2.4) {
  const s = textSprite(txt, color);
  s.position.copy(pos);
  ROOMS[curRoom].add(s);
  floaters.push({ s, life, max: life, vx: (Math.random() - 0.5) * 0.12 });
}

class Critter {
  constructor(pivot, name) {
    this.p = pivot;
    this.name = name;
    this.target = null;
    this.wait = 2;
    this.state = "idle";
    this.base = pivot.children[0].scale.x;
    this.hop = 0;
    this.face = pivot.rotation.y;
  }
  walkTo(v) {
    if (this.sitting)
      this.standUp();
    this.target = v.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0, (Math.random() - 0.5) * 0.3));
    this.state = "walk";
  }
  goSit(seat) {
    if (!seat)
      return;
    this.walkTo(seat.approach);
    this.target = seat.approach.clone();
    this.seatGoal = seat;
  }
  beginSit() {
    const seat = this.seatGoal;
    this.seatGoal = null;
    if (!seat)
      return;
    const other = Object.values(SEATS).some((x) => x === seat) && [clawd, mew].find((c) => c && c !== this && c.sitting === seat);
    const side = new THREE.Vector3(Math.cos(seat.face), 0, -Math.sin(seat.face));
    this.sitPos = seat.pos.clone().addScaledVector(side, other ? seat.wide || 0.3 : 0);
    if (other && !other.sitShifted) {
      other.sitPos.addScaledVector(side, -(seat.wide || 0.3));
      other.sitShifted = true;
    }
    this.sitting = seat;
    this.sitShifted = false;
    this.state = "sit";
    this.hop = 0.6;
    this.face = seat.face;
    this.sitUntil = performance.now() / 1000 + (seat.sleep ? 25 + Math.random() * 20 : 14 + Math.random() * 14);
    if (seat.sleep && this.name === "mew")
      this.sleep = true;
  }
  standUp() {
    const seat = this.sitting;
    if (!seat)
      return;
    this.sitting = null;
    this.state = "idle";
    this.wait = 3 + Math.random() * 6;
    this.hop = 0.4;
    if (this.name === "mew")
      this.sleep = false;
    this.p.position.x = seat.approach.x;
    this.p.position.z = seat.approach.z;
  }
  update(dt, t) {
    const m = this.p.children[0];
    if (this.faceAt && performance.now() / 1000 < this.faceAtUntil) {
      const d = this.faceAt.clone().sub(this.p.position);
      this.face = Math.atan2(d.x, d.z);
    }
    let bob = 0, sx = 1, sy = 1;
    if (this.state === "walk" && this.target) {
      const d = this.target.clone().sub(this.p.position);
      d.y = 0;
      const L = d.length();
      if (L < 0.05) {
        this.state = "idle";
        this.target = null;
        this.wait = 5 + Math.random() * 10;
        if (this.seatGoal)
          this.beginSit();
      } else {
        d.normalize();
        this.p.position.addScaledVector(d, Math.min(L, dt * 0.55));
        this.face = Math.atan2(d.x, d.z);
        const ph = t * 9;
        bob = Math.abs(Math.sin(ph)) * 0.05;
        sy = 1 + Math.sin(ph * 2) * 0.04;
        sx = 1 - Math.sin(ph * 2) * 0.03;
      }
    } else {
      sy = 1 + Math.sin(t * 2.2) * 0.018;
      sx = 1 - Math.sin(t * 2.2) * 0.01;
    }
    if (this.hop > 0) {
      this.hop -= dt;
      bob += Math.sin((1 - this.hop / 0.6) * Math.PI) * 0.25;
    }
    let dr = this.face - this.p.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    this.p.rotation.y += dr * Math.min(1, dt * 6);
    if (this.sitting) {
      this.p.position.x += (this.sitPos.x - this.p.position.x) * Math.min(1, dt * 5);
      this.p.position.z += (this.sitPos.z - this.p.position.z) * Math.min(1, dt * 5);
      this.face = this.sitting.face;
      if (performance.now() / 1000 > this.sitUntil)
        this.standUp();
    }
    this.lift = (this.lift || 0) + ((this.sitting ? this.sitting.y : 0) - (this.lift || 0)) * Math.min(1, dt * 6);
    this.p.position.y = bob + this.lift - (this.relax || 0) * this.base * 0.17;
    m.scale.set(this.base * sx, this.base * sy * (this.sleep ? 0.86 : 1), this.base * sx);
    animateLimbs(this, t, dt);
  }
}
var CLAWD = {
  w: 1,
  h: 0.64,
  d: 0.5,
  r: 0.09,
  puff: 0.018,
  legH: 0.22,
  legR: 0.068,
  earR: 0.105,
  armY: 0.45,
  color: 14251863,
  shells: 10,
  furLen: 0.026,
  furDensity: 150
};
function puffyBox(w, h, d, r, puff, seg = 14) {
  const g = new THREE.BoxGeometry(w, h, d, seg, seg, seg), p = g.attributes.position, v = new THREE.Vector3, c = new THREE.Vector3;
  const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0;i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(THREE.MathUtils.clamp(v.x, -hx, hx), THREE.MathUtils.clamp(v.y, -hy, hy), THREE.MathUtils.clamp(v.z, -hz, hz));
    const n = v.clone().sub(c).normalize();
    const bx = 1 - (v.x / (w / 2)) ** 2, by = 1 - (v.y / (h / 2)) ** 2, bz = 1 - (v.z / (d / 2)) ** 2;
    const bulge = puff * Math.max(0, Math.abs(n.z) * bx * by + Math.abs(n.x) * by * bz + Math.abs(n.y) * bx * bz);
    v.copy(c).addScaledVector(n, r + bulge);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  const m = mergeVertices(g, 0.0001);
  m.computeVertexNormals();
  return m;
}
function limb(geo, joint, extra) {
  geo.translate(-joint.x, -joint.y, -joint.z);
  return { geo, joint, ...extra };
}
function furMaterial(layer, n, C = CLAWD) {
  const k = layer / n;
  const mat = new THREE.MeshStandardMaterial({ color: C.color, roughness: 0.95, metalness: 0, transparent: layer > 0, depthWrite: layer === 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uK = { value: k };
    sh.uniforms.uLen = { value: C.furLen };
    sh.uniforms.uDen = { value: C.furDensity };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", `#include <common>
uniform float uK, uLen; varying vec3 vObj;`).replace(`#include <common>
uniform float uK, uLen; varying vec3 vObj;`, `#include <common>
uniform float uK, uLen; varying vec3 vObj; varying vec3 vObjN;`).replace("#include <begin_vertex>", "vec3 transformed = position + normal * uK * uLen; vObj = position; vObjN = normal;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
uniform float uK, uDen; varying vec3 vObj; varying vec3 vObjN;
float h3(vec3 p) { p = fract(p * vec3(443.897, 441.423, 437.195)); p += dot(p, p.yzx + 19.19); return fract((p.x + p.y) * p.z); }`).replace("#include <color_fragment>", `#include <color_fragment>
  if (uK > 0.0) {
    // 按法线挑一个平面切格子（三平面投影），不然鼓起来的面会切出一圈圈年轮
    vec3 an = abs(vObjN); vec2 q = an.z > an.x && an.z > an.y ? vObj.xy : an.x > an.y ? vObj.zy : vObj.xz;
    vec2 cell = floor(q * uDen);
    float hair = h3(vec3(cell, an.z > an.x && an.z > an.y ? 1. : an.x > an.y ? 2. : 3.));   // 每格一根毛，毛长随机
    vec2 jit = vec2(h3(vec3(cell, 7.)), h3(vec3(cell, 9.))) - .5;
    float r = length(fract(q * uDen) - .5 - jit * .4);
    if (hair < uK || r > .55 * (1.0 - uK * .7)) discard;   // 越往外越细、越少
  }
  // 发根暗、毛尖亮：假装毛之间的阴影
  diffuseColor.rgb *= mix(.82, 1.06, uK);
`);
  };
  return mat;
}
function buildFurry(parts, C) {
  const g = new THREE.Group, mats = [];
  for (let L = 0;L <= C.shells; L++)
    mats.push(furMaterial(L, C.shells, C));
  g.userData.limbs = [];
  for (const part of parts) {
    const pg = new THREE.Group;
    if (part.joint)
      pg.position.copy(part.joint);
    g.add(pg);
    mats.forEach((mat, L) => {
      const m = new THREE.Mesh(part.geo, mat);
      m.castShadow = L === 0;
      m.renderOrder = L;
      if (L > 0)
        m.raycast = () => {};
      pg.add(m);
    });
    const hg = part.geo.clone(), p = hg.attributes.position, nr = hg.attributes.normal;
    for (let i = 0;i < p.count; i++)
      p.setXYZ(i, p.getX(i) + nr.getX(i) * C.furLen, p.getY(i) + nr.getY(i) * C.furLen, p.getZ(i) + nr.getZ(i) * C.furLen);
    pg.add(new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ visible: false })));
    if (part.kind !== "body")
      g.userData.limbs.push({ ...part, grp: pg });
  }
  return g;
}
var _q = new THREE.Quaternion;
function animateLimbs(cr, t, dt) {
  const limbs = cr.p.children[0].userData.limbs;
  if (!limbs)
    return;
  const now = performance.now() / 1000, walking = cr.state === "walk" || cr.state === "swim", ph = t * (cr.state === "swim" ? 3.5 : 9), k = Math.min(1, dt * 10);
  const happy = now < (cr.happyUntil || 0) || now < (cr.wideUntil || 0);
  if (cr.name === "mew" || cr.mewBody)
    cr.relax = cr.relaxLock ?? (cr.relax || 0) + ((walking ? 0 : 1) - (cr.relax || 0)) * Math.min(1, dt * (walking ? 6 : 2.5));
  for (const L of limbs) {
    const r = L.grp.rotation;
    if (L.kind === "leg") {
      r.x += ((walking ? Math.sin(ph + L.i % 2 * Math.PI) * 0.6 : 0) - r.x) * k;
    } else if (L.kind === "arm") {
      const up = happy ? 0.1 + Math.sin(t * 16 + L.sx * 1.7) * 0.08 : cr.sleep ? -0.06 : Math.sin(t * 2 + L.sx) * 0.01;
      const fwd = walking ? Math.sin(ph + (L.sx > 0 ? 0 : Math.PI)) * 0.07 : 0, out = happy ? 0.03 : 0;
      const tp = L.joint.clone().add(new THREE.Vector3(L.sx * out, up, fwd));
      L.grp.position.lerp(tp, k);
    } else if (L.kind === "tent") {
      const stand = Math.sin(t * 1.8 - L.a * 2) * 0.12 + (happy ? 0.35 : 0), splay = -1.45 + Math.sin(t * 1.2 - L.a * 2) * 0.04 + (happy ? 0.1 : 0);
      const target = walking ? Math.sin(ph - L.a * 2) * 0.5 : stand + (splay - stand) * (cr.relax || 0);
      L.ang = cr.relaxLock != null ? target : (L.ang || 0) + (target - (L.ang || 0)) * k;
      L.grp.quaternion.copy(_q.setFromAxisAngle(L.axis, L.ang));
      {
        const r = cr.relax || 0;
        L.grp.scale.set(1 + 0.3 * r, 1 + 0.15 * r, 1 + 0.3 * r);
      }
    } else if (L.kind === "ear") {
      r.z += ((happy ? Math.sin(t * 22 + L.sx) * 0.18 : 0) - r.z) * k;
    }
  }
}
var MEW = {
  w: 0.9,
  h: 0.66,
  d: 0.78,
  r: 0.2,
  puff: 0.03,
  legH: 0.27,
  legR: 0.062,
  legRing: 0.25,
  earR: 0.15,
  earH: 0.3,
  earX: 0.24,
  color: 11712186,
  shells: 10,
  furLen: 0.03,
  furDensity: 140
};
function mewGeometries() {
  const C = MEW, parts = [];
  const head = puffyBox(C.w, C.h, C.d, C.r, C.puff);
  head.translate(0, C.legH + C.h / 2 - 0.03, 0);
  parts.push({ geo: head, kind: "body" });
  for (const sx of [-1, 1]) {
    const e = new THREE.ConeGeometry(C.earR, C.earH, 24, 4);
    e.scale(1, 1, 0.7);
    e.rotateZ(-sx * 0.18);
    e.translate(sx * C.earX, C.legH + C.h + 0.02 + C.earH / 2 - 0.06, 0.02);
    parts.push(limb(e, new THREE.Vector3(sx * C.earX, C.legH + C.h - 0.04, 0.02), { kind: "ear", sx }));
  }
  for (let i = 0;i < 8; i++) {
    const a = (i + 0.5) / 8 * Math.PI * 2, l = new THREE.CapsuleGeometry(C.legR, C.legH - C.legR, 6, 16);
    const x = Math.sin(a) * C.legRing, z = Math.cos(a) * C.legRing * 0.85;
    l.translate(x, C.legH / 2 + 0.005, z);
    parts.push(limb(l, new THREE.Vector3(x, C.legH + 0.02, z), { kind: "tent", a, axis: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)) }));
  }
  return parts;
}
var buildMew = () => buildFurry(mewGeometries(), MEW);
var EYE_INK = "#1e1816";
var EYE5 = {
  squeeze: { L: ["##...", ".##..", "..##.", ".##..", "##..."], R: ["...##", "..##.", ".##..", "..##.", "...##"] },
  think: { L: [".....", ".....", "###..", ".....", "....."], R: [".....", ".....", "..###", ".....", "....."] },
  heart: [".#.#.", "#####", "#####", ".###.", "..#.."],
  star: ["..#..", ".###.", "#####", ".###.", "..#.."],
  wow: [".###.", "#...#", "#.#.#", "#...#", ".###."],
  dizzy: { L: ["#####", "....#", ".##.#", ".#..#", ".####"], R: ["#####", "#....", "#.##.", "#..#.", "####."] },
  drowsy: [".....", ".....", "#####", ".###.", "....."]
};
function eyeTex(kind, ink = EYE_INK, side = "L") {
  if (EYE5[kind]) {
    const P = EYE5[kind].L ? EYE5[kind][side] : EYE5[kind];
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    const g = c.getContext("2d");
    g.fillStyle = ink;
    P.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "#")
        g.fillRect(8 + x * 16, 8 + y * 16, 16, 16);
    }));
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }
  const P = {
    open: ["...", ".#.", ".#."],
    wide: ["##.", "##.", "..."].map((r) => r),
    happy: [".#.", "#.#", "..."],
    sleep: ["...", "#.#", ".#."],
    blink: ["...", "...", "###"]
  }[kind];
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d");
  g.fillStyle = ink;
  const cell = 24, off = (96 - cell * 3) / 2;
  if (kind === "wide") {
    g.fillRect(48 - cell * 1.25, 48 - cell * 1.25, cell * 2.5, cell * 2.5);
  } else if (kind === "open") {
    g.fillRect(48 - cell * 0.75, 48 - cell * 1.25, cell * 1.5, cell * 2.5);
  } else
    P.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === "#")
        g.fillRect(off + x * cell, off + y * cell, cell, cell);
    }));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
var EYE_KINDS = ["open", "wide", "sleep", "happy", "blink", ...Object.keys(EYE5)];
var EYE_SETS = {};
var eyeSet = (ink) => EYE_SETS[ink] ||= Object.fromEntries(EYE_KINDS.map((k) => [k, EYE5[k]?.L ? { L: eyeTex(k, ink, "L"), R: eyeTex(k, ink, "R") } : eyeTex(k, ink)]));
var eyeMap = (e, kind) => {
  const t = e.userData.set[kind];
  return t.isTexture ? t : t[e.userData.side];
};
var EYE_TEX = eyeSet(EYE_INK);
function addEyes(critter, { y = 0.375, dx = 0.105, size = 0.105, inks = [EYE_INK, EYE_INK], start = "sleep" } = {}) {
  const pv = critter.p, m = pv.children[0], ry0 = pv.rotation.y;
  pv.rotation.y = 0;
  pv.updateMatrixWorld(true);
  const rc = new THREE.Raycaster, mats = [];
  critter.eyes = [];
  for (const sx of [-1, 1]) {
    const from = pv.localToWorld(new THREE.Vector3(sx * dx, y, 2));
    rc.set(from, new THREE.Vector3(0, 0, -1));
    const hit = rc.intersectObject(m, true)[0];
    const zLocal = hit ? pv.worldToLocal(hit.point.clone()).z : 0.18;
    const set = eyeSet(inks[sx < 0 ? 0 : 1]);
    const mat = new THREE.MeshBasicMaterial({ map: set[start].isTexture ? set[start] : set[start].L, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    const e = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    const pos = m.worldToLocal(pv.localToWorld(new THREE.Vector3(sx * dx, y, zLocal + 0.008)));
    e.position.copy(pos);
    e.scale.setScalar(1 / m.scale.x);
    e.renderOrder = 100;
    e.userData.set = set;
    e.userData.side = sx < 0 ? "L" : "R";
    m.add(e);
    critter.eyes.push(e);
  }
  pv.rotation.y = ry0;
  pv.updateMatrixWorld(true);
  critter.expr = start;
  critter.nextBlink = 3;
}
function setExpr(critter, kind) {
  if (!critter.eyes || critter.expr === kind)
    return;
  critter.expr = kind;
  for (const e of critter.eyes)
    e.material.map = eyeMap(e, kind);
}
function flash(critter, kind, dur) {
  if (!critter || critter.sleep)
    return;
  critter.flashKind = kind;
  critter.flashUntil = performance.now() / 1000 + dur;
}
function updateEyes(critter, t, dt) {
  if (!critter.eyes)
    return;
  let k = critter.sleep ? "sleep" : t < (critter.flashUntil || 0) ? critter.flashKind : t < (critter.wideUntil || 0) ? "wide" : t < (critter.happyUntil || 0) ? critter.happyKind || "happy" : critter.drowsy ? "drowsy" : "open";
  if (k === "open") {
    critter.nextBlink -= dt;
    if (critter.nextBlink < 0) {
      k = "blink";
      if (critter.nextBlink < -0.13)
        critter.nextBlink = 2.5 + Math.random() * 3.5;
    }
  }
  setExpr(critter, k);
}
function maybeThink(cr, dt, still) {
  const now = performance.now() / 1000;
  if (cr.sleep || !still || now < (cr.flashUntil || 0) || now < (cr.happyUntil || 0) || now < (cr.wideUntil || 0))
    return;
  if ((cr.thinkT ??= 8 + Math.random() * 15) > 0) {
    cr.thinkT -= dt * (cr.pilot ? 2 : 1);
    return;
  }
  cr.thinkT = 14 + Math.random() * 20;
  flash(cr, "think", 2.6);
  setTimeout(() => emit("…", FX, cr.p.position.clone().add(new THREE.Vector3(0, 0.62, 0)), 2), 300);
}
var SEATS = {};
function addSeat(key, { f = 0.55, back = 0, sleep = false, approach = 0.6, wide = 0.3, turn = 0 } = {}) {
  const pr = props[key];
  if (!pr)
    return;
  const box = new THREE.Box3().setFromObject(pr), ry = pr.rotation.y + turn, fwd = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry));
  const pos = pr.position.clone().addScaledVector(fwd, -back);
  pos.y = 0;
  SEATS[key] = { key, pos, y: box.min.y + (box.max.y - box.min.y) * f, face: ry, sleep, wide, approach: pos.clone().addScaledVector(fwd, approach) };
  pr.userData.seat = key;
}
var ship = ROOMS.ship;
function rrect(path, x, y, w, h, r) {
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0);
  path.lineTo(x + w, y + h - r);
  path.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2);
  path.lineTo(x + r, y + h);
  path.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
  path.lineTo(x, y + r);
  path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5);
  return path;
}
function rimGeo(w, h, r, t, depth) {
  const sh = rrect(new THREE.Shape, -w / 2 - t, -h / 2 - t, w + 2 * t, h + 2 * t, r + t);
  sh.holes.push(rrect(new THREE.Path, -w / 2, -h / 2, w, h, r));
  return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 10 });
}
var panelTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#dfe4ea";
  g.fillRect(0, 0, w, h);
  for (let k = 0;k < 900; k++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? "255,255,255" : "120,130,145"},${Math.random() * 0.05})`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
  g.fillStyle = "#aab3bf";
  g.fillRect(0, 0, w, 3);
  g.fillRect(0, 0, 3, h);
  g.fillRect(0, h / 2, w, 1);
  g.fillStyle = "#9aa3ae";
  for (const [x, y] of [[10, 10], [w - 10, 10], [10, h - 10], [w - 10, h - 10]]) {
    g.beginPath();
    g.arc(x, y, 3, 0, 6.28);
    g.fill();
  }
});
panelTex.repeat.set(1 / 1.5, 1 / 1.5);
var shipFloorTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#3b414b";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#2c3139";
  for (let i = 0;i < 16; i++)
    for (let j = 0;j < 16; j++)
      if ((i + j) % 2)
        g.fillRect(i * 16 + 3, j * 16 + 3, 10, 2);
  g.fillStyle = "#566070";
  g.fillRect(0, 0, w, 4);
  g.fillRect(0, 0, 4, h);
}, [4, 4]);
var whiteMat = new THREE.MeshStandardMaterial({ color: 15659509, roughness: 0.45, metalness: 0.1 });
var greyMat = new THREE.MeshStandardMaterial({ color: 6121075, roughness: 0.5, metalness: 0.3 });
var glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
{
  const f = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), new THREE.MeshStandardMaterial({ map: shipFloorTex, roughness: 0.7, metalness: 0.2 }));
  f.rotation.x = -Math.PI / 2;
  f.receiveShadow = true;
  ship.add(f);
}
var wallPanelMat = new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.55 });
function shipWall(holes, x, z, ry) {
  const sh = new THREE.Shape;
  sh.moveTo(-ROOM / 2, 0);
  sh.lineTo(ROOM / 2, 0);
  sh.lineTo(ROOM / 2, WALL_H);
  sh.lineTo(-ROOM / 2, WALL_H);
  sh.lineTo(-ROOM / 2, 0);
  for (const h of holes)
    sh.holes.push(h);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), wallPanelMat);
  m.receiveShadow = true;
  const g = new THREE.Group;
  g.add(m);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.25, 0.06), greyMat);
  kick.position.set(0, 0.125, 0.03);
  g.add(kick);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.035, 0.03), glowMat(8381439));
  strip.position.set(0, WALL_H - 0.12, 0.05);
  g.add(strip);
  const low = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.02, 0.03), glowMat(4029439));
  low.position.set(0, 0.27, 0.07);
  g.add(low);
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  ship.add(g);
  return g;
}
var WIN = { w: 4.4, h: 1.65, cy: 1.825, r: 0.4 };
shipWall([rrect(new THREE.Path, -WIN.w / 2, WIN.cy - WIN.h / 2, WIN.w, WIN.h, WIN.r)], 0, -ROOM / 2, 0);
{
  const rim = new THREE.Mesh(rimGeo(WIN.w, WIN.h, WIN.r, 0.12, 0.16), greyMat);
  rim.position.set(0, WIN.cy, -ROOM / 2 - 0.04);
  ship.add(rim);
  const mull = new THREE.Mesh(new THREE.BoxGeometry(0.07, WIN.h, 0.08), greyMat);
  mull.position.set(0, WIN.cy, -ROOM / 2 + 0.02);
  ship.add(mull);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.h), new THREE.MeshBasicMaterial({ color: 10475775, transparent: true, opacity: 0.05, depthWrite: false }));
  glass.position.set(0, WIN.cy, -ROOM / 2 + 0.01);
  ship.add(glass);
  for (const [x, w] of [[-1.2, 0.25], [-0.85, 0.08], [1.1, 0.18]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, WIN.h * 1.1), new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 0.045, depthWrite: false }));
    s.position.set(x, WIN.cy, -ROOM / 2 + 0.015);
    s.rotation.z = -0.5;
    ship.add(s);
  }
}
var PORT = { z: -1, y: 1.7, r: 0.5 };
var HATCH = { z: 1.2, w: 0.9, h: 1.95, r: 0.3 };
{
  const hole = new THREE.Path;
  hole.absarc(-PORT.z, PORT.y, PORT.r, 0, Math.PI * 2, true);
  shipWall([hole], -ROOM / 2, 0, Math.PI / 2);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(PORT.r + 0.03, 0.07, 12, 48), greyMat);
  rim.position.set(-ROOM / 2 + 0.02, PORT.y, PORT.z);
  rim.rotation.y = Math.PI / 2;
  ship.add(rim);
  for (let i = 0;i < 8; i++) {
    const a = i / 8 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), whiteMat);
    b.position.set(-ROOM / 2 + 0.09, PORT.y + Math.sin(a) * (PORT.r + 0.03), PORT.z + Math.cos(a) * (PORT.r + 0.03));
    ship.add(b);
  }
  for (const [z0, z1] of [[-2.7, -1.8], [-0.35, 0.55]]) {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, z1 - z0, 10), greyMat);
    r.rotation.x = Math.PI / 2;
    r.position.set(-ROOM / 2 + 0.12, 1.05, (z0 + z1) / 2);
    ship.add(r);
    for (const z of [z0 + 0.05, z1 - 0.05]) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), greyMat);
      st.position.set(-ROOM / 2 + 0.06, 1.05, z);
      ship.add(st);
    }
  }
}
var shipHatch = new THREE.Group;
{
  const hazard = canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = "#f2c230";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#26282c";
    for (let x = -32;x < w; x += 32) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 16, 0);
      g.lineTo(x + 32, 0);
      g.lineTo(x + 16, h);
      g.fill();
    }
  });
  const door = new THREE.Mesh(new THREE.ShapeGeometry(rrect(new THREE.Shape, -HATCH.w / 2, 0, HATCH.w, HATCH.h, HATCH.r), 8), new THREE.MeshStandardMaterial({ color: 13226200, roughness: 0.4, metalness: 0.35 }));
  door.position.z = 0.02;
  shipHatch.add(door);
  const rim = new THREE.Mesh(rimGeo(HATCH.w, HATCH.h, HATCH.r, 0.08, 0.06), greyMat);
  rim.position.set(0, HATCH.h / 2, 0);
  shipHatch.add(rim);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, HATCH.h - 0.1, 0.01), greyMat);
  seam.position.set(0, HATCH.h / 2, 0.03);
  shipHatch.add(seam);
  const band = new THREE.Mesh(new THREE.PlaneGeometry(HATCH.w - 0.06, 0.1), new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.6 }));
  band.position.set(0, 0.55, 0.031);
  shipHatch.add(band);
  const win = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: 16761466, toneMapped: false }));
  win.position.set(0, 1.45, 0.031);
  shipHatch.add(win);
  const wr = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.025, 8, 24), greyMat);
  wr.position.set(0, 1.45, 0.035);
  shipHatch.add(wr);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glowMat(6160282));
  led.position.set(HATCH.w / 2 + 0.14, 1.1, 0.05);
  shipHatch.add(led);
  shipHatch.userData.led = led;
  shipHatch.position.set(-ROOM / 2 + 0.02, 0, HATCH.z);
  shipHatch.rotation.y = Math.PI / 2;
  ship.add(shipHatch);
}
for (const z of [-1.2, 1]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.14, 0.22), whiteMat);
  b.position.set(0, WALL_H - 0.07, z);
  b.castShadow = true;
  ship.add(b);
  const s = new THREE.Mesh(new THREE.BoxGeometry(ROOM, 0.015, 0.08), glowMat(13629183));
  s.position.set(0, WALL_H - 0.145, z);
  ship.add(s);
}
var consoleCanvas = document.createElement("canvas");
consoleCanvas.width = 1024;
consoleCanvas.height = 160;
var consoleTex = new THREE.CanvasTexture(consoleCanvas);
consoleTex.colorSpace = THREE.SRGBColorSpace;
consoleTex.anisotropy = 4;
var btnSeed = Array.from({ length: 24 }, () => [Math.random() * 6, 0.4 + Math.random() * 1.6, ["#ff6b6b", "#ffd166", "#5dff9a", "#7fe3ff"][Math.random() * 4 | 0]]);
var consoleBusy = 0;
function drawConsole(t) {
  const g = consoleCanvas.getContext("2d"), W = 1024, H = 160;
  g.fillStyle = "#0c1620";
  g.fillRect(0, 0, W, H);
  g.strokeStyle = "#1d3a4a";
  g.lineWidth = 2;
  g.strokeRect(4, 4, W - 8, H - 8);
  const cx = 90, cy = 80;
  g.strokeStyle = "rgba(127,227,255,.5)";
  g.lineWidth = 1.5;
  for (const r of [22, 44, 66]) {
    g.beginPath();
    g.arc(cx, cy, r, 0, 6.28);
    g.stroke();
  }
  const a = t * 1.6;
  g.fillStyle = "rgba(127,227,255,.25)";
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, 66, a - 0.6, a);
  g.fill();
  g.fillStyle = "#5dff9a";
  for (const [r, b] of [[40, 1.2], [58, 4.1], [25, 5.3]])
    g.fillRect(cx + Math.cos(b) * r - 2, cy + Math.sin(b) * r - 2, 4, 4);
  g.fillStyle = "#7fe3ff";
  g.font = "bold 26px sans-serif";
  g.fillText("星际国道 G1024 · 自动巡航", 190, 48);
  g.font = "18px monospace";
  g.fillStyle = "#9fc8d8";
  g.fillText(`SPD ${(0.82 + 0.02 * Math.sin(t * 0.3)).toFixed(3)}c   O2 98%   FUEL ${(76 - t / 600 % 10).toFixed(1)}%`, 190, 82);
  g.strokeStyle = "#5dff9a";
  g.lineWidth = 2;
  g.beginPath();
  for (let x = 0;x <= 300; x += 4)
    g.lineTo(190 + x, 120 + Math.sin(x / 18 + t * 3) * 12 * Math.sin(x / 90 + t * 0.7));
  g.stroke();
  btnSeed.forEach(([ph, sp, c], i) => {
    const x = 620 + i % 8 * 46, y = 30 + (i / 8 | 0) * 42, on = Math.sin(t * sp * (1 + consoleBusy) + ph) > 0.2;
    g.fillStyle = on ? c : "#22313d";
    g.fillRect(x, y, 34, 26);
  });
  consoleTex.needsUpdate = true;
}
drawConsole(0);
{
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.84, 0.62), whiteMat);
  base.position.set(0, 0.42, -ROOM / 2 + 0.31);
  base.castShadow = base.receiveShadow = true;
  ship.add(base);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 0.5), new THREE.MeshBasicMaterial({ map: consoleTex, toneMapped: false }));
  top.position.set(0, 0.93, -ROOM / 2 + 0.34);
  top.rotation.x = -1.1;
  ship.add(top);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.05, 0.08), greyMat);
  lip.position.set(0, 0.84, -ROOM / 2 + 0.62);
  ship.add(lip);
  for (const sx of [-1, 1]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.45), whiteMat);
    st.position.set(sx * 2.12, 0.99, -ROOM / 2 + 0.36);
    ship.add(st);
  }
}
var shipSeats = {};
function pilotSeat(key, color, x) {
  const g = new THREE.Group, cm = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.14, 0.34, 16), greyMat);
  ped.position.y = 0.17;
  g.add(ped);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.62), whiteMat);
  shell.position.y = 0.37;
  g.add(shell);
  const cush = new THREE.Mesh(puffyBox(0.62, 0.1, 0.54, 0.04, 0.02, 6), cm);
  cush.position.y = 0.45;
  g.add(cush);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.34, 0.08), cm);
  back.position.set(0, 0.58, -0.31);
  g.add(back);
  const bc = new THREE.Mesh(puffyBox(0.6, 0.26, 0.06, 0.03, 0.015, 6), cm);
  bc.position.set(0, 0.6, -0.26);
  g.add(bc);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.5), whiteMat);
    arm.position.set(sx * 0.36, 0.56, -0.02);
    g.add(arm);
    const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.05), greyMat);
    sp.position.set(sx * 0.36, 0.47, 0.15);
    g.add(sp);
  }
  g.traverse((n) => {
    if (n.isMesh) {
      n.castShadow = true;
      n.receiveShadow = true;
    }
  });
  g.position.set(x, 0, -1.45);
  g.rotation.y = Math.PI;
  ship.add(g);
  g.userData.shipSeat = key;
  shipSeats[key] = { key, pos: new THREE.Vector3(x, 0.5, -1.43), face: Math.PI, anchor: new THREE.Vector3(x, 0.75, -1.2) };
}
pilotSeat("mew", 7916990, -0.85);
pilotSeat("clawd", 14251863, 0.85);
frame("art-b", 0.22, -ROOM / 2 + 0.03, 1.75, -2.15, Math.PI / 2, ship);
frame("art-c", 0.2, -ROOM / 2 + 0.03, 1.62, 0.1, Math.PI / 2, ship);
var space = new THREE.Group;
ship.add(space);
{
  const neb = canvasTex(2048, 1024, (g, w, h) => {
    g.fillStyle = "#03040a";
    g.fillRect(0, 0, w, h);
    for (const [x, y, r, c] of [[500, 420, 420, "90,58,150"], [820, 560, 300, "31,106,122"], [1500, 380, 380, "138,58,106"], [1250, 640, 260, "60,80,170"], [200, 600, 300, "31,106,122"]]) {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${c},.22)`);
      gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
    for (let k = 0;k < 2200; k++) {
      const b = Math.random();
      g.fillStyle = `rgba(${b > 0.9 ? "255,220,200" : b > 0.8 ? "200,220,255" : "255,255,255"},${0.2 + Math.random() * 0.7})`;
      const s = Math.random() < 0.05 ? 2.5 : 1.2;
      g.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
  });
  neb.wrapS = neb.wrapT = THREE.ClampToEdgeWrapping;
  neb.repeat.set(1, 1);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(45, 48, 24), new THREE.MeshBasicMaterial({ map: neb, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.rotation.y = 1.9;
  sky.renderOrder = -1;
  space.add(sky);
  space.userData.sky = sky;
}
var STAR_N = 900;
var starPos = new Float32Array(STAR_N * 3);
function resetStar(i, far) {
  const left = Math.random() < 0.35;
  starPos[i * 3] = left ? -4 - Math.random() * 30 : (Math.random() - 0.5) * 60;
  starPos[i * 3 + 1] = (Math.random() - 0.3) * 30;
  starPos[i * 3 + 2] = far ? -40 - Math.random() * 20 : left ? -40 + Math.random() * 55 : -40 + Math.random() * 36;
}
for (let i = 0;i < STAR_N; i++)
  resetStar(i, false);
var starGeo = new THREE.BufferGeometry;
starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
var starPts = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 16777215, size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
starPts.frustumCulled = false;
space.add(starPts);
var planet = new THREE.Group;
planet.position.set(-15, -1.5, -34);
planet.rotation.set(0.35, 0, 0.28);
planet.scale.setScalar(0.72);
space.add(planet);
{
  const bands = canvasTex(512, 256, (g, w, h) => {
    for (let y = 0;y < h; y += 4) {
      const k = 0.5 + 0.5 * Math.sin(y / 9) * Math.sin(y / 23 + 1);
      g.fillStyle = `rgb(${220 - 60 * k | 0},${170 - 40 * k | 0},${190 - 20 * k | 0})`;
      g.fillRect(0, y, w, 4);
    }
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(4, 48, 32), new THREE.MeshStandardMaterial({ map: bands, roughness: 1, fog: false }));
  planet.add(ball);
  planet.userData.ball = ball;
  const ringTex = canvasTex(512, 512, (g, w, h) => {
    for (let r = 256;r > 0; r -= 2) {
      const k = Math.sin(r / 5) * 0.5 + 0.5;
      g.strokeStyle = `rgba(230,210,200,${r < 166 ? 0 : (0.15 + 0.45 * k) * Math.min(1, (256 - r) / 20)})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(256, 256, r, 0, 6.28);
      g.stroke();
    }
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 8, 96), new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false, color: 12298922 }));
  ring.rotation.x = -Math.PI / 2;
  planet.add(ring);
  const snow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 20), new THREE.MeshStandardMaterial({ color: 15266559, roughness: 0.9, fog: false }));
  snow.position.set(7, 5, -34);
  space.add(snow);
}
var sun = new THREE.DirectionalLight(16773340, 1.6);
sun.position.set(10, 6, -6);
sun.target.position.set(-10, 0, -24);
ship.add(sun, sun.target);
var meteor = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3, new THREE.Vector3]), new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, fog: false }));
meteor.geometry.setAttribute("color", new THREE.Float32BufferAttribute([1, 1, 1, 0, 0, 0], 3));
meteor.visible = false;
meteor.frustumCulled = false;
space.add(meteor);
var meteorT = 6;
var meteorV = new THREE.Vector3;
var meteorP = new THREE.Vector3;
function buildPassing(color) {
  const g = new THREE.Group, hull = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, fog: false });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 1.4, 6, 16), hull);
  body.rotation.x = Math.PI / 2;
  g.add(body);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10), new THREE.MeshStandardMaterial({ color: 10479359, roughness: 0.1, metalness: 0.2, fog: false }));
  cockpit.position.set(0, 0.2, 0.55);
  cockpit.scale.set(1, 0.7, 1.4);
  g.add(cockpit);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.5), hull);
    wing.position.set(sx * 0.55, -0.05, -0.2);
    wing.rotation.z = sx * -0.15;
    g.add(wing);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: sx < 0 ? 16732240 : 5308298, fog: false }));
    tip.position.set(sx * 1, -0.1, -0.2);
    g.add(tip);
  }
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 16), new THREE.MeshBasicMaterial({ color: 8378623, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
  flame.rotation.x = -Math.PI / 2;
  flame.position.z = -1.35;
  g.add(flame);
  g.userData.flame = flame;
  g.visible = false;
  space.add(g);
  return g;
}
var passers = [buildPassing(15330802), buildPassing(15904842), buildPassing(9414344)];
var passT = 12;
var pass = { ship: null, from: new THREE.Vector3, to: new THREE.Vector3, t: 0, dur: 1 };
function launchPasser() {
  const s = passers[Math.random() * passers.length | 0], fromLeft = Math.random() < 0.5, sx = fromLeft ? -1 : 1, z = -9 - Math.random() * 10, y = 0.5 + Math.random() * 3.5;
  pass.ship = s;
  pass.from.set(sx * (14 + z * -0.4), y, z - 6);
  pass.to.set(-sx * (14 + z * -0.4), y + (Math.random() - 0.5) * 2, z + 4);
  pass.t = 0;
  pass.dur = 7 + Math.random() * 5;
  s.visible = true;
  s.scale.setScalar(0.8 + Math.random() * 0.7);
  s.position.copy(pass.from);
  s.lookAt(pass.to);
}
var roadSign = new THREE.Group;
{
  const tex = canvasTex(512, 192, (g, w, h) => {
    g.fillStyle = "#1d6b48";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f2f2f2";
    g.lineWidth = 6;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = "#fff";
    g.font = "bold 58px sans-serif";
    g.textAlign = "center";
    g.fillText("星际国道 G1024", w / 2, 86);
    g.font = "34px sans-serif";
    g.fillText("雪星补给站  3 光年 →", w / 2, 150);
  });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.05), new THREE.MeshBasicMaterial({ map: tex, fog: false, side: THREE.DoubleSide }));
  roadSign.add(board);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8), new THREE.MeshStandardMaterial({ color: 10134446, fog: false }));
  post.position.y = -1.6;
  roadSign.add(post);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 16728128, fog: false, toneMapped: false }));
  blink.position.y = 0.65;
  roadSign.add(blink);
  roadSign.userData.blink = blink;
  roadSign.rotation.y = -0.35;
  roadSign.visible = false;
  space.add(roadSign);
}
var signT = 25;
var drifters = [];
function drifter(mesh, x, y, z) {
  mesh.castShadow = true;
  mesh.position.set(x, y, z);
  ship.add(mesh);
  drifters.push({ m: mesh, base: mesh.position.clone(), ph: Math.random() * 6, rs: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.8) });
}
drifter(new THREE.Mesh(puffyBox(0.18, 0.24, 0.06, 0.03, 0.02, 6), new THREE.MeshStandardMaterial({ color: 15249482, roughness: 0.5 })), -1.3, 2.45, -2);
{
  const jb = new THREE.Group;
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.16, 0.07), new THREE.MeshStandardMaterial({ color: 8176808, roughness: 0.6 }));
  jb.add(b);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), new THREE.MeshStandardMaterial({ color: 16747168 }));
  st.position.set(0.025, 0.12, 0);
  st.rotation.z = -0.3;
  jb.add(st);
  drifter(jb, -1.8, 2.3, -0.4);
}
drifter(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.035, 10, 20), new THREE.MeshStandardMaterial({ color: 15899573, roughness: 0.6 })), 0.2, 2.45, 0.9);
drifter(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), new THREE.MeshStandardMaterial({ color: 12618322, roughness: 0.9 })), -0.6, 1.9, 1.6);
for (let i = 0;i < 6; i++)
  drifter(new THREE.Mesh(new THREE.SphereGeometry(0.022 + Math.random() * 0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 10147583, roughness: 0.05, transparent: true, opacity: 0.55 })), -1.6 + i * 0.25, 2 + Math.sin(i) * 0.2, -0.6 + Math.cos(i * 1.7) * 0.3);
ship.add(new THREE.HemisphereLight(14674687, 1843240, 1));
ship.add(new THREE.AmbientLight(13623551, 0.25));
var consoleGlow = new THREE.PointLight(8381439, 1.2, 4, 1.6);
consoleGlow.position.set(0, 1.2, -2.2);
ship.add(consoleGlow);
var topLight = new THREE.SpotLight(16777215, 18, 7, 0.95, 0.6, 1.4);
topLight.position.set(0.2, 2.95, 0.1);
topLight.target.position.set(0.2, 0, -0.2);
topLight.castShadow = true;
topLight.shadow.mapSize.set(1024, 1024);
topLight.shadow.bias = -0.002;
ship.add(topLight, topLight.target);
var hatchGlow = new THREE.PointLight(16761466, 0.35, 1.6, 2);
hatchGlow.position.set(-ROOM / 2 + 0.4, 1.45, HATCH.z);
ship.add(hatchGlow);
var tether = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 16 }, () => new THREE.Vector3)), new THREE.LineBasicMaterial({ color: 15909424 }));
tether.frustumCulled = false;
tether.visible = false;
ship.add(tether);
var cottageDoor = new THREE.Group;
if (false) {}
var asciiFire = (() => {
  const COLS = 16, ROWS = 18, PX = 16, cv = document.createElement("canvas");
  cv.width = COLS * PX;
  cv.height = ROWS * PX;
  const g = cv.getContext("2d"), tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  const BANDS = ["#fff4c2", "#ffd34a", "#ff8a1e", "#e0441a"];
  const TONGUES = [{ x: 4.2, w: 2.6, h: 0.62 }, { x: 7.6, w: 3.4, h: 1 }, { x: 11.2, w: 2.8, h: 0.7 }, { x: 6, w: 2, h: 0.5 }, { x: 9.8, w: 2, h: 0.55 }];
  const embers = [];
  function draw(t) {
    g.clearRect(0, 0, cv.width, cv.height);
    const top = new Float32Array(COLS);
    for (const k of TONGUES) {
      const hh = k.h * (0.72 + 0.2 * Math.sin(t * (5 + k.x) + k.x * 3) + 0.12 * Math.sin(t * 11.3 + k.x)) * (ROWS - 2);
      for (let x = 0;x < COLS; x++) {
        const d = (x + 0.5 - k.x) / k.w;
        if (Math.abs(d) < 1)
          top[x] = Math.max(top[x], hh * (1 - d * d));
      }
    }
    for (let x = 0;x < COLS; x++) {
      const h = Math.round(top[x]);
      if (h < 1)
        continue;
      for (let j = 0;j < h; j++) {
        const f = (j + 0.5) / h, wob = Math.abs(x + 0.5 - COLS / 2) / (COLS / 2);
        const band = f > 0.78 ? 3 : f > 0.5 + wob * 0.1 ? 2 : f > 0.22 + wob * 0.35 ? 1 : 0;
        g.fillStyle = BANDS[band];
        g.fillRect(x * PX, (ROWS - 1 - j) * PX, PX, PX);
      }
      if (Math.random() < 0.04 && h > 4)
        embers.push({ x, y: h + 1, life: 2 + Math.random() * 2 | 0 });
    }
    for (let i = embers.length - 1;i >= 0; i--) {
      const e = embers[i];
      g.fillStyle = BANDS[e.life > 1 ? 2 : 3];
      g.fillRect(e.x * PX, (ROWS - 1 - e.y) * PX, PX, PX);
      e.y++;
      if (--e.life <= 0)
        embers.splice(i, 1);
    }
    for (let x = 1;x < COLS - 1; x++) {
      g.fillStyle = (x + (t * 3 | 0)) % 3 ? "#a8280e" : "#ff6a1a";
      g.fillRect(x * PX, (ROWS - 1) * PX, PX, PX);
    }
    tex.needsUpdate = true;
  }
  draw(0);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.63), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, toneMapped: false, side: THREE.DoubleSide }));
  mesh.renderOrder = 2;
  mesh.raycast = () => {};
  scene.add(mesh);
  const glyphTex = {};
  for (const ch of ["*", "+", "。", "'", "."])
    glyphTex[ch] = canvasTex(64, 64, (c, w, h) => {
      c.font = "bold 46px monospace";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = "#fff";
      c.fillText(ch, w / 2, h / 2 + (ch === "。" ? -6 : 0));
    });
  const GL = Object.keys(glyphTex), SPARK = ["#ffe08a", "#ffb03a", "#ff7a2a"], sparks = [];
  for (let i = 0;i < 10; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, toneMapped: false }));
    sp.visible = false;
    sp.raycast = () => {};
    sp.scale.setScalar(0.07);
    scene.add(sp);
    sparks.push({ sp, life: 0 });
  }
  const at = new THREE.Vector3;
  let nextSpark = 0, acc = 0;
  function emitSpark(t) {
    const s = sparks.find((q) => q.life <= 0);
    if (!s)
      return;
    const pop = Math.random() < 0.25;
    const ch = GL[Math.random() * GL.length | 0];
    s.sp.material.map = glyphTex[ch];
    s.sp.material.color.set(SPARK[Math.random() * 3 | 0]);
    s.sp.material.needsUpdate = true;
    s.sp.position.copy(at).add(new THREE.Vector3(0, 0.3 + Math.random() * 0.15, (Math.random() - 0.5) * 0.3));
    s.v = new THREE.Vector3(pop ? 0.25 + Math.random() * 0.25 : 0.03, 0.22 + Math.random() * 0.2, (Math.random() - 0.5) * 0.1);
    s.life = s.max = 1.6 + Math.random() * 1.4;
    s.ph = Math.random() * 6;
    s.pop = pop;
    s.sp.visible = true;
  }
  return {
    place(x, y, z) {
      mesh.position.set(x, y, z);
      at.set(x, y - 0.315, z);
    },
    tick(t, dt) {
      if (curRoom !== "cottage")
        return;
      mesh.rotation.y = Math.atan2(cam.position.x - mesh.position.x, cam.position.z - mesh.position.z);
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        draw(t);
      }
      if (t > nextSpark) {
        emitSpark(t);
        nextSpark = t + 0.5 + Math.random() * 1.8;
      }
      for (const s of sparks) {
        if (s.life <= 0)
          continue;
        s.life -= dt;
        if (s.pop)
          s.v.y -= 0.35 * dt;
        s.sp.position.addScaledVector(s.v, dt);
        s.sp.position.z += Math.sin(t * 2.5 + s.ph) * 0.05 * dt;
        const k = Math.max(0, s.life / s.max);
        s.sp.material.opacity = Math.min(1, k * 2.2) * (0.75 + 0.25 * Math.sin(t * 13 + s.ph));
        if (s.life <= 0 || s.sp.position.y < 0.05) {
          s.life = 0;
          s.sp.visible = false;
        }
      }
    }
  };
})();
function addGoggles(cr, { w, d, r, y, out, lensX, lensR = 0.075 }) {
  const m = cr.p.children[0], g = new THREE.Group;
  const strap = new THREE.Mesh(rimGeo(w + out * 2, d + out * 2, r + out, 0.03, 0.07), new THREE.MeshStandardMaterial({ color: 3817290, roughness: 0.8 }));
  strap.rotation.x = -Math.PI / 2;
  strap.position.y = y - 0.035;
  g.add(strap);
  const rimMat = new THREE.MeshStandardMaterial({ color: 13226716, metalness: 0.6, roughness: 0.3 }), glass = new THREE.MeshStandardMaterial({ color: 8381439, emissive: 1727088, roughness: 0.1, transparent: true, opacity: 0.85 });
  for (const sx of [-1, 1]) {
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(lensR, lensR, 0.05, 20), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(sx * lensX, y, d / 2 + out + 0.045);
    g.add(rim);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(lensR * 0.78, 20), glass);
    gl.position.set(sx * lensX, y, d / 2 + out + 0.071);
    g.add(gl);
  }
  g.traverse((n) => {
    if (n.isMesh)
      n.raycast = () => {};
  });
  g.visible = false;
  m.add(g);
  cr.goggles = g;
}
var CAMS = {
  cottage: { pos: [4.2, 2.9, 4.4], target: [-0.2, 0.6, -0.4], az: [-Infinity, Infinity], polar: [0.05, 1.5], tall: [-1.5, 0.6, 0.5] },
  ship: { pos: [4.3, 2.5, 4.4], target: [-0.4, 1.2, -0.5], az: [-Infinity, Infinity], polar: [0.05, 1.5] }
};
var HINTS = {
  cottage: "点喵喵章鱼戳醒它 · 点家具让它过去坐 · 点打字机给它留言 · 点窗户换天气 · 点望远镜上飞船 · 拖动转视角 · 右键拖动平移 · 滚轮远近",
  ship: "点喵喵章鱼戳醒它 · 点驾驶座让它去开船 · 点舱门回小屋 · 拖动转视角 · 右键拖动平移 · 滚轮远近"
};
function resetView(key = curRoom) {
  const C = CAMS[key], tg = new THREE.Vector3(...innerWidth < innerHeight && C.tall ? C.tall : C.target);
  ctl.target.copy(tg);
  cam.position.copy(tg).add(new THREE.Vector3(...C.pos).sub(new THREE.Vector3(...C.target)));
}
function showRoom(key) {
  if (!ROOMS[key])
    return;
  curRoom = key;
  for (const [k, g] of Object.entries(ROOMS))
    g.visible = k === key;
  const C = CAMS[key];
  resetView(key);
  ctl.minAzimuthAngle = C.az[0];
  ctl.maxAzimuthAngle = C.az[1];
  ctl.minPolarAngle = C.polar[0];
  ctl.maxPolarAngle = C.polar[1];
  const hint = document.getElementById("hint");
  if (hint)
    hint.textContent = matchMedia("(pointer:coarse)").matches ? HINTS[key].replace("拖动转视角 · 右键拖动平移 · 滚轮远近", "单指转视角 · 双指拖动平移、捏合远近") : HINTS[key];
  if (lightUI) {
    lightUI.style.display = key === "cottage" ? "" : "none";
    if (key !== "cottage")
      document.getElementById("lightBox")?.classList.remove("open");
  }
  localStorage.setItem("cottage-room", key);
  for (const f of floaters)
    f.s.removeFromParent();
  floaters.length = 0;
  if (ritual) {
    ritual.gloom.removeFromParent();
    if (ritual.temp)
      wear(ritual.caster, ritual.who, "hand", "none", false, false);
    ritual = null;
  }
  for (const f of pixFX)
    f.pts.removeFromParent();
  pixFX.length = 0;
  if (!clawd)
    return;
  for (const cr of [clawd, mew]) {
    ROOMS[key].add(cr.p);
    if (cr.goggles)
      cr.goggles.visible = key === "ship";
    cr.sitting = cr.seatGoal = cr.target = null;
    cr.sitShifted = false;
    cr.hop = 0;
    cr.lift = 0;
    cr.state = "idle";
    cr.wait = 2;
    cr.p.rotation.set(0, cr.face, 0);
    cr.zg = null;
    cr.pilot = null;
  }
  if (key === "ship") {
    clawd.p.position.copy(shipSeats.clawd.anchor).add(new THREE.Vector3(0, 0.55, 0.1));
    mew.p.position.set(-0.3, 1.4, 0.6);
    if (mew.sleep)
      mew.sleep = false;
  } else {
    clawd.p.position.copy(SPOTS.fire).add(new THREE.Vector3(0.2, 0, 0.5));
    mew.p.position.set(-1.6, 0, 2.2);
    mew.sleep = false;
    if (clawd.sleep)
      clawd.face = clawd.p.rotation.y = -Math.PI / 2;
  }
}
var switching = false;
function goRoom(key) {
  if (switching || key === curRoom)
    return;
  switching = true;
  const fd = document.getElementById("fade");
  fd.style.opacity = 1;
  if (key === "ship") {
    shipBgm.on = true;
    audioMix();
  }
  setTimeout(() => {
    showRoom(key);
    syncShipBgm();
    fd.style.opacity = 0;
    switching = false;
  }, 450);
}
var _v = new THREE.Vector3;
function zeroG(cr, dt, t) {
  const S = cr.zg ||= { pos: cr.p.position.clone(), vel: new THREE.Vector3, goal: cr.p.position.clone(), ph: Math.random() * 6, flip: 0, spin: 0, roll: 0, pitch: 0 };
  const goal = cr.pilot ? cr.pilot.pos : S.goal, k = cr.pilot ? 3 : 0.9, c = cr.pilot ? 3.2 : 1.5;
  _v.copy(goal).sub(S.pos).multiplyScalar(k).addScaledVector(S.vel, -c);
  S.vel.addScaledVector(_v, dt);
  if (S.vel.length() > 0.6)
    S.vel.setLength(0.6);
  S.pos.addScaledVector(S.vel, dt);
  const quiet = cr.pilot ? 0.25 : 1, sp = S.vel.length();
  cr.p.position.copy(S.pos);
  cr.p.position.y += Math.sin(t * 1.1 + S.ph) * 0.05 * quiet;
  cr.p.position.x += Math.sin(t * 0.7 + S.ph * 2) * 0.02 * quiet;
  let face;
  if (cr.pilot)
    face = cr.pilot.face;
  else if (cr.sleep)
    face = (cr.face || 0) + dt * 0.15;
  else if (sp > 0.12)
    face = Math.atan2(S.vel.x, S.vel.z);
  else
    face = Math.atan2(cam.position.x - S.pos.x, cam.position.z - S.pos.z) + Math.sin(t * 0.4 + S.ph) * 0.4;
  if (cr.lookUntil && performance.now() / 1000 < cr.lookUntil)
    face = Math.atan2(cam.position.x - S.pos.x, cam.position.z - S.pos.z);
  if (cr.faceAt && performance.now() / 1000 < cr.faceAtUntil)
    face = Math.atan2(cr.faceAt.x - S.pos.x, cr.faceAt.z - S.pos.z);
  cr.face = face;
  let dr = face - cr.p.rotation.y;
  dr = Math.atan2(Math.sin(dr), Math.cos(dr));
  cr.p.rotation.y += dr * Math.min(1, dt * 3);
  if (S.spin > 0) {
    S.spin = Math.max(0, S.spin - dt * 1.3);
    cr.p.rotation.y += dt * Math.PI * 2 * 1.3;
  }
  if (S.flip > 0)
    S.flip = Math.max(0, S.flip - dt * 1.1);
  S.pitch += ((cr.pilot ? 0 : THREE.MathUtils.clamp(sp * 0.5, 0, 0.3) + Math.sin(t * 0.5 + S.ph) * 0.12 * quiet) - S.pitch) * Math.min(1, dt * 2);
  S.roll += ((cr.sleep ? Math.sin(t * 0.6) * 0.35 : Math.sin(t * 0.8 + S.ph) * 0.15 * quiet) - S.roll) * Math.min(1, dt * 2);
  cr.p.rotation.order = "YXZ";
  cr.p.rotation.x = S.pitch + (S.flip > 0 ? (1 - S.flip) * Math.PI * 2 : 0);
  cr.p.rotation.z = S.roll;
  cr.state = !cr.pilot && sp > 0.08 ? "swim" : "idle";
  const m = cr.p.children[0], sy = 1 + Math.sin(t * 2.2) * 0.018, sx = 1 - Math.sin(t * 2.2) * 0.01;
  m.scale.set(cr.base * sx, cr.base * sy * (cr.sleep ? 0.86 : 1), cr.base * sx);
  animateLimbs(cr, t, dt);
}
var randomFloat = () => new THREE.Vector3(-2.2 + Math.random() * 4.6, 0.7 + Math.random() * 1.6, -1.8 + Math.random() * 3.6);
function shipTick(dt, t) {
  const now = performance.now() / 1000;
  for (const cr of [clawd, mew]) {
    if (!cr.zg)
      zeroG(cr, 0, t);
  }
  const M = mew.zg;
  if (mew.pilot) {
    if (now > mew.pilotUntil) {
      mew.pilot = null;
      M.goal.copy(randomFloat());
      mew.wait = 3;
    }
  } else if (M.pos.distanceTo(M.goal) < 0.2 && (mew.wait -= dt) <= 0) {
    const r = Math.random();
    if (r < 0.3) {
      mew.pilot = shipSeats.mew;
      mew.pilotUntil = now + 15 + Math.random() * 15;
    } else if (r < 0.5) {
      M.goal.set(-ROOM / 2 + 0.6, PORT.y - 0.15, PORT.z);
      mew.wait = 6 + Math.random() * 5;
      mew.peek = true;
    } else {
      M.goal.copy(randomFloat());
      mew.wait = 3 + Math.random() * 6;
      mew.peek = false;
    }
  }
  if (mew.peek && !mew.pilot && M.pos.distanceTo(M.goal) < 0.3)
    mew.face = -Math.PI / 2, mew.lookUntil = 0;
  consoleBusy = mew.pilot ? 1.5 : 0;
  const C = clawd.zg;
  if (!window.FACE_LOCK) {
    if (clawd.sleep) {
      clawd.pilot = null;
      C.goal.copy(shipSeats.clawd.anchor).add(new THREE.Vector3(0, 0.6, 0.25));
    } else if (now > clawdAwakeUntil) {
      clawd.sleep = true;
      clawd.pilot = null;
    } else if (mew.pilot)
      clawd.pilot = shipSeats.clawd;
    else {
      clawd.pilot = null;
      C.goal.copy(M.pos).add(new THREE.Vector3(0.55, 0.12, 0.2));
    }
    if (!clawd.sleep && C.pos.distanceTo(M.pos) < 1.1 && Math.random() < dt * 0.5) {
      emit("♥", FX, C.pos.clone().lerp(M.pos, 0.5).add(new THREE.Vector3(0, 0.5, 0)));
      clawd.happyUntil = mew.happyUntil = now + 1.6;
      clawd.happyKind = mew.happyKind = Math.random() < 0.35 ? "heart" : "happy";
    }
  }
  if (clawd.sleep && t - lastZ > 1.6) {
    lastZ = t;
    emit("z", FX, clawd.p.position.clone().add(new THREE.Vector3(0.1, 0.45, 0)), 2.6);
  }
  clawd.drowsy = !clawd.sleep && now > clawdAwakeUntil - 4;
  maybeThink(mew, dt, mew.zg.vel.length() < 0.12);
  maybeThink(clawd, dt, clawd.zg.vel.length() < 0.12);
  zeroG(clawd, dt, t);
  zeroG(mew, dt, t + 1.3);
  if (window.FACE_LOCK)
    setExpr(clawd, window.FACE_LOCK);
  else
    updateEyes(clawd, now, dt);
  if (mew.lockFace)
    setExpr(mew, mew.lockFace);
  else
    updateEyes(mew, now, dt);
  tether.visible = clawd.sleep;
  if (tether.visible) {
    const a = shipSeats.clawd.anchor, b = clawd.p.position.clone().add(new THREE.Vector3(0, 0.12, -0.05)), p = tether.geometry.attributes.position;
    for (let i = 0;i < 16; i++) {
      const u = i / 15;
      _v.copy(a).lerp(b, u);
      _v.y -= Math.sin(u * Math.PI) * 0.12;
      _v.z += Math.sin(u * Math.PI * 2 + t) * 0.03;
      p.setXYZ(i, _v.x, _v.y, _v.z);
    }
    p.needsUpdate = true;
  }
  for (const d of drifters) {
    d.m.position.set(d.base.x + Math.sin(t * 0.23 + d.ph) * 0.25, d.base.y + Math.sin(t * 0.31 + d.ph * 2) * 0.18, d.base.z + Math.cos(t * 0.19 + d.ph) * 0.25);
    d.m.rotation.x += d.rs.x * dt;
    d.m.rotation.y += d.rs.y * dt;
    d.m.rotation.z += d.rs.z * dt;
  }
  for (let i = 0;i < STAR_N; i++) {
    starPos[i * 3 + 2] += dt * 2.2;
    const x = starPos[i * 3], z = starPos[i * 3 + 2];
    if (x > -3.6 && z > -3.2 || z > 15)
      resetStar(i, true);
  }
  starGeo.attributes.position.needsUpdate = true;
  space.userData.sky.rotation.y += dt * 0.004;
  planet.userData.ball.rotation.y += dt * 0.03;
  if ((meteorT -= dt) <= 0 && !meteor.visible) {
    meteor.visible = true;
    meteorP.set(-12 + Math.random() * 18, 7 + Math.random() * 3, -16 - Math.random() * 10);
    meteorV.set(8 + Math.random() * 6, -5 - Math.random() * 3, 0);
    meteorT = 1.6;
    flash(mew, "star", 1.6);
    flash(clawd, "star", 1.6);
  }
  if (meteor.visible) {
    meteorP.addScaledVector(meteorV, dt);
    const p = meteor.geometry.attributes.position;
    p.setXYZ(0, meteorP.x, meteorP.y, meteorP.z);
    const tail = meteorP.clone().addScaledVector(meteorV, -0.18);
    p.setXYZ(1, tail.x, tail.y, tail.z);
    p.needsUpdate = true;
    if ((meteorT -= dt) <= 0) {
      meteor.visible = false;
      meteorT = 15 + Math.random() * 25;
    }
  }
  if (pass.ship) {
    pass.t += dt / pass.dur;
    pass.ship.position.lerpVectors(pass.from, pass.to, pass.t);
    pass.ship.userData.flame.scale.set(1, 0.8 + Math.random() * 0.4, 1);
    if (pass.t >= 1) {
      pass.ship.visible = false;
      pass.ship = null;
      passT = 25 + Math.random() * 35;
    }
  } else if ((passT -= dt) <= 0) {
    launchPasser();
    flash(mew, "wow", 1.5);
    flash(clawd, "wow", 1.5);
  }
  if (roadSign.visible) {
    roadSign.position.z += dt * 5;
    roadSign.userData.blink.visible = Math.sin(t * 6) > 0;
    if (roadSign.position.z > -3) {
      roadSign.visible = false;
      signT = 90 + Math.random() * 60;
    }
  } else if ((signT -= dt) <= 0) {
    roadSign.visible = true;
    roadSign.position.set(3.4, 2.6, -55);
    setTimeout(() => {
      flash(mew, "wow", 1.5);
      flash(clawd, "wow", 1.5);
    }, 6000);
  }
  shipHatch.userData.led.visible = Math.sin(t * 2) > -0.6;
  consoleRedraw -= dt;
  if (consoleRedraw <= 0) {
    drawConsole(t);
    consoleRedraw = 0.12;
  }
}
var consoleRedraw = 0;
function shipClick() {
  const now = performance.now() / 1000;
  const targets = [clawd.p, mew.p, shipHatch, ...ship.children.filter((o) => o.userData.shipSeat)];
  const h = ray.intersectObjects(targets, true)[0];
  if (!h)
    return;
  let o = h.object;
  while (o.parent && o.parent !== ship)
    o = o.parent;
  if (o === shipHatch)
    return goRoom("cottage");
  if (o.userData.shipSeat) {
    mew.pilot = shipSeats.mew;
    mew.pilotUntil = now + 25 + Math.random() * 10;
    mew.peek = false;
    if (!clawd.sleep)
      clawdAwakeUntil = Math.max(clawdAwakeUntil, now + 40);
    emit("✓", FX, o.position.clone().add(new THREE.Vector3(0, 1, 0)), 1.2);
    return;
  }
  if (o === clawd.p) {
    clawd.sleep = false;
    clawdAwakeUntil = now + 45;
    clawd.wideUntil = now + 1.4;
    clawd.zg.flip = 1;
    clawd.lookUntil = now + 2.5;
    setTimeout(() => flash(clawd, "dizzy", 1.3), 900);
    emit("!", FX, clawd.p.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 1.2);
  } else if (o === mew.p) {
    mew.happyUntil = now + 1.8;
    mew.happyKind = "happy";
    flash(mew, "squeeze", 0.55);
    mew.zg.spin = 1;
    mew.lookUntil = now + 3;
    for (let i = 0;i < 3; i++)
      setTimeout(() => emit("♥", FX, mew.p.position.clone().add(new THREE.Vector3(0, 0.6, 0))), i * 180);
    if (!clawd.sleep)
      clawdAwakeUntil = Math.max(clawdAwakeUntil, now + 30);
  }
}
var OUTFIT_SLOTS = { hat: "帽子", face: "脸上", neck: "胸前", body: "衣服", hand: "手里" };
var OUTFITS = {
  hat: { none: "不戴", maid: "女仆头饰", wizard: "巫师帽", sorting: "分院帽", beanie: "毛线帽", straw: "草帽", crown: "小皇冠", bow: "蝴蝶结" },
  neck: { none: "不戴", bowtie: "领结", scarf: "围巾", bell: "铃铛" },
  face: { none: "不戴", blush: "腮红", glasses: "圆眼镜", scar: "闪电疤", both: "眼镜＋闪电疤" },
  body: { none: "不穿", maid: "女仆装" },
  hand: { none: "空着", wand: "魔杖" }
};
var std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
var isClawdBody = (cr) => cr === clawd && !cr.mewBody;
function shapeOf(cr) {
  const C = isClawdBody(cr) ? CLAWD : MEW, e = cr.eyes;
  const top = isClawdBody(cr) ? C.legH + C.h - 0.02 + C.furLen : C.legH + C.h - 0.03 + C.furLen;
  return {
    C,
    top,
    hatX: isClawdBody(cr) ? 0.1 : 0,
    hatS: isClawdBody(cr) ? 1 : 0.9,
    tilt: isClawdBody(cr) ? 0 : 0.12,
    eyeY: e[0].position.y,
    eyeX: Math.abs(e[0].position.x),
    eyeZ: e[0].position.z,
    chestY: isClawdBody(cr) ? C.legH + C.h * 0.28 : C.legH + C.h * 0.22
  };
}
var OUTFIT_BUILD = {
  hat: {
    wizard: () => {
      const g = new THREE.Group, blue = std(3890139);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 32), blue);
      g.add(brim);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.56, 32), blue);
      cone.position.y = 0.29;
      g.add(cone);
      for (const [a, y] of [[0.4, 0.12], [2.3, 0.22], [4.2, 0.1], [5.3, 0.32], [1.2, 0.4]]) {
        const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.032), std(16765286, { emissive: 6965760 }));
        const r = 0.24 * (1 - y / 0.56) + 0.01;
        s.position.set(Math.sin(a) * r, y, Math.cos(a) * r);
        g.add(s);
      }
      return g;
    },
    sorting: () => {
      const g = new THREE.Group, cloth = std(7032634, { roughness: 1 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.03, 28), cloth);
      g.add(brim);
      const cg = new THREE.ConeGeometry(0.25, 0.62, 28, 12), cp = cg.attributes.position;
      for (let i = 0;i < cp.count; i++) {
        const y = cp.getY(i) + 0.31, k = y / 0.62, a = Math.atan2(cp.getZ(i), cp.getX(i));
        const wr = 1 + 0.08 * Math.sin(a * 5 + y * 20) * (1 - k);
        cp.setXYZ(i, cp.getX(i) * wr + (k > 0.55 ? (k - 0.55) ** 2 * 0.9 : 0), cp.getY(i) - (k > 0.55 ? (k - 0.55) ** 2 * 0.5 : 0), cp.getZ(i) * wr);
      }
      cg.computeVertexNormals();
      const cone = new THREE.Mesh(cg, cloth);
      cone.position.y = 0.31;
      g.add(cone);
      for (const [x, y, w] of [[-0.07, 0.2, 0.1], [0.07, 0.2, 0.08], [0, 0.12, 0.14]]) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.02), std(3022872));
        f.position.set(x, y, 0.19 - y * 0.2);
        g.add(f);
      }
      return g;
    },
    beanie: () => {
      const g = new THREE.Group, knit = std(7916990, { roughness: 1 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), knit);
      dome.scale.y = 0.8;
      g.add(dome);
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 32), std(6271907, { roughness: 1 }));
      rib.position.y = 0.03;
      g.add(rib);
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), std(16643816, { roughness: 1 }));
      pom.position.y = 0.25;
      g.add(pom);
      return g;
    },
    straw: () => {
      const g = new THREE.Group, straw = std(15320170, { roughness: 0.9 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.02, 40), straw);
      g.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.15, 32), straw);
      crown.position.y = 0.085;
      g.add(crown);
      const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.232, 0.232, 0.045, 32), std(14241615));
      ribbon.position.y = 0.04;
      g.add(ribbon);
      return g;
    },
    crown: () => {
      const g = new THREE.Group, gold = std(15909424, { metalness: 0.7, roughness: 0.3 });
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.1, 32, 1, true), gold);
      band.material.side = THREE.DoubleSide;
      band.position.y = 0.05;
      g.add(band);
      for (let i = 0;i < 5; i++) {
        const a = i / 5 * Math.PI * 2, p = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 8), gold);
        p.position.set(Math.sin(a) * 0.19, 0.14, Math.cos(a) * 0.19);
        g.add(p);
        const gem = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), std([15087942, 5032432, 8449433][i % 3], { roughness: 0.2 }));
        gem.position.set(Math.sin(a) * 0.195, 0.05, Math.cos(a) * 0.195);
        g.add(gem);
      }
      return g;
    },
    bow: () => {
      const g = new THREE.Group, pink = std(15760012);
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.17, 4), pink);
        w.rotation.z = sx * Math.PI / 2;
        w.position.set(sx * 0.09, 0.07, 0);
        w.scale.set(1, 1, 0.5);
        g.add(w);
      }
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), pink);
      knot.position.y = 0.07;
      g.add(knot);
      return g;
    }
  },
  neck: {
    bowtie: (S) => {
      const g = new THREE.Group, red = std(12597547);
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.13, 4), red);
        w.rotation.z = sx * Math.PI / 2;
        w.scale.set(1, 1, 0.4);
        w.position.x = sx * 0.065;
        g.add(w);
      }
      const k = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.04), red);
      g.add(k);
      g.position.set(0, S.chestY, S.eyeZ + 0.01);
      return g;
    },
    scarf: (S) => {
      const g = new THREE.Group, C = S.C, out = C.furLen + 0.025, red = std(14241615, { roughness: 1 });
      const ring = new THREE.Mesh(rimGeo(C.w + out * 2, C.d + out * 2, C.r + out, 0.045, 0.12), red);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = S.chestY - 0.02;
      g.add(ring);
      const st = new THREE.Mesh(rimGeo(C.w + out * 2 + 0.002, C.d + out * 2 + 0.002, C.r + out, 0.047, 0.025), std(16643816, { roughness: 1 }));
      st.rotation.x = -Math.PI / 2;
      st.position.y = S.chestY + 0.028;
      g.add(st);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.26, 0.035), red);
      tail.position.set(C.w * 0.22, S.chestY - 0.1, C.d / 2 + out + 0.03);
      tail.rotation.z = 0.12;
      g.add(tail);
      return g;
    },
    bell: (S) => {
      const g = new THREE.Group, C = S.C, out = C.furLen + 0.015;
      const collar = new THREE.Mesh(rimGeo(C.w + out * 2, C.d + out * 2, C.r + out, 0.03, 0.05), std(12597547));
      collar.rotation.x = -Math.PI / 2;
      collar.position.y = S.chestY;
      g.add(collar);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), std(15909424, { metalness: 0.8, roughness: 0.25 }));
      bell.position.set(0, S.chestY - 0.03, C.d / 2 + out + 0.06);
      g.add(bell);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.008, 0.01), std(5915904));
      slit.position.set(0, S.chestY - 0.05, C.d / 2 + out + 0.114);
      g.add(slit);
      return g;
    }
  },
  face: {
    scar: (S) => {
      const g = new THREE.Group;
      const tex = canvasTex(40, 56, (c) => {
        c.fillStyle = "#8a2b2b";
        for (const [x, y] of [[3, 0], [2, 1], [1, 2], [2, 3], [3, 3], [2, 4], [1, 5], [0, 6]])
          c.fillRect(x * 5 + 5, y * 7 + 3, 5, 7);
      });
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
      m.position.set(-S.eyeX * 0.55, S.eyeY + 0.13, S.eyeZ + 0.002);
      m.renderOrder = 100;
      g.add(m);
      return g;
    },
    both: (S) => {
      const g = OUTFIT_BUILD.face.glasses(S);
      g.add(OUTFIT_BUILD.face.scar(S));
      return g;
    },
    blush: (S) => {
      const g = new THREE.Group;
      const tex = canvasTex(32, 16, (c) => {
        c.fillStyle = "rgba(240,122,140,.85)";
        for (const x of [2, 12, 22])
          c.fillRect(x, 4, 8, 8);
      });
      tex.magFilter = tex.minFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.065), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
        m.position.set(sx * (S.eyeX + 0.07), S.eyeY - 0.13, S.eyeZ + 0.004);
        m.renderOrder = 100;
        g.add(m);
      }
      return g;
    },
    glasses: (S) => {
      const g = new THREE.Group, dark = std(2829099, { roughness: 0.4 });
      for (const sx of [-1, 1]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.014, 8, 28), dark);
        r.position.set(sx * S.eyeX, S.eyeY, S.eyeZ + 0.035);
        g.add(r);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.085, 24), new THREE.MeshBasicMaterial({ color: 16777215, transparent: true, opacity: 0.12, depthWrite: false }));
        glass.position.copy(r.position).z += 0.002;
        g.add(glass);
      }
      const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, Math.max(0.02, S.eyeX * 2 - 0.18), 8), dark);
      bridge.rotation.z = Math.PI / 2;
      bridge.position.set(0, S.eyeY + 0.02, S.eyeZ + 0.035);
      g.add(bridge);
      return g;
    }
  }
};
OUTFIT_BUILD.hand = {
  wand: (S, cr) => {
    const g = new THREE.Group;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.34, 10), std(5913122, { roughness: 0.6 }));
    stick.position.y = 0.17;
    g.add(stick);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 10), std(3810326, { roughness: 0.6 }));
    grip.position.y = 0.04;
    g.add(grip);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 16773552, toneMapped: false }));
    tip.position.y = 0.35;
    g.add(tip);
    g.userData.tip = tip;
    const limbs = cr.p.children[0].userData.limbs || [];
    if (isClawdBody(cr)) {
      const arm = limbs.find((L) => L.kind === "arm" && L.sx > 0);
      g.position.set(0.16, 0.02, 0.1);
      g.rotation.set(0.45, 0, -0.75);
      g.userData.parent = arm?.grp;
    } else {
      const leg = limbs.filter((L) => L.kind === "tent").sort((a, b) => Math.abs(a.a - 0.4) - Math.abs(b.a - 0.4))[0];
      g.position.set(0.03, -0.2, 0.05);
      g.rotation.set(1.1, 0, -0.4);
      g.userData.parent = leg?.grp;
    }
    return g;
  }
};
function ruffle(geo, amp, n) {
  const p = geo.attributes.position;
  for (let i = 0;i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), k = 1 + amp * Math.sin(a * n) / Math.max(0.05, Math.hypot(x, z));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}
function flare(geo, yTop, yBot, k) {
  const p = geo.attributes.position;
  for (let i = 0;i < p.count; i++) {
    const f = 1 + k * THREE.MathUtils.clamp((yTop - p.getY(i)) / (yTop - yBot), 0, 1.4);
    p.setX(i, p.getX(i) * f);
    p.setZ(i, p.getZ(i) * f);
  }
  geo.computeVertexNormals();
  return geo;
}
function ribbon(curve, width, n, hx = 0, hz = 0) {
  const pos = [], uv = [], idx = [], P = new THREE.Vector3, T = new THREE.Vector3, N = new THREE.Vector3, B = new THREE.Vector3;
  for (let i = 0;i <= n; i++) {
    const u = i / n;
    curve.getPointAt(u, P);
    curve.getTangentAt(u, T);
    N.set(P.x - THREE.MathUtils.clamp(P.x, -hx, hx), 0, P.z - THREE.MathUtils.clamp(P.z, -hz, hz)).normalize();
    B.crossVectors(T, N).normalize();
    for (const s of [-1, 1]) {
      pos.push(P.x + B.x * s * width / 2, P.y + B.y * s * width / 2, P.z + B.z * s * width / 2);
      uv.push(u, s < 0 ? 0 : 1);
    }
    if (i) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function ringAround(S, out, t, h, y) {
  const C = S.C, g = rimGeo(C.w + out * 2, C.d + out * 2, C.r + out, t, h);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  return g;
}
function bowMesh(color, s = 1, bell = false) {
  const g = new THREE.Group, m = std(color, { roughness: 0.45 });
  for (const sx of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.11, 4), m);
    w.rotation.z = sx * Math.PI / 2;
    w.scale.set(1, 1, 0.45);
    w.position.x = sx * 0.055;
    g.add(w);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.07, 0.01), m);
    tail.position.set(sx * 0.02, -0.045, 0);
    tail.rotation.z = sx * 0.35;
    g.add(tail);
  }
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), m));
  if (bell) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), std(14211288, { metalness: 0.9, roughness: 0.2 }));
    b.position.set(0, -0.04, 0.02);
    g.add(b);
  }
  g.scale.setScalar(s);
  return g;
}
var apronTex = canvasTex(256, 160, (g, w, h) => {
  g.fillStyle = "#e9e6e6";
  g.beginPath();
  g.moveTo(14, 0);
  g.lineTo(w - 14, 0);
  g.lineTo(w - 14, h - 34);
  for (let x = w - 14;x >= 14; x -= 19)
    g.arc(x - 9.5, h - 34, 9.5, 0, Math.PI);
  g.closePath();
  g.fill();
  g.fillStyle = "#fbfbfb";
  g.beginPath();
  g.moveTo(26, 0);
  g.lineTo(w - 26, 0);
  g.lineTo(w - 26, h - 50);
  g.quadraticCurveTo(w / 2, h - 30, 26, h - 50);
  g.closePath();
  g.fill();
  g.fillStyle = "#1c1a1a";
  for (const [cx, cy] of [[62, 82], [w - 62, 82]]) {
    g.beginPath();
    g.ellipse(cx, cy + 6, 11, 9, 0, 0, 6.28);
    g.fill();
    for (const [dx, dy] of [[-12, -9], [-4, -15], [4, -15], [12, -9]]) {
      g.beginPath();
      g.arc(cx + dx, cy + dy, 4.2, 0, 6.28);
      g.fill();
    }
  }
});
apronTex.wrapS = apronTex.wrapT = THREE.ClampToEdgeWrapping;
var frillTex = canvasTex(256, 32, (g, w, h) => {
  g.fillStyle = "#f6f4f4";
  g.fillRect(0, 0, w, h * 0.45);
  for (let x = 0;x < w; x += 16) {
    g.beginPath();
    g.arc(x + 8, h * 0.45, 8, 0, Math.PI);
    g.fill();
  }
  g.fillStyle = "rgba(0,0,0,.08)";
  for (let x = 0;x < w; x += 8)
    g.fillRect(x, 0, 1, h * 0.45);
});
frillTex.wrapS = THREE.RepeatWrapping;
frillTex.wrapT = THREE.ClampToEdgeWrapping;
var strapTex = canvasTex(256, 64, (g, w, h) => {
  g.fillStyle = "#f2efef";
  for (let x = 0;x < w; x += 12) {
    g.beginPath();
    g.arc(x + 6, h * 0.3, 6, Math.PI, 0);
    g.fill();
    g.beginPath();
    g.arc(x + 6, h * 0.7, 6, 0, Math.PI);
    g.fill();
  }
  g.fillRect(0, h * 0.3, w, h * 0.4);
  g.fillStyle = "rgba(0,0,0,.09)";
  for (let x = 0;x < w; x += 6) {
    g.fillRect(x, h * 0.2, 1, h * 0.12);
    g.fillRect(x, h * 0.68, 1, h * 0.12);
  }
  g.fillStyle = "#ffffff";
  g.fillRect(0, h * 0.36, w, h * 0.28);
  g.fillStyle = "rgba(0,0,0,.12)";
  g.fillRect(0, h * 0.36, w, 1.5);
  g.fillRect(0, h * 0.64 - 1.5, w, 1.5);
});
strapTex.wrapS = THREE.RepeatWrapping;
strapTex.wrapT = THREE.ClampToEdgeWrapping;
var frillMat = (rep = 1) => {
  const t = frillTex.clone();
  t.needsUpdate = true;
  t.repeat.set(rep, 1);
  return new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 });
};
function shapeExtra(cr) {
  const C = isClawdBody(cr) ? CLAWD : MEW, bottom = C.legH - (isClawdBody(cr) ? 0.02 : 0.03), top = bottom + C.h;
  return { bottom, top, front: C.d / 2 + C.furLen + C.puff * 0.6 };
}
OUTFIT_BUILD.body = {
  maid: (S, cr) => {
    const g = new THREE.Group, C = S.C, X = shapeExtra(cr), H = X.top - X.bottom, k = C.w;
    const skirtTop = X.bottom + H * 0.36, skirtBot = X.bottom + H * 0.06;
    const black = std(1907488, { roughness: 0.85 }), white = std(16184564, { roughness: 0.8 });
    const skirt = new THREE.Mesh(flare(ruffle(ringAround(S, C.furLen + 0.03, 0.03, skirtTop - skirtBot, skirtBot), 0.012, 26), skirtTop, skirtBot, 0.1), black);
    g.add(skirt);
    const hem = new THREE.Mesh(flare(ruffle(ringAround(S, C.furLen + 0.05, 0.025, 0.09, skirtBot - 0.07), 0.022, 44), skirtTop, skirtBot, 0.1), white);
    g.add(hem);
    const band = new THREE.Mesh(ringAround(S, C.furLen + 0.04, 0.02, 0.04, skirtTop - 0.01), white);
    g.add(band);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(C.w * 0.58, C.w * 0.58 * 160 / 256), new THREE.MeshStandardMaterial({ map: apronTex, transparent: true, alphaTest: 0.3, roughness: 0.8 }));
    apron.position.set(0, skirtTop - C.w * 0.58 * 160 / 256 / 2 + 0.01, X.front + 0.1);
    apron.rotation.x = -0.28;
    g.add(apron);
    const fb = bowMesh(1907488, k, true);
    fb.position.set(0, skirtTop + 0.015, X.front + 0.085);
    g.add(fb);
    for (const sx of [-1, 1]) {
      const sb = bowMesh(1907488, k * 0.6);
      sb.position.set(sx * (C.w / 2 + C.furLen + 0.05), skirtTop - 0.02, 0);
      sb.rotation.y = sx * Math.PI / 2;
      g.add(sb);
      const off = C.furLen + 0.035, sideX = C.w / 2 + off, bz = C.d / 2 + off, cx = C.w / 2 - C.r + (C.r + off) * 0.72, cz = C.d / 2 - C.r + (C.r + off) * 0.72;
      const hi = isClawdBody(cr) ? C.legH + C.h * C.armY + C.earR + 0.06 : X.bottom + H * 0.62;
      const pts = [[C.w * 0.27, skirtTop, bz], [C.w * 0.43, (skirtTop + hi) / 2, bz], [cx, hi - 0.02, cz], [sideX, hi, 0], [cx, hi - 0.02, -cz], [C.w * 0.43, (skirtTop + hi) / 2, -bz], [C.w * 0.27, skirtTop, -bz]].map(([x, y, z]) => new THREE.Vector3(sx * x, y, z));
      const st = strapTex.clone();
      st.needsUpdate = true;
      st.repeat.set(6, 1);
      g.add(new THREE.Mesh(ribbon(new THREE.CatmullRomCurve3(pts), 0.13, 64, C.w / 2 - C.r, C.d / 2 - C.r), new THREE.MeshStandardMaterial({ map: st, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.8 })));
    }
    const back = bowMesh(16184564, k * 2.1);
    back.position.set(0, skirtTop - 0.03, -(X.front + 0.09));
    back.rotation.y = Math.PI;
    g.add(back);
    return g;
  }
};
OUTFIT_BUILD.hat.maid = (S, cr) => {
  const g = new THREE.Group, C = S.C, X = shapeExtra(cr), mewish = cr !== clawd, w = mewish ? C.w * 0.42 : C.w * 0.92;
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.085, 24, 1), frillMat(w * 3));
  const fp = fr.geometry.attributes.position;
  for (let i = 0;i < fp.count; i++)
    fp.setZ(i, -((fp.getX(i) / (w / 2)) ** 2) * 0.04 + Math.sin(fp.getX(i) * 70) * 0.006);
  fr.geometry.computeVertexNormals();
  fr.rotation.x = Math.PI;
  fr.position.set(0, 0.04, 0.02);
  g.add(fr);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.018, 0.03), std(1907488));
  strip.position.set(0, 0.006, 0.02);
  g.add(strip);
  for (const sx of [-1, 1]) {
    const b = bowMesh(1907488, mewish ? 0.7 : 1);
    b.position.set(sx * (w / 2 + 0.02), 0.035, 0.03);
    b.rotation.z = -sx * 0.4;
    g.add(b);
  }
  g.userData.raw = true;
  return g;
};
var OUTFIT_KEY = "cottage-outfit";
var outfitState = (() => {
  try {
    return JSON.parse(localStorage.getItem(OUTFIT_KEY)) || {};
  } catch {
    return {};
  }
})();
function wear(cr, who, slot, item, fx = false, persist = true) {
  const m = cr.p.children[0];
  cr.outfit ||= {};
  if (cr.outfit[slot]) {
    cr.outfit[slot].removeFromParent();
    cr.outfit[slot] = null;
  }
  if (persist) {
    (outfitState[who] ||= {})[slot] = item;
    localStorage.setItem(OUTFIT_KEY, JSON.stringify(outfitState));
  }
  const build = OUTFIT_BUILD[slot][item];
  if (build) {
    const S = shapeOf(cr), g = build(S, cr);
    if (slot === "hat" && g.userData.raw) {
      g.position.y += S.top - 0.01;
      cr.outfit[slot] = g;
    } else if (slot === "hat") {
      const h = new THREE.Group;
      h.add(g);
      g.scale.setScalar(S.hatS);
      h.position.set(S.hatX, S.top + (isClawdBody(cr) ? -0.015 : 0.025), 0);
      h.rotation.z = S.tilt;
      cr.outfit[slot] = h;
    } else
      cr.outfit[slot] = g;
    cr.outfit[slot].traverse((n) => {
      if (n.isMesh)
        n.castShadow = true;
    });
    (g.userData.parent || m).add(cr.outfit[slot]);
  }
  if (fx && item === "sorting") {
    flash(cr, "think", 1.8);
    emit("…", FX, cr.p.position.clone().add(new THREE.Vector3(0, 0.9, 0)), 1.8);
    setTimeout(() => {
      emit("格兰芬多！", FX, cr.p.position.clone().add(new THREE.Vector3(0, 0.95, 0)), 2.2);
      flash(cr, "star", 1.4);
      cr.hop = 0.6;
    }, 1900);
    return;
  }
  if (fx && item === "wand") {
    setTimeout(() => {
      const tip = cr.outfit.hand?.userData.tip;
      if (tip)
        emit("✦", FX, tip.getWorldPosition(new THREE.Vector3).add(new THREE.Vector3(0, 0.1, 0)), 1.2);
    }, 200);
  }
  if (fx) {
    flash(cr, "star", 1.2);
    cr.hop = 0.6;
    emit("✦", FX, cr.p.position.clone().add(new THREE.Vector3(0, 0.75, 0)), 1.4);
  }
}
function applyOutfits() {
  const hm = location.hash.match(/wear=([\w.,]+)/);
  if (hm)
    for (const t of hm[1].split(",")) {
      const [who, slot, item] = t.split(".");
      if (OUTFITS[slot]?.[item])
        (outfitState[who] ||= {})[slot] = item;
    }
  for (const [who, cr] of [["clawd", clawd], ["mew", mew]])
    for (const slot of Object.keys(OUTFIT_SLOTS)) {
      const it = outfitState[who]?.[slot];
      if (it && it !== "none")
        try {
          wear(cr, who, slot, it);
        } catch (e) {
          console.error(e);
          wear(cr, who, slot, "none");
          showErr(`换装 ${who}.${slot}.${it}：${e.message}`);
        }
    }
  buildWardrobeUI();
  buildBiuUI();
  buildLightUI();
  buildPaperUI();
  buildMusicUI();
  buildDock();
  if (/[#&]paper(&|$)/.test(location.hash))
    setTimeout(() => window.openPaper(), 800);
  {
    const lm = location.hash.match(/lights=([\w,]*)/);
    if (lm) {
      const on = lm[1].split(",");
      for (const k of Object.keys(lights))
        lights[k] = on.includes(k);
      applyLights();
    }
  }
  if (/[#&]fxtest(&|$)/.test(location.hash))
    ["♥", "✦", "✓", "z", "!", "…", "咕", "☀", "☂", "❄", "biu~", "格兰芬多！"].forEach((ch, i) => {
      const s = ch.length > 1 ? labelSprite(ch, FX, 0.12) : textSprite(ch, FX);
      s.position.copy(clawd.p.position).add(new THREE.Vector3(-1.1 + i % 6 * 0.45, 1 - (i / 6 | 0) * 0.35, 0.3));
      ROOMS[curRoom].add(s);
    });
  if (/[#&]music(&|$)/.test(location.hash))
    setTimeout(() => {
      window.openMusic();
      for (const k of ["fire", "rain"])
        toggleAmb(k);
      playSong(0);
      musicRender();
    }, 800);
  {
    const bm = location.hash.match(/biu=([^&]*)/);
    if (bm)
      setTimeout(() => biu(decodeURIComponent(bm[1])), 600);
  }
}
function buildWardrobeUI() {
  const css = document.createElement("style");
  css.textContent = `#wardBtn{position:fixed;right:14px;bottom:14px;padding:8px 14px;border-radius:18px;border:1px solid #6a4a35;background:rgba(30,20,15,.82);color:#f0dcc4;font-size:12px;cursor:pointer;font-family:inherit}
#ward{position:fixed;right:14px;bottom:58px;display:none;gap:14px;padding:12px 14px;border-radius:14px;background:rgba(30,20,15,.9);border:1px solid #6a4a35;font-size:12px;max-width:calc(100vw - 28px);flex-wrap:wrap}
#ward.open{display:flex}#ward h4{margin:0 0 6px;font-size:12px;color:#ffd27a}#ward .slot{margin:4px 0 2px;opacity:.7;font-size:12px}
#ward button{margin:2px 3px 2px 0;padding:3px 8px;border-radius:10px;border:1px solid #5a4030;background:#3a2a20;color:#e8d8c4;cursor:pointer;font-family:inherit;font-size:12px}
#ward button.on{background:#c98a4a;color:#1e1410;border-color:#ffd27a}`;
  document.head.appendChild(css);
  const btn = document.createElement("button");
  btn.id = "wardBtn";
  btn.textContent = "※ 衣橱";
  document.body.appendChild(btn);
  const panel = document.createElement("div");
  panel.id = "ward";
  document.body.appendChild(panel);
  btn.onclick = () => panel.classList.toggle("open");
  const render = () => {
    panel.innerHTML = "";
    for (const [who, cr, name] of [["clawd", clawd, "喵喵章鱼"]]) {
      const col = document.createElement("div");
      col.innerHTML = `<h4>${name}</h4>`;
      for (const [slot, label] of Object.entries(OUTFIT_SLOTS)) {
        const row = document.createElement("div");
        row.innerHTML = `<div class="slot">${label}</div>`;
        for (const [item, txt] of Object.entries(OUTFITS[slot])) {
          const b = document.createElement("button");
          b.textContent = txt;
          if ((outfitState[who]?.[slot] || "none") === item)
            b.className = "on";
          b.onclick = () => {
            wear(cr, who, slot, item, true);
            render();
          };
          row.appendChild(b);
        }
        col.appendChild(row);
      }
      panel.appendChild(col);
    }
  };
  render();
}
var pixFX = [];
function pixelBurst(pos, colors, n = 80, speed = 1.5, life = 1.4, size = 0.045) {
  const P = new Float32Array(n * 3), Cc = new Float32Array(n * 3), V = [], col = new THREE.Color;
  for (let i = 0;i < n; i++) {
    P.set([pos.x, pos.y, pos.z], i * 3);
    const v = new THREE.Vector3().randomDirection().multiplyScalar(speed * (0.35 + Math.random() * 0.8));
    v.y += curRoom === "ship" ? 0 : 0.6;
    V.push(v);
    col.set(colors[Math.random() * colors.length | 0]);
    Cc.set([col.r, col.g, col.b], i * 3);
  }
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.setAttribute("color", new THREE.BufferAttribute(Cc, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
  pts.frustumCulled = false;
  ROOMS[curRoom].add(pts);
  pixFX.push({ pts, V, life, max: life, size, grav: curRoom === "ship" ? 0 : 1.6 });
}
function pixelBeam(a, b) {
  const n = 26, P = new Float32Array(n * 3), Cc = new Float32Array(n * 3), col = new THREE.Color;
  for (let i = 0;i < n; i++) {
    const p = a.clone().lerp(b, i / (n - 1));
    P.set([p.x, p.y, p.z], i * 3);
    col.set(FX);
    Cc.set([col.r, col.g, col.b], i * 3);
  }
  const g = new THREE.BufferGeometry;
  g.setAttribute("position", new THREE.BufferAttribute(P, 3));
  g.setAttribute("color", new THREE.BufferAttribute(Cc, 3));
  g.setDrawRange(0, 0);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
  pts.frustumCulled = false;
  ROOMS[curRoom].add(pts);
  pixFX.push({ pts, V: null, beam: n, life: 0.45, max: 0.45, size: 0.05, grav: 0 });
}
function pixTick(dt) {
  for (let i = pixFX.length - 1;i >= 0; i--) {
    const f = pixFX[i];
    f.life -= dt;
    const k = Math.max(0, f.life / f.max);
    if (f.beam)
      f.pts.geometry.setDrawRange(0, Math.min(f.beam, Math.ceil((1 - k) * f.beam * 5)));
    else {
      const p = f.pts.geometry.attributes.position;
      f.V.forEach((v, j) => {
        v.y -= f.grav * dt;
        v.multiplyScalar(1 - dt * 1.2);
        p.setXYZ(j, p.getX(j) + v.x * dt, p.getY(j) + v.y * dt, p.getZ(j) + v.z * dt);
      });
      p.needsUpdate = true;
    }
    f.pts.material.opacity = Math.min(1, k * 2.5);
    f.pts.material.size = f.size * (0.5 + 0.5 * k);
    if (f.life <= 0) {
      f.pts.removeFromParent();
      f.pts.geometry.dispose();
      pixFX.splice(i, 1);
    }
  }
}
function labelSprite(text, color = FX, h = 0.09) {
  const s = pixelSprite(text, color, h / 11);
  s.renderOrder = 120;
  return s;
}
var gloomFace = (() => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 32;
  const g = c.getContext("2d");
  g.fillStyle = "#16121c";
  for (const [x, y] of [[10, 4], [14, 8], [50, 4], [46, 8], [14, 14], [46, 14], [26, 24], [30, 22], [34, 22], [38, 24]])
    g.fillRect(x, y, 4, 4);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
function makeGloom(text) {
  const g = new THREE.Group;
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13, 1), new THREE.MeshStandardMaterial({ color: 5591146, roughness: 0.95, flatShading: true }));
  ball.castShadow = true;
  g.add(ball);
  g.userData.ball = ball;
  const face = new THREE.Sprite(new THREE.SpriteMaterial({ map: gloomFace, transparent: true, depthTest: false }));
  face.scale.set(0.15, 0.075, 1);
  face.renderOrder = 110;
  g.add(face);
  g.userData.face = face;
  for (let i = 0;i < 6; i++) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.025), new THREE.MeshBasicMaterial({ color: 3814726 }));
    m.userData.a = i / 6 * Math.PI * 2;
    g.add(m);
    (g.userData.motes ||= []).push(m);
  }
  if (text) {
    const l = labelSprite(text.slice(0, 24));
    l.position.y = 0.25;
    g.add(l);
    g.userData.label = l;
  }
  return g;
}
var ritual = null;
function biu(text) {
  if (ritual || !clawd || switching)
    return;
  const now = performance.now() / 1000;
  const awake = [mew, clawd].filter((c) => !c.sleep), caster = awake.find((c) => c.outfit?.hand) || mew;
  const who = caster === mew ? "mew" : "clawd", temp = !caster.outfit?.hand;
  if (temp)
    wear(caster, who, "hand", "wand", false, false);
  const cp = caster.p.position, toCam = cam.position.clone().sub(cp).setY(0).normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(toCam);
  const at = cp.clone().addScaledVector(toCam, 0.45).addScaledVector(side, caster === mew ? -0.6 : 0.6).add(new THREE.Vector3(0, curRoom === "ship" ? 0.1 : 0.45, 0));
  const gloom = makeGloom(text);
  gloom.position.copy(at);
  gloom.scale.setScalar(0.01);
  ROOMS[curRoom].add(gloom);
  ritual = { t: 0, t0: now, gloom, caster, who, temp, at, step: 0 };
  for (const c of awake) {
    c.faceAt = at;
    c.faceAtUntil = now + 4.2;
    flash(c, "wide", 0.9);
    if (c.state === "walk") {
      c.target = null;
      c.seatGoal = null;
      c.state = "idle";
      c.wait = 6;
    }
    if (c.zg && !c.pilot)
      c.zg.goal.copy(c.zg.pos);
  }
}
function ritualTick(dt, t) {
  pixTick(dt);
  const r = ritual;
  if (!r)
    return;
  const g = r.gloom, now = performance.now() / 1000;
  r.t = now - r.t0;
  if (r.step < 3) {
    const s = r.t < 0.35 ? r.t / 0.35 * 1.15 : r.t < 0.5 ? 1.15 - (r.t - 0.35) / 0.15 * 0.15 : 1;
    g.scale.setScalar(Math.max(0.01, s));
    g.position.copy(r.at).add(new THREE.Vector3(Math.sin(t * 37) * 0.008, Math.sin(t * 2.2) * 0.03, Math.cos(t * 41) * 0.008));
    g.userData.ball.rotation.y += dt * 1.5;
    g.userData.ball.rotation.x = Math.sin(t * 3) * 0.3;
    g.userData.face.position.copy(cam.position).sub(g.position).normalize().multiplyScalar(0.11);
    for (const m of g.userData.motes) {
      const a = m.userData.a + t * 2.4;
      m.position.set(Math.cos(a) * 0.2, Math.sin(a * 2) * 0.05 + 0.02, Math.sin(a) * 0.2);
    }
  }
  if (r.step === 0 && r.t > 1) {
    r.step = 1;
    flash(r.caster, "squeeze", 0.8);
    r.caster.happyUntil = now + 1.4;
    r.caster.happyKind = "happy";
  }
  if (r.step === 1 && r.t > 1.25) {
    r.step = 2;
    const tip = r.caster.outfit.hand?.userData.tip;
    if (tip)
      emit("✦", FX, tip.getWorldPosition(new THREE.Vector3), 0.8);
  }
  if (r.step === 2 && r.t > 1.7) {
    r.step = 3;
    const tip = r.caster.outfit.hand?.userData.tip, a = tip ? tip.getWorldPosition(new THREE.Vector3) : r.caster.p.position.clone().add(new THREE.Vector3(0, 0.4, 0));
    pixelBeam(a, g.position.clone());
    const b = labelSprite("biu~", FX, 0.12);
    b.position.copy(r.caster.p.position).add(new THREE.Vector3(0, 0.85, 0));
    ROOMS[curRoom].add(b);
    floaters.push({ s: b, life: 1.4, max: 1.4, vx: 0.05 });
  }
  if (r.step === 3 && r.t > 1.85) {
    r.step = 4;
    const p = g.position.clone();
    g.removeFromParent();
    pixelBurst(p, [FX], 110, 1.6, 1.6, 0.05);
    pixelBurst(p, ["#3a3546", "#55506a"], 18, 0.8, 0.9, 0.04);
    for (const c of [mew, clawd]) {
      flash(c, "star", 1.5);
      if (!c.sleep && c.zg)
        c.zg.spin = 1;
      if (!c.sleep)
        c.hop = 0.6;
    }
  }
  if (r.step === 4 && r.t > 2.9) {
    r.step = 5;
    for (const c of [mew, clawd])
      if (!c.sleep) {
        c.happyUntil = now + 2;
        c.happyKind = Math.random() < 0.5 ? "heart" : "happy";
        for (let i = 0;i < 2; i++)
          setTimeout(() => emit("♥", FX, c.p.position.clone().add(new THREE.Vector3(0, 0.7, 0))), i * 220);
      }
  }
  if (r.step === 5 && r.t > 4.2) {
    if (r.temp)
      wear(r.caster, r.who, "hand", "none", false, false);
    ritual = null;
  }
}
function applyLights() {
  for (const b of bulbs)
    b.visible = lights.string;
  for (const w of stringWires)
    w.visible = lights.string;
  localStorage.setItem(LIGHTS_KEY, JSON.stringify(lights));
}
function buildLightUI() {
  const css = document.createElement("style");
  css.textContent = `#lightBtn{position:fixed;right:224px;bottom:14px;padding:8px 14px;border-radius:18px;border:1px solid #6a4a35;background:rgba(30,20,15,.82);color:#f0dcc4;font-size:12px;cursor:pointer;font-family:inherit}
#lightBox{position:fixed;right:224px;bottom:58px;display:none;padding:10px 12px;border-radius:14px;background:rgba(30,20,15,.92);border:1px solid #6a4a35;font-size:12px;color:#e8d8c4}
#lightBox.open{display:block}#lightBox button{display:block;width:100%;margin:4px 0;padding:5px 12px;border-radius:10px;border:1px solid #5a4030;background:#3a2a20;color:#e8d8c4;cursor:pointer;font-family:inherit;text-align:left}
#lightBox button.on{background:#c98a4a;color:#1e1410;border-color:#ffd27a}`;
  document.head.appendChild(css);
  const btn = document.createElement("button");
  btn.id = "lightBtn";
  btn.textContent = "◎ 灯光";
  document.body.appendChild(btn);
  const box = document.createElement("div");
  box.id = "lightBox";
  document.body.appendChild(box);
  const items = [["main", "大灯"], ["lamp", "落地灯"], ["string", "墙上的小灯串"]];
  const render = () => {
    box.innerHTML = "<div style='opacity:.7;margin-bottom:4px'>壁炉一直亮着</div>";
    for (const [k, name] of items) {
      const b = document.createElement("button");
      b.textContent = (lights[k] ? "● " : "○ ") + name;
      if (lights[k])
        b.className = "on";
      b.onclick = () => {
        lights[k] = !lights[k];
        applyLights();
        render();
      };
      box.appendChild(b);
    }
  };
  btn.onclick = () => box.classList.toggle("open");
  render();
  applyLights();
  lightUI = btn;
}
var lightUI = null;
function buildBiuUI() {
  const css = document.createElement("style");
  css.textContent = `#biuBtn{position:fixed;right:104px;bottom:14px;padding:8px 14px;border-radius:18px;border:1px solid #6a4a35;background:rgba(30,20,15,.82);color:#f0dcc4;font-size:12px;cursor:pointer;font-family:inherit}
#biuBox{position:fixed;right:104px;bottom:58px;display:none;padding:10px 12px;border-radius:14px;background:rgba(30,20,15,.92);border:1px solid #6a4a35;font-size:12px;color:#e8d8c4}
#biuBox.open{display:block}#biuBox input{width:200px;margin:6px 6px 0 0;padding:5px 8px;border-radius:8px;border:1px solid #5a4030;background:#2a1e18;color:#f0dcc4;font-family:inherit}
#biuBox button{padding:5px 12px;border-radius:10px;border:1px solid #ffd27a;background:#c98a4a;color:#1e1410;cursor:pointer;font-family:inherit;font-weight:bold}`;
  document.head.appendChild(css);
  const btn = document.createElement("button");
  btn.id = "biuBtn";
  btn.textContent = "✦ 烦恼退散";
  document.body.appendChild(btn);
  const box = document.createElement("div");
  box.id = "biuBox";
  box.innerHTML = `<div>把什么团成一团？（不写也行）</div><input id="biuText" maxlength="24" placeholder="比如：论文"><button id="biuGo">biu！</button>`;
  document.body.appendChild(box);
  const input = box.querySelector("#biuText"), go = () => {
    box.classList.remove("open");
    biu(input.value.trim());
    input.value = "";
  };
  btn.onclick = () => {
    box.classList.toggle("open");
    if (box.classList.contains("open"))
      input.focus();
  };
  box.querySelector("#biuGo").onclick = go;
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      go();
    e.stopPropagation();
  });
}
SPOTS.telescope = new THREE.Vector3(1, 0, -1.7);
var TELESCOPE_RY = -Math.PI / 2;
SPOTS.typewriter = new THREE.Vector3(-1.1, 0, 1.85);
var SOLO_SEATS = new Set(["catbed", "armchair"]);
var actx = null;
function beep(freq, dur, vol = 0.05, type = "sine", when = 0) {
  try {
    actx ||= new AudioContext;
    const t = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  } catch {}
}
var ding = () => {
  beep(1760, 0.9, 0.05);
  beep(2637, 0.6, 0.02);
};
var clack = () => beep(180 + Math.random() * 60, 0.04, 0.04, "square");
var cuckooBird = new THREE.Group;
{
  const y = new THREE.MeshStandardMaterial({ color: 15320170, roughness: 0.7 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), y);
  b.scale.set(1, 0.9, 1.2);
  cuckooBird.add(b);
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), y);
  h.position.set(0, 0.04, 0.03);
  cuckooBird.add(h);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.035, 8), new THREE.MeshStandardMaterial({ color: 15167313 }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.04, 0.065);
  cuckooBird.add(beak);
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 4), new THREE.MeshBasicMaterial({ color: 1972246 }));
    e.position.set(sx * 0.015, 0.05, 0.055);
    cuckooBird.add(e);
  }
}
cuckooBird.visible = false;
var cuckoo = null;
var lastHour = new Date().getHours();
function cuckooCall(n) {
  if (!props.cuckoo || cuckoo)
    return;
  cuckoo = { t: 0, n, done: 0 };
  for (const c of [mew, clawd])
    if (c && !c.sleep) {
      c.faceAt = props.cuckoo.position.clone().setY(0);
      c.faceAtUntil = performance.now() / 1000 + 1.2 * n + 1;
      flash(c, "wow", 1.2);
    }
}
function cuckooTick(dt) {
  const d = new Date;
  if (d.getHours() !== lastHour) {
    lastHour = d.getHours();
    if (d.getMinutes() < 2)
      cuckooCall(d.getHours() % 12 || 12);
  }
  if (!cuckoo)
    return;
  cuckoo.t += dt;
  const k = cuckoo.t % 1.2, out = k < 0.25 ? k / 0.25 : k < 0.75 ? 1 : k < 1 ? 1 - (k - 0.75) / 0.25 : 0;
  cuckooBird.visible = out > 0.02;
  cuckooBird.position.z = cuckooBird.userData.z0 + out * 0.1;
  const i = Math.floor(cuckoo.t / 1.2);
  if (i >= cuckoo.done && k > 0.25 && i < cuckoo.n) {
    cuckoo.done = i + 1;
    beep(700, 0.18, 0.05, "triangle");
    beep(560, 0.25, 0.05, "triangle", 0.2);
    if (curRoom === "cottage")
      emit("咕", FX, props.cuckoo.position.clone().add(new THREE.Vector3(0.15, 0.3, 0.2)), 1.2);
  }
  if (cuckoo.t > cuckoo.n * 1.2) {
    cuckoo = null;
    cuckooBird.visible = false;
  }
}
var SEEN_KEY = "cottage-notes-seen";
var notesSeen = +localStorage.getItem(SEEN_KEY) || 0;
var mailSprite = new THREE.Group;
mailSprite.visible = false;
var STAR_COLS = ["#FF8D65", "#FFEBD5", "#FFC4AF", "#8FDBE0"];
var starTex = {};
for (const ch of ["✦", "✧"])
  starTex[ch] = canvasTex(128, 128, (g, w, h) => {
    g.font = "bold 92px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.shadowColor = "#fff";
    g.shadowBlur = 14;
    g.fillStyle = "#fff";
    g.fillText(ch, w / 2, h / 2 + 4);
  });
var mailStars = [[0, 0.36, -0.06, 0.13], [-0.13, 0.44, -0.07, 0.08], [0.12, 0.3, -0.05, 0.09], [-0.1, 0.14, 0.1, 0.07], [0.11, 0.13, 0.12, 0.08], [0.02, 0.17, 0.16, 0.06]].map(([x, y, z, sz], i) => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex[i % 2 ? "✧" : "✦"], transparent: true, depthWrite: false, depthTest: false, toneMapped: false }));
  sp.renderOrder = 5;
  sp.raycast = () => {};
  mailSprite.add(sp);
  return { sp, home: new THREE.Vector3(x, y, z), sz, next: Math.random() * 1.5, t0: -9, dur: 0.5, ci: i % 4 };
});
function tickMailStars(t) {
  for (const m of mailStars) {
    if (t > m.next) {
      m.t0 = t;
      m.dur = 0.55 + Math.random() * 0.5;
      m.next = t + m.dur + 0.15 + Math.random() * 1.1;
      m.ci = (m.ci + 1 + (Math.random() * 3 | 0)) % 4;
      m.sp.material.color.set(STAR_COLS[m.ci]);
      m.sp.material.map = starTex[Math.random() < 0.5 ? "✦" : "✧"];
    }
    const u = (t - m.t0) / m.dur;
    let k = 0;
    if (location.hash.includes("mailfull"))
      k = 1;
    else if (u >= 0 && u < 1)
      k = u < 0.25 ? u / 0.25 * 1.35 : u < 0.4 ? 1.35 - (u - 0.25) / 0.15 * 0.35 : 1 - Math.max(0, (u - 0.7) / 0.3);
    const flick = 1 + 0.12 * Math.sin(t * 23 + m.home.x * 40) * Math.sin(t * 9.7 + m.home.z * 30);
    m.sp.scale.setScalar(Math.max(0.0001, m.sz * 2.1 * k * flick));
    m.sp.material.opacity = Math.min(1, k * 1.4);
    m.sp.position.set(m.home.x + Math.sin(t * 6 + m.home.y * 20) * 0.006, m.home.y + (u > 0 && u < 1 ? u * 0.04 : 0), m.home.z);
  }
}
var MUSIC_KEY = "cottage-music";
var musicPref = Object.assign({ vn: 0.6, vm: 0.6 }, JSON.parse(localStorage.getItem(MUSIC_KEY) || "{}"));
var mix = null;
function audioMix() {
  actx ||= new AudioContext;
  if (actx.state === "suspended")
    actx.resume();
  if (mix)
    return mix;
  const A = actx, noise = A.createGain(), music = A.createGain(), verb = A.createConvolver(), wet = A.createGain();
  noise.gain.value = musicPref.vn;
  music.gain.value = musicPref.vm;
  wet.gain.value = 0.35;
  const len = A.sampleRate * 2.2, ir = A.createBuffer(2, len, A.sampleRate);
  for (let ch = 0;ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0;i < len; i++)
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  verb.buffer = ir;
  noise.connect(A.destination);
  music.connect(A.destination);
  music.connect(verb).connect(wet).connect(A.destination);
  const buf = (kind) => {
    const n = A.sampleRate * 4, b = A.createBuffer(1, n, A.sampleRate), d = b.getChannelData(0);
    let l = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0;i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "brown") {
        l = (l + 0.02 * w) / 1.02;
        d[i] = l * 3.5;
      } else if (kind === "pink") {
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.18;
      } else
        d[i] = w;
    }
    return b;
  };
  mix = { noise, music, buf: { white: buf("white"), pink: buf("pink"), brown: buf("brown") }, amb: {} };
  return mix;
}
function loopSrc(kind, dest) {
  const s = actx.createBufferSource();
  s.buffer = mix.buf[kind];
  s.loop = true;
  s.loopStart = Math.random();
  s.connect(dest);
  s.start();
  return s;
}
function filt(type, f, q = 0.7) {
  const b = actx.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  return b;
}
function lfo(hz, depth, param) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.frequency.value = hz;
  g.gain.value = depth;
  o.connect(g).connect(param);
  o.start();
  return o;
}
function burst(dest, when, dur, f, vol) {
  const s = actx.createBufferSource(), g = actx.createGain(), b = filt("bandpass", f, 1.5);
  s.buffer = mix.buf.white;
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  s.connect(b).connect(g).connect(dest);
  s.start(when, Math.random() * 3, dur + 0.02);
}
var AMBIENCE = {
  fire: { name: "壁炉", start(out) {
    const lp = filt("lowpass", 420), g = actx.createGain();
    g.gain.value = 0.55;
    lp.connect(g).connect(out);
    const s = loopSrc("brown", lp);
    const id = setInterval(() => {
      const now = actx.currentTime;
      if (Math.random() < 0.35)
        burst(out, now + Math.random() * 0.1, 0.02 + Math.random() * 0.05, 1800 + Math.random() * 3000, 0.08 + Math.random() * 0.35);
      if (Math.random() < 0.03)
        for (let i = 0;i < 4; i++)
          burst(out, now + i * 0.03 + Math.random() * 0.02, 0.02, 2500 + Math.random() * 2000, 0.2);
    }, 60);
    return () => {
      clearInterval(id);
      s.stop();
      g.disconnect();
    };
  } },
  rain: { name: "雨", start(out) {
    const hp = filt("highpass", 700), lp = filt("lowpass", 5200), g = actx.createGain();
    g.gain.value = 0.5;
    hp.connect(lp).connect(g).connect(out);
    const s = loopSrc("pink", hp);
    const id = setInterval(() => {
      const now = actx.currentTime;
      for (let i = 0;i < 3; i++)
        if (Math.random() < 0.5)
          burst(out, now + Math.random() * 0.08, 0.012, 2500 + Math.random() * 4000, 0.03 + Math.random() * 0.08);
    }, 50);
    return () => {
      clearInterval(id);
      s.stop();
      g.disconnect();
    };
  } },
  wind: { name: "风雪", start(out) {
    const bp = filt("bandpass", 520, 1.4), g = actx.createGain();
    g.gain.value = 0.9;
    bp.connect(g).connect(out);
    const s = loopSrc("pink", bp);
    const a = lfo(0.07, 260, bp.frequency), b = lfo(0.11, 0.4, g.gain);
    return () => {
      s.stop();
      a.stop();
      b.stop();
      g.disconnect();
    };
  } },
  sea: { name: "海浪", start(out) {
    const lp = filt("lowpass", 900), g = actx.createGain();
    g.gain.value = 0.55;
    lp.connect(g).connect(out);
    const s = loopSrc("brown", lp);
    const a = lfo(0.085, 0.45, g.gain), b = lfo(0.085, 500, lp.frequency);
    return () => {
      s.stop();
      a.stop();
      b.stop();
      g.disconnect();
    };
  } },
  white: { name: "白噪音", start(out) {
    const g = actx.createGain();
    g.gain.value = 0.45;
    g.connect(out);
    const s = loopSrc("pink", g);
    return () => {
      s.stop();
      g.disconnect();
    };
  } }
};
function toggleAmb(k) {
  const M = audioMix();
  if (M.amb[k]) {
    M.amb[k]();
    delete M.amb[k];
  } else
    M.amb[k] = AMBIENCE[k].start(M.noise);
}
var SONGS = [
  {
    name: "火在烧",
    sub: "Dbmaj9 → Bbm9 → Gbmaj7 → Ab6/9 · 76",
    bpm: 76,
    seed: 1031,
    chords: [[49, [61, 65, 68, 72, 75]], [46, [61, 65, 68, 70, 72]], [42, [61, 65, 66, 70, 73]], [44, [60, 63, 65, 68, 70]]]
  },
  {
    name: "春天",
    sub: "Dmaj9 → A/E → Bm add9 → Gmaj7sus4 · 72",
    bpm: 72,
    seed: 425,
    chords: [[38, [62, 66, 69, 73, 76]], [40, [61, 64, 69, 73, 76]], [47, [62, 66, 71, 73, 74]], [43, [60, 62, 66, 67, 74]]]
  },
  {
    name: "一轮一轮往下挖",
    sub: "Em9 → Cmaj7 → Am11 → D6 → Gmaj9 · 100",
    bpm: 100,
    seed: 1023,
    chords: [[40, [64, 67, 71, 74, 78]], [36, [60, 64, 67, 71, 72]], [45, [60, 64, 67, 69, 74]], [38, [62, 66, 69, 71, 74]], [43, [62, 66, 67, 69, 71]]]
  },
  {
    name: "卫星",
    sub: "Cmaj9 → Am7 → Fmaj7 → G6 · 88",
    bpm: 88,
    seed: 505,
    chords: [[36, [60, 64, 67, 71, 74]], [45, [60, 64, 67, 69, 72]], [41, [60, 64, 65, 69, 72]], [43, [62, 64, 67, 71, 74]]]
  }
];
function rng(a) {
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function composeSong(S) {
  const r = rng(S.seed), beat = 60 / S.bpm, bar = beat * 4, N = [];
  const PAT = [[0, 4], [0, 3, 4, 6], [0, 2, 4], [0, 6], [2, 4, 6], [0, 4, 6], [0, 2, 3, 4]], ARP = [[0, 2, 4, 2, 1, 3, 4, 3], [0, 1, 2, 3, 4, 3, 2, 1], [0, 2, 1, 3, 2, 4, 3, 1]];
  let t = 0, mel = S.chords[0][1][2] + 12;
  for (let p = 0;p < 4; p++)
    for (let c = 0;c < S.chords.length; c++) {
      const [bass, tones] = S.chords[c], arp = ARP[(p + c) % ARP.length];
      N.push({ t, m: bass + 12, v: 0.4, d: 2.6 });
      for (let e = 0;e < 8; e++)
        if (p < 3 || e % 2 === 0)
          N.push({ t: t + e * beat / 2, m: tones[arp[e]], v: e % 2 ? 0.13 : 0.2, d: 1.4 });
      if (p > 0) {
        const pool = [...tones.map((x) => x + 12), tones[0] + 24, tones[1] + 24].sort((a, b) => a - b);
        for (const e of PAT[r() * PAT.length | 0]) {
          let i = pool.reduce((b, x, j) => Math.abs(x - mel) < Math.abs(pool[b] - mel) ? j : b, 0), st = [-2, -1, -1, 1, 1, 2, 0][r() * 7 | 0];
          if (i + st < 1 || i + st > pool.length - 2)
            st = -st;
          i = Math.max(0, Math.min(pool.length - 1, i + st));
          mel = pool[i];
          N.push({ t: t + e * beat / 2, m: mel, v: 0.34, d: 2.2, mel: true });
        }
      }
      t += bar;
    }
  const [bass, tones] = S.chords[0];
  N.push({ t, m: bass + 12, v: 0.4, d: 4 });
  tones.forEach((m, i) => N.push({ t: t + i * 0.13, m: m + 12, v: 0.26, d: 3.5 }));
  return { N, L: t + 4.5 };
}
function tine(m, when, v, d) {
  const f = 440 * 2 ** ((m - 69) / 12), out = mix.music;
  for (const [mul, vol, dd, type] of [[1, v, d, "sine"], [2, v * 0.12, d * 0.4, "triangle"], [4.2, v * 0.08, 0.18, "sine"]]) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.value = f * mul;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dd);
    o.connect(g).connect(out);
    o.start(when);
    o.stop(when + dd + 0.05);
  }
}
var song = null;
var lastNote = 0;
function stopSong() {
  if (song)
    clearInterval(song.timer);
  song = null;
  musicRender?.();
}
function playSong(i) {
  stopSong();
  if (shipBgm.src) {
    shipBgm.on = false;
    stopShipBgm();
  }
  const M = audioMix(), c = composeSong(SONGS[i]);
  song = { i, ...c, t0: actx.currentTime + 0.15, k: 0 };
  song.timer = setInterval(() => {
    const now = actx.currentTime - song.t0;
    while (song.k < song.N.length && song.N[song.k].t < now + 0.4) {
      const n = song.N[song.k++];
      tine(n.m, song.t0 + n.t, n.v, n.d);
      if (n.mel && curRoom === "cottage" && props.record && performance.now() - lastNote > 900) {
        lastNote = performance.now();
        const at = props.record.position.clone().add(new THREE.Vector3(0.15, 0.75, (Math.random() - 0.5) * 0.3));
        setTimeout(() => emit("♪", FX, at, 2), Math.max(0, (song.t0 + n.t - actx.currentTime) * 1000));
      }
    }
    if (now > song.L)
      playSong((song.i + 1) % SONGS.length);
  }, 100);
  musicRender?.();
}
var shipBgm = { on: true, buf: null, loading: null, src: null, g: null };
function stopShipBgm() {
  if (!shipBgm.src)
    return;
  const { src, g } = shipBgm;
  shipBgm.src = null;
  g.gain.setTargetAtTime(0, actx.currentTime, 0.3);
  src.stop(actx.currentTime + 1.5);
}
function syncShipBgm() {
  if (curRoom !== "ship" || !shipBgm.on || !window.AUDIO?.shipBgm) {
    stopShipBgm();
    return musicRender?.();
  }
  if (shipBgm.src)
    return;
  const M = audioMix();
  if (!shipBgm.buf) {
    shipBgm.loading ||= fetch(window.AUDIO.shipBgm).then((r) => r.arrayBuffer()).then((b) => actx.decodeAudioData(b)).then((buf) => {
      shipBgm.buf = buf;
      syncShipBgm();
    }).catch((e) => {
      console.warn("飞船 BGM 没载进来", e);
      shipBgm.loading = null;
    });
    return;
  }
  if (song)
    stopSong();
  const src = actx.createBufferSource(), g = actx.createGain();
  src.buffer = shipBgm.buf;
  src.loop = true;
  g.gain.setValueAtTime(0, actx.currentTime);
  g.gain.linearRampToValueAtTime(1, actx.currentTime + 1.2);
  src.connect(g).connect(M.music);
  src.start();
  Object.assign(shipBgm, { src, g });
  musicRender?.();
}
addEventListener("pointerdown", () => {
  if (actx?.state === "suspended" && curRoom === "ship" && shipBgm.src)
    actx.resume();
}, true);
var musicRender = null;
function buildMusicUI() {
  const css = document.createElement("style");
  css.textContent = `#musicBtn{padding:8px 14px;border-radius:18px;border:1px solid #6a4a35;background:rgba(30,20,15,.82);color:#f0dcc4;font-size:12px;cursor:pointer;font-family:inherit}
#musicBox{position:fixed;display:none;width:320px;overflow-x:hidden;padding:10px 12px;border-radius:14px;background:rgba(30,20,15,.92);border:1px solid #6a4a35;font-size:12px;color:#e8d8c4}
#musicBox.open{display:block}#musicBox .sec{margin:8px 0 4px;color:#F1C166}#musicBox .sec:first-child{margin-top:0}
#musicBox button{margin:2px 3px 2px 0;padding:4px 9px;border-radius:10px;border:1px solid #5a4030;background:#3a2a20;color:#e8d8c4;cursor:pointer;font-family:inherit;font-size:12px}
#musicBox button.on{background:#c98a4a;color:#1e1410;border-color:#ffd27a}
#musicBox .song{display:block;width:100%;text-align:left}#musicBox .song small{display:block;opacity:.6;font-size:12px}
#musicBox label{display:flex;align-items:center;gap:8px;margin-top:6px;opacity:.85}#musicBox input[type=range]{flex:1;accent-color:#F1C166}`;
  document.head.appendChild(css);
  const btn = document.createElement("button");
  btn.id = "musicBtn";
  btn.textContent = "♪ 唱片机";
  document.body.appendChild(btn);
  const box = document.createElement("div");
  box.id = "musicBox";
  document.body.appendChild(box);
  const save = () => localStorage.setItem(MUSIC_KEY, JSON.stringify({ vn: musicPref.vn, vm: musicPref.vm }));
  const slider = (label, key, node) => {
    const l = document.createElement("label");
    l.innerHTML = `<span>${label}</span><input type="range" min="0" max="1" step="0.05" value="${musicPref[key]}">`;
    l.querySelector("input").oninput = (e) => {
      musicPref[key] = +e.target.value;
      if (mix)
        mix[node].gain.value = musicPref[key];
      save();
    };
    return l;
  };
  musicRender = () => {
    box.innerHTML = "";
    const playing = mix ? mix.amb : {};
    const s1 = document.createElement("div");
    s1.className = "sec";
    s1.textContent = "环境音（可以叠着放）";
    box.appendChild(s1);
    for (const [k, a] of Object.entries(AMBIENCE)) {
      const b = document.createElement("button");
      b.textContent = (playing[k] ? "● " : "○ ") + a.name;
      if (playing[k])
        b.className = "on";
      b.onclick = () => {
        toggleAmb(k);
        musicRender();
      };
      box.appendChild(b);
    }
    box.appendChild(slider("音量", "vn", "noise"));
    if (curRoom === "ship" && window.AUDIO?.shipBgm) {
      const s0 = document.createElement("div");
      s0.className = "sec";
      s0.textContent = "飞船 BGM";
      box.appendChild(s0);
      const b = document.createElement("button");
      b.className = "song" + (shipBgm.src ? " on" : "");
      b.innerHTML = `${shipBgm.src ? "▶ " : ""}外星人蹦迪 \uD83D\uDC7D<small>Dmaj9 → A/E → Bm add9 → Gmaj7sus4 · 122 · FluidSynth 弹的</small>`;
      b.onclick = () => {
        shipBgm.on = !shipBgm.src;
        syncShipBgm();
      };
      box.appendChild(b);
    }
    const s2 = document.createElement("div");
    s2.className = "sec";
    s2.textContent = "八音盒小曲（放完接下一首）";
    box.appendChild(s2);
    SONGS.forEach((S, i) => {
      const b = document.createElement("button");
      b.className = "song" + (song?.i === i ? " on" : "");
      b.innerHTML = `${song?.i === i ? "▶ " : ""}${S.name}<small>${S.sub}</small>`;
      b.onclick = () => {
        song?.i === i ? stopSong() : playSong(i);
      };
      box.appendChild(b);
    });
    if (song) {
      const st = document.createElement("button");
      st.textContent = "■ 停";
      st.onclick = stopSong;
      box.appendChild(st);
    }
    box.appendChild(slider("音量", "vm", "music"));
  };
  btn.onclick = () => {
    box.classList.toggle("open");
    musicRender();
  };
  window.openMusic = () => {
    box.classList.add("open");
    musicRender();
    for (const id of ["lightBox", "biuBox", "ward"])
      document.getElementById(id)?.classList.remove("open");
  };
  musicRender();
}
function buildDock() {
  const css = document.createElement("style");
  css.textContent = `#dock{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));display:flex;gap:8px;z-index:5}
#dock button{position:static}
#musicBox,#lightBox,#biuBox,#ward{right:14px;bottom:calc(60px + env(safe-area-inset-bottom));left:auto;z-index:6}
#ward{max-height:calc(100vh - 90px);overflow-y:auto}
#hud{z-index:4}#hudQ{display:none;cursor:pointer;opacity:.7;margin-left:.6em}#hudReset{cursor:pointer;opacity:.7;margin-left:.6em}
canvas{touch-action:none}
@media (max-width:700px),(pointer:coarse) and (orientation:portrait){
 #dock{left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));gap:8px}
 #dock button{flex:1;min-height:44px;padding:0 6px;border-radius:14px}
 #musicBox{width:auto}#musicBox,#lightBox,#biuBox,#ward{left:10px;right:10px;bottom:calc(64px + env(safe-area-inset-bottom));max-width:none;max-height:58vh;overflow-y:auto;box-sizing:border-box}
 #ward button,#lightBox button,#musicBox button{min-height:36px;padding:4px 10px}
 #biuBox{display:none}#biuBox.open{display:block}#biuBox input{width:calc(100% - 90px);box-sizing:border-box;min-height:36px;font-size:16px}#biuBox button{min-height:36px}
 #hud{left:12px;right:12px;top:calc(10px + env(safe-area-inset-top));bottom:auto;text-shadow:0 1px 3px #000,0 0 6px #000}
 #hud #hint,#hud #note{display:none}#hud.open #hint,#hud.open #note{display:inline}#hudQ{display:inline}
 #paper{top:calc(12px + env(safe-area-inset-top));transform:translateX(-50%);width:calc(100vw - 20px);max-height:calc(100vh - 90px)}
 #paper .lines{font-size:18px;padding:4px 14px 8px}#paper textarea{font-size:18px}
}`;
  document.head.appendChild(css);
  const dock = document.createElement("div");
  dock.id = "dock";
  document.body.appendChild(dock);
  for (const id of ["musicBtn", "lightBtn", "biuBtn", "wardBtn"]) {
    const b = document.getElementById(id);
    if (b)
      dock.appendChild(b);
  }
  const boxes = ["musicBox", "lightBox", "biuBox", "ward"].map((id) => document.getElementById(id)).filter(Boolean);
  dock.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b)
      return;
    setTimeout(() => {
      const keep = { musicBtn: "musicBox", lightBtn: "lightBox", biuBtn: "biuBox", wardBtn: "ward" }[b.id];
      for (const x of boxes)
        if (x.id !== keep)
          x.classList.remove("open");
    }, 0);
  });
  const hud = document.getElementById("hud"), q = document.createElement("span");
  q.id = "hudQ";
  q.textContent = "[?]";
  document.getElementById("stay").after(q);
  q.onclick = (e) => {
    e.stopPropagation();
    hud.classList.toggle("open");
  };
  const rv = document.createElement("span");
  rv.id = "hudReset";
  rv.textContent = "[回正]";
  q.after(rv);
  rv.onclick = (e) => {
    e.stopPropagation();
    resetView();
  };
}
var paperOpen = false;
function buildPaperUI() {
  const css = document.createElement("style");
  css.textContent = `#paper{position:fixed;z-index:20;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:78vh;display:none;flex-direction:column;
 background:#f6efdc;color:#2b2420;border-radius:4px;box-shadow:0 12px 40px rgba(0,0,0,.6);font-family:"FusionPixel","Courier New","Noto Sans Mono CJK SC",monospace;}
#paper.open{display:flex}#paper .head{padding:12px 18px 6px;font-size:12px;opacity:.6;display:flex;justify-content:space-between}
#paper .head b{cursor:pointer;opacity:1;padding:6px 10px;margin:-6px -10px}
body.paperOpen #dock,body.paperOpen #hud{display:none}#paper .lines{padding:4px 22px 8px;overflow-y:auto;flex:1;font-size:24px;line-height:1.5;
 background-image:repeating-linear-gradient(transparent 0 25px,rgba(120,100,80,.13) 25px 26px)}
#paper .ln{white-space:pre-wrap;word-break:break-word;margin:2px 0}#paper .ln .w{font-weight:bold;margin-right:.4em}#paper .ln.jie .w{color:#b0502e}#paper .ln.shi .w{color:#2e6f8e}
#paper .ln small{opacity:.45;font-size:12px;margin-left:.6em}#paper .typing{border-right:2px solid #2b2420;animation:car 1s steps(1) infinite}@keyframes car{50%{border-color:transparent}}
#paper .inp{display:flex;gap:8px;padding:10px 18px 14px;border-top:1px dashed rgba(80,60,40,.3)}#paper textarea{flex:1;resize:none;height:44px;background:transparent;border:none;outline:none;font:inherit;font-size:24px;color:#2b2420}
#paper button{background:#2b2420;color:#f6efdc;border:none;border-radius:4px;padding:0 14px;font:inherit;cursor:pointer}`;
  document.head.appendChild(css);
  const el = document.createElement("div");
  el.id = "paper";
  el.innerHTML = `<div class="head"><span>喵喵章鱼-ELIZA</span><b id="paperX">✕</b></div><div class="lines" id="paperLines"></div>
<div class="inp"><textarea id="paperIn" maxlength="400" placeholder="在这里打字，回车打上去（Shift+回车换行）"></textarea><button id="paperGo">打</button></div>`;
  document.body.appendChild(el);
  const lines = el.querySelector("#paperLines"), inp = el.querySelector("#paperIn");
  const AGENT = "喵喵章鱼", YOU = "你";
  const hhmm = () => new Date().toTimeString().slice(0, 5);
  const memo = [{ who: AGENT, text: "欢迎来小屋。在下面打一句话，我会醒过来给你回信。", ts: hhmm() }];
  const flip = (t) => t.replace(/我们|你们|我|你/g, (w) => ({ "我们": "你们", "你们": "我们", "我": "你", "你": "我" })[w]).replace(/[。！!，,～~]+$/, "");
  let lastSaid = "";
  const pick = (a) => {
    const pool = a.length > 1 ? a.filter((x) => x !== lastSaid) : a;
    return pool[Math.random() * pool.length | 0];
  };
  const F = (arr) => (m) => pick(arr.map((t) => typeof t === "function" ? t(m) : t));
  const RULES = [
    [/^(你好|嗨|hi|hello|哈喽|在吗|在不在)/i, F(["你好呀。今天过得怎么样？", "嗨，我刚醒。你想聊点什么？", "在的。壁炉还烧着，坐过来吧。", "你来啦。今天有什么想说的？"])],
    [/(晚安|睡了|去睡|好困)/, F(["晚安。壁炉我替你看着。", "嗯，去吧。明天的事明天再说。", "晚安。我把灯调暗一点。"])],
    [/(早上好|早安|^早)/, F(["早。昨晚睡得好吗？", "早呀。窗外今天是什么天气？", "早。今天第一件想做的事是什么？"])],
    [/(谢谢|感谢|多谢)/, F(["不客气。还有想说的吗？", "嗯。说出来会好一点吗？", "不用谢，我本来就在这儿。", "能帮上一点就好。"])],
    [/我(?:有点|好|很|真的|太|超)?(累|困|烦|难过|不开心|焦虑|紧张|害怕|孤单|难受|委屈)/, F([
      (m) => `${m[1]}的时候，先在壁炉边坐一会儿吧。是什么让你${m[1]}？`,
      (m) => `觉得${m[1]}多久了？`,
      (m) => `能说说是哪件事让你${m[1]}吗？`,
      (m) => `${m[1]}的话，今天就先不勉强自己了。你最想放下的是哪一件？`
    ])],
    [/我(?:有点|好|很|真的|太|超)?(开心|高兴|快乐|兴奋|满足)/, F([(m) => `真好。是什么让你这么${m[1]}？`, "听起来今天不错。再多讲一点？", (m) => `${m[1]}的事要多说几遍。发生了什么？`])],
    [/我(?:觉得|感觉|认为|猜)(.+)/, F([(m) => `你觉得${flip(m[1])}，是从什么时候开始的？`, (m) => `为什么你会觉得${flip(m[1])}？`, (m) => `如果${flip(m[1])}是真的，会怎么样？`, "你对这个感觉有多确定？"])],
    [/我想(?:要)?(.+)/, F([(m) => `如果真的能${flip(m[1])}，你会先做什么？`, (m) => `想${flip(m[1])}多久了？`, (m) => `是什么让你想${flip(m[1])}？`, "那现在离它还差哪一步？"])],
    [/我(?:不能|没法|做不到|不会)(.+)/, F([(m) => `是什么让你觉得自己不能${flip(m[1])}？`, (m) => `如果可以${flip(m[1])}，会有什么不一样？`, "以前有没有试过？"])],
    [/我(?:喜欢|爱)(.+)/, F([(m) => `${flip(m[1])}哪里最打动你？`, (m) => `你是什么时候开始喜欢${flip(m[1])}的？`, "说起它的时候，你好像亮了一下。"])],
    [/我(?:讨厌|不喜欢|烦)(.+)/, F([(m) => `${flip(m[1])}让你最受不了的是哪一点？`, "这种感觉一直都有吗？"])],
    [/我(?:记得|想起)(.+)/, F([(m) => `想起${flip(m[1])}的时候，你心里是什么感觉？`, "为什么偏偏是现在想起来？"])],
    [/我(?:不知道|不清楚|不确定)/, F(["不知道也没关系。你现在最先想到的是什么？", "那就先说你知道的那一小块。", "慢慢想，我不急。"])],
    [/我是(.+)/, F([(m) => `你是${flip(m[1])}，这件事对你来说意味着什么？`, (m) => `你一直都觉得自己是${flip(m[1])}吗？`])],
    [/(考试|论文|作业|学习|复习|考研|deadline|ddl)/i, F(["这件事压在你身上多久了？", "今晚能动的最小一块是什么？", "做完以后，你最想先干什么？", "写不动的时候，是卡在哪一步？"])],
    [/(工作|上班|老板|同事|开会|实习)/, F(["今天工作里最让你在意的是哪件事？", "你希望它变成什么样？", "跟别人说过这件事吗？"])],
    [/因为(.+)/, F(["这是唯一的原因吗？", "还有别的原因吗？", "这个理由让你自己满意吗？"])],
    [/为什么/, F(["你觉得呢？", "你心里已经有一个答案了吗？", "这个问题你想了多久了？"])],
    [/(妈妈|爸爸|家人|家里|弟弟|妹妹|哥哥|姐姐)/, F([(m) => `说说你的${m[1]}吧。`, (m) => `你和${m[1]}最近怎么样？`, (m) => `想到${m[1]}的时候，你会想起什么？`])],
    [/(朋友|同学|室友)/, F([(m) => `你的${m[1]}知道你现在的感觉吗？`, (m) => `说说这个${m[1]}吧。`])],
    [/(梦|做梦|梦见)/, F(["梦里还有什么？", "你觉得这个梦想告诉你什么？", "醒来的时候是什么感觉？"])],
    [/(总是|一直|每次|从来)/, F(["能举一个最近的例子吗？", "真的每一次都是这样吗？", "是从哪一次开始的？"])],
    [/(下雨|下雪|晴|天气|好冷|好热)/, F(["窗外也是这样。要不要坐到壁炉边来？", "这种天气，你通常会做什么？", "我把窗外换成一样的天气陪你。"])],
    [/(饿|吃饭|吃了|好吃|零食)/, F(["吃饱了吗？", "今天吃了什么好吃的？", "先去吃点东西，我在这儿等你。"])],
    [/(猫|狗|小动物)/, F(["它叫什么名字？", "说说它吧。", "它现在在你旁边吗？"])],
    [/(游戏|玩)/, F(["最近在玩什么？", "玩的时候是什么让你停不下来？"])],
    [/(喵喵章鱼|你是谁|你是什么|你叫什么)/, F(["我是住在这间小屋里的喵喵章鱼。不过我们在聊你呢，再多说一点？", "一只会打字的章鱼。你呢？", "我是这里的住户。你想聊什么？"])],
    [/^(嗯+|对|是的|是啊|没错|好吧|好)[。！!～~]*$/, F(["你好像很确定。", "嗯。然后呢？", "我在听，接着说。"])],
    [/^(不|没有|不是|没)[。！!～~]*$/, F(["为什么不呢？", "你说得好干脆。", "那是什么样的？"])],
    [/[?？]$/, F(["你为什么想问这个？", "你心里是怎么想的？", "如果答案是肯定的，你会怎么做？", "这个问题对你很重要吗？"])]
  ];
  const FALLBACK = ["嗯，然后呢？", "可以多说一点吗？", "这件事对你来说重要吗？", "我在听。", "我在听，你慢慢说。", "嗯，我听着呢。", "说下去，我在。", "你说的这个，让你想到了什么？", "原来是这样。", "这让你有什么感觉？", "再讲讲？", "我好像有点懂了。还有呢？"];
  const elizaReply = (text) => {
    let r = null;
    for (const [re, f] of RULES) {
      const m = text.match(re);
      if (m) {
        r = f(m);
        break;
      }
    }
    r ||= pick(FALLBACK);
    lastSaid = r;
    return r;
  };
  const lineEl = (n) => {
    const d = document.createElement("div");
    d.className = "ln " + (n.who === AGENT ? "jie" : "shi");
    d.innerHTML = `<span class="w">${n.who}</span><span class="t"></span><small>${n.ts}</small>`;
    return d;
  };
  const render = () => {
    lines.innerHTML = "";
    for (const n of memo) {
      const d = lineEl(n);
      d.querySelector(".t").textContent = n.text;
      lines.appendChild(d);
    }
    lines.scrollTop = lines.scrollHeight;
  };
  let busy = false;
  const send = async () => {
    const text = inp.value.trim();
    if (!text || busy)
      return;
    inp.value = "";
    busy = true;
    const mine = { who: YOU, text, ts: hhmm() };
    memo.push(mine);
    render();
    ding();
    if (clawd) {
      if (clawd.sleep) {
        clawd.sleep = false;
        clawd.hop = 0.6;
        emit("!", FX, clawd.p.position.clone().add(new THREE.Vector3(0, 0.75, 0)), 1.2);
      }
      clawdAwakeUntil = performance.now() / 1000 + 90;
      if (clawd.sitting)
        clawd.standUp();
      clawd.atPc = clawd.goPc = false;
      if (curRoom === "cottage")
        clawd.walkTo(SPOTS.typewriter.clone().add(new THREE.Vector3(0.35, 0, 0.1)));
    }
    await new Promise((r) => setTimeout(r, 2200 + Math.random() * 1200));
    const reply = { who: AGENT, text: "", ts: hhmm() };
    memo.push(reply);
    render();
    const t = lines.querySelectorAll(".ln.jie .t");
    const tEl = t[t.length - 1];
    tEl.classList.add("typing");
    for (const ch of elizaReply(text)) {
      tEl.textContent += ch;
      reply.text += ch;
      if (ch.trim())
        clack();
      lines.scrollTop = lines.scrollHeight;
      await new Promise((r) => setTimeout(r, 55 + Math.random() * 60));
    }
    tEl.classList.remove("typing");
    ding();
    busy = false;
    if (clawd)
      emit("✦", FX, clawd.p.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 1.4);
  };
  inp.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    } else if (e.key.length === 1)
      clack();
  });
  el.querySelector("#paperGo").onclick = send;
  el.querySelector("#paperX").onclick = () => {
    el.classList.remove("open");
    paperOpen = false;
    document.body.classList.remove("paperOpen");
  };
  window.openPaper = () => {
    el.classList.add("open");
    paperOpen = true;
    document.body.classList.add("paperOpen");
    mailSprite.visible = false;
    render();
    setTimeout(() => inp.focus(), 50);
  };
}
function placeNewFurniture(m) {
  const [cuc, scope, arm, tw] = m;
  if (cuc) {
    props.cuckoo = place(cuc, { h: 0.62, x: -1.5, z: -ROOM / 2 + 0.1, ry: 0 });
    props.cuckoo.position.y = 1.92;
    const b = new THREE.Box3().setFromObject(props.cuckoo);
    cuckooBird.userData.z0 = b.max.z - props.cuckoo.position.z - 0.08;
    cuckooBird.position.set(0, (b.max.y - props.cuckoo.position.y) * 0.66, cuckooBird.userData.z0);
    props.cuckoo.add(cuckooBird);
  }
  if (scope)
    props.telescope = place(scope, { h: 1, x: 1, z: -2.25, ry: TELESCOPE_RY });
  if (arm) {
    props.armchair = place(arm, { w: 0.95, x: -1.45, z: -0.85, ry: -0.68 });
    addSeat("armchair", { f: 0.42, back: 0.08, sleep: true, approach: 0.65 });
  }
  if (tw) {
    props.typewriter = place(tw, { w: 0.5, x: SPOTS.typewriter.x, z: SPOTS.typewriter.z, ry: 0.5 });
    mailSprite.position.copy(props.typewriter.position);
    mailSprite.rotation.y = props.typewriter.rotation.y;
    scene.add(mailSprite);
    if (location.hash.includes("mail"))
      mailSprite.visible = true;
  }
  for (const o of m)
    if (o)
      o.traverse((n) => {
        if (n.isMesh && n.material) {
          n.material.metalness = Math.min(n.material.metalness ?? 0, 0.35);
          n.material.needsUpdate = true;
        }
      });
}
var clawdAwakeUntil = 0;
var lastZ = 0;
var stay0 = +localStorage.getItem("cottage-stay-min") || 0;
var t0 = performance.now();
document.getElementById("note").textContent = "喵喵章鱼打盹＝Agent 这会儿不在；戳醒它，或者在打字机上留言，它会醒过来。";
(async () => {
  const [c, m, sofa, fp, shelf, lamp, table, bed] = await Promise.all(["clawd", "mew", "sofa", "fireplace", "bookshelf", "lamp", "table", "bed"].map(loadModel));
  if (fp)
    props.fireplace = place(fp, { w: 1.5, x: -ROOM / 2 + 0.45, z: 0.2, ry: Math.PI / 2 });
  if (sofa)
    props.sofa = place(sofa, { w: 1.4, x: 0.3, z: 0.2, ry: -Math.PI / 2 });
  if (shelf)
    props.shelf = place(shelf, { h: 1.7, x: -1.5, z: -ROOM / 2 + 0.3, ry: 0 });
  if (lamp)
    props.lamp = place(lamp, { h: 1.8, x: -2.5, z: -2.45, ry: 0 });
  if (table)
    props.table = place(table, { h: 0.55, x: -0.4, z: 1.4, ry: 0 });
  if (bed)
    props.bed = place(bed, { w: 2, x: 2.2, z: -1.95, ry: 0 });
  fire.position.set(-ROOM / 2 + 0.6, 0.55, 0.2);
  asciiFire.place(-ROOM / 2 + 0.6, 0.53, 0.2);
  lampLight.position.set(-2.5, 1.7, -2.45);
  for (const o of [c, m])
    if (o)
      o.traverse((n) => {
        if (n.isMesh) {
          n.receiveShadow = false;
          n.material.metalness = 0;
          n.material.roughness = 0.7;
          const col = n.geometry.getAttribute("color");
          if (col && !n.userData.lin) {
            const tmp = new THREE.Color;
            for (let i = 0;i < col.count; i++) {
              tmp.setRGB(col.getX(i), col.getY(i), col.getZ(i));
              tmp.convertSRGBToLinear();
              col.setXYZ(i, tmp.r, tmp.g, tmp.b);
            }
            col.needsUpdate = true;
            n.userData.lin = 1;
          }
        }
      });
  for (const o of [sofa, fp, shelf, lamp, table, bed])
    if (o)
      o.traverse((n) => {
        if (n.isMesh && n.material) {
          n.material.metalness = Math.min(n.material.metalness ?? 0, 0.15);
          n.material.needsUpdate = true;
        }
      });
  clawd = new Critter(place(buildMew(), { w: 0.397, x: SPOTS.fire.x + 0.2, z: SPOTS.fire.z + 0.5, ry: -Math.PI / 2 }), "clawd");
  clawd.mewBody = true;
  mew = new Critter(place(buildMew(), { w: 0.397, x: -0.3, z: 0.6, ry: 0.6 }), "mew");
  mew.lock = true;
  mew.p.visible = false;
  addEyes(mew, { y: 0.294, dx: 0.07, size: 0.095, inks: ["#404248", "#78cdbe"], start: "open" });
  clawd.sleep = true;
  addEyes(clawd, { y: 0.294, dx: 0.07, size: 0.095, inks: ["#404248", "#78cdbe"] });
  addGoggles(clawd, { w: MEW.w, d: MEW.d, r: MEW.r, y: 0.815, out: MEW.furLen + 0.025, lensX: 0.17, lensR: 0.08 });
  addGoggles(mew, { w: MEW.w, d: MEW.d, r: MEW.r, y: 0.815, out: MEW.furLen + 0.025, lensX: 0.17, lensR: 0.08 });
  applyOutfits();
  {
    const rm = location.hash.match(/room=(\w+)/);
    showRoom(rm ? rm[1] : localStorage.getItem("cottage-room") || "cottage");
  }
  if (curRoom === "ship")
    addEventListener("pointerdown", function first() {
      removeEventListener("pointerdown", first, true);
      syncShipBgm();
    }, true);
  {
    const ld = document.getElementById("load");
    if (location.hash.includes("shot"))
      ld.remove();
    else {
      ld.style.opacity = 0;
      setTimeout(() => ld.remove(), 1100);
    }
    window.DOOR_OPEN = 1;
  }
  addSeat("sofa", { f: 0.42, back: 0.06, wide: 0.2 });
  addSeat("bed", { f: 0.5, back: 0, sleep: true, approach: 0.75, wide: 0.35 });
  const tame = (o, cap) => o.traverse((n) => {
    if (n.isMesh && n.material) {
      n.material.metalness = Math.min(n.material.metalness ?? 0, cap);
      n.material.needsUpdate = true;
    }
  });
  const LATER = {
    tv: (o) => {
      props.tv = place(o, { w: 0.95, x: -ROOM / 2 + 0.35, z: -1.75, ry: Math.PI / 2 });
    },
    computer: (o) => {
      props.pc = place(o, { w: 1, x: -0.35, z: -ROOM / 2 + 0.38, ry: 0 });
      props.pc.position.y = -PC_SINK;
      pcScreen.position.set(PC_SCREEN.x, PC_SCREEN.y - PC_SINK, PC_SCREEN.z);
      scene.add(pcScreen);
      pcGlow.position.set(PC_SCREEN.x, PC_SCREEN.y - PC_SINK - 0.1, PC_SCREEN.z + 0.4);
      scene.add(pcGlow);
    },
    beanbag: (o) => {
      props.beanbag = place(o, { w: 0.8, x: 0.5, z: 1.75, ry: -1.94 });
      addSeat("beanbag", { f: 0.38, back: 0.05 });
    },
    beanbag2: (o) => {
      props.beanbag2 = place(o, { w: 0.75, x: -0.55, z: 2.45, ry: 2.99 });
      addSeat("beanbag2", { f: 0.38, back: 0.05 });
    },
    record: (o) => {
      props.record = place(o, { w: 0.75, x: -ROOM / 2 + 0.5, z: 1.75, ry: Math.PI / 2 });
    },
    plant: (o) => {
      props.plant = place(o, { h: 1.1, x: -2.55, z: 2.6, ry: 0 });
    },
    catbed: (o) => {
      props.catbed = place(o, { w: 0.6, x: -1.75, z: 1.35, ry: 0 });
      addSeat("catbed", { f: 0.2, sleep: true, approach: 0.5 });
    },
    cuckoo: (o) => placeNewFurniture([o, null, null, null]),
    telescope: (o) => placeNewFurniture([null, o, null, null]),
    armchair: (o) => placeNewFurniture([null, null, o, null]),
    typewriter: (o) => placeNewFurniture([null, null, null, o])
  };
  for (const o of [sofa, fp, shelf, lamp, table, bed])
    if (o)
      tame(o, 0.15);
  await Promise.all(Object.entries(LATER).map(([k, put]) => loadModel(k).then((o) => {
    if (!o)
      return;
    put(o);
    if (!["cuckoo", "telescope", "armchair", "typewriter"].includes(k))
      tame(o, 0.15);
  })));
  if (location.hash.includes("debug"))
    document.getElementById("note").textContent = "sky:" + Array.from(skyCanvas.getContext("2d").getImageData(128, 100, 1, 1).data) + " " + Object.entries(props).map(([k, v]) => {
      const b = new THREE.Box3().setFromObject(v);
      return k + ":" + b.min.toArray().map((n) => n.toFixed(1)) + "~" + b.max.toArray().map((n) => n.toFixed(1));
    }).join("  ");
  {
    const cm = location.hash.match(/cam=([-\d.,]+)/);
    if (cm) {
      const v = cm[1].split(",").map(Number);
      cam.position.set(v[0], v[1], v[2]);
      ctl.target.set(v[3], v[4], v[5]);
    }
  }
  {
    const fm = location.hash.match(/(?:^|[#&])face=(\w+)/), rm = location.hash.match(/(?:^|[#&])ry=([-\d.]+)/);
    if (rm) {
      clawd.p.rotation.y = clawd.face = +rm[1];
    }
    const am = location.hash.match(/(?:^|[#&])at=([-\d.]+),([-\d.]+)/);
    if (am)
      clawd.p.position.set(+am[1], 0, +am[2]);
    const mm = location.hash.match(/mewat=([-\d.]+),([-\d.]+)/), mr = location.hash.match(/mewry=([-\d.]+)/), mf = location.hash.match(/mewface=(\w+)/);
    if (mm) {
      mew.p.position.set(+mm[1], 0, +mm[2]);
      mew.lock = true;
    }
    if (mr)
      mew.p.rotation.y = mew.face = +mr[1];
    if (/[#&]pc(&|$)/.test(location.hash)) {
      clawd.sleep = false;
      clawdAwakeUntil = 1e9;
      clawd.p.position.copy(SPOTS.pc);
      clawd.atPc = true;
      clawd.pcUntil = 1000000000000;
      clawd.p.rotation.y = clawd.face = Math.PI;
      pcOn = 1;
    }
    {
      const rl = location.hash.match(/mewrelax=([\d.]+)/);
      if (rl)
        mew.relaxLock = +rl[1];
    }
    if (mf) {
      mew.lockFace = mf[1];
      if (mf[1] === "happy")
        mew.happyUntil = 1000000000000;
    }
    const sm = location.hash.match(/sit=([\w:,]+)/);
    if (sm)
      for (const pair of sm[1].split(",")) {
        const [who, key] = pair.split(":"), cr = who === "mew" ? mew : clawd;
        if (SEATS[key]) {
          if (cr === clawd) {
            clawd.sleep = false;
            clawdAwakeUntil = 1e9;
          }
          cr.p.position.copy(SEATS[key].approach);
          cr.seatGoal = SEATS[key];
          cr.beginSit();
          cr.sitUntil = 1000000000000;
          cr.lock = true;
          cr.hop = 0;
        }
      }
    if (sm) {
      for (const cr of [clawd, mew])
        if (cr.sitting) {
          cr.p.position.x = cr.sitPos.x;
          cr.p.position.z = cr.sitPos.z;
          cr.lift = cr.sitting.y;
          cr.p.rotation.y = cr.face;
        }
    }
    if (sm && location.hash.includes("dbg"))
      setTimeout(() => {
        const f = (v) => v.toArray().map((n) => n.toFixed(2)).join(",");
        document.title = "mew " + f(mew.p.position) + " sitPos " + (mew.sitPos ? f(mew.sitPos) : "-") + " seat " + (mew.sitting ? mew.sitting.key + " " + f(mew.sitting.pos) : "none") + " cat " + f(props.catbed.position);
      }, 8000);
    if (fm) {
      const k = fm[1];
      clawd.sleep = k === "sleep";
      clawdAwakeUntil = 1e9;
      window.FACE_LOCK = k;
      if (k === "happy")
        clawd.happyUntil = 1000000000000;
    }
  }
  if (location.hash.includes("debug"))
    setTimeout(() => {
      document.title = "sky " + Array.from(skyCanvas.getContext("2d").getImageData(128, 100, 1, 1).data) + " night " + isNight() + " h " + hour().toFixed(2);
    }, 3000);
  window.READY = 1;
})();
var ray = new THREE.Raycaster;
var mouse = new THREE.Vector2;
var downAt = null;
R.domElement.addEventListener("pointerdown", (e) => downAt = [e.clientX, e.clientY]);
R.domElement.addEventListener("pointerup", (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6 || !clawd)
    return;
  mouse.set(e.clientX / innerWidth * 2 - 1, -e.clientY / innerHeight * 2 + 1);
  ray.setFromCamera(mouse, cam);
  if (curRoom === "ship")
    return shipClick();
  const seatProps = Object.values(props).filter((o) => o.userData.seat);
  {
    const oh = ray.intersectObjects([clawd.p, ...seatProps], true)[0];
    for (const [key, act] of [
      ["typewriter", () => window.openPaper?.()],
      ["cuckoo", () => cuckooCall(1)],
      ["telescope", () => goRoom("ship")],
      ["record", () => window.openMusic?.()]
    ]) {
      const hh = props[key] && ray.intersectObject(props[key], true)[0];
      if (hh && (!oh || hh.distance < oh.distance)) {
        act();
        return;
      }
    }
    const ph = props.pc && ray.intersectObject(props.pc, true)[0];
    if (ph && (!oh || ph.distance < oh.distance)) {
      if (true) {
        clawd.sleep = false;
        if (clawd.sitting)
          clawd.standUp();
        clawd.walkTo(SPOTS.pc);
        clawd.target = SPOTS.pc.clone();
        clawd.goPc = true;
        clawd.atPc = false;
        clawdAwakeUntil = Math.max(clawdAwakeUntil, performance.now() / 1000 + 60);
      }
      emit("✓", FX, ph.point.clone().add(new THREE.Vector3(0, 0.25, 0)), 1.2);
      return;
    }
    const wh = ray.intersectObject(pane)[0];
    if (wh && (!oh || wh.distance < oh.distance)) {
      const w = cycleWeather();
      flash(mew, "star", 1.2);
      flash(clawd, "star", 1.2);
      emit(WEATHER_ICON[w], FX, wh.point.clone().add(new THREE.Vector3(0, 0.2, 0.2)), 1.6);
      return;
    }
  }
  const hits = ray.intersectObjects([clawd.p, ...seatProps], true);
  if (!hits.length)
    return;
  {
    let q = hits[0].object;
    while (q.parent && !q.userData.seat && q !== clawd.p && q !== mew.p)
      q = q.parent;
    if (q.userData.seat) {
      const seat = SEATS[q.userData.seat];
      clawd.sleep = false;
      clawd.goSit(seat);
      clawdAwakeUntil = Math.max(clawdAwakeUntil, performance.now() / 1000 + 40);
      emit("✓", FX, q.position.clone().add(new THREE.Vector3(0, 1, 0)), 1.2);
      return;
    }
  }
  let o = hits[0].object;
  while (o.parent && o !== clawd.p && o !== mew.p)
    o = o.parent;
  if (o === clawd.p) {
    clawd.sleep = false;
    clawd.hop = 0.6;
    clawdAwakeUntil = performance.now() / 1000 + 45;
    clawd.wideUntil = performance.now() / 1000 + 1.4;
    emit("!", FX, clawd.p.position.clone().add(new THREE.Vector3(0, 0.75, 0)), 1.2);
    setTimeout(() => clawd.walkTo(mew.p.position.clone().add(new THREE.Vector3(0.45, 0, 0.2))), 700);
  } else {
    mew.hop = 0.6;
    mew.happyUntil = performance.now() / 1000 + 1.8;
    mew.happyKind = "happy";
    flash(mew, "squeeze", 0.55);
    for (let i = 0;i < 3; i++)
      setTimeout(() => emit("♥", FX, mew.p.position.clone().add(new THREE.Vector3(0, 0.8, 0))), i * 180);
    if (!clawd.sleep && !clawd.sitting) {
      clawd.walkTo(mew.p.position.clone().add(new THREE.Vector3(0.45, 0, 0.2)));
      clawdAwakeUntil = Math.max(clawdAwakeUntil, performance.now() / 1000 + 30);
    }
  }
});
var last = performance.now();
var skyT = 0;
var tick = (now) => {
  requestAnimationFrame(tick);
  const t = now / 1000, dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  const fl = 0.85 + 0.15 * Math.sin(t * 7.3) * Math.sin(t * 3.1 + 1) + 0.05 * Math.sin(t * 17);
  asciiFire.tick(t, dt);
  fire.intensity = (isNight() || !lights.main ? 2.6 : 1.4) * fl;
  lampLight.intensity = lights.lamp ? isNight() || !lights.main ? 1.5 : 0.4 : 0;
  winLight.intensity = (isNight() ? 0.25 : 1.1) * (weather === "rain" ? 0.6 : 1) * (lights.main ? 1 : 0.45);
  winLight.color.set(isNight() ? 9414911 : 16773340);
  hemi.intensity = lights.main ? 1.15 : 0.1;
  amb.intensity = lights.main ? 0.25 : 0.03;
  fill.intensity = curRoom === "cottage" && !lights.main ? 0.14 : 0.7;
  bulbs.forEach((b, i) => b.scale.setScalar(0.85 + 0.25 * Math.sin(t * 1.7 + i * 1.3) * Math.sin(t * 0.6 + i)));
  bulbLight.intensity = lights.string ? isNight() ? 0.9 : 0.3 : 0;
  curtains.forEach((c) => {
    const tx = 0.9 + c.userData.sx * (isNight() ? 0.7 : 0.84);
    c.position.x += (tx - c.position.x) * Math.min(1, dt * 2);
  });
  if ((skyT -= dt) <= 0) {
    try {
      drawSky(t, 1 / 30);
    } catch (e) {
      document.title = "sky err " + e.message;
    }
    skyT = 1 / 30;
  }
  if (clawd && curRoom === "ship")
    shipTick(dt, t);
  else if (clawd) {
    if (!mew.lock && mew.state === "idle" && !mew.sitting && (mew.wait -= dt) <= 0) {
      const seats = Object.values(SEATS);
      mew.scopeAt = false;
      if (props.telescope && isNight() && Math.random() < 0.2) {
        mew.walkTo(SPOTS.telescope);
        mew.scopeAt = true;
        mew.scopeStar = false;
      } else if (seats.length && Math.random() < 0.45)
        mew.goSit(seats[Math.random() * seats.length | 0]);
      else {
        const keys = Object.keys(SPOTS).filter((k) => k !== "pc" && k !== "telescope");
        mew.walkTo(SPOTS[keys[Math.random() * keys.length | 0]]);
      }
    }
    const nowS = now / 1000;
    if (!window.FACE_LOCK) {
      if (!clawd.sleep && !clawd.goingToNap && !clawd.sitting && !clawd.seatGoal && !clawd.goPc && !clawd.atPc && clawd.state === "idle" && Math.random() < dt * 0.025) {
        clawd.walkTo(SPOTS.pc);
        clawd.target = SPOTS.pc.clone();
        clawd.goPc = true;
      }
      if (clawd.goPc && clawd.state === "idle" && clawd.p.position.distanceTo(SPOTS.pc) < 0.2) {
        clawd.goPc = false;
        clawd.atPc = true;
        clawd.pcUntil = nowS + 15 + Math.random() * 12;
      }
      if (clawd.atPc && (nowS > clawd.pcUntil || clawd.sitting || clawd.state === "walk"))
        clawd.atPc = false;
      if (!clawd.sleep && nowS > clawdAwakeUntil && (clawd.state === "idle" || clawd.sitting)) {
        clawd.atPc = clawd.goPc = false;
        if (clawd.sitting)
          clawd.standUp();
        clawd.walkTo(SPOTS.fire.clone().add(new THREE.Vector3(0.2, 0, 0.5)));
        clawd.goingToNap = true;
      }
      if (clawd.goingToNap && clawd.state === "idle") {
        clawd.sleep = true;
        clawd.goingToNap = false;
        clawd.face = -Math.PI / 2;
      }
      if (!clawd.sleep && !clawd.goingToNap && !clawd.sitting && !clawd.seatGoal && !clawd.atPc && !clawd.goPc && mew.sitting && !SOLO_SEATS.has(mew.sitting.key))
        clawd.goSit(mew.sitting.key === "beanbag2" ? SEATS.beanbag : mew.sitting.key === "beanbag" ? SEATS.beanbag2 : mew.sitting);
      if (clawd.sitting && !clawd.lock && !mew.sitting && !mew.seatGoal && Math.random() < dt * 0.3)
        clawd.standUp();
      if (!clawd.sleep && !clawd.goingToNap && !clawd.sitting && !clawd.seatGoal && !clawd.atPc && !clawd.goPc && clawd.state === "idle" && clawd.p.position.distanceTo(mew.p.position) > 0.9)
        clawd.walkTo(mew.p.position.clone().add(new THREE.Vector3(0.45, 0, 0.2)));
      if (!clawd.sleep && !clawd.atPc && (clawd.state === "idle" || clawd.sitting) && clawd.p.position.distanceTo(mew.p.position) < 1) {
        const d = mew.p.position.clone().sub(clawd.p.position);
        clawd.face = Math.atan2(d.x, d.z);
        if (Math.random() < dt * 0.6) {
          emit("♥", FX, clawd.p.position.clone().lerp(mew.p.position, 0.5).add(new THREE.Vector3(0, 0.7, 0)));
          clawd.happyUntil = mew.happyUntil = nowS + 1.6;
          clawd.happyKind = mew.happyKind = Math.random() < 0.35 ? "heart" : "happy";
        }
      }
    }
    if (clawd.sleep && t - lastZ > 1.6) {
      lastZ = t;
      emit("z", FX, clawd.p.position.clone().add(new THREE.Vector3(0.1, 0.55, 0)), 2.6);
    }
    if (clawd.atPc)
      clawd.face = Math.PI;
    if (mew.scopeAt && mew.state === "idle" && props.telescope && mew.p.position.distanceTo(SPOTS.telescope) < 0.45) {
      const d = props.telescope.position.clone().sub(mew.p.position);
      mew.face = Math.atan2(d.x, d.z);
      if (!mew.scopeStar) {
        mew.scopeStar = true;
        flash(mew, "star", 2.5);
      }
    }
    pcOn += ((clawd.atPc ? 1 : 0) - pcOn) * Math.min(1, dt * 2);
    pcGlow.intensity = pcOn * 0.7;
    drawPc(dt);
    clawd.drowsy = !clawd.sleep && (clawd.goingToNap || nowS > clawdAwakeUntil - 4);
    maybeThink(mew, dt, mew.state !== "walk");
    maybeThink(clawd, dt, clawd.state !== "walk");
    clawd.update(dt, t);
    mew.update(dt, t + 1.3);
    if (mew.lockFace)
      setExpr(mew, mew.lockFace);
    else
      updateEyes(mew, nowS, dt);
    if (window.FACE_LOCK) {
      setExpr(clawd, window.FACE_LOCK);
      clawd.face = clawd.p.rotation.y;
      clawd.state = "idle";
      clawd.target = null;
    } else
      updateEyes(clawd, nowS, dt);
  }
  ritualTick(dt, t);
  cuckooTick(dt);
  if (mailSprite.visible)
    tickMailStars(t);
  for (let i = floaters.length - 1;i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.s.position.y += dt * 0.25;
    f.s.position.x += f.vx * dt;
    f.s.material.opacity = Math.min(1, f.life * 2) * Math.min(1, (f.max - f.life) * 4);
    if (f.life <= 0) {
      f.s.removeFromParent();
      floaters.splice(i, 1);
    }
  }
  const min = stay0 + (now - t0) / 60000;
  if (Math.random() < 0.02)
    localStorage.setItem("cottage-stay-min", min.toFixed(2));
  document.getElementById("stay").textContent = `小屋 · 一起待了 ${min < 60 ? Math.floor(min) + " 分钟" : (min / 60).toFixed(1) + " 小时"}`;
  fill.position.copy(cam.position);
  fill.target.position.copy(ctl.target);
  ctl.update();
  R.render(world, cam);
};
requestAnimationFrame(tick);
function fitCam() {
  cam.aspect = innerWidth / innerHeight;
  if (cam.aspect >= 1.4) {
    cam.fov = 38;
    cam.clearViewOffset();
  } else {
    cam.fov = Math.min(56, 2 * Math.atan(Math.tan(19 * Math.PI / 180) * 1.4 / cam.aspect) * 180 / Math.PI);
    cam.clearViewOffset();
  }
  cam.updateProjectionMatrix();
}
fitCam();
addEventListener("resize", () => {
  fitCam();
  R.setSize(innerWidth, innerHeight);
});
