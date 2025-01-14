import { Signals } from "@/background/Signals";
import { app, ipcRenderer } from "electron";
import os from "os";
import path from "path";

/**
 * Module for file path resolving and file management.
 *
 * ALAL stores its data with them divided into the following sections:
 * - `user`: User selections and histories (aka. implicit preferences)
 * - `asr`: Shared room for application generated data.
 * - `pkg`: Downloaded software packages and daemons.
 * - `tmp`: Temp data storage.
 *
 * From ALAL (SakuraKumo) no data will be saved using the Web Storage API.
 */
export namespace Paths {
    let rootPath: string;
    let appPath: string;

    /**
     * Automatically detect the root path of ALAL data folder.
     * ALAL lookups the following locations:
     * - Windows: `%LOCALAPPDATA%/AlicornAgain`
     * - macOS: `~/Library/Application Support/AlicornAgain`
     * - Others: `~/.alicorn-again`
     */
    export function detectRootPath() {
        switch (os.platform()) {
            case "win32":
                if (process.env.LOCALAPPDATA) {
                    rootPath = path.resolve(process.env.LOCALAPPDATA, "AlicornAgain");
                } else if (process.env.APPDATA) {
                    rootPath = path.resolve(process.env.APPDATA, "AlicornAgain");
                }
                break;
            case "darwin":
                rootPath = path.resolve(os.homedir(), "Library/Application Support/AlicornAgain");
                break;
        }
        if (!rootPath) {
            rootPath = path.resolve(os.homedir(), ".alicorn-again");
        }
        console.log("Setting root path: " + rootPath);
    }


    /**
     * Detect the app resource path.
     *
     * This method is a wrapper of {@link app.getAppPath}. This can only be called on the remote.
     */
    export async function retrieveAppPath() {
        if (ipcRenderer) {
            appPath = await ipcRenderer.invoke(Signals.GET_APP_PATH);
        } else {
            appPath = app.getAppPath();
        }
        console.log("Setting app path: " + appPath);
    }

    /**
     * Resolve a given path in the data directory relative to the root path.
     * @param pt Relative path parts.
     */
    export function getDataPath(...pt: string[]): string {
        if (!rootPath) {
            console.warn("Paths used with root uninitialized.");
            console.warn("This is completed on-demand this time. Check the code.");
            detectRootPath();
        }
        return path.resolve(rootPath, ...pt);
    }

    /**
     * Resolve a given app resource path.
     * @param pt Relative path.
     */
    export function getResourcePath(pt: string) {
        if (!appPath) {
            console.error("Paths used with app path uninitialized. Skipped.");
            return "";
        }
        return path.resolve(appPath, pt);
    }
}