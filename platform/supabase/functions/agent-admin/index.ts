import {
  adminClient,
  corsHeaders,
  json,
  parseBody,
  sha256,
} from "../_shared/auth.ts";

type AdminRole = "owner" | "clinical_editor" | "clinical_reviewer" | "auditor";

interface RuntimeConfig {
  id: number;
  provider: "nvidia";
  primary_model: string;
  fallback_model: string;
  temperature: number;
  max_tokens: number;
  request_timeout_ms: number;
  ai_enabled: boolean;
  prompt_version: string;
  updated_by: string | null;
  updated_at: string;
}

class AgentAdminStageError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "AgentAdminStageError";
  }
}

const allowedModels = new Set([
  "meta/llama-3.1-70b-instruct",
  "meta/llama-3.1-8b-instruct",
  "nvidia/llama-3.1-nemotron-70b-instruct",
]);

const publicConfig = (config: RuntimeConfig, keyConfigured: boolean) => ({
  provider: config.provider,
  primaryModel: config.primary_model,
  fallbackModel: config.fallback_model,
  temperature: Number(config.temperature),
  maxTokens: config.max_tokens,
  requestTimeoutMs: config.request_timeout_ms,
  aiEnabled: config.ai_enabled,
  promptVersion: config.prompt_version,
  updatedAt: config.updated_at,
  keyConfigured,
  safetyPolicyLocked: true,
});

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return { error: "AUTH_REQUIRED" as const };

  const admin = adminClient();
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return { error: "SESSION_INVALID" as const };
  const { data: membership, error: membershipError } = await admin
    .from("admin_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (membershipError) {
    throw new AgentAdminStageError(
      "ADMIN_MEMBERSHIP_LOOKUP_FAILED",
      "ตรวจสอบสิทธิ์ผู้ดูแลระบบไม่สำเร็จ",
    );
  }
  if (!membership) return { error: "ADMIN_ACCESS_REQUIRED" as const };
  return { admin, user, role: membership.role as AdminRole };
}

async function loadConfig(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin.from("agent_runtime_config").select("*")
    .eq("id", 1).single();
  if (error) {
    throw new AgentAdminStageError(
      "AGENT_RUNTIME_CONFIG_LOAD_FAILED",
      "อ่านการตั้งค่า AI Agent ไม่สำเร็จ",
    );
  }
  return data as RuntimeConfig;
}

async function loadProviderApiKey(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin.rpc("server_get_agent_provider_secret", {
    p_provider: "nvidia",
  });
  if (!error && typeof data === "string" && data) return data;
  return Deno.env.get("NVIDIA_API_KEY") ?? null;
}

async function providerKeyConfigured(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin.rpc(
    "server_agent_provider_secret_status",
    {
      p_provider: "nvidia",
    },
  );
  if (!error) return Boolean(data);
  return Boolean(Deno.env.get("NVIDIA_API_KEY"));
}

