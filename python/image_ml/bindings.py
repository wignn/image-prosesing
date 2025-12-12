"""
FFI bindings to the Rust image pipeline library

Uses cffi/ctypes to call the compiled Rust library (.dll on Windows, .so on Linux)
"""

import ctypes
import os
import sys
from pathlib import Path
from typing import Optional, Tuple
import numpy as np


def _find_library() -> Path:
    """Find the compiled Rust library"""
    # Determine library name based on platform
    if sys.platform == "win32":
        lib_name = "image_pipeline.dll"
    elif sys.platform == "darwin":
        lib_name = "libimage_pipeline.dylib"
    else:
        lib_name = "libimage_pipeline.so"
    
    # Search paths
    search_paths = [
        # Local build
        Path(__file__).parent.parent.parent / "rust-core" / "target" / "release" / lib_name,
        Path(__file__).parent.parent.parent / "rust-core" / "target" / "debug" / lib_name,
        # Installed location
        Path(__file__).parent / "lib" / lib_name,
        # System paths
        Path("/usr/local/lib") / lib_name,
    ]
    
    for path in search_paths:
        if path.exists():
            return path
    
    raise FileNotFoundError(
        f"Could not find {lib_name}. "
        f"Please build the Rust library first with 'cargo build --release' in rust-core/"
    )


class ImageHandle(ctypes.Structure):
    """Opaque handle for image data - matches Rust FFI struct"""
    pass


