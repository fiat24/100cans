import { describe, it, expect, vi, beforeAll } from "vitest";
import { getSiliconFlowConfig } from "./siliconflowLlm";

describe("SiliconFlow LLM Configuration", () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.SILICONFLOW_API_ENDPOINT = "https://api.siliconflow.cn";
    process.env.SILICONFLOW_API_KEY_1 = "sk-test-key-1";
    process.env.SILICONFLOW_MODEL = "deepseek-ai/DeepSeek-R1";
  });

  it("should load configuration from environment variables", () => {
    const config = getSiliconFlowConfig();
    
    expect(config).toBeDefined();
    expect(config.endpoint).toBe("https://api.siliconflow.cn");
    expect(config.model).toBe("deepseek-ai/DeepSeek-R1");
    expect(config.keysCount).toBeGreaterThan(0);
  });

  it("should have at least one API key configured", () => {
    const config = getSiliconFlowConfig();
    expect(config.keysCount).toBeGreaterThanOrEqual(1);
  });

  it("should use correct model name", () => {
    const config = getSiliconFlowConfig();
    expect(config.model).toContain("DeepSeek");
  });
});
