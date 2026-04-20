import React from "react";
import ReactDOM from "react-dom/client";

import { LandingPage } from "./screens/LandingPage";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LandingPage />
  </React.StrictMode>
);
