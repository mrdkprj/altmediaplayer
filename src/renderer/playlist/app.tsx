import React from "react";
import { createRoot } from "react-dom/client";
import Playlist from "./playlist";
import "./playlist.css"
import "../common.css";

const root = createRoot(document.getElementById("root") ?? document.body);

root.render(
    <React.StrictMode>
        <Playlist />
    </React.StrictMode>
);
