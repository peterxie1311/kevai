import { useEffect, useState, type FormEvent } from "react";
import Brand from "../components/Brand";
import { userSettings } from "../services/userSettings";
export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState("gpt-6.2-astra");
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    userSettings("GET", undefined, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setConfigured(data.configured);
          setModel(data.model);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setMessage(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function save(event?: FormEvent, remove = false) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const settings = await userSettings(remove ? "DELETE" : "POST", {
        model,
        ...(key.trim() && !remove ? { key: key.trim() } : {}),
      });
      setConfigured(settings.configured);
      setModel(settings.model);
      setMessage(
        remove
          ? "API key removed."
          : "Settings saved. Your saved key is never displayed.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save settings.",
      );
    } finally {
      setKey("");
      setBusy(false);
    }
  }
  return (
    <section className="dashboard settings-page">
      <header>
        <Brand />
        <button className="secondary" onClick={onBack} disabled={busy}>
          Back
        </button>
      </header>
      <main>
        <p className="eyebrow">YOUR ACCOUNT</p>
        <h1>API settings</h1>
        <p className="muted">
          Use your own OpenAI key. Requests are billed to your OpenAI account.
        </p>
        <form className="information-card settings-form" onSubmit={save}>
          <p className="key-status">
            {loading
              ? "Loading settings…"
              : configured
                ? "✓ OpenAI key configured"
                : "No OpenAI key configured"}
          </p>
          <label htmlFor="openai-key">
            {configured ? "Replace OpenAI API key" : "OpenAI API key"}
          </label>
          <input
            id="openai-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            maxLength={512}
            placeholder={
              configured ? "Leave blank to keep your saved key" : "sk-…"
            }
            value={key}
            onChange={(event) => setKey(event.target.value)}
            disabled={busy || loading}
          />
          <p className="muted">
            Encrypted in Supabase Vault. The saved key is never returned to your
            browser.
          </p>
          <label htmlFor="openai-model">Model</label>
          <input
            id="openai-model"
            value={model}
            onChange={(event) => setModel(event.target.value)}
            required
            pattern="[a-zA-Z0-9][a-zA-Z0-9._:\\-]{0,99}"
            disabled={busy || loading}
          />
          <p className="muted">
            Choose a model available to your account that supports web search.
          </p>
          <button className="primary" disabled={busy || loading} type="submit">
            {busy ? "Saving…" : "Save settings"}
          </button>
          {configured && (
            <button
              className="secondary"
              disabled={busy || loading}
              type="button"
              onClick={() => void save(undefined, true)}
            >
              Remove key
            </button>
          )}
          <p role="status" aria-live="polite">
            {message}
          </p>
        </form>
      </main>
    </section>
  );
}
