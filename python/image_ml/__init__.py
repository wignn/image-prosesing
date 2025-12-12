"""
Image ML - Python bindings for Rust image processing pipeline

This package provides:
- High-performance image preprocessing using Rust FFI
- Integration with PyTorch/TensorFlow for ML pipelines
- Batch processing utilities
- AI image enhancement (waifu2x)
"""

from .bindings import ImageProcessor, get_library_version
from .pipeline import ImagePreprocessor, PreprocessConfig
from .enhance import Waifu2xEnhancer, enhance_image, is_waifu2x_available

__version__ = "0.1.0"
__all__ = [
    "ImageProcessor",
    "ImagePreprocessor", 
    "PreprocessConfig",
    "get_library_version",
    "Waifu2xEnhancer",
    "enhance_image",
    "is_waifu2x_available",
]
