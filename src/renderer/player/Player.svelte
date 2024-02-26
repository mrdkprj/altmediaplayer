<script lang="ts">

    import { onMount } from "svelte";
    import { appState, dispatch } from "./appStateReducer";
    import { t, lang } from "../../translation/useTranslation"

    import { FORWARD, BACKWARD, APP_NAME, Buttons, handleKeyEvent } from "../../constants";
    import { getDropFiles } from "../fileDropHandler";
    import { handleShortcut } from "../shortcut";
    import Footer from "./Footer.svelte";
    import icon from "../../assets/icon.ico"

    let video:HTMLVideoElement
    let container:HTMLDivElement
    let hideControlTimeout:number | null
    let afterReleaseCallback:(() => void) | undefined;

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

        window.api.send("media-state-change", $appState.media)
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

        window.api.send("media-state-change", $appState.media)

        gainNode.gain.value = ampLevel * 10;

    }

    const toggleMute = () => {
        dispatch({type:"mute", value:!$appState.media.mute})
        window.api.send("media-state-change", $appState.media)
    }

    const onFileDrop = (e:DragEvent) => {

        const files = getDropFiles(e)

        if(files.length){
            window.api.send("drop", {files, renderer:"Player"})
        }
    }

    const initPlayer = () => {
        dispatch({type:"init"})
        video.load();
    }

    const loadMedia = (e:Mp.FileLoadEvent) => {

        dispatch({type:"currentFile", value:e.currentFile})
        dispatch({type:"playStatus", value:e.status})
        dispatch({type:"currentTime", value:0})
        dispatch({type:"startFrom", value:e.startFrom})

        video.autoplay = e.status == "playing"
        video.muted = $appState.media.mute;
        video.playbackRate = $appState.media.playbackSpeed

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

    const onLoadError = () => {

        dispatch({type:"loaded", value:false})
        dispatch({type:"playStatus", value:"stopped"})

        document.title = `${APP_NAME} - ${$appState.currentFile.name}`

        dispatch({type:"videoDuration", value:0})

        video.autoplay = false;

        window.api.send("error", {message:$t("unsupportedMedia")})
    }

    const onEmptied = () => {

        if(!afterReleaseCallback) return

        afterReleaseCallback();
        afterReleaseCallback = undefined;

    }

    const releaseFile = (data:Mp.ReleaseFileRequest) => {

        if(data.fileIds.includes($appState.currentFile.id)){
            const currentTime = $appState.media.currentTime;
            initPlayer();
            afterReleaseCallback = () => window.api.send("file-released", {currentTime})
        }else{
            window.api.send("file-released", {currentTime:0})
        }

    }

    const changeVideoSize = (config?:Mp.Settings) => {

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

        if(button === Buttons.left){
            changeCurrentTime($appState.media.seekSpeed);
        }

        if(button === Buttons.right){
            changeFile(FORWARD)
        }

    }

    const playBackward = (button:number) => {

        if(!$appState.loaded) return;

        if(button === Buttons.left){
            changeCurrentTime(-$appState.media.seekSpeed)
        }

        if(button === Buttons.right){
            changeFile(BACKWARD)
        }

    }

    const changeFile = (index:number) => {
        window.api.send("load-file", {index, isAbsolute:false})
    }

    const togglePlay = async () => {

        if(!$appState.loaded) return;

        if(video.paused){
            await video.play();
        }else{
            video.pause();
        }

    }

    const onPlayed = () => {
        window.api.send("play-status-change", {status:"playing"})
        dispatch({type:"playStatus", value:"playing"})
    }

    const onPaused = () => {

        if(video.currentTime == video.duration) return;

        window.api.send("play-status-change", {status:"paused"})
        dispatch({type:"playStatus", value:"paused"})
    }

    const stop = () => {

        if(!$appState.loaded) return;

        window.api.send("play-status-change", {status:"stopped"})
        dispatch({type:"playStatus", value:"stopped"})
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

    const minimize = () => {
        window.api.send("minimize", {})
    }

    const toggleMaximize = () => {
        window.api.send("toggle-maximize", {})
        dispatch({type:"isMaximized", value:!$appState.isMaximized})
    }

    const onWindowSizeChanged = (e:Mp.SettingsChangeEvent) => {
        dispatch({type:"isMaximized", value:e.settings.isMaximized})
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

    const onChangeDisplayMode = (e:Mp.SettingsChangeEvent) => {
        dispatch({type:"fitToWindow", value:e.settings.video.fitToWindow})
        changeVideoSize(e.settings);
    }

    const close = () => {
        window.api.send("close", {});
    }

    const prepare = (e:Mp.ReadyEvent) => {

        $lang = e.settings.locale.lang;

        dispatch({type:"isMaximized", value:e.settings.isMaximized})

        updateVolume(e.settings.audio.volume);
        updateAmpLevel(e.settings.audio.ampLevel)

        dispatch({type:"mute", value:e.settings.audio.mute})

        dispatch({type:"fitToWindow", value:e.settings.video.fitToWindow})
        dispatch({type:"playbackSpeed", value:e.settings.video.playbackSpeed})
        dispatch({type:"seekSpeed", value:e.settings.video.seekSpeed})

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

            if(e.shiftKey){
                updateAmpLevel($appState.media.ampLevel + 0.01)
            }else{
                updateVolume($appState.media.videoVolume + 0.01)
            }

            return
        }

        if(e.key === "ArrowDown"){

            showControl();

            if(e.shiftKey){
                updateAmpLevel($appState.media.ampLevel - 0.01)
            }else{
                updateVolume($appState.media.videoVolume - 0.01)
            }

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
        window.api.receive("release-file", releaseFile)
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
    })
</script>

<svelte:window on:keydown={onKeydown} on:resize={onResize}/>
<svelte:document on:mousemove={onMousemove}/>

<div class="player-viewport" class:full-screen={$appState.isFullScreen} class:loaded={$appState.loaded} class:autohide={$appState.autohide}>

    <div class="player-title-bar">
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
            on:emptied={onEmptied}
            on:error={onLoadError}
            muted={$appState.media.mute}
        />
    </div>

    <Footer
        onMouseEnter={showControl}
        onUpdateTime={updateTime}
        onUpdateVolume={updateVolume}
        onUpdateAmpLevel={updateAmpLevel}
        onClickPlay={togglePlay}
        onClickStop={stop}
        onClickPrevious={playBackward}
        onClickNext={playFoward}
        onClickMute={toggleMute}
        t={$t}
    />

</div>
