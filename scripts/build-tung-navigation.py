"""Build the walkable stone lane and stair terrain for Tung Tung Tung."""
import gzip,json,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=gzip.open(root/'dist/assets/world-tung-tung-tung/ceramic-500k.spz','rb').read()
n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.12
cells=collections.defaultdict(collections.Counter)
for i in range(n):
 x,y,z=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];y=-y;z=-z
 if not (-2.5<x<2.5 and -9<z<2 and -1.6<y<2.5):continue
 cells[math.floor(x/cell),math.floor(z/cell)][round(y/.04)]+=1
out={}
for (x,z),hist in cells.items():
 levels=[(k,c) for k,c in hist.items() if -1.4<k*.04<1.8 and c>=4]
 if not levels:continue
 level,count=max(levels,key=lambda v:v[1]);height=level*.04
 if sum(c for k,c in hist.items() if height+.18<k*.04<height+.65)>max(35,count*2):continue
 out[f'{x},{z}']=round(height,3)
# Bridge isolated point-cloud sampling holes only when all four neighbors agree.
for _ in range(2):
 extra={}
 for x,z in cells:
  key=f'{x},{z}'
  if key in out:continue
  neighbors=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]]
  if all(v is not None for v in neighbors) and max(neighbors)-min(neighbors)<.16:extra[key]=round(sum(neighbors)/4,3)
 out.update(extra)
candidates=[]
for key,h in out.items():
 x,z=map(int,key.split(','))
 if abs((x+.5)*cell)>.4 or not -.6<(z+.5)*cell<.2:continue
 neighbors=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(0,1),(0,-1),(1,0),(-1,0)]]
 if all(v is not None and abs(v-h)<.15 for v in neighbors):candidates.append(((x+.5)*cell,h,(z+.5)*cell))
spawn=min(candidates,key=lambda p:p[0]**2+(p[2]+.25)**2)
(root/'dist/assets/world-tung-tung-tung/navigation.json').write_text(json.dumps({'cell':cell,'ground':out,'spawn':spawn,'spawnYaw':0},separators=(',',':')))
print('Walkable cells:',len(out),'Spawn:',spawn)
