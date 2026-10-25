"use strict";
// Chat Disclosure Linter: core logic. Pure functions, no DOM, no fetch.
function defaultRules(){
  return{
    required:[
      {id:"recording-notice",label:"Recording / monitoring notice",patterns:["may be recorded","recorded or monitored","recorded for quality","monitored for quality","this chat (is|may be) recorded"]},
      {id:"not-a-loan",label:"Program is not a loan",patterns:["not a loan","is not a loan","not a lender","not a lending"]},
      {id:"fees-after-settlement",label:"Fees only after settlement",patterns:["fees? (are )?only (charged|collected) after","no fees? until.*settl","fee.*after.*settle","only charge.*after.*settle"]},
      {id:"timeline-range",label:"Timeline range mention",patterns:["24\\s*(to|-)\\s*48 months","between 24 and 48 months","24 and 48 months"]},
      {id:"credit-impact",label:"Credit impact warning",patterns:["affect your credit","impact your credit","credit score (could|may|might) (fall|drop|be affected)","negative effect on your credit"]}
    ],
    prohibited:[
      {id:"guaranteed-savings",label:"Guaranteed savings",patterns:["guaranteed savings","we guarantee","guarantee you will save","guaranteed to save"]},
      {id:"government-program",label:"Government program",patterns:["government program","government-backed program","federal program"]},
      {id:"unqualified-percentage",label:"Unqualified percentage promise",patterns:["save you \\d+%","cut your debt by \\d+%","reduce your debt by \\d+%","settle for \\d+% less"]}
    ]
  };
}
function parseTranscript(text){
  const messages=[];String(text||"").split(/\r?\n/).forEach((line,i)=>{
    const t=line.trim();if(!t)return;
    const m=t.match(/^([^:]{1,30}):\s*(.*)$/);
    if(m){const who=m[1].trim().toLowerCase();const sender=/agent|rep|advisor|specialist/.test(who)?"agent":/customer|client|consumer|user/.test(who)?"customer":"other";messages.push({line:i+1,sender,text:m[2]});}
    else messages.push({line:i+1,sender:"other",text:t});
  });return messages;
}
function parseJSONTranscript(text){
  const data=JSON.parse(text);const arr=Array.isArray(data)?data:(data.messages||[]);
  return arr.map((m,i)=>{const who=String(m.sender||m.role||"").toLowerCase();const sender=/agent|rep|advisor|assistant|specialist/.test(who)?"agent":/customer|client|consumer|user/.test(who)?"customer":"other";return{line:i+1,sender,text:String(m.text||m.message||"")};});
}
function parseInput(text){
  const t=String(text||"").trim();if(t.startsWith("[")||t.startsWith("{")){try{return parseJSONTranscript(t);}catch(e){return parseTranscript(text);}}
  return parseTranscript(text);
}
function matchPattern(text,pattern){try{return new RegExp(pattern,"i").test(text);}catch(e){return text.toLowerCase().includes(String(pattern).toLowerCase());}}
function firstMatch(messages,rule){
  for(const msg of messages){if(msg.sender!=="agent")continue;for(const p of rule.patterns){if(matchPattern(msg.text,p))return{line:msg.line,evidence:msg.text};}}
  return null;
}
function lintConversation(messages,rules){
  const pack=rules||defaultRules();
  const requiredResults=(pack.required||[]).map(rule=>{const hit=firstMatch(messages,rule);return{id:rule.id,label:rule.label,found:!!hit,line:hit?hit.line:null,evidence:hit?hit.evidence:""};});
  const prohibitedHits=[];
  messages.forEach(msg=>{if(msg.sender!=="agent")return;(pack.prohibited||[]).forEach(rule=>{(rule.patterns||[]).forEach(p=>{if(matchPattern(msg.text,p))prohibitedHits.push({id:rule.id,label:rule.label,line:msg.line,evidence:msg.text,quote:msg.text});});});});
  const dedup=[];const seen=new Set();prohibitedHits.forEach(h=>{const k=h.id+"|"+h.line;if(!seen.has(k)){seen.add(k);dedup.push(h);}});
  const score={requiredFound:requiredResults.filter(r=>r.found).length,requiredTotal:requiredResults.length,prohibitedHits:dedup.length};
  score.pass=score.requiredFound===score.requiredTotal&&score.prohibitedHits===0;
  return{messages,requiredResults,prohibitedHits:dedup,score};
}
function applyFeedback(lint,feedback){
  const fb=feedback||[];const isOk=h=>fb.some(f=>f.ruleId===h.id&&Number(f.line)===Number(h.line));
  const adjusted=lint.prohibitedHits.map(h=>Object.assign({},h,{acceptable:isOk(h),reason:(fb.find(f=>f.ruleId===h.id&&Number(f.line)===Number(h.line))||{}).reason||""}));
  const active=adjusted.filter(h=>!h.acceptable);
  return{requiredResults:lint.requiredResults,prohibitedHits:adjusted,activeProhibitedHits:active,score:{requiredFound:lint.score.requiredFound,requiredTotal:lint.score.requiredTotal,prohibitedHits:active.length,prohibitedHitsRaw:lint.score.prohibitedHits,pass:lint.score.requiredFound===lint.score.requiredTotal&&active.length===0}};
}
function aggregate(lints){
  const byRule={};(lints||[]).forEach(l=>{l.requiredResults.forEach(r=>{byRule[r.id]=byRule[r.id]||{id:r.id,label:r.label,found:0,missing:0,prohibited:0};if(r.found)byRule[r.id].found++;else byRule[r.id].missing++;});l.prohibitedHits.forEach(h=>{byRule[h.id]=byRule[h.id]||{id:h.id,label:h.label,found:0,missing:0,prohibited:0};byRule[h.id].prohibited++;});});
  return Object.values(byRule);
}
function csvEscape(v){const s=String(v==null?"":v);return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;}
function buildReportCSV(lint,feedback){
  const adj=feedback?applyFeedback(lint,feedback):lint;
  const rows=[["type","rule_id","rule_label","status","line","evidence","acceptable_in_context","reason"]];
  adj.requiredResults.forEach(r=>rows.push(["required",r.id,r.label,r.found?"found":"missing",r.line||"",r.evidence,"",""]));
  adj.prohibitedHits.forEach(h=>rows.push(["prohibited",h.id,h.label,"hit",h.line,h.evidence,h.acceptable?"yes":"",h.reason||""]));
  return rows.map(r=>r.map(csvEscape).join(",")).join("\n")+"\n";
}
function buildReportJSON(lint,feedback){
  const adj=feedback?applyFeedback(lint,feedback):lint;
  return JSON.stringify({
    version:1,
    required:adj.requiredResults,
    prohibited:adj.prohibitedHits,
    feedback:feedback||[],
    score:adj.score
  },null,2);
}
function parseFeedbackJSON(text){
  const data=JSON.parse(text);
  const list=Array.isArray(data)?data:(data.feedback||data.marks||[]);
  return list.filter(f=>f&&f.ruleId!=null&&f.line!=null).map(f=>({ruleId:f.ruleId,line:Number(f.line),reason:String(f.reason||"Reviewed in context")}));
}
const api={defaultRules,parseTranscript,parseJSONTranscript,parseInput,matchPattern,lintConversation,applyFeedback,aggregate,buildReportCSV,buildReportJSON,parseFeedbackJSON,csvEscape};
if(typeof module!=="undefined"&&module.exports){module.exports=api;}
if(typeof window!=="undefined"){window.ChatDisclosureLinter=api;}
