#!/usr/bin/env python3
"""Move finished and extracted JDownloader2 packages from the staging area to the library.

Packages are downloaded and extracted in STAGING_DIR (fast disk). The first path component
below it picks the library root with the same name under LIBRARY_DIR, and the rest of the
path is kept:

    /output/movies/<Title>                 -> /library/movies/<Title>
    /output/shows/<Show>/Stagione <N>      -> /library/shows/<Show>/Stagione <N>
    /output/downloads/<Package>            -> /library/downloads/<Package>

Packages saved anywhere else are left alone. A package is moved once it is finished and
every archive in it has been extracted; afterwards it is removed from the download list.
Nothing is overwritten: on conflicts or extraction errors the package stays where it is and
the reason is written in its comment.
"""
import json
import os
import shutil
import time
import urllib.error
import urllib.request

API_URL = os.environ.get("JD_API_URL", "http://jdownloader:3128")
STAGING_DIR = os.environ.get("STAGING_DIR", "/output")
LIBRARY_DIR = os.environ.get("LIBRARY_DIR", "/library")
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "15"))

EXTRACTION = (
    "org.jdownloader.extensions.extraction.ExtractionConfig",
    "cfg/org.jdownloader.extensions.extraction.ExtractionExtension",
)
GENERAL = ("org.jdownloader.settings.GeneralSettings", None)
LINKGRABBER = ("org.jdownloader.gui.views.linkgrabber.addlinksdialog.LinkgrabberSettings", None)

# JD2 settings this workflow relies on, applied whenever JD2 (re)appears.
JD_SETTINGS = [
    # Extract next to the archives, then delete them: only the content is left to move
    (*EXTRACTION, "CustomExtractionPathEnabled", False),
    (*EXTRACTION, "SubpathEnabled", False),
    (*EXTRACTION, "DeleteArchiveFilesAfterExtractionAction", "NULL"),
    # Keep the links: their extraction status tells when the package is ready
    (*EXTRACTION, "DeleteArchiveDownloadlinksAfterExtraction", False),
    # Links added without a destination (e.g. from the JD2 GUI) end up in downloads
    (*GENERAL, "DefaultDownloadFolder", f"{STAGING_DIR}/downloads"),
    (*LINKGRABBER, "UseLastDownloadDestinationAsDefault", False),
]


def log(message):
    print(time.strftime("%Y-%m-%d %H:%M:%S"), message, flush=True)


