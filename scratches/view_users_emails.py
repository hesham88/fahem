import json

db_path = r"C:\Users\hesh1\Desktop\fahem\web\src\app\api\local_db.json"
with open(db_path, "r", encoding="utf-8") as f:
    db = json.load(f)

print("ADMINS:")
for admin in db.get("admins", []):
    print(" ", admin)

print("\nUSERS:")
for user in db.get("users", []):
    print(" ", user.get("email"), "| Name:", user.get("name"), "| Role:", user.get("role"))
