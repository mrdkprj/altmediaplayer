import { Slider } from "./slider";
import { Buttons } from "../../constants";

type FooterProps = {
    playing:boolean;
    converting:boolean;
    media:Mp.MediaState;
    onMouseEnter:() => void;
    onUpdateTime:(progress:number) => void;
    onUpdateVolume:(progress:number) => void;
    onUpdateAmpLevel:(progress:number) => void;
    onClickPlay:() => void;
    onClickStop:() => void;
    onClickPrevious:(button:number) => void;
    onClickNext:(button:number) => void;
    onClickMute:() => void;
}

const formatTime = (secondValue:number) => {
    const hours = (Math.floor(secondValue / 3600)).toString().padStart(2, "0");
    const minutes = (Math.floor(secondValue % 3600 / 60)).toString().padStart(2, "0");
    const seconds = (Math.floor(secondValue % 3600 % 60)).toString().padStart(2, "0");

    return `${hours}:${minutes}:${seconds}`;
}

export const Footer = (props:FooterProps) => {

    const getTimeTrackHoverTime = (progress:number) => {

        const time = props.media.videoDuration * progress;

        if(time <= 0) return "";

        return formatTime(time)
    }

    return (
        <div className="footer" onMouseEnter={props.onMouseEnter}>
            <div className="footer-menu">
                <div className="slider-area">
                    <div className="time-area">
                        <Slider
                            sliderClass={["time"]}
                            trackValueClass={["current-time"]}
                            thumbType="dot"
                            onSlide={props.onUpdateTime}
                            value={props.media.currentTime}
                            valuePosition="left"
                            displayFormatter={formatTime}
                            onTooltip={getTimeTrackHoverTime}
                            max={props.media.videoDuration}
                            offSet={-4}
                        />
                        <div className="track-value duration">{formatTime(props.media.videoDuration)}</div>
                    </div>
                    <div className="volume-area">
                        <Slider sliderClass={["volume"]} thumbType="dot" onSlide={props.onUpdateVolume} value={props.media.videoVolume} valuePosition="right"/>
                    </div>
                </div>
                <div className="ctrl-area">
                    <div className="btn-area">
                        <div className="btn-large" onClick={props.onClickPlay}>
                            {props.playing ?
                                <svg xmlns="http://www.w3.org/2000/svg" className="pause" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
                                </svg>
                                :
                                <svg xmlns="http://www.w3.org/2000/svg" className="play" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                                </svg>
                            }
                        </div>
                        <div className="btn" onClick={props.onClickStop}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
                            </svg>
                        </div>
                        <div className="btn" onClick={() => props.onClickPrevious(Buttons.left)} onContextMenu={() => props.onClickPrevious(Buttons.right)}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M.5 3.5A.5.5 0 0 0 0 4v8a.5.5 0 0 0 1 0V8.753l6.267 3.636c.54.313 1.233-.066 1.233-.697v-2.94l6.267 3.636c.54.314 1.233-.065 1.233-.696V4.308c0-.63-.693-1.01-1.233-.696L8.5 7.248v-2.94c0-.63-.692-1.01-1.233-.696L1 7.248V4a.5.5 0 0 0-.5-.5z"/>
                            </svg>
                        </div>
                        <div className="btn" onClick={() => props.onClickNext(Buttons.left)} onContextMenu={() => props.onClickNext(Buttons.right)}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M15.5 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V8.753l-6.267 3.636c-.54.313-1.233-.066-1.233-.697v-2.94l-6.267 3.636C.693 12.703 0 12.324 0 11.693V4.308c0-.63.693-1.01 1.233-.696L7.5 7.248v-2.94c0-.63.693-1.01 1.233-.696L15 7.248V4a.5.5 0 0 1 .5-.5z"/>
                            </svg>
                        </div>
                        <div className="btn-separator"></div>
                        {props.converting &&
                            <div className="convert-state">
                                <div className="ring">
                                    <div className="lds-dual-ring"></div>
                                </div>
                            </div>
                        }
                    </div>

                    <div className={`amp-area ${props.media.mute ? "mute" : ""}`}>
                        <div className="btn sound" onClick={props.onClickMute}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M9 4a.5.5 0 0 0-.812-.39L5.825 5.5H3.5A.5.5 0 0 0 3 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 9 12V4zm3.025 4a4.486 4.486 0 0 1-1.318 3.182L10 10.475A3.489 3.489 0 0 0 11.025 8 3.49 3.49 0 0 0 10 5.525l.707-.707A4.486 4.486 0 0 1 12.025 8z"/>
                            </svg>
                        </div>
                        <Slider sliderClass={["amp"]} thumbType="lever" onSlide={props.onUpdateAmpLevel} value={props.media.ampLevel} valuePosition="right"/>
                    </div>
                </div>
            </div>
        </div>
    )
}
