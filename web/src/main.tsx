import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { inGame, setupMirror } from "./dui";
import App from "./App";
import "./styles.css";

// tags the mirror copy before the first paint, so it never flashes as the invisible input copy
setupMirror();

// `npm run dev` when in a normal browser nothing draws the page there, unhide it
if (!inGame) document.body.classList.add("standalone");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
