"""Rebuild public starter downloads from the version-controlled examples; never include real .env files."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parents[1]
for language in ['node', 'python']:
    source = root / 'examples' / ('aio-' + language)
    target = root / 'public' / 'downloads' / ('aio-' + language + '-starter.zip')
    target.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(target, 'w', compression=ZIP_DEFLATED) as archive:
        for file in sorted(source.iterdir()):
            if file.is_file() and file.name != '.env' and file.suffix != '.pyc':
                archive.write(file, 'aio-' + language + '-starter/' + file.name)
    print(target.name)
