# ALAL (Alicorn Again Launcher)

## Status?

[![Autotest](https://github.com/skjsjhb/ALAL/actions/workflows/test.yml/badge.svg)](https://github.com/skjsjhb/ALAL/actions/workflows/test.yml)
[![Bundle Check](https://github.com/skjsjhb/ALAL/actions/workflows/bundle.yml/badge.svg)](https://github.com/skjsjhb/ALAL/actions/workflows/bundle.yml)
[![Cross Packaging](https://github.com/skjsjhb/ALAL/actions/workflows/package.yml/badge.svg)](https://github.com/skjsjhb/ALAL/actions/workflows/package.yml)
![GitHub License](https://img.shields.io/github/license/skjsjhb/ALAL)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/skjsjhb/ALAL)

## This Is a Fork

This is a fork of a the original [Alicorn](https://github.com/Andy-K-Sparklight/Alicorn) repository. See the original
README there. The name **ALAL** stands for **AL**icorn **A**gain **L**auncher.

## Disclaimer

**ALAL is not compatible with Alicorn Legacy.** The data file format is updated and containers have changed a lot. No
backward compatibility is guaranteed.

~~Many packages of the original author is not possible to update in a few commits, they might get updated soon to avoid
vulnerabilities, but with no warranty.~~ All NPM packages are now up-to-date, though at the cost of considerable amount
of breaking changes.

The fork is made to keep the software alive, not a follow-up or series. The updates are made out of good intentions, but
still, with no warranty.

## Major Changes (Comparing To Alicorn)

We attempt to make ALAL a modern launcher with latest features integrated. Therefore we've made several changes to the
dependencies and code. Naming some:

- No longer supports Windows 7, 8 and 8.1, macOS 10.13, 10.14.

- No longer supports 32-bit OS.

- Add support to aarch64 / arm64 architectures.

- ~~Improve UI.~~ Redesign UI.

- Improve performance.

- Improve mod resolution system.

## Build

### Brief

The following build steps should work for most targets. They are already tested on local machine, but with only a little
coverage. Run the following scripts with care and open an issue if they refuse to work.

### Targets

We're continue using **webpack** for script bundling, but the distribution has changed to **electron-builder**. We've
configured several targets for the new build system:

- Debug - Development build for realtime testing and running. Used actively during the code-and-test process. This
  target contains source map for tracing.

- Autotest - Newly introduced build for automated testing. Test modules are embedded into the application by a specially
  designed test entry. The test system runs parallely with the application, reflects the most realistic and convincing
  test results. This target builds using development config, but without a source map.

- Release - Production build for releases. This is not the final version handed to users, but being part of the
  ingredients.

### Prerequisites

- Node.js 18+

- Git

- Node.js toolchain (If building native libraries on Windows ARM)

### How To

We've created seperated all-in-one scripts for the build. Below is an example of running the **autotest** build, but *
*debug** and **release** are also similar.

**Please note that this is not stable and may change at any time.**

1. Clone the repository.

   ```shell
   git clone https://github.com/skjsjhb/ALAL.git --depth 1
   ```

   If you're trying to contribute, please consider fork first, rather than cloning directly.

2. Enable corepack and install deps:

   ```shell
   corepack enable && yarn
   ```

   You may encounter build failures for this step. If you see anything related to `lzma-native`, this is OK - Your
   platform does not have prebuilt binaries and nor can the build tools create one. See **Hints** below for details
   about this.

3. Bundle scripts:

   ```shell
   yarn bundle-autotest
   ```

4. Run test with ALAL Test Tool:

   ```shell
   yarn test
   ```

5. Optionally pack the autotest build for distribution. Autotest and debug builds are not targeted towards users, but
   their bundles may have other particular usages.

   ```shell
   yarn make-autotest
   ```

   Output files locates in `dist/<target>`.

### Hints

- `lzma-native` is disabled by default for platform `win32-arm64` and `darwin-arm64` (and other platforms not officially
  supported), as the
  library does not came with a valid prebuilt (either missing or malfunctioned). ALAL uses a JS-based implementation
  under this case. Usages of LZMA are also
  reduced.

  However, the software version is comparably slow and (more importantly) unreliable due to the lack of maintenance of
  the package. You might want to enable `lzma-native` manually. To do that:

    1. Confirm that `lzma-native` has been built successfully (`yarn` and check for any errors).

    2. Rebuild libraries using `@electron/rebuild` (`yarn electron-rebuild` will work).

    3. Edit `resources/build/feature-matrix.json`, and add an entry:

       ```json5
       {
         "enable": true,
         "platform": "^win32-arm64$", // Or your platform name
         "value": [
           "lzma-native"
         ]
       }
       ```

    4. Edit `resource/build/resource-map.json`, and add a field:

       ```json5
       "<source/to/your/build>": "natives/lzma/${platform}/electron.napi.node"
       ```

       Where `<source/to/your/build>` should be the path to the rebuilt binaries **for electron**. If there are any
       dependencies (e.g. `liblzma.dll`), add extra entries to make the copy plugin realize them.

    5. Run to check whether these modifications work.

- The package script only builds the same output as the runner's platform. i.e. On macOS only macOS packges are built,
  etc. However, architecture of the host does not matter. (x64 packages can be built on arm64 and vice versa)

- If you're using yarn v1, do not run `yarn` directly. It will refuse to install.

## Copying

Copyright (C) 2020 - 2022 Annie K Rarity Sparklight (ThatRarityEG). For Alicorn Launcher.

Copyright (C) 2023 Ted "skjsjhb" Gao (skjsjhb). For Alicorn Again Launcher.
