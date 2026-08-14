#!/bin/bash
# 更新 index.html 的快取破壞版本號
cd /Users/batman_work/claude/apps/zombieGunner
V=$(date +%s)
sed -i '' -E "s/\?v=[0-9]+/?v=$V/g" index.html
echo "cache bust → v=$V"
