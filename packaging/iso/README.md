# Knits live ISO

A bootable Debian 12 image that starts straight into the Knits desktop. There is no
installer, no desktop environment and no second app: the image installs the same
`.deb` the website hands out, logs in a `knits` user on tty1, starts X and runs
Chromium in kiosk mode against `127.0.0.1`, so the screen is the app build of Knits
(menu bar, dock, Finder, Terminal, Safari, Store, Wi-Fi, updates and all).

Everything the desktop needs is in the image; nothing is downloaded at boot.

## What is in it

| Piece | Where it comes from |
| --- | --- |
| Base | Debian 12 (bookworm), amd64, `main` only |
| Session | `xserver-xorg` + `xinit`, no display manager, no GNOME/KDE/XFCE |
| Browser | Debian's `chromium`, kiosk mode, Google as its search engine |
| Desktop | the `knits` package, installed from `config/packages.chroot/` |
| Boot | live-boot / live-config, BIOS and UEFI |

`config/hooks/live/0100-knits.hook.chroot` is where the image stops being plain
Debian: it creates the `knits` user, writes `~/.bash_profile` and `~/.xinitrc`,
installs `/usr/local/bin/knits-kiosk-browser`, enables autologin on tty1 and sets
`/etc/os-release` and `/etc/issue` to say Knits.

## Build it

Needs a Debian or Ubuntu host (or the GitHub Actions runner) and root:

```bash
sudo apt install live-build debootstrap squashfs-tools xorriso
npm run build            # app bundle + .deb
sudo bash scripts/build-iso.sh
```

The script configures live-build, copies the freshly built `.deb` into the chroot,
builds, and writes:

- `dist/knits-<version>-amd64.iso`
- `dist/knits-amd64.iso` — the stable name the download button links to
- `dist/knits-<version>-amd64.iso.sha256`

The build directory is `dist/iso/`; delete it to force a clean rebuild.

`.github/workflows/iso.yml` does the same on every `v*` tag, and on demand from the
Actions tab, then uploads the image to the `iso` GitHub release — which is what
`https://github.com/snimmagadda2-alt/Knits/releases/download/iso/knits-amd64.iso`
serves.

## Boot it

**QEMU** (fastest, no USB stick):

```bash
qemu-system-x86_64 -m 4096 -smp 2 -enable-kvm \
  -cdrom dist/knits-amd64.iso
```

**VirtualBox / UTM**: new Debian 64-bit machine, 4 GB RAM, 2 CPUs, no virtual hard
disk, attach the ISO to the optical drive. If it drops to a shell, turn EFI off.

**USB stick**:

```bash
sudo dd if=dist/knits-amd64.iso of=/dev/sdX bs=4M status=progress oflag=sync
```

Rufus, balenaEtcher and Ventoy work as well. The image is unsigned, so Secure Boot
has to be off.

The first boot takes about a minute. Then Knits' welcome screen asks for your name,
then a password, and the login screen asks for that password.

## Live means live

The system runs from RAM. Notes, installed apps, preferences and the account you
create are written to the browser profile inside the running system, so they
disappear when you shut down — nothing touches the disk you booted from. Use
live-boot persistence (`persistence` on a second partition) if you want the account
to survive reboots.

The text consoles are still there: `Ctrl+Alt+F2` gives a shell as `knits`, password
`knits`.
