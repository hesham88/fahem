import json
import os

dicts_dir = r"C:\Users\hesh1\Desktop\fahem\web\src\dictionaries"

translations = {
    "de.json": {
        "nav_signin_explore": "Anmelden",
        "go_to_dashboard": "Gehe zum Dashboard"
    },
    "es.json": {
        "nav_signin_explore": "Iniciar Sesión",
        "go_to_dashboard": "Ir al panel de control"
    },
    "fr.json": {
        "nav_signin_explore": "Se Connecter",
        "go_to_dashboard": "Aller au tableau de bord"
    },
    "it.json": {
        "nav_signin_explore": "Accedi",
        "go_to_dashboard": "Vai alla dashboard"
    },
    "zh.json": {
        "nav_signin_explore": "登录",
        "go_to_dashboard": "进入控制面板"
    }
}

for filename, keys in translations.items():
    filepath = os.path.join(dicts_dir, filename)
    if not os.path.exists(filepath):
        print(f"Skipping {filename}: not found")
        continue

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Insert keys after nav_signin
    new_data = {}
    for k, v in data.items():
        new_data[k] = v
        if k == "nav_signin":
            new_data["nav_signin_explore"] = keys["nav_signin_explore"]
            new_data["go_to_dashboard"] = keys["go_to_dashboard"]

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)
    print(f"Successfully updated {filename}")
