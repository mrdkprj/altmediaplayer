import React from "react";
import { createRoot } from "react-dom/client";
import Playlist from "../playlist/playlist";

const root = createRoot(document.getElementById("root") ?? document.body);

root.render(
    <React.StrictMode>
        <Playlist />
    </React.StrictMode>
);
