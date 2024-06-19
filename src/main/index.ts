import {app, ipcMain, clipboard, shell, protocol, nativeTheme} from "electron";
import fs from "fs";
import path from "path";
import url from "url"
import Helper from "./helper";
import util from "./util";
import Settings from "./settings";
import Dialogs from "./dialogs";
import Deferred from "./deferred";
import { EmptyFile, FORWARD, BACKWARD, PlayableAudioExtentions } from "../constants";

const locked = app.requestSingleInstanceLock(process.argv);

if(!locked) {
    app.exit()
}

protocol.registerSchemesAsPrivileged([
    { scheme: "app", privileges: { bypassCSP: true } },
])

const settings = new Settings(app.getPath("userData"), app.getPreferredSystemLanguages());
const helper = new Helper(settings.data);
const dialogs = new Dialogs(settings.data)

const Renderers:Renderer = {
    Player:null,
    Playlist:null,
    Convert:null,
    Tag:null,
}

const playlistFiles:Mp.MediaFile[] = []
const playlistSelection:Mp.PlaylistItemSelection = {selectedId:"", selectedIds:[]};

const additionalFiles:string[] = [];
const secondInstanceState:Mp.SecondInstanceState = {
    timeout:null,
    requireInitPlaylist:false,
}

let playStatus:Mp.PlayStatus = "stopped";
let doShuffle = false;
let currentIndex = -1;
let randomIndices:number[] = [];
let fileReleasePromise:Deferred<number>;

const thumbButtonCallback = (button:Mp.ThumbButtonType) => {
    switch(button){
        case "Next":
            changeIndex(FORWARD);
            break;
        case "Pause":
            togglePlay();
            break;
        case "Play":
            togglePlay();
            break;
        case "Previous":
            changeIndex(BACKWARD)
            break;
    }
}

const thumButtons = helper.createThumButtons(thumbButtonCallback)

const playerContextMenuCallback = (menu:keyof Mp.PlayerContextMenuSubTypeMap, args?:Mp.PlayerContextMenuSubTypeMap[keyof Mp.PlayerContextMenuSubTypeMap]) => {
    switch(menu){
        case "PlaybackSpeed":
            changePlaybackSpeed(Number(args));
            break;
        case "SeekSpeed":
            changeSeekSpeed(Number(args));
            break;
        case "TogglePlaylistWindow":
            togglePlaylistWindow();
            break;
        case "FitToWindow":
            changeSizeMode();
            break;
        case "PictureInPicture":
            respond("Player", "picture-in-picture", {});
            break;
        case "ToggleFullscreen":
            respond("Player", "toggle-fullscreen", {})
            break;
        case "Theme":
            changeTheme(args as Mp.Theme);
            break;
        case "Capture":
            respond("Player", "capture-media", {});
            break;
        case "OpenConfigFile":
            openConfigFileJson();
            break;
    }
}

const playerMenu = helper.createPlayerContextMenu(playerContextMenuCallback)

const playlistContextMenuCallback = (menu:keyof Mp.PlaylistContextMenuSubTypeMap, args?:Mp.PlaylistContextMenuSubTypeMap[keyof Mp.PlaylistContextMenuSubTypeMap]) => {

    switch(menu){
        case "Remove":
            removeFromPlaylist(playlistSelection.selectedIds);
            break;
        case "RemoveAll":
            clearPlaylist();
            break;
        case "Trash":
            deleteFile(playlistSelection.selectedIds);
            break;
        case "CopyFileName":
            copyFileNameToClipboard(false);
            break;
        case "CopyFullpath":
            copyFileNameToClipboard(true);
            break;
        case "PasteFilePath":
            pasteFilePath();
            break;
        case "Reveal":
            reveal();
            break;
        case "Metadata":
            displayMetadata();
            break;
        case "Convert":
            openConvert("user");
            break;
        case "Sort":
            changeSortOrder(args as Mp.SortOrder);
            break;
        case "Rename":
            respond("Playlist", "start-rename", {})
            break;
        case "Move":
            moveFile(playlistSelection.selectedIds);
            break;
        case "GroupBy":
            toggleGroupBy();
            break;
        case "Tag":
            addTagToFile(args ?? "");
            break;
        case "ManageTags":
            openTagEditor();
            break;
    }
}