def call(path, *params):
    """Call a JD2 API method with positional params and return the unwrapped result."""
    request = urllib.request.Request(
        API_URL + path,
        data=json.dumps({"params": list(params)}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response).get("data")


def apply_settings():
    for interface, storage, key, value in JD_SETTINGS:
        if call("/config/get", interface, storage, key) != value:
            call("/config/set", interface, storage, key, value)
            log(f"JD2: {key} = {value}")


class MoveError(Exception):
    pass


def destination(save_to):
    """Library folder for a package saved in `save_to`, or None if it is not managed."""
    rel = os.path.relpath(os.path.normpath(save_to), STAGING_DIR)
    if rel.startswith("..") or rel == ".":
        return None
    root = rel.split(os.sep)[0]
    if not os.path.isdir(os.path.join(LIBRARY_DIR, root)):
        return None
    return os.path.join(LIBRARY_DIR, rel)


def readiness(package_uuid, links):
    """Return ("ready" | "wait" | "error", detail) for a finished package."""
    failed = [l["name"] for l in links if l.get("extractionStatus", "").startswith("ERR")]
    if failed:
        return "error", "estrazione non riuscita: " + ", ".join(failed)
    if any(l.get("extractionStatus") not in (None, "SUCCESSFUL") for l in links):
        return "wait", "estrazione in corso"
    extracted = {l["name"] for l in links if l.get("extractionStatus") == "SUCCESSFUL"}
    # Right after the download JD2 has not set the status yet: an archive with no
    # extracted part is still waiting for (or running) its extraction.
    for archive in call("/extraction/getArchiveInfo", [], [package_uuid]) or []:
        if not extracted & set(archive.get("states", {})):
            return "wait", f"archivio da estrarre: {archive.get('archiveName')}"
    return "ready", ""


def move_tree(src, dst, skip):
    """Move every file of `src` into `dst`, keeping the layout; never overwrite."""
    moves = []
    for root, _dirs, files in os.walk(src):
        for name in files:
            if root == src and name in skip:
                continue
            source = os.path.join(root, name)
            moves.append((source, os.path.join(dst, os.path.relpath(source, src))))
    conflicts = [os.path.relpath(target, LIBRARY_DIR) for _, target in moves if os.path.lexists(target)]
    if conflicts:
        raise MoveError("esistono già: " + ", ".join(conflicts))
    for source, target in moves:
        os.makedirs(os.path.dirname(target), exist_ok=True)
        # Copy under a hidden name and rename: the library never sees half files
        partial = os.path.join(os.path.dirname(target), f".{os.path.basename(target)}.moving")
        shutil.copyfile(source, partial)
        stat = os.stat(source)
        os.utime(partial, (stat.st_atime, stat.st_mtime))
        os.replace(partial, target)
        os.remove(source)
        log(f"  {os.path.relpath(target, LIBRARY_DIR)}")
    return len(moves)


def remove_staging(src):
    """Delete what is left of a package folder and its empty parents in staging."""
    shutil.rmtree(src, ignore_errors=True)
    parent = os.path.dirname(os.path.normpath(src))
    while os.path.relpath(parent, STAGING_DIR).count(os.sep) >= 1:
        try:
            os.rmdir(parent)
        except OSError:
            break
        parent = os.path.dirname(parent)


def report(package, message, reported):
    """Log a problem once and show it in the package comment."""
    if reported.get(package["uuid"]) == message:
        return
    reported[package["uuid"]] = message
    log(f"{package['name']}: {message}")
    call("/downloadsV2/setComment", [], [package["uuid"]], False, f"Spostamento: {message}")


def poll(ready_before, reported):
    packages = call("/downloadsV2/queryPackages", {"saveTo": True, "finished": True, "comment": True})
    links = call("/downloadsV2/queryLinks", {"finished": True, "extractionStatus": True})
    by_package = {}
    for link in links:
        by_package.setdefault(link["packageUUID"], []).append(link)

    ready_now = set()
    for package in packages:
        uuid = package["uuid"]
        dst = destination(package.get("saveTo", ""))
        if not dst or not package.get("finished"):
            continue
        package_links = by_package.get(uuid, [])
        state, detail = readiness(uuid, package_links)
        if state == "error":
            report(package, detail, reported)
            continue
        if state == "wait":
            continue
        # Ready on two polls in a row: no surprises from half-updated states
        ready_now.add(uuid)
        if uuid not in ready_before:
            continue
        src = os.path.normpath(package["saveTo"])
        skip = {l["name"] for l in package_links if l.get("extractionStatus") == "SUCCESSFUL"}
        log(f"{package['name']}: sposto in {os.path.relpath(dst, LIBRARY_DIR)}")
        try:
            moved = move_tree(src, dst, skip) if os.path.isdir(src) else 0
        except (MoveError, OSError) as error:
            report(package, str(error), reported)
            continue
        call("/downloadsV2/removeLinks", [], [uuid])
        remove_staging(src)
        reported.pop(uuid, None)
        log(f"{package['name']}: {moved} file spostati")
    return ready_now


def main():
    log(f"mover: {STAGING_DIR} -> {LIBRARY_DIR} ({', '.join(sorted(os.listdir(LIBRARY_DIR)))})")
    connected = False
    ready, reported = set(), {}
    while True:
        try:
            if not connected:
                apply_settings()
                connected = True
                log("JD2 raggiungibile")
            ready = poll(ready, reported)
        except (urllib.error.URLError, OSError, ValueError) as error:
            if connected:
                log(f"JD2 non raggiungibile: {error}")
            connected = False
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
