"""Derive Niu Lai's walkable valley terrain from the bundled SPZ point cloud."""
import gzip,json,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=gzip.open(root/'dist/assets/world-niu-lai/ceramic-500k.spz','rb').read()
n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.12
cells=collections.defaultdict(collections.Counter);colors=collections.defaultdict(list)
for i in range(n):
 x,y,z=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];y=-y;z=-z
 if not (-4<x<4 and -9<z<1.2 and -3<y<.8):continue
 key=(math.floor(x/cell),math.floor(z/cell));level=round(y/.05)
 cells[key][level]+=1
 rgb=b[16+n*10+i*3:19+n*10+i*3];colors[key,level].append(tuple(rgb))
out={}
for (x,z),hist in cells.items():
 levels=[(k,c) for k,c in hist.items() if -2.8<k*.05<-.2 and c>=4]
 if not levels:continue
 level,count=max(levels,key=lambda v:v[1]);height=level*.05
 if sum(c for k,c in hist.items() if height+.18<k*.05<height+.65)>max(45,count*2.5):continue
 rgb=colors[(x,z),level];r,g,blue=[sum(c[j] for c in rgb)/len(rgb) for j in range(3)]
 if blue>r*1.08 and blue>g*1.03:continue # The blue river surface is not a walking path.
 out[f'{x},{z}']=round(height,3)
candidates=[]
for key,h in out.items():
 x,z=map(int,key.split(','))
 if abs((x+.5)*cell)>.6 or not -.8<(z+.5)*cell<.1:continue
 neighbors=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(0,1),(0,-1),(1,0),(-1,0)]]
 if all(v is not None and abs(v-h)<.15 for v in neighbors):candidates.append(((x+.5)*cell,h,(z+.5)*cell))
spawn=min(candidates,key=lambda p:p[0]**2+(p[2]+.35)**2)
(root/'dist/assets/world-niu-lai/navigation.json').write_text(json.dumps({'cell':cell,'ground':out,'spawn':spawn,'spawnYaw':0},separators=(',',':')))
print('Walkable cells:',len(out),'Spawn:',spawn)
