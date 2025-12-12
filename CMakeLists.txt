cmake_minimum_required(VERSION 3.20)
project(ImageProcessingPipeline VERSION 0.1.0 LANGUAGES NONE)

option(BUILD_RUST "Build Rust core library" ON)
option(BUILD_WASM "Build WebAssembly module" ON)
option(BUILD_PYTHON "Setup Python package" ON)
option(BUILD_WEB "Build web frontend" ON)
option(RUST_RELEASE "Build Rust in release mode" ON)

if(CMAKE_SOURCE_DIR STREQUAL CMAKE_BINARY_DIR)
    message(FATAL_ERROR 
        "In-source builds are not allowed.\n"
        "Please create a build directory and run cmake from there:\n"
        "  mkdir build && cd build\n"
        "  cmake ..\n"
        "  cmake --build ."
    )
endif()

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

set(OUTPUT_DIR ${CMAKE_BINARY_DIR}/output)
set(WASM_OUTPUT_DIR ${CMAKE_BINARY_DIR}/wasm)
set(WEB_OUTPUT_DIR ${CMAKE_BINARY_DIR}/dist)

file(MAKE_DIRECTORY ${OUTPUT_DIR})
file(MAKE_DIRECTORY ${OUTPUT_DIR}/lib)
file(MAKE_DIRECTORY ${WASM_OUTPUT_DIR})

find_program(CARGO_EXECUTABLE cargo
    HINTS 
        $ENV{USERPROFILE}/.cargo/bin
        $ENV{HOME}/.cargo/bin
        /usr/local/bin
        /usr/bin
)

find_program(WASM_PACK_EXECUTABLE wasm-pack
    HINTS 
        $ENV{USERPROFILE}/.cargo/bin
        $ENV{HOME}/.cargo/bin
)

find_program(NPM_EXECUTABLE npm)

if(CARGO_EXECUTABLE)
    message(STATUS "Cargo found: ${CARGO_EXECUTABLE}")
else()
    message(WARNING "Cargo not found. Please install Rust from https://rustup.rs/")
endif()

if(BUILD_WASM)
    if(NOT WASM_PACK_EXECUTABLE)
        message(WARNING "wasm-pack not found. Install with: cargo install wasm-pack")
    else()
        message(STATUS "wasm-pack found: ${WASM_PACK_EXECUTABLE}")
    endif()
endif()

if(BUILD_WEB)
    if(NOT NPM_EXECUTABLE)
        message(WARNING "npm not found. Web frontend will not be built.")
    else()
        message(STATUS "npm found: ${NPM_EXECUTABLE}")
    endif()
endif()


set(RUST_CORE_DIR ${CMAKE_SOURCE_DIR}/rust-core)
set(PYTHON_DIR ${CMAKE_SOURCE_DIR}/python)
set(WEB_DIR ${CMAKE_SOURCE_DIR}/web)

if(WIN32)
    set(RUST_LIB_NAME "image_pipeline.dll")
    set(RUST_LIB_STATIC "image_pipeline.lib")
elseif(APPLE)
    set(RUST_LIB_NAME "libimage_pipeline.dylib")
    set(RUST_LIB_STATIC "libimage_pipeline.a")
else()
    set(RUST_LIB_NAME "libimage_pipeline.so")
    set(RUST_LIB_STATIC "libimage_pipeline.a")
endif()

if(BUILD_RUST AND CARGO_EXECUTABLE)
    if(RUST_RELEASE)
        set(CARGO_BUILD_TYPE "--release")
        set(RUST_TARGET_DIR "release")
    else()
        set(CARGO_BUILD_TYPE "")
        set(RUST_TARGET_DIR "debug")
    endif()

    add_custom_target(rust_core ALL
        COMMAND ${CARGO_EXECUTABLE} build ${CARGO_BUILD_TYPE}
        WORKING_DIRECTORY ${RUST_CORE_DIR}
        COMMENT "Building Rust core library..."
        USES_TERMINAL
    )

    add_custom_command(TARGET rust_core POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_if_different
            ${RUST_CORE_DIR}/target/${RUST_TARGET_DIR}/${RUST_LIB_NAME}
            ${OUTPUT_DIR}/lib/${RUST_LIB_NAME}
        COMMENT "Copying Rust library to ${OUTPUT_DIR}/lib/"
    )

    if(BUILD_PYTHON)
        add_custom_command(TARGET rust_core POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E make_directory ${PYTHON_DIR}/image_ml/lib
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
                ${RUST_CORE_DIR}/target/${RUST_TARGET_DIR}/${RUST_LIB_NAME}
                ${PYTHON_DIR}/image_ml/lib/${RUST_LIB_NAME}
            COMMENT "Copying Rust library to Python package..."
        )
    endif()
