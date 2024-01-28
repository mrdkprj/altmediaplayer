$tags = @{}

$folder = $null

foreach($file in Get-Content $args[0]) {

  if($folder -eq $null){
    $folder = (New-Object -ComObject Shell.Application).NameSpace((Split-Path $file))
  }

  # Output the value of the "Comments" property.
  $tag = $folder.GetDetailsOf(
    $folder.ParseName((Split-Path -Leaf $file)),
    24
  )
  $tags.add($file, $tag)

}

$tags | ConvertTo-Json -Compress