#!/usr/bin/env python3
"""data/*.csv (구글 시트 export) → site/assets/data.js

화면에 내보내지 않는 제작용 컬럼은 여기서 버린다:
  게시글 '연결된 진실·단서'·'핵심/분위기', 사용자 '실제 인물'·'메모'·'비밀번호',
  광고 '의미', 로그인 탭 전체(비밀번호는 해시로만 남긴다).
"""
import base64, csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "site", "assets", "data.js")

SALT = "haewon"
NOW = "2025-07-17 19:10"  # 4막에서 사이트를 보는 '지금'


def rows(name):
    """시트 탭 CSV + data/extra/ 의 같은 이름 CSV (시트에 없는 배경용 추가분)"""
    out = []
    for path in (os.path.join(DATA, name + ".csv"), os.path.join(DATA, "extra", name + ".csv")):
        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                out += [{k.strip(): (v or "").strip() for k, v in r.items()} for r in csv.DictReader(f)]
    return out


def cyrb53(s, seed=0):
    """app.js의 hash()와 같은 53비트 해시."""
    h1 = (0xDEADBEEF ^ seed) & 0xFFFFFFFF
    h2 = (0x41C6CE57 ^ seed) & 0xFFFFFFFF
    for ch in (ord(c) for c in s):
        h1 = ((h1 ^ ch) * 2654435761) & 0xFFFFFFFF
        h2 = ((h2 ^ ch) * 1597334677) & 0xFFFFFFFF
    h1 = ((h1 ^ (h1 >> 16)) * 2246822507) & 0xFFFFFFFF
    h1 ^= ((h2 ^ (h2 >> 13)) * 3266489909) & 0xFFFFFFFF
    h2 = ((h2 ^ (h2 >> 16)) * 2246822507) & 0xFFFFFFFF
    h2 ^= ((h1 ^ (h1 >> 13)) * 3266489909) & 0xFFFFFFFF
    return str(4294967296 * (2097151 & h2) + (h1 & 0xFFFFFFFF))


def secret(key, value):
    return cyrb53(f"{SALT}:{key}:{value.strip().lower()}")


DEVICE_COND = {
    "S2 잠금 해제": "S2",
    "S3 자동로그인(외골수)": "S3",
    "보관함 열쇠(별꽃)": "WIRO",
}


def cond(raw):
    """공개 조건 문자열 → {t: ...}"""
    c = raw.strip()
    if not c or c == "공개":
        return {"t": "pub"}
    m = re.match(r"로그인 필요:\s*(.+)$", c)
    if m:
        v = m.group(1).strip()
        if v in DEVICE_COND:
            return {"t": "dev", "d": DEVICE_COND[v]}
        return {"t": "acct", "a": v}
    m = re.match(r"삭제됨\(원문은 (\S+) 로그인 시\)", c)
    if m:
        return {"t": "delorig", "a": m.group(1)}
    if c.startswith("삭제됨"):
        return {"t": "del"}
    m = re.match(r"블라인드 \(원문은 (\S+) 로그인 시\)", c)
    if m:
        return {"t": "blindorig", "a": m.group(1)}
    if c.startswith("블라인드"):
        return {"t": "blind"}
    sys.exit(f"알 수 없는 공개 조건: {raw!r}")


def num(v):
    try:
        return int(v.replace(",", ""))
    except ValueError:
        return 0


