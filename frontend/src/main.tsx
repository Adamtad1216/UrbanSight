import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import CitizenPortalApp from "@/portals/citizen/CitizenPortalApp";
import BackofficePortalApp from "@/portals/backoffice/BackofficePortalApp";
import "./index.css";

const portal = import.meta.env.VITE_PORTAL;

const RootApp =
  portal === "citizen"
    ? CitizenPortalApp
    : portal === "backoffice"
      ? BackofficePortalApp
      : App;

createRoot(document.getElementById("root")!).render(<RootApp />);
