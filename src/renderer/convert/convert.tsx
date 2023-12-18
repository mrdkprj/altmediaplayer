import { useCallback, useEffect, useReducer, useState } from "react";
import { AudioExtentions } from "../../constants";
import { RadioGroup, RadioGroupChangeEvent } from "./radioGroup";
import { reducer, initialAppState } from "./appStateReducer";
import { useTranslation } from "../../translation/useTranslation";

const Convert = () => {

    const [appState, dispatchAppState] = useReducer(reducer, initialAppState);
    const [lang, setlang] = useState<Mp.Lang>("en");

    const t = useTranslation(lang);

    const beforeOpen = useCallback((data:Mp.OpenConvertDialogEvent) => {

        if(!appState.converting){
            changeSourceFile(data.file)
        }

    },[appState.converting]);

    const changeSourceFile = (file:Mp.MediaFile) => {
        dispatchAppState({type:"sourceFile", value:file.fullPath})
        const format = AudioExtentions.includes(file.extension) ? "MP3" : "MP4"
        dispatchAppState({type:"format", value:format})
    }

    const closeDialog = () => {
        window.api.send("close-convert", {})
    }

    const lock = () => {
        dispatchAppState({type:"converting", value:true})
        document.querySelectorAll("input").forEach(element => element.disabled = true)
     }

    const unlock = () => {
        dispatchAppState({type:"converting", value:false})
        document.querySelectorAll("input").forEach(element => element.disabled = false)
    }

    const requestConvert = () => {

        lock();

        const args:Mp.ConvertRequest = {
            sourcePath:appState.sourceFile,
            convertFormat:appState.convertFormat,
            options: {
                frameSize:appState.frameSize,
                audioBitrate:appState.audioBitrate,
                rotation:appState.rotation,
                audioVolume:appState.audioVolume,
                maxAudioVolume:appState.maxVolume
            }
        }

        window.api.send("request-convert", args)
    }

    const requestCancelConvert = () => {
        window.api.send("request-cancel-convert", {})
    }

    const onAfterConvert = useCallback(() => unlock(), []);

    const onSourceFileSelect = useCallback((data:Mp.FileSelectResult) => {

        changeSourceFile(data.file);

    },[])

    const onChangeFormat = (e:RadioGroupChangeEvent<Mp.ConvertFormat>) => {
        dispatchAppState({type:"convertFormat", value:e.value})
    }

    const onChangeAudioBitrate = (e:RadioGroupChangeEvent<Mp.AudioBitrate>) => {
        dispatchAppState({type:"audioBitrate", value:e.value})
    }

    const onChangeRotation = (e:RadioGroupChangeEvent<Mp.VideoRotation>) => {
        dispatchAppState({type:"rotation", value:e.value})
    }

    const onMaxVolumeChange = (e:React.ChangeEvent<HTMLInputElement>) => {
        dispatchAppState({type:"maxVolume", value:e.currentTarget.checked})
    }

    const onVolumeChange = (e:React.ChangeEvent<HTMLInputElement>) => {
        dispatchAppState({type:"audioVolume", value:e.currentTarget.value})
    }

    const onFrameSizeChange = (e:RadioGroupChangeEvent<Mp.VideoFrameSize>) => {
        dispatchAppState({type:"frameSize", value:e.value})
    }

    const openDialog = () => {
        window.api.send("open-convert-sourcefile-dialog", {fullPath:appState.sourceFile})
    }

    const onKeydown = (e:KeyboardEvent) => {
        if(e.key === "Escape"){
            window.api.send("close-convert", {})
        }
    }

    const prepare = (e:Mp.ReadyEvent) => {
        setlang(e.config.lang);
    }

    useEffect(() => {

        window.api.receive("ready", prepare);
        window.api.receive("open-convert", beforeOpen)
        window.api.receive("after-convert", onAfterConvert)
        window.api.receive("after-sourcefile-select", onSourceFileSelect)

        window.addEventListener("keydown", onKeydown)

        return () => {
            window.api.removeAllListeners("open-convert")
            window.api.removeAllListeners("after-convert")
            window.api.removeAllListeners("after-sourcefile-select")

            window.removeEventListener("keydown", onKeydown)
        }

    },[beforeOpen, onAfterConvert, onSourceFileSelect])

    return (
        <div className="convert">
            <div className="convert-title-bar">
                <div className="convert-close-btn" onClick={closeDialog}>&times;</div>
            </div>
            <div className="convert-viewport">
                <div className="container">
                    <div className="option-label">{t("inputFile")}</div>
                    <div className="option-area">
                        <div className="text">
                            <input type="text" className="source-file-input" readOnly value={appState.sourceFile}/>
                            <div className="btn" onClick={openDialog}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5V6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5zM14 7H2v5.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V7z"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="option-label">{t("convertFormat")}</div>
                    <div className="option-area">
                        <RadioGroup<Mp.ConvertFormat>
                            options={["MP4","MP3"]}
                            labels={["MP4", "MP3"]}
                            name="format"
                            checkedOption={appState.convertFormat}
                            onChange={onChangeFormat}
                            disableIf={{condition:appState.sourceFileFormat == "MP3", target:"MP4"}}
                        />
                    </div>
                    {appState.convertFormat == "MP4" &&
                        <div className="video-options">
                            <div className="option-label">{t("frameSize")}</div>
                            <div className="option-area">
                                <RadioGroup<Mp.VideoFrameSize>
                                    options={["SizeNone","360p","480p","720p","1080p"]}
                                    labels={["None", "360p", "480p", "480p", "720p", "1080p"]}
                                    name="framesize"
                                    checkedOption={appState.frameSize}
                                    onChange={onFrameSizeChange}
                                />
                            </div>
                            <div className="option-label">{t("videoRotation")}</div>
                            <div className="option-area">
                                <RadioGroup<Mp.VideoRotation>
                                    options={["RotationNone", "90Clockwise", "90CounterClockwise"]}
                                    labels={["None", "+90", "-90"]}
                                    name="rotation"
                                    checkedOption={appState.rotation}
                                    onChange={onChangeRotation}
                                />
                            </div>
                        </div>
                    }
                    <div className="audio-options">
                        <div className="option-label">{t("audioBitrate")}</div>
                        <div className="option-area">
                            <RadioGroup<Mp.AudioBitrate>
                                options={["BitrateNone","128", "160", "192", "320"]}
                                labels={["None", "128", "160", "192", "320"]}
                                name="audioBitrate"
                                checkedOption={appState.audioBitrate}
                                onChange={onChangeAudioBitrate}
                            />
                        </div>
                        <div className="option-label">{t("volume")}<label><input type="checkbox" className="max-volume" onChange={onMaxVolumeChange}/>{t("maximizeVolue")}</label></div>
                        <div className="option-area">
                            <input type="range" min="1" max="5" step="0.5" value={appState.audioVolume} onChange={onVolumeChange} disabled={appState.maxVolume}/>
                            <span id="volumeLabel">{`${parseFloat(appState.audioVolume) * 100}%`}</span>
                        </div>
                    </div>

                    <div className="button">
                        <button disabled={appState.converting} onClick={requestConvert}>{t("start")}</button>
                        <button disabled={!appState.converting} onClick={requestCancelConvert}>{t("cancel")}</button>
                        <button onClick={closeDialog}>{t("close")}</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Convert;