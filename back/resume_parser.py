import PyPDF2
import io
from typing import Optional


def extract_text_from_pdf(file_content: bytes) -> str:
    """
    Extract text from a PDF file.
    
    Args:
        file_content: Raw bytes of the PDF file
        
    Returns:
        Extracted text as a string
    """
    try:
        pdf_file = io.BytesIO(file_content)
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise Exception(f"Failed to parse PDF: {e}")


def extract_text_from_file(file_content: bytes, filename: str) -> str:
    """
    Extract text from a file (PDF or plain text).
    
    Args:
        file_content: Raw bytes of the file
        filename: Original filename to determine type
        
    Returns:
        Extracted text as a string
    """
    filename_lower = filename.lower()
    
    if filename_lower.endswith('.pdf'):
        return extract_text_from_pdf(file_content)
    elif filename_lower.endswith(('.txt', '.md')):
        return file_content.decode('utf-8', errors='ignore')
    else:
        # Try to decode as text anyway
        return file_content.decode('utf-8', errors='ignore')
