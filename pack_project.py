import os
import sys
import zipfile

out_path = sys.argv[1] if len(sys.argv) > 1 else "minecraft-ai-controller-framework.zip"
EXCLUDE_DIRS = {'node_modules', '.git', '.cache', '.gradle', 'build'}
EXCLUDE_FILES = {'yarn_versions.json'}

with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        for f in files:
            if f.endswith('.zip') or f in EXCLUDE_FILES or f == 'pack_project.py':
                continue
            fp = os.path.join(root, f)
            arc = os.path.relpath(fp, '.')
            zf.write(fp, arcname=arc)
print("Packed into", out_path)
