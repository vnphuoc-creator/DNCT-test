import os
import zipfile

output_filename = "public/aht-dnct-quiz-latest.zip"
exclude_dirs = {"node_modules", ".next", ".git", ".aistudio"}
exclude_exts = {".zip"}

print(f"Creating clean zip archive {output_filename}...")
os.makedirs("public", exist_ok=True)

with zipfile.ZipFile(output_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
    for root, dirs, files in os.walk("."):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if any(file.endswith(ext) for ext in exclude_exts):
                continue
            file_path = os.path.join(root, file)
            arcname = os.path.relpath(file_path, ".")
            zipf.write(file_path, arcname)

print("ZIP created successfully!")
