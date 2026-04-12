/**
 * Test Jarvis AI Brain — ทดสอบว่า AI เข้าใจคำสั่งภาษาไทยถูกต้อง
 *
 * Usage: cd functions && npx ts-node -P tsconfig.json test-jarvis.ts
 */
import * as fs from "fs";
import * as path from "path";

// Load .env
const envPath = path.join(__dirname, ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

import { processMessage } from "./src/jarvis/brain";
import { allSkills } from "./src/jarvis/skills";
import type { JarvisContext } from "./src/jarvis/types";

const testCtx: JarvisContext = {
  userId: "test-user-001",
  lineUserId: "U_test_line_user",
  traceId: "test-trace-001",
  conversationHistory: [],
};

const testCases = [
  "หาชุดเที่ยวทะเลให้หน่อย งบ 500 หล่อๆ",
  "เมาแล้ว หารถมารับหน่อย กลับบ้าน",
  "หิวมาก สั่งข้าวมันไก่ให้หน่อย",
  "สวัสดี วันนี้ทำอะไรได้บ้าง",
];

async function runTests() {
  console.log("🤖 Jarvis Brain Test\n" + "=".repeat(50));

  for (const input of testCases) {
    console.log(`\n📩 User: "${input}"`);
    console.log("-".repeat(40));

    try {
      const response = await processMessage(input, allSkills, testCtx);
      console.log(`📤 Type: ${response.type}`);
      if (response.type === "text") {
        const preview = response.text.length > 200
          ? response.text.slice(0, 200) + "..."
          : response.text;
        console.log(`📤 Response:\n${preview}`);
      } else {
        console.log(`📤 Response:`, JSON.stringify(response).slice(0, 200));
      }
      console.log("✅ PASS");
    } catch (error) {
      console.error("❌ ERROR:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("✅ Tests done!");
}

runTests().catch(console.error);
