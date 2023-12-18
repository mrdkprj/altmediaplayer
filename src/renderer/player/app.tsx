import React from "react";
import { createRoot } from "react-dom/client";
import Player from "./player";
import "./player.css"
import "../common.css";

const root = createRoot(document.getElementById("root") ?? document.body);

root.render(
    <React.StrictMode>
        <Player />
    </React.StrictMode>
);
