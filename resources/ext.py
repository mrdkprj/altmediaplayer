import subprocess, re, os
import json

LINE_PATTERN = r" +\S+ +(\S+)"
EXT_PATTERN = r"Common extensions: (.+)\."
MIME_PATTERN = r"Mime type: (.+)\."
CODEC_PATTERN = r"Default (video|audio) codec:"

video_ext_file = "video.ext.json"
audio_ext_file = "audio.ext.json"

ffmpeg = os.path.join(os.getcwd(), "..", "resources", "ffmpeg.exe");

# Get muxers
output = subprocess.getoutput([ffmpeg, "-hide_banner", "-muxers"])
lines = output.split("\n")[4:]

v_muxers = set()
a_muxers = set()
notfound = {}

for line in lines:

  muxer = re.findall(LINE_PATTERN, line)[0]

  info = subprocess.getoutput([ffmpeg, "-hide_banner", "-h", f"muxer={muxer}"])
  exts = re.findall(EXT_PATTERN, info)

  if not exts:
    continue

  ext = exts[0].split(",")
  is_audio = None

  mime_type_line = re.findall(MIME_PATTERN, info)
  codecs = re.findall(CODEC_PATTERN, info)

  if mime_type_line:
    if "video" in mime_type_line[0]:
      is_audio = False

    if "audio" in mime_type_line[0]:
      is_audio = True

  if is_audio == None and codecs:
    if len(codecs) == 1 and codecs[0] == "audio":
      is_audio = True
    else:
      is_audio = False

  if is_audio == None:
    notfound[muxer] = info
    continue

  if is_audio:
    [a_muxers.add(f".{x.strip()}") for x in ext]
  else:
    [v_muxers.add(f".{x.strip()}") for x in ext]

video_exts = sorted(v_muxers)
audio_exts = sorted(a_muxers)

f = open(video_ext_file, "w")
f.write(json.dumps(list(video_exts), indent=4))
f.close()

f = open(audio_ext_file, "w")
f.write(json.dumps(list(audio_exts), indent=4))
f.close()

f = open("notfound.json", "w")
f.write(json.dumps(notfound, indent=4))
f.close()
