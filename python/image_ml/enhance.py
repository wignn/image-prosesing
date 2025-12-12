"""
Waifu2x AI Image Enhancement

Wrapper for waifu2x-ncnn-vulkan executable.
Download from: https://github.com/nihui/waifu2x-ncnn-vulkan/releases
"""

import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Literal
import numpy as np

# Try to import PIL for image loading
try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


class Waifu2xEnhancer:
    """
    AI Image Enhancement using waifu2x-ncnn-vulkan.
    
    Features:
    - Upscale: 2x, 4x, 8x, 16x, 32x
    - Denoise: Level -1 (none) to 3 (strong)
    - GPU accelerated via Vulkan
    
    Usage:
        enhancer = Waifu2xEnhancer()
        result = enhancer.enhance(image_array, scale=2, noise=2)
    """
    
    # Default paths to look for waifu2x executable
    DEFAULT_PATHS = [
        "tools/waifu2x/waifu2x-ncnn-vulkan.exe",
        "tools/waifu2x/waifu2x-ncnn-vulkan",
        "../tools/waifu2x/waifu2x-ncnn-vulkan.exe",
        "waifu2x-ncnn-vulkan.exe",
        "waifu2x-ncnn-vulkan",
    ]
    
    def __init__(self, executable_path: Optional[str] = None):
        """
        Initialize the enhancer.
        
        Args:
            executable_path: Path to waifu2x-ncnn-vulkan executable.
                           If None, searches default locations.
        """
        self.executable = self._find_executable(executable_path)
        self._temp_dir = None
    
    def _find_executable(self, path: Optional[str]) -> Optional[str]:
        """Find the waifu2x executable."""
        if path and os.path.isfile(path):
            return os.path.abspath(path)
        
        # Search default paths
        for p in self.DEFAULT_PATHS:
            if os.path.isfile(p):
                return os.path.abspath(p)
        
        # Try PATH
        exe_name = "waifu2x-ncnn-vulkan.exe" if os.name == 'nt' else "waifu2x-ncnn-vulkan"
        result = shutil.which(exe_name)
        if result:
            return result
        
        return None
    
    @property
    def is_available(self) -> bool:
        """Check if waifu2x is available."""
        return self.executable is not None
    
    def enhance(
        self,
        image: np.ndarray,
        scale: Literal[1, 2, 4, 8, 16, 32] = 2,
        noise: Literal[-1, 0, 1, 2, 3] = -1,
        gpu_id: int = 0,
        tile_size: int = 0,  # 0 = auto
        tta_mode: bool = False,
    ) -> np.ndarray:
        """
        Enhance image using waifu2x.
        
        Args:
            image: Input image as numpy array (H, W, C) RGB/RGBA
            scale: Upscale ratio (1/2/4/8/16/32)
            noise: Denoise level (-1=none, 0/1/2/3=light to strong)
            gpu_id: GPU device (-1=cpu, 0+=gpu)
            tile_size: Tile size (0=auto, >=32 for manual)
            tta_mode: Enable TTA mode (slower but better quality)
            
        Returns:
            Enhanced image as numpy array
            
        Raises:
            RuntimeError: If waifu2x is not available
            ValueError: If image format is invalid
        """
        if not self.is_available:
            raise RuntimeError(
                "waifu2x-ncnn-vulkan not found. "
                "Download from: https://github.com/nihui/waifu2x-ncnn-vulkan/releases "
                "and place in tools/waifu2x/"
            )
        
        if not HAS_PIL:
            raise RuntimeError("Pillow is required: pip install Pillow")
        
        if image.ndim != 3:
            raise ValueError(f"Expected 3D array (H,W,C), got {image.ndim}D")
        
        # Create temp directory
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = os.path.join(temp_dir, "input.png")
            output_path = os.path.join(temp_dir, "output.png")
            
            # Save input image
            if image.shape[2] == 4:  # RGBA
                pil_image = Image.fromarray(image, mode='RGBA')
            else:  # RGB
                pil_image = Image.fromarray(image, mode='RGB')
            pil_image.save(input_path)
            
            # Build command
            cmd = [
                self.executable,
                "-i", input_path,
                "-o", output_path,
                "-s", str(scale),
                "-n", str(noise),
                "-g", str(gpu_id),
                "-t", str(tile_size),
                "-f", "png",
            ]
            
            if tta_mode:
                cmd.append("-x")
            
            # Run waifu2x
            try:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minute timeout
                )
                
                if result.returncode != 0:
                    raise RuntimeError(f"waifu2x failed: {result.stderr}")
                
            except subprocess.TimeoutExpired:
                raise RuntimeError("waifu2x timed out after 5 minutes")
            
            # Load output
            if not os.path.exists(output_path):
                raise RuntimeError("waifu2x did not produce output")
            
            output_image = Image.open(output_path)
            return np.array(output_image)
    
    def upscale_2x(self, image: np.ndarray, denoise: bool = True) -> np.ndarray:
        """Upscale image 2x with optional denoise."""
        return self.enhance(image, scale=2, noise=2 if denoise else -1)
    
    def upscale_4x(self, image: np.ndarray, denoise: bool = True) -> np.ndarray:
        """Upscale image 4x with optional denoise."""
        return self.enhance(image, scale=4, noise=2 if denoise else -1)
    
    def denoise(self, image: np.ndarray, level: int = 2) -> np.ndarray:
        """Denoise image without upscaling."""
        return self.enhance(image, scale=1, noise=level)


# Convenience functions
_default_enhancer: Optional[Waifu2xEnhancer] = None

def get_enhancer() -> Waifu2xEnhancer:
    """Get default enhancer instance."""
    global _default_enhancer
    if _default_enhancer is None:
        _default_enhancer = Waifu2xEnhancer()
    return _default_enhancer

def enhance_image(
    image: np.ndarray,
    scale: int = 2,
    noise: int = -1,
) -> np.ndarray:
    """
    Quick enhance function.
    
    Args:
        image: Input image (numpy array)
        scale: Upscale ratio (1/2/4/8/16/32)
        noise: Denoise level (-1 to 3)
    
    Returns:
        Enhanced image
    """
    return get_enhancer().enhance(image, scale=scale, noise=noise)

def is_waifu2x_available() -> bool:
    """Check if waifu2x is available."""
    return get_enhancer().is_available
