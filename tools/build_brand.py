"""Rasterize the official Jellyfin cubic paths, using only Python stdlib.

Source: jellyfin/jellyfin-ux branding/SVG/icon-transparent.svg (CC BY-SA 4.0).
Four samples per axis; generated PNG and embedded UI asset share the same bytes.
"""
import base64
import json
import math
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATHS = [
    'M256,201.6c-20.4,0-86.2,119.3-76.2,139.4s142.5,19.9,152.4,0S276.5,201.6,256,201.6z',
    'M256,23.3c-61.6,0-259.8,359.4-229.6,420.1s429.3,60,459.2,0S317.6,23.3,256,23.3z M406.5,390.8c-19.6,39.3-281.1,39.8-300.9,0s110.1-275.3,150.4-275.3S426.1,351.4,406.5,390.8z',
]

def contours(path):
    tokens = re.findall(r'[McsSz]|-?\d+(?:\.\d+)?', path)
    i = 0
    x = y = 0
    control = None
    result = []
    while i < len(tokens):
        cmd = tokens[i]; i += 1
        if cmd == 'M':
            x, y = map(float, tokens[i:i+2]); i += 2
            result.append([(x, y)]); control = None
        elif cmd == 'z':
            result[-1].append(result[-1][0]); x, y = result[-1][0]
            control = None
        else:
            n = 6 if cmd == 'c' else 4
            values = list(map(float, tokens[i:i+n])); i += n
            if cmd == 'c':
                a = (x+values[0], y+values[1]); values = values[2:]
            else:
                a = (2*x-control[0], 2*y-control[1]) if control else (x, y)
            b = (values[0], values[1]); end = (values[2], values[3])
            if cmd != 'S':
                b = (x+b[0], y+b[1]); end = (x+end[0], y+end[1])
            for step in range(1, 129):
                t = step/128; u = 1-t
                result[-1].append(tuple(u**3*p+3*u*u*t*q+3*u*t*t*r+t**3*s for p,q,r,s in zip((x,y),a,b,end)))
            x,y = end; control = b
    return result

def chunk(kind, data):
    return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))

def main():
    shapes = [contours(p) for p in PATHS]
    # Scanline even/odd fill; the two outer contours form the triangular ring.
    counts = [0]*(256*256)
    for y in range(1024):
        sy = (y+.5)/2
        for shape in shapes:
            hits = []
            for points in shape:
                for (ax,ay),(bx,by) in zip(points,points[1:]):
                    if (ay<=sy<by) or (by<=sy<ay):
                        hits.append(ax+(sy-ay)*(bx-ax)/(by-ay))
            hits.sort()
            for a,b in zip(hits[::2],hits[1::2]):
                for x in range(max(0,math.ceil(a*2-.5)),min(1024,math.ceil(b*2-.5))):
                    counts[(y//4)*256+x//4] += 1
    rows = bytearray()
    dx,dy = 496.14-110.25,436.09-213.3
    for y in range(256):
        rows.append(0)
        for x in range(256):
            t = max(0,min(1,((x*2+1-110.25)*dx+(y*2+1-213.3)*dy)/(dx*dx+dy*dy)))
            alpha = round(min(16,counts[y*256+x])*255/16)
            rows.extend([round(170*(1-t)) if alpha else 0,round(92+72*t) if alpha else 0,round(195+25*t) if alpha else 0,alpha])
    png = b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',256,256,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
    (ROOT/'icon.png').write_bytes(png)
    (ROOT/'brand.js').write_text('/* Jellyfin contributors, CC BY-SA 4.0; see BRANDING.md. */\nwindow.JellyfinBrand={icon:'+json.dumps('data:image/png;base64,'+base64.b64encode(png).decode())+'};\n',encoding='utf8')
    print('Generated official Jellyfin icon and embedded branding (256 x 256).')

if __name__ == '__main__':
    main()
