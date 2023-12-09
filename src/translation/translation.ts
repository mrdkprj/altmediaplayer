import { en } from "./en";
import { ja } from "./ja";

export const translation = (lang:Mp.Lang) => {

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

    return getTranslator(lang);
}