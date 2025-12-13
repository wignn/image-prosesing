"""Word to PDF document conversion."""

import os
import subprocess
import sys

from pdf_operations import (
    SUCCESS,
    ERROR_FILE_NOT_FOUND,
    ERROR_CONVERSION_FAILED,
)


def word_to_pdf(input_path: str, output_path: str) -> int:
    """Convert Word document to PDF.
    
    Uses LibreOffice in headless mode for conversion.
    Falls back to docx2pdf on Windows if available.
    
    Args:
        input_path: Path to the DOCX file.
        output_path: Path for the output PDF file.
        
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
            
        if sys.platform == "win32":
            # Try using docx2pdf on Windows (requires MS Word)
            try:
                from docx2pdf import convert
                convert(input_path, output_path)
                return SUCCESS
            except Exception:
                pass
                
        # Use LibreOffice headless mode (cross-platform)
        libreoffice_paths = [
            "libreoffice",
            "soffice",
            "/usr/bin/libreoffice",
            "/usr/bin/soffice",
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ]
        
        for lo_path in libreoffice_paths:
            try:
                result = subprocess.run(
                    [
                        lo_path,
                        "--headless",
                        "--convert-to", "pdf",
                        "--outdir", output_dir or ".",
                        input_path,
                    ],
                    capture_output=True,
                    timeout=60,
                )
                
                if result.returncode == 0:
                    # LibreOffice saves with original filename, rename if needed
                    base_name = os.path.splitext(os.path.basename(input_path))[0]
                    expected_output = os.path.join(output_dir or ".", f"{base_name}.pdf")
                    
                    if expected_output != output_path and os.path.exists(expected_output):
                        os.rename(expected_output, output_path)
                        
                    return SUCCESS
                    
            except (FileNotFoundError, subprocess.TimeoutExpired):
                continue
                
        return ERROR_CONVERSION_FAILED
        
    except FileNotFoundError:
        return ERROR_FILE_NOT_FOUND
    except Exception:
        return ERROR_CONVERSION_FAILED
