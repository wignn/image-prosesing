"""Image to PDF conversion."""

import os
from typing import List
import fitz  # PyMuPDF
from PIL import Image

from pdf_operations import (
    SUCCESS,
    ERROR_FILE_NOT_FOUND,
    ERROR_CONVERSION_FAILED,
    ERROR_INVALID_ARGUMENT,
)


def images_to_pdf(image_paths: List[str], output_path: str) -> int:
    """Convert multiple images to a single PDF.
    
    Args:
        image_paths: List of image file paths.
        output_path: Path for the output PDF.
        
    Returns:
        SUCCESS (0) or error code.
    """
    try:
        if not image_paths:
            return ERROR_INVALID_ARGUMENT
            
        for path in image_paths:
            if not os.path.exists(path):
                return ERROR_FILE_NOT_FOUND
                
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            
        doc = fitz.open()
        
        for img_path in image_paths:
            # Open with PIL to get dimensions
            with Image.open(img_path) as img:
                width, height = img.size
                
            # Create new page with image dimensions (convert pixels to points)
            # Assume 72 DPI for page size
            page_width = width * 72 / 96  # Common screen DPI to PDF points
            page_height = height * 72 / 96
            
            page = doc.new_page(width=page_width, height=page_height)
            
            # Insert image to fill the page
            rect = fitz.Rect(0, 0, page_width, page_height)
            page.insert_image(rect, filename=img_path)
            
        doc.save(output_path)
        doc.close()
        
        return SUCCESS
        
    except FileNotFoundError:
        return ERROR_FILE_NOT_FOUND
    except Exception:
        return ERROR_CONVERSION_FAILED


def image_to_pdf(image_path: str, output_path: str) -> int:
    """Convert a single image to PDF.
    
    Args:
        image_path: Path to the image file.
        output_path: Path for the output PDF.
        
    Returns:
        SUCCESS (0) or error code.
    """
    return images_to_pdf([image_path], output_path)
