import React from "react";
import { createRoot } from "react-dom/client";
import Player from "../player/player";

const root = createRoot(document.getElementById("root") ?? document.body);

root.render(
    <React.StrictMode>
        <Player />
    </React.StrictMode>
);
