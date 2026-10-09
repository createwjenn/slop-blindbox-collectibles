// Character videos selected by the collection creator.
export const characterVideos = {
 'niu-lai':{name:'Niu Lai',url:'https://www.youtube.com/shorts/_GJEqSHKO4s'},
 'strawberlina':{name:'Strawberlina',url:'https://www.youtube.com/watch?v=G-4rBR82Ql4'},
 'bananito':{name:'Bananito',url:'https://www.youtube.com/watch?v=D2DU1io0Aos'},
 'tung-tung-tung':{name:'Tung Tung Tung',url:'https://www.youtube.com/shorts/nYx-2PbomEY'},
 'tralalero-tralala':{name:'Tralalero Tralala',url:'https://www.youtube.com/watch?v=Yf9mPzViq7w'},
 'ballerina-capuccina':{name:'Ballerina Cappuccina',url:'https://www.youtube.com/watch?v=ze262PxDHuQ'},
 'chill-guy':{name:'Chill Guy',url:'https://www.youtube.com/watch?v=wa6JKPR5fK0'},
 'secret-capybara-toilet':{name:'Capybara Toilet',url:'https://www.youtube.com/shorts/tzD9OxAHtzU'}
};
export function renderSocialReach(element,slug){
 const video=characterVideos[slug];
 element.replaceChildren();
 element.removeAttribute('title');
 if(!video)return;
 const link=document.createElement('a');
 link.href=video.url;link.target='_blank';link.rel='noopener noreferrer';
 link.textContent='Who dat?';
 link.setAttribute('aria-label',`Who dat? Watch ${video.name} on YouTube (opens in a new tab)`);
 element.append(link);
}
