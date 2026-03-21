import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import CitizenPortalApp from "@/portals/citizen/CitizenPortalApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CitizenPortalApp />
  </StrictMode>,
);
