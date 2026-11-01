#!/usr/bin/env python3
"""한빛 엔딩북 원고(마크다운) → site/hanbit/assets/book.js

원고는 data/hanbit/endingbook.md.
환경 변수 HANBIT_DOC_ID가 있으면 먼저 구글 문서를 마크다운으로 받아 와서 원고를 덮어쓴다
(문서가 '링크가 있는 모든 사용자 · 보기'로 공유돼 있어야 한다). 받지 못하면 저장된 원고로 만든다.

  python3 tools/build_hanbit.py            # 저장된 원고로
  HANBIT_DOC_ID=... python3 tools/build_hanbit.py   # 구글 문서 최신본으로
"""
import datetime
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "data", "hanbit", "endingbook.md")
IMAGES = os.path.join(ROOT, "data", "hanbit", "images.json")
OUT = os.path.join(ROOT, "site", "hanbit", "assets", "book.js")
IMG_DIR = os.path.join(ROOT, "site", "hanbit", "img")


def fetch_doc(doc_id):
    url = f"https://docs.google.com/document/d/{doc_id}/export?format=md"
    try:
        with urllib.request.urlopen(url, timeout=30) as r:
            text = r.read().decode("utf-8")
    except Exception as e:  # noqa: BLE001
        print(f"[hanbit] 구글 문서를 받지 못해 저장된 원고를 씁니다: {e}", file=sys.stderr)
        return None
    if "## " not in text or "4-7" not in text:
        print("[hanbit] 받은 문서가 엔딩북 형식이 아니어서 저장된 원고를 씁니다 (공유 설정 확인).", file=sys.stderr)
        return None
    return text


ESC = re.compile(r"\\([\\`*_{}\[\]()#+\-.!~|>])")
TAG = re.compile(r"^\[(진행 안내|읽기 안내)(?:\s*·\s*낭독하지 않음)?\]\s*(.*)$")


def clean(s):
    s = ESC.sub(r"\1", s)
    s = s.replace(" ", " ").strip()
    return s


def inline(s):
    """굵게·기울임 표시는 지우고 글자만 남긴다(화면에서 따로 꾸민다)."""
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)", r"\1", s)
    s = s.replace("**", "")
    return s.strip()


def heading(line):
    m = re.match(r"^(#{1,4})\s+(.*)$", line)
    if not m:
        return None
    return len(m.group(1)), inline(m.group(2))


def block(line):
    """원고 한 줄 → 화면 블록"""
    raw = line
    s = inline(line)
    if not s:
        return None
    if re.match(r"^\*\*【.*】\*\*$", raw.strip()) or re.match(r"^【.*】$", s):
        return {"t": "diary", "x": s.strip("【】 ")}
    m = TAG.match(s)
    if m:
        return {"t": "note", "k": m.group(1), "x": m.group(2)}
    if s.startswith("[진행 안내]") or s.startswith("[읽기 안내]"):
        return {"t": "note", "k": s[1:6], "x": s[7:].strip()}
    if re.match(r"^\[연구실이 열렸다면\]", s):
        return {"t": "cond", "c": "lab", "x": s[len("[연구실이 열렸다면]"):].strip()}
    if s.startswith("→"):
        return {"t": "go", "x": s[1:].strip()}
    if re.match(r"^[-*]\s+", raw.strip()):
        return {"t": "li", "x": re.sub(r"^[-*]\s+", "", s)}
    if s.startswith("□"):
        return {"t": "check", "x": s[1:].strip()}
    if s.startswith("▷"):
        return {"t": "alt", "x": s[1:].strip()}
    if re.match(r"^\(.*읽습니다\)$", s):
        return {"t": "reader", "x": s.strip("()")}
    if re.match(r"^합계\s*_+\s*/\s*\d+", s):
        return {"t": "total", "x": s}
    if s.startswith("Q.") and raw.strip().startswith("*"):
        return {"t": "q", "x": s}
    if s.startswith("※"):
        return {"t": "mark", "x": s}
    if s == "노아에게." or s == "— 엄마":
        return {"t": "p", "x": s, "letter": True}
    return {"t": "p", "x": s}