endif()

if(BUILD_WASM AND WASM_PACK_EXECUTABLE AND CARGO_EXECUTABLE)
    add_custom_target(wasm_build ALL
        COMMAND ${WASM_PACK_EXECUTABLE} build
            --target web
            --out-dir ${WASM_OUTPUT_DIR}
            --out-name image_pipeline_wasm
            ${RUST_CORE_DIR}/image-pipeline-wasm
        DEPENDS rust_core
        COMMENT "Building WebAssembly module to ${WASM_OUTPUT_DIR}/"
        USES_TERMINAL
    )

    if(BUILD_WEB)
        add_custom_command(TARGET wasm_build POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E make_directory ${WEB_DIR}/wasm
            COMMAND ${CMAKE_COMMAND} -E copy_directory
                ${WASM_OUTPUT_DIR}
                ${WEB_DIR}/wasm
            COMMENT "Copying WASM to web/wasm/ for development..."
        )
    endif()
endif()


if(BUILD_WEB AND NPM_EXECUTABLE)
    add_custom_target(web_deps
        COMMAND ${NPM_EXECUTABLE} install
        WORKING_DIRECTORY ${WEB_DIR}
        COMMENT "Installing web dependencies..."
        USES_TERMINAL
    )

    add_custom_target(web_build ALL
        COMMAND ${NPM_EXECUTABLE} run build
        WORKING_DIRECTORY ${WEB_DIR}
        DEPENDS web_deps
        COMMENT "Building web frontend..."
        USES_TERMINAL
    )

    if(BUILD_WASM AND WASM_PACK_EXECUTABLE)
        add_dependencies(web_build wasm_build)
    endif()

    add_custom_command(TARGET web_build POST_BUILD
        COMMAND ${CMAKE_COMMAND} -E copy_directory
            ${WEB_DIR}/dist
            ${WEB_OUTPUT_DIR}
        COMMENT "Copying web build to ${WEB_OUTPUT_DIR}/"
    )
endif()

if(CARGO_EXECUTABLE)
    add_custom_target(test_rust
        COMMAND ${CARGO_EXECUTABLE} test
        WORKING_DIRECTORY ${RUST_CORE_DIR}
        COMMENT "Running Rust tests..."
        USES_TERMINAL
    )
endif()

if(BUILD_PYTHON)
    find_program(PYTHON_EXECUTABLE python3 python)
    if(PYTHON_EXECUTABLE)
        add_custom_target(test_python
            COMMAND ${PYTHON_EXECUTABLE} -m pytest tests/ -v
            WORKING_DIRECTORY ${PYTHON_DIR}
            DEPENDS rust_core
            COMMENT "Running Python tests..."
            USES_TERMINAL
        )
    endif()
endif()

add_custom_target(clean_all
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_BINARY_DIR}/output
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_BINARY_DIR}/wasm
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_BINARY_DIR}/dist
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${WEB_DIR}/node_modules
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${WEB_DIR}/dist
    COMMAND ${CMAKE_COMMAND} -E remove_directory ${WEB_DIR}/wasm
    COMMENT "Cleaning build artifacts..."
)

if(CARGO_EXECUTABLE)
    add_custom_target(clean_rust
        COMMAND ${CARGO_EXECUTABLE} clean
        WORKING_DIRECTORY ${RUST_CORE_DIR}
        COMMENT "Cleaning Rust build..."
    )
endif()

set(WAIFU2X_VERSION "20220728")
set(WAIFU2X_DIR ${CMAKE_SOURCE_DIR}/tools/waifu2x)