const playlistMenu = helper.createPlaylistContextMenu(playlistContextMenuCallback)
const sortContext = helper.createPlaylistSortContextMenu(playlistContextMenuCallback)

const setSecondInstanceTimeout = () => {
    secondInstanceState.timeout = setTimeout(() => {
        afterSecondInstance()
    }, 1000);
}

const afterSecondInstance = () => {

    if(secondInstanceState.requireInitPlaylist){
        initPlaylist(additionalFiles)
    }else{
        addToPlaylist(additionalFiles)
    }

    additionalFiles.length = 0;

    secondInstanceState.timeout = null;
    secondInstanceState.requireInitPlaylist = true;

    if(!Renderers.Player) return;

    if(Renderers.Player.isFullScreen()){
        respond("Player", "toggle-fullscreen", {})
    }

    Renderers.Player.show();

    if(settings.data.isMaximized){
        Renderers.Player.maximize();
    }
}

app.on("second-instance", (_event:Electron.Event, _argv:string[], _workingDirectory:string, additionalData:any) => {

    if(!secondInstanceState.timeout){
        setSecondInstanceTimeout();
    }

    additionalFiles.push(...util.extractFilesFromArgv(additionalData))

})

app.on("ready", () => {

    nativeTheme.themeSource = settings.data.theme

    setSecondInstanceTimeout();

    registerIpcChannels();

    protocol.registerFileProtocol("app", (request, callback) => {

        const filePath = url.fileURLToPath(
            "file://" + request.url.slice("app://".length),
        );

        callback(filePath);
    });

    Renderers.Player = helper.createPlayerWindow();
    Renderers.Playlist = helper.createPlaylistWindow(Renderers.Player)
    Renderers.Convert = helper.createConvertWindow(Renderers.Player)
    Renderers.Tag = helper.createTagEditorWindow(Renderers.Player)

    Renderers.Player.on("ready-to-show", () => {

        if(settings.data.isMaximized){
            Renderers.Player?.maximize();
        }

        Renderers.Player?.setBounds(settings.data.bounds)
        Renderers.Player?.setThumbarButtons(thumButtons[0])

        onPlayerReady();

    })

    Renderers.Player.on("maximize", onMaximize);
    Renderers.Player.on("unmaximize", onUnmaximize);

    Renderers.Player.on("closed", () => {
        Renderers.Player = null;
    });

});

const respond = <K extends keyof RendererChannelEventMap>(rendererName:RendererName, channel:K, data:RendererChannelEventMap[K]) => {
    Renderers[rendererName]?.webContents.send(channel, data);
}

const onPlayerReady = () => {

    Renderers.Player?.show();

    if(settings.data.playlistVisible){
        Renderers.Playlist?.show();
    }

    respond("Player", "ready", {settings:settings.data});
    respond("Playlist", "ready", {settings:settings.data});
    respond("Convert", "ready", {settings:settings.data});

    togglePlay();

    initPlaylist(util.extractFilesFromArgv())

}

const loadMediaFile = (startFrom?:number) => {
    const currentFile = getCurrentFile();

    respond("Playlist", "load-file", {currentFile, status:playStatus, startFrom})
    respond("Player", "load-file", {currentFile, status:playStatus, startFrom})
}

const initPlaylist = (fullPaths:string[]) => {

    reset();

    fullPaths.map(fullPath => util.toFile(fullPath)).forEach(file => playlistFiles.push(file))

    if(!playlistFiles.length) return;

    currentIndex = 0;

    sortPlayList();

    shuffleList();

    changePlayStatus("playing")

    loadMediaFile();

}

