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

The web UI can also change where a package goes (`POST /move` on MOVER_PORT, proxied by nginx):
the staging folder is renamed to the new place and JD2 is told about it, since JD2's own
`setDownloadDirectory` only records the folder without moving files.
"""
import json
import os
import re
import shutil
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

API_URL = os.environ.get("JD_API_URL", "http://jdownloader:3128")
STAGING_DIR = os.environ.get("STAGING_DIR", "/output")
LIBRARY_DIR = os.environ.get("LIBRARY_DIR", "/library")
POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "15"))
MOVER_PORT = int(os.environ.get("MOVER_PORT", "8080"))
# Seconds to wait for JD2 to stop the running downloads of a package before moving it
STOP_TIMEOUT = 30
# Start of the package comments written by the mover (the web UI recognizes it)
COMMENT_PREFIX = "Spostamento:"

# The poll loop and the move requests of the web UI never touch the files at the same time
lock = threading.Lock()
# Problems already shown in package comments (uuid -> message), logged once
reported = {}

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
    # Unknown password: fail right away instead of waiting (and holding the extraction
    # queue) for a desktop dialog nobody sees; the web UI retries with a password
    (*EXTRACTION, "AskForUnknownPasswordsEnabled", False),
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


# Volume suffix of a multi-part archive: name.part01.rar, name.r00, name.7z.001, name.z01
VOLUME_SUFFIX = re.compile(r"(\.part\d+\.rar|\.r\d\d|\.z\d\d|\.\d{3})$", re.IGNORECASE)


def archive_names(file_names):
    """Collapse the volumes of multi-part archives into one name each."""
    split = {n: VOLUME_SUFFIX.search(n) for n in file_names}
    multi = {n[: m.start()] for n, m in split.items() if m}
    names = []
    for name, match in split.items():
        base = name[: match.start()] if match else name
        # Old-style RAR: the first volume is plain name.rar, the next ones name.r00, name.r01…
        if not match and name.lower().endswith(".rar") and name[:-4] in multi:
            base = name[:-4]
        label = f"{base} (più parti)" if base in multi else base
        if label not in names:
            names.append(label)
    return names


def readiness(package_uuid, links):
    """Return ("ready" | "wait" | "error", detail) for a finished package."""
    failed = [l["name"] for l in links if l.get("extractionStatus", "").startswith("ERR")]
    if failed:
        return "error", "estrazione non riuscita (password?): " + ", ".join(archive_names(failed))
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


def report(package, message):
    """Log a problem once and show it in the package comment."""
    if reported.get(package["uuid"]) == message:
        return
    reported[package["uuid"]] = message
    log(f"{package['name']}: {message}")
    call("/downloadsV2/setComment", [], [package["uuid"]], False, f"{COMMENT_PREFIX} {message}")


def poll(ready_before):
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
            report(package, detail)
            continue
        if state == "wait":
            # E.g. extracting again with a password: the old error no longer applies
            if (package.get("comment") or "").startswith(COMMENT_PREFIX):
                call("/downloadsV2/setComment", [], [uuid], False, "")
                reported.pop(uuid, None)
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
            report(package, str(error))
            continue
        call("/downloadsV2/removeLinks", [], [uuid])
        remove_staging(src)
        reported.pop(uuid, None)
        log(f"{package['name']}: {moved} file spostati")
    return ready_now


class MoveRequestError(Exception):
    """A move request the web UI can show to the user as is."""


def managed_folder(directory):
    """Normalize a package folder chosen in the web UI; it must be `<staging>/<kind>/<name>…`."""
    directory = os.path.normpath(directory)
    if not destination(directory) or os.path.relpath(directory, STAGING_DIR).count(os.sep) < 1:
        raise MoveRequestError(f"cartella non gestita dal mover: {directory}")
    return directory


def move_folder(src, dst):
    """Rename `src` to `dst` (same disk, no copy); merge into an existing `dst` without overwriting."""
    if dst == src or dst.startswith(src + os.sep):
        raise MoveRequestError("la nuova cartella è dentro quella attuale")
    if not os.path.isdir(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        os.rename(src, dst)
        return
    entries = os.listdir(src)
    clashes = [name for name in entries if os.path.lexists(os.path.join(dst, name))]
    if clashes:
        raise MoveError(f"nella destinazione esiste già: {', '.join(sorted(clashes))}")
    for name in entries:
        os.rename(os.path.join(src, name), os.path.join(dst, name))
    os.rmdir(src)


def remove_empty_parents(path):
    """Remove the empty folders left above a moved package, up to the kind folder."""
    parent = os.path.dirname(os.path.normpath(path))
    while os.path.relpath(parent, STAGING_DIR).count(os.sep) >= 1:
        try:
            os.rmdir(parent)
        except OSError:
            break
        parent = os.path.dirname(parent)


def running_links(uuid):
    return [l for l in call("/downloadsV2/queryLinks", {"packageUUIDs": [uuid], "running": True}) if l.get("running")]


def move_package(uuid, directory):
    """Move the staging folder of a package to `directory` and point JD2 at it.

    Running downloads are paused meanwhile and resume in the new folder.
    """
    directory = managed_folder(directory)
    packages = call("/downloadsV2/queryPackages", {"packageUUIDs": [uuid], "saveTo": True, "comment": True})
    if not packages:
        raise MoveRequestError("pacchetto non trovato in JD2")
    package = packages[0]
    src = os.path.normpath(package.get("saveTo", ""))
    if src == directory:
        return
    links = call("/downloadsV2/queryLinks", {"packageUUIDs": [uuid], "enabled": True, "finished": True})
    paused = []
    if running_links(uuid):
        # Running downloads keep writing in the old folder: stop them while it moves
        paused = [l["uuid"] for l in links if l.get("enabled") and not l.get("finished")]
        call("/downloadsV2/setEnabled", False, paused, [])
        deadline = time.monotonic() + STOP_TIMEOUT
        while running_links(uuid):
            if time.monotonic() > deadline:
                call("/downloadsV2/setEnabled", True, paused, [])
                raise MoveError("JD2 non ha fermato i download in corso")
            time.sleep(0.5)
    try:
        if os.path.isdir(src):
            move_folder(src, directory)
            remove_empty_parents(src)
        call("/downloadsV2/setDownloadDirectory", directory, [uuid])
    finally:
        if paused:
            call("/downloadsV2/setEnabled", True, paused, [])
    # A package that could not be moved to the library gets a new try at the new destination
    if (package.get("comment") or "").startswith(COMMENT_PREFIX):
        call("/downloadsV2/setComment", [], [uuid], False, "")
        reported.pop(uuid, None)
    log(f"{package.get('name', uuid)}: destinazione cambiata in {os.path.relpath(directory, STAGING_DIR)}")


class MoveHandler(BaseHTTPRequestHandler):
    """`POST /move {"uuid": <package>, "directory": "<staging folder>"}` from the web UI."""

    def log_message(self, *args):
        pass

    def reply(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        if self.path != "/move":
            return self.reply(404, {"error": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))))
            uuid, directory = int(body["uuid"]), str(body["directory"])
        except (ValueError, KeyError, TypeError):
            return self.reply(400, {"error": "richiesta non valida"})
        if not lock.acquire(timeout=10):
            return self.reply(503, {"error": "il mover sta spostando un altro pacchetto, riprova tra poco"})
        try:
            move_package(uuid, directory)
        except MoveRequestError as error:
            self.reply(400, {"error": str(error)})
        except MoveError as error:
            self.reply(409, {"error": str(error)})
        except urllib.error.URLError as error:
            self.reply(502, {"error": f"JD2 non raggiungibile: {error}"})
        except (OSError, ValueError) as error:
            log(f"spostamento richiesto dal pannello non riuscito: {error}")
            self.reply(500, {"error": str(error)})
        else:
            self.reply(200, {"saveTo": directory})
        finally:
            lock.release()


def serve_requests():
    server = ThreadingHTTPServer(("", MOVER_PORT), MoveHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    log(f"richieste del pannello sulla porta {MOVER_PORT}")


def main():
    log(f"mover: {STAGING_DIR} -> {LIBRARY_DIR} ({', '.join(sorted(os.listdir(LIBRARY_DIR)))})")
    serve_requests()
    connected = False
    ready = set()
    while True:
        try:
            if not connected:
                apply_settings()
                connected = True
                log("JD2 raggiungibile")
            with lock:
                ready = poll(ready)
        except (urllib.error.URLError, OSError, ValueError) as error:
            if connected:
                log(f"JD2 non raggiungibile: {error}")
            connected = False
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
