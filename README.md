# Image Processing Pipeline

A real-time image processing pipeline built with **Rust core**, **Python ML integration**, and **TypeScript/React Web UI**. The project uses WebAssembly (WASM) to run high-performance image filters directly in the browser.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Build Instructions](#build-instructions)
- [Running the Web UI](#running-the-web-ui)
- [Available Filters](#available-filters)
- [Python Integration](#python-integration)
- [AI Enhancement (Waifu2x)](#ai-enhancement-waifu2x)
- [API Reference](#api-reference)
- [License](#license)

---

## Features

- High-performance image processing written in Rust
- Multi-threaded filter operations using Rayon
- SIMD optimizations for pixel processing
- WebAssembly support for browser-based processing
- React-based web interface with real-time preview
- Python bindings for ML integration and scripting
- AI-powered image upscaling via Waifu2x integration

---

## Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| Rust | Latest stable | [rustup.rs](https://rustup.rs/) |
| Node.js | v18+ | [nodejs.org](https://nodejs.org/) |
| Python | v3.9+ | [python.org](https://python.org/) |
| CMake | v3.20+ | [cmake.org](https://cmake.org/download/) |

Optional (for WASM build):
```bash
cargo install wasm-pack
rustup target add wasm32-unknown-unknown
```

---

## Project Structure

```
image-prosesing/
├── CMakeLists.txt              # Main CMake build configuration
├── README.md                   # This file
├── .gitignore                  # Git ignore rules
│
├── rust-core/                  # Rust image processing library
│   ├── Cargo.toml              # Workspace configuration
│   ├── Cargo.lock              # Dependency lock file
│   ├── image-pipeline/         # Core library
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs          # Library entry point
│   │       ├── filters.rs      # Filter implementations
│   │       ├── ffi.rs          # C FFI bindings
│   │       ├── simd.rs         # SIMD optimizations
│   │       └── error.rs        # Error types
│   └── image-pipeline-wasm/    # WebAssembly bindings
│       ├── Cargo.toml
│       └── src/
│           └── lib.rs          # WASM entry point
│
├── python/                     # Python package
│   ├── setup.py                # Package setup
│   ├── requirements.txt        # Dependencies
│   └── image_ml/               # Python module
│       ├── __init__.py         # Module exports
│       ├── bindings.py         # Rust FFI bindings
│       ├── pipeline.py         # Pipeline utilities
│       ├── models.py           # ML model integration
│       ├── enhance.py          # Waifu2x integration
│       └── lib/                # Native library directory
│
├── web/                        # React web frontend
│   ├── package.json            # npm configuration
│   ├── vite.config.ts          # Vite build config
│   ├── tsconfig.json           # TypeScript config
│   ├── index.html              # HTML entry point
│   ├── wasm/                   # WASM output directory
│   └── src/
│       ├── main.tsx            # React entry point
│       ├── App.tsx             # Main application
│       ├── components/         # React components
│       │   ├── FilterControls.tsx
│       │   ├── ImageCanvas.tsx
│       │   ├── ImageUploader.tsx
│       │   └── ProcessingIndicator.tsx
│       ├── hooks/
│       │   └── useImageProcessor.ts
│       └── styles/
│
├── tools/                      # External tools
│   └── waifu2x/                # AI enhancement binary
│
├── cmake/                      # CMake helper scripts
│   └── download_waifu2x.cmake
│
└── build/                      # Build output (generated)
    ├── output/lib/             # Compiled Rust library
    ├── wasm/                   # WebAssembly output
    └── dist/                   # Web build output
```

---

## Build Instructions

### Full Build (All Components)

```bash
# Create build directory
mkdir build
cd build

# Configure CMake
cmake ..

# Build everything
cmake --build .
```

### Individual Targets

| Target | Command | Description |
|--------|---------|-------------|
| `rust_core` | `cmake --build . --target rust_core` | Build Rust library only |
| `wasm_build` | `cmake --build . --target wasm_build` | Build WebAssembly module |
| `web_build` | `cmake --build . --target web_build` | Build web frontend |
| `web_deps` | `cmake --build . --target web_deps` | Install npm dependencies |
| `download_waifu2x` | `cmake --build . --target download_waifu2x` | Download AI enhancer |
| `test_rust` | `cmake --build . --target test_rust` | Run Rust unit tests |
| `clean_all` | `cmake --build . --target clean_all` | Clean all build artifacts |

### CMake Options

| Option | Default | Description |
|--------|---------|-------------|
| `BUILD_RUST` | ON | Build Rust core library |
| `BUILD_WASM` | ON | Build WebAssembly module |
| `BUILD_PYTHON` | ON | Setup Python package |
| `BUILD_WEB` | ON | Build web frontend |
| `RUST_RELEASE` | ON | Build Rust in release mode |

Example:
```bash
cmake .. -DBUILD_WASM=OFF -DBUILD_WEB=OFF
```

---

## Running the Web UI

### Development Mode

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
cd build
cmake --build . --target web_build
```

The production build will be output to `build/dist/`.

---

## Available Filters

| Filter | Parameter | Range | Description |
|--------|-----------|-------|-------------|
| Grayscale | - | - | Convert to grayscale using ITU-R BT.709 |
| Brightness | value | -1.0 to 1.0 | Adjust image brightness |
| Contrast | value | 0.0 to 3.0 | Adjust image contrast |
| Blur | sigma | 0.1 to 10.0 | Gaussian blur |
| Sharpen | - | - | Unsharp masking |
| Edge Detect | - | - | Sobel edge detection |
| Resize | width, height | any | Lanczos3 interpolation |
| Invert | - | - | Invert colors |
| Sepia | - | - | Apply sepia tone effect |

---

## Python Integration

### Installation

```bash
cd python
pip install -e .
```

### Basic Usage

```python
from image_ml import ImagePipeline
from PIL import Image
import numpy as np

# Load image
img = np.array(Image.open("input.jpg"))

# Create pipeline
pipeline = ImagePipeline()

# Apply single filter
result = pipeline.grayscale(img)

# Chain multiple filters
result = pipeline.brightness(img, 0.2)
result = pipeline.contrast(result, 1.3)
result = pipeline.sharpen(result)

# Save result
Image.fromarray(result).save("output.png")
```

### Available Functions

```python
from image_ml import (
    grayscale,
    brightness,
    contrast,
    blur,
    sharpen,
    edge_detect,
    resize,
    invert,
    sepia,
)
```

---

## AI Enhancement (Waifu2x)

The project integrates [waifu2x-ncnn-vulkan](https://github.com/nihui/waifu2x-ncnn-vulkan) for AI-powered image upscaling and noise reduction.

### Download

```bash
cd build
cmake --build . --target download_waifu2x
```

### Python Usage

```python
from image_ml import enhance_image, is_waifu2x_available
from PIL import Image
import numpy as np

# Check availability
if is_waifu2x_available():
    # Load image
    img = np.array(Image.open("input.jpg"))
    
    # Enhance with 2x upscaling and noise reduction
    result = enhance_image(img, scale=2, noise=2)
    
    # Save result
    Image.fromarray(result).save("output.png")
```

### Enhancement Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `scale` | 1, 2, 4, 8, 16, 32 | Upscaling factor |
| `noise` | -1, 0, 1, 2, 3 | Noise reduction level (-1 = none, 3 = strongest) |
| `model` | "cunet", "upconv_7_anime_style_art_rgb" | AI model to use |
| `tile_size` | 0, 32, 64, 128, ... | Tile size for processing (0 = auto) |
| `gpu_id` | 0, 1, ... | GPU device ID |

---

## API Reference

### Rust Library (image-pipeline)

```rust
use image_pipeline::{ImageProcessor, filters};

// Create processor from RGBA data
let processor = ImageProcessor::new(data, width, height);

// Apply filters
let result = processor.grayscale();
let result = processor.brightness(0.3);
let result = processor.blur(2.0);
```

### WASM Module

```javascript
import init, { WasmImageProcessor } from './wasm/image_pipeline_wasm.js';

await init();

const processor = new WasmImageProcessor(imageData, width, height);
processor.grayscale();
processor.brightness(0.3);

const result = processor.get_data();
processor.free();
```

### Python FFI

```python
from image_ml.bindings import RustImageProcessor

processor = RustImageProcessor(image_array)
result = processor.apply_filter("grayscale")
processor.close()
```

---

## Development

### Running Tests

```bash
# Rust tests
cd rust-core
cargo test

# Or via CMake
cd build
cmake --build . --target test_rust
```

### Code Structure

- **Filters**: All image filters are implemented in `rust-core/image-pipeline/src/filters.rs`
- **SIMD**: CPU-optimized operations in `rust-core/image-pipeline/src/simd.rs`
- **FFI**: C/Python bindings in `rust-core/image-pipeline/src/ffi.rs`
- **WASM**: Browser bindings in `rust-core/image-pipeline-wasm/src/lib.rs`

---

## Troubleshooting

### WASM Build Fails

If you encounter "cannot find binary path" error:

1. Ensure wasm-pack is installed: `cargo install wasm-pack`
2. Add WASM target: `rustup target add wasm32-unknown-unknown`
3. Try building directly: `cd rust-core && wasm-pack build image-pipeline-wasm --target web`

### Python Import Errors

Ensure the Rust library is built first:
```bash
cd build
cmake --build . --target rust_core
```

### Web UI Shows Fallback Mode

The WASM module hasn't been built. Build it with:
```bash
cd build
cmake --build . --target wasm_build
```

---

## License

MIT
