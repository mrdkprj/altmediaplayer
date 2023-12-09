import { useState, useEffect, useCallback } from "react";
import { en } from "./en";
import { ja } from "./ja";

export const useTranslation = (lang:Mp.Lang) => {

    const getTranslator = (lang:Mp.Lang) => {

        const translator = (key:keyof Mp.label) => {
            if(lang == "en"){
                return en[key]
            }else{
                return ja[key]
            }
        }

        translator.lang = lang

        return translator;
    }

    const getT = useCallback(() => {
        return getTranslator(lang)
    },[lang])

    const [t, setT] = useState(getT);

    useEffect(() => {
        setT(getT)
    },[getT])

    return t;
}
