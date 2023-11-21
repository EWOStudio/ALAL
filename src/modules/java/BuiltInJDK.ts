import { tgz, zip } from "compressing";
import { emptyDir, readdir, remove, rename } from "fs-extra";
import os from "os";
import path from "path";
import { getActualDataPath } from "../config/DataSupport";
import { DownloadMeta } from "../download/AbstractDownloader";
import { wrappedDownloadFile } from "../download/DownloadWrapper";
import { getLatestJREURL } from "./GetJRE";


// This will install two JDKs, 8 and 17
export async function installBothJDKs(): Promise<boolean> {
    const results = await Promise.allSettled([
        installBuiltInJDK(true),
        installBuiltInJDK(false)
    ]);
    for (const r of results) {
        if (r.status === "rejected") {
            return false;
        }
    }
    return true;
}

async function installBuiltInJDK(old = false): Promise<void> {
    const JAVA_DIR = getActualDataPath(
        path.join("java", old ? "legacy" : "modern")
    );
    const u = getLatestJREURL(old);
    if (u.length <= 0) {
        throw "No matching Java!";
    }
    await emptyDir(JAVA_DIR);
    const SAVE_PATH = path.join(JAVA_DIR, "java_tmp.ald");
    const meta = new DownloadMeta(u, SAVE_PATH);
    const s = await wrappedDownloadFile(meta, true);
    if (s !== 1) {
        throw "Failed to download!";
    }
    if (os.platform() === "win32") {
        await zip.uncompress(SAVE_PATH, JAVA_DIR);
    } else {
        await tgz.uncompress(SAVE_PATH, JAVA_DIR);
    }
    await remove(SAVE_PATH);
    const ds = await readdir(JAVA_DIR);
    if (ds.length <= 0) {
        throw "Corrupted Java!";
    }
    const d = path.join(JAVA_DIR, ds[0]);
    const nd = path.join(JAVA_DIR, "default");
    await rename(d, nd);
}
