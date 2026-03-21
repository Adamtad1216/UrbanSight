import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import BackofficePortalApp from "@/portals/backoffice/BackofficePortalApp";

if (window.location.pathname.startsWith("/register")) {
  window.history.replaceState({}, "", "/login");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BackofficePortalApp />
  </StrictMode>,
);
