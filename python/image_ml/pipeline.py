from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Union, Callable
import numpy as np

from .bindings import ImageProcessor


@dataclass
class PreprocessConfig:
    target_size: Optional[Tuple[int, int]] = None
    
    normalize: bool = True
    mean: Tuple[float, float, float] = (0.485, 0.456, 0.406)
    std: Tuple[float, float, float] = (0.229, 0.224, 0.225)
    
    filters: List[str] = field(default_factory=list)
    
    to_grayscale: bool = False
    output_channels: int = 3  
    output_dtype: str = "float32" 


class ImagePreprocessor:
    """
    High-performance image preprocessor using Rust backend
    
    Designed for ML workflows with batch processing support.
    
    Usage:
        config = PreprocessConfig(
            target_size=(224, 224),
            normalize=True,
        )
        preprocessor = ImagePreprocessor(config)
        
        # Single image
        tensor = preprocessor.process(image)
        
        # Batch
        tensors = preprocessor.process_batch(images)
    """
    
    def __init__(self, config: Optional[PreprocessConfig] = None):
        """
        Initialize preprocessor with configuration
        
        Args:
            config: Preprocessing configuration (defaults to ImageNet settings)
        """
        self.config = config or PreprocessConfig()
        self._processor = ImageProcessor()
    
    def process(self, image: np.ndarray) -> np.ndarray:
        """
        Process a single image
        
        Args:
            image: Input image as numpy array (H, W, C) or (H, W)
        
        Returns:
            Processed image as numpy array (C, H, W) for ML frameworks
        """
        self._processor.load_from_numpy(image)
        
        for filter_name in self.config.filters:
            self._apply_filter(filter_name)
        
        if self.config.target_size:
            self._processor.resize(*self.config.target_size)
        
        if self.config.to_grayscale:
            self._processor.grayscale()
        
        # Get result
        result = self._processor.to_numpy()
        
        if self.config.output_channels == 3:
            result = result[:, :, :3]  
        elif self.config.output_channels == 1:
            if not self.config.to_grayscale:
                result = np.mean(result[:, :, :3], axis=2, keepdims=True)
            else:
                result = result[:, :, :1]
        
        # Normalize
        if self.config.normalize:
            result = result.astype(np.float32) / 255.0
            mean = np.array(self.config.mean[:self.config.output_channels])
            std = np.array(self.config.std[:self.config.output_channels])
            result = (result - mean) / std
        
        if self.config.output_dtype == "float16":
            result = result.astype(np.float16)
        elif self.config.output_dtype == "uint8":
            if self.config.normalize:
                result = (result * 255).astype(np.uint8)
            else:
                result = result.astype(np.uint8)
        elif self.config.output_dtype == "float32":
            result = result.astype(np.float32)
        
        if len(result.shape) == 3:
            result = np.transpose(result, (2, 0, 1))
        
        return result
    
    def process_batch(
        self, 
        images: List[np.ndarray],
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ) -> np.ndarray:
        """
        Process a batch of images
        
        Args:
            images: List of input images
            progress_callback: Optional callback(current, total) for progress
        
        Returns:
            Batch tensor of shape (N, C, H, W)
        """
        results = []
        total = len(images)
        
        for i, image in enumerate(images):
            result = self.process(image)
            results.append(result)
            
            if progress_callback:
                progress_callback(i + 1, total)
        
        return np.stack(results, axis=0)
    
    def _apply_filter(self, filter_name: str):
        """Apply a named filter"""
        filter_map = {
            "grayscale": self._processor.grayscale,
            "sharpen": self._processor.sharpen,
            "edge_detect": self._processor.edge_detect,
            "invert": self._processor.invert,
            "sepia": self._processor.sepia,
        }
        
        if filter_name in filter_map:
            filter_map[filter_name]()
        elif filter_name.startswith("brightness:"):
            value = float(filter_name.split(":")[1])
            self._processor.brightness(value)
        elif filter_name.startswith("contrast:"):
            value = float(filter_name.split(":")[1])
            self._processor.contrast(value)
        elif filter_name.startswith("blur:"):
            sigma = float(filter_name.split(":")[1])
            self._processor.blur(sigma)
        else:
            raise ValueError(f"Unknown filter: {filter_name}")
    
    def to_pytorch_tensor(self, image: np.ndarray):
        """
        Process and convert to PyTorch tensor
        
        Args:
            image: Input image
        
        Returns:
            PyTorch tensor
        
        Requires:
            torch must be installed
        """
        try:
            import torch
        except ImportError:
            raise ImportError("PyTorch is required for to_pytorch_tensor()")
        
        processed = self.process(image)
        return torch.from_numpy(processed)
    
    def to_tensorflow_tensor(self, image: np.ndarray):
        """
        Process and convert to TensorFlow tensor
        
        Args:
            image: Input image
        
        Returns:
            TensorFlow tensor (in NHWC format as TF prefers)
        
        Requires:
            tensorflow must be installed
        """
        try:
            import tensorflow as tf
        except ImportError:
            raise ImportError("TensorFlow is required for to_tensorflow_tensor()")
        
        processed = self.process(image)
        # TensorFlow prefers NHWC, so transpose back
        if len(processed.shape) == 3:
            processed = np.transpose(processed, (1, 2, 0))
        return tf.convert_to_tensor(processed)


class DatasetPreprocessor:
    """
    Preprocessor for dataset loading with caching support
    """
    
    def __init__(
        self,
        config: PreprocessConfig,
        cache_dir: Optional[str] = None,
    ):
        self.preprocessor = ImagePreprocessor(config)
        self.cache_dir = cache_dir
    
    def preprocess_directory(
        self,
        input_dir: str,
        output_dir: Optional[str] = None,
        extensions: Tuple[str, ...] = (".jpg", ".jpeg", ".png", ".bmp"),
    ) -> List[str]:

        from pathlib import Path
        
        input_path = Path(input_dir)
        results = []
        
        for ext in extensions:
            for img_path in input_path.glob(f"*{ext}"):
                # Load image
                from PIL import Image
                image = np.array(Image.open(img_path))
                
                # Process
                processed = self.preprocessor.process(image)
                
                if output_dir:
                    output_path = Path(output_dir) / f"{img_path.stem}.npy"
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    np.save(output_path, processed)
                    results.append(str(output_path))
                else:
                    results.append(processed)
        
        return results
