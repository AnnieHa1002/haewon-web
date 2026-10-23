#!/usr/bin/env python3
"""사이트별 QR 코드(qr/*.svg)를 만들고 README의 QR 표를 갈아 끼운다.

  pip install segno
  python3 tools/qr.py                                   # GitHub Pages 주소
  python3 tools/qr.py https://haewon-web.pages.dev/     # 다른 주소로 배포했을 때
"""
import os, re, sys
import segno

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://annieha1002.github.io/haewon-web/").rstrip("/") + "/"

TARGETS = [
    ("stage", "stage.html", "진행 화면 (타이머·향·소리) — **테이블 가운데 노트북·태블릿용**"),
    ("hub", "", "허브 (홈 화면) — **진행 카드 C-1(4막 휴대폰)에 인쇄**"),
    ("s1", "S1", "S1 남은자리"),
    ("s2", "S2", "S2 송은혜의 휴대폰 — **'남겨진 자리의 물건' 카드(제비의 자리 · 송은혜의 휴대폰)에 인쇄**"),
    ("s3", "S3", "S3 이다음의 휴대폰 — **외골수 카드 1에 인쇄**"),
    ("s4", "S4", "S4 한컷 nare_nowhere"),
    ("s5", "S5", "S5 해원일보"),
    ("s6", "S6", "S6 금방울당"),
    ("s7", "S7", "S7 도원화학 사내망"),
    ("s8", "S8", "S8 천명그룹"),
    ("s9", "S9", "S9 사원증"),
    ("s10", "S10", "S10 새벽의 방"),
    ("s11", "S11", "S11 하루글 (블로그 주소 입력 화면)"),
]

out = os.path.join(ROOT, "qr")
os.makedirs(out, exist_ok=True)
rows = []
for name, route, label in TARGETS:
    url = BASE + (route if route.endswith(".html") else "#/" + route if route else "")
    segno.make(url, error="m").save(os.path.join(out, name + ".svg"), scale=6, border=2)
    rows.append((label, url, f"qr/{name}.svg"))

table = ["| 사이트 | QR | 주소 |", "| --- | --- | --- |"]
table += [f"| {label} | <img src=\"{img}\" width=\"140\" alt=\"{label.split(' — ')[0]} QR\"> | `{url}` |" for label, url, img in rows]
block = "<!-- QR:START -->\n" + "\n".join(table) + "\n<!-- QR:END -->"

readme = os.path.join(ROOT, "README.md")
text = open(readme, encoding="utf-8").read()
text = re.sub(r"<!-- QR:START -->.*?<!-- QR:END -->", lambda _: block, text, flags=re.S)
open(readme, "w", encoding="utf-8").write(text)
print(f"{len(rows)} QR → qr/  (base {BASE})")
