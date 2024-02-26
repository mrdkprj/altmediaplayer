<script lang="ts">
    import { onMount } from "svelte";

    let tags:string[] = [];

    const deleteTag = (index:number) => {
        tags = tags.filter((_, i) => index !== i);
    }

    const addTag = () => {
        if(tags.includes("")) return;
        tags = [...tags, ""]
    }

    const save = () => {
        const sortedTags = tags.sort().filter(Boolean);
        window.api.send("save-tags", {tags:[...new Set(sortedTags)]})
        close();
    }

    const close = () => {
        window.api.send("close-tag", {})
    }

    const prepare = (e:Mp.OpenTagEditorEvent) => {
        tags = e.tags;
    }

    const onKeydown = (e:KeyboardEvent) => {
        if(e.key === "Enter"){
            e.preventDefault();
            save();
        }

        if(e.key === "Escape"){
            close();
        }
    }

    const setFocus = (taget:HTMLDivElement, index:number) => {
        if(!tags[index]){
            taget.focus();
        }
    }

    onMount(() => {

        window.api.receive("open-tag-editor", prepare);

        return () => {
            window.api.removeAllListeners("open-tag-editor")
        }

    })
</script>

<svelte:document on:keydown={onKeydown}/>

<div class="viewport" >
    <div class="title-bar">
        <div class="close-btn" on:click={close} on:keydown={onKeydown} role="button" tabindex="-1">&times;</div>
    </div>
    <div class="manager">
        <div class="tags">
            {#each tags as tag, index}
                <div class="tag">
                    <div class="tag-text" contenteditable="true" on:keydown={onKeydown} bind:textContent={tags[index]} use:setFocus={index} spellcheck="false" role="button" tabindex="-1">{tag}</div>
                    <div class="delete" on:click={() => deleteTag(index)} on:keydown={onKeydown} role="button" tabindex="-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>
                        </svg>
                    </div>
                </div>
            {/each}
            <div class="add tag">
                <button class="btn-sm" on:click={addTag}>+</button>
            </div>
        </div>
        <div class="buttons">
            <button class="btn" on:click={save}>Save</button>
            <button class="btn" on:click={close}>Close</button>
        </div>
    </div>
</div>

<style>

    .manager{
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .tags{
        flex: 1 1 auto;
        margin: 10px;
        overflow-y: scroll;
    }

    .tag{
        display: flex;
        padding: 5px 10px;
        justify-content: flex-end;
        align-items: center;
    }

    .tag-text{
        font-size: 14px;
        line-height: 20px;
        width: calc(100% - 20px);
        border-bottom: 1px solid transparent;
        cursor: auto;
        white-space: nowrap;
        overflow: hidden;
    }

    .tag-text:focus{
        border-bottom: 1px solid;
    }

    .delete{
        width:15px;
        height: 15px;
        margin-left: 5px;
    }

    .buttons{
        display: flex;
        justify-content: space-around;
    }

    .btn{
        line-height: 2.5rem;
        border: 1px solid var(--button-border-color);
        border-radius: 5px;
        background-color: var(--button-bgcolor);
        color: var(--button-color);
        cursor: pointer;
        padding: 0px 20px;
    }

    .btn:not([disabled]):hover{
        background-color: var(--secondary-highlight-color);
        color: var(--secondary-forecolor);
    }

    .btn:disabled{
        background-color: var(--button-disabled);
        opacity: 0.5;
        cursor: auto;
    }

    .btn-sm{
        border: none;
        color:#fff;
        background-color: #5f5b5b;
        border-radius: 4px;
        margin: 10px 0;
        padding: 3px 10px;
    }
</style>