import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { WorkspaceProvider } from "./state/WorkspaceContext";
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><BrowserRouter basename={import.meta.env.BASE_URL}><WorkspaceProvider><App /></WorkspaceProvider></BrowserRouter></React.StrictMode>);
