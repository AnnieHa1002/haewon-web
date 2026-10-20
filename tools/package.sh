#!/bin/sh
# 시트 CSV → data.js 빌드 후 site/ 를 zip으로 묶는다 (USB·오프라인 배포용)
set -e
cd "$(dirname "$0")/.."
python3 tools/build.py
mkdir -p dist
rm -f dist/haewon-site.zip
(cd site && zip -qr ../dist/haewon-site.zip .)
echo "dist/haewon-site.zip"
