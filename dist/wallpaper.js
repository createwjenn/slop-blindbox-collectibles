let dialog,url,generation=0;
function createDialog(){
 const style=document.createElement('style');style.textContent=`
 .wallpaper-dialog{border:0;border-radius:24px;background:#f8f7f3;color:#171717;padding:24px;width:min(440px,calc(100vw - 32px));max-height:92svh;box-sizing:border-box;overflow:auto;font-family:'Helvetica Neue',Arial,sans-serif;box-shadow:0 24px 90px #0005}
 .wallpaper-dialog::backdrop{background:#15202b88;backdrop-filter:blur(12px)}
 .wallpaper-dialog h2{font-family:'Instrument Serif',serif;font-weight:400;font-size:32px;margin:0 30px 8px 0;color:#b51e19}
 .wallpaper-dialog p{font-size:14px;line-height:1.5}.wallpaper-dialog img{display:block;max-height:57svh;max-width:100%;width:auto;margin:16px auto;border-radius:12px}
 .wallpaper-dialog [hidden]{display:none!important}.wallpaper-close{position:absolute;right:16px;top:16px;border:0;background:none;font-size:26px;cursor:pointer}
 .wallpaper-buttons{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}.wallpaper-buttons a{font:inherit;font-size:14px;border:1px solid #ddd;border-radius:28px;padding:12px 18px;background:white;color:#111;text-decoration:none;cursor:pointer}
`;
 document.head.append(style);dialog=document.createElement('dialog');dialog.className='wallpaper-dialog';dialog.setAttribute('aria-labelledby','wallpaper-title');
 dialog.innerHTML=`<button class="wallpaper-close" aria-label="Close wallpaper preview">×</button><h2 id="wallpaper-title">Your Exclusive Slop Collectible</h2><p class="wallpaper-status" role="status">Loading your wallpaper…</p><img hidden alt=""><div class="wallpaper-buttons" hidden><a download>Download image</a></div>`;
 document.body.append(dialog);dialog.querySelector('.wallpaper-close').onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{generation++;if(url)URL.revokeObjectURL(url);url=null;dialog.querySelector('img').removeAttribute('src');});
}
export async function showWallpaper(entry){
 if(!dialog)createDialog();if(dialog.open)return;
 const id=++generation,status=dialog.querySelector('.wallpaper-status'),img=dialog.querySelector('img'),buttons=dialog.querySelector('.wallpaper-buttons');
 img.hidden=true;buttons.hidden=true;status.textContent='Loading your wallpaper…';dialog.showModal();
 // Let the popup paint before loading the saved portrait.
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 try{
  const response=await fetch(`./assets/wallpapers/${entry.slug}.png`);
  if(!response.ok)throw new Error('Wallpaper unavailable');
  const blob=await response.blob();if(id!==generation)return;
  url=URL.createObjectURL(blob);img.src=url;img.alt=`${entry.name}, front and center in a grassy meadow beneath a cloudy sky`;await img.decode();if(id!==generation)return;img.hidden=false;
  const download=dialog.querySelector('a');download.href=url;download.download=`slop-${entry.slug}-wallpaper.png`;buttons.hidden=false;
  status.textContent=`${entry.name} · 9:16 portrait · Ready for your lock screen`;
 }catch(error){console.error('Wallpaper export failed',error);status.textContent='Could not load the wallpaper. Close this window and try again.';}
}