const addToPlaylist = (fullPaths:string[]) => {

    const newFiles = fullPaths.filter(fullPath => playlistFiles.findIndex(file => file.fullPath == fullPath) < 0).map(fullPath => util.toFile(fullPath));

    playlistFiles.push(...newFiles)

    sortPlayList();

    shuffleList();

    if(playlistFiles.length && currentIndex < 0){
        currentIndex = 0;
        loadMediaFile();
    }

}

const getCurrentFile = () => {

    if(currentIndex < 0) return EmptyFile;

    if(!playlistFiles.length) return EmptyFile;

    return playlistFiles[currentIndex];

}

const reset = () => {
    playlistFiles.length = 0;
    randomIndices.length = 0;
    playlistSelection.selectedId = "";
    playlistSelection.selectedIds = []
    currentIndex = -1;
    respond("Playlist", "clear-playlist", {})
}

const changePlayStatus = (status:Mp.PlayStatus) => {
    playStatus = status;
}

const onUnmaximize = () => {
    settings.data.isMaximized = false;
    respond("Player", "after-toggle-maximize", {settings:settings.data})
}

const onMaximize = () => {
    settings.data.isMaximized = true;
    respond("Player","after-toggle-maximize", {settings:settings.data})
}

const toggleMaximize = () => {

    if(!Renderers.Player) return;

    if(Renderers.Player.isMaximized()){
        Renderers.Player.unmaximize();
        Renderers.Player.setBounds(settings.data.bounds)
    }else{
        settings.data.bounds = Renderers.Player.getBounds()
        Renderers.Player.maximize();
    }
}

const saveSettings = () => {

    if(!Renderers.Player || !Renderers.Playlist) return;

    try{
        settings.data.isMaximized = Renderers.Player.isMaximized();
        settings.data.playlistBounds = Renderers.Playlist.getBounds()

        settings.save();
    }catch(ex){
        dialogs.showErrorMessage(ex)
    }
}

const closeWindow = () => {
    saveSettings();
    app.quit();
}

const shuffleList = () => {

    if(!doShuffle) return;

    const target = new Array(playlistFiles.length).fill(undefined).map((_v, i) => i).filter(i => i !== currentIndex);
    randomIndices = util.shuffle(target)

}

const getRandomIndex = (value:number) => {

    if(value > 0){
        randomIndices.unshift(currentIndex);
        return randomIndices.pop() as number;
    }

    randomIndices.push(currentIndex);
    return randomIndices.shift() as number;

}

const changeIndex = (index:number) => {

    let nextIndex = doShuffle ? getRandomIndex(index) : currentIndex + index;

    if(nextIndex >= playlistFiles.length){
        nextIndex = 0;
    }

    if(nextIndex < 0){
        nextIndex = playlistFiles.length - 1
    }

    currentIndex = nextIndex;

    loadMediaFile();
}

const selectFile = (index:number) => {
    currentIndex = index;
    changePlayStatus("playing")
    loadMediaFile();
}

const onPlayerPlayStatusChange = (data:Mp.ChangePlayStatusRequest) => {

    changePlayStatus(data.status)

    Renderers.Player?.setThumbarButtons([])

    if(playStatus == "playing"){
        Renderers.Player?.setThumbarButtons(thumButtons[1])
    }else{
        Renderers.Player?.setThumbarButtons(thumButtons[0])
    }

}

const togglePlay = () => {
    respond("Player", "toggle-play", {})
}

const dropFiles = (data:Mp.DropRequest) => {

    if(data.renderer === "Playlist"){
        addToPlaylist(data.files)
    }

    if(data.renderer === "Player"){
        initPlaylist(data.files)
    }

}

const changePlaylistItemOrder = (data:Mp.ChangePlaylistOrderRequet) => {

    if(data.start === data.end) return;

    const currentId = getCurrentFile().id;

    const replacing = playlistFiles.splice(data.start, 1)[0];
    playlistFiles.splice(data.end, 0, replacing)

    currentIndex = playlistFiles.findIndex(file => file.id == currentId);

    respond("Playlist", "playlist-change", {files:playlistFiles})

}

const clearPlaylist = () => {
    reset();
    changePlayStatus("stopped")
    loadMediaFile();
}

