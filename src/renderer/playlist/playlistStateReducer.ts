type RenamePartialRect = {
    top:number;
    left:number;
    height:number;
    width:number;
}

type RenameState = {
    renaming:boolean;
    inputValue:string;
    rect:RenamePartialRect;
}

type AppState = {
    playlingItemId:string;
    selection:Mp.PlaylistItemSelection;
    shuffle:boolean;
    sortType:Mp.SortType;
    files:Mp.MediaFile[];
    preventBlur:boolean;
    rename:RenameState;
}

export const initialAppState : AppState = {
    playlingItemId:"",
    selection:{selectedId:"", selectedIds:[]},
    shuffle:false,
    sortType:{order:"NameAsc", groupBy:false},
    files:[],
    preventBlur:false,
    rename:{
        renaming:false,
        inputValue:"",
        rect:{
            top:0,
            left:0,
            width:0,
            height:0,
        }
    }
}

type AppAction = {
    type: "playlingItemId";
    value: string;
} | {
    type: "selectedId";
    value: string;
} | {
    type: "setSelectedIds";
    value: string[];
} | {
    type: "replaceSelectedIds";
    value: {
        id:string;
        index:number;
    }
} | {
    type: "appendSelectedIds";
    value: string;
} | {
    type: "clearSelection";
} | {
    type: "updateSelection";
    value:Mp.PlaylistItemSelection;
} | {
    type: "sortType";
    value:Mp.SortType;
} | {
    type: "files";
    value:Mp.MediaFile[];
} | {
    type: "startRename";
    value:{
        rect:RenamePartialRect;
        value:string;
    };
} | {
    type: "endRename";
} | {
    type: "preventBlur";
    value: boolean;
} | {
    type: "toggleShuffle";
} | {
    type: "udpateName";
    value:string;
}

export const reducer = (state: AppState, action: AppAction): AppState => {

    switch (action.type) {
        case "playlingItemId":
            return {...state, playlingItemId:action.value};

        case "selectedId":
            return {...state, selection:{...state.selection, selectedId:action.value}};

        case "setSelectedIds":
            return {...state, selection:{...state.selection, selectedIds:action.value}};

        case "replaceSelectedIds": {
            const selectedIds = [...state.selection.selectedIds];
            selectedIds[action.value.index] = action.value.id;
            return {...state, selection:{...state.selection, selectedIds}};
        }
        case "clearSelection":
            return {...state, selection:{...state.selection, selectedId:"", selectedIds:[]}};

        case "updateSelection":{
            if(action.value.selectedId){
                return {...state, selection:{...state.selection, selectedId:action.value.selectedId, selectedIds:action.value.selectedIds}};
            }else{
                return {...state, selection:{...state.selection, selectedIds:action.value.selectedIds}};
            }
        }

        case "sortType":
            return {...state, sortType:action.value};

        case "files":
            return {...state, files:action.value};

        case "startRename":
            return {...state, rename:{...state.rename, renaming:true, rect:action.value.rect, inputValue:action.value.value}};

        case "udpateName":
            return {...state, rename:{...state.rename, inputValue:action.value}};

        case "endRename":
            return {...state, rename:{...state.rename, renaming:false}};

        case "preventBlur":
            return {...state, preventBlur:action.value};

        case "toggleShuffle":
            return {...state, shuffle:!state.shuffle};

        default:
            return state;
    }
};

