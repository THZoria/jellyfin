# Native-player host fixtures

Generated locally from FFmpeg lavfi test sources, not from game files or a Jellyfin account. Both `native-av.mkv` and `native-av-live.mkv` contain H.264 baseline video and 48 kHz stereo Opus audio. The latter uses non-seekable output to exercise unknown-size Matroska segments. They are used by host demuxing, transport, and clock tests and are not included in the `.civapp` or displayed as console test screens.
