import { useEffect, useRef, useState } from 'react';
import { findMatches, library, outstanding, type State } from './domain';
import { routeIds, tourResumeKey, type TourChapter } from './tour-model';
import { runTourStep, type StepProgress } from './tour-runner';
import './tour.css';
export type TourBridge = { state: State; page: string; user: string; modal: string | null; go: (page: string) => void; selectUser: (user: string) => void; openExchange: () => void; reset: (chapter: TourChapter) => void };
type Step = { chapter: TourChapter; scene: number; caption: string; target?: string; value?: string; action?: (b: TourBridge) => void; complete?: (b: TourBridge) => boolean; hold: number };
const titles = ['Give a skill. Learn something new.', 'New listings, new possibilities', 'Understand your match', 'Close a three-person ring', 'Everyone reviews and agrees', 'Agree when and where to meet', 'Value given. Responsibility visible.', 'Full circle'];
const budgets = [15000,30000,20000,25000,25000,20000,30000,15000];
const anchor = (name: string) => `[data-tour="${name}"]`;
const nav = (name: string) => anchor(`nav-${name}`);
function buildSteps(): Step[] {
  const steps: Step[] = [];
  const add = (scene: number, caption: string, target?: string, extra: Partial<Step> = {}) => steps.push({chapter: scene < 4 ? 'discovery' : scene < 7 ? 'ring' : 'settlement',scene,caption,target,hold:0,...extra});
  const listing = (scene: number, skill: string, kind: 'offer'|'need', sessions: number, count: number) => {
    add(scene,`Open your offers and needs.`,nav('My offers & needs'),{complete:b=>b.page==='My offers & needs'});
    add(scene,`Add ${kind === 'offer' ? 'something you can give' : 'something you want to learn'}.`,anchor('add-listing'),{complete:b=>b.modal==='listing'});
    if(kind==='need') add(scene,'Choose “What I need”.',anchor('kind-need'));
    add(scene,`Choose the category for ${skill}.`,anchor('category'),{value:Object.entries(library).find(([,skills])=>skills.includes(skill))![0]});
    add(scene,`Choose ${skill}.`,'[name="skill"]',{value:skill});
    add(scene,kind==='offer'?'Set the level you can teach.':'Choose the provider level you need.','[name="level"]',{value:kind==='offer'?'2':'0'});
    add(scene,`Set ${sessions} session${sessions===1?'':'s'} with compatible terms.`,'[name="sessions"]',{value:String(sessions)});
    add(scene,kind==='offer'?'Publish your offer to unlock a reciprocal exchange.':'Publish your need to discover another compatible route.',anchor('publish'),{complete:b=>b.state.listings.some(l=>l.user==='alice'&&l.kind===kind&&l.skill===skill)&&b.modal===null});
    add(scene,`A new ${skill==='Photography'?'three-person ring':'match'} is now available.`,nav('Discover matches'),{complete:b=>b.page==='Discover matches'&&routeIds(b.state).length===count});
    add(scene,`${count} compatible ${count===1?'route':'routes'} · calculated from your updated listings.`,anchor('match-card'),{action:()=>{},complete:b=>routeIds(b.state).length===count});
  };
  add(1,'This fictional workspace lets you explore without changing your real activity.',nav('Home'),{complete:b=>b.page==='Home'});
  listing(2,'Python','offer',3,1); listing(2,'Guitar','need',1,2);
  add(3,'Compare Bob’s reciprocal exchange.','[aria-label="Next match"]',{complete:()=>!!document.querySelector('.tour-workspace [data-tour="match-card"]')?.textContent?.includes('Bob Wilson')});
  add(3,'Save an exchange to revisit it later.',anchor('save-match'),{complete:()=>!!document.querySelector('.tour-workspace .discover-utility')?.textContent?.includes('Saved matches (1)')});
  add(3,'Explore the people behind the skills.',nav('Community'),{complete:b=>b.page==='Community'});
  add(3,'Bob’s profile shows his offers, needs, and recorded evidence.',anchor('profile-bob'),{complete:()=>!!document.querySelector('.tour-workspace .community-profile')});
  add(4,'Another example: a three-person ring. No direct swap is available yet.',undefined,{action:b=>b.reset('ring'),complete:b=>b.state.listings.some(l=>l.user==='charlie')&&routeIds(b.state).length===0});
  listing(4,'Photography','need',1,1);
  add(5,'Alice teaches Charlie. Charlie teaches Bob. Bob teaches Alice.',anchor('review'),{complete:()=>!!document.querySelector('.tour-workspace [aria-label="Review match"]')});
  add(5,'Review every service and the simulated protection terms.',anchor('review-continue'),{complete:()=>!!document.querySelector('.tour-workspace [data-tour="propose"]')});
  add(5,'Send one proposal to everyone in the ring.',anchor('propose'),{complete:b=>b.state.exchanges.length===1&&b.modal==='exchange'});
  for(const person of ['alice','charlie','bob']) add(5,`Simulated consent: ${person[0].toUpperCase()+person.slice(1)} accepts the complete route.`,anchor(`confirm-${person}`),{complete:b=>b.state.exchanges[0]?.confirmations.includes(person)});
  add(6,'Coordinate inside the exchange. Messages here are fictional.','text:Conversation & schedule',{complete:()=>!!document.querySelector('.tour-workspace .coordination')});
  add(6,'Write a message to your exchange partner.','.coordination textarea',{value:'Looking forward to our Python session!'});
  add(6,'Send the message inside this fictional exchange.','text:Send message',{complete:b=>(b.state.messages?.length||0)===1});
  add(6,'Choose an exact future session time.','[name="start"]',{value:futureTime()});
  add(6,'Agree on a meeting platform.','.booking-form input[placeholder="Video link or platform"]',{value:'Demo video room'});
  add(6,'Propose the Python session time.','text:Propose session time',{complete:b=>(b.state.bookings?.length||0)===1});
  add(6,'Switching to fictional participant Charlie to review the time.',undefined,{action:b=>b.selectUser('charlie'),complete:b=>b.user==='charlie'});
  add(6,'Charlie accepts. Future sessions cannot be recorded as completed.','text:Accept time',{complete:b=>b.state.bookings?.[0]?.status==='accepted'});
  add(7,'Prepared example: after Alice has taught. This is a separate direct exchange.',undefined,{action:b=>b.reset('settlement'),complete:b=>b.state.sessions.length===2&&b.state.exchanges[0]?.legs.length===2});
  add(7,'Alice’s delivered Python sessions are preserved as contributions.',nav('My contributions'),{complete:b=>b.page==='My contributions'});
  add(7,'Switching to Bob: receiving first creates a responsibility to give back.',undefined,{action:b=>b.selectUser('bob'),complete:b=>b.user==='bob'});
  add(7,'Bob still owes two Tennis sessions: 60 minutes.',nav('My commitments'),{complete:b=>b.page==='My commitments'&&outstanding(b.state,'bob')[0]?.remaining_sessions===2});
  add(7,'Open the exchange and record Bob’s first completed session.',undefined,{action:b=>b.openExchange(),complete:b=>b.modal==='exchange'});
  add(7,'One session completed. One Tennis session remains: 30 minutes.',anchor('complete-bob'),{complete:b=>outstanding(b.state,'bob')[0]?.remaining_sessions===1});
  add(7,'The second session settles the exchange and restores receive-first eligibility.',anchor('complete-bob'),{complete:b=>b.state.exchanges[0]?.status==='settled'&&outstanding(b.state,'bob').length===0});
  add(8,'Switching to Alice to leave feedback about a completed Tennis session.',undefined,{action:b=>b.selectUser('alice'),complete:b=>b.user==='alice'});
  add(8,'Feedback reflects observable behavior.','text:Sessions & trust',{complete:()=>!!document.querySelector('.tour-workspace [data-tour="feedback-bob"]')});
  add(8,'Review the completed session.', '[data-tour="feedback-bob"] summary',{complete:()=>!!document.querySelector('.tour-workspace [data-tour="feedback-bob"][open]')});
  for(const field of ['on_time','completed_as_agreed','engaged','would_exchange_again']) add(8,'In this fictional example, the session went as agreed.',`[data-tour="feedback-bob"] [name="${field}"]`,{value:'yes'});
  add(8,'Save feedback, then try the platform yourself.','[data-tour="feedback-bob"] button[type="submit"]',{complete:b=>b.state.evaluations.length===1});
  for(let scene=1;scene<=8;scene++){const items=steps.filter(s=>s.scene===scene); for(const step of items) step.hold=budgets[scene-1]/items.length;}
  return steps;
}
function futureTime() { const day = new Date(Date.now()+86400000).toLocaleDateString('en-CA',{timeZone:'Asia/Hong_Kong'}); const at = new Date(`${day}T15:00:00+08:00`); const local = new Date(at.getTime()-at.getTimezoneOffset()*60000); return local.toISOString().slice(0,16); }
function target(selector?: string): HTMLElement | null {
  if(!selector) return null;
  const root=document.querySelector('.tour-workspace');
  const items=selector.startsWith('text:') ? [...(root?.querySelectorAll<HTMLElement>('button')||[])].filter(e=>e.textContent?.trim()===selector.slice(5)) : [...(root?.querySelectorAll<HTMLElement>(selector)||[])];
  return items.find(e=>e.getClientRects().length>0) || null;
}
function setTourValue(element: HTMLElement, value: string) {
  const prototype = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype,'value')!.set!.call(element,value);
  element.dispatchEvent(new Event('input',{bubbles:true})); element.dispatchEvent(new Event('change',{bubbles:true}));
}
export function TourGuide({bridge,initialChapter,initiallyPaused,accountId,onExit}:{bridge:TourBridge;initialChapter:TourChapter;initiallyPaused?:boolean;accountId:string;onExit:()=>void}) {
  const latest=useRef(bridge); latest.current=bridge;
  const [steps]=useState(buildSteps);
  const [index,setIndex]=useState(()=>steps.findIndex(s=>s.chapter===initialChapter));
  const [playing,setPlaying]=useState(!initiallyPaused);
  const [handsOn,setHandsOn]=useState(false);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [chapters,setChapters]=useState(false);
  const [pointer,setPointer]=useState<{x:number;y:number}|null>(null);
  const [epoch,setEpoch]=useState(0);
  const progress=useRef(new Map<number,StepProgress>());
  const [routeDelta,setRouteDelta]=useState(0);
  const previousRoutes=useRef(routeIds(bridge.state));
  const cancel=useRef<()=>void>(()=>{});
  const step=steps[index]; const chapter=step?.chapter||'settlement';
  const pause=()=>{cancel.current();setPlaying(false);};
  function restart(next:TourChapter) { cancel.current();progress.current.clear();previousRoutes.current=[];setRouteDelta(0);bridge.reset(next);setIndex(steps.findIndex(s=>s.chapter===next));setEpoch(e=>e+1);setError('');setReady(false);setHandsOn(false);setChapters(false);setPlaying(true); }
  useEffect(()=>{try{sessionStorage.setItem(tourResumeKey(accountId),JSON.stringify({version:1,chapter}));}catch{/* Storage is optional. */}},[accountId,chapter]);
  useEffect(()=>{
    const visibility=()=>{if(document.hidden)pause();};
    const manual=(e:Event)=>{if(e.isTrusted && !(e.target as HTMLElement).closest('.tour-guide'))pause();};
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){pause();if(!document.querySelector('.tour-workspace [role="dialog"]'))document.querySelector<HTMLButtonElement>('.tour-exit')?.focus();}else if(e.isTrusted && !(e.target as HTMLElement).closest('.tour-guide'))pause();};
    document.addEventListener('visibilitychange',visibility);document.addEventListener('pointerdown',manual,true);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('visibilitychange',visibility);document.removeEventListener('pointerdown',manual,true);document.removeEventListener('keydown',key);};
  },[]);
  useEffect(()=>{
    if(!playing||!step)return;
    let marked:HTMLElement|null=null; let highlightAt=0;
    const status=progress.current.get(index)||{invoked:false,completed:false};progress.current.set(index,status);
    setReady(false);setError('');setPointer(null);
    const stop=runTourStep({
      progress:status,holdMs:step.hold,
      ready:()=>{
        if(!step.target)return true;
        const element=target(step.target);
        if(!element||element.matches(':disabled'))return false;
        const sidebar=element.closest('.sidebar');
        if(sidebar && sidebar.getBoundingClientRect().left<0){if(!sidebar.classList.contains('is-open'))document.querySelector<HTMLButtonElement>('.tour-workspace .mobile-toggle')?.click();return false;}
        if(marked!==element){marked?.classList.remove('tour-target');marked=element;element.scrollIntoView({block:'center',behavior:'instant'});element.classList.add('tour-target');highlightAt=Date.now();return false;}
        if(Date.now()-highlightAt<250)return false;
        const rect=element.getBoundingClientRect();const x=Math.max(0,Math.min(innerWidth-1,rect.x+rect.width/2));const y=Math.max(0,Math.min(innerHeight-1,rect.y+rect.height/2));
        const top=document.elementFromPoint(x,y);
        return !!top&&(element.contains(top)||top.contains(element));
      },
      run:()=>{
        const element=target(step.target);
        if(element){const rect=element.getBoundingClientRect();setPointer({x:rect.right-10,y:rect.top+rect.height/2});}
        if(step.value!==undefined && element)setTourValue(element,step.value);
        else if(step.action)step.action(latest.current);
        else element?.click();
      },
      complete:()=> step.action && !status.invoked ? false : step.complete ? step.complete(latest.current) : status.invoked && (step.value!==undefined ? (target(step.target) as HTMLInputElement)?.value===step.value : true),
      onReady:()=>setReady(true),onAdvance:()=>setIndex(i=>i+1),
      onError:e=>{setError(e.message);setPlaying(false);},
    });
    const cleanup=()=>{stop();marked?.classList.remove('tour-target');};cancel.current=cleanup;
    return cleanup;
  },[index,playing,epoch,steps]);
  useEffect(()=>{const next=routeIds(bridge.state);setRouteDelta(next.filter(id=>!previousRoutes.current.includes(id)).length);previousRoutes.current=next;},[bridge.state.listings]);
  const finished=!step;
  return <>{pointer && playing && <span className="tour-pointer" aria-hidden="true" style={{left:pointer.x,top:pointer.y}}>➤</span>}<section className="tour-guide" aria-label="Guided demo controls">
    <div className="tour-heading"><span>◉ FICTIONAL DEMO · NO LIVE CHANGES</span><button className="tour-exit" onClick={()=>{cancel.current();onExit();}}>Exit demo ×</button></div>
    <div className="tour-copy" aria-live="polite"><strong>{finished?'Your next possibility starts here':`${step.scene} / 8 · ${titles[step.scene-1]}`}</strong><p>{error || (handsOn?'Explore freely. Resume restarts this chapter so every guided step stays reliable.':finished?'Try it yourself, replay a chapter, or return to your workspace.':step.caption)}</p></div>
    <progress aria-label="Demo progress" max={steps.length} value={index}/>
    <div className="tour-buttons">
      {!finished&&<><button onClick={()=>{if(handsOn){restart(chapter);return;}if(playing)pause();else{setError('');setPlaying(true);setEpoch(e=>e+1);}}}>{playing?'Pause':error?'Retry step':handsOn?'Resume guided chapter':'Resume'}</button><button disabled={!ready||handsOn} onClick={()=>{cancel.current();setReady(false);setIndex(i=>i+1);}}>Next</button></>}
      <button onClick={()=>restart(chapter)}>Replay chapter</button><button onClick={()=>restart('discovery')}>Restart tour</button>
      <button onClick={()=>{pause();setHandsOn(true);}}>Try it yourself</button><button onClick={()=>{pause();setChapters(!chapters);}}>Explore chapters</button>
    </div>
    {chapters&&<div className="tour-chapters">{(['discovery','ring','settlement'] as const).map(c=><button key={c} onClick={()=>restart(c)}>{c==='discovery'?'Offers, needs & discovery':c==='ring'?'Ring, agreement & scheduling':'Contributions, settlement & feedback'}</button>)}<p>For advanced withdrawal, dispute, and bond scenarios, exit to Demo Studio.</p></div>}
    {finished&&<button className="button primary" onClick={()=>{cancel.current();onExit();}}>Return to my workspace</button>}
    <span className="tour-evidence" aria-live="polite">{routeDelta>0 && <strong>+{routeDelta} new compatible route · </strong>}{findMatches(bridge.state,'alice').length} eligible routes · {bridge.state.exchanges.length} exchanges · {bridge.state.sessions.length} completed sessions</span>
  </section></>;
}
