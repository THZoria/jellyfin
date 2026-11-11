# Jellyfin for CivHomebrew

**Unofficial Switch 2 client · Version 0.0.1 · THZoria / SaoriYuki**

Browse your Jellyfin libraries and watch videos in fullscreen with controller support. Your server transcodes the media, while the console uses the native player to decode H.264 video and Opus audio.

> This project requires an **already working CivHomebrew environment**. It is not available through the Nintendo eShop and does not include any game, system files, or instructions for setting up the console environment.

## Features

- Server validation before the sign-in form becomes available.
- Saved server address, with optional username and password storage.
- Libraries, folders, episodes, and paginated browsing.
- Fullscreen playback with the correct aspect ratio, pause, and 10-second seeking.
- Subtitle selection, with subtitles burned into the video by Jellyfin.
- Up to 20 seconds of forward buffering, bounded memory use, and automatic rebuffering.

## 1. Set up your Jellyfin server

If you already have a Jellyfin server accessible from your network, skip to step 2.

1. Download Jellyfin for your PC, NAS, or server from [jellyfin.org/downloads](https://jellyfin.org/downloads/), or follow the [installation documentation](https://jellyfin.org/docs/general/installation/).
2. Start the server and open `http://localhost:8096` on the machine hosting it.
3. Complete the setup wizard: choose a language, create an administrator account, and add your libraries. Add your movie and TV folders and let the library scan finish.
4. In the Jellyfin dashboard, preferably create a **dedicated playback account** without administrator permissions.
5. Allow this account to access the relevant libraries and enable **video and audio transcoding**. This client requires transcoding even when the original video is already H.264.
6. Confirm that the account can play a video in a browser.

### Optional Docker example

On a Linux server with Docker, replace the media path with your own:

```sh
docker run -d --name jellyfin --restart unless-stopped \
  -p 8096:8096 \
  -v jellyfin-config:/config \
  -v jellyfin-cache:/cache \
  -v /path/to/media:/media:ro \
  jellyfin/jellyfin
```

Add the folders under `/media` in the Jellyfin setup wizard. The named volumes preserve configuration and cache data. Refer to the official documentation for permissions, updates, and hardware acceleration.

### Transcoding and subtitles

The client requests **H.264 baseline at up to 720p / 30 fps**, with **48 kHz stereo Opus audio**. The target video bitrate is 3 Mbit/s. A server that transcodes faster than playback can maintain a useful forward buffer.

Hardware acceleration can reduce server load. Enable it only if your hardware and Jellyfin installation support it. The server burns in ASS/SSA, SRT, or bitmap subtitles such as PGS, depending on its capabilities. Subtitle burn-in can increase transcoding load.

## 2. Make the server accessible to your console

1. Connect the console and server to the same local network, or use an already working VPN.
2. Find the server's local IP address. For the **example address** `192.168.1.50`, enter:

   ```text
   http://192.168.1.50:8096
   ```

3. Allow TCP port 8096 through the server's firewall if necessary.
4. Check that this address opens Jellyfin from another device on the same network.

**Do not enter `localhost` or `127.0.0.1` on the console**: those addresses refer to the console itself, not your server.

> **The current native transport supports HTTP only, not HTTPS.** Use a trusted network or VPN. Credentials and media are not protected by TLS. Do not disable HTTPS on a public server or expose its HTTP port to the Internet to work around this limitation.

## 3. Build the application

This repository includes the client sources and the **four required Moonlight source files**, preserved without modifications alongside their upstream notices. It does not include a prebuilt `.civapp` package. See the [XITRIX / Gezine credits and third-party notices](THIRD_PARTY.md).

### PC requirements

- Git.
- Python **3.10 or newer**, with no external Python packages required.
- To run the tests: Node.js **22 or newer** and FFmpeg available in your `PATH`.

```sh
git clone https://github.com/THZoria/jellyfin.git
cd jellyfin
python tools/build.py
```

On some systems, use `python3` instead of `python`.

The build verifies the pinned Moonlight sources and notices, generates the logo and media adapter derivative, and creates:

```text
dist/jellyfin-civswitch.civapp
```

No neighboring repository, dependency download, full Moonlight checkout, C compiler, or Sunshine server is required. Once you have cloned the repository and installed Python, the build works offline.

## 4. Install in CivHomebrew

1. Open CivHomebrew on the console and enable its FTP server.
2. From an FTP client on your PC, connect to the address shown by CivHomebrew. The default port is **5000**.
3. Open the **`Install civapp`** virtual folder.
4. Upload `dist/jellyfin-civswitch.civapp` and wait for installation to finish.
5. Return to the application selector and launch **Jellyfin**.

To update the client, install the new package with the same application ID. Do not manually copy scripts into the game's save files.

## 5. Sign in for the first time

The application currently uses French interface labels. The steps below include those labels so you can find the relevant controls.

1. Select **Adresse du serveur** (Server address) and enter the complete address, including `http://` and the port if needed.
2. Select **Continuer** (Continue). The client checks Jellyfin's public API before displaying the account fields.
3. Enter your username and password.
4. Optionally, check **Memoriser mes identifiants** (Remember my credentials).
5. Select **Se connecter** (Sign in), open a library and a video, then choose **Lire** (Play).

The validated address is saved and checked again on subsequent launches. If credentials were saved after a successful sign-in, the form is prefilled. **Sign-in is not automatic.**

### Privacy and saved credentials

- The checkbox is **unchecked by default**.
- When enabled, the username and password are stored **without encryption** in `save:/civhomebrew/jellyfin-settings.json`.
- Do not share this file or any save backup containing it. Anyone with access to the files can read the password.
- Uncheck the option to remove saved credentials. If removal fails, the client displays an error. Try again before quitting.
- Validating a different server address removes the previous server's credentials.
- The session token stays in memory and is never saved.

## Controls

| Context | Control | Action |
| --- | --- | --- |
| Menus | Up / Down | Select an item |
| Library browser | Left / Right | Change page |
| Menus | A / B | Confirm / go back |
| Video | A | Pause / resume |
| Video | Left / Right | Seek backward / forward by 10 seconds; hold to accumulate |
| Video | Up | Open subtitle selection |
| Video | Down | Show controls and playback position |
| Subtitles | Up / Down, then A | Select a track or **Desactives** (Off) |
| Subtitles | B | Close the menu without leaving the video |
| Video, outside menus | B | Stop playback and return to the library browser |

Seeking or changing subtitles restarts the stream at the selected position and requires **a short buffer reload**. Pause state and the selected subtitle track are preserved when seeking. The controls overlay hides automatically.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| Server rejected or unreachable | Complete address, server IP instead of `localhost`, port 8096, network/VPN, and firewall. This client does not support HTTPS. |
| Credentials rejected / 401 | Test the account in a browser and check the username and password. |
| No playable source | Check the account's video and audio transcoding permissions and make sure the media is available. |
| Long loading times or frequent rebuffering | Check network throughput and transcoding speed in the Jellyfin dashboard. Buffering cannot compensate for a server that is consistently too slow. |
| No subtitles listed | Check that Jellyfin recognizes a subtitle track or sidecar file for the media. This client does not search online for subtitles. |
| Subtitles take a while to appear | Burn-in restarts transcoding. Check server capabilities and FFmpeg logs. |
| Server address or credentials not saved | Check for storage errors and verify the remember option. Credentials are saved only after successful authentication. |
| Native resource cannot be released | Restart Civilization VII before relaunching the client. Resources with uncertain ownership are retained for safety. |

## Development and tests

After building:

```sh
python tools/test.py
```

Tests cover sign-in, consent and storage, cancellation, seeking, subtitle parameters, aspect ratio, HTTP transport, Matroska demuxing, buffering, and resource lifetime. Synthetic video fixtures are decoded by FFmpeg on the PC.

**PC tests do not validate GPU rendering, audio, or real synchronization on the console.** Native playback and frame pacing were confirmed by the user during development. Later changes still require their own device tests.

### Project layout

```text
app.js                 UI, sign-in, libraries, and playback sessions
native-http.js         Native HTTP API requests and streaming
http-stream.js         Incremental HTTP framing
matroska.js            H.264 / Opus demuxing
native-player.js       Clock, buffering, decoding, and cleanup
vod-pacer.js           Video frame scheduling
player-layout.js       Fullscreen geometry without distortion
playback-options.js    Playback positions and subtitle selection
payload.json           Metadata and .civapp script order
tools/                 Build, packaging, and dependency verification
tests/                 Host tests and synthetic media fixtures
vendor/moonlight/      Four unchanged XITRIX/Gezine sources and upstream notices
```

Prototypes, game probes, historical investigations, and full dependency checkouts are not included. Build outputs, caches, and local settings files are ignored by Git.

## Credits and project status

Client developed by **THZoria / SaoriYuki**. Special thanks to **[XITRIX](https://github.com/XITRIX)** for Moonlight-CivSwitch and **[Gezine](https://github.com/Gezine)** for CivSwitch and the port's foundations. The native player builds on their work and that of upstream contributors. The four reused files retain their original source and attribution.

Logo: Jellyfin contributors, **CC BY-SA 4.0**, see [BRANDING.md](BRANDING.md). Notices and licensing scope: [THIRD_PARTY.md](THIRD_PARTY.md) and the [preserved upstream notices](vendor/moonlight/app/civapp-notices.js).

This is an independent project, not affiliated with Jellyfin, Nintendo, or the game's publishers. This version does not support live TV, offline downloads, audio track selection, or automatically resuming an episode from the position saved by the server.
