import { writable, get } from "svelte/store";
import { en } from "./en";
import { ja } from "./ja";

export const useTranslation = (lang:Mp.Lang) => {

    const store = writable(lang);

    const t = (key:keyof Mp.label) => {

        if(get(store) == "en"){
            return en[key]
        }else{
            return ja[key]
        }
    }

    $: {
        store.set(lang)
    }

    return t;
}
