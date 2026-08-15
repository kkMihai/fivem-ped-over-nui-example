import { useEffect, useRef, useState } from "react";

import { DUI } from "./dui";

const SLOTS = 4;

export default function App() {
  const [itemSlot, setItemSlot] = useState(0);
  const [overSlot, setOverSlot] = useState<number | null>(null);
  const [held, setHeld] = useState(false);

  const ghost = useRef<HTMLDivElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);

  // stuff related to the drag & drop inventory example, not dui itself
  useEffect(() => {
    const slotAt = (x: number, y: number) =>
      slots.current.findIndex((el: HTMLDivElement | null) => {
        if (!el) return false;

        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
      });

    const onMove = (e: MouseEvent) => {
      if (ghost.current) {
        ghost.current.style.left = `${e.clientX - 45}px`;
        ghost.current.style.top = `${e.clientY - 45}px`;
      }

      if (!held) return;

      const index = slotAt(e.clientX, e.clientY);
      setOverSlot(index === -1 ? null : index);
    };

    const onDown = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.classList.contains("item")) {
        setHeld(true);
      }
    };

    const onUp = (e: MouseEvent) => {
      if (!held) return;

      const index = slotAt(e.clientX, e.clientY);
      if (index !== -1) setItemSlot(index);

      setHeld(false);
      setOverSlot(null);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") DUI.call("close");
      if (e.key === "ArrowLeft") DUI.call("pedpos", { dir: -1 });
      if (e.key === "ArrowRight") DUI.call("pedpos", { dir: 1 });
    };

    addEventListener("mousemove", onMove);
    addEventListener("mousedown", onDown);
    addEventListener("mouseup", onUp);
    addEventListener("keydown", onKey);

    return () => {
      removeEventListener("mousemove", onMove);
      removeEventListener("mousedown", onDown);
      removeEventListener("mouseup", onUp);
      removeEventListener("keydown", onKey);
    };
  }, [held]);

  return (
    <>
      <h1>DIH UI</h1>

      <div className="slots">
        {Array.from({ length: SLOTS }, (_, i) => (
          <div
            key={i}
            ref={(el: HTMLDivElement | null) => {
              slots.current[i] = el;
            }}
            className={"slot" + (held && overSlot === i ? " over" : "")}
          >
            {itemSlot === i && (
              <div className={"item" + (held ? " held" : "")} />
            )}
          </div>
        ))}
      </div>

      <input id="name" placeholder="type something" />

      <div
        id="ghost"
        ref={ghost}
        style={{ display: held ? "block" : "none" }}
      />

      <button id="close" onClick={() => DUI.call("close")}>
        CLOSE
      </button>

      <div className="hint">
        drag the box &middot; type in the field &middot; &larr; &rarr; move the
        ped &middot; ESC close
        {/* yes i m using those as icons */}
      </div>
    </>
  );
}
