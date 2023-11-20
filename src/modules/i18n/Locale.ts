import { Signals } from "@/background/Signals";
import { app, ipcRenderer } from "electron";
import { readFile } from "fs-extra";
import path from "path";
import yaml from "yaml";
import { Paths } from "../redata/Paths";
import { ReOptions } from "../redata/ReOptions";
import { Objects } from "../util/Objects";

export namespace Locale {
    let currentLocale = "";
    type LocaleObject = { [key: string]: LocaleObject | string | string[] };
    const locales = new Map<string, LocaleObject>();

    const localeDirname = "i18n";

    /**
     * Initializes the locale module: loads locale files from a pre-set directory, then set the current locale
     * based on options or os.
     */
    export async function initLocale() {
        console.log("Loading locale.");
        await loadLocaleFromDir(Paths.getResourcePath(localeDirname));
        let userLocale;
        if (ipcRenderer) {
            // Remote
            userLocale = ReOptions.get().locale || await ipcRenderer.invoke(Signals.GET_LOCALE);
        } else {
            // Background
            userLocale = ReOptions.get().locale || app.getLocale();
        }
        setActiveLocale(userLocale);
    }

    // Scan locale directory using absolute path and load all files within it
    async function loadLocaleFromDir(absRootPath: string) {
        const dirs = await Paths.scanDir(absRootPath, true);
        for (const f of dirs) {
            const name = path.basename(f, path.extname(f));
            try {
                await loadLocaleFromFile(name, f);
            } catch (e) {
                console.error("A locale file could not be loaded: " + e);
            }
        }
    }

    // Loads locale from specified file
    async function loadLocaleFromFile(name: string, absPath: string) {
        try {
            const src = await readFile(absPath);
            buildLocale(name, src.toString());
        } catch (e) {
            console.error("Could not load locale file: " + e);
        }
    }

    // Builds locale and add it to locale map
    function buildLocale(id: string, src: string) {
        try {
            console.log("Building locale " + id);
            const parseResult = yaml.parse(src) as LocaleObject; // TODO verify locale object
            locales.set(id, parseResult);
        } catch (e) {
            console.error("Could not build locale " + id + ": " + e);
        }
    }

    /**
     * Sets specified locale as active. Following calls to locale state-based translation methods will
     * be affected.
     *
     * This method does not require the target locale to have been built. The locale retrieval is only done
     * when the translation method is called.
     */
    export function setActiveLocale(id: string) {
        console.log("Active locale: " + id);
        currentLocale = id;
    }

    /**
     * Gets the translation of a specified key.
     */
    export function getTranslation(key: string): string {
        if (!currentLocale || !locales.has(currentLocale)) {
            console.warn("Attempting to get translation when locale is not set. Skipped.");
            return "";
        }
        const v = Objects.getPropertyByKey(locales.get(currentLocale), key);
        if (typeof v == "string") {
            return v;
        }
        console.warn(`Translation key ${key} does not map to a valid value. Check lang files.`);
        return ""; // Invalid values are skipped
    }

    /**
     * Generates a function which wraps {@link getTranslation}, using `rootKey` as prefix.
     * @param rootKey Key prefix to attach.
     */
    export function getSection(rootKey: string): (k: string) => string {
        return (k: string) => {
            return getTranslation(rootKey + "." + k);
        };
    }
}