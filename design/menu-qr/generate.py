import segno, base64, io
from PIL import Image, ImageDraw
import os
LOGO=int(os.environ.get("LOGO","1"))
FR=float(os.environ.get("FR","1"))
GD=float(os.environ.get("GD","0"))
RAD=float(os.environ.get("RAD","0.46"))
URL="https://level40wellness.com/menu"
BW=os.environ.get("THEME")=="bw"
ESP,CREAM,GOLD=("#000000","#FFFFFF","#000000") if BW else ("#2C1E14","#F7F2E8","#C9A24B")
qr=segno.make(URL,error='h',boost_error=False)
m=[[bool(c) for c in row] for row in qr.matrix]; n=len(m)
S=24; Q=4; W=(n+2*Q)*S
logo=Image.open("/mnt/e/FL/level40-cafe/public/level40-logo.png").convert("RGBA")
if BW: logo=Image.merge("RGBA",(*[Image.new("L",logo.size,0)]*3,logo.split()[3]))
lw=int(n*S*0.30); lh=int(lw*logo.height/logo.width)
cx=cy=W/2; pad=S*0.8
clear=(cx-lw/2-pad, cy-lh/2-pad, cx+lw/2+pad, cy+lh/2+pad)
def finder(r,c): return (r<7 and c<7) or (r<7 and c>=n-7) or (r>=n-7 and c<7)
def cleared(r,c):
    if not LOGO: return False
    x=(c+Q)*S; y=(r+Q)*S
    return x+S>clear[0] and x<clear[2] and y+S>clear[1] and y<clear[3]
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {W}" width="{W}" height="{W}">',
 f'<title>Level 40 menu QR</title><desc>{URL}</desc>',
 f'<rect width="{W}" height="{W}" rx="{S*2}" fill="{CREAM}"/>',
 f'<rect x="{S*1.2}" y="{S*1.2}" width="{W-S*2.4}" height="{W-S*2.4}" rx="{S*1.2}" fill="none" stroke="{GOLD}" stroke-width="{S*0.35}"/>']
SC=4; img=Image.new("RGBA",(W*SC,W*SC),(0,0,0,0)); d=ImageDraw.Draw(img)
d.rounded_rectangle((0,0,W*SC-1,W*SC-1),radius=S*2*SC,fill=CREAM)
d.rounded_rectangle((S*1.2*SC,S*1.2*SC,(W-S*1.2)*SC,(W-S*1.2)*SC),radius=S*1.2*SC,outline=GOLD,width=int(S*0.35*SC))
dots=[]
for r in range(n):
    for c in range(n):
        if m[r][c] and not finder(r,c) and not cleared(r,c):
            x=(c+Q)*S+S/2; y=(r+Q)*S+S/2; rad=S*RAD
            dots.append(f'<circle cx="{x}" cy="{y}" r="{rad}"/>')
            d.ellipse(((x-rad)*SC,(y-rad)*SC,(x+rad)*SC,(y+rad)*SC),fill=ESP)
svg.append(f'<g fill="{ESP}">'+"".join(dots)+'</g>')
for (r,c) in [(0,0),(0,n-7),(n-7,0)]:
    x=(c+Q)*S; y=(r+Q)*S
    svg.append(f'<rect x="{x}" y="{y}" width="{7*S}" height="{7*S}" rx="{S*1.8*FR}" fill="{ESP}"/>')
    svg.append(f'<rect x="{x+S}" y="{y+S}" width="{5*S}" height="{5*S}" rx="{S*1.2*FR}" fill="{CREAM}"/>')
    svg.append(f'<rect x="{x+2*S}" y="{y+2*S}" width="{3*S}" height="{3*S}" rx="{S*0.9*FR}" fill="{ESP}"/>')
    d.rounded_rectangle((x*SC,y*SC,(x+7*S)*SC,(y+7*S)*SC),radius=S*1.8*FR*SC,fill=ESP)
    d.rounded_rectangle(((x+S)*SC,(y+S)*SC,(x+6*S)*SC,(y+6*S)*SC),radius=S*1.2*FR*SC,fill=CREAM)
    d.rounded_rectangle(((x+2*S)*SC,(y+2*S)*SC,(x+5*S)*SC,(y+5*S)*SC),radius=S*0.9*FR*SC,fill=ESP)
b=io.BytesIO(); logo.save(b,"PNG"); b64=base64.b64encode(b.getvalue()).decode()
svg.append(f'<image x="{cx-lw/2}" y="{cy-lh/2}" width="{lw}" height="{lh}" xlink:href="data:image/png;base64,{b64}"/>')
svg.append('</svg>')
out=os.path.dirname(os.path.abspath(__file__))+"/level40-menu-qr"+("-bw" if BW else "")
import os; os.makedirs(os.path.dirname(out),exist_ok=True)
open(out+".svg","w").write("\n".join(svg))
L=logo.resize((lw*SC,lh*SC),Image.LANCZOS); LOGO and img.alpha_composite(L,(int((cx-lw/2)*SC),int((cy-lh/2)*SC)))
img=img.resize((W*2,W*2),Image.LANCZOS); img.save(out+".png")
print(n,W*2)
