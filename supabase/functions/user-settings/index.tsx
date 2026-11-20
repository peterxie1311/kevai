import { createSettingsHandler } from "./handler.tsx";
Deno.serve(createSettingsHandler({ env: (name) => Deno.env.get(name), fetch }));
