<script lang="ts">
    import { onMount } from "svelte";
    import List from "./List.svelte";

    import editor from "./editor";
    import { getDropFiles } from "../fileDropHandler";
    import { handleShortcut } from "../shortcut";
    import { handleKeyEvent, Buttons } from "../../constants";
    import { appState, dispatch } from "./appStateReducer";
    import { t, lang } from "../../translation/useTranslation";

    let openContextMenu = false;
    let fileListContainer: HTMLDivElement;

    const List_Item_Padding = 10;

    const onPlaylistItemMousedown = (e: MouseEvent) => {
        if (!e.target || !(e.target instanceof HTMLElement)) return;

        if (e.button === Buttons.right && $appState.selection.selectedIds.length > 1) {
            if ($appState.selection.selectedIds.includes(e.target.id)) {
                return;
            }
        }

        return toggleSelect(e);
    };

    const onFileDrop = (e: DragEvent) => {
        if ($appState.dragState.dragging) return;

        const files = getDropFiles(e);

        if (files.length) {
            window.api.send("drop", { files, renderer: "Playlist" });
        }
    };

    const clearPlaylist = () => {
        dispatch({ type: "clear" });
    };

    const clearSelection = () => {
        dispatch({ type: "clearSelection" });
        sendSelection();
    };

    const getChildIndex = (id: string | null | undefined) => {
        return $appState.files.findIndex((file) => file.id == id);
    };

    const scrollToElement = (id: string) => {
        const element = document.getElementById(id);

        if (!element) return;

        const rect = element.getBoundingClientRect();
        const containerRect = fileListContainer.getBoundingClientRect();
        if (rect.top <= containerRect.top) {
            element.scrollIntoView(true);
        }

        if (rect.bottom > containerRect.height + containerRect.top + 5) {
            element.scrollIntoView(false);
        }
    };

    const removeFromPlaylist = (data: Mp.RemovePlaylistItemResult) => {
        const selectedIndex = $appState.files.findIndex((file) => file.id == $appState.selection.selectedId);
        const shouldRestoreSelection = $appState.selection.selectedIds.length == 1;

        clearSelection();

        dispatch({ type: "files", value: data.files });

        if (shouldRestoreSelection && $appState.files.length) {
            const nextId = selectedIndex > $appState.files.length - 1 ? $appState.files[selectedIndex - 1].id : $appState.files[selectedIndex].id;
            dispatch({ type: "updateSelection", value: { selectedId: nextId, selectedIds: [nextId] } });
        }
    };

    const toggleSelect = (e: MouseEvent) => {
        const id = (e.target as HTMLElement).id;

        if (e.ctrlKey) {
            selectByCtrl(id);
            return;
        }

        if (e.shiftKey) {
            selectByShift(id);
            return;
        }

        selectByClick(id);
    };

    const select = (id: string) => {
        clearSelection();

        dispatch({ type: "updateSelection", value: { selectedId: id, selectedIds: [id] } });

        scrollToElement(id);

        sendSelection();
    };

    const selectByClick = (id: string) => {
        select(id);
    };

    const selectByShift = (id: string) => {
        dispatch({ type: "setSelectedIds", value: [] });

        const range = [];

        if ($appState.selection.selectedId) {
            range.push(getChildIndex($appState.selection.selectedId));
        } else {
            range.push(0);
        }

        range.push(getChildIndex(id));

        range.sort((a, b) => a - b);

        const ids: string[] = [];
        for (let i = range[0]; i <= range[1]; i++) {
            ids.push($appState.files[i].id);
        }

        dispatch({ type: "setSelectedIds", value: ids });

        sendSelection();
    };

    const selectByCtrl = (id: string) => {
        if (!$appState.selection.selectedId) {
            selectByClick(id);
            return;
        }

        dispatch({ type: "updatSelectedIds", value: [id] });

        sendSelection();
    };

    const selectAll = () => {
        clearSelection();

        const ids = $appState.files.map((file) => file.id);

        dispatch({ type: "updatSelectedIds", value: ids });

        sendSelection();
    };

    const moveSelectionByShit = (key: string) => {
        if (!$appState.selection.selectedIds.length) {
            select($appState.files[0].id);
        }

        const downward = $appState.selection.selectedId == $appState.selection.selectedIds[0];

        const currentId = downward ? $appState.selection.selectedIds[$appState.selection.selectedIds.length - 1] : $appState.selection.selectedIds[0];
        const currentIndex = getChildIndex(currentId);
        const nextId = key === "ArrowDown" ? $appState.files[currentIndex + 1]?.id : $appState.files[currentIndex - 1]?.id;

        if (!nextId) return;

        return selectByShift(nextId);
    };

    const moveSelection = (e: KeyboardEvent) => {
        if (!$appState.files.length) return;

        if (e.shiftKey) {
            return moveSelectionByShit(e.key);
        }

        const currentId = $appState.selection.selectedId ? $appState.selection.selectedId : $appState.files[0].id;
        const currentIndex = getChildIndex(currentId);
        const nextId = e.key === "ArrowDown" ? $appState.files[currentIndex + 1]?.id : $appState.files[currentIndex - 1]?.id;

        if (!nextId) return;

        clearSelection();
        select(nextId);
    };

    const moveSelectionUpto = (e: KeyboardEvent) => {
        if (!$appState.files.length) return;

        e.preventDefault();

        const nextSelection = findNextSelection(e.key === "Home", e.ctrlKey);

        if (!nextSelection.selectId || !nextSelection.scrollToId) return;

        if (e.shiftKey) {
            selectByShift(nextSelection.selectId);
        } else {
            select(nextSelection.selectId);
        }
        scrollToElement(nextSelection.scrollToId);
    };

    const findNextSelection = (upward: boolean, ctrlKey: boolean): Mp.MoveUptoSelection => {
        const defaultTarget = upward ? $appState.files[0] : $appState.files[$appState.files.length - 1];

        const nextSelection: Mp.MoveUptoSelection = { selectId: defaultTarget.id, scrollToId: $appState.sortType.groupBy ? defaultTarget.id : encodeURIComponent(defaultTarget.dir) };

        const dirs = Array.from(document.querySelectorAll(".group"));

        if (dirs.length <= 1 || !$appState.sortType.groupBy || ctrlKey) {
            return nextSelection;
        }

        const current = document.getElementById($appState.selection.selectedId);
        const currentIndex = $appState.files.findIndex((file) => file.id == $appState.selection.selectedId);

        if (!current || currentIndex < 0) return nextSelection;

        const nearest = upward ? current.previousElementSibling : current.nextElementSibling;

        if (!nearest) return nextSelection;

        const currentFile = $appState.files[currentIndex];
        let dir = currentFile.dir;

        if (nearest.classList.contains("group")) {
            if (upward && currentIndex > 0) {
                dir = $appState.files[currentIndex - 1].dir;
            }
            if (!upward && currentIndex < $appState.files.length - 1) {
                dir = $appState.files[currentIndex + 1].dir;
            }
        }

        const targetIndex = upward ? $appState.files.findIndex((file) => file.dir == dir) : $appState.files.findLastIndex((file) => file.dir == dir);

        if (targetIndex < 0) return nextSelection;

        const target = $appState.files[targetIndex];
        let scrollToId = target.id;
        if (upward) {
            scrollToId = encodeURIComponent(target.dir);
        }
        if (!upward && targetIndex < $appState.files.length - 1) {
            scrollToId = encodeURIComponent($appState.files[targetIndex + 1].dir);
        }

        return { selectId: target.id, scrollToId };
    };

    const sendSelection = () => {
        window.api.send("playlist-item-selection-change", { selection: $appState.selection });
    };

    const changeCurrent = (e: Mp.FileLoadEvent) => {
        dispatch({ type: "playlingItemId", value: e.currentFile.id });
        if (e.currentFile.id) {
            select(e.currentFile.id);
        }
    };

    /* input */
    const setRenameInputFocus = (node: HTMLInputElement) => {
        node.focus();
        node.setSelectionRange(0, node.value.lastIndexOf("."));
    };

    const setSearchInputFocus = (node: HTMLInputElement) => {
        node.focus();
    };

    const onRenameInputKeyDown = (e: KeyboardEvent) => {
        if (!e.target || !(e.target instanceof HTMLInputElement)) return;

        if ($appState.rename.renaming && e.key === "Enter") {
            e.stopPropagation();
            e.preventDefault();
            endEditFileName();
        }
    };

    /* rename */
    const startEditFileName = () => {
        const selectedElement = document.getElementById($appState.selection.selectedId);

        if (!selectedElement) return;

        const fileName = selectedElement.getAttribute("data-name") ?? "";

        const rect = selectedElement.getBoundingClientRect();

        editor.begin(selectedElement.id, fileName);

        dispatch({
            type: "startRename",
            value: {
                rect: {
                    top: rect.top,
                    left: rect.left,
                    width: selectedElement.offsetWidth - List_Item_Padding,
                    height: selectedElement.offsetHeight - List_Item_Padding,
                },
                value: fileName,
            },
        });

        dispatch({ type: "preventBlur", value: false });
    };

    const endRename = () => {
        dispatch({ type: "endRename" });
    };

    const endEditFileName = () => {
        if (!$appState.rename.renaming) return;

        if (editor.data.name === $appState.rename.inputValue) {
            endRename();
        } else {
            editor.update($appState.rename.inputValue);
            requestRename();
        }
    };

    const requestRename = () => {
        dispatch({ type: "preventBlur", value: true });
        window.api.send("rename-file", { data: editor.data });
    };

    const onRename = (data: Mp.RenameResult) => {
        if (data.error) {
            editor.rollback();
            select(editor.data.id);
        } else {
            editor.end();
            dispatch({ type: "rename", value: editor.data });
        }

        endRename();
    };

    const undoRename = () => {
        if (!editor.canUndo()) return;

        editor.undo();

        select(editor.data.id);

        requestRename();
    };

    const redoRename = () => {
        if (!editor.canRedo()) return;

        editor.redo();

        select(editor.data.id);

        requestRename();
    };

    /* Search */
    const toggleSearch = (forceClose = false) => {
        const showSearchBar = forceClose ? false : !$appState.searchState.searching;
        if (showSearchBar && $appState.rename.renaming) {
            return;
        }

        dispatch({ type: "toggleSearch", value: showSearchBar });

        if (showSearchBar) {
            onSearchInput();
        } else {
            dispatch({ type: "highlightItems", value: [] });
        }
    };

    const onSearchInput = (e?: Event & { currentTarget: EventTarget & HTMLInputElement }) => {
        if (!$appState.files.length) return;

        const { value } = e?.target as HTMLInputElement;

        if (value) {
            const items = $appState.files.filter((file) => file.name.toLowerCase().includes(value.toLowerCase())).map((file) => file.id);
            dispatch({ type: "highlightItems", value: items });
        } else {
            dispatch({ type: "highlightItems", value: [] });
        }
    };

    const moveHighlight = (forward: boolean) => {
        if (!$appState.searchState.itemIds.length) return;

        if (forward) {
            const next = $appState.searchState.highlighIndex + 1;
            if (next > $appState.searchState.itemIds.length - 1) return;
            dispatch({ type: "changeHighlight", value: next });
        } else {
            const prev = $appState.searchState.highlighIndex - 1;
            if (prev < 0) return;
            dispatch({ type: "changeHighlight", value: prev });
        }

        const targetId = $appState.searchState.itemIds[$appState.searchState.highlighIndex];
        scrollToElement(targetId);
    };

    /* Move file */
    const onFileMoveStart = () => {
        dispatch({ type: "startMove" });
    };

    const onFileMoveEnd = () => {
        dispatch({ type: "endMove" });
    };

    const onMoveCancel = () => {
        dispatch({ type: "endMove" });
    };

    const toggleShuffle = () => {
        dispatch({ type: "toggleShuffle" });
        window.api.send("toggle-shuffle", {});
    };

    const addToPlaylist = (e: Mp.PlaylistChangeEvent) => {
        dispatch({ type: "files", value: e.files });
    };

    const applySortType = (sortType: Mp.SortType) => {
        dispatch({ type: "sortType", value: sortType });
    };

    const prepare = (e: Mp.ReadyEvent) => {
        $lang = e.settings.locale.lang;
        applySortType(e.settings.sort);
    };

    const close = () => {
        window.api.send("close-playlist", {});
    };

    const onKeydown = (e: KeyboardEvent) => {
        if ($appState.rename.renaming) return;

        if ($appState.searchState.searching) {
            if (e.key === "Escape") {
                toggleSearch(true);
            }

            if (e.key === "F3") {
                if (e.shiftKey) {
                    moveHighlight(false);
                } else {
                    moveHighlight(true);
                }
            }

            return;
        }

        if (e.key === "Enter") {
            return window.api.send("toggle-play", {});
        }

        if (e.ctrlKey && e.key === "a") {
            return selectAll();
        }

        if (e.ctrlKey && e.key === "z") {
            return undoRename();
        }

        if (e.ctrlKey && e.key === "y") {
            return redoRename();
        }

        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            return moveSelection(e);
        }

        if (e.key === "Home" || e.key === "End") {
            return moveSelectionUpto(e);
        }

        if (e.ctrlKey && e.key === "f") {
            return toggleSearch();
        }

        return handleShortcut("Playlist", e);
    };

    const onContextMenu = (e: MouseEvent) => {
        e.preventDefault();

        if (navigator.userAgent.includes("Linux")) {
            openContextMenu = true;
        } else {
            window.api.send("open-playlist-context", { x: e.screenX, y: e.screenY });
        }
    };

    const openSortMenu = (e: MouseEvent) => {
        window.api.send("open-sort-context", { x: e.screenX, y: e.screenY });
    };

    const onMouseUp = (e: MouseEvent) => {
        if (navigator.userAgent.includes("Linux")) {
            if (e.button == 2 && e.buttons == 0 && openContextMenu) {
                window.api.send("open-player-context", { x: e.clientX, y: e.clientY });
                openContextMenu = false;
            }
        }
    };

    onMount(() => {
        window.api.receive("ready", prepare);
        window.api.receive("sort-type-change", applySortType);
        window.api.receive("playlist-change", addToPlaylist);
        window.api.receive("load-file", changeCurrent);
        window.api.receive("after-remove-playlist", removeFromPlaylist);
        window.api.receive("after-rename", onRename);
        window.api.receive("start-rename", startEditFileName);
        window.api.receive("restart", clearPlaylist);
        window.api.receive("clear-playlist", clearPlaylist);
        window.api.receive("move-started", onFileMoveStart);
        window.api.receive("move-end", onFileMoveEnd);
        window.api.receive("move-cancelled", onMoveCancel);

        return () => {
            window.api.removeAllListeners("ready");
            window.api.removeAllListeners("sort-type-change");
            window.api.removeAllListeners("playlist-change");
            window.api.removeAllListeners("load-file");
            window.api.removeAllListeners("after-remove-playlist");
            window.api.removeAllListeners("after-rename");
            window.api.removeAllListeners("start-rename");
            window.api.removeAllListeners("restart");
            window.api.removeAllListeners("clear-playlist");
            window.api.removeAllListeners("move-started");
            window.api.removeAllListeners("move-end");
            window.api.removeAllListeners("move-cancelled");
        };
    });