def build():
    sites = [{"id": r["사이트ID"], "name": r["이름"], "kind": r["성격"]} for r in rows("sites")]
    boards = {}
    for r in rows("boards"):
        boards.setdefault(r["사이트"], []).append({"name": r["게시판"], "desc": r["설명"]})

    users = {}
    for r in rows("users"):
        if r["아이디"].startswith("DEVICE_"):
            continue
        users[r["아이디"]] = {"n": r["닉네임"], "j": r["가입일"], "s": r["사이트"].split(",")[0].strip()}

    posts = []
    for r in rows("posts"):
        posts.append({
            "id": r["글ID"], "s": r["사이트"], "b": r["게시판"], "a": r["작성자 아이디"],
            "d": r["일시"], "t": r["제목"], "x": r["본문"],
            "v": num(r["조회"]), "l": num(r["좋아요"]), "c": cond(r["공개 조건"]),
        })

    comments = {}
    for r in rows("comments"):
        comments.setdefault(r["글ID"], []).append({
            "id": r["댓글ID"], "a": r["작성자 아이디"], "d": r["일시"], "x": r["본문"], "r": r["대댓글 대상"],
        })
    for lst in comments.values():
        lst.sort(key=lambda c: (c["d"], c["id"]))

    messages = [{
        "id": r["메시지ID"], "s": r["사이트"], "f": r["보낸 사람"], "to": r["받는 사람"],
        "d": r["일시"], "x": r["본문"], "c": cond(r["공개 조건"]),
    } for r in rows("messages")]
    messages.sort(key=lambda m: (m["d"], m["id"]))

    ads = [{
        "id": r["광고ID"], "s": r["사이트"], "pos": r["위치"], "who": r["광고주"],
        "x": r["문구"], "per": r["노출 기간"], "link": r["링크 대상"],
    } for r in rows("ads")]

    # 로그인: 사용자 탭 비밀번호 칸 + 로그인 탭 '아이디 / 비번' 표기를 합쳐 해시만 남긴다.
    def hashes(i, pw):  # "a|b|c" = 여러 표기를 모두 받는다
        hs = [secret(i, x.strip()) for x in pw.split("|") if x.strip()]
        return hs[0] if len(hs) == 1 else hs

    accounts = {}
    for r in rows("users"):
        pw = r["비밀번호"]
        if pw and not pw.startswith(("(", "S2", "패턴", "PIN")):
            for s in r["사이트"].split(","):
                accounts[r["아이디"]] = {"s": s.strip(), "h": hashes(r["아이디"], pw)}
    devices = {}
    for r in rows("logins"):
        acct, site = r["계정"], r["사이트"]
        m = re.match(r"^([\w-]+)\s*/\s*(\S+)$", acct)
        if m:
            accounts[m.group(1)] = {"s": site, "h": hashes(m.group(1), m.group(2))}
            continue
        m = re.match(r"^S2 잠금 패턴 ([\d-]+)", acct)
        if m:
            devices["S2"] = {"k": "pattern", "h": secret("S2", m.group(1))}
            continue
        m = re.match(r"^S3 PIN (\d+)", acct)
        if m:
            devices["S3"] = {"k": "pin", "h": secret("S3", m.group(1)), "n": len(m.group(1))}
            continue
        m = re.match(r"^별꽃 폰 PIN (\d+)", acct)
        if m:
            devices["WIRO"] = {"k": "pin", "h": secret("WIRO", m.group(1)), "n": len(m.group(1))}
    # S3를 열면 자동으로 로그인되는 이다음 계정
    autologin = {"S3": [["S1", "room702"], ["S10", "dawn_702"]]}

    for need in ("S2", "S3", "WIRO"):
        if need not in devices:
            sys.exit(f"로그인 탭에서 {need} 잠금 정보를 찾지 못했습니다")

    bundle = {
        "now": NOW, "sites": sites, "boards": boards, "users": users, "posts": posts,
        "comments": comments, "messages": messages, "ads": ads,
        "auth": {"salt": SALT, "accounts": accounts, "devices": devices, "auto": autologin},
    }
    raw = json.dumps(bundle, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* generated by tools/build.py — 직접 고치지 말고 시트를 고친 뒤 다시 빌드 */\n")
        f.write("window.HW_DATA=\"" + base64.b64encode(raw).decode("ascii") + "\";\n")
    print(f"posts {len(posts)} · comments {sum(map(len, comments.values()))} · messages {len(messages)}"
          f" · users {len(users)} · ads {len(ads)} · accounts {sorted(accounts)} → {os.path.relpath(OUT, ROOT)}"
          f" ({len(raw)//1024} KB)")


if __name__ == "__main__":
    build()
