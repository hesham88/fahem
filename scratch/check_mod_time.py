import os
import time

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
if os.path.exists(db_path):
    mtime = os.path.getmtime(db_path)
    print(f"Modification time: {time.ctime(mtime)}")
    print(f"Current time: {time.ctime(time.time())}")
else:
    print("local_db.json not found")