class ImageProcessor:
    """
    High-performance image processor using Rust FFI
    
    Usage:
        processor = ImageProcessor()
        processor.load_from_numpy(image_array)
        processor.grayscale()
        result = processor.to_numpy()
    """
    
    _lib: Optional[ctypes.CDLL] = None
    _handle: Optional[ctypes.POINTER] = None
    
    def __init__(self, library_path: Optional[str] = None):
        """Initialize the processor and load the Rust library"""
        if library_path:
            lib_path = Path(library_path)
        else:
            lib_path = _find_library()
        
        self._lib = ctypes.CDLL(str(lib_path))
        self._setup_functions()
        self._handle = None
        self._width = 0
        self._height = 0
    
    def _setup_functions(self):
        """Setup function signatures for type checking"""
        # Create
        self._lib.image_pipeline_create.argtypes = [
            ctypes.POINTER(ctypes.c_uint8),
            ctypes.c_uint32,
            ctypes.c_uint32,
        ]
        self._lib.image_pipeline_create.restype = ctypes.POINTER(ImageHandle)
        
        # Free
        self._lib.image_pipeline_free.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_free.restype = None
        
        # Getters
        self._lib.image_pipeline_get_width.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_get_width.restype = ctypes.c_uint32
        
        self._lib.image_pipeline_get_height.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_get_height.restype = ctypes.c_uint32
        
        self._lib.image_pipeline_get_data.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_get_data.restype = ctypes.POINTER(ctypes.c_uint8)
        
        self._lib.image_pipeline_get_data_size.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_get_data_size.restype = ctypes.c_size_t
        
        # Filters
        self._lib.image_pipeline_grayscale.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_grayscale.restype = ctypes.c_int32
        
        self._lib.image_pipeline_brightness.argtypes = [
            ctypes.POINTER(ImageHandle), ctypes.c_float
        ]
        self._lib.image_pipeline_brightness.restype = ctypes.c_int32
        
        self._lib.image_pipeline_contrast.argtypes = [
            ctypes.POINTER(ImageHandle), ctypes.c_float
        ]
        self._lib.image_pipeline_contrast.restype = ctypes.c_int32
        
        self._lib.image_pipeline_blur.argtypes = [
            ctypes.POINTER(ImageHandle), ctypes.c_float
        ]
        self._lib.image_pipeline_blur.restype = ctypes.c_int32
        
        self._lib.image_pipeline_sharpen.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_sharpen.restype = ctypes.c_int32
        
        self._lib.image_pipeline_edge_detect.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_edge_detect.restype = ctypes.c_int32
        
        self._lib.image_pipeline_resize.argtypes = [
            ctypes.POINTER(ImageHandle), ctypes.c_uint32, ctypes.c_uint32
        ]
        self._lib.image_pipeline_resize.restype = ctypes.c_int32
        
        self._lib.image_pipeline_invert.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_invert.restype = ctypes.c_int32
        
        self._lib.image_pipeline_sepia.argtypes = [ctypes.POINTER(ImageHandle)]
        self._lib.image_pipeline_sepia.restype = ctypes.c_int32
        
        # Copy
        self._lib.image_pipeline_copy_to.argtypes = [
            ctypes.POINTER(ImageHandle),
            ctypes.POINTER(ctypes.c_uint8),
            ctypes.c_size_t,
        ]
        self._lib.image_pipeline_copy_to.restype = ctypes.c_int32
        
        # Version
        self._lib.image_pipeline_version.argtypes = []
        self._lib.image_pipeline_version.restype = ctypes.c_char_p
    
    def __del__(self):
        """Clean up resources"""
        self._free_handle()
    
    def _free_handle(self):
        """Free the current image handle"""
        if self._handle is not None and self._lib is not None:
            self._lib.image_pipeline_free(self._handle)
            self._handle = None
    
    def load_from_numpy(self, image: np.ndarray) -> "ImageProcessor":
        """
        Load an image from a numpy array
        
        Args:
            image: numpy array of shape (H, W, 4) for RGBA or (H, W, 3) for RGB
        
        Returns:
            self for chaining
        """
        self._free_handle()
        
        # Ensure RGBA format
        if image.ndim == 2:
            # Grayscale -> RGBA
            rgba = np.zeros((*image.shape, 4), dtype=np.uint8)
            rgba[:, :, 0] = image
            rgba[:, :, 1] = image
            rgba[:, :, 2] = image
            rgba[:, :, 3] = 255
            image = rgba
        elif image.shape[2] == 3:
            # RGB -> RGBA
            rgba = np.zeros((image.shape[0], image.shape[1], 4), dtype=np.uint8)
            rgba[:, :, :3] = image
            rgba[:, :, 3] = 255
            image = rgba
        
        # Ensure contiguous and uint8
        image = np.ascontiguousarray(image, dtype=np.uint8)
        
        self._height, self._width = image.shape[:2]
        data_ptr = image.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8))
        
        self._handle = self._lib.image_pipeline_create(
            data_ptr,
            ctypes.c_uint32(self._width),
            ctypes.c_uint32(self._height),
        )
        
        if not self._handle:
            raise RuntimeError("Failed to create image handle")
        
        return self
    
    def to_numpy(self) -> np.ndarray:
        """
        Get the processed image as a numpy array
        
        Returns:
            numpy array of shape (H, W, 4) in RGBA format
        """
        if self._handle is None:
            raise RuntimeError("No image loaded")
        
        # Get current dimensions (may have changed due to resize)
        width = self._lib.image_pipeline_get_width(self._handle)
        height = self._lib.image_pipeline_get_height(self._handle)
        size = self._lib.image_pipeline_get_data_size(self._handle)
        
        # Create output array
        output = np.zeros((height, width, 4), dtype=np.uint8)
        output_ptr = output.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8))
        
        result = self._lib.image_pipeline_copy_to(
            self._handle,
            output_ptr,
            ctypes.c_size_t(size),
        )
        
        if result != 0:
            raise RuntimeError(f"Failed to copy image data: error code {result}")
        
        return output
    
    @property
    def size(self) -> Tuple[int, int]:
        """Get image dimensions (width, height)"""
        if self._handle is None:
            return (0, 0)
        return (
            self._lib.image_pipeline_get_width(self._handle),
            self._lib.image_pipeline_get_height(self._handle),
        )
    
    def grayscale(self) -> "ImageProcessor":
        """Apply grayscale filter"""
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_grayscale(self._handle)
        if result != 0:
            raise RuntimeError("Grayscale filter failed")
        return self
    
    def brightness(self, value: float) -> "ImageProcessor":
        """
        Adjust brightness
        
        Args:
            value: -1.0 (darker) to 1.0 (brighter)
        """
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_brightness(
            self._handle, ctypes.c_float(value)
        )
        if result != 0:
            raise RuntimeError("Brightness filter failed")
        return self
    
    def contrast(self, value: float) -> "ImageProcessor":
        """
        Adjust contrast
        
        Args:
            value: 0.0 (no contrast) to 2.0+ (high contrast)
        """
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_contrast(
            self._handle, ctypes.c_float(value)
        )
        if result != 0:
            raise RuntimeError("Contrast filter failed")
        return self
    
    def blur(self, sigma: float) -> "ImageProcessor":
        """
        Apply Gaussian blur
        
        Args:
            sigma: blur radius (higher = more blur)
        """
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_blur(
            self._handle, ctypes.c_float(sigma)
        )
        if result != 0:
            raise RuntimeError("Blur filter failed")
        return self
    
    def sharpen(self) -> "ImageProcessor":
        """Apply sharpening filter"""
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_sharpen(self._handle)
        if result != 0:
            raise RuntimeError("Sharpen filter failed")
        return self
    
    def edge_detect(self) -> "ImageProcessor":
        """Apply edge detection (Sobel operator)"""
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_edge_detect(self._handle)
        if result != 0:
            raise RuntimeError("Edge detection failed")
        return self
    
    def resize(self, width: int, height: int) -> "ImageProcessor":
        """
        Resize image
        
        Args:
            width: new width
            height: new height
        """
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_resize(
            self._handle,
            ctypes.c_uint32(width),
            ctypes.c_uint32(height),
        )
        if result != 0:
            raise RuntimeError("Resize failed")
        return self
    
    def invert(self) -> "ImageProcessor":
        """Invert colors"""
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_invert(self._handle)
        if result != 0:
            raise RuntimeError("Invert filter failed")
        return self
    
    def sepia(self) -> "ImageProcessor":
        """Apply sepia tone"""
        if self._handle is None:
            raise RuntimeError("No image loaded")
        result = self._lib.image_pipeline_sepia(self._handle)
        if result != 0:
            raise RuntimeError("Sepia filter failed")
        return self


def get_library_version() -> str:
    """Get the version of the Rust library"""
    try:
        lib_path = _find_library()
        lib = ctypes.CDLL(str(lib_path))
        lib.image_pipeline_version.restype = ctypes.c_char_p
        version = lib.image_pipeline_version()
        return version.decode("utf-8")
    except Exception as e:
        return f"Unknown (error: {e})"
