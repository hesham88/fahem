import os
uri = os.environ["FAHEM_URI"]
import pymongo
from collections import Counter
c = pymongo.MongoClient(uri, serverSelectionTimeoutMS=8000)
db = c["fahem"]; users = db["users"]
print("total users:", users.count_documents({}))
roles = Counter(u.get("role") for u in users.find({}, {"role":1}))
print("role distribution:", dict(roles))
print("\n-- 15 most recent users --")
for u in users.find({}, {"username":1,"role":1,"userType":1,"onboardingCompleted":1,"createdAt":1}).sort("createdAt",-1).limit(15):
    print(f"  role={str(u.get('role')):12} type={str(u.get('userType')):10} onbDone={str(u.get('onboardingCompleted')):5} user={str(u.get('username'))[:18]:18} created={str(u.get('createdAt'))[:19]}")
mism = list(users.find({"$expr":{"$ne":["$role","$userType"]}}, {"username":1,"role":1,"userType":1}).limit(20))
print(f"\nrole!=userType mismatches: {len(mism)}")
for u in mism[:12]:
    print(f"  role={str(u.get('role')):12} type={str(u.get('userType')):10} user={u.get('username')}")
dup = list(users.aggregate([{"$group":{"_id":"$username_clean","n":{"$sum":1}}},{"$match":{"n":{"$gt":1}}},{"$limit":15}]))
print(f"\nduplicate username_clean groups: {len(dup)}")
for d in dup[:10]:
    print(f"  username={d['_id']} count={d['n']}")
c.close()