const removeFromPlaylist = (selectedIds:string[]) => {

    if(!selectedIds.length) return;

    const removeIndices = playlistFiles.filter(file => selectedIds.includes(file.id)).map(file => playlistFiles.indexOf(file))
    const isCurrentFileRemoved = removeIndices.includes(currentIndex);

    const newFiles = playlistFiles.filter((_,index) => !removeIndices.includes(index));
    playlistFiles.length = 0;
    playlistFiles.push(...newFiles)

    respond("Playlist", "after-remove-playlist", {files:playlistFiles})

    currentIndex = getIndexAfterRemove(removeIndices)

    if(isCurrentFileRemoved){
        loadMediaFile();
    }

}

const getIndexAfterRemove = (removeIndices:number[]) => {

    if(removeIndices.includes(currentIndex)){

        if(!playlistFiles.length) return -1;

        const nextIndex = removeIndices[0]

        if(nextIndex >= playlistFiles.length){
            return playlistFiles.length - 1
        }

        return nextIndex;
    }

    if(removeIndices[0] < currentIndex){
        return currentIndex - removeIndices.length
    }

    return currentIndex

}

const releaseFile = async (fileIds:string[]) => {
    respond("Player", "release-file", {fileIds})
    fileReleasePromise = new Deferred();
    return await fileReleasePromise.promise
}

const deleteFile = async (selectedIds:string[]) => {

    if(!selectedIds.length) return;

    await releaseFile(selectedIds);

    try{

        const targetFilePaths = playlistFiles.filter(file => selectedIds.includes(file.id)).map(file => file.fullPath);

        if(!targetFilePaths.length) return;

        await Promise.all(targetFilePaths.map(async item => await shell.trashItem(item)))

        removeFromPlaylist(selectedIds);

    }catch(ex){
        dialogs.showErrorMessage(ex)
    }
}

const moveFile = async (selectedIds:string[]) => {

    if(!Renderers.Playlist) return;

    if(selectedIds.length != 1) return;

    try {
        const files = playlistFiles.filter(file => file.id == selectedIds[0]);

        if(!files.length) return;

        const file = files[0];

        const defaultPath = settings.data.defaultPath && fs.existsSync(settings.data.defaultPath) ? path.join(settings.data.defaultPath, file.name) : file.fullPath;
        const destPath = dialogs.showSaveDialog(Renderers.Playlist, defaultPath);

        if(!destPath || file.fullPath == destPath) return;

        await releaseFile(selectedIds);
        settings.data.defaultPath = destPath;

        removeFromPlaylist(selectedIds);

        fs.renameSync(file.fullPath, destPath);

    }catch(ex:any){
        dialogs.showErrorMessage(ex)
    }

}

const reveal = () => {

    if(!playlistSelection.selectedId) return;

    const file = playlistFiles.find(file => file.id == playlistSelection.selectedId)

    if(!file) return;

    shell.showItemInFolder(file.fullPath)

}

const copyFileNameToClipboard = (fullPath:boolean) => {

    if(!playlistSelection.selectedIds.length) return;

    const files = playlistFiles.filter(file => playlistSelection.selectedIds.includes(file.id))

    if(!files) return;

    const names = files.map(file => fullPath ? file.fullPath : file.name);

    clipboard.writeText(names.join("\n"));

}

const pasteFilePath = () => {
    const paths = clipboard.readText();
    const lineBreak = paths.includes("\r") ? "\r\n" : "\n"
    if(paths){
        const files = paths.split(lineBreak).filter(filePath => fs.existsSync(filePath));
        if(files.length){
            addToPlaylist(files);
        }
    }
}

const toggleGroupBy = () => {
    settings.data.sort.groupBy = !settings.data.sort.groupBy
    sortPlayList();
}

const changeSortOrder = (sortOrder:Mp.SortOrder) => {
    settings.data.sort.order = sortOrder;
    sortPlayList();
}

const sortPlayList = () => {

    respond("Playlist", "sort-type-change", settings.data.sort)

    const currentFileId = getCurrentFile().id;

    if(!playlistFiles.length) return;

    if(settings.data.sort.groupBy){
        util.sortByGroup(playlistFiles, settings.data.sort.order)
    }else{
        util.sort(playlistFiles, settings.data.sort.order)
    }

    const sortedIds = playlistFiles.map(file => file.id);

    if(currentFileId){
        currentIndex = sortedIds.findIndex(id => id === currentFileId);
    }

    respond("Playlist", "playlist-change", {files:playlistFiles})

}

const togglePlaylistWindow = () => {

    settings.data.playlistVisible = !settings.data.playlistVisible;
    if(settings.data.playlistVisible){
        Renderers.Playlist?.show();
    }else{
        Renderers.Playlist?.hide();
    }

}

const openConvert = (opener:Mp.DialogOpener) => {
    const file = playlistFiles.find(file => file.id == playlistSelection.selectedId) ?? EmptyFile
    respond("Convert", "open-convert", {file, opener})
    Renderers.Convert?.show();
}

const openConvertSourceFileDialog = (e:Mp.OpenFileDialogRequest) => {

    if(!Renderers.Convert) return;

    const selectedFiles = dialogs.openConvertSourceFileDialog(Renderers.Convert, e.fullPath)

    if(!selectedFiles) return;

    const file = selectedFiles ? util.toFile(selectedFiles[0]) : EmptyFile

    respond("Convert", "after-sourcefile-select", {file})

}

const changeSizeMode = () => {
    settings.data.video.fitToWindow = !settings.data.video.fitToWindow
    respond("Player", "change-display-mode", {settings:settings.data})
}

const changeTheme = (theme:Mp.Theme) => {
    nativeTheme.themeSource = theme
    settings.data.theme = theme;
}

const changePlaybackSpeed = (playbackSpeed:number) => {
    settings.data.video.playbackSpeed = playbackSpeed
    respond("Player", "change-playback-speed", {playbackSpeed})
}

const changeSeekSpeed = (seekSpeed:number) => {
    settings.data.video.seekSpeed = seekSpeed;
    respond("Player", "change-seek-speed", {seekSpeed});
}

const onMediaStateChange = (data:Mp.MediaState) => {
    settings.data.audio.volume = data.videoVolume;
    settings.data.audio.ampLevel = data.ampLevel;
    settings.data.audio.mute = data.mute;
}

const changeProgressBar = (data:Mp.ProgressEvent) => Renderers.Player?.setProgressBar(data.progress);

const openPlayerContextMenu = () => playerMenu.popup({window:Renderers.Player ?? undefined});

const openSortContextMenu = (e:Mp.Position) => sortContext.popup({window:Renderers.Playlist ?? undefined, x:e.x, y:e.y - 110})

const hideConvertDialog = () => Renderers.Convert?.hide();

const saveCapture = async (data:Mp.CaptureEvent) => {

    const file = getCurrentFile();

    if(!file.id || PlayableAudioExtentions.includes(file.extension)) return;

    if(!Renderers.Player) return;

    const savePath = dialogs.saveImageDialog(Renderers.Player, file, data.timestamp)

    if(!savePath) return;

    settings.data.defaultPath = path.dirname(savePath);

    fs.writeFileSync(savePath, data.data, "base64")
}

