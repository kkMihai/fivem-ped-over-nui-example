// the page runs twice: the NUI copy is invisible and takes all input, the DUI
// copy is the one drawn under the ped. lua forwards every input to the DUI
// copy, so both run the same code on the same events and stay in the same
// visual state without any per-component sync code.

type Message =
  | { __dui: "key"; key: string; code: string; path: string | null }
  | { __dui: "input"; path: string; value: string }
  | { __dui: "state"; key: string; value: unknown }
  | { __dui: "active"; active: boolean };

export const isMirror = new URLSearchParams(location.search).has("dui");

export const inGame = typeof GetParentResourceName === "function";

const post = (name: string, data?: unknown) =>
  fetch(`https://${inGame ? GetParentResourceName() : "ped-over-nui"}/${name}`, {
    method: "POST",
    body: JSON.stringify(data ?? {}),
  }).catch(() => undefined);

const stateHandlers: Record<string, ((value: never) => void)[]> = {};

// both copies render the same dom, so a structural path points at the same
// element in each — that is how a keystroke reaches the right input
const pathOf = (el: Element): string => {
  if (el.id) return "#" + CSS.escape(el.id);

  const parts: string[] = [];
  let node: Element | null = el;

  while (node && node !== document.body) {
    const parent: Element | null = node.parentElement;
    if (!parent) break;

    const index = Array.prototype.indexOf.call(parent.children, node) + 1;
    parts.unshift(`${node.tagName}:nth-child(${index})`);
    node = parent;
  }

  return "body > " + parts.join(" > ");
};

// react ignores a plain `el.value = x`, it only trusts events that came from
// the native setter
const setNativeValue = (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;

  Object.getOwnPropertyDescriptor(proto.prototype, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
};

const parse = (data: unknown): Message | null => {
  if (typeof data !== "string") return (data as Message) ?? null;

  try {
    return JSON.parse(data) as Message;
  } catch {
    return null;
  }
};

export function setupMirror() {
  if (isMirror) {
    document.documentElement.classList.add("dui");

    addEventListener("message", (event) => {
      const msg = parse(event.data);
      if (!msg) return;

      if (msg.__dui === "key") {
        const target = msg.path ? document.querySelector(msg.path) : null;

        (target ?? window).dispatchEvent(
          new KeyboardEvent("keydown", { key: msg.key, code: msg.code, bubbles: true }),
        );
      } else if (msg.__dui === "input") {
        const el = document.querySelector(msg.path);

        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          setNativeValue(el, msg.value);
        }
      } else if (msg.__dui === "state") {
        stateHandlers[msg.key]?.forEach((fn) => fn(msg.value as never));
      }
    });

    return;
  }

  addEventListener("message", (event) => {
    const msg = parse(event.data);

    if (msg?.__dui === "active") {
      document.documentElement.classList.toggle("dui-active", msg.active);
    }
  });

  const button = (e: MouseEvent) =>
    e.button === 2 ? "right" : e.button === 1 ? "middle" : "left";

  addEventListener("mousedown", (e) => post("dui:mouse", { type: "down", button: button(e) }), true);
  addEventListener("mouseup", (e) => post("dui:mouse", { type: "up", button: button(e) }), true);
  addEventListener("wheel", (e) => post("dui:mouse", { type: "wheel", dy: e.deltaY }), true);

  addEventListener(
    "keydown",
    (e) =>
      post("dui:forward", {
        __dui: "key",
        key: e.key,
        code: e.code,
        path: e.target instanceof Element ? pathOf(e.target) : null,
      }),
    true,
  );

  addEventListener(
    "input",
    (e) => {
      const el = e.target;

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
        post("dui:forward", { __dui: "input", path: pathOf(el), value: el.value });
      }
    },
    true,
  );
}

export const DUI = {
  isMirror,

  call(name: string, data?: unknown) {
    if (!isMirror) return post(name, data);
  },

  // the mirror has no way to fetch its own data, push anything it must render
  pushState<T>(key: string, value: T) {
    if (!isMirror) post("dui:forward", { __dui: "state", key, value });
  },

  onState<T>(key: string, fn: (value: T) => void) {
    const list = (stateHandlers[key] ??= []);
    list.push(fn as (value: never) => void);

    return () => {
      stateHandlers[key] = list.filter((f) => f !== fn);
    };
  },
};