def section_id(title):
    m = re.match(r"^(\d+(?:-[0-9A-Za-z]+)*)", title)
    return m.group(1) if m else title


def is_ending_title(b):
    if b["t"] != "note" or b.get("k") != "읽기 안내":
        return False
    x = b["x"]
    return 0 < len(x) <= 16 and "." not in x and "→" not in x and "," not in x


def parse(md):
    lines = [clean(l) for l in md.splitlines()]
    book = {"title": "", "subtitle": "", "chapters": []}
    ch = None
    sec = None
    ending = None
    diary_n = 0
    pre = []
    for line in lines:
        if not line:
            continue
        h = heading(line)
        if h and not re.match(r"^\*\*【", line):
            lvl, text = h
            if lvl == 1:
                book["title"] = re.sub(r"^\d+\.\s*", "", text)
                continue
            if lvl == 2:
                m = re.match(r"^(\d+)\.\s*(.*)$", text)
                ch = {"id": m.group(1) if m else text, "title": m.group(2) if m else text,
                      "blocks": [], "sections": []}
                book["chapters"].append(ch)
                sec = None
                ending = None
                continue
            if lvl == 3 and ch is not None:
                parts = [p.strip() for p in text.split("·", 1)]
                sec = {"id": text, "key": section_id(text), "title": text,
                       "name": parts[1] if len(parts) > 1 else "",
                       "blocks": [], "endings": []}
                ch["sections"].append(sec)
                ending = None
                continue
            if lvl == 4:
                b = {"t": "h4", "x": text}
                (ending["blocks"] if ending else (sec or ch)["blocks"]).append(b)
                continue
        b = block(line)
        if b is None:
            continue
        if ch is None:
            if not book["subtitle"]:
                book["subtitle"] = b["x"]
            pre.append(b)
            continue
        if sec is not None and sec["key"].startswith("4-") and is_ending_title(b):
            ending = {"title": b["x"], "blocks": []}
            sec["endings"].append(ending)
            continue
        if b["t"] == "diary":
            diary_n += 1
            b["n"] = diary_n
        target = ending["blocks"] if ending else (sec["blocks"] if sec else ch["blocks"])
        target.append(b)
    return book


def main():
    doc_id = os.environ.get("HANBIT_DOC_ID", "").strip()
    source = "저장된 원고"
    if doc_id:
        text = fetch_doc(doc_id)
        if text:
            with open(SRC, "w", encoding="utf-8") as f:
                f.write(text)
            source = "구글 문서"
    with open(SRC, encoding="utf-8") as f:
        md = f.read()
    book = parse(md)
    with open(IMAGES, encoding="utf-8") as f:
        images = {k: v for k, v in json.load(f).items() if not k.startswith("_")}
    missing = [v for v in images.values() if not os.path.exists(os.path.join(IMG_DIR, v + ".jpg"))]
    if missing:
        print("[hanbit] 그림 파일이 없어 빼고 만듭니다:", ", ".join(sorted(set(missing))), file=sys.stderr)
        images = {k: v for k, v in images.items() if v not in missing}
    book["images"] = images
    kst = datetime.timezone(datetime.timedelta(hours=9))
    book["built"] = datetime.datetime.now(kst).strftime("%Y-%m-%d %H:%M")
    book["source"] = source
    n_sec = sum(len(c["sections"]) for c in book["chapters"])
    n_end = sum(len(s["endings"]) for c in book["chapters"] for s in c["sections"])
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("// tools/build_hanbit.py가 만든 파일입니다. 직접 고치지 말고 원고(data/hanbit/endingbook.md)를 고치세요.\n")
        f.write("window.HANBIT_BOOK = ")
        json.dump(book, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"[hanbit] {source} → {os.path.relpath(OUT, ROOT)} (장 {len(book['chapters'])}, 절 {n_sec}, 개인 엔딩 {n_end})")


if __name__ == "__main__":
    main()
