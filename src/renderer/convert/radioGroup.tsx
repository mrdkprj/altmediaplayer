type RadioProps<T> = {
    options:T[];
    labels:string[];
    name:string;
    checkedOption?:T;
    disableIf?:{
        condition:boolean;
        target:T;
    }
    onChange:(e:RadioGroupChangeEvent<T>) => void;
}

export type RadioGroupChangeEvent<T> = {
    value:T;
}

export const RadioGroup = <T extends string | number>(props:RadioProps<T>) => {

    const onChange = (e:React.ChangeEvent<HTMLInputElement>) => {
        props.onChange({value:e.currentTarget.value as T})
    }

    return (
        props.options.map((option, index) => {
            return (
                <div className="radio" key={option}>
                    <input type="radio"
                        value={option}
                        name={props.name}
                        checked={option == props.checkedOption}
                        onChange={onChange}
                        disabled={props.disableIf ? props.disableIf.condition && option == props.disableIf.target : false}
                    />
                    <label>{props.labels[index]}</label>
                </div>
            )
        })
    )
}