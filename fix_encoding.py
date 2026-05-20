import os, glob

folder = r'c:\Users\renos\OneDrive\Dokumen\SEMESTER 4\TKI\ScholarSearchID\templates'
for f in glob.glob(os.path.join(folder, '*.html')):
    with open(f, 'rb') as fh:
        raw = fh.read()
    original = raw
    # Fix UTF-8 special chars to ASCII
    raw = raw.replace(b'\xe2\x80\xa2', b'*')       # bullet
    raw = raw.replace(b'\xe2\x80\x93', b'--')      # en dash
    raw = raw.replace(b'\xe2\x80\x94', b'--')      # em dash
    raw = raw.replace(b'\xe2\x80\xa6', b'...')      # ellipsis
    raw = raw.replace(b'\xe2\x80\x98', b"'")        # left single quote
    raw = raw.replace(b'\xe2\x80\x99', b"'")        # right single quote
    raw = raw.replace(b'\xe2\x80\x9c', b'"')        # left double quote
    raw = raw.replace(b'\xe2\x80\x9d', b'"')        # right double quote
    raw = raw.replace(b'\xe2\x80\xb2', b"'")        # prime
    raw = raw.replace(b'\xc2\xa0', b' ')            # non-breaking space
    if raw != original:
        with open(f, 'wb') as fh:
            fh.write(raw)
        print(f'Fixed: {os.path.basename(f)}')
    else:
        print(f'OK: {os.path.basename(f)}')
print('Done!')
