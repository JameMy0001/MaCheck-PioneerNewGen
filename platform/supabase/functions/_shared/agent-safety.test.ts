import {
  clampAgentTemperature,
  isUnsafeClinicalOutput,
} from "./agent-safety.ts";

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("rejects numeric and imperative medication instructions", () => {
  assertEquals(isUnsafeClinicalOutput("ควรรับประทาน 5 mg หลังอาหาร"), true);
  assertEquals(isUnsafeClinicalOutput("กิน 2 เม็ดเพื่อชดเชย"), true);
  assertEquals(isUnsafeClinicalOutput("เพิ่มขนาดยาแล้วติดตามอาการ"), true);
  assertEquals(isUnsafeClinicalOutput("แพทย์ควรลดขนาดยา"), true);
});

Deno.test("allows abstention and professional-review language", () => {
  assertEquals(
    isUnsafeClinicalOutput(
      "โปรดอย่าปรับ เพิ่ม ลด หรือหยุดยาเอง และให้แพทย์หรือเภสัชกรตรวจทาน",
    ),
    false,
  );
});

Deno.test("clamps model temperature to the clinical safety range", () => {
  assertEquals(clampAgentTemperature(-1), 0);
  assertEquals(clampAgentTemperature(0.2), 0.2);
  assertEquals(clampAgentTemperature(0.9), 0.3);
  assertEquals(clampAgentTemperature(Number.NaN), 0.2);
});
