import { useEffect, useRef, useState } from 'react';
import { exchangeBonds, findMatches, library, outstanding, type State } from './domain';
import { routeIds, tourResumeKey, type TourChapter } from './tour-model';
import { runTourStep, type StepProgress } from './tour-runner';
import './tour.css';
export type TourBridge = { state: State; page: string; user: string; modal: string | null; go: (page: string) => void; selectUser: (user: string) => void; openExchange: () => void; reset: (chapter: TourChapter) => void };
type Step = { chapter: TourChapter; scene: number; caption: string; target?: string; value?: string; action?: (b: TourBridge) => void; complete?: (b: TourBridge) => boolean; hold: number };
const titles = ['Teach something. Learn something.', 'Share what you can teach', 'Find someone to learn with', 'Learn through a group of three', 'Agree on what everyone will teach', 'Choose a time together', 'See what is done and what is left', 'Leave feedback and start your own exchange'];
const journey = ['Share', 'Find people', 'Agree', 'Meet', 'Finish'];
const sceneStages = [0, 0, 1, 1, 2, 3, 4, 4];
const budgets = [6000,14000,8000,16000,24000,16000,28000,10000];
const anchor = (name: string) => `[data-tour="${name}"]`;
const nav = (name: string) => anchor(`nav-${name}`);
export function buildSteps(): Step[] {
  const steps: Step[] = [];
  const add = (scene: number, caption: string, target?: string, extra: Partial<Step> = {}) => steps.push({chapter: scene < 4 ? 'discovery' : scene < 7 ? 'ring' : 'settlement',scene,caption,target,hold:0,...extra});
  const listing = (scene: number, skill: string, kind: 'offer'|'need', sessions: number, count: number) => {
    add(scene,`Start with what you can teach and what you want to learn.`,nav('My offers & needs'),{complete:b=>b.page==='My offers & needs'});
    add(scene,`Add ${kind === 'offer' ? 'something you can give' : 'something you want to learn'}.`,anchor('add-listing'),{complete:b=>b.modal==='listing'});
    if(kind==='need') add(scene,'Choose “What I need”.',anchor('kind-need'));
    add(scene,`Choose the category for ${skill}.`,anchor('category'),{value:Object.entries(library).find(([,skills])=>skills.includes(skill))![0]});
    add(scene,`Choose ${skill}.`,'[name="skill"]',{value:skill});
    if (sessions > 1) add(scene,`Offer ${sessions} lessons so you can cover what your partner needs.`,'[name="sessions"]',{value:String(sessions)});
    add(scene,kind==='offer'?'Publish your offer so people can find what you teach.':'Publish what you want to learn to find a group that can help.',anchor('publish'),{complete:b=>b.state.listings.some(l=>l.user==='alice'&&l.kind===kind&&l.skill===skill)&&b.modal===null});
    add(scene,`A new ${skill==='Photography'?'three-person group (a ring)':'match'} is now available.`,nav('Discover matches'),{complete:b=>b.page==='Discover matches'&&routeIds(b.state).length===count});
    add(scene,skill==='Photography'?'You teach Charlie, Charlie teaches Bob, and Bob teaches you. Everyone learns something.':'You teach Bob Python. Bob teaches you Tennis. Your skills and lesson times fit.',anchor('match-card'),{action:()=>{},complete:b=>routeIds(b.state).length===count});
  };
  add(1,'Watch Alice share a skill, find people, plan lessons, and give back.',nav('Home'),{complete:b=>b.page==='Home'});
  listing(2,'Python','offer',2,1);
  add(3,'Save this match so you can come back to it later.',anchor('save-match'),{complete:()=>!!document.querySelector('.tour-workspace .discover-utility')?.textContent?.includes('Saved matches (1)')});
  add(3,'Open Community to get to know your potential teacher.',nav('Community'),{complete:b=>b.page==='Community'});
  add(3,'Check what Bob teaches, wants to learn, and has done before.',anchor('profile-bob'),{complete:()=>!!document.querySelector('.tour-workspace .community-profile')});
  add(4,'New example: no two-person swap fits. Add what Alice wants to learn to connect three people.',undefined,{action:b=>b.reset('ring'),complete:b=>b.state.listings.some(l=>l.user==='charlie')&&routeIds(b.state).length===0});
  listing(4,'Photography','need',1,1);
  add(5,'Review the group: see who teaches whom before you agree.',anchor('review'),{complete:()=>!!document.querySelector('.tour-workspace [aria-label="Review match"]')});
  add(5,'Review the deposit: each amount is 20% of the listed reference value. Payment is simulated.','.bond-preview',{action:()=>{}});
  add(5,'Check each lesson and the demo protection terms before sending an invitation.',anchor('review-continue'),{complete:()=>!!document.querySelector('.tour-workspace [data-tour="propose"]')});
  add(5,'Invite everyone to the same plan so each person can review it.',anchor('propose'),{complete:b=>b.state.exchanges.length===1&&b.modal==='exchange'});
  for(const person of ['alice','charlie','bob']) add(5,`Simulated consent: ${person[0].toUpperCase()+person.slice(1)} confirms the lessons and deposit amount.`,anchor(`confirm-${person}`),{complete:b=>b.state.exchanges[0]?.confirmations.includes(person)});
  add(5,'Track your deposit: Held means everyone has confirmed. The amounts stay here until the exchange is resolved.','text:Bond protection',{complete:b=>!!document.querySelector('.tour-workspace .bond-panel')&&exchangeBonds(b.state,b.state.exchanges[0]?.id).length===3&&exchangeBonds(b.state,b.state.exchanges[0]?.id).every(bond=>bond.status==='Held')});
  add(6,'Use the exchange chat to plan lessons together. These messages stay in the demo.','text:Conversation & schedule',{complete:()=>!!document.querySelector('.tour-workspace .coordination')});
  add(6,'Write a message to your exchange partner.','.coordination textarea',{value:'Looking forward to our Python session!'});
  add(6,'Send the message to your exchange partner.','text:Send message',{complete:b=>(b.state.messages?.length||0)===1});
  add(6,'Pick a date and time so your partner knows when to join.','[name="start"]',{value:futureTime()});
  add(6,'Add where to meet, such as a video call link.','.booking-form input[placeholder="Video link or platform"]',{value:'Demo video room'});
  add(6,'Propose the Python session time.','text:Propose session time',{complete:b=>(b.state.bookings?.length||0)===1});
  add(6,'Switching to Charlie to review the time.',undefined,{action:b=>b.selectUser('charlie'),complete:b=>b.user==='charlie'});
  add(6,'Charlie accepts the time. Both people now have a clear plan.','text:Accept time',{complete:b=>b.state.bookings?.[0]?.status==='accepted'});
  add(7,'Jump ahead to a separate example: Alice has already taught Bob two Python lessons.',undefined,{action:b=>b.reset('settlement'),complete:b=>b.state.sessions.length===2&&b.state.exchanges[0]?.legs.length===2});
  add(7,'My contributions keeps a record of the lessons Alice has taught.',nav('My contributions'),{complete:b=>b.page==='My contributions'});
  add(7,'Now viewing Bob: he has learned from Alice and still needs to teach her.',undefined,{action:b=>b.selectUser('bob'),complete:b=>b.user==='bob'});
  add(7,'My commitments shows what is left: Bob has two Tennis lessons to teach, 60 minutes in total.',nav('My commitments'),{complete:b=>b.page==='My commitments'&&outstanding(b.state,'bob')[0]?.remaining_sessions===2});
  add(7,'Open the exchange and record Bob’s first completed session.',undefined,{action:b=>b.openExchange(),complete:b=>b.modal==='exchange'});
  add(7,'In this separate example, both deposits are still held. Bob has two lessons left to teach.','text:Bond protection',{complete:b=>!!document.querySelector('.tour-workspace .bond-panel')&&exchangeBonds(b.state,b.state.exchanges[0]?.id).length===2&&exchangeBonds(b.state,b.state.exchanges[0]?.id).every(bond=>bond.status==='Held')});
  add(7,'Return to the lessons and record what Bob has completed.','text:Overview',{complete:()=>!!document.querySelector('.tour-workspace [data-tour="complete-bob"]')});
  add(7,'One session completed. One Tennis session remains: 30 minutes.',anchor('complete-bob'),{complete:b=>outstanding(b.state,'bob')[0]?.remaining_sessions===1});
  add(7,'Both Tennis lessons are done. Bob has given back and can learn first in another exchange.',anchor('complete-bob'),{complete:b=>b.state.exchanges[0]?.status==='settled'&&outstanding(b.state,'bob').length===0});
  add(7,'Receive a refund: all lessons are complete, so both deposits are returned in full. Check the amounts below.','text:Bond protection',{complete:b=>!!document.querySelector('.tour-workspace .bond-panel')&&exchangeBonds(b.state,b.state.exchanges[0]?.id).length===2&&exchangeBonds(b.state,b.state.exchanges[0]?.id).every(bond=>bond.status==='Returned'&&bond.returned_amount===bond.amount)});
  add(8,'Switching to Alice to leave feedback about a completed Tennis session.',undefined,{action:b=>b.selectUser('alice'),complete:b=>b.user==='alice'});
  add(8,'Leave feedback to help others know what learning with Bob is like.','text:Sessions & trust',{complete:()=>!!document.querySelector('.tour-workspace [data-tour="feedback-bob"]')});
  add(8,'Review the completed session.', '[data-tour="feedback-bob"] summary',{complete:()=>!!document.querySelector('.tour-workspace [data-tour="feedback-bob"][open]')});
  for(const [field, caption] of Object.entries({on_time:'Was Bob on time? For this demo lesson, yes.',completed_as_agreed:'Did Bob teach the lesson as agreed? Yes.',engaged:'Did Bob take part throughout the lesson? Yes.',would_exchange_again:'Would Alice learn with Bob again? Yes.'})) add(8,caption,`[data-tour="feedback-bob"] [name="${field}"]`,{value:'yes'});
  add(8,'Save your feedback. You are ready to share a skill and find your own match.','[data-tour="feedback-bob"] button[type="submit"]',{complete:b=>b.state.evaluations.length===1});
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
    <div className="tour-heading"><span>◉ YOUR EXCHANGE JOURNEY</span><button className="tour-exit" onClick={()=>{cancel.current();onExit();}}>Exit demo ×</button></div>
    <ol className="tour-journey" aria-label="Your exchange journey">{journey.map((label, stage) => <li key={label} aria-current={!finished && sceneStages[step.scene-1] === stage ? 'step' : undefined} data-done={finished || stage < sceneStages[step.scene-1]}><span aria-hidden="true">{stage + 1}</span>{label}</li>)}</ol>
    <div className="tour-copy" aria-live="polite"><strong>{finished?'Ready to share your first skill?':`${step.scene} / 8 · ${titles[step.scene-1]}`}</strong><p>{error || (handsOn?'Explore freely. Resume restarts this chapter so every guided step stays reliable.':finished?'In your workspace, add one skill you can teach and one you want to learn. Then discover matches.':step.caption)}</p></div>
    <progress aria-label="Demo progress" max={steps.length} value={index}/>
    <div className={`tour-buttons${finished?' tour-buttons-finished':''}`}>
      {!finished&&<><button onClick={()=>{if(handsOn){restart(chapter);return;}if(playing)pause();else{setError('');setPlaying(true);setEpoch(e=>e+1);}}}>{playing?'Pause':error?'Retry step':handsOn?'Resume guided chapter':'Resume'}</button><button disabled={!ready||handsOn} onClick={()=>{cancel.current();setReady(false);setIndex(i=>i+1);}}>Next</button></>}
      <button onClick={()=>restart(chapter)}>Replay chapter</button><button onClick={()=>restart('discovery')}>Restart tour</button>
      <button onClick={()=>{pause();setHandsOn(true);}}>Try it yourself</button><button onClick={()=>{pause();setChapters(!chapters);}}>Explore chapters</button>
    </div>
    {chapters&&<div className="tour-chapters">{(['discovery','ring','settlement'] as const).map(c=><button key={c} onClick={()=>restart(c)}>{c==='discovery'?'Share skills & find people':c==='ring'?'Agree & plan lessons':'Track lessons & give feedback'}</button>)}<p>For advanced withdrawal, dispute, and bond scenarios, exit to Demo Studio.</p></div>}
    {finished&&<div className="tour-completion-actions"><button className="button primary" onClick={()=>{cancel.current();onExit();}}>Return to my workspace</button></div>}
    <span className="tour-evidence" aria-live="polite">{routeDelta>0 && <strong>+{routeDelta} new match · </strong>}{findMatches(bridge.state,'alice').length} possible matches · {bridge.state.exchanges.length} exchanges · {bridge.state.sessions.length} completed sessions</span>
  </section></>;
}
