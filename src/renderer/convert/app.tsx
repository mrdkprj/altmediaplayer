import React from "react";
import { createRoot } from "react-dom/client";
import Convert from "./convert";
import "./convert.css"
import "../common.css";

const root = createRoot(document.getElementById("root") ?? document.body);

root.render(
    <React.StrictMode>
        <Convert />
    </React.StrictMode>
);
