import path from "path";
import { spawn, spawnSync } from "child_process";

const resourcePath = process.env.NODE_ENV === "development" ? path.join(__dirname, "..", "..", "resources") : path.join(process.resourcesPath, "resources")
const command = "chcp 65001 > NUL & powershell.exe -file";

export const getCommentSync = (fullPath:string) => {

    const result = spawnSync(command,[path.join(resourcePath, "get_comment.ps1"), fullPath], { shell: true });

    return {[fullPath]:result.stdout.toString()}

}

export const getComment = async (fullPath:string) => {

    const child = spawn(command,[path.join(resourcePath, "get_comment.ps1"), fullPath], { shell: true });
    let data = "";
    for await (const chunk of child.stdout) {
        data += chunk;
    }

    return data.replaceAll("\n", "").replaceAll("\r", "")

}

export const getAllComments = async (fullPaths:string[]):Promise<{[key:string]:string}> => {

    const args = fullPaths.map(fullPath => `"${fullPath}"`).join(" ")

    const child = spawn(command,[path.join(resourcePath, "get_comments.ps1"), args], { shell: true });
    let data = "";
    for await (const chunk of child.stdout) {
        data += chunk;
    }

    return JSON.parse(data);

}