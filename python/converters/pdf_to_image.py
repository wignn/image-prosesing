"""PDF to image conversion."""

import os
from typing import Optional
import fitz  # PyMuPDF

from pdf_operations import (
    SUCCESS,
    ERROR_FILE_NOT_FOUND,
    ERROR_CONVERSION_FAILED,
    ERROR_INVALID_ARGUMENT,
)


def pdf_to_images(
    input_path: str, 
    output_dir: str, 
    dpi: int = 200,
    image_format: str = "png"
) -> int:
    """Convert PDF pages to images.
    
    Args:
        input_path: Path to the PDF file.
        output_dir: Directory for output images.
        dpi: Resolution in DPI (default 200).
        image_format: Output format (png, jpg, jpeg).
        
    Returns:
        SUCCESS (0) or error code.
    """
    try:
        if not os.path.exists(input_path):
            return ERROR_FILE_NOT_FOUND
            
        if dpi < 72 or dpi > 600:
            return ERROR_INVALID_ARGUMENT
            
        if image_format.lower() not in ("png", "jpg", "jpeg"):
            return ERROR_INVALID_ARGUMENT
            
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)
        
        doc = fitz.open(input_path)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Calculate zoom from DPI (72 is default PDF DPI)
            zoom = dpi / 72
            matrix = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=matrix)
            
            output_file = os.path.join(
                output_dir, 
                f"page_{page_num + 1:04d}.{image_format.lower()}"
            )
            pix.save(output_file)
            
        doc.close()
        return SUCCESS
        
    except FileNotFoundError:
        return ERROR_FILE_NOT_FOUND
    except Exception:
        return ERROR_CONVERSION_FAILED


def pdf_page_to_image(
    input_path: str,
    output_path: str,
    page: int,
    dpi: int = 200
) -> int:
    """Convert a single PDF page to image.
    
    Args:
        input_path: Path to the PDF file.
        output_path: Path for the output image.
        page: Page index (0-based).
        dpi: Resolution in DPI (default 200).
        
    Returns:
        SUCCESS (0) or error code.
    """
    try:
        if not os.path.exists(input_path):
            return ERROR_FILE_NOT_FOUND
            
        doc = fitz.open(input_path)
        
        if page < 0 or page >= len(doc):
            doc.close()
            return ERROR_INVALID_ARGUMENT
            
        pdf_page = doc[page]
        zoom = dpi / 72
        matrix = fitz.Matrix(zoom, zoom)
        pix = pdf_page.get_pixmap(matrix=matrix)
        pix.save(output_path)
        
        doc.close()
        return SUCCESS
        
    except FileNotFoundError:
        return ERROR_FILE_NOT_FOUND
    except Exception:
        return ERROR_CONVERSION_FAILED
