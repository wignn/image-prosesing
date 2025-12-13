"""PDF to Word document conversion."""

import os
from pdf2docx import Converter

from pdf_operations import (
    SUCCESS,
    ERROR_FILE_NOT_FOUND,
    ERROR_CONVERSION_FAILED,
)


def pdf_to_word(input_path: str, output_path: str) -> int:
    """Convert PDF to Word document.
    
    Args:
        input_path: Path to the PDF file.
        output_path: Path for the output DOCX file.
        
    Returns:
        SUCCESS (0) or error code.
    """
    try:
        if not os.path.exists(input_path):
            return ERROR_FILE_NOT_FOUND
            
        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir, exist_ok=True)
            
        cv = Converter(input_path)
        cv.convert(output_path)
        cv.close()
        
        return SUCCESS
        
    except FileNotFoundError:
        return ERROR_FILE_NOT_FOUND
    except Exception:
        return ERROR_CONVERSION_FAILED