const startConvert = async (data:Mp.ConvertRequest) => {

    if(!Renderers.Convert) return endConvert();

    if(!data.sourcePath) return endConvert();

    const file = util.toFile(data.sourcePath);

    if(!util.exists(file.fullPath)) return endConvert();

    const extension = data.convertFormat.toLocaleLowerCase();
    const fileName =  file.name.replace(path.extname(file.name), "")

    const selectedPath = dialogs.saveMediaDialog(Renderers.Convert, fileName, extension, data.convertFormat)

    if(!selectedPath) return endConvert()

    settings.data.defaultPath = path.dirname(selectedPath)

    const shouldReplace = getCurrentFile().fullPath === selectedPath

    const timestamp = String(new Date().getTime());
    const savePath = shouldReplace ? path.join(path.dirname(selectedPath), path.basename(selectedPath) + timestamp) : selectedPath

    Renderers.Convert.hide()

    respond("Player", "toggle-convert", {})

    try{

        if(data.convertFormat === "MP4"){
            await util.convertVideo(data.sourcePath, savePath, data.options)
        }else{
            await util.convertAudio(data.sourcePath, savePath, data.options)
        }

        if(shouldReplace){
            fs.renameSync(savePath, selectedPath)
        }

        endConvert();

    }catch(ex:any){

        endConvert(ex.message)

    }finally{

        openConvert("system");
        respond("Player", "toggle-convert", {})

    }

}

const endConvert = (message?:string) => {
    if(message){
        dialogs.showErrorMessage(message)
    }
    respond("Convert", "after-convert", {})
}

const displayMetadata = async () => {

    const file = playlistFiles.find(file => file.id == playlistSelection.selectedId)
    if(!file || !Renderers.Player) return;

    const metadata = await util.getMediaMetadata(file.fullPath, true)
    const metadataString = JSON.stringify(metadata, undefined, 2).replaceAll('"',"");
    const result = await dialogs.metadataDialog(Renderers.Player, metadataString)
    if(result.response === 0){
        clipboard.writeText(metadataString);
    }
}

const openTagEditor = () => {
    respond("Tag", "open-tag-editor", {tags:settings.data.tags})
    Renderers.Tag?.show();
}

const saveTags = (e:Mp.SaveTagsEvent) => {
    settings.data.tags = e.tags;
    helper.refreshTagContextMenu(playlistMenu, e.tags, playlistContextMenuCallback)
}

const closeTagEditor = () => Renderers.Tag?.hide();

const addTagToFile = async (tagName:string) => {

    const fileIndex = playlistFiles.findIndex(file => file.id == playlistSelection.selectedId)

    if(fileIndex < 0) return;

    const currentTime = await releaseFile([playlistFiles[fileIndex].id])

    try{
        const file = playlistFiles[fileIndex];
        const tag = `[${tagName}]-`;

        const matchedTag = file.name.match(/^\[.*\]-/);
        let fileName = file.name;
        if(matchedTag){
            fileName = matchedTag[0] == tag ? fileName.slice(matchedTag[0].length) : `${tag}${fileName.slice(matchedTag[0].length)}`;
        }else{
            fileName = `${tag}${fileName}`
        }

        const newPath = path.join(file.dir, fileName);

        fs.renameSync(file.fullPath, newPath);

        const newMediaFile = util.updateFile(newPath, file);
        playlistFiles[fileIndex] = newMediaFile

        respond("Playlist", "playlist-change", {files:playlistFiles})

    }catch(ex:any){
        dialogs.showErrorMessage(ex)
    }finally{
        if(fileIndex == currentIndex){
            loadMediaFile(currentTime)
        }
    }

}

const renameFile = async (e:Mp.RenameRequest) => {

    const currentTime = await releaseFile([e.data.id]);

    const fileIndex = playlistFiles.findIndex(file => file.id == e.data.id)
    const file = playlistFiles[fileIndex];
    const filePath = file.fullPath;
    const newPath = path.join(path.dirname(filePath), e.data.name)

    try{

        if(util.exists(newPath)){
            throw new Error(`File name "${e.data.name}" exists`)
        }

        fs.renameSync(filePath, newPath)

        const newMediaFile = util.updateFile(newPath, file);
        playlistFiles[fileIndex] = newMediaFile

        respond("Playlist", "after-rename", {file:newMediaFile})

    }catch(ex){
        await dialogs.showErrorMessage(ex)
        respond("Playlist", "after-rename", {file:file, error:true})
    }finally{
        if(fileIndex == currentIndex){
            loadMediaFile(currentTime)
        }
    }
}

const onMinimize = () => Renderers.Player?.minimize();

const onLoadRequest = (data:Mp.LoadFileRequest) => {
    if(data.isAbsolute){
        selectFile(data.index)
    }else{
        changeIndex(data.index)
    }
}

const onReload = () => {
    Renderers.Playlist?.reload();
    Renderers.Player?.reload();
}

const onClosePlaylist = () => {
    settings.data.playlistVisible = false;
    Renderers.Playlist?.hide()
}

const onPlaylistItemSelectionChange = (data:Mp.PlaylistItemSelectionChange) => {
    playlistSelection.selectedId = data.selection.selectedId;
    playlistSelection.selectedIds = data.selection.selectedIds
}

const onOpenPlaylistContext = () => {
    playlistMenu.popup({window:Renderers.Playlist ?? undefined})
}

const onToggleShuffle = () => {
    doShuffle = !doShuffle;
    shuffleList();
}

const onToggleFullscreen = (e:Mp.FullscreenChange) => {

    if(e.fullscreen){
        Renderers.Player?.setFullScreen(true)
        Renderers.Playlist?.hide();
        Renderers.Convert?.hide();
    }else{
        Renderers.Player?.setFullScreen(false)
        if(settings.data.playlistVisible) Renderers.Playlist?.show();
        Renderers.Player?.focus();
    }
}

const onShortcut = (e:Mp.ShortcutEvent) => {
    if(e.renderer === "Player"){
        playerContextMenuCallback(e.menu as keyof Mp.PlayerContextMenuSubTypeMap)
    }

    if(e.renderer === "Playlist"){
        playlistContextMenuCallback(e.menu as keyof Mp.PlaylistContextMenuSubTypeMap)
    }
}

const onReleaseFile = (data:Mp.ReleaseFileResult) => {
    fileReleasePromise.resolve(data.currentTime);
}

const openConfigFileJson = async () => {
    await shell.openPath(settings.getFilePath());
}

const registerIpcChannels = () => {

    const addEventHandler = <K extends keyof MainChannelEventMap>(
        channel:K,
        handler: (data: MainChannelEventMap[K]) => void | Promise<void>
    ) => {
        ipcMain.on(channel, (_event, request) => handler(request))
    }

    addEventHandler("minimize", onMinimize)
    addEventHandler("toggle-maximize", toggleMaximize)
    addEventHandler("close", closeWindow)
    addEventHandler("drop", dropFiles)
    addEventHandler("load-file", onLoadRequest)
    addEventHandler("progress", changeProgressBar)
    addEventHandler("media-state-change", onMediaStateChange)
    addEventHandler("open-player-context", openPlayerContextMenu)
    addEventHandler("play-status-change", onPlayerPlayStatusChange)
    addEventHandler("reload", onReload)
    addEventHandler("save-capture", saveCapture)
    addEventHandler("close-playlist", onClosePlaylist)
    addEventHandler("playlist-item-selection-change", onPlaylistItemSelectionChange)
    addEventHandler("open-sort-context", openSortContextMenu)
    addEventHandler("trash-ready", deleteFile)
    addEventHandler("rename-file", renameFile);
    addEventHandler("file-released", onReleaseFile);
    addEventHandler("open-playlist-context", onOpenPlaylistContext)
    addEventHandler("change-playlist-order", changePlaylistItemOrder)
    addEventHandler("toggle-play", togglePlay)
    addEventHandler("toggle-shuffle", onToggleShuffle)
    addEventHandler("toggle-fullscreen", onToggleFullscreen)
    addEventHandler("close-convert", hideConvertDialog)
    addEventHandler("request-convert", startConvert)
    addEventHandler("request-cancel-convert", util.cancelConvert)
    addEventHandler("open-convert-sourcefile-dialog", openConvertSourceFileDialog)
    addEventHandler("shortcut", onShortcut)
    addEventHandler("save-tags", saveTags)
    addEventHandler("close-tag", closeTagEditor)
    addEventHandler("open-config-file", openConfigFileJson)
    addEventHandler("error", (e:Mp.ErrorEvent) => dialogs.showErrorMessage(e.message))

}
