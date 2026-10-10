"""Map the hall's upper-floor walkways, excluding the stairwell and furniture."""
import gzip,json,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=gzip.open(root/'dist/assets/world-ballerina/ceramic-500k.spz','rb').read()
n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.10
cells=collections.defaultdict(collections.Counter)
for i in range(n):
 x,y,z=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];y=-y;z=-z
 if not (-1.6<x<1.45 and -7.2<z<.85 and -.8<y<.4):continue
 cells[math.floor(x/cell),math.floor(z/cell)][round(y/.025)]+=1
out={}
for (x,z),hist in cells.items():
 levels=[(k,c) for k,c in hist.items() if -.72<k*.025<-.48 and c>=4]
 if not levels:continue
 level,count=max(levels,key=lambda v:v[1]);height=level*.025
 if sum(c for k,c in hist.items() if height+.12<k*.025<height+.7)>max(25,count*1.4):continue
 # The central void and its balustrade are not part of the upper floor.
 px,pz=(x+.5)*cell,(z+.5)*cell
 if -.72<px<.65 and -2.6<pz<-.25:continue
 out[f'{x},{z}']=round(height,3)
candidates=[]
for key,h in out.items():
 x,z=map(int,key.split(','));px,pz=(x+.5)*cell,(z+.5)*cell
 if not (.85<px<1.2 and -.7<pz<.1):continue
 neighbors=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(0,1),(0,-1),(1,0),(-1,0)]]
 if all(v is not None and abs(v-h)<.08 for v in neighbors):candidates.append((px,h,pz))
spawn=min(candidates,key=lambda p:(p[0]-1)**2+(p[2]+.35)**2)
(root/'dist/assets/world-ballerina/navigation.json').write_text(json.dumps({'cell':cell,'ground':out,'spawn':spawn,'spawnYaw':0},separators=(',',':')))
print('Walkable cells:',len(out),'Spawn:',spawn)
