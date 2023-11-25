import { Options } from "@/modules/data/Options";
import { ipcRenderer } from "electron";
import { readFile, readJSON, remove } from "fs-extra";
import { Files } from "../src/modules/data/Files";
import { Registry } from "../src/modules/data/Registry";
import { Locale } from "../src/modules/i18n/Locale";
import { Cacher } from "../src/modules/net/Cacher";
import { Downloader } from "../src/modules/net/Downloader";
import { Throttle } from "../src/modules/util/Throttle";
import { testJavaDownload } from "./JavaGetTest";
import { SignalTest } from "./SignalTest";
import { TestSummary } from "./TestSummary";
import { TestTools } from "./TestTools";
import assertEquals = TestTools.assertEquals;
import assertNotEquals = TestTools.assertNotEquals;
import assertTrue = TestTools.assertTrue;
import test = TestTools.test;

export async function runRendererTests() {
    console.log("Automated tests for renderer process.");
    await allTests();
    console.log("Sending exit signal!");
    ipcRenderer.send(SignalTest.EXIT);
}


async function allTests() {
    await test("Renderer Exists", () => {
        assertTrue(ipcRenderer);
    });
    await test("Locale Loading", () => {
        Locale.setActiveLocale("en-US");
        assertEquals(Locale.getTranslation("name"), "English (US)");
    });
    await test("Mirror Latency Test", () => {
        // This is executed after a full initialization. Mirrors should be usable.
        assertNotEquals(Registry.getTable("mirrors", []).length, 0);
    });
    const testFile = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.9%2B9.1/OpenJDK17U-debugimage_x64_windows_hotspot_17.0.9_9.zip.json";
    await test("Single File Download with Fetch", async () => {
        Options.get().download.aria2.enabled = false; // Temporarily disable this
        await remove("file.json");
        await Downloader.downloadFile(Downloader.createProfile({
            url: testFile,
            location: "file.json",
            validation: "sha1",
            checksum: "29c9d911cdf957f926e37c0216f052c9c02e0b2a",
            cache: true
        }));
        const f = await readJSON("file.json");
        assertEquals(f.variant, "temurin");
    });
    await test("File Integrity Check", async () => {
        assertTrue(await Files.checkIntegrity("file.json", "29c9d911cdf957f926e37c0216f052c9c02e0b2a", "sha1"));
    });
    await test("File Cache", async () => {
        await Cacher.applyCache(testFile, "cache.json");
        assertEquals((await readFile("cache.json")).toString(), (await readFile("file.json")).toString());
    });
    await test("Single File Download with aria2", async () => {
        Options.get().download.aria2.enabled = true; // Enable it
        await remove("file.json");
        await Downloader.downloadFile(Downloader.createProfile({
            url: testFile,
            location: "file.json",
            validation: "sha1",
            checksum: "29c9d911cdf957f926e37c0216f052c9c02e0b2a",
            cache: true
        }));
        const f = await readJSON("file.json");
        assertEquals(f.variant, "temurin");
    });
    await test("Throttle Pool", async () => {
        let a = 0;
        const pool = new Throttle.Pool(2);
        await Promise.all([pool.acquire(), pool.acquire()]);
        const prom = pool.acquire();
        prom.then(() => { a = 1;});
        assertEquals(pool.getSize(), 2);
        assertNotEquals(a, 1);
        pool.release();
        await prom;
        assertEquals(a, 1);
    });
    await testJavaDownload();
    await saveSummary();
}

async function saveSummary() {
    console.log("Generating summary for tests.");
    await TestSummary.writeTestSummary();
}