$file = $Args[0]

#$propIndex = 24  # Comments

$folder = (New-Object -ComObject Shell.Application).NameSpace((Split-Path $file))

# Output the value of the "Comments" property.
$folder.GetDetailsOf(
  $folder.ParseName((Split-Path -Leaf $file)),
  24
)
