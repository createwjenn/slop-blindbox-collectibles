"""Rebuild the grotto's terrain grid from its bundled SPZ point cloud (stdlib only)."""
import gzip,json,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
b=gzip.open(root/'dist/assets/world-tralalero/ceramic-500k.spz','rb').read()
n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.15
cells=collections.defaultdict(collections.Counter)
for i in range(n):
 x,y,z=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];y=-y;z=-z
 if not (-5<x<2 and -5<z<4):continue
 if -1.8<y<.6:cells[math.floor(x/cell),math.floor(z/cell)][round(y/.05)]+=1
out={}
for (x,z),hist in cells.items():
 floor=[(level,count) for level,count in hist.items() if -1.65<level*.05<-.16 and count>=3]
 if not floor:continue
 level,count=max(floor,key=lambda p:p[1]);height=level*.05
 # Reject dense upright rock and building surfaces at character height.
 if sum(v for k,v in hist.items() if height+.16<k*.05<height+.65)>max(35,count*2.8):continue
 out[f'{x},{z}']=round(height,3)
# Fill only tiny enclosed sampling gaps, never the unscanned world boundary.
for _ in range(2):
 additions={}
 for (x,z) in cells:
  key=f'{x},{z}'
  if key in out:continue
  values=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(1,0),(-1,0),(0,1),(0,-1)]]
  if all(v is not None for v in values) and max(values)-min(values)<.13:additions[key]=round(sum(values)/4,3)
 out.update(additions)
water=-.48
# A flat patch of the raised right-hand stone path, facing the central channel.
candidates=[((x+.5)*cell,h,(z+.5)*cell) for key,h in out.items() for x,z in [map(int,key.split(','))] if .5<(x+.5)*cell<1.05 and -.8<(z+.5)*cell<.1 and -.4<h<-.16]
spawn=min(candidates,key=lambda p:(p[0]-.75)**2+(p[2]+.25)**2)
nav={'cell':cell,'ground':out,'waterLevel':water,'spawn':list(spawn),'spawnYaw':0}
(root/'dist/assets/world-tralalero/navigation.json').write_text(json.dumps(nav,separators=(',',':')))
print('Ground cells:',len(out),'Spawn:',spawn)
