# download_waifu2x.cmake
# CMake script to download and extract waifu2x-ncnn-vulkan

cmake_minimum_required(VERSION 3.20)

# Parameters passed via -D flags
if(NOT DEFINED URL)
    message(FATAL_ERROR "URL not defined")
endif()

if(NOT DEFINED OUTPUT)
    message(FATAL_ERROR "OUTPUT not defined")
endif()

if(NOT DEFINED EXTRACT_DIR)
    message(FATAL_ERROR "EXTRACT_DIR not defined")
endif()

# Check if already exists
file(GLOB WAIFU2X_EXE "${EXTRACT_DIR}/waifu2x-ncnn-vulkan*")
if(WAIFU2X_EXE)
    message(STATUS "waifu2x already exists, skipping download")
    return()
endif()

# Download
message(STATUS "Downloading from: ${URL}")
file(DOWNLOAD 
    ${URL} 
    ${OUTPUT}
    SHOW_PROGRESS
    STATUS DOWNLOAD_STATUS
    TIMEOUT 300
)

list(GET DOWNLOAD_STATUS 0 STATUS_CODE)
list(GET DOWNLOAD_STATUS 1 STATUS_MESSAGE)

if(NOT STATUS_CODE EQUAL 0)
    message(FATAL_ERROR "Download failed: ${STATUS_MESSAGE}")
endif()

message(STATUS "Download complete: ${OUTPUT}")

# Extract
message(STATUS "Extracting to: ${EXTRACT_DIR}")
file(ARCHIVE_EXTRACT
    INPUT ${OUTPUT}
    DESTINATION ${EXTRACT_DIR}
)

# Move files from nested directory if exists
file(GLOB NESTED_DIRS "${EXTRACT_DIR}/waifu2x-ncnn-vulkan-*")
if(NESTED_DIRS)
    list(GET NESTED_DIRS 0 NESTED_DIR)
    file(GLOB NESTED_FILES "${NESTED_DIR}/*")
    foreach(FILE ${NESTED_FILES})
        get_filename_component(FILENAME ${FILE} NAME)
        file(RENAME ${FILE} "${EXTRACT_DIR}/${FILENAME}")
    endforeach()
    file(REMOVE_RECURSE ${NESTED_DIR})
endif()

# Cleanup zip
file(REMOVE ${OUTPUT})

message(STATUS "waifu2x-ncnn-vulkan installed successfully!")
