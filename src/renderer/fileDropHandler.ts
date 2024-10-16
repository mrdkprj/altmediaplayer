import { AudioExtensions, VideoExtensions } from "../constants";

const ext = (name: string | undefined) => {
    if (!name) return "";

    if (name.lastIndexOf(".") < 0) return "";

    return name.substring(name.lastIndexOf(".")).toLowerCase();
};

export const getDropFiles = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const items = e.dataTransfer ? e.dataTransfer.items : [];

    const files = Array.from(items)
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((item) => item != null);

    if (!files.length) return [];

    const fullPaths = window.api.onFileDrop(files);

    return fullPaths.filter((path) => VideoExtensions.concat(AudioExtensions).includes(ext(path)));
};
