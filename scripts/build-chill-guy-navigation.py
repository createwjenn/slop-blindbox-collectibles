"""Build walkable meadow terrain for Chill Guy from the supplied SPZ."""
import gzip,json,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=gzip.open(root/'dist/assets/world-chill-guy/ceramic-500k.spz','rb').read()
n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.18
cells=collections.defaultdict(collections.Counter)
for i in range(n):
 x,y,z=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];y=-y;z=-z
 if not (abs(x)<14 and abs(z)<14 and -2<y<1.2):continue
 cells[math.floor(x/cell),math.floor(z/cell)][round(y/.04)]+=1
out={}
for (x,z),hist in cells.items():
 levels=[(k,c) for k,c in hist.items() if -1.8<k*.04<.1 and c>=4]
 if not levels:continue
 level,count=max(levels,key=lambda v:v[1]);height=level*.04
 if sum(c for k,c in hist.items() if height+.2<k*.04<height+.7)>max(45,count*3):continue
 out[f'{x},{z}']=round(height,3)
for _ in range(2):
 extra={}
 for x,z in cells:
  key=f'{x},{z}'
  if key in out:continue
  values=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(0,1),(0,-1),(1,0),(-1,0)]]
  if all(v is not None for v in values) and max(values)-min(values)<.15:extra[key]=round(sum(values)/4,3)
 out.update(extra)
candidates=[]
for key,h in out.items():
 x,z=map(int,key.split(','));px,pz=(x+.5)*cell,(z+.5)*cell
 if abs(px)>.4 or not -.7<pz<.2:continue
 neighbors=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(0,1),(0,-1),(1,0),(-1,0)]]
 if all(v is not None and abs(v-h)<.15 for v in neighbors):candidates.append((px,h,pz))
spawn=min(candidates,key=lambda p:p[0]**2+(p[2]+.3)**2)
(root/'dist/assets/world-chill-guy/navigation.json').write_text(json.dumps({'cell':cell,'ground':out,'spawn':spawn,'spawnYaw':0},separators=(',',':')))
print('Walkable cells:',len(out),'Spawn:',spawn)
