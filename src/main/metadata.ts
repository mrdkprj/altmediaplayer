import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import type { ChildProcessWithoutNullStreams } from "child_process";
import util from "./util";

type RunningProcess = {
    process:ChildProcessWithoutNullStreams,
    file:string;
}

const command = "chcp 65001 > NUL & powershell.exe -file";
const resourcePath = process.env.NODE_ENV === "development" ? path.join(__dirname, "..", "..", "resources") : path.join(process.resourcesPath, "resources")
let tasks:{[key:string]:RunningProcess} = {}

export const killMetadataProcess = () => {
    if(Object.keys(tasks).length){
        Object.keys(tasks).forEach(key => tasks[key].process.kill())
    }

    cleanUp();
}

const cleanUp = (key?:string) => {

    if(key){
        deleteFile(tasks[key].file)
        delete tasks[key]
    }else{
        Object.keys(tasks).forEach(key => deleteFile(tasks[key].file))
        tasks = {};
    }

}

const deleteFile = (file:string) => {
    if(util.exists(file)){
        fs.rmSync(file)
    }
}

export const getAllComments = async (tempPath:string, fullPaths:string[]):Promise<{[key:string]:string}> => {

    const key = String(new Date().getTime())
    const file = path.join(tempPath, key)
    const args = fullPaths.join("\n");
    fs.writeFileSync(file, args, {encoding:"utf-8"})

    const process = spawn(command,[path.join(resourcePath, "get_comments.ps1"), file], { shell: true });

    tasks[key] = { process, file }

    process.on("exit", () => cleanUp(key))

    let data = "";
    for await (const chunk of process.stdout) {
        data += chunk;
    }

    return JSON.parse(data);

}