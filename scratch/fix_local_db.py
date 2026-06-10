import os

db_path = "C:/Users/hesh1/Desktop/fahem/web/src/app/api/local_db.json"
if os.path.exists(db_path):
    with open(db_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace email
    new_content = content.replace("hesham1988@gmail.com", "admin@fahem_sandbox.com")
    
    with open(db_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Replacement complete!")
else:
    print("File not found")
