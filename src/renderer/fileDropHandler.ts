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

    return Array.from(items)
        .filter((item) => item.kind === "file")
        .map((item) => {
            const file = item.getAsFile();
            const extension = ext(file?.name);
            const path = file?.path ?? "";
            return { path, extension };
        })
        .filter((item) => VideoExtensions.concat(AudioExtensions).includes(item.extension))
        .map((item) => item.path);
};
