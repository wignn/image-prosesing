"""
Example ML model integration with Rust-accelerated preprocessing

Demonstrates how to use the image pipeline with PyTorch models.
"""

from typing import Optional, List, Tuple
import numpy as np

from .pipeline import ImagePreprocessor, PreprocessConfig


class ImageClassifier:
    def __init__(
        self,
        model_name: str = "resnet18",
        device: str = "cpu",
        pretrained: bool = True,
    ):
        self.device = device
        self.model = None
        self.preprocessor = None
        self._model_name = model_name
        self._pretrained = pretrained
    
    def load_model(self):
        try:
            import torch
            import torchvision.models as models
        except ImportError:
            raise ImportError(
                "PyTorch and torchvision are required. "
                "Install with: pip install torch torchvision"
            )
        
        if hasattr(models, self._model_name):
            model_fn = getattr(models, self._model_name)
            if self._pretrained:
                weights = "IMAGENET1K_V1"
                self.model = model_fn(weights=weights)
            else:
                self.model = model_fn(weights=None)
        else:
            raise ValueError(f"Unknown model: {self._model_name}")
        
        self.model = self.model.to(self.device)
        self.model.eval()
        
        self.preprocessor = ImagePreprocessor(PreprocessConfig(
            target_size=(224, 224),
            normalize=True,
            mean=(0.485, 0.456, 0.406),
            std=(0.229, 0.224, 0.225),
            output_channels=3,
            output_dtype="float32",
        ))
    
    def predict(self, image: np.ndarray) -> Tuple[int, float]:
        if self.model is None:
            self.load_model()
        
        import torch
        
        tensor = self.preprocessor.to_pytorch_tensor(image)
        tensor = tensor.unsqueeze(0).to(self.device)  
        
        # Inference
        with torch.no_grad():
            outputs = self.model(tensor)
            probabilities = torch.softmax(outputs, dim=1)
            confidence, class_id = torch.max(probabilities, dim=1)
        
        return class_id.item(), confidence.item()
    
    def predict_batch(
        self,
        images: List[np.ndarray],
        batch_size: int = 32,
    ) -> List[Tuple[int, float]]:
        if self.model is None:
            self.load_model()
        
        import torch
        
        results = []
        
        for i in range(0, len(images), batch_size):
            batch_images = images[i:i + batch_size]
            
            # Preprocess batch with Rust
            batch_tensor = self.preprocessor.process_batch(batch_images)
            batch_tensor = torch.from_numpy(batch_tensor).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(batch_tensor)
                probabilities = torch.softmax(outputs, dim=1)
                confidences, class_ids = torch.max(probabilities, dim=1)
            
            for class_id, confidence in zip(class_ids.tolist(), confidences.tolist()):
                results.append((class_id, confidence))
        
        return results

class FeatureExtractor:
    def __init__(
        self,
        model_name: str = "resnet18",
        device: str = "cpu",
        layer: str = "avgpool",
    ):

        self.device = device
        self.model = None
        self.preprocessor = None
        self._model_name = model_name
        self._layer = layer
        self._features = None
    
    def load_model(self):
        try:
            import torch
            import torchvision.models as models
        except ImportError:
            raise ImportError("PyTorch and torchvision are required")
        
        model_fn = getattr(models, self._model_name)
        self.model = model_fn(weights="IMAGENET1K_V1")
        self.model = self.model.to(self.device)
        self.model.eval()
        
        def hook(module, input, output):
            self._features = output
        
        for name, layer in self.model.named_modules():
            if name == self._layer:
                layer.register_forward_hook(hook)
                break
        
        self.preprocessor = ImagePreprocessor(PreprocessConfig(
            target_size=(224, 224),
            normalize=True,
        ))
    
    def extract(self, image: np.ndarray) -> np.ndarray:
        if self.model is None:
            self.load_model()
        
        import torch
        
        # Preprocess
        tensor = self.preprocessor.to_pytorch_tensor(image)
        tensor = tensor.unsqueeze(0).to(self.device)
        
        # Forward pass
        with torch.no_grad():
            _ = self.model(tensor)
        
        # Get captured features
        features = self._features.cpu().numpy().flatten()
        return features
    
    def extract_batch(
        self,
        images: List[np.ndarray],
        batch_size: int = 32,
    ) -> np.ndarray:
        if self.model is None:
            self.load_model()
        
        import torch
        
        all_features = []
        
        for i in range(0, len(images), batch_size):
            batch_images = images[i:i + batch_size]
            batch_tensor = self.preprocessor.process_batch(batch_images)
            batch_tensor = torch.from_numpy(batch_tensor).to(self.device)
            
            with torch.no_grad():
                _ = self.model(batch_tensor)
            
            features = self._features.cpu().numpy()
            # Flatten each feature map
            features = features.reshape(features.shape[0], -1)
            all_features.append(features)
        
        return np.concatenate(all_features, axis=0)
