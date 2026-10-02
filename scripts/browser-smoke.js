(async () => {
  const pause = () => new Promise(resolve => setTimeout(resolve, 100));
  const text = () => document.body.innerText;
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const click = async (label) => {
    const button = [...document.querySelectorAll('button')].find(b => b.textContent.trim() === label && !b.disabled);
    assert(button, `Missing button: ${label}`); button.click(); await pause();
  };
  const close = async () => { document.querySelector('[aria-label="Close dialog"]').click(); await pause(); };
  const scenario = async (index) => {
    if (document.querySelector('[aria-label="Close dialog"]')) await close();
    await click('Try a demo scenario');document.querySelectorAll('.scenario')[index].click();await pause();
    await click('Review match');
  };
  const input = async (selector,value) => { const el=document.querySelector(selector);assert(el,selector);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));await pause(); };
  const results=[];
  await scenario(1);
  assert(text().includes('Potential imbalance'),'Imbalance warning missing');
  await click('Confirm as Alice');assert(!text().includes('Record 1 hr completed'),'Premature performance allowed');
  await click('Confirm as Bob');await click('Record 1 hr completed');await click('Record 1 hr completed');
  assert(text().includes('Bob must give back before receiving first again'),'Fairness block missing');
  await click('Record 30 min completed');assert(text().includes('Partially Settled'),'Partial settlement missing');
  assert(text().includes('1 × 30 min Tennis'),'Exact remaining obligation missing');
  await click('Record 30 min completed');assert(text().includes('Settled'),'Final settlement missing');
  assert(!text().includes('Bob must give back'),'Eligibility not restored');results.push('Direct: confirmation, imbalance, contribution, commitment, partial settlement, full settlement');
  await scenario(2);await click('Confirm as Alice');await click('Confirm as Charlie');await click('Confirm as Bob');
  await click('Record 1 hr completed');await click('Changes & recovery');await input('input[placeholder="Explain why you need to leave"]','Unavailable after receiving Python');
  await click('Withdraw as Charlie');assert(text().includes('All prior contributions are preserved'),'Withdrawal warning missing');
  await click('Find compatible replacement');assert(text().includes('David Park can help'),'Compatible replacement not found');
  await click('Reconfirm as Alice');await click('Reconfirm as Charlie');await click('Reconfirm as Bob');await click('Reconfirm as David');
  await click('Overview');assert(text().includes('Charlie owes Bob'),'Original obligation lost');
  await click('Record 1 hr completed by David');await click('Record 1 hr completed');assert(text().includes('Settled'),'Recovered ring did not settle');
  await click('Sessions & trust');assert(text().includes('David → Bob'),'Actual replacement provider not recorded');results.push('Ring: withdrawal, renewed consent, original responsibility, replacement performance, settlement');
  await scenario(2);await click('Confirm as Alice');await click('Confirm as Charlie');await click('Confirm as Bob');await click('Record 1 hr completed');
  await click('Changes & recovery');await input('input[placeholder="Explain why you need to leave"]','No acceptable replacement');await click('Withdraw as Charlie');await click('Simulate deadline · No replacement');
  await click('Overview');assert(text().includes('Defaulted')&&text().includes('Uncovered contribution preserved'),'Default claim lost');results.push('No replacement: default and preserved contribution');
  const persisted=JSON.parse(localStorage.getItem('skills-ring-demo-v1'));
  assert(persisted.exchanges[0].status==='defaulted'&&persisted.contributions.length===1,'Persistence mismatch');results.push('Browser storage reflects completed UI actions');
  await close();await click('Try a demo scenario');document.querySelectorAll('.scenario')[0].click();await pause();
  return results;
})()
