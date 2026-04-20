import React from "react";
import ReactDOM from "react-dom/client";

import { EditorPage } from "./screens/EditorPage";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <EditorPage />
  </React.StrictMode>
);
