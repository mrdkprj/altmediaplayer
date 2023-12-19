import { useState, useRef, useEffect, useCallback } from "react";

type SliderProps = {
    sliderClass: string[];
    trackValueClass?:string[];
    thumbType: "dot" | "lever";
    onSlide:(progress:number) => void;
    displayFormatter?:(progress:number) => string;
    onTooltip?:(progress:number) => string;
    max?:number;
    value:number;
    valuePosition:"left" | "right"
    offSet?:number
}

type SliderRect = {
    top:number;
    bottom:number;
    left:number;
    width:number;
}

type TooltipState = {
    visible:boolean;
    text:string;
    top:number;
    left:number;
}

const THUM_WIDTH = 8;

export const Slider = (props:SliderProps) => {

    const [sliding, setSliding] = useState<boolean>(false);
    //const [value, setValue] = useState<number>(props.value);
    const [rect, setRect] = useState<SliderRect>({top:0, left:0, bottom:0, width:0})
    const [toolTip, setTooltip] = useState<TooltipState>({visible:false, text:"", top:0, left:0})
    const slider = useRef<HTMLDivElement>(null);
    const startX = useRef(0);

    const startSlide = (e:React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setSliding(true)
        startX.current = e.clientX
    }

    const moveSlider = useCallback((e:MouseEvent) => {

        if(!sliding || e.clientX == startX.current) return;

        if(!slider.current) return;

        const rect = slider.current.getBoundingClientRect();
        const progress = (e.clientX - rect.left) / rect.width

        if(progress > 1 || progress < 0) return;

        props.onSlide(progress)

    },[props, sliding])

    const endSlide = useCallback((e:MouseEvent) => {
        if(sliding){
            e.preventDefault();
            e.stopPropagation();
            setSliding(false)
        }
    },[sliding])

    const onTrackMousedown = (e:React.MouseEvent) => {

        const offset = props.offSet ? props.offSet : 0;
        const progress = (e.nativeEvent.offsetX - offset) / rect.width;

        props.onSlide(progress)

    }

    const showTooltip = (e:React.MouseEvent) => {

        if(!props.onTooltip) return;

        const progress = (e.clientX - rect.left) / rect.width;
        const text = props.onTooltip(progress);

        if(!text) return hideTooltip();

        setTooltip({visible:true, text, top:rect.bottom + 10, left:e.clientX + 15})
    }

    const hideTooltip = () => {

        if(!props.onTooltip) return;

        setTooltip({...toolTip, visible:false, text:""})

    }

    const getRate = () => {
        if(props.max){
            return `${(props.value / props.max) * 100}%`;
        }

        return `${Math.floor(props.value * 100)}%`;
    }

    useEffect(() => {

        //setValue(props.value);

        if(slider.current){
            const {top, bottom, left, width} = slider.current.getBoundingClientRect()
            setRect({top, bottom, left, width})
        }
        document.addEventListener("mousemove", moveSlider)
        document.addEventListener("mouseup", endSlide)

        return () => {
            document.removeEventListener("mousemove", moveSlider)
            document.removeEventListener("mouseup", endSlide)
        }
    },[endSlide, moveSlider])

    return (
        <>
            {toolTip.visible &&
                <div className="tooltip" style={{left:toolTip.left, top:toolTip.top}}>{toolTip.text}</div>
            }
            {props.valuePosition === "left" &&
                <div className={`track-value ${props.trackValueClass?.join(" ")}`}>{props.displayFormatter ? props.displayFormatter(props.value) : getRate()}</div>
            }
            <div className={`slider ${props.sliderClass.join(" ")} ${sliding ? "sliding" : ""}`} ref={slider} onMouseDown={onTrackMousedown} onMouseEnter={showTooltip} onMouseMove={showTooltip} onMouseLeave={hideTooltip}>
                <div className="track" style={{width:getRate()}}></div>
                <div className={`thumb ${props.thumbType === "lever" ? "lever" : ""}`} style={{left:`max(${getRate()} - ${THUM_WIDTH}px, 0px)`}} onMouseDown={startSlide} title={props.onTooltip ? "" : getRate()}></div>
            </div>
            {props.valuePosition === "right"  &&
                <div className={`track-value ${props.trackValueClass?.join(" ")}`}>{props.displayFormatter ? props.displayFormatter(props.value) : getRate()}</div>
            }
        </>
    )
}