</script>

<svelte:window on:contextmenu={onContextMenu} on:keydown={onKeydown} on:mouseup={onMouseUp} />

<div class="viewport">
    <div class="title-bar">
        <div class="close-btn" on:click={close} on:keydown={handleKeyEvent} role="button" tabindex="-1">&times;</div>
    </div>
    <div
        class="playlist-viewport"
        class:group-by={$appState.sortType.groupBy}
        bind:this={fileListContainer}
        role="button"
        tabindex="-1"
        on:drop={onFileDrop}
        on:dragover={(e) => e.preventDefault()}
        on:scroll={endEditFileName}
    >
        {#if $appState.rename.renaming}
            <input
                type="text"
                class="input rename"
                style="top:{$appState.rename.rect.top}px; left:{$appState.rename.rect.left}px; width:{$appState.rename.rect.width}px; height:{$appState.rename.rect.height}px"
                spellCheck="false"
                on:blur={$appState.preventBlur ? undefined : endEditFileName}
                on:keydown={onRenameInputKeyDown}
                bind:value={$appState.rename.inputValue}
                use:setRenameInputFocus
            />
        {/if}
        {#if $appState.searchState.searching}
            <div class="searchArea">
                <input type="text" spellcheck="false" class="input search" on:input={onSearchInput} use:setSearchInputFocus />
                <span class="searchResult">{$appState.searchState.itemIds.length ? $appState.searchState.highlighIndex + 1 : 0}/{$appState.searchState.itemIds.length}</span>
            </div>
        {/if}
        <List onMouseDown={onPlaylistItemMousedown} {scrollToElement} {getChildIndex} />
    </div>
    <div class="playlist-footer" class:shuffle={$appState.shuffle}>
        <div class="btn shuffle-btn" title={$t("shuffle")} on:click={toggleShuffle} on:keydown={handleKeyEvent} role="button" tabindex="-1">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                <path
                    fill-rule="evenodd"
                    d="M0 3.5A.5.5 0 0 1 .5 3H1c2.202 0 3.827 1.24 4.874 2.418.49.552.865 1.102 1.126 1.532.26-.43.636-.98 1.126-1.532C9.173 4.24 10.798 3 13 3v1c-1.798 0-3.173 1.01-4.126 2.082A9.624 9.624 0 0 0 7.556 8a9.624 9.624 0 0 0 1.317 1.918C9.828 10.99 11.204 12 13 12v1c-2.202 0-3.827-1.24-4.874-2.418A10.595 10.595 0 0 1 7 9.05c-.26.43-.636.98-1.126 1.532C4.827 11.76 3.202 13 1 13H.5a.5.5 0 0 1 0-1H1c1.798 0 3.173-1.01 4.126-2.082A9.624 9.624 0 0 0 6.444 8a9.624 9.624 0 0 0-1.317-1.918C4.172 5.01 2.796 4 1 4H.5a.5.5 0 0 1-.5-.5z"
                />
                <path
                    d="M13 5.466V1.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192zm0 9v-3.932a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384l-2.36 1.966a.25.25 0 0 1-.41-.192z"
                />
            </svg>
        </div>
        <div class="btn" title={$t("sort")} on:click={openSortMenu} on:keydown={handleKeyEvent} role="button" tabindex="-1">
            {#if $appState.sortType.order == "NameAsc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="nameAsc" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371h-1.781zm1.57-.785L11 2.687h-.047l-.652 2.157h1.351z" />
                    <path
                        d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645V14zM4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293V2.5z"
                    />
                </svg>
            {/if}
            {#if $appState.sortType.order == "NameDesc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="nameDesc" fill="currentColor" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M10.082 5.629 9.664 7H8.598l1.789-5.332h1.234L13.402 7h-1.12l-.419-1.371h-1.781zm1.57-.785L11 2.687h-.047l-.652 2.157h1.351z" />
                    <path
                        d="M12.96 14H9.028v-.691l2.579-3.72v-.054H9.098v-.867h3.785v.691l-2.567 3.72v.054h2.645V14zm-8.46-.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707V13.5z"
                    />
                </svg>
            {/if}
            {#if $appState.sortType.order == "DateAsc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="dateAsc" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.438 1.668V7H11.39V2.684h-.051l-1.211.859v-.969l1.262-.906h1.046z" />
                    <path
                        fill-rule="evenodd"
                        d="M11.36 14.098c-1.137 0-1.708-.657-1.762-1.278h1.004c.058.223.343.45.773.45.824 0 1.164-.829 1.133-1.856h-.059c-.148.39-.57.742-1.261.742-.91 0-1.72-.613-1.72-1.758 0-1.148.848-1.835 1.973-1.835 1.09 0 2.063.636 2.063 2.687 0 1.867-.723 2.848-2.145 2.848zm.062-2.735c.504 0 .933-.336.933-.972 0-.633-.398-1.008-.94-1.008-.52 0-.927.375-.927 1 0 .64.418.98.934.98z"
                    />
                    <path d="M4.5 2.5a.5.5 0 0 0-1 0v9.793l-1.146-1.147a.5.5 0 0 0-.708.708l2 1.999.007.007a.497.497 0 0 0 .7-.006l2-2a.5.5 0 0 0-.707-.708L4.5 12.293V2.5z" />
                </svg>
            {/if}
            {#if $appState.sortType.order == "DateDesc"}
                <svg xmlns="http://www.w3.org/2000/svg" id="dateDesc" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.438 1.668V7H11.39V2.684h-.051l-1.211.859v-.969l1.262-.906h1.046z" />
                    <path
                        fill-rule="evenodd"
                        d="M11.36 14.098c-1.137 0-1.708-.657-1.762-1.278h1.004c.058.223.343.45.773.45.824 0 1.164-.829 1.133-1.856h-.059c-.148.39-.57.742-1.261.742-.91 0-1.72-.613-1.72-1.758 0-1.148.848-1.835 1.973-1.835 1.09 0 2.063.636 2.063 2.687 0 1.867-.723 2.848-2.145 2.848zm.062-2.735c.504 0 .933-.336.933-.972 0-.633-.398-1.008-.94-1.008-.52 0-.927.375-.927 1 0 .64.418.98.934.98z"
                    />
                    <path d="M4.5 13.5a.5.5 0 0 1-1 0V3.707L2.354 4.854a.5.5 0 1 1-.708-.708l2-1.999.007-.007a.498.498 0 0 1 .7.006l2 2a.5.5 0 1 1-.707.708L4.5 3.707V13.5z" />
                </svg>
            {/if}
        </div>
        {#if $appState.moveState.started}
            <div class="btn">
                <div class="loader8"></div>
            </div>
        {/if}
    </div>
</div>
