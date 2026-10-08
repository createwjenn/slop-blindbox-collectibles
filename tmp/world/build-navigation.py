import gzip,json,collections,math
from pathlib import Path
b=gzip.open('dist/assets/world/ceramic-500k.spz','rb').read();n=int.from_bytes(b[8:12],'little');scale=2**b[13];cell=.18
cells=collections.defaultdict(collections.Counter);obstacles=collections.Counter()
for i in range(n):
 p=[int.from_bytes(b[16+i*9+j*3:19+i*9+j*3],'little',signed=True)/scale for j in range(3)];x,y,z=p[0],-p[1],-p[2]
 if abs(x)>14 or abs(z)>14:continue
 key=(math.floor(x/cell),math.floor(z/cell))
 if -2.2<y<.10:cells[key][round(y/.06)]+=1
 elif .10<y<1.3:obstacles[key]+=1
out={}
for (x,z),hist in cells.items():
 level,count=hist.most_common(1)[0]
 if count<5:continue
 # Dense vertical structures are not walkable, while sparse grass is tolerated.
 if obstacles[x,z]>45:continue
 out[f'{x},{z}']=round(level*.06,3)
Path('dist/assets/world/navigation.json').write_text(json.dumps({'cell':cell,'ground':out},separators=(',',':')))
print('ground cells',len(out),'spawn',out.get('0,0'))
