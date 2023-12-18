import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useTranslation } from "../../translation/useTranslation";
import { handleShortcut } from "../shortcut";
import { initialAppState, reducer } from "./appStateReducer";
import { List } from "./list";

const List_Item_Padding = 10;

const renameData:Mp.RenameData = {
    fileId:"",
    oldName:"",
    newName:""
}

const dragState:Mp.PlaylistDragState = {
    dragging: false,
    startElement:null,
    targetElement:null,
    startIndex: -1,
}

const undoStack:Mp.RenameData[] = []
const redoStack:Mp.RenameData[] = []

const Playlist = () => {

    const [appState, dispatchAppState] = useReducer(reducer, initialAppState);
    const fileListContainer = useRef<HTMLDivElement>(null)

    const [lang, setlang] = useState<Mp.Lang>("en");

    const t = useTranslation(lang);

    const onContextMenu = (e:MouseEvent) => {
        e.preventDefault()
        window.api.send("open-playlist-context", {})
    }

    const onRenameInputKeyDown = (e:React.KeyboardEvent<HTMLInputElement>) => {
        if(appState.rename.renaming && e.key === "Enter"){
            e.stopPropagation();
            e.preventDefault();
            endEditFileName();
        }
    }

    const openSorttMenu = (e:React.MouseEvent) => {
        window.api.send("open-sort-context", {x:e.clientX, y:e.clientY})
    }

    const onMouseDown = (e:React.MouseEvent<HTMLDivElement>) => {

        if(!e.target || !(e.target instanceof HTMLElement)) return;

        if(e.target.classList.contains("playlist-item")){

            if(e.button === 2 && appState.selection.selectedIds.length > 1){
                if(appState.selection.selectedIds.includes(e.target.id)){
                    return;
                }
            }

            return toggleSelect(e)
        }

        if(!e.currentTarget.classList.contains("group") && appState.selection.selectedIds.length){
            clearSelection();
        }

    }

    const onDragStart = (e:React.DragEvent) => {
        startDragPlaylistItem(e);
    }

    const onDragEnter = (e:React.DragEvent) => {
        if(dragState.dragging){
            toggleHighlightDropTarget(e);
        }
    }

    const onDragEnd = (e:React.DragEvent) => {
        if(dragState.dragging){
            endDragPlaylistItem(e)
        }

    }

    const onFileDrop = (e:DragEvent) => {

        if(dragState.dragging) return;

        e.preventDefault();
        e.stopPropagation();

        const items = e.dataTransfer ? e.dataTransfer.items : []

        const dropItems = Array.from(items).filter(item => {
            return item.kind === "file" && (item.type.includes("video") || item.type.includes("audio"));
        })

        if(dropItems.length){
            const files = dropItems.map(item => item.getAsFile()?.path ?? "")
            window.api.send("drop", {files, renderer:"Playlist"})
        }
    }

    const clearPlaylist = () => {
        dispatchAppState({type:"clearSelection"})
        dispatchAppState({type:"playlingItemId", value:""})
        dispatchAppState({type:"files", value:[]})
    }

    const clearSelection = useCallback(() => {

        dispatchAppState({type:"clearSelection"})
        window.api.send("playlist-item-selection-change", {selection:{selectedId:"", selectedIds:[]}})

    },[])

    const getChildIndex = useCallback((id:string | null | undefined) => {

        return appState.files.findIndex(file => file.id == id)

    },[appState.files])

    const scrollToElement = (element:HTMLElement | null) => {

        if(!element || !fileListContainer.current) return;

        const rect = element.getBoundingClientRect();
        const containerRect = fileListContainer.current.getBoundingClientRect();
        if(rect.top <= containerRect.top){
            element.scrollIntoView(true)
        }

        if(rect.bottom > containerRect.height + containerRect.top + 5){
            element.scrollIntoView(false)
        }

    }

    const removeFromPlaylist = useCallback((data:Mp.RemovePlaylistItemResult) => {

        const previousSelectedId = appState.selection.selectedId;
        const shouldRestoreSelection = appState.selection.selectedIds.length == 1;

        clearSelection();

        dispatchAppState({type:"files", value:data.files})

        if(shouldRestoreSelection){
            const selectedIndex = appState.files.findIndex(file => file.id == previousSelectedId)
            const nextId = selectedIndex == appState.files.length - 1 ? appState.files[selectedIndex - 1].id : appState.files[selectedIndex + 1].id
            dispatchAppState({type:"updateSelection", value:{selectedId:nextId, selectedIds:[nextId]}})
        }

    },[appState.files, appState.selection.selectedId, appState.selection.selectedIds.length, clearSelection])

    const startDragPlaylistItem = (e:React.DragEvent) => {
        if(!e.target || !(e.target instanceof HTMLElement)) return;

        e.stopPropagation();
        dragState.dragging = true;
        dragState.startElement = e.target;
        dragState.startIndex = getChildIndex(e.target.id)
    }

    const toggleHighlightDropTarget = (e:React.DragEvent) => {

        if(!e.target || !(e.target instanceof HTMLElement)) return;

        if(!dragState.dragging) return;

        dragState.targetElement?.classList.remove("draghover");

        if(dragState.startElement?.getAttribute("data-dir") !== e.target.getAttribute("data-dir")){
            dragState.targetElement = null;
            return;
        }

        dragState.targetElement = e.target;

        if(dragState.targetElement.id === dragState.startElement?.id) return;

        dragState.targetElement.classList.add("draghover")

    }

    const endDragPlaylistItem = (e:React.DragEvent) => {

        if(dragState.targetElement){

            const args = {
                start:dragState.startIndex,
                end:getChildIndex(dragState.targetElement.id),
                currentIndex:getChildIndex(appState.playlingItemId)
            }

            window.api.send("change-playlist-order", args);

            toggleHighlightDropTarget(e)

        }

        dragState.dragging = false;
        dragState.startElement = null;
        dragState.startIndex = -1;
        dragState.targetElement = null;
    }

    const toggleSelect = (e:React.MouseEvent<HTMLDivElement>) => {

        if(e.ctrlKey){
            selectByCtrl(e.target as HTMLElement)
            return;
        }

        if(e.shiftKey){
            selectByShift(e.target as HTMLElement);
            return
        }

        selectByClick(e.target as HTMLElement);

    }

    const select = useCallback((target:HTMLElement | string) => {

        clearSelection();

        const id = typeof target === "string" ? target : target.id;
        const selection:Mp.PlaylistItemSelection = {selectedId:id, selectedIds:[id]}
        dispatchAppState({type:"updateSelection", value:{selectedId:selection.selectedId, selectedIds:selection.selectedIds}})

        scrollToElement(document.getElementById(id))

        window.api.send("playlist-item-selection-change", {selection})

    },[clearSelection])

    const selectByClick = (target:HTMLElement) => {
        select(target);
    }

    const selectByShift = useCallback((target:HTMLElement) => {

        dispatchAppState({type:"updateSelection", value:{selectedId:"", selectedIds:[]}})

        const range = [];

        if(appState.selection.selectedId){
            range.push(getChildIndex(appState.selection.selectedId));
        }else{
            range.push(0);
        }

        range.push(getChildIndex(target.id));

        range.sort((a,b) => a - b);

        const ids:string[] = [];
        for(let i = range[0]; i <= range[1]; i++){
            ids.push(appState.files[i].id)
        }

        const selection:Mp.PlaylistItemSelection = {selectedId:appState.selection.selectedId, selectedIds:ids}
        dispatchAppState({type:"updateSelection", value:{selectedId:"", selectedIds:selection.selectedIds}})

        window.api.send("playlist-item-selection-change", {selection})

    },[appState.files, appState.selection.selectedId, getChildIndex])

    const selectByCtrl = (target:HTMLElement) => {

        if(!appState.selection.selectedId){
            selectByClick(target);
            return;
        }

        if(target.classList.contains("group")) return;

        const selection:Mp.PlaylistItemSelection = {selectedId:appState.selection.selectedId, selectedIds:[...appState.selection.selectedIds, target.id]}
        dispatchAppState({type:"updateSelection", value:{selectedId:"", selectedIds:selection.selectedIds}})

        window.api.send("playlist-item-selection-change", {selection})
    }

    const selectAll = useCallback(() => {

        clearSelection();

        const ids:string[] = appState.files.map(file => file.id);

        const selection:Mp.PlaylistItemSelection = {selectedId:appState.selection.selectedId, selectedIds:[...appState.selection.selectedIds, ...ids]}
        dispatchAppState({type:"updateSelection", value:{selectedId:"", selectedIds:selection.selectedIds}})

        window.api.send("playlist-item-selection-change", {selection})

    },[clearSelection, appState.files, appState.selection.selectedId, appState.selection.selectedIds])

    const moveSelectionByShit = useCallback((key:string) => {

        if(!appState.selection.selectedIds.length){
            select(appState.files[0].id);
        }

        const downward = appState.selection.selectedId == appState.selection.selectedIds[0];

        const currentId = downward ? appState.selection.selectedIds[appState.selection.selectedIds.length -1] : appState.selection.selectedIds[0]
        const currentIndex = getChildIndex(currentId);
        const nextElementId = key === "ArrowDown" ? appState.files[currentIndex+1]?.id : appState.files[currentIndex-1]?.id
        const nextElement = document.getElementById(nextElementId)

        if(!nextElement) return;

        return selectByShift(nextElement);

    },[appState.files, appState.selection.selectedId, appState.selection.selectedIds, getChildIndex, select, selectByShift])

    const moveSelection = useCallback((e:KeyboardEvent) => {

        if(!appState.files.length) return;

        const key = e.key;

        if(e.shiftKey){
            return moveSelectionByShit(key);
        }

        const currentId = appState.selection.selectedId ? appState.selection.selectedId : appState.files[0].id
        const currentIndex = getChildIndex(currentId);
        const nextId = key === "ArrowDown" ? appState.files[currentIndex+1]?.id : appState.files[currentIndex-1]?.id
        const nextElement = document.getElementById(nextId)

        if(!nextElement) return;

        clearSelection();
        select(nextElement.id)

    },[appState.files, appState.selection.selectedId, getChildIndex, clearSelection, select, moveSelectionByShit])

    const moveSelectionUpto = useCallback((e:KeyboardEvent) => {

        if(!appState.files.length) return;

        if(!e.shiftKey) return;

        e.preventDefault();

        const targetId = e.key === "Home" ? appState.files[0].id : appState.files[appState.files.length - 1].id
        const target = document.getElementById(targetId);

        if(!target) return;

        selectByShift(target);
        scrollToElement(target)

    },[appState.files, selectByShift])

    const onFileListItemClicked = (e:React.MouseEvent) => {
        const index = getChildIndex(e.currentTarget.id);
        window.api.send("load-file", {index, isAbsolute:true});
    }

    const changeCurrent = useCallback((data:Mp.FileLoadEvent) => {

        dispatchAppState({type:"playlingItemId", value:data.currentFile.id})
        select(data.currentFile.id)

    },[select])

    const startEditFileName = useCallback(() => {

        const selectedElement = document.getElementById(appState.selection.selectedId);

        if(!selectedElement) return;

        const fileName = selectedElement.textContent ?? "";

        const rect = selectedElement.getBoundingClientRect();

        renameData.fileId = selectedElement.id;
        renameData.oldName = fileName;
        dispatchAppState({
            type:"startRename",
            value:{
                rect:{
                    top:rect.top,
                    left:rect.left,
                    width:selectedElement.offsetWidth - List_Item_Padding,
                    height:selectedElement.offsetHeight - List_Item_Padding
                },
                value:fileName
            }
        })

        dispatchAppState({type:"preventBlur", value:false})

    },[appState.selection.selectedId])

    const hideRenameField = useCallback(() => {

        dispatchAppState({type:"endRename"})

    },[])

    const endEditFileName = useCallback(() => {

        if(renameData.oldName === appState.rename.inputValue){
            hideRenameField();
        }else{
            renameData.newName = appState.rename.inputValue;
            undoStack.push({...renameData})
            requestRename(renameData.fileId, renameData.newName);
        }

    },[appState.rename.inputValue, hideRenameField]);

    const requestRename = (id:string, name:string) => {
        dispatchAppState({type:"preventBlur", value:true})
        window.api.send("rename-file", {id, name})
    }

    const onRename = useCallback((data:Mp.RenameResult) => {

        if(!appState.selection.selectedId) return;

        if(appState.selection.selectedId !== data.file.id){
            select(data.file.id);
        }

        if(data.error && appState.rename.renaming){
            undoStack.pop();
            startEditFileName();
            return;
        }

        const fileName = data.file.name

        const target = document.getElementById(appState.selection.selectedId)
        if(target){
            target.textContent = fileName
            target.title = fileName
        }

        hideRenameField();

    },[appState.rename.renaming, appState.selection.selectedId, hideRenameField, select, startEditFileName])

    const undoRename = useCallback(() => {

        const stack = undoStack.pop();

        if(!stack) return;

        redoStack.push(stack);

        select(stack.fileId)

        requestRename(stack.fileId, stack.oldName)

    },[select])

    const redoRename = useCallback(() => {

        const stack = redoStack.pop();

        if(!stack) return;

        undoStack.push(stack);

        select(stack.fileId)

        requestRename(stack.fileId, stack.newName)

    },[select])

    const onReset = useCallback(() => {

        dispatchAppState({type: "playlingItemId", value:""})
        dispatchAppState({type:"clearSelection"})
        clearPlaylist();

    },[])

    const toggleShuffle = () => {
        dispatchAppState({type:"toggleShuffle"})
        window.api.send("toggle-shuffle", {})
    }

    const addToPlaylist = useCallback((data:Mp.PlaylistChangeEvent) => {

        dispatchAppState({type:"files", value:data.files})

    },[])

    const applySortType = useCallback((sortType:Mp.SortType) => {

        dispatchAppState({type:"sortType", value:sortType})

    },[])

    const prepare = useCallback((e:Mp.ReadyEvent) => {

        setlang(e.config.lang);
        applySortType(e.config.sort)

    },[applySortType])

    const close = () => {
        window.api.send("close-playlist", {})
    }

    const onKeydown = useCallback((e:KeyboardEvent) => {

        if(appState.rename.renaming) return;

        if(e.key === "Enter"){
            return window.api.send("toggle-play", {})
        }

        if(e.ctrlKey && e.key === "a"){
            return selectAll();
        }

        if(e.ctrlKey && e.key === "z"){
            return undoRename();
        }

        if(e.ctrlKey && e.key === "y"){
            return redoRename();
        }

        if(e.key === "ArrowUp" || e.key === "ArrowDown"){
            e.preventDefault();
            return moveSelection(e);
        }

        if(e.key === "Home" || e.key === "End"){
            return moveSelectionUpto(e);
        }

        return handleShortcut("Playlist", e);

    },[appState.rename.renaming, moveSelection, moveSelectionUpto, redoRename, selectAll, undoRename]);

    useEffect(() => {

        window.api.receive("ready", prepare);
        window.api.receive("sort-type-change", applySortType)
        window.api.receive("playlist-change", addToPlaylist)
        window.api.receive("after-file-load", changeCurrent)
        window.api.receive("after-remove-playlist", removeFromPlaylist)
        window.api.receive("after-rename", onRename);
        window.api.receive("start-rename", startEditFileName)
        window.api.receive("restart", onReset)
        window.api.receive("clear-playlist", clearPlaylist)

        window.addEventListener("contextmenu", onContextMenu)
        window.addEventListener("keydown",onKeydown)
        document.addEventListener("dragover", e => e.preventDefault())
        document.addEventListener("drop", onFileDrop)

        return () => {
            window.removeEventListener("contextmenu", onContextMenu)
            window.removeEventListener("keydown",onKeydown)
            document.removeEventListener("dragover", e => e.preventDefault())
            document.removeEventListener("drop", onFileDrop)
            window.api.removeAllListeners("ready");
            window.api.removeAllListeners("sort-type-change")
            window.api.removeAllListeners("playlist-change")
            window.api.removeAllListeners("after-file-load")
            window.api.removeAllListeners("after-remove-playlist")
            window.api.removeAllListeners("after-rename");
            window.api.removeAllListeners("start-rename")
            window.api.removeAllListeners("restart")
            window.api.removeAllListeners("clear-playlist")
        };

    },[fileListContainer, onKeydown, addToPlaylist, onRename, prepare, changeCurrent, removeFromPlaylist, startEditFileName, onReset, applySortType])

    return (
        <div className="playlist">
            <div className="playlist-title-bar">
                <div className="playlist-close-btn" onClick={close}>&times;</div>
            </div>
            <div className="playlist-viewport" ref={fileListContainer} onMouseDown={onMouseDown}>
                {appState.rename.renaming &&
                    <input
                        type="text"
                        className="rename"
                        autoFocus={appState.rename.renaming}
                        style={{top:appState.rename.rect.top, left:appState.rename.rect.left, width:appState.rename.rect.width, height:appState.rename.rect.height}}
                        value={appState.rename.inputValue}
                        spellCheck="false"
                        onBlur={appState.preventBlur ? undefined : endEditFileName}
                        onKeyDown={onRenameInputKeyDown}
                        onFocus={(e) => e.target.setSelectionRange(0, e.target.value.lastIndexOf("."))}
                        onChange={(e) => dispatchAppState({type:"udpateName", value:e.target.value})}
                    />
                }
                <List
                    playlingItemId={appState.playlingItemId}
                    files={appState.files}
                    selection={appState.selection}
                    sortType={appState.sortType}
                    onFileListItemClicked={onFileListItemClicked}
                    onDragStart={onDragStart}
                    onDragEnter={onDragEnter}
                    onDragEnd={onDragEnd}
                />
            </div>
            <div className={`playlist-footer ${appState.shuffle ? "shuffle" : ""}`}>
                <div className="btn shuffle-btn" title={t("shuffle")} onClick={toggleShuffle}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                        <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
                    </svg>
                </div>
                <div className="btn" title={t("sort")} onClick={openSorttMenu}>
                    {appState.sortType.order == "NameAsc" &&
                        <svg xmlns="http://www.w3.org/2000/svg" id="nameAsc" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371h-1.781zm1.57-.785L11 2.687h-.047l-.652 2.157h1.351z"/>
                            <path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645V14zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293V2.5z"/>
                        </svg>
                    }
                    {appState.sortType.order == "NameDesc" &&
                        <svg xmlns="http://www.w3.org/2000/svg" id="nameDesc" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371h-1.781zm1.57-.785L11 2.687h-.047l-.652 2.157h1.351z"/>
                            <path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645V14zm-8.46-.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707V13.5z"/>
                        </svg>
                    }
                    {appState.sortType.order == "DateAsc" &&
                        <svg xmlns="http://www.w3.org/2000/svg" id="dateAsc" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.438 1.668V7H11.39V2.684h-.051l-1.211.859v-.969l1.262-.906h1.046z"/>
                            <path fillRule="evenodd" d="M11.36 14.098c-1.137 0-1.708-.657-1.762-1.278h1.004c.058.223.343.45.773.45.824 0 1.164-.829 1.133-1.856h-.059c-.148.39-.57.742-1.261.742-.91 0-1.72-.613-1.72-1.758 0-1.148.848-1.835 1.973-1.835 1.09 0 2.063.636 2.063 2.687 0 1.867-.723 2.848-2.145 2.848zm.062-2.735c.504 0 .933-.336.933-.972 0-.633-.398-1.008-.94-1.008-.52 0-.927.375-.927 1 0 .64.418.98.934.98z"/>
                            <path d="M4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293V2.5z"/>
                        </svg>
                    }
                    {appState.sortType.order == "DateDesc" &&
                        <svg xmlns="http://www.w3.org/2000/svg" id="dateDesc" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M12.438 1.668V7H11.39V2.684h-.051l-1.211.859v-.969l1.262-.906h1.046z"/>
                            <path fillRule="evenodd" d="M11.36 14.098c-1.137 0-1.708-.657-1.762-1.278h1.004c.058.223.343.45.773.45.824 0 1.164-.829 1.133-1.856h-.059c-.148.39-.57.742-1.261.742-.91 0-1.72-.613-1.72-1.758 0-1.148.848-1.835 1.973-1.835 1.09 0 2.063.636 2.063 2.687 0 1.867-.723 2.848-2.145 2.848zm.062-2.735c.504 0 .933-.336.933-.972 0-.633-.398-1.008-.94-1.008-.52 0-.927.375-.927 1 0 .64.418.98.934.98z"/>
                            <path d="M4.5 13.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707V13.5z"/>
                        </svg>
                    }
                </div>
            </div>
        </div>
    )
}

export default Playlist;