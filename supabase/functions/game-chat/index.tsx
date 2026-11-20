import { createHandler } from "./handler.tsx";
Deno.serve(createHandler({ env: (name) => Deno.env.get(name), fetch }));
