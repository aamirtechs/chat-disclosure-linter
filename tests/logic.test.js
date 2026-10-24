"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const L=require("../src/logic.js");
const GOOD=["Agent: This chat may be recorded or monitored for quality assurance.","Agent: This program is not a loan and we are not a lender.","Agent: Fees are only charged after a debt is settled, and the timeline is usually 24 to 48 months.","Agent: Settling can affect your credit while debts remain unpaid.","Customer: Okay, thanks."].join("\n");
test("parseTranscript reads Agent and Customer lines with line numbers",()=>{const m=L.parseTranscript(GOOD);assert.equal(m.length,5);assert.equal(m[0].sender,"agent");assert.equal(m[4].sender,"customer");assert.equal(m[0].line,1);});
test("parseInput reads JSON transcripts",()=>{const m=L.parseInput(JSON.stringify([{sender:"agent",text:"Hello"},{role:"customer",message:"Hi"}]));assert.equal(m.length,2);assert.equal(m[0].sender,"agent");assert.equal(m[1].sender,"customer");assert.equal(m[1].text,"Hi");});
test("complete transcript passes with all required found",()=>{const r=L.lintConversation(L.parseTranscript(GOOD));assert.equal(r.score.requiredFound,r.score.requiredTotal);assert.equal(r.score.prohibitedHits,0);assert.equal(r.score.pass,true);});
test("required disclosures in customer messages do not count",()=>{const txt="Customer: I know this is not a loan and it may be recorded.\nAgent: Tell me about your debts.";const r=L.lintConversation(L.parseTranscript(txt));assert.equal(r.requiredResults.find(x=>x.id==="not-a-loan").found,false);});
test("prohibited claim is flagged with line and exact quote",()=>{const txt="Agent: We guarantee you will save a lot.\nAgent: This is a government program.";const r=L.lintConversation(L.parseTranscript(txt));assert.equal(r.prohibitedHits.length,2);assert.equal(r.prohibitedHits[0].line,1);assert.ok(r.prohibitedHits[0].evidence.includes("guarantee"));assert.equal(r.prohibitedHits[1].id,"government-program");});
test("unqualified percentage promise is flagged",()=>{const r=L.lintConversation(L.parseTranscript("Agent: We can cut your debt by 70% today."));assert.ok(r.prohibitedHits.some(h=>h.id==="unqualified-percentage"));});
test("feedback marks a hit acceptable and removes it from fail count but keeps it listed",()=>{const r=L.lintConversation(L.parseTranscript("Agent: We guarantee a careful review of your options."));const adj=L.applyFeedback(r,[{ruleId:"guaranteed-savings",line:1,reason:"Guarantee refers to review, not savings"}]);assert.equal(adj.score.prohibitedHits,0);assert.equal(adj.prohibitedHits.length,1);assert.equal(adj.prohibitedHits[0].acceptable,true);});
test("aggregate counts by rule and report CSV",()=>{const a=L.lintConversation(L.parseTranscript(GOOD));const b=L.lintConversation(L.parseTranscript("Agent: Hello there."));const agg=L.aggregate([a,b]);const rec=agg.find(x=>x.id==="recording-notice");assert.equal(rec.found,1);assert.equal(rec.missing,1);const csv=L.buildReportCSV(a);assert.ok(csv.includes("recording-notice"));assert.ok(csv.includes("found"));});

test("buildReportJSON round-trips feedback marks", () => {
  const msgs = L.parseInput("agent: we guarantee savings\n");
  const lint = L.lintConversation(msgs);
  const feedback = [{ ruleId: "guaranteed-savings", line: 1, reason: "Quoted in a warning" }];
  const json = L.buildReportJSON(lint, feedback);
  const parsed = JSON.parse(json);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.feedback.length, 1);
  assert.equal(parsed.prohibited[0].acceptable, true);
  const marks = L.parseFeedbackJSON(json);
  assert.deepEqual(marks, feedback);
});
