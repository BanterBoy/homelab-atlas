# Third-party notices

Homelab Atlas bundles 114 reviewed upstream SVG brand assets for offline display and self-contained exports:

- 87 assets from [Homarr Dashboard Icons](https://github.com/homarr-labs/dashboard-icons), pinned to commit `320c819da84048d5a3066e2578bfa83be9019fdf`, under the Apache License 2.0. The full license ships at `app/public/licenses/dashboard-icons-APACHE-2.0.txt`.
- 7 assets from [selfh.st Icons](https://github.com/selfhst/icons), pinned to commit `1d65d45a42e6323b54b8096967b1ea4b65321f97`, under CC BY 4.0. The full license ships at `app/public/licenses/selfhst-icons-CC-BY-4.0.txt`.
- 9 assets from [Simple Icons](https://github.com/simple-icons/simple-icons), pinned to commit `90646e4bf7f3b89df6c37e65baf3e7bc759a517c`, under CC0 1.0. The full license ships at `app/public/licenses/simple-icons-CC0-1.0.txt`.
- 1 llama.cpp asset from [ggml-org](https://github.com/ggml-org/llama.cpp), pinned to commit `2cfef4d117d67ab1dec002915b48a15d11ee1973`, under the MIT License. The copyright and permission notice ships at `app/public/licenses/llama.cpp-MIT.txt`.
- The Intel logo is distributed from Intel's public logo source. It remains an Intel trademark.
- 6 SVGs come from official provider brand sources. They remain the property of their respective owners; inclusion does not grant trademark rights.
- 3 wordmark SVGs come from Wikimedia Commons under the `PD-textlogo` metadata on the [Spectrum](https://commons.wikimedia.org/wiki/File:Spectrum_Logo.svg), [Cox](https://commons.wikimedia.org/wiki/File:Cox_Communications_Logo.svg), and [Starlink](https://commons.wikimedia.org/wiki/File:Starlink_Logo.svg) file pages.

Exact filenames, pinned source URLs, and byte sizes are recorded in `app/public/licenses/logo-sources.json`. Restic has no bundled upstream mark and intentionally uses Homelab Atlas's original generic backup glyph. Generic device, service, network, and utility glyphs are original MIT-licensed Homelab Atlas artwork.

Licenses grant copyright permissions; they do not grant trademark rights. Product names and marks remain the property of their respective owners and are used here only to identify services users may diagram. All bundled artwork is local; the app and exported diagrams do not fetch these assets from upstream sources.

## Ullaakut/nmap XML projections

`app/nmap.go` adapts only the relevant XML field projections for hosts, addresses, hostnames, status, ports, state, and service from [Ullaakut/nmap](https://github.com/Ullaakut/nmap/tree/95091f90b599d00827e6d42c609cbe4c3afeb0ac), pinned at commit `95091f90b599d00827e6d42c609cbe4c3afeb0ac`. Atlas implements its own strict parsing preflight, limits, normalization, stable identities, review bundle, and merge flow. It does not include the upstream scanner wrapper, Nmap executable, databases, or Go module dependencies.

MIT License

Copyright (c) 2026 Ullaakut

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Nmap executable

Homelab Atlas does not include Nmap in its published base image or source ZIP. Its optional local Docker build installs the independent Alpine `nmap`, `nmap-nselibs`, and `nmap-scripts` packages so Nmap's fixed lightweight service identification works, and Atlas can invoke a user-installed Nmap executable. Atlas does not accept caller-selected scripts or flags. Nmap remains under its own [Nmap Public Source License terms](https://nmap.org/npsl/npsl-annotated.html); those terms are separate from Atlas's MIT license.
