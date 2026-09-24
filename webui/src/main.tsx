import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import "@/shared/i18n";
import "@/app/styles/index.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
