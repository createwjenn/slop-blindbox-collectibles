let overlay;
export function enterWorld(entry){
 if(overlay)return;
 const previous=document.activeElement;
 overlay=document.createElement('dialog');overlay.setAttribute('aria-label',`${entry.name} in your World Labs world`);
 overlay.style='position:fixed;inset:0;margin:0;padding:0;border:0;width:100vw;height:100svh;max-width:none;max-height:none;background:#f8f7f3';
 const frame=document.createElement('iframe');frame.title=`Explore as ${entry.name}`;frame.src=`./world.html?character=${encodeURIComponent(entry.slug)}`;frame.style='width:100%;height:100%;border:0;display:block';overlay.append(frame);document.body.append(overlay);
 const receive=event=>{if(event.origin===location.origin&&event.source===frame.contentWindow&&event.data?.type==='slop-world-close')overlay?.close();};
 window.addEventListener('message',receive);
 overlay.addEventListener('close',()=>{window.removeEventListener('message',receive);document.body.dataset.worldOpen='false';overlay.remove();overlay=null;previous?.focus();},{once:true});
 document.body.dataset.worldOpen='true';overlay.showModal();frame.focus();
}
