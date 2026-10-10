"""Rebuild the tree-room and koi-garden walking surfaces from their SPZ assets."""
import gzip,json,math,collections
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for name in ['world-tung-v2','world-capybara']:
 b=gzip.open(root/f'dist/assets/{name}/ceramic-500k.spz','rb').read()
 n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.10 if name=='world-tung-v2' else .12
 cells=collections.defaultdict(collections.Counter)
 for i in range(n):
  x,y,z=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];y=-y;z=-z
  inside=(-1.2<x<1.2 and -2.5<z<.65) if name=='world-tung-v2' else (-4.5<x<2 and -6<z<4)
  if inside and -1.6<y<.5:cells[math.floor(x/cell),math.floor(z/cell)][round(y/.04)]+=1
 out={}
 for (x,z),hist in cells.items():
  px,pz=(x+.5)*cell,(z+.5)*cell
  if name=='world-capybara':
   # Keep the koi pond off the walking map, following its curved eastern bank.
   edge=.72 if pz<-.8 else .30 if pz<.6 else .30-(pz-.6)*1.35
   if px<edge:continue
  levels=[(k,c) for k,c in hist.items() if -1.52<k*.04<-.44 and c>=4]
  if not levels:continue
  level,count=max(levels,key=lambda v:v[1]);height=level*.04
  if sum(c for k,c in hist.items() if height+.16<k*.04<height+.65)>max(35,count*2):continue
  out[f'{x},{z}']=round(height,3)
 target=(0,-1.05) if name=='world-tung-v2' else (.85,-.25)
 candidates=[]
 for key,h in out.items():
  x,z=map(int,key.split(','));px,pz=(x+.5)*cell,(z+.5)*cell
  if abs(px-target[0])>.4 or abs(pz-target[1])>.4:continue
  neighbors=[out.get(f'{x+dx},{z+dz}') for dx,dz in [(0,1),(0,-1),(1,0),(-1,0)]]
  if all(v is not None and abs(v-h)<.18 for v in neighbors):candidates.append((px,h,pz))
 spawn=min(candidates,key=lambda p:(p[0]-target[0])**2+(p[2]-target[1])**2)
 (root/f'dist/assets/{name}/navigation.json').write_text(json.dumps({'cell':cell,'ground':out,'spawn':spawn,'spawnYaw':0},separators=(',',':')))
 print(name,'cells:',len(out),'spawn:',spawn)