if(WIN32)
    set(WAIFU2X_ZIP "waifu2x-ncnn-vulkan-${WAIFU2X_VERSION}-windows.zip")
    set(WAIFU2X_EXE "waifu2x-ncnn-vulkan.exe")
elseif(APPLE)
    set(WAIFU2X_ZIP "waifu2x-ncnn-vulkan-${WAIFU2X_VERSION}-macos.zip")
    set(WAIFU2X_EXE "waifu2x-ncnn-vulkan")
else()
    set(WAIFU2X_ZIP "waifu2x-ncnn-vulkan-${WAIFU2X_VERSION}-ubuntu.zip")
    set(WAIFU2X_EXE "waifu2x-ncnn-vulkan")
endif()

set(WAIFU2X_URL "https://github.com/nihui/waifu2x-ncnn-vulkan/releases/download/${WAIFU2X_VERSION}/${WAIFU2X_ZIP}")

# Download waifu2x target
add_custom_target(download_waifu2x
    COMMAND ${CMAKE_COMMAND} -E echo "Downloading waifu2x from ${WAIFU2X_URL}..."
    COMMAND ${CMAKE_COMMAND} -E make_directory ${WAIFU2X_DIR}
    COMMAND ${CMAKE_COMMAND} 
        -DURL=${WAIFU2X_URL}
        -DOUTPUT=${CMAKE_BINARY_DIR}/${WAIFU2X_ZIP}
        -DEXTRACT_DIR=${WAIFU2X_DIR}
        -P ${CMAKE_SOURCE_DIR}/cmake/download_waifu2x.cmake
    COMMENT "Downloading and extracting waifu2x-ncnn-vulkan..."
    USES_TERMINAL
)

if(EXISTS ${WAIFU2X_DIR}/${WAIFU2X_EXE})
    message(STATUS "Waifu2x found: ${WAIFU2X_DIR}/${WAIFU2X_EXE}")
else()
    message(STATUS "Waifu2x not found. Run: cmake --build . --target download_waifu2x")
endif()


install(DIRECTORY ${OUTPUT_DIR}/lib/ 
    DESTINATION lib 
    PATTERN "*"
)
install(DIRECTORY ${WASM_OUTPUT_DIR}/ 
    DESTINATION share/wasm
    PATTERN "*"
)
install(DIRECTORY ${WEB_OUTPUT_DIR}/ 
    DESTINATION share/web
    PATTERN "*"
)


message(STATUS "")
message(STATUS "╔══════════════════════════════════════════════════════════════╗")
message(STATUS "║       Image Processing Pipeline - Build Configuration        ║")
message(STATUS "╠══════════════════════════════════════════════════════════════╣")
message(STATUS "║  Build Type:    ${CMAKE_BUILD_TYPE}")
message(STATUS "║  Build Rust:    ${BUILD_RUST}")                               
message(STATUS "║  Build WASM:    ${BUILD_WASM}")
message(STATUS "║  Build Python:  ${BUILD_PYTHON}")
message(STATUS "║  Build Web:     ${BUILD_WEB}")
message(STATUS "║  Release Mode:  ${RUST_RELEASE}")
message(STATUS "╠══════════════════════════════════════════════════════════════╣")
message(STATUS "║  Source Dir:    ${CMAKE_SOURCE_DIR}")
message(STATUS "║  Build Dir:     ${CMAKE_BINARY_DIR}")
message(STATUS "║  Output Dir:    ${OUTPUT_DIR}")
message(STATUS "║  WASM Dir:      ${WASM_OUTPUT_DIR}")
message(STATUS "║  Web Dist:      ${WEB_OUTPUT_DIR}")
message(STATUS "╚══════════════════════════════════════════════════════════════╝")
message(STATUS "")
message(STATUS "Build commands:")
message(STATUS "  cmake --build . --target rust_core       # Build Rust library")
message(STATUS "  cmake --build . --target wasm_build      # Build WASM module")
message(STATUS "  cmake --build . --target web_build       # Build web frontend")
message(STATUS "  cmake --build . --target download_waifu2x # Download AI enhancer")
message(STATUS "  cmake --build . --target test_rust       # Run Rust tests")
message(STATUS "  cmake --build .                          # Build all")
message(STATUS "")
