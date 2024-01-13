import { writable } from "svelte/store";

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

type DragState = {
    dragging:boolean;
    dir:string;
    startId:string;
    targetId:string;
}

type AppState = {
    playlingItemId:string;
    selection:Mp.PlaylistItemSelection;
    shuffle:boolean;
    sortType:Mp.SortType;
    files:Mp.MediaFile[];
    updateType: Mp.PlaylistChangeEventType;
    preventBlur:boolean;
    rename:RenameState;
    dragState:DragState;
}

export const initialAppState : AppState = {
    playlingItemId:"",
    selection:{selectedId:"", selectedIds:[]},
    shuffle:false,
    sortType:{order:"NameAsc", groupBy:false},
    files:[],
    updateType:"Append",
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
    },
    dragState:{
        dragging:false,
        dir:"",
        startId:"",
        targetId:"",
    }
}

type AppAction =
| {type: "playlingItemId", value: string}
| {type: "clear"}
| {type: "selectedId", value: string}
| {type: "setSelectedIds", value: string[]}
| {type: "replaceSelectedIds", value: {id:string,index:number}}
| {type: "clearSelection"}
| {type: "updatSelectedIds", value:string[]}
| {type: "updateSelection", value:Mp.PlaylistItemSelection}
| {type: "sortType", value:Mp.SortType}
| {type: "files", value:{files:Mp.MediaFile[], type:Mp.PlaylistChangeEventType}}
| {type: "startRename", value:{rect:RenamePartialRect, value:string}}
| {type: "endRename"}
| {type: "preventBlur", value: boolean}
| {type: "toggleShuffle"}
| {type: "rename", value:{name:string, id:string}}
| {type: "udpateName", value:string}
| {type: "startDrag", value:{startId:string, dir:string}}
| {type: "drag", value:string}
| {type: "endDrag"}

const updater = (state:AppState, action:AppAction) => {

    switch (action.type) {
        case "playlingItemId":
            return {...state, playlingItemId:action.value}

        case "clear":
            return {...state,
                playlingItemId: "",
                files:[],
                updateType:"Append" as Mp.PlaylistChangeEventType,
                selection:{...state.selection, selectedId:"", selectedIds:[]},
            }

        case "selectedId":
            return {...state, selection:{...state.selection, selectedId:action.value}}

        case "setSelectedIds":
            return {...state, selection:{...state.selection, selectedIds:action.value}}

        case "replaceSelectedIds": {
            const selectedIds = [...state.selection.selectedIds];
            selectedIds[action.value.index] = action.value.id;
            return {...state, selection:{...state.selection, selectedIds}};
        }

        case "clearSelection":
            return {...state, selection:{...state.selection, selectedId:"", selectedIds:[]}}

        case "updatSelectedIds":
            return {...state, selection:{...state.selection, selectedIds:[...state.selection.selectedIds, ...action.value]}};

        case "updateSelection":
            return {...state, selection:{...state.selection, selectedId:action.value.selectedId, selectedIds:action.value.selectedIds}};

        case "sortType":
            return {...state, sortType:action.value}

        case "files":
            return {...state, files:action.value.files, updateType:action.value.type}

        case "startRename":
            return {...state, rename:{...state.rename, renaming:true, rect:action.value.rect, inputValue:action.value.value}}

        case "udpateName":
            return {...state, rename:{...state.rename, inputValue:action.value}}

        case "rename":{
            const files = [...state.files]
            const target = files.find(file => file.id == action.value.id)
            if(target){
                target.name = action.value.name
            }

            return {...state, files}
        }

        case "endRename":
            return {...state, rename:{...state.rename, renaming:false}}

        case "startDrag":
            return {...state, dragState:{...state.dragState, dragging:true, startId:action.value.startId, dir:action.value.dir}}

        case "drag":
            return {...state, dragState:{...state.dragState, targetId:action.value}}

        case "endDrag":
            return {...state, dragState:{...state.dragState, dragging:false, startId:"", dir:"", targetId:""}}

        case "preventBlur":
            return {...state, preventBlur:action.value}

        case "toggleShuffle":
            return {...state, shuffle:!state.shuffle}

        default:
            return state;
    }
}

const store = writable(initialAppState);

export const dispatch = (action:AppAction) => {
    store.update(state => updater(state, action));
}

export const appState = store
