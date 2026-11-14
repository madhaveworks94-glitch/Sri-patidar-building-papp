# Draws the app icon. Web icons: `python3 make_icons.py web`. In GitHub Actions (after "npx cap add android"): `python3 make_icons.py android`.
import os, sys
from PIL import Image, ImageDraw
G=(15,92,77,255); W=(255,255,255,255); A=(245,196,81,255)
def glyph(d,s,box):
    w=s*box*0.60; h=s*box*0.74; x0=(s-w)/2; y0=(s-h)/2
    d.rounded_rectangle([x0,y0,x0+w,y0+h],radius=s*box*0.06,fill=W)
    d.rectangle([x0,y0,x0+w*0.14,y0+h],fill=A)
    for i in range(5):
        y=y0+h*(0.17+i*0.15)
        d.rectangle([x0+w*0.3,y,x0+w*(0.88 if i<4 else 0.6),y+h*0.04],fill=G)
def legacy(s,round_):
    im=Image.new('RGBA',(s,s),(0,0,0,0)); d=ImageDraw.Draw(im)
    if round_: d.ellipse([0,0,s-1,s-1],fill=G)
    else: d.rounded_rectangle([0,0,s-1,s-1],radius=s*0.22,fill=G)
    glyph(d,s,0.62); return im
def fg(s):
    im=Image.new('RGBA',(s,s),(0,0,0,0)); glyph(ImageDraw.Draw(im),s,0.5); return im
mode=sys.argv[1] if len(sys.argv)>1 else 'web'
if mode=='web':
    for n in (192,512):
        im=Image.new('RGBA',(n,n),G); glyph(ImageDraw.Draw(im),n,0.62); im.save('icon-%d.png'%n)
else:
    RES='android/app/src/main/res'
    SIZES={'mdpi':(48,108),'hdpi':(72,162),'xhdpi':(96,216),'xxhdpi':(144,324),'xxxhdpi':(192,432)}
    for dens,(l,f) in SIZES.items():
        d=os.path.join(RES,'mipmap-'+dens)
        if not os.path.isdir(d): continue
        legacy(l,False).save(os.path.join(d,'ic_launcher.png'))
        legacy(l,True).save(os.path.join(d,'ic_launcher_round.png'))
        fg(f).save(os.path.join(d,'ic_launcher_foreground.png'))
    vals=os.path.join(RES,'values'); os.makedirs(vals,exist_ok=True)
    open(os.path.join(vals,'ic_launcher_background.xml'),'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="ic_launcher_background">#0F5C4D</color></resources>\n')
    print('Android icons written')
