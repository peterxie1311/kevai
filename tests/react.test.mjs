import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { Window } from "happy-dom";
import { build } from "esbuild";

const window = new Window({ url: "https://kevai.test" });
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "HTMLInputElement",
  "Node",
  "MutationObserver",
  "Event",
])
  globalThis[key] = key === "window" ? window : window[key];
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
const { render, fireEvent, waitFor, cleanup } = await import(
  "@testing-library/react"
);
const directory = await mkdtemp(path.resolve("tests/.react-test-"));
const source = await readFile("src/services/auth.tsx", "utf8");
const validators = source.slice(
  source.indexOf("export function validateCredentials"),
  source.indexOf("export function createAuthService"),
);
await build({
  entryPoints: ["src/App.tsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: path.join(directory, "app.mjs"),
  packages: "external",
  plugins: [
    {
      name: "mock-auth",
      setup(build) {
        build.onLoad({ filter: /services\/games\.tsx$/ }, () => ({
          loader: "ts",
          contents: `export async function getUpcomingGames(){return {games:[{id:'test-game',startsAt:'2026-11-21T01:00:00Z',away:{name:'Boston Celtics',abbreviation:'BOS'},home:{name:'Los Angeles Lakers',abbreviation:'LAL'},venue:'Test Arena',timeTbd:false}],source:'NBA.com',fetchedAt:'2026-11-20T00:00:00Z'};}`,
        }));
        build.onLoad({ filter: /services\/auth\.tsx$/ }, () => ({
          loader: "ts",
          contents:
            validators +
            `
 const state = globalThis.__authHarness;
 export const auth = {
 validateUser: async () => state.user,
 invalidate: () => {},
 login: async () => { state.logins++; if(state.fail) throw Error('Invalid credentials'); return state.user = {id:'1',email:'player@example.test'}; },
 createAccount: async () => { state.signups++; return {user:null,confirmationRequired:true}; },
 logout: async () => { state.user = null; },
 };
 export const supabase = {auth:{onAuthStateChange: () => ({data:{subscription:{unsubscribe(){}}}})}};
 `,
        }));
      },
    },
  ],
});
globalThis.__authHarness = { user: null, logins: 0, signups: 0, fail: false };
const { default: App } = await import(path.join(directory, "app.mjs"));
const harness = globalThis.__authHarness;
function mount() {
  harness.user = null;
  harness.fail = false;
  return render(React.createElement(App));
}
function fill(view, password = "password") {
  fireEvent.change(view.getByLabelText("Email address"), {
    target: { value: "player@example.test" },
  });
  fireEvent.change(view.getByLabelText("Password", { exact: true }), {
    target: { value: password },
  });
}
try {
  await test("React login and logout gate the dashboard", async () => {
    const view = mount();
    await view.findByRole("heading", { name: "Back in the game." });
    fill(view);
    fireEvent.click(view.getByRole("button", { name: "Show password" }));
    assert.equal(view.getByLabelText("Password", { exact: true }).type, "text");
    fireEvent.submit(view.container.querySelector("form"));
    await view.findByRole("heading", { name: "Coming up." });
    await view.findByRole("button", {
      name: "Boston Celtics at Los Angeles Lakers",
    });
    fireEvent.click(
      view.getByRole("button", {
        name: "Boston Celtics at Los Angeles Lakers",
      }),
    );
    await view.findByRole("heading", {
      name: "Boston Celtics at Los Angeles Lakers",
      level: 1,
    });
    assert.ok(view.getByRole("heading", { name: "Game information" }));
    assert.ok(view.getByRole("table"));
    fireEvent.change(view.getByLabelText("Your message"), {
      target: { value: "What should I know?" },
    });
    fireEvent.click(view.getByRole("button", { name: "Add message" }));
    assert.match(view.getByRole("log").textContent, /What should I know/);
    fireEvent.click(view.getByRole("button", { name: "Close chat" }));
    assert.equal(
      view.queryByRole("complementary", { name: "Game chat" }),
      null,
    );
    fireEvent.click(view.getByRole("button", { name: "Open chat" }));
    assert.match(view.getByRole("log").textContent, /What should I know/);
    fireEvent.click(view.getByRole("button", { name: /All games/ }));
    await view.findByRole("heading", { name: "Coming up." });
    fireEvent.click(view.getByRole("button", { name: "Sign out" }));
    await view.findByRole("heading", { name: "Back in the game." });
    cleanup();
  });
  await test("React signup catches mismatches then shows email confirmation", async () => {
    const view = mount();
    await view.findByRole("heading", { name: "Back in the game." });
    fireEvent.click(view.getByRole("button", { name: "Create account" }));
    fill(view);
    fireEvent.change(view.getByLabelText("Confirm password", { exact: true }), {
      target: { value: "different" },
    });
    fireEvent.submit(view.container.querySelector("form"));
    assert.match(view.getByRole("status").textContent, /do not match/);
    fireEvent.change(view.getByLabelText("Confirm password", { exact: true }), {
      target: { value: "password" },
    });
    fireEvent.submit(view.container.querySelector("form"));
    await view.findByRole("heading", { name: "Back in the game." });
    assert.match(view.getByRole("status").textContent, /Check your email/);
    assert.equal(view.queryByText("Coming up."), null);
    assert.equal(view.getByLabelText("Password", { exact: true }).value, "");
    cleanup();
  });
  await test("React failed login shows error and clears password", async () => {
    const view = mount();
    harness.fail = true;
    await view.findByRole("heading", { name: "Back in the game." });
    fill(view);
    fireEvent.submit(view.container.querySelector("form"));
    await waitFor(() =>
      assert.match(view.getByRole("status").textContent, /Invalid credentials/),
    );
    assert.equal(view.getByLabelText("Password", { exact: true }).value, "");
    assert.equal(view.queryByText("Coming up."), null);
    cleanup();
  });
} finally {
  cleanup();
  await rm(directory, { recursive: true, force: true });
  await window.happyDOM.close();
}
