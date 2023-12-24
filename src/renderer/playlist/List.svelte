<script lang="ts">
    export let playlingItemId:string;
    export let files:Mp.MediaFile[]
    export let selection:Mp.PlaylistItemSelection
    export let sortType:Mp.SortType;
    export let onFileListItemClicked:(e:MouseEvent) => void;
    export let onDragStart:(e:DragEvent) => void;
    export let onDragEnter:(e:DragEvent) => void;
    export let onDragEnd:(e:DragEvent) => void;
</script>

<div id="fileList" class="file-list" class:grou-by={sortType.groupBy}>
    {#each files as file, index}

        {#if index == 0 || files[index - 1].dir != files[index].dir }
            <div class="group separator" title={file.dir} id={encodeURIComponent(file.dir)}>
                <div class="left separator"></div>
                <div class="mid separator">{file.dir}</div>
                <div class="right separator"></div>
            </div>
        {/if}

        <div
            title={file.name}
            id={file.id}
            draggable="true"
            class="playlist-item"
            class:current={playlingItemId === file.id}
            class:selected={selection.selectedIds.includes(file.id)}
            data-dir={encodeURIComponent(file.dir)}
            on:dblclick={onFileListItemClicked}
            role="button"
            tabindex="-1"
            on:dragstart={onDragStart}
            on:dragenter={onDragEnter}
            on:dragend={onDragEnd}
        >{file.name}</div>

    {/each}
</div>

