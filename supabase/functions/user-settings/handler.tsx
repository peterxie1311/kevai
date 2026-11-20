type Dependencies = {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
};
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
export function createSettingsHandler({ env, fetch: fetcher }: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS")
      return new Response(null, { status: 204, headers: cors });
    if (!["GET", "POST", "DELETE"].includes(req.method))
      return json({ error: "Unsupported method." }, 405);
    const token = req.headers.get("Authorization"),
      url = env("SUPABASE_URL"),
      anon = env("SUPABASE_ANON_KEY"),
      service = env("SUPABASE_SERVICE_ROLE_KEY");
    if (!token?.startsWith("Bearer "))
      return json({ error: "Please log in again." }, 401);
    if (!url || !anon || !service)
      return json({ error: "Settings backend is not configured." }, 503);
    try {
      const check = await fetcher(`${url}/auth/v1/user`, {
        headers: { Authorization: token, apikey: anon },
        signal: AbortSignal.timeout(10_000),
      });
      if (!check.ok)
        return json(
          { error: "Please log in again." },
          check.status >= 500 ? 503 : 401,
        );
      const user = await check.json();
      if (typeof user.id !== "string" || !user.id)
        return json({ error: "Please log in again." }, 401);
      const rpc = async (name: string, args: object) => {
        const response = await fetcher(`${url}/rest/v1/rpc/${name}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${service}`,
            apikey: service,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error("Storage unavailable");
        return response.status === 204 ? null : response.json();
      };
      if (req.method !== "GET") {
        let body: Record<string, unknown>;
        try {
          const raw = await req.text();
          if (raw.length > 2000)
            return json({ error: "Settings request too large." }, 413);
          body = JSON.parse(raw);
          if (!body || typeof body !== "object") throw new Error();
        } catch {
          return json({ error: "Invalid settings request." }, 400);
        }
        const model =
          typeof body.model === "string" ? body.model.trim() : "gpt-6.2-astra";
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(model))
          return json({ error: "Enter a valid model name." }, 400);
        const key = typeof body.key === "string" ? body.key.trim() : null;
        if (
          req.method === "POST" &&
          key &&
          !/^sk-[A-Za-z0-9_-]{17,509}$/.test(key)
        )
          return json({ error: "Enter a valid OpenAI API key." }, 400);
        await rpc("kevai_save_openai_settings", {
          i_user_id: user.id,
          i_model: model,
          i_key: req.method === "POST" ? key || null : null,
          i_remove: req.method === "DELETE",
        });
      }
      const status = await rpc("kevai_openai_status", { i_user_id: user.id });
      // Never return a saved secret (or accept a user ID supplied by the browser).
      return json({
        configured: status?.configured === true,
        model:
          typeof status?.model === "string" ? status.model : "gpt-6.2-astra",
      });
    } catch {
      return json(
        { error: "Unable to update or load your settings. Please try again." },
        503,
      );
    }
  };
}
