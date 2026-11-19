"""陪伴小屋 · 打包成单文件网页（three.js、模型、图片、字体全部内联，离线双击即开）。
用法：python3 build.py  →  dist/cottage.html
"""
import base64, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
T = ROOT / "vendor/three"
MODELS = ROOT / "models"


def durl(js): return "data:text/javascript;base64," + base64.b64encode(js.encode()).decode()


gltf = (T / "GLTFLoader.js").read_text().replace("'../utils/BufferGeometryUtils.js'", "'three/addons/utils/BufferGeometryUtils.js'")
imap = {"imports": {"three": durl((T / "three.module.js").read_text()),
                    "three/addons/loaders/GLTFLoader.js": durl(gltf),
                    "three/addons/controls/OrbitControls.js": durl((T / "OrbitControls.js").read_text()),
                    "three/addons/utils/BufferGeometryUtils.js": durl((T / "BufferGeometryUtils.js").read_text())}}

# 家具：Aholo Lux3D 文生 3D，经 tools/shrink_glb.sh 瘦身
M = {p.stem: base64.b64encode(p.read_bytes()).decode() for p in sorted((MODELS / "props").glob("*.glb"))}
PICS = {q.stem: "data:image/jpeg;base64," + base64.b64encode(q.read_bytes()).decode() for q in sorted((ROOT / "pics").glob("*.jpg"))}
WINDOW = {q.stem: "data:image/jpeg;base64," + base64.b64encode(q.read_bytes()).decode() for q in sorted((ROOT / "pics/window").glob("*.jpg"))}
FONT = "data:font/woff2;base64," + base64.b64encode((ROOT / "fonts/fusion-pixel-12px-proportional-zh_hans.otf.woff2").read_bytes()).decode()
game = (ROOT / "game.js").read_text()

def page(font, imap, data):
    return f'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>陪伴小屋 · Personal Agent demo · Circe</title>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<style>@font-face{{font-family:"FusionPixel";src:url({font}) format("woff2")}}
html,body{{margin:0;height:100%;background:#0b0807;overflow:hidden;font-family:"FusionPixel","Noto Sans CJK SC","PingFang SC",sans-serif;-webkit-font-smoothing:none;font-smooth:never;color:#e8d8c4;user-select:none}}
#hud{{position:fixed;left:14px;bottom:12px;font-size:12px;line-height:1.6;text-shadow:0 1px 3px #000;opacity:.85}}
#hud small{{opacity:.6}}
#fade{{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .45s}}
#load{{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;font-size:24px;letter-spacing:.1em;background:#0b0807;transition:opacity 1s}}</style>
<script type="importmap">{json.dumps(imap)}</script></head><body>
<div id="load">推门进小屋……</div>
<div id="fade"></div>
<div id="hud"><span id="stay"></span><br><small id="hint">点喵喵章鱼戳醒它 · 点打字机给它留言 · 点家具让它过去坐 · 拖动转视角 · 滚轮远近</small><br><small id="note"></small></div>
<script>{data}</script>
<script type="module">{game}</script></body></html>'''


html = page(FONT, imap, f"window.MODELS = {json.dumps(M)}; window.PICS = {json.dumps(PICS)}; window.WINDOW = {json.dumps(WINDOW)}; window.AUDIO = {{}};")
out = ROOT / "dist" / "cottage.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(out, len(html) // 1024, "KB")
