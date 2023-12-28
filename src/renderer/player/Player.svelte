<script lang="ts">

    import { onMount } from "svelte";
    import { reducer, initialAppState } from "./appStateReducer";
    import { useTranslation } from "../../translation/useTranslation"

    import { FORWARD, BACKWARD, APP_NAME, handleKeyEvent } from "../../constants";
    import { handleShortcut } from "../shortcut";
    import Footer from "./Footer.svelte";
    import icon from "../../assets/icon.ico"

    let video:HTMLVideoElement
    let container:HTMLDivElement
    let hideControlTimeout:number | null
    let lang:Mp.Lang = "en";

    const Buttons = {
        left:0,
        right:2,
    }

    const { appState, dispatch } = reducer(initialAppState);
    const t = useTranslation(lang);

    const updateTime = (progress:number) => {

        if(!$appState.loaded) return;

        video.currentTime = $appState.media.videoDuration * progress;

    }

    const onTimeUpdate = () => {

        if(!$appState.loaded) return;

        const duration = $appState.media.videoDuration > 0 ? $appState.media.videoDuration : 1

        dispatch({type:"currentTime", value:video.currentTime})

        window.api.send("progress", {progress:video.currentTime / duration})
    }

    const updateVolume = (volume:number) => {

        if(volume > 1 || volume < 0) return;

        video.volume = volume
        dispatch({type:"videoVolume", value:volume})

    }

    const getGainNode = () => {

        if(!video) throw new Error("Media not found");

        if($appState.media.gainNode) return $appState.media.gainNode;

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const gainNode = audioCtx.createGain();

        dispatch({type:"gainNode", value:gainNode})

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        return gainNode;

    }

    const updateAmpLevel = (ampLevel:number) => {

        if(ampLevel > 1 || ampLevel < 0) return;

        const gainNode = getGainNode();

        dispatch({type:"ampLevel", value:ampLevel})

        gainNode.gain.value = ampLevel * 10;

    }

    const onFileDrop = (e:DragEvent) => {

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

    const initPlayer = () => {

        dispatch({type:"currentFile", value:null})
        dispatch({type:"videoDuration", value:0})
        dispatch({type:"playing", value:false})
        dispatch({type:"currentTime", value:0})
        dispatch({type:"loaded", value:false})
        video.load();

    }

    const beforeDelete = (data:Mp.TrashRequest) => {

        if(data.fileIds.includes($appState.currentFile.id)){
            dispatch({type:"currentFile", value:null})
        }
        window.api.send("trash-ready", {fileIds:data.fileIds})

    };

    const beforeRename = (data:Mp.RenameRequest) => {

        if($appState.currentFile.id == data.id){
            data.currentTime = $appState.media.currentTime;
            dispatch({type:"currentFile", value:null})
        }
        window.api.send("rename-ready", data)
    }

    const loadMedia = (e:Mp.FileLoadEvent) => {

        dispatch({type:"currentFile", value:e.currentFile})

        video.autoplay = e.autoPlay ? e.autoPlay : $appState.playing;
        video.muted = $appState.media.mute;
        video.playbackRate = $appState.media.playbackSpeed
        dispatch({type:"currentTime", value:0})
        dispatch({type:"startFrom", value:e.startFrom})

        video.load();

    }

    const onMediaLoaded = () => {

        dispatch({type:"loaded", value:true})

        document.title = `${APP_NAME} - ${$appState.currentFile.name}`

        changeVideoSize();

        dispatch({type:"videoDuration", value:video.duration})

        if($appState.startFrom){
            changeCurrentTime($appState.startFrom)
        }

        video.autoplay = false;

    }

    const changeVideoSize = (config?:Mp.Config) => {

        const fitToWindow = config ? config.video.fitToWindow : $appState.media.fitToWindow
        const containerRect = container.getBoundingClientRect();

        if(fitToWindow && containerRect.height > video.videoHeight){
            const ratio = Math.min(containerRect.width / video.videoWidth, containerRect.height / video.videoHeight);
            video.style.height = `${video.videoHeight * ratio}px`
        }else{
            video.style.height = ""
        }

    }

    const changeCurrentTime = (time:number) => {

        if(!$appState.loaded) return;

        const nextTime = video.currentTime + time;

        if(nextTime >= video.duration){
            return changeFile(FORWARD)
        }

        if(nextTime < 0){
            return changeFile(BACKWARD)
        }

        video.currentTime = nextTime;

    }

    const playFoward = (button:number) => {

        if(!$appState.loaded) return;

        if(button === 0){
            changeCurrentTime($appState.media.seekSpeed);
        }

        if(button === 2){
            changeFile(FORWARD)
        }

    }

    const playBackward = (button:number) => {

        if(!$appState.loaded) return;

        if(button === 0){
            changeCurrentTime(-$appState.media.seekSpeed)
        }

        if(button === 2){
            changeFile(BACKWARD)
        }

    }

    const changeFile = (index:number) => {
        return window.api.send("load-file", {index, isAbsolute:false})
    }

    const togglePlay = () => {

        if(!$appState.loaded) return;

        if(video.paused){
            video.play();
        }else{
            video.pause();
        }

    }

    const onPlayed = () => {
        window.api.send("play-status-change", {status:"playing"})
        dispatch({type:"playing", value:true})
    }

    const onPaused = () => {

        if(video.currentTime == video.duration) return;

        window.api.send("play-status-change", {status:"paused"})
        dispatch({type:"playing", value:false})
    }

    const stop = () => {

        if(!$appState.loaded) return;

        window.api.send("play-status-change", {status:"stopped"})
        dispatch({type:"playing", value:false})
        video.load();

    }

    const requestPIP = async () => {
        if($appState.loaded){
            await video.requestPictureInPicture();
        }
    }

    const changePlaybackSpeed = (data:Mp.ChangePlaybackSpeedRequest) => {
        dispatch({type:"playbackSpeed", value:data.playbackSpeed})
        video.playbackRate = data.playbackSpeed
    }

    const changeSeekSpeed = (data:Mp.ChangeSeekSpeedRequest) => {
        dispatch({type:"seekSpeed", value:data.seekSpeed})
    }

    const captureMedia = () => {

        if(!$appState.loaded) return;

        const canvas = document.createElement("canvas");
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const context = canvas.getContext("2d");
        if(context){
            context.drawImage(video, 0, 0, rect.width, rect.height);
        }
        const image = canvas.toDataURL("image/jpeg").replace(/^data:image\/jpeg;base64,/, "");

        window.api.send("save-capture", {data:image, timestamp:video.currentTime})

    }

    const toggleMute = () => {
        dispatch({type:"mute", value:!$appState.media.mute})
    }

    const minimize = () => {
        window.api.send("minimize", {})
    }

    const toggleMaximize = () => {
        window.api.send("toggle-maximize", {})
        dispatch({type:"isMaximized", value:!$appState.isMaximized})
    }

    const onWindowSizeChanged = (e:Mp.ConfigChangeEvent) => {
        dispatch({type:"isMaximized", value:e.config.isMaximized})
    }

    const hideControl = () => {
        hideControlTimeout = window.setTimeout(() => {
            dispatch({type:"autohide", value:true})
        },2000)
    }

    const exitFullscreen = () => {

        dispatch({type:"isFullScreen", value:false})

        if(hideControlTimeout){
            window.clearTimeout(hideControlTimeout)
        }
        dispatch({type:"autohide", value:false})
        window.api.send("toggle-fullscreen", {fullscreen:false})

    }

    const enterFullscreen = () => {
        dispatch({type:"isFullScreen", value:true})
        hideControl()
        window.api.send("toggle-fullscreen", {fullscreen:true})
    }

    const toggleFullscreen = () => {
        if($appState.isFullScreen){
            exitFullscreen()
        }else{
            enterFullscreen()
        }
    }

    const showControl = () => {

        if($appState.isFullScreen){
            dispatch({type:"autohide", value:false})
            if(hideControlTimeout){
                window.clearTimeout(hideControlTimeout)
            }
            hideControl();
        }
    }

    const toggleConvert = () => {
        dispatch({type:"converting"})
    }

    const onChangeDisplayMode = (e:Mp.ConfigChangeEvent) => {
        dispatch({type:"fitToWindow", value:e.config.video.fitToWindow})
        changeVideoSize(e.config);
    }

    const close = () => {
        window.api.send("close", {mediaState:$appState.media});
    }

    const prepare = (e:Mp.ReadyEvent) => {

        dispatch({type:"isMaximized", value:e.config.isMaximized})

        updateVolume(e.config.audio.volume);
        updateAmpLevel(e.config.audio.ampLevel)

        dispatch({type:"mute", value:e.config.audio.mute})

        dispatch({type:"fitToWindow", value:e.config.video.fitToWindow})
        dispatch({type:"playbackSpeed", value:e.config.video.playbackSpeed})
        dispatch({type:"seekSpeed", value:e.config.video.seekSpeed})

        initPlayer();

    }

    const load = (e:Mp.FileLoadEvent) => {
        if(e.currentFile.id){
            loadMedia(e)
        }else{
            initPlayer();
        }
    }

    const onMousemove = () => {
        showControl();
    };

    const onKeydown = (e:KeyboardEvent) => {

        if(e.ctrlKey && e.key === "r") e.preventDefault();

        if(e.key === "F5") return window.api.send("reload", {});

        if(e.key === "ArrowRight"){

            showControl();

            if(e.shiftKey){
                changeCurrentTime($appState.media.seekSpeed)
            }else{
                playFoward(Buttons.left);
            }

            return
        }

        if(e.key === "ArrowLeft"){

            showControl();

            if(e.shiftKey){
                changeCurrentTime(-$appState.media.seekSpeed)
            }else{
                playBackward(Buttons.left);
            }

            return
        }

        if(e.key === "ArrowUp"){
            showControl();
            updateVolume($appState.media.videoVolume + 0.01)
            return
        }

        if(e.key === "ArrowDown"){
            showControl();
            updateVolume($appState.media.videoVolume - 0.01)
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

    };

    const onResize = () => {
        changeVideoSize()
    };

    const onContextMenu = (e:MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        window.api.send("open-player-context", {})
    }

    onMount(() => {

        window.api.receive("ready", prepare)
        window.api.receive("load-file", load)
        window.api.receive("toggle-play", togglePlay)
        window.api.receive("change-display-mode", onChangeDisplayMode)
        window.api.receive("restart", initPlayer)
        window.api.receive("before-trash", beforeDelete)
        window.api.receive("before-rename", beforeRename)
        window.api.receive("after-toggle-maximize", onWindowSizeChanged)
        window.api.receive("toggle-convert", toggleConvert)
        window.api.receive("change-playback-speed", changePlaybackSpeed)
        window.api.receive("change-seek-speed", changeSeekSpeed);
        window.api.receive("toggle-fullscreen", toggleFullscreen)
        window.api.receive("capture-media", captureMedia)
        window.api.receive("picture-in-picture", requestPIP)
        window.api.receive("log", data => console.log(data.log))

        return () => {

            window.api.removeAllListeners("ready")
            window.api.removeAllListeners("load-file")
            window.api.removeAllListeners("toggle-play")
            window.api.removeAllListeners("change-display-mode")
            window.api.removeAllListeners("restart")
            window.api.removeAllListeners("before-trash")
            window.api.removeAllListeners("before-rename")
            window.api.removeAllListeners("after-toggle-maximize")
            window.api.removeAllListeners("toggle-convert")
            window.api.removeAllListeners("change-playback-speed")
            window.api.removeAllListeners("change-seek-speed")
            window.api.removeAllListeners("toggle-fullscreen")
            window.api.removeAllListeners("capture-media")
            window.api.removeAllListeners("picture-in-picture")
            window.api.removeAllListeners("log")
        }
    })
</script>

<svelte:window on:keydown={onKeydown} on:resize={onResize}/>
<svelte:document on:mousemove={onMousemove}/>

<div class="viewport" class:full-screen={$appState.isFullScreen} class:loaded={$appState.loaded} class:autohide={$appState.autohide}>

    <div class="title-bar">
        <div class="icon-area">
            <img class="ico" src={icon} alt=""/>
            <span>{APP_NAME}</span>
        </div>
        <div class="title">{$appState.currentFile.name}</div>
        <div class="window-area">
            <div class="minimize" on:click={minimize} on:keydown={handleKeyEvent} role="button" tabindex="-1">&minus;</div>
            <div class="maximize" on:click={toggleMaximize} on:keydown={handleKeyEvent} role="button" tabindex="-1">
                <div class:minbtn={$appState.isMaximized} class:maxbtn={!$appState.isMaximized}></div>
            </div>
            <div class="close" on:click={close} on:keydown={handleKeyEvent} role="button" tabindex="-1">&times;</div>
        </div>
    </div>

    <div bind:this={container} class="video-container" on:dragover={e => e.preventDefault()} on:drop={onFileDrop} on:dblclick={togglePlay} on:contextmenu={onContextMenu} role="button" tabindex="-1">
        <video
            bind:this={video}
            class="video"
            src={$appState.currentFile.src}
            on:loadeddata={onMediaLoaded}
            on:ended={() => changeFile(FORWARD)}
            on:timeupdate={onTimeUpdate}
            on:play={onPlayed}
            on:pause={onPaused}
            on:contextmenu={onContextMenu}
            muted={$appState.media.mute}
        />
    </div>

    <Footer
        playing={$appState.playing}
        converting={$appState.converting}
        media={$appState.media}
        onMouseEnter={showControl}
        onUpdateTime={updateTime}
        onUpdateVolume={updateVolume}
        onUpdateAmpLevel={updateAmpLevel}
        onClickPlay={togglePlay}
        onClickStop={stop}
        onClickPrevious={playBackward}
        onClickNext={playFoward}
        onClickMute={toggleMute}
        t={t}
    />

</div>
