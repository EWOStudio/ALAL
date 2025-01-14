import { Signals } from "@/background/Signals";
import { Files } from "@/modules/data/Files";
import { Options } from "@/modules/data/Options";
import { Cacher } from "@/modules/net/Cacher";
import { Mirrors } from "@/modules/net/Mirrors";
import { ipcRenderer } from "electron";
import fetch from "electron-fetch";
import { createWriteStream, ensureDir, stat } from "fs-extra";
import path from "path";
import { PassThrough, Transform, TransformCallback } from "stream";
import { pipeline } from "stream/promises";

/**
 * The profile to tell downloader how to get the files.
 */
export interface DownloadProfile {
    url: string,
    location: string,
    headerTimeout: number,
    minSpeed: number,
    tries: number,
    cache: boolean,
    size: number,
    validation: string, // See method 'validateFile'
    checksum: string
}

/**
 * Builtin file downloader.
 *
 * This module runs on the main process, but all methods are also compatible for renderer use.
 */
export namespace Downloader {


    /**
     * Create download profile from several user-specified fields.
     */
    export function createProfile(opt: {
        url: string, // Mandatory
        location: string, // Mandatory
        headerTimeout?: number,
        minSpeed?: number,
        tries?: number,
        cache?: boolean,
        size?: number,
        checksum?: string
        validation?: string,
        mirror?: boolean // Whether to apply mirror the url
    }): DownloadProfile {
        const {url, location, headerTimeout, minSpeed, tries, cache, size, checksum, validation, mirror} = opt;
        let effectiveURL = url;
        if (mirror ?? true) { // Enabled by default
            effectiveURL = Mirrors.apply(effectiveURL);
        }
        return {
            url: effectiveURL,
            location: location,
            headerTimeout: headerTimeout ?? Options.get().download.timeout,
            minSpeed: minSpeed ?? Options.get().download.minSpeed,
            tries: tries || Options.get().download.tries,
            cache: cache ?? false, // Cache is not enabled by default
            size: size ?? -1,
            checksum: checksum ?? "",
            validation: validation ?? "size"
        };
    }

    /**
     * All-in-one bundle of {@link webGetFile}, {@link checkCache} and {@link validateFile}.
     */
    export async function downloadFile(p: DownloadProfile): Promise<boolean> {
        let usingCache = true;
        const tries = p.tries;
        for (const _i of Array(tries)) {
            if (!await checkCache(p)) {
                usingCache = false;
                // Download file since cache not found
                const dlok = await webGetFile(p);
                if (!dlok) {
                    console.log("Try: " + p.url);
                    continue; // Try again
                }
            }
            console.log("Chk: " + p.url);
            if (await validateFile(p)) {
                await saveCache(p);
                console.log("Got: " + p.url);
                return true;
            } else {
                if (usingCache) {
                    // This cache is invalid
                    await invalidateCache(p);
                }
                // Try again
                console.log("Try: " + p.url);
            }
        }
        // You failed!
        return false;
    }

    // Validates the downloaded file using specified validation method
    // The value of `validation` can be: `size`, empty string or a hash algorithm.
    // `size`: Only check the size of the file
    // Empty: Do not check the file
    // Other: Treated as a hash algorithm name
    // This method is controlled by global settings.
    async function validateFile(p: DownloadProfile): Promise<boolean> {
        if (!p.validation) {
            return true; // Always pass
        }
        if (p.validation == "size") {
            if (p.size <= 0) {
                return true; // Size unknown, cannot check, assume pass
            }
            try {
                return (await stat(p.location)).size == p.size;
            } catch (e) {
                console.error("Could not stat file: " + e);
                return false;
            }
        }
        if (!p.checksum) {
            return true; // No validation available
        }
        return await Files.checkIntegrity(p.location, p.checksum, p.validation);
    }

    // Check the cache and apply if applicable
    async function checkCache(p: DownloadProfile): Promise<boolean> {
        if (!Options.get().download.cache || !p.cache) {
            return false; // Disabled by caller or global settings
        }
        if (await Cacher.applyCache(p.url, p.location)) {
            console.log("Hit: " + p.url);
            return true;
        }
        return false;
    }

    // Adds file to cache. This method is controlled by global settings.
    async function saveCache(p: DownloadProfile): Promise<void> {
        if (!Options.get().download.cache || !p.cache) {
            return;
        }
        await Cacher.addCache(p.url, p.location);
    }

    function invalidateCache(p: DownloadProfile): Promise<void> {
        return Cacher.removeCache(p.url);
    }

    /**
     * Download a file.
     *
     * @returns Whether the operation is successful.
     * @param p Download profile.
     */
    export async function webGetFile(p: DownloadProfile): Promise<boolean> {
        const {url} = p;
        console.log("Get: " + url);
        let err;
        if (ipcRenderer) {
            err = await webGetFileRemote(p);
        } else {
            err = await webGetFileMain(p);
        }
        if (err == null) {
            console.log("Res: " + url);
            return true;
        } else {
            console.log(`Err: ${url} (${err})`);
            return false;
        }
    }

    // Wrapped remote version
    export async function webGetFileRemote(p: DownloadProfile): Promise<string | null> {
        return await ipcRenderer.invoke(Signals.WEB_GET_FILE, p);
    }

    // Download a file using electron-fetch in main process
    // Returns the error message, or `null` if successful.
    export async function webGetFileMain(p: DownloadProfile): Promise<string | null> {
        const {url, location, headerTimeout, minSpeed} = p;
        const timeoutController = new AbortController();
        const tlc = setTimeout(() => {
            timeoutController.abort("Timeout");
        }, headerTimeout);
        try {
            const res = await fetch(url, {
                signal: timeoutController.signal
            });
            if (!res.ok) {
                return "Status " + res.status;
            }
            if (!res.body) {
                return "Empty body";
            }
            // Remove timeout on header received
            clearTimeout(tlc);
            const meter = getSpeedMeter(minSpeed);
            await ensureDir(path.dirname(location));
            await pipeline(res.body, meter, createWriteStream(location));
            return null;
        } catch (e) {
            return String(e);
        }
    }

    const meterInterval = 3000;
    // Creates a speed meter transform stream. The input chunk is simply forwarded to the output, but an error
    // is thrown if the speed is below the minimum.
    // The return value contains a created stream and a timer. The latter should be cancelled on pipe complete.
    function getSpeedMeter(minSpeed: number): Transform {
        if (minSpeed <= 0) {
            return new PassThrough();
        }
        let size = 0;
        const tld = setInterval(() => {
            if (size < minSpeed * meterInterval / 1000) {
                tr.emit("error", new Error("Speed below minimum"));
            } else {
                size = 0;
            }
        }, meterInterval);
        const tr = new Transform({
            transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
                size += Buffer.from(chunk).length;
                callback(null, chunk);
            },
            destroy(_error: Error | null, callback: (error: (Error | null)) => void) {
                clearInterval(tld);
                // Errors are ignored for meter
                callback(null);
            }
        });
        return tr;
    }
}