import { FORWARD, BACKWARD, APP_NAME } from "../../constants";
import {appStateReducer, initialAppState} from "./appStateReducer";
import { handleShortcut } from "../shortcut";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Footer } from "./footer";
import icon from "../../assets/icon.ico"

const Buttons = {
    left:0,
    right:2,
}

const Player = () => {

    const [appState, dispatchAppState] = useReducer(appStateReducer, initialAppState);
    const video = useRef<HTMLVideoElement>(null)
    const viewport = useRef<HTMLDivElement>(null)
    const container = useRef<HTMLDivElement>(null)
    const hideControlTimeout = useRef<number | null>(null);

    const updateTime = useCallback((progress:number) => {

        if(!video.current) return;

        video.current.currentTime = appState.media.videoDuration * progress;

    },[video, appState.media.videoDuration])

    const onTimeUpdate = () => {

        if(!video.current) return;

        const duration = appState.media.videoDuration > 0 ? appState.media.videoDuration : 1

        dispatchAppState({type:"currentTime", value:video.current.currentTime})

        window.api.send("progress", {progress:video.current.currentTime / duration})
    }

    const updateVolume = useCallback((volume:number) => {

        if(volume > 1 || volume < 0 || !video.current) return;

        video.current.volume = volume
        dispatchAppState({type:"videoVolume", value:volume})

    },[video])

    const updateAmpLevel = useCallback((ampLevel:number) => {

        if(ampLevel > 1 || ampLevel < 0) return;

        dispatchAppState({type:"ampLevel", value:ampLevel})

        if(appState.media.gainNode){
            appState.media.gainNode.gain.value = ampLevel * 10;
        }

    },[appState.media.gainNode])

    const onFileDrop = (e:React.DragEvent) => {

        e.preventDefault();

        const items = e.dataTransfer ? e.dataTransfer.items : []

        const dropItems = Array.from(items).filter(item => {
            return item.kind === "file" && (item.type.includes("video") || item.type.includes("audio"));
        })

        if(dropItems.length){
            const files = dropItems.map(item => item.getAsFile()?.path ?? "")
            window.api.send("drop", {files, renderer:"Player"})
        }
    }

    const initPlayer = useCallback(() => {

        dispatchAppState({type:"currentFile", value:null})
        dispatchAppState({type:"videoDuration", value:0})
        dispatchAppState({type:"playing", value:false})
        dispatchAppState({type:"currentTime", value:0})
        viewport.current?.classList.remove("loaded");
        video.current?.load();

    },[video, viewport])

    const beforeDelete = useCallback((data:Mp.ReleaseFileRequest) => {

        if(data.fileIds.includes(appState.currentFile.id)){
            dispatchAppState({type:"currentFile", value:null})
        }
        window.api.send("file-released", {fileIds:data.fileIds})

    },[appState.currentFile.id]);

    const loadMedia = useCallback((e:Mp.FileLoadEvent) => {

        if(!video.current) return;

        dispatchAppState({type:"currentFile", value:e.currentFile})
        video.current.autoplay = e.autoPlay ? e.autoPlay : appState.playing;
        video.current.muted = appState.media.mute;
        video.current.playbackRate = appState.media.playbackSpeed
        video.current.load();

    },[video, appState.media.mute, appState.media.playbackSpeed, appState.playing])

    const onMediaLoaded = () => {

        document.title = `${APP_NAME} - ${appState.currentFile.name}`

        changeVideoSize();

        dispatchAppState({type:"videoDuration", value:video.current?.duration})

        dispatchAppState({type:"currentTime", value:video.current?.currentTime ?? 0})

        viewport.current?.classList.add("loaded");

        if(video.current){
            video.current.autoplay = false;
        }
    }

    const changeVideoSize = useCallback((config?:Mp.Config) => {

        if(!video.current || !container.current) return;

        const fitToWindow = config ? config.video.fitToWindow : appState.media.fitToWindow
        const containerRect = container.current.getBoundingClientRect();

        if(fitToWindow && containerRect.height > video.current.videoHeight){
            const ratio = Math.min(containerRect.width / video.current.videoWidth, containerRect.height / video.current.videoHeight);
            video.current.style.height = `${video.current.videoHeight * ratio}px`
        }else{
            video.current.style.height = ""
        }

    },[video, appState.media.fitToWindow])

    const createGain = useCallback(() => {

        if(!video.current) return;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video.current);
        const gainNode = audioCtx.createGain();

        dispatchAppState({type:"gainNode", value:gainNode})
        updateAmpLevel(appState.media.ampLevel);
        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

    },[video, appState.media.ampLevel, updateAmpLevel])

    const changeCurrentTime = useCallback((time:number) => {

        if(!video.current) return;

        const nextTime = video.current.currentTime + time;

        if(nextTime >= video.current.duration){
            return changeFile(FORWARD)
        }

        if(nextTime < 0){
            return changeFile(BACKWARD)
        }

        video.current.currentTime = nextTime;

    },[video])

    const playFoward = useCallback((button:number) => {

        if(!appState.loaded) return;

        if(button === 0){
            changeCurrentTime(appState.media.seekSpeed);
        }

        if(button === 2){
            changeFile(FORWARD)
        }

    },[appState.loaded, appState.media.seekSpeed, changeCurrentTime])

    const playBackward = useCallback((button:number) => {

        if(!appState.loaded) return;

        if(button === 0){
            changeCurrentTime(-appState.media.seekSpeed)
        }

        if(button === 2){
            changeFile(BACKWARD)
        }

    },[appState.loaded, appState.media.seekSpeed, changeCurrentTime])

    const changeFile = (index:number) => {
        return window.api.send("load-file", {index, isAbsolute:false})
    }

    const togglePlay = useCallback(() => {

        if(!appState.loaded || !video.current) return;

        if(video.current.paused){
            video.current.play();
        }else{
            video.current.pause();
        }

    },[appState.loaded])

    const onPlayed = () => {
        window.api.send("play-status-change", {status:"playing"})
        dispatchAppState({type:"playing", value:true})
    }

    const onPaused = () => {

        if(!video.current) return;

        if(video.current.currentTime == video.current.duration) return;

        window.api.send("play-status-change", {status:"paused"})
        dispatchAppState({type:"playing", value:false})
    }

    const stop = useCallback(() => {

        if(!appState.loaded || !video.current) return;

        window.api.send("play-status-change", {status:"stopped"})
        dispatchAppState({type:"playing", value:false})
        video.current.load();

    },[appState.loaded])

    const requestPIP = useCallback(async () => {

        if(video.current && appState.loaded){
            await video.current.requestPictureInPicture();
        }

    },[appState.loaded])

    const changePlaybackSpeed = useCallback((data:Mp.ChangePlaybackSpeedRequest) => {

        dispatchAppState({type:"playbackSpeed", value:data.playbackSpeed})
        if(video.current){
            video.current.playbackRate = data.playbackSpeed
        }

    },[video])

    const changeSeekSpeed = (data:Mp.ChangeSeekSpeedRequest) => {
        dispatchAppState({type:"seekSpeed", value:data.seekSpeed})
    }

    const captureMedia = useCallback(() => {

        if(!video.current || !appState.loaded) return;

        const canvas = document.createElement("canvas");
        const rect = video.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const context = canvas.getContext("2d");
        if(context){
            context.drawImage(video.current, 0, 0, rect.width, rect.height);
        }
        const image = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");

        window.api.send("save-capture", {data:image, timestamp:video.current.currentTime})

    },[appState.loaded])

    const toggleMute = useCallback(() => {

        dispatchAppState({type:"mute", value:null})

    },[])

    const minimize = () => {
        window.api.send("minimize", {})
    }

    const toggleMaximize = useCallback(() => {

        window.api.send("toggle-maximize", {})
        dispatchAppState({type:"isMaximized", value:!appState.isMaximized})

    },[appState.isMaximized])

    const onWindowSizeChanged = (e:Mp.ConfigChangeEvent) => {
        dispatchAppState({type:"isMaximized", value:e.config.isMaximized})
    }

    const hideControl = useCallback(() => {

        hideControlTimeout.current = window.setTimeout(() => {
            viewport.current?.classList.add("autohide")
        },2000)

    },[viewport])

    const exitFullscreen = useCallback(() => {

        dispatchAppState({type:"isFullScreen", value:false})

        if(hideControlTimeout.current){
            window.clearTimeout(hideControlTimeout.current)
        }
        viewport.current?.classList.remove("autohide")
        window.api.send("toggle-fullscreen", {fullscreen:false})

    },[viewport])

    const enterFullscreen = useCallback(() => {

        dispatchAppState({type:"isFullScreen", value:true})
        hideControl()
        window.api.send("toggle-fullscreen", {fullscreen:true})

    },[hideControl])

    const toggleFullscreen = useCallback(() => {

        if(appState.isFullScreen){
            exitFullscreen()
        }else{
            enterFullscreen()
        }

    },[appState.isFullScreen, enterFullscreen, exitFullscreen])

    const showControl = useCallback(() => {

        if(appState.isFullScreen){
            viewport.current?.classList.remove("autohide")
            if(hideControlTimeout.current) window.clearTimeout(hideControlTimeout.current)
            hideControl();
        }

    },[viewport, appState.isFullScreen, hideControl])

    const toggleConvert = () => {
        dispatchAppState({type:"converting", value:null})
    }

    const onChangeDisplayMode = useCallback((e:Mp.ConfigChangeEvent) => {

        dispatchAppState({type:"fitToWindow", value:e.config.video.fitToWindow})
        changeVideoSize(e.config);

    },[changeVideoSize])

    const close = useCallback(() => {

        window.api.send("close", {mediaState:appState.media});

    },[appState.media])

    const prepare = useCallback((e:Mp.ReadyEvent) => {

        dispatchAppState({type:"isMaximized", value:e.config.isMaximized})

        updateVolume(e.config.audio.volume);

        dispatchAppState({type:"ampLevel", value:e.config.audio.ampLevel})
        createGain();

        dispatchAppState({type:"mute", value:e.config.audio.mute})

        dispatchAppState({type:"fitToWindow", value:e.config.video.fitToWindow})
        dispatchAppState({type:"playbackSpeed", value:e.config.video.playbackSpeed})
        dispatchAppState({type:"seekSpeed", value:e.config.video.seekSpeed})

        initPlayer();

    },[initPlayer, createGain, updateVolume])

    const load = useCallback((e:Mp.FileLoadEvent) => {

        if(e.currentFile.id){
            loadMedia(e)
        }else{
            initPlayer();
        }

    },[initPlayer, loadMedia])

    const onMousemove = useCallback(() => {

        showControl();

    },[showControl]);

    const onKeydown = useCallback((e:KeyboardEvent) => {

        if(e.ctrlKey && e.key === "r") e.preventDefault();

        if(e.key === "F5") return window.api.send("reload", {});

        if(e.key === "ArrowRight"){

            showControl();

            if(e.shiftKey){
                changeCurrentTime(appState.media.seekSpeed)
            }else{
                playFoward(Buttons.left);
            }

            return
        }

        if(e.key === "ArrowLeft"){

            showControl();

            if(e.shiftKey){
                changeCurrentTime(-appState.media.seekSpeed)
            }else{
                playBackward(Buttons.left);
            }

            return
        }

        if(e.key === "ArrowUp"){
            showControl();
            updateVolume(appState.media.videoVolume + 0.01)
            return
        }

        if(e.key === "ArrowDown"){
            showControl();
            updateVolume(appState.media.videoVolume - 0.01)
            return
        }

        if(e.key === "Escape"){
            return exitFullscreen();
        }

        if(e.ctrlKey && e.key === "m"){
            return toggleMute();
        }

        if(e.key === "Enter"){
            return togglePlay();
        }

        return handleShortcut("Player", e);

    },[appState.media.seekSpeed, appState.media.videoVolume, changeCurrentTime, exitFullscreen, playBackward, playFoward, showControl, toggleMute, togglePlay, updateVolume]);

    const onResize = useCallback(() => {

        changeVideoSize()

    },[changeVideoSize]);

    const onContextMenu = (e:React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        window.api.send("open-player-context", {})
    }

    useEffect(() => {

        window.api.receive("ready", prepare)
        window.api.receive("after-file-load", load)
        window.api.receive("toggle-play", togglePlay)
        window.api.receive("change-display-mode", onChangeDisplayMode)
        window.api.receive("restart", initPlayer)
        window.api.receive("release-file", beforeDelete)
        window.api.receive("after-toggle-maximize", onWindowSizeChanged)
        window.api.receive("toggle-convert", toggleConvert)
        window.api.receive("change-playback-speed", changePlaybackSpeed)
        window.api.receive("change-seek-speed", changeSeekSpeed);
        window.api.receive("toggle-fullscreen", toggleFullscreen)
        window.api.receive("capture-media", captureMedia)
        window.api.receive("picture-in-picture", requestPIP)
        window.api.receive("log", data => console.log(data.log))

        window.addEventListener("keydown", onKeydown)
        window.addEventListener("resize", onResize)

        document.addEventListener("mousemove", onMousemove)

        return () => {

            window.removeEventListener("keydown", onKeydown)
            window.removeEventListener("resize", onResize)

            document.removeEventListener("mousemove", onMousemove)

            window.api.removeAllListeners("ready")
            window.api.removeAllListeners("after-file-load")
            window.api.removeAllListeners("toggle-play")
            window.api.removeAllListeners("change-display-mode")
            window.api.removeAllListeners("restart")
            window.api.removeAllListeners("release-file")
            window.api.removeAllListeners("after-toggle-maximize")
            window.api.removeAllListeners("toggle-convert")
            window.api.removeAllListeners("change-playback-speed")
            window.api.removeAllListeners("change-seek-speed")
            window.api.removeAllListeners("toggle-fullscreen")
            window.api.removeAllListeners("capture-media")
            window.api.removeAllListeners("picture-in-picture")
            window.api.removeAllListeners("log")
        }
    },[beforeDelete, captureMedia, changePlaybackSpeed, initPlayer, load, onChangeDisplayMode, onKeydown, onMousemove, onResize, prepare, requestPIP, toggleFullscreen, togglePlay])

    return (
        <div ref={viewport} className={`viewport ${appState.isFullScreen ? "full-screen" : ""}`}>

            <div className="title-bar">
                <div className="icon-area">
                    <img className="ico" src={icon}/>
                    <span>{APP_NAME}</span>
                </div>
                <div className="title">{appState.currentFile.name}</div>
                <div className="window-area">
                    <div className="minimize" onClick={minimize}>&minus;</div>
                    <div className="maximize" onClick={toggleMaximize}><div className={appState.isMaximized ? "minbtn" : "maxbtn"}></div></div>
                    <div className="close" onClick={close}>&times;</div>
                </div>
            </div>

            <div ref={container} className="video-container media" onDragOver={e => e.preventDefault() } onDrop={onFileDrop} onDoubleClick={togglePlay} onContextMenu={onContextMenu}>
                <video
                    ref={video}
                    className="video media"
                    src={ appState.currentFile.src}
                    onCanPlayThrough={onMediaLoaded}
                    onEnded={() => changeFile(FORWARD)}
                    onTimeUpdate={onTimeUpdate}
                    onPlay={onPlayed}
                    onPause={onPaused}
                    onContextMenu={onContextMenu}
                    muted={appState.media.mute}
                />
            </div>

            <Footer
                playing={appState.playing}
                converting={appState.converting}
                media={appState.media}
                onMouseEnter={showControl}
                onUpdateTime={updateTime}
                onUpdateVolume={updateVolume}
                onUpdateAmpLevel={updateAmpLevel}
                onClickPlay={togglePlay}
                onClickStop={stop}
                onClickPrevious={playBackward}
                onClickNext={playFoward}
                onClickMute={toggleMute}
            />

        </div>
    )
}

export default Player;