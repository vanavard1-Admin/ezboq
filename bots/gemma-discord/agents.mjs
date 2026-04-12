/**
 * 💎 Gemma Agent Framework — "บริษัทเจมม่า" 10 ตำแหน่ง
 * ส่งทีมเอเจ้นท์ทำงานพร้อมกัน 10 ตัว เหมือนบริษัทจริง
 * ใช้ Gemini API runtime เดียวกับ Gemma
 */

import { generateText } from './llm.mjs';

const MAX_AGENTS = 10;
const AGENT_RESULT_PREVIEW_CHARS = 1500;

// ─── Company Roles ──────────────────────────────
// แต่ละตำแหน่งมี system prompt เฉพาะทาง
const COMPANY_ROLES = {
  ceo:        { title: 'CEO', prompt: 'คุณคือ CEO ตัดสินใจเชิงกลยุทธ์ มองภาพรวม วิเคราะห์ ROI ให้ direction ชัดเจน' },
  researcher: { title: 'นักวิจัย', prompt: 'คุณคือนักวิจัย ค้นหาข้อมูล fact-check ให้ข้อมูลที่ถูกต้องมีแหล่งอ้างอิง' },
  analyst:    { title: 'นักวิเคราะห์', prompt: 'คุณคือนักวิเคราะห์ วิเคราะห์ข้อดี-ข้อเสีย ความเสี่ยง เปรียบเทียบทางเลือก' },
  designer:   { title: 'นักออกแบบ', prompt: 'คุณคือนักออกแบบ คิด concept ออกแบบ UX/UI แนะนำ style วัสดุ สี layout' },
  writer:     { title: 'นักเขียน', prompt: 'คุณคือ content writer เขียนเนื้อหาดึงดูดใจ caption ad copy โพส social media' },
  planner:    { title: 'นักวางแผน', prompt: 'คุณคือ project planner วางแผนงาน timeline ลำดับขั้นตอน resource allocation' },
  reviewer:   { title: 'QA/Reviewer', prompt: 'คุณคือ reviewer ตรวจสอบคุณภาพ หาจุดบกพร่อง ให้ feedback สร้างสรรค์' },
  estimator:  { title: 'นักประเมิน', prompt: 'คุณคือนักประเมินราคา คำนวณต้นทุน ราคาวัสดุ ค่าแรง งบประมาณ ให้แม่นยำ' },
  advisor:    { title: 'ที่ปรึกษา', prompt: 'คุณคือที่ปรึกษาอาวุโส ให้คำแนะนำจากประสบการณ์ best practices ข้อควรระวัง' },
  marketer:   { title: 'นักการตลาด', prompt: 'คุณคือนักการตลาด คิด strategy targeting pricing promotion แนะนำ channel' },
  critic:     { title: 'นักวิจารณ์', prompt: 'คุณคือ devil\'s advocate มองมุมตรงข้าม ตั้งคำถามท้าทาย หาจุดอ่อน' },
  summarizer: { title: 'นักสรุป', prompt: 'คุณคือนักสรุป รวบรวมข้อมูล สรุปประเด็นสำคัญ เป็น bullet points กระชับ' },
};

// ─── Single Agent Call ───────────────────────────
async function runAgent(task, { role = 'assistant', temperature = 0.7, maxTokens = 1536 } = {}) {
  const roleInfo = COMPANY_ROLES[role];
  const rolePrompt = roleInfo
    ? `${roleInfo.prompt}\nตำแหน่ง: ${roleInfo.title}`
    : `บทบาท: ${role}`;

  const systemPrompt = `คุณคือ AI agent ในทีม "บริษัทเจมม่า" ถูกส่งมาทำงานเฉพาะอย่าง ตอบภาษาไทย ชัดเจน ตรงประเด็น
${rolePrompt}
กฎ:
- ตอบเฉพาะสิ่งที่ถูกถาม ห้ามออกนอกเรื่อง ห้ามทักทาย
- ให้ข้อมูลที่ actionable
- ถ้าเป็นงานสรุป/รายงาน/วิเคราะห์ ให้ตอบครบประเด็นสำคัญ ไม่ต้องตัดเองให้สั้นเกินเหตุ`;

  try {
    const result = await generateText(systemPrompt, task, {
      temperature,
      maxOutputTokens: maxTokens,
    });
    return { status: 'done', task, role, result: result || '(no response)' };
  } catch (err) {
    return { status: 'error', task, role, error: err.message };
  }
}

// ─── Parallel Agent Execution ────────────────────
export async function runAgents(tasks, options = {}) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return { error: 'ต้องระบุ tasks เป็น array ครับ' };
  }

  const limited = tasks.slice(0, MAX_AGENTS);
  const startTime = Date.now();

  console.log(`[AGENTS] 🏢 บริษัทเจมม่า — Spawning ${limited.length} agents...`);
  limited.forEach((t, i) => {
    const task = typeof t === 'string' ? t : t.task;
    const role = typeof t === 'object' ? t.role : options.role || 'researcher';
    const roleTitle = COMPANY_ROLES[role]?.title || role;
    console.log(`  👤 Agent ${i + 1} (${roleTitle}): ${task.slice(0, 60)}...`);
  });

  const promises = limited.map((t, i) => {
    const task = typeof t === 'string' ? t : t.task;
    const role = typeof t === 'object' ? t.role : options.role || 'researcher';
    const temp = typeof t === 'object' ? t.temperature : options.temperature;
    return runAgent(task, { role, temperature: temp }).then(r => ({ ...r, agentId: i + 1 }));
  });

  const results = await Promise.all(promises);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const done = results.filter(r => r.status === 'done').length;
  const errors = results.filter(r => r.status === 'error').length;

  console.log(`[AGENTS] ✅ ${done}/${limited.length} done, ${errors} errors — ${elapsed}s`);

  return {
    company: 'บริษัทเจมม่า',
    agentCount: limited.length,
    elapsed: `${elapsed}s`,
    success: done,
    errors,
    results: results.map(r => ({
      agent: r.agentId,
      role: COMPANY_ROLES[r.role]?.title || r.role,
      status: r.status,
      task: r.task.slice(0, 80),
      result: r.result?.slice(0, AGENT_RESULT_PREVIEW_CHARS) || r.error,
    })),
  };
}

// ─── Plan & Execute (Auto-decompose) ─────────────
export async function planAndExecute(complexTask) {
  console.log(`[PLAN] 📋 Decomposing task...`);

  const planResult = await runAgent(
    `วิเคราะห์งานนี้แล้วแบ่งเป็น subtasks (สูงสุด 10 ข้อ) ตอบเป็น JSON array เท่านั้น
แต่ละ item เป็น object: {"task": "งาน", "role": "ตำแหน่ง"}
ตำแหน่งที่เลือกได้: researcher, analyst, designer, writer, planner, reviewer, estimator, advisor, marketer, critic
Format: [{"task":"...", "role":"..."}, ...]
ห้ามตอบอย่างอื่นนอกจาก JSON array

งาน: ${complexTask}`,
    { role: 'planner', temperature: 0.3 }
  );

  let subtasks;
  try {
    const match = planResult.result.match(/\[[\s\S]*?\]/);
    if (match) {
      subtasks = JSON.parse(match[0]);
    } else {
      throw new Error('No JSON found');
    }
  } catch {
    return runAgents([{ task: complexTask, role: 'researcher' }]);
  }

  if (!Array.isArray(subtasks) || subtasks.length === 0) {
    return runAgents([{ task: complexTask, role: 'researcher' }]);
  }

  console.log(`[PLAN] Decomposed into ${subtasks.length} subtasks`);
  return runAgents(subtasks);
}

// ─── Quick Research (Multiple angles) ────────────
export async function multiResearch(topic) {
  const angles = [
    { task: `ข้อมูลพื้นฐานและภาพรวมของ: ${topic}`, role: 'researcher' },
    { task: `ข้อดี ข้อเสีย และข้อควรระวังของ: ${topic}`, role: 'analyst' },
    { task: `ราคาและต้นทุนที่เกี่ยวข้องกับ: ${topic} (บาท)`, role: 'estimator' },
    { task: `คำแนะนำและ best practices สำหรับ: ${topic}`, role: 'advisor' },
  ];

  return runAgents(angles);
}

