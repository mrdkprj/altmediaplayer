import path from "path";
import { spawn, spawnSync } from "child_process";

const resourcePath = process.env.NODE_ENV === "development" ? path.join(__dirname, "..", "..", "resources") : path.join(process.resourcesPath, "resources")

export const getCommentSync = (fullPath:string) => {

    const result = spawnSync("powershell.exe",[path.join(resourcePath, "get_comment.ps1"), fullPath]);

    return {[fullPath]:result.stdout.toString()}

}

export const getComment = async (fullPath:string) => {

    const child = spawn("powershell.exe",[path.join(resourcePath, "get_comment.ps1"), fullPath]);
    let data = "";
    for await (const chunk of child.stdout) {
        data += chunk;
    }

    return data.replaceAll("\n", "").replaceAll("\r", "")

}

export const getAllComments = async (fullPaths:string[]):Promise<{[key:string]:string}> => {

    const args = fullPaths.map(fullPath => `"${fullPath}"`).join(" ")
    const child = spawn("powershell.exe",[path.join(resourcePath, "get_comments.ps1"), args]);
    let data = "";
    for await (const chunk of child.stdout) {
        data += chunk;
    }

    return JSON.parse(data);

}