"""Download and optimize verified CC0 representative photographs for FleetOps."""
import base64, hashlib, io, json, pathlib, re, sys, time, urllib.parse, urllib.request
from PIL import Image, ImageOps

root=pathlib.Path(__file__).resolve().parents[1]
src=(root/'src/vehicle-photos.js').read_text(encoding='utf8')
match=re.search(r'Object\.freeze\((\{[\s\S]*?\})\);',src)
manifest=json.loads(match.group(1))
dest=root/'assets'/'vehicle-photos'
dest.mkdir(parents=True,exist_ok=True)
ua='KODYRA-FleetOps/1.0 (https://github.com/Elghouali/kodyra-fleetops; representative vehicle photo asset preparation)'
def fetch(url):
    request=urllib.request.Request(url,headers={'User-Agent':ua,'Accept':'*/*'})
    with urllib.request.urlopen(request,timeout=40) as response:
        return response.read()
api='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({
    'action':'query','format':'json','formatversion':2,'prop':'imageinfo','iiprop':'url|extmetadata',
    'titles':'|'.join('File:'+v['file'] for v in manifest.values())
})
pages=json.loads(fetch(api))['query']['pages']
by_title={p['title'].replace('_',' '):p for p in pages}
for key,item in manifest.items():
    title='File:'+item['file'].replace('_',' ')
    page=by_title.get(title)
    if not page or not page.get('imageinfo'): raise RuntimeError('Cannot verify '+title)
    info=page['imageinfo'][0]
    license=info.get('extmetadata',{}).get('LicenseShortName',{}).get('value','')
    if 'CC0' not in license: raise RuntimeError('Unexpected license for '+title+': '+license)
    url=info['url']
    raw=fetch(url)
    with Image.open(io.BytesIO(raw)) as original:
        im=ImageOps.exif_transpose(original).convert('RGB')
        im.thumbnail((480,330),Image.Resampling.LANCZOS)
        for quality in (82,72,62,52,42,32):
            out=io.BytesIO()
            im.save(out,format='JPEG',quality=quality,optimize=True)
            if out.tell()<=11000: break
        data=out.getvalue()
        if len(data)>18000: raise RuntimeError('Optimized file too large '+key)
        if min(im.size)<100: raise RuntimeError('Image unexpectedly small '+key)
    (dest/(key+'.jpg')).write_bytes(data)
    (dest/(key+'.base64')).write_text(base64.b64encode(data).decode('ascii')+'\n',encoding='ascii')
    print(key,title,license,im.size,len(data),flush=True)
    time.sleep(.3)
print('Verified and prepared',len(manifest),'photographs.')
