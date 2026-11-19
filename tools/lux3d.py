"""Aholo Lux3D 小客户端：创建任务 → 轮询 → 下载 GLB。
用法：AHOLO_KEY=你的密钥 python3 tools/lux3d.py text|img|fourview  请求.json  输出目录
请求示例见 prompts/*.json（version G1-Turbo、faceCount 20000、PBR、glb）。
"""
import json, os, sys, time, urllib.request
BASE = "https://api.aholo3d.cn"
KEY = os.environ["AHOLO_KEY"]
def call(method, path, body=None):
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": KEY, "Content-Type": "application/json"})
    try:
        return json.load(urllib.request.urlopen(req, timeout=60))
    except urllib.error.HTTPError as e:
        print("HTTP", e.code, e.read()[:800].decode(errors="replace")); raise
kind, reqf, outdir = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(outdir, exist_ok=True)
path = {"text": "/lux3d/v1/generate/text-to-3d/task/create", "img": "/lux3d/v1/generate/img-to-3d/task/create",
        "fourview": "/lux3d/v1/generate/image-to-four-view/task/create"}[kind]
for attempt in range(60):
    r = call("POST", path, json.load(open(reqf)))
    if r.get("c") != "GENERATION_CONCURRENCY_LIMIT_EXCEEDED": break
    time.sleep(20)   # 平台限制并发，排队等
d = r.get("d")
tid = d if not isinstance(d, dict) else (d.get("taskid") or d.get("taskId"))
print("taskid", tid)
t0 = time.time()
while True:
    q = call("GET", f"/lux3d/v1/generate/task/get?taskid={tid}")
    st = (q.get("d") or {}).get("status")
    if st in (3, 4, 6): break
    time.sleep(10)
print("status", st, round(time.time() - t0), "s")
json.dump(q, open(os.path.join(outdir, "task.json"), "w"), ensure_ascii=False, indent=1)
for i, o in enumerate((q.get("d") or {}).get("outputs") or []):
    url = o.get("content")
    if isinstance(url, str) and url.startswith("http"):
        ext = url.split("?")[0].rsplit(".", 1)[-1][:5]
        dest = os.path.join(outdir, f"out{i}.{ext}")
        urllib.request.urlretrieve(url, dest); print("saved", dest, os.path.getsize(dest))
