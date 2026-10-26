# Walletbeat TV

The standalone launchers work without Node, Git, `pnpm`, Homebrew, or a repository
checkout. They reuse supported Node installations with npm, cached matching
Playwright packages, and an installed matching Chromium. Missing dependencies are
downloaded automatically. Downloaded Node archives are checksum-verified.
Closing TV removes its temporary session and browser profile; dependencies remain
cached for later runs. Missing Linux system libraries are installed through the OS
package manager when needed.

Use a macOS 14+, Windows 11+, or supported Debian/Ubuntu desktop account that can
run downloaded programs. Browser-only guest sessions cannot run a native launcher.
Linux desktops missing Chromium system libraries need administrator access for
that dependency step. See [Playwright's platform requirements](https://playwright.dev/docs/intro#system-requirements).

## First setup

The release assets are `walletbeat-tv.sh` for macOS/Linux and `walletbeat-tv.ps1`
for Windows. After publishing the Walletbeat TV release, run one command:

macOS or Linux, in Terminal:

```sh
(if command -v curl >/dev/null 2>&1; then curl -fsSL https://github.com/walletbeat/walletbeat/releases/download/walletbeat-tv/walletbeat-tv.sh; else wget -qO- https://github.com/walletbeat/walletbeat/releases/download/walletbeat-tv/walletbeat-tv.sh; fi) | sh
```

Windows, in PowerShell:

```powershell
& ([ScriptBlock]::Create((Invoke-WebRequest -UseBasicParsing 'https://github.com/walletbeat/walletbeat/releases/download/walletbeat-tv/walletbeat-tv.ps1').Content))
```

## Open, close, reopen

Run the setup command once. It leaves a reusable **Walletbeat TV** launcher:

| Laptop  | Open or reopen                                         |
| ------- | ------------------------------------------------------ |
| macOS   | Double-click `Walletbeat TV.command` on the Desktop.   |
| Windows | Double-click `Walletbeat TV.cmd` on the Desktop.       |
| Linux   | Search for **Walletbeat TV** in the applications menu. |

The launcher remembers the site URL used during setup and checks its dependencies
on every run. Keep its terminal window open; you can minimize it once the browser
opens. Move, click, type, or scroll to browse normally. TV resumes after 15 seconds
without input.

To close, use `Command+Q` on macOS, `Alt+F4` on Windows/Linux, or Control+C in the
launch terminal. To start again, use the same icon. A normal close ends the tour.
If the browser freezes, close its window and reopen TV.

If a launch fails, the shortcut keeps the error visible. Press Enter to retry,
or type Q and press Enter to quit. A simultaneous launch asks you to close the
existing instance first. Reopening reuses cached dependencies; you do not need
to repeat setup or reinstall anything.

If the shortcut could not be created, setup prints the reason. Keep the downloaded
launcher as a fallback:

```sh
sh ~/Downloads/walletbeat-tv.sh
```

```powershell
& ([ScriptBlock]::Create((Get-Content -Raw "$HOME/Downloads/walletbeat-tv.ps1")))
```

Checks with `--check` or `--check-headed` do not create shortcuts. Linux uses a
[desktop application entry](https://specifications.freedesktop.org/desktop-entry/latest-single/),
so an applications menu is sufficient even when desktop icons are disabled.
The Windows shortcut uses built-in
[Windows PowerShell](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.core/about/about_powershell_exe)
without changing execution policy.

## Repeat runs

Supported installed Node versions are 22, 24, and 26. When Node or npm is missing
or incompatible, TV uses its own cached runtime and downloads it only if needed.
The exact Playwright version comes from the launcher; another installed version
is not substituted. Chromium is reused from Playwright's normal browser cache,
or from `PLAYWRIGHT_BROWSERS_PATH` when set. A normal Chrome installation does
not replace the matching Playwright browser.

TV stores its runtime, Playwright packages, and npm download cache in:

- macOS: `~/Library/Caches/walletbeat-tv`
- Windows: `%LOCALAPPDATA%/walletbeat-tv`
- Linux: `${XDG_CACHE_HOME:-$HOME/.cache}/walletbeat-tv`

Deleting the dependency cache is safe: the icon can install missing dependencies
again. Reusable launchers live separately in `~/Library/Application Support/walletbeat-tv`
on macOS and `${XDG_DATA_HOME:-$HOME/.local/share}/walletbeat-tv` on Linux. Windows stores reusable launchers in `%APPDATA%/walletbeat-tv`. To uninstall, also remove the reusable
launcher directory and the Desktop icon or Linux application entry.
Matching browsers use
Playwright's shared cache, so other Playwright tools can reuse them too. Each run
still checks that Chromium can launch before starting the tour.

Only one Walletbeat TV launcher can use a user's cache at a time. A simultaneous
launch exits with a clear message; OS locks release when the launcher ends.
Missing browsers are downloaded, and a launch failure indicating a damaged
executable triggers one forced browser reinstall. Unrelated environment errors,
such as a missing graphical display, remain visible without a reinstall.
Before downloading, TV checks free space on the temporary and cache volumes.
If space is insufficient, free space at the reported location and rerun the same
command.

## Fresh-device dependencies

| Platform                                                        | Already supplied by the OS                                               | Downloaded by TV          | Possible extra requirement                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------- |
| macOS 14+, Intel or Apple Silicon                               | Terminal, shell, `curl`, `tar`, `base64` and SHA-256 tools               | Private Node and Chromium | Permission to run downloaded applications                                                 |
| Windows 11+, x64 or ARM64                                       | Windows PowerShell 5.1, HTTPS download, ZIP extraction and SHA-256 tools | Private Node and Chromium | Permission to run downloaded applications                                                 |
| Debian 12/13 or Ubuntu 22.04/24.04/26.04 desktop (x64 or ARM64) | Shell and archive utilities; downloader availability varies              | Private Node and Chromium | Missing browser libraries are installed automatically; administrator access may be needed |

Windows does not need PowerShell 7, Git Bash, WSL, or a changed execution policy.
macOS does not need Xcode Command Line Tools or Rosetta. Linux needs a graphical
desktop session; a minimal server installation is not a TV display. The download
command tries `curl`, then `wget`. At least one must be installed, including
when the launcher itself was downloaded in a browser. Minimal distributions
without either need a downloader installed first.

The [Ubuntu 26.04 desktop image manifest](https://releases.ubuntu.com/26.04/ubuntu-26.04-desktop-amd64.manifest)
includes `wget` without `curl`; the [Debian 13.7 GNOME image manifest](https://cdimage.debian.org/debian-cd/current-live/amd64/iso-hybrid/debian-live-13.7.0-amd64-gnome.iso.packages)
includes `curl`. Both include core Chromium networking and accessibility libraries, but TV
checks the actual device instead of assuming every desktop installation matches
the image.

These boundaries follow [Playwright's current system requirements](https://playwright.dev/docs/intro#system-requirements),
[the pinned Node runtime's platform requirements](https://github.com/nodejs/node/blob/v24.22.1/BUILDING.md#platform-list),
[Microsoft's Windows PowerShell documentation](https://learn.microsoft.com/en-us/powershell/scripting/what-is-windows-powershell),
and [Apple's Terminal documentation](https://support.apple.com/guide/terminal/intro-to-shell-scripts-apd53500956-7c5b-496b-a362-2845f2aab4bc/mac).
Other Linux distributions, ChromeOS, browser-only guest sessions, and managed
accounts that forbid downloaded programs are outside this installation contract.

Pass a compatible Walletbeat deployment URL to use another site. The default is
`https://beta.walletbeat.eth.limo`.

```sh
sh ~/Downloads/walletbeat-tv.sh https://beta.walletbeat.eth.limo
```

```powershell
& ([ScriptBlock]::Create((Get-Content -Raw "$HOME/Downloads/walletbeat-tv.ps1"))) -Url 'https://beta.walletbeat.eth.limo'
```

The launcher checks a real Chromium process before starting TV. On Linux, missing
shared libraries trigger Playwright's dependency installer automatically, followed
by another browser check. This can request an administrator password in the same
terminal; no second command is needed. Without permission to install missing OS
libraries, that device cannot complete setup. `--with-deps` installs them upfront.

To build the two self-contained release assets from this checkout:

```sh
pnpm walletbeat-tv:build-launchers /tmp/walletbeat-tv
```

Upload the resulting `.sh` and `.ps1` files to the `walletbeat-tv` GitHub release.
They embed the current tour and derive the Playwright version from the project's
package manifest. The installer does not fetch moving source files at runtime.
The installation workflow is configured to check the native launcher on macOS,
Windows, and Linux.
Run a downloaded shell launcher with `--check`, or PowerShell with `-Check`, to
install and verify Chromium without starting the tour. Use `--check-headed`, or
PowerShell `-CheckHeaded`, to verify a visible full-screen window as well. The
native CI matrix covers Intel and ARM machines on each OS, with cold installation
and offline repeat runs. Windows cold checks remove installed Node from PATH.
Linux also checks a minimal Ubuntu image without Node or browser libraries.

For development, install the repository dependencies and Chromium, then run:

```sh
pnpm install
pnpm exec playwright install chromium
pnpm dev
```

Keep the development server running and use a second terminal for TV:

```sh
pnpm walletbeat-tv http://localhost:4321
```

The development command defaults to `http://localhost:4321`. Chromium hides its
tabs, address bar, and toolbar. The site uses the full display. Close the browser
or press Control+C in its terminal to stop.

The tour cycles through the home table, a randomly selected wallet and two
consecutive attribute groups, a security news, stages, or standards page, and
an About or FAQ page. It uses existing menus and anchors to navigate.

The cursor follows gentle curves, with travel time based on distance. It slows
as it reaches a control and changes to a hand over clickable content. Hovers
reveal real ratings and tooltips. During reading, it moves to nearby clear space. Its position survives navigation.
Passive playback favors spectacle and breadth, with short hovers and brief pauses.
Scrolls accelerate and decelerate between content blocks, usually advancing two
paragraphs at a time. Long sections get a continuous pass with a steady middle
speed. Take control to explore and read at your own pace.

On the home table, the tour combines filters from different groups and compares
sort orders. It then chooses a wallet, inspects one group and a specific
attribute rating, and opens that same wallet report. Uninterrupted demonstrations restore the
filter and sort selections. An empty table can recover through Reset Filters.
On wallet reports, it opens a closed explanation and prefers groups containing
version-specific ratings. It compares versions when their caption comes into
view, framing the affected attribute before switching and pausing on its updated
explanation afterward. Single-version wallets still show
their explanations and full groups.
On other pages, TV opens a visible disclosure to show its content. It also
demonstrates a standards filter and restores the original selection.

Move the mouse, click, type, touch, or scroll to take control immediately.
Automation stops and the virtual cursor disappears. After **15 seconds** without
input, the tour resumes from the current page and nearby attribute group or
scroll position. Filters changed by the visitor remain available when browsing.
External pages are left under manual control until a Walletbeat tab is selected.
Close the window or press Control+C in the terminal to stop.

While its site tab is visible, TV requests a screen wake lock and reacquires it
when the tab becomes visible again. The OS can refuse this request, for example
on low battery. TV respects manual device locking and lid closure; it does not
change global power settings. See [Chrome's screen wake lock guidance](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock).

TV requires the matching Walletbeat navigation UI. Incompatible deployments stop
with an actionable error. Transient failures get bounded retries. After repeated
tour failures, TV attempts to return home through the site's own menu once. If
that recovery fails or the same problem persists, TV exits with the error instead
of retrying forever. Human input still takes control immediately during recovery.
