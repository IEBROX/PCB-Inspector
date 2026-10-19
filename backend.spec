# -*- mode: python ; coding: utf-8 -*-
import os
import sys
from PyInstaller.utils.hooks import collect_data_files, collect_submodules, copy_metadata
import importlib.util

block_cipher = None

def safe_copy_metadata(pkg):
    try:
        return copy_metadata(pkg)
    except Exception:
        return []

def safe_collect_data(pkg):
    try:
        return collect_data_files(pkg)
    except Exception:
        return []

datas = []
datas += safe_collect_data('ultralytics')
datas += safe_copy_metadata('ultralytics')
datas += safe_copy_metadata('torch')
datas += safe_copy_metadata('torchvision')
datas += safe_copy_metadata('requests')
datas += safe_copy_metadata('pyyaml')

# Bundle model checkpoint
model_file = os.path.abspath(os.path.join('backend', 'models', 'pcb_best.pt'))
if os.path.exists(model_file):
    datas.append((model_file, 'models'))

# Bundle sample PCB images
samples_dir = os.path.abspath('samples')
if os.path.exists(samples_dir):
    datas.append((samples_dir, 'samples'))

hidden_imports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.lifespan.off',
    'fastapi',
    'pydantic',
    'aiofiles',
    'multipart',
    'python_multipart',
    'ultralytics',
    'ultralytics.nn',
    'ultralytics.models',
    'ultralytics.models.yolo',
    'ultralytics.models.yolo.detect',
    'torch',
    'torchvision',
    'cv2',
    'PIL',
    'PIL.Image',
    'sqlite3',
]

hidden_imports += collect_submodules('ultralytics')
hidden_imports += collect_submodules('uvicorn')
hidden_imports += [
    'torchvision.ops',
    'torchvision.ops.boxes',
    'torchvision.extension',
]

# Torchvision C++ ops (_C_stable.pyd) are required for Ultralytics NMS in frozen builds.
binaries = []
_tv_spec = importlib.util.find_spec('torchvision')
if _tv_spec and _tv_spec.submodule_search_locations:
    tv_root = list(_tv_spec.submodule_search_locations)[0]
    tv_native = os.path.join(tv_root, '_C_stable.pyd')
    if os.path.exists(tv_native):
        binaries.append((tv_native, 'torchvision'))
    for native_dll in ('jpeg8.dll', 'libpng16.dll', 'libsharpyuv.dll', 'libwebp.dll', 'zlib.dll'):
        dll_path = os.path.join(tv_root, native_dll)
        if os.path.exists(dll_path):
            binaries.append((dll_path, 'torchvision'))

a = Analysis(
    ['backend/main.py'],
    pathex=[os.path.abspath('backend')],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib.tests', 'scipy.spatial.tests'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='pcb-backend',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True, # Console=True makes logs visible in terminal and avoids silent crash
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='pcb-backend',
)
