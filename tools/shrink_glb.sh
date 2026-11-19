#!/bin/bash
# 给小屋用的 GLB 瘦身：贴图缩到 512，面数多的再简化。用法：shrink_glb.sh in.glb out.glb [简化比例，如 0.15]
set -e

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
in=$1; out=$2; ratio=${3:-}
cur=$in
if [ -n "$ratio" ]; then
  npx -y @gltf-transform/cli@4 weld "$cur" "$tmp/w.glb" >/dev/null 2>&1 && cur=$tmp/w.glb
  npx -y @gltf-transform/cli@4 simplify "$cur" "$tmp/s.glb" --ratio "$ratio" --error 0.002 >/dev/null 2>&1 && cur=$tmp/s.glb
fi
npx -y @gltf-transform/cli@4 resize "$cur" "$out" --width 512 --height 512 >/dev/null 2>&1
ls -la "$in" "$out" | awk '{print $5, $9}'
