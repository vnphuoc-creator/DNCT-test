import os
import zipfile

output_filename = "public/aht-dnct-quiz-update.zip"
include_dirs = ["app", "lib", "components", "public"]
include_files = ["package.json", "next.config.js", "next.config.mjs", "README.md", ".env.example"]

if os.path.exists(output_filename):
    os.remove(output_filename)

with zipfile.ZipFile(output_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
    for fname in include_files:
        if os.path.exists(fname):
            zipf.write(fname, fname)
    
    for folder in include_dirs:
        if not os.path.exists(folder):
            continue
        for root, dirs, files in os.walk(folder):
            for file in files:
                if file.endswith(".zip"):
                    continue
                file_path = os.path.join(root, file)
                zipf.write(file_path, file_path)

print(f"Created {output_filename} with size: {os.path.getsize(output_filename)} bytes")
