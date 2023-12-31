<script lang="ts">

    import { onMount } from "svelte";
    import List from "./List.svelte";
    import { handleShortcut } from "../shortcut"
    import { handleKeyEvent } from "../../constants";
    import { reducer, initialAppState } from "./appStateReducer";
    import { useTranslation } from "../../translation/useTranslation"

    let fileListContainer:HTMLDivElement;
    let lang:Mp.Lang = "en";

    const { appState, dispatch } = reducer(initialAppState);
    const t = useTranslation(lang);

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

    const onContextMenu = (e:MouseEvent) => {
        e.preventDefault()
        window.api.send("open-playlist-context", {})
    }

    const onRenameInputKeyDown = (e:KeyboardEvent) => {
        if($appState.rename.renaming && e.key === "Enter"){
            e.stopPropagation();
            e.preventDefault();
            endEditFileName();
        }
    }

    const openSorttMenu = (e:MouseEvent) => {
        window.api.send("open-sort-context", {x:e.clientX, y:e.clientY})
    }

    const onMouseDown = (e:MouseEvent) => {

        if(!e.target || !(e.target instanceof HTMLElement)) return;

        if(e.target.classList.contains("playlist-item")){

            if(e.button === 2 && $appState.selection.selectedIds.length > 1){
                if($appState.selection.selectedIds.includes(e.target.id)){
                    return;
                }
            }

            return toggleSelect(e)
        }

        if(!e.target.classList.contains("group") && $appState.selection.selectedIds.length){
            clearSelection();
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

    const onDragStart = (e:DragEvent) => {
        startDragPlaylistItem(e);
    }

    const onDragEnter = (e:DragEvent) => {
        if(dragState.dragging){
            toggleHighlightDropTarget(e);
        }
    }

    const onDragEnd = (e:DragEvent) => {
        if(dragState.dragging){
            endDragPlaylistItem(e)
        }
    }

    const clearPlaylist = () => {
        dispatch({type:"clearSelection"})
        dispatch({type:"playlingItemId", value:""})
        dispatch({type:"files", value:[]})
    }

    const clearSelection = () => {

        dispatch({type:"clearSelection"})
        window.api.send("playlist-item-selection-change", {selection:$appState.selection})

    }

    const getChildIndex = (id:string | null | undefined) => {

        return $appState.files.findIndex(file => file.id == id)

    }

    const scrollToElement = (element:HTMLElement | null) => {

        if(!element || !fileListContainer) return;

        const rect = element.getBoundingClientRect();
        const containerRect = fileListContainer.getBoundingClientRect();
        if(rect.top <= containerRect.top){
            element.scrollIntoView(true)
        }

        if(rect.bottom > containerRect.height + containerRect.top + 5){
            element.scrollIntoView(false)
        }

    }

    const removeFromPlaylist = (data:Mp.RemovePlaylistItemResult) => {

        const selectedIndex = $appState.files.findIndex(file => file.id == $appState.selection.selectedId)
        const shouldRestoreSelection = $appState.selection.selectedIds.length == 1;

        clearSelection();

        dispatch({type:"files", value:data.files})

        if(shouldRestoreSelection && $appState.files.length){
            const nextId = selectedIndex > $appState.files.length - 1 ? $appState.files[selectedIndex - 1].id : $appState.files[selectedIndex].id
            dispatch({type:"updateSelection", value:{selectedId:nextId, selectedIds:[nextId]}})
        }

    }

    const startDragPlaylistItem = (e:DragEvent) => {
        if(!e.target || !(e.target instanceof HTMLElement)) return;

        e.stopPropagation();
        dragState.dragging = true;
        dragState.startElement = e.target;
        dragState.startIndex = getChildIndex(e.target.id)
    }

    const toggleHighlightDropTarget = (e:DragEvent) => {

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

    const endDragPlaylistItem = (e:DragEvent) => {

        if(dragState.targetElement){

            window.api.send("change-playlist-order", {
                start:dragState.startIndex,
                end:getChildIndex(dragState.targetElement.id),
                currentIndex:getChildIndex($appState.playlingItemId),
                type:"Move"
            });

            toggleHighlightDropTarget(e)

        }

        dragState.dragging = false;
        dragState.startElement = null;
        dragState.startIndex = -1;
        dragState.targetElement = null;
    }

    const toggleSelect = (e:MouseEvent) => {

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

    const select = (target:HTMLElement | string) => {

        clearSelection();

        const id = typeof target === "string" ? target : target.id;
        dispatch({type:"updateSelection", value:{selectedId:id, selectedIds:[id]}})

        scrollToElement(document.getElementById(id))

        window.api.send("playlist-item-selection-change", {selection:$appState.selection})

    }

    const selectByClick = (target:HTMLElement) => {
        select(target);
    }

    const selectByShift = (target:HTMLElement) => {

        dispatch({type:"setSelectedIds", value:[]})

        const range = [];

        if($appState.selection.selectedId){
            range.push(getChildIndex($appState.selection.selectedId));
        }else{
            range.push(0);
        }

        range.push(getChildIndex(target.id));

        range.sort((a,b) => a - b);

        const ids:string[] = [];
        for(let i = range[0]; i <= range[1]; i++){
            ids.push($appState.files[i].id)
        }

        dispatch({type:"setSelectedIds", value:ids})

        window.api.send("playlist-item-selection-change", {selection:$appState.selection})

    }

    const selectByCtrl = (target:HTMLElement) => {

        if(!$appState.selection.selectedId){
            selectByClick(target);
            return;
        }

        if(target.classList.contains("group")) return;

        dispatch({type:"updatSelectedIds", value:[target.id]})

        window.api.send("playlist-item-selection-change", {selection:$appState.selection})
    }

    const selectAll = () => {

        clearSelection();

        const ids = $appState.files.map(file => file.id);

        dispatch({type:"updatSelectedIds", value:ids})

        window.api.send("playlist-item-selection-change", {selection:$appState.selection})

    }

    const moveSelectionByShit = (key:string) => {

        if(!$appState.selection.selectedIds.length){
            select($appState.files[0].id);
        }

        const downward = $appState.selection.selectedId == $appState.selection.selectedIds[0];

        const currentId = downward ? $appState.selection.selectedIds[$appState.selection.selectedIds.length -1] : $appState.selection.selectedIds[0]
        const currentIndex = getChildIndex(currentId);
        const nextElementId = key === "ArrowDown" ? $appState.files[currentIndex+1]?.id : $appState.files[currentIndex-1]?.id
        const nextElement = document.getElementById(nextElementId)

        if(!nextElement) return;

        return selectByShift(nextElement);

    }

    const moveSelection = (e:KeyboardEvent) => {

        if(!$appState.files.length) return;

        if(e.shiftKey){
            return moveSelectionByShit(e.key);
        }

        const currentId = $appState.selection.selectedId ? $appState.selection.selectedId : $appState.files[0].id
        const currentIndex = getChildIndex(currentId);
        const nextId = e.key === "ArrowDown" ? $appState.files[currentIndex+1]?.id : $appState.files[currentIndex-1]?.id
        const nextElement = document.getElementById(nextId)

        if(!nextElement) return;

        clearSelection();
        select(nextElement.id)

    }

    const moveSelectionUpto = (e:KeyboardEvent) => {

        if(!e.shiftKey) return;

        if(!$appState.files.length) return;

        e.preventDefault();

        const targetId = e.key === "Home" ? $appState.files[0].id : $appState.files[$appState.files.length - 1].id
        const target = document.getElementById(targetId);

        if(!target) return;

        selectByShift(target);
        scrollToElement(target)

    }

    const onFileListItemClicked = (e:MouseEvent) => {
        const index = getChildIndex((e.target as HTMLElement).id);
        window.api.send("load-file", {index, isAbsolute:true});
    }

    const changeCurrent = (e:Mp.FileLoadEvent) => {
        dispatch({type:"playlingItemId", value:e.currentFile.id})
        select(e.currentFile.id)
    }

    const setInputFocus = (node:HTMLInputElement) => {
        node.focus();
        node.setSelectionRange(0, node.value.lastIndexOf("."))
    }

    const onInputChange = (e:Event) => {
        if(!e.target || !(e.target instanceof HTMLInputElement)) return;

        dispatch({type:"udpateName", value:e.target.value})
    }

    const startEditFileName = () => {

        const selectedElement = document.getElementById($appState.selection.selectedId);

        if(!selectedElement) return;

        const fileName = selectedElement.textContent ?? "";

        const rect = selectedElement.getBoundingClientRect();

        renameData.fileId = selectedElement.id;
        renameData.oldName = fileName;
        dispatch({
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

        dispatch({type:"preventBlur", value:false})

    }

    const hideRenameField = () => {
        dispatch({type:"endRename"})
    }

    const endEditFileName = () => {

        if(renameData.oldName === $appState.rename.inputValue){
            hideRenameField();
        }else{
            renameData.newName = $appState.rename.inputValue;
            undoStack.push({...renameData})
            requestRename(renameData.fileId, renameData.newName);
        }

    }

    const requestRename = (id:string, name:string) => {
        dispatch({type:"preventBlur", value:true})
        window.api.send("rename-file", {id, name})
    }

    const onRename = (data:Mp.RenameResult) => {

        if(!$appState.selection.selectedId) return;

        if($appState.selection.selectedId !== data.file.id){
            select(data.file.id);
        }

        if(data.error && $appState.rename.renaming){
            undoStack.pop();
            startEditFileName();
            return;
        }

        const fileName = data.file.name

        const target = document.getElementById($appState.selection.selectedId)
        if(target){
            target.textContent = fileName
            target.title = fileName
        }

        hideRenameField();

    }

    const undoRename = () => {

        const stack = undoStack.pop();

        if(!stack) return;

        redoStack.push(stack);

        select(stack.fileId)

        requestRename(stack.fileId, stack.oldName)

    }

    const redoRename = () => {

        const stack = redoStack.pop();

        if(!stack) return;

        undoStack.push(stack);

        select(stack.fileId)

        requestRename(stack.fileId, stack.newName)

    }

    const toggleShuffle = () => {
        dispatch({type:"toggleShuffle"})
        window.api.send("toggle-shuffle", {})
    }

    const addToPlaylist = (e:Mp.PlaylistChangeEvent) => {
        if(e.type == "Append"){
            dispatch({type:"subscribeListUpdate", value:true})
        }
        dispatch({type:"files", value:e.files})
    }

    const applySortType = (sortType:Mp.SortType) => {
        dispatch({type:"sortType", value:sortType})
    }

    const prepare = (e:Mp.ReadyEvent) => {
        lang = e.config.lang;
        applySortType(e.config.sort)
    }

    const close = () => {
        window.api.send("close-playlist", {})
    }

    const onKeydown = (e:KeyboardEvent) => {

        if($appState.rename.renaming) return;

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

    }

    const onListUpdate = () => {
        if($appState.subscribeListUpdate){
            dispatch({type:"subscribeListUpdate", value:false})
            select($appState.playlingItemId)
        }
    }

    onMount(() => {

        window.api.receive("ready", prepare);
        window.api.receive("sort-type-change", applySortType)
        window.api.receive("playlist-change", addToPlaylist)
        window.api.receive("load-file", changeCurrent)
        window.api.receive("after-remove-playlist", removeFromPlaylist)
        window.api.receive("after-rename", onRename);
        window.api.receive("start-rename", startEditFileName)
        window.api.receive("restart", clearPlaylist)
        window.api.receive("clear-playlist", clearPlaylist)

        return () => {
            window.api.removeAllListeners("ready");
            window.api.removeAllListeners("sort-type-change")
            window.api.removeAllListeners("playlist-change")
            window.api.removeAllListeners("load-file")
            window.api.removeAllListeners("after-remove-playlist")
            window.api.removeAllListeners("after-rename");
            window.api.removeAllListeners("start-rename")
            window.api.removeAllListeners("restart")
            window.api.removeAllListeners("clear-playlist")
        };

    })

</script>

<svelte:window on:contextmenu={onContextMenu} on:keydown={onKeydown}/>

<div class="playlist">
    <div class="playlist-title-bar">
        <div class="playlist-close-btn" on:click={close} on:keydown={handleKeyEvent} role="button" tabindex="-1">&times;</div>
    </div>
    <div class="playlist-viewport" class:group-by={$appState.sortType.groupBy} bind:this={fileListContainer} on:mousedown={onMouseDown} role="button" tabindex="-1" on:drop={onFileDrop} on:dragover={e => e.preventDefault()}>
        {#if $appState.rename.renaming}
            <input
                type="text"
                class="rename"
                style="top:{$appState.rename.rect.top}px; left:{$appState.rename.rect.left}px; width:{$appState.rename.rect.width}px; height:{$appState.rename.rect.height}px"
                value={$appState.rename.inputValue}
                spellCheck="false"
                on:blur={$appState.preventBlur ? undefined : endEditFileName}
                on:keydown={onRenameInputKeyDown}
                on:change={onInputChange}
                use:setInputFocus
            />
        {/if}
        <List
            playlingItemId={$appState.playlingItemId}
            files={$appState.files}
            selection={$appState.selection}
            sortType={$appState.sortType}
            onFileListItemClicked={onFileListItemClicked}
            onDragStart={onDragStart}
            onDragEnter={onDragEnter}
            onDragEnd={onDragEnd}
            onUpdate={onListUpdate}
        />
    </div>
    <div class="playlist-footer" class:shuffle={$appState.shuffle}>
        <div class="btn shuffle-btn" title={t("shuffle")} on:click={toggleShuffle} on:keydown={toggleShuffle} role="button" tabindex="-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"/>
                <path d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"/>
            </svg>
        </div>
        <div class="btn" title={t("sort")} on:click={openSorttMenu} on:keydown={handleKeyEvent} role="button" tabindex="-1">
            {#if $appState.sortType.order == "NameAsc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="nameAsc" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371h-1.781zm1.57-.785L11 2.687h-.047l-.652 2.157h1.351z"/>
                    <path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645V14zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293V2.5z"/>
                </svg>
            {/if}
            {#if $appState.sortType.order == "NameDesc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="nameDesc" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371h-1.781zm1.57-.785L11 2.687h-.047l-.652 2.157h1.351z"/>
                    <path d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645V14zm-8.46-.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707V13.5z"/>
                </svg>
            {/if}
            {#if $appState.sortType.order == "DateAsc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="dateAsc" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.438 1.668V7H11.39V2.684h-.051l-1.211.859v-.969l1.262-.906h1.046z"/>
                    <path fill-rule="evenodd" d="M11.36 14.098c-1.137 0-1.708-.657-1.762-1.278h1.004c.058.223.343.45.773.45.824 0 1.164-.829 1.133-1.856h-.059c-.148.39-.57.742-1.261.742-.91 0-1.72-.613-1.72-1.758 0-1.148.848-1.835 1.973-1.835 1.09 0 2.063.636 2.063 2.687 0 1.867-.723 2.848-2.145 2.848zm.062-2.735c.504 0 .933-.336.933-.972 0-.633-.398-1.008-.94-1.008-.52 0-.927.375-.927 1 0 .64.418.98.934.98z"/>
                    <path d="M4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293V2.5z"/>
                </svg>
            {/if}
            {#if $appState.sortType.order == "DateDesc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="dateDesc" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.438 1.668V7H11.39V2.684h-.051l-1.211.859v-.969l1.262-.906h1.046z"/>
                    <path fill-rule="evenodd" d="M11.36 14.098c-1.137 0-1.708-.657-1.762-1.278h1.004c.058.223.343.45.773.45.824 0 1.164-.829 1.133-1.856h-.059c-.148.39-.57.742-1.261.742-.91 0-1.72-.613-1.72-1.758 0-1.148.848-1.835 1.973-1.835 1.09 0 2.063.636 2.063 2.687 0 1.867-.723 2.848-2.145 2.848zm.062-2.735c.504 0 .933-.336.933-.972 0-.633-.398-1.008-.94-1.008-.52 0-.927.375-.927 1 0 .64.418.98.934.98z"/>
                    <path d="M4.5 13.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707V13.5z"/>
                </svg>
            {/if}
        </div>
    </div>
</div>