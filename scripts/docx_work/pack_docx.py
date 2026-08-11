import os
import sys
import zipfile

source_dir, output_file = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED) as archive:
    for root, _, files in os.walk(source_dir):
        for filename in files:
            absolute_path = os.path.join(root, filename)
            archive_name = os.path.relpath(absolute_path, source_dir).replace(os.sep, '/')
            archive.write(absolute_path, archive_name)