async function testNvidiaConnection(
  admin: ReturnType<typeof adminClient>,
  config: RuntimeConfig,
) {
  const apiKey = await loadProviderApiKey(admin);
  if (!apiKey) {
    return { success: false, code: "API_KEY_NOT_CONFIGURED", latencyMs: 0 };
  }

  const controller = new AbortController();
  const startedAt = performance.now();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(config.request_timeout_ms, 15000),
  );
  try {
    const response = await fetch(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: config.primary_model,
          messages: [{ role: "user", content: "Reply with exactly: OK" }],
          temperature: 0,
          max_tokens: 8,
        }),
      },
    );
    return {
      success: response.ok,
      code: response.ok ? "CONNECTED" : `PROVIDER_HTTP_${response.status}`,
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } catch (error) {
    return {
      success: false,
      code: error instanceof DOMException && error.name === "AbortError"
        ? "TIMEOUT"
        : "CONNECTION_FAILED",
      latencyMs: Math.round(performance.now() - startedAt),
    };
  } finally {
    clearTimeout(timeout);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const context = await requireAdmin(req);
    if ("error" in context) {
      if (context.error === "AUTH_REQUIRED") {
        return json({ error: "กรุณาเข้าสู่ระบบใหม่", code: context.error }, 401);
      }
      if (context.error === "SESSION_INVALID") {
        return json({ error: "เซสชันหมดอายุ กรุณาออกจากระบบแล้วเข้าสู่ระบบใหม่", code: context.error }, 401);
      }
      return json({ error: "บัญชีนี้ไม่มีสิทธิ์จัดการ AI Agent", code: context.error }, 403);
    }
    const { admin, user, role } = context;
    const body = await parseBody(req);
    const intent = String(body.intent ?? "get_config");
    const current = await loadConfig(admin);
    const keyConfigured = await providerKeyConfigured(admin);

    if (intent === "get_config") {
      return json({
        success: true,
        role,
        config: publicConfig(current, keyConfigured),
      });
    }

    if (intent === "test_connection") {
      const result = await testNvidiaConnection(admin, current);
      await admin.from("agent_config_audit").insert({
        action: "CONNECTION_TESTED",
        config_after: {
          provider: current.provider,
          model: current.primary_model,
          result,
        },
        changed_by: user.id,
      });
      return json(result, result.success ? 200 : 503);
    }

    if (role !== "owner") {
      return json({ error: "เฉพาะ Owner เท่านั้นที่แก้ไข AI Agent ได้", code: "OWNER_ACCESS_REQUIRED" }, 403);
    }

    if (intent === "update_config") {
      const primaryModel = String(body.primaryModel ?? "");
      const fallbackModel = String(body.fallbackModel ?? "");
      const temperature = Number(body.temperature);
      const maxTokens = Number(body.maxTokens);
      const requestTimeoutMs = Number(body.requestTimeoutMs);
      const promptVersion = String(body.promptVersion ?? "").trim();
      if (
        !allowedModels.has(primaryModel) || !allowedModels.has(fallbackModel)
      ) {
        return json({ error: "Unsupported model" }, 400);
      }
      if (
        !Number.isFinite(temperature) || temperature < 0 || temperature > 0.3
      ) {
        return json({ error: "Temperature must be between 0 and 0.3" }, 400);
      }
      if (!Number.isInteger(maxTokens) || maxTokens < 128 || maxTokens > 800) {
        return json({ error: "maxTokens must be between 128 and 800" }, 400);
      }
      if (
        !Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 3000 ||
        requestTimeoutMs > 30000
      ) {
        return json({
          error: "requestTimeoutMs must be between 3000 and 30000",
        }, 400);
      }
      if (promptVersion.length < 3 || promptVersion.length > 80) {
        return json({ error: "Invalid prompt version" }, 400);
      }

      const next = {
        primary_model: primaryModel,
        fallback_model: fallbackModel,
        temperature,
        max_tokens: maxTokens,
        request_timeout_ms: requestTimeoutMs,
        ai_enabled: Boolean(body.aiEnabled),
        prompt_version: promptVersion,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      };
      const { data: updated, error } = await admin
        .from("agent_runtime_config")
        .update(next)
        .eq("id", 1)
        .select("*")
        .single();
      if (error) throw error;
      await admin.from("agent_config_audit").insert({
        action: "CONFIG_UPDATED",
        config_before: publicConfig(current, keyConfigured),
        config_after: publicConfig(updated as RuntimeConfig, keyConfigured),
        changed_by: user.id,
      });
      return json({
        success: true,
        config: publicConfig(updated as RuntimeConfig, keyConfigured),
      });
    }

    if (intent === "rotate_api_key") {
      const newApiKey = String(body.apiKey ?? "").trim();
      if (!/^nvapi-[A-Za-z0-9_-]{20,500}$/.test(newApiKey)) {
        return json({ error: "Invalid NVIDIA API key format" }, 400);
      }
      const { data: stored, error: secretError } = await admin.rpc(
        "server_set_agent_provider_secret",
        { p_provider: "nvidia", p_secret: newApiKey },
      );
      if (secretError || !stored) {
        throw secretError ?? new Error("Secret was not stored");
      }
      const fingerprint = (await sha256(newApiKey)).slice(0, 12);
      await admin.from("agent_config_audit").insert({
        action: "API_KEY_ROTATED",
        config_after: {
          secretName: "yacheck_nvidia_api_key",
          fingerprint,
          storedIn: "supabase_vault",
        },
        changed_by: user.id,
      });
      return json({
        success: true,
        fingerprint,
        message:
          "API key rotated. The previous value cannot be viewed from YaCheck Admin.",
      });
    }

    return json({ error: "Unsupported intent" }, 400);
  } catch (error) {
    console.error(
      "[AgentAdmin] Request failed without logging request content:",
      error instanceof Error ? error.message : String(error),
    );
    const stageError = error instanceof AgentAdminStageError ? error : null;
    return json({
      error: stageError?.message ??
        "ระบบจัดการ AI Agent ไม่พร้อมใช้งานชั่วคราว",
      code: stageError?.code ?? "AGENT_ADMIN_UNAVAILABLE",
    }, 500);
  }
});
