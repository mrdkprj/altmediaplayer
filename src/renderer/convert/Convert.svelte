<script lang="ts">
    import { onMount } from "svelte";
    import RadioGroup from "./RadioGroup.svelte";
    import { AudioExtensions, VideoExtensions } from "../../constants";
    import { reducer, initialAppState } from "./appStateReducer";
    import { t, lang } from "../../translation/useTranslation";

    const { appState, dispatch } = reducer(initialAppState);

    const beforeOpen = (e: Mp.OpenConvertDialogEvent) => {
        if (!$appState.converting && e.opener == "user") {
            changeSourceFile(e.file);
        }
    };

    const changeSourceFile = (file: Mp.MediaFile) => {
        dispatch({ type: "sourceFile", value: file.fullPath });
        const format = AudioExtensions.includes(file.extension) ? "MP3" : "MP4";
        dispatch({ type: "format", value: format });
    };

    const closeDialog = () => {
        window.api.send("close-convert", {});
    };

    const lock = () => {
        dispatch({ type: "converting", value: true });
        document.querySelectorAll("input").forEach((element) => (element.disabled = true));
    };

    const unlock = () => {
        dispatch({ type: "converting", value: false });
        document.querySelectorAll("input").forEach((element) => (element.disabled = false));
    };

    const requestConvert = () => {
        if (!$appState.sourceFile) return;

        lock();

        const args: Mp.ConvertRequest = {
            sourcePath: $appState.sourceFile,
            convertFormat: $appState.convertFormat,
            options: {
                frameSize: $appState.frameSize,
                audioBitrate: $appState.audioBitrate,
                rotation: $appState.rotation,
                audioVolume: $appState.audioVolume,
                maxAudioVolume: $appState.maxVolume,
            },
        };

        window.api.send("request-convert", args);
    };

    const requestCancelConvert = () => {
        window.api.send("request-cancel-convert", {});
    };

    const onAfterConvert = () => unlock();

    const onSourceFileSelect = (data: Mp.FileSelectResult) => {
        if (VideoExtensions.concat(AudioExtensions).includes(data.file.extension)) {
            changeSourceFile(data.file);
        } else {
            window.api.send("error", { message: $t("unsupportedMedia") });
        }
    };

    const onChangeFormat = (e: Mp.RadioGroupChangeEvent<Mp.ConvertFormat>) => {
        dispatch({ type: "convertFormat", value: e.value });
    };

    const onChangeAudioBitrate = (e: Mp.RadioGroupChangeEvent<Mp.AudioBitrate>) => {
        dispatch({ type: "audioBitrate", value: e.value });
    };

    const onChangeRotation = (e: Mp.RadioGroupChangeEvent<Mp.VideoRotation>) => {
        dispatch({ type: "rotation", value: e.value });
    };

    const onMaxVolumeChange = (e: Event) => {
        dispatch({ type: "maxVolume", value: (e.target as HTMLInputElement).checked });
    };

    const onVolumeChange = (e: Event) => {
        dispatch({ type: "audioVolume", value: (e.target as HTMLInputElement).value });
    };

    const onFrameSizeChange = (e: Mp.RadioGroupChangeEvent<Mp.VideoFrameSize>) => {
        dispatch({ type: "frameSize", value: e.value });
    };

    const openDialog = () => {
        window.api.send("open-convert-sourcefile-dialog", { fullPath: $appState.sourceFile });
    };

    const onKeydown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            window.api.send("close-convert", {});
        }
    };

    const prepare = (e: Mp.ReadyEvent) => {
        $lang = e.settings.locale.lang;
    };

    onMount(() => {
        window.api.receive("ready", prepare);
        window.api.receive("open-convert", beforeOpen);
        window.api.receive("after-convert", onAfterConvert);
        window.api.receive("after-sourcefile-select", onSourceFileSelect);

        return () => {
            window.api.removeAllListeners("open-convert");
            window.api.removeAllListeners("after-convert");
            window.api.removeAllListeners("after-sourcefile-select");
        };
    });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="viewport">
    <div class="title-bar">
        <div class="close-btn" on:click={closeDialog} on:keydown={onKeydown} role="button" tabindex="-1">&times;</div>
    </div>
    <div class="convert-viewport">
        <div class="container">
            <div class="option-label">{$t("inputFile")}</div>
            <div class="option-area">
                <div class="text">
                    <input type="text" class="source-file-input" readonly value={$appState.sourceFile} />
                    <div class="btn" on:click={openDialog} on:keydown={onKeydown} role="button" tabindex="-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                            <path
                                d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5V6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5zM14 7H2v5.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V7z"
                            />
                        </svg>
                    </div>
                </div>
            </div>
            <div class="option-label">{$t("convertFormat")}</div>
            <div class="option-area">
                <RadioGroup
                    options={["MP4", "MP3"]}
                    labels={["MP4", "MP3"]}
                    name="format"
                    checkedOption={$appState.convertFormat}
                    onChange={onChangeFormat}
                    disableIf={{ condition: $appState.sourceFileFormat == "MP3", target: "MP4" }}
                />
            </div>
            {#if $appState.convertFormat == "MP4"}
                <div class="video-options">
                    <div class="option-label">{$t("frameSize")}</div>
                    <div class="option-area">
                        <RadioGroup
                            options={["SizeNone", "360p", "480p", "720p", "1080p"]}
                            labels={["None", "360p", "480p", "480p", "720p", "1080p"]}
                            name="framesize"
                            checkedOption={$appState.frameSize}
                            onChange={onFrameSizeChange}
                        />
                    </div>
                    <div class="option-label">{$t("videoRotation")}</div>
                    <div class="option-area">
                        <RadioGroup
                            options={["RotationNone", "90Clockwise", "90CounterClockwise"]}
                            labels={["None", "+90", "-90"]}
                            name="rotation"
                            checkedOption={$appState.rotation}
                            onChange={onChangeRotation}
                        />
                    </div>
                </div>
            {/if}
            <div class="audio-options">
                <div class="option-label">{$t("audioBitrate")}</div>
                <div class="option-area">
                    <RadioGroup
                        options={["BitrateNone", "128", "160", "192", "320"]}
                        labels={["None", "128", "160", "192", "320"]}
                        name="audioBitrate"
                        checkedOption={$appState.audioBitrate}
                        onChange={onChangeAudioBitrate}
                    />
                </div>
                <div class="option-label">{$t("volume")}<label><input type="checkbox" class="max-volume" on:change={onMaxVolumeChange} />{$t("maximizeVolue")}</label></div>
                <div class="option-area">
                    <input type="range" min="1" max="5" step="0.5" value={$appState.audioVolume} on:change={onVolumeChange} disabled={$appState.maxVolume} />
                    <span id="volumeLabel">{`${parseFloat($appState.audioVolume) * 100}%`}</span>
                </div>
            </div>

            <div class="button">
                <button disabled={$appState.converting} on:click={requestConvert}>{$t("start")}</button>
                <button disabled={!$appState.converting} on:click={requestCancelConvert}>{$t("cancel")}</button>
                <button on:click={closeDialog}>{$t("close")}</button>
            </div>
        </div>
    </div>
</div>
