import "@/monaco/monacoWorkers";

import "./styles/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { initTheme } from "./ui/theme/theme";
import { ThemeProvider } from "./ui/theme/ThemeProvider";

initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);