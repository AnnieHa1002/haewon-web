"""One-off: convert Sheets MCP dumps to per-tab CSV in data/."""
import csv, json, sys
names = {"사이트":"sites","게시판":"boards","사용자":"users","게시글":"posts","댓글":"comments","메시지":"messages","로그인":"logins","광고":"ads"}
def write(tab, rows):
    w = max(len(r) for r in rows)
    rows = [r + [""]*(w-len(r)) for r in rows]
    while rows and not any(c.strip() for c in rows[-1]): rows.pop()
    with open(f"data/{names[tab]}.csv","w",newline="",encoding="utf-8") as f:
        csv.writer(f).writerows(rows)
    print(tab, len(rows)-1)
for p in sys.argv[1:]:
    d = json.load(open(p))
    if "values" in d:
        tab = d["range"].split("!")[0].strip("'")
        write(tab, d["values"])
    else:
        for s in d["sheets"]:
            rows=[]
            for blk in s.get("data",[]):
                for rd in blk.get("rowData",[]):
                    rows.append([c.get("formattedValue","") for c in rd.get("values",[])])
            write(s["properties"]["title"], rows)
