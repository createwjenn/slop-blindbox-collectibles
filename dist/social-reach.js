// Public YouTube counts checked October 9, 2026. These are a selected sample,
// not all-platform totals, unique viewers, or an exhaustive ranking.
const brainrotVideos = [
 {title:'Party Tunes – Brainrot Rap [Official Video]',url:'https://www.youtube.com/watch?v=T_NKi5KHUdI',views:258618142},
 {title:'Neow.ai – Brainrot Gang (Official Video)',url:'https://www.youtube.com/watch?v=2D1rExarl4M',views:136182733}
];
const brainrot = {videos:brainrotVideos};
export const socialReach = {
 'niu-lai':{videos:[]},
 'strawberlina':{videos:[]},
 'bananito':{videos:[]},
 'tung-tung-tung':brainrot,
 'tralalero-tralala':brainrot,
 'ballerina-capuccina':brainrot,
 'chill-guy':{videos:[{title:'Chill guy Transformation… — POCHI SCIENCE',url:'https://www.youtube.com/watch?v=wa6JKPR5fK0',views:6600946}]},
 'secret-capybara-toilet':{related:true,videos:[{title:'Pooping Capybara — Dalifactory',url:'https://www.youtube.com/shorts/caj39ZHL2qM',views:19186904}]}
};
export function renderSocialReach(element,slug){
 const reach=socialReach[slug],videos=reach?.videos??[];
 element.replaceChildren();
 if(!videos.length){element.textContent='View count not verified.';return;}
 const total=videos.reduce((sum,video)=>sum+video.views,0);
 const count=`${(total/1000000).toFixed(1)}M`;
 const scope=reach.related?'on a related capybara-toilet video':videos.length===1?'on a featured YouTube video':`across ${videos.length} sampled YouTube videos`;
 element.append(`${count} views ${scope}. `);
 const featured=videos.reduce((top,video)=>video.views>top.views?video:top);
 const link=document.createElement('a');
 link.href=featured.url;link.target='_blank';link.rel='noopener noreferrer';
 link.textContent='Watch video ↗';
 link.setAttribute('aria-label',`Watch ${featured.title} on YouTube (opens in a new tab)`);
 element.append(link);
 element.title=`Checked October 9, 2026. Selected video views, not total social reach. ${videos.map(video=>`${video.title}: ${video.views.toLocaleString('en-US')} views (${video.url})`).join('; ')}`;
}
