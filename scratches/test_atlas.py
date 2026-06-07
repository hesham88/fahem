from pymongo import MongoClient
import sys

uri = "mongodb+srv://fahem_mcp:DxHno98e5ngbAYHE@fahemcluster-pri.trf718.mongodb.net/?appName=FahemCluster"
try:
    client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    print("Databases:", client.list_database_names())
    db = client["fahem"]
    print("Collections in 'fahem':", db.list_collection_names())
    
    # Check books count
    if "books" in db.list_collection_names():
        print("Books count:", db["books"].count_documents({}))
        # Show one book
        one_book = db["books"].find_one()
        print("One book:", one_book)
    else:
        print("No 'books' collection found in 'fahem'!")
        
    if "libraries" in db.list_collection_names():
        print("Libraries count:", db["libraries"].count_documents({}))
    else:
        print("No 'libraries' collection found in 'fahem'!")
        
    if "curricula" in db.list_collection_names():
        print("Curricula count:", db["curricula"].count_documents({}))
    else:
        print("No 'curricula' collection found in 'fahem'!")
except Exception as e:
    print("Error:", e, file=sys.stderr)