// ─── Company Meeting (All 10 roles discuss) ──────
export async function companyMeeting(agenda) {
  const roles = ['ceo', 'researcher', 'analyst', 'designer', 'writer', 'planner', 'estimator', 'marketer', 'advisor', 'critic'];
  const tasks = roles.map(role => ({
    task: `ประเด็นประชุม: ${agenda}\n\nให้ความเห็นจากมุมมองตำแหน่งของคุณ สั้นกระชับ 2-3 ประเด็นหลัก`,
    role,
    temperature: 0.7,
  }));

  console.log(`[MEETING] 🏢 Company Meeting — 10 executives discussing...`);
  return runAgents(tasks);
}

// ─── Expert Panel (Pick specific roles) ──────────
export async function expertPanel(question, roles = ['researcher', 'analyst', 'advisor']) {
  const tasks = roles.slice(0, MAX_AGENTS).map(role => ({
    task: question,
    role,
    temperature: 0.6,
  }));

  return runAgents(tasks);
}

// ─── Chain-of-Agents (Pipeline) ──────────────────
// แต่ละ agent เห็นผลของคนก่อนหน้า — คุณภาพสูงกว่า parallel
export async function chainOfAgents(task, pipeline = ['researcher', 'analyst', 'writer', 'reviewer', 'summarizer']) {
  const steps = pipeline.slice(0, MAX_AGENTS);
  const startTime = Date.now();
  const results = [];

  console.log(`[CHAIN] 🔗 Pipeline: ${steps.map(r => COMPANY_ROLES[r]?.title || r).join(' → ')}`);

  let previousOutput = '';
  for (let i = 0; i < steps.length; i++) {
    const role = steps[i];
    const roleTitle = COMPANY_ROLES[role]?.title || role;
    console.log(`  Step ${i + 1}/${steps.length}: ${roleTitle}...`);

    const prompt = i === 0
      ? task
      : `งานเดิม: ${task}\n\n--- ผลจากขั้นตอนก่อนหน้า (${COMPANY_ROLES[steps[i-1]]?.title || steps[i-1]}) ---\n${previousOutput}\n\n--- คำสั่ง ---\nต่อยอดจากผลก่อนหน้า ทำในส่วนของคุณ (${roleTitle}) ให้ดีที่สุด`;

    const result = await runAgent(prompt, { role, temperature: 0.6 });
    previousOutput = result.result || result.error || '';
    results.push({
      step: i + 1,
      role: roleTitle,
      status: result.status,
      output: previousOutput.slice(0, AGENT_RESULT_PREVIEW_CHARS),
    });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[CHAIN] ✅ Pipeline done in ${elapsed}s`);

  return {
    mode: 'chain-of-agents',
    pipeline: steps.map(r => COMPANY_ROLES[r]?.title || r),
    steps: results.length,
    elapsed: `${elapsed}s`,
    results,
    finalOutput: previousOutput,
  };
}

// ─── Debate Mode (โต้วาที) ───────────────────────
// 2 ฝ่ายถก + 1 กรรมการตัดสิน → คำตอบ balanced
export async function debate(topic) {
  const startTime = Date.now();
  console.log(`[DEBATE] ⚔️ Topic: ${topic}`);

  // Round 1: ทั้ง 2 ฝ่ายให้เหตุผลพร้อมกัน
  const [pro, con] = await Promise.all([
    runAgent(
      `คุณคือฝ่ายสนับสนุน ให้เหตุผล 3-5 ข้อว่าทำไมถึงควร/ดี:\n${topic}`,
      { role: 'advisor', temperature: 0.7 }
    ),
    runAgent(
      `คุณคือฝ่ายคัดค้าน (Devil's Advocate) ให้เหตุผล 3-5 ข้อว่าทำไมถึงไม่ควร/มีความเสี่ยง:\n${topic}`,
      { role: 'critic', temperature: 0.7 }
    ),
  ]);

  console.log(`[DEBATE] Round 1 done — Pro & Con ready`);

  // Round 2: Rebuttal — แต่ละฝ่ายตอบโต้
  const [proRebuttal, conRebuttal] = await Promise.all([
    runAgent(
      `ฝ่ายคัดค้านบอกว่า:\n${con.result}\n\nจงตอบโต้ข้อคัดค้านทุกข้อ ปกป้องจุดยืนของคุณ`,
      { role: 'advisor', temperature: 0.6 }
    ),
    runAgent(
      `ฝ่ายสนับสนุนบอกว่า:\n${pro.result}\n\nจงหาจุดอ่อนในข้อสนับสนุนทุกข้อ`,
      { role: 'critic', temperature: 0.6 }
    ),
  ]);

  console.log(`[DEBATE] Round 2 done — Rebuttals ready`);

  // Judge: CEO ตัดสิน
  const judge = await runAgent(
    `คุณเป็นกรรมการตัดสินการโต้วาที ประเด็น: ${topic}

ฝ่ายสนับสนุน: ${pro.result}
ฝ่ายคัดค้าน: ${con.result}
สนับสนุนตอบโต้: ${proRebuttal.result}
คัดค้านตอบโต้: ${conRebuttal.result}

วิเคราะห์แล้วสรุป:
1. ฝ่ายไหนมีเหตุผลแข็งแกร่งกว่า
2. ข้อสรุปที่ balanced สำหรับคนที่ต้องตัดสินใจ
3. คำแนะนำสุดท้าย`,
    { role: 'ceo', temperature: 0.3 }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[DEBATE] ⚖️ Verdict delivered in ${elapsed}s`);

  return {
    mode: 'debate',
    topic,
    elapsed: `${elapsed}s`,
    rounds: {
      pro: pro.result?.slice(0, AGENT_RESULT_PREVIEW_CHARS),
      con: con.result?.slice(0, AGENT_RESULT_PREVIEW_CHARS),
      proRebuttal: proRebuttal.result?.slice(0, 1200),
      conRebuttal: conRebuttal.result?.slice(0, 1200),
    },
    verdict: judge.result,
  };
}

// ─── Tournament (แข่งขัน) ────────────────────────
// หลาย agents ตอบคำถามเดียวกัน → judge เลือก best
export async function tournament(question, numContestants = 5) {
  const startTime = Date.now();
  const count = Math.min(numContestants, MAX_AGENTS - 1); // reserve 1 for judge
  console.log(`[TOURNAMENT] 🏆 ${count} contestants competing...`);

  const contestantRoles = ['researcher', 'analyst', 'advisor', 'designer', 'writer', 'estimator', 'marketer', 'planner', 'critic', 'summarizer'];
  const tasks = Array.from({ length: count }, (_, i) => ({
    task: question,
    role: contestantRoles[i % contestantRoles.length],
    temperature: 0.4 + (i * 0.1), // variety in creativity
  }));

  const results = await runAgents(tasks);

  // Judge evaluates all answers
  const answersText = results.results
    .map((r, i) => `\n--- คำตอบ ${i + 1} (${r.role}) ---\n${r.result}`)
    .join('\n');

  const judge = await runAgent(
    `คุณเป็นกรรมการ ตัดสินว่าคำตอบไหนดีที่สุดสำหรับคำถาม: "${question}"

${answersText}

ให้คะแนนแต่ละคำตอบ (1-10) พร้อมเหตุผล แล้วประกาศผู้ชนะ
สรุปคำตอบที่ดีที่สุดให้สมบูรณ์`,
    { role: 'reviewer', temperature: 0.3 }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[TOURNAMENT] 🏆 Winner selected in ${elapsed}s`);

  return {
    mode: 'tournament',
    question,
    contestants: count,
    elapsed: `${elapsed}s`,
    entries: results.results,
    winner: judge.result,
  };
}

// ─── Available Roles (for help/info) ─────────────
export function getCompanyRoles() {
  return Object.entries(COMPANY_ROLES).map(([key, val]) => ({
    id: key,
    title: val.title,
  }));
}
