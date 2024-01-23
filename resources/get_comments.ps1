$tags = @{}

$folder = (New-Object -ComObject Shell.Application).NameSpace((Split-Path $args[0]))

foreach($file in $args){

  # Output the value of the "Comments" property.
  $tag = $folder.GetDetailsOf(
    $folder.ParseName((Split-Path -Leaf $file)),
    24
  )
  $tags.add($file, $tag)

}

$tags | ConvertTo-Json -Compress