
type ListProps = {
    playlingItemId:string;
    files:Mp.MediaFile[],
    selection:Mp.PlaylistItemSelection;
    sortType:Mp.SortType;
    onFileListItemClicked:(e:React.MouseEvent) => void;
    onDragStart:(e:React.DragEvent) => void;
    onDragEnter:(e:React.DragEvent) => void;
    onDragEnd:(e:React.DragEvent) => void;
}

export const List = (props:ListProps) => {

    const createListItem = (file:Mp.MediaFile) => {

        return (
            <div
                key={file.id}
                title={file.name}
                id={file.id}
                draggable="true"
                className={`playlist-item ${props.playlingItemId === file.id ? "current" : ""} ${props.selection.selectedIds.includes(file.id) ? "selected" : ""}`}
                data-dir={encodeURIComponent(file.dir)}
                onDoubleClick={props.onFileListItemClicked}
                onDragStart={props.onDragStart}
                onDragEnter={props.onDragEnter}
                onDragEnd={props.onDragEnd}
            >{file.name}</div>
        )
    }

    const createSeparator = (file:Mp.MediaFile) => {

        return (
            <div key={encodeURIComponent(file.dir)} className="group separator" title={file.dir} id={encodeURIComponent(file.dir)}>
                <div className="left separator"></div>
                <div className="mid separator">{file.dir}</div>
                <div className="right separator"></div>
            </div>
        );
    }

    const renderPlaylistItems = () => {

        const items:JSX.Element[] = [];

        let key = ""

        props.files.forEach(file => {

            if(file.dir != key){
                key = file.dir;
                items.push(createSeparator(file))
            }

            items.push(createListItem(file))

        })

        return items;
    }

    return (
        <div key="fileList" id="fileList" className={`file-list ${props.sortType.groupBy ? "group-by" : "" }`}>{renderPlaylistItems()}</div>
    )
}