import os
import pymongo

uri = os.environ.get("MONGODB_URI", "mongodb+srv://fahem_mcp:RJkyLV67fo6hEqUv@fahemcluster-pri.trf718.mongodb.net/?appName=FahemCluster")
client = pymongo.MongoClient(uri)
db = client["fahem_sandbox"]

print("Collections in fahem_sandbox:")
print(db.list_collection_names())

print("\nBooks in fahem_sandbox.books:")
for book in db["books"].find():
    print(f"- ID: {book.get('_id') or book.get('id')}, Title: {book.get('title')}, Subject ID: {book.get('subject_id')}, Chapters: {len(book.get('chapters', [])) if book.get('chapters') else 0}")
