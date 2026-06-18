import os, sys, time, json
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agents")))
from tools import get_mongodb_uri
from pymongo import MongoClient

uri = get_mongodb_uri()
print("uri prefix:", uri[:25])
c = MongoClient(uri, serverSelectionTimeoutMS=8000)
t0=time.time(); c.admin.command("ping"); print("ping ms:", round((time.time()-t0)*1000))
db = c["fahem"]

print("\n=== BOOKS (chapters source for TOC) ===")
for b in db["books"].find({}, {"title":1,"chapters":1,"total_pages":1,"subject_id":1,"is_completed":1,"userId":1}):
    chs = b.get("chapters") or []
    titles = [ (ch.get("title") or ch.get("titleEn") or ch.get("title_en") or "?") for ch in chs[:8] ]
    ntopics = sum(len(ch.get("topics") or []) for ch in chs)
    print(f"- {str(b.get('_id'))[:28]:28} '{str(b.get('title'))[:34]:34}' subj={str(b.get('subject_id'))[:18]:18} chs={len(chs):3} topics={ntopics:4} pages={b.get('total_pages')} owner={b.get('userId')}")
    print(f"    chapterTitles: {titles}")

print("\n=== timing hot reads ===")
# subjects endpoint shape
t0=time.time()
subs=list(db["subjects"].find({}))
print("subjects find ms:", round((time.time()-t0)*1000), "count:", len(subs))
t0=time.time()
for s in subs:
    db["books"].count_documents({"subject_id": s["_id"]})
    list(db["books"].find({"subject_id": s["_id"], "role":"core"}, {"_id":1}))
    list(db["books"].find({"subject_id": s["_id"], "role":"supporting"}, {"_id":1}))
print("subjects per-subject book queries ms:", round((time.time()-t0)*1000))

# book_pages timing for each book
print("\n=== book_pages query timing per book ===")
for b in db["books"].find({}, {"_id":1,"title":1}):
    bid=b["_id"]
    t0=time.time()
    n=db["book_pages"].count_documents({"book_id": bid})
    t1=time.time()
    pages=list(db["book_pages"].find({"book_id":bid}, {"embedding":0,"page_image_base64":0,"image":0}).sort("page_number",1))
    t2=time.time()
    print(f"- {str(bid)[:28]:28} count={n:4} ({round((t1-t0)*1000)}ms) fetch={len(pages):4} ({round((t2-t1)*1000)}ms)")

print("\n=== indexes ===")
for coll in ["book_pages","books","subjects","user_activities"]:
    print(coll, "->", [ix.get("key") for ix in db[coll].list_indexes()])

c.close()
