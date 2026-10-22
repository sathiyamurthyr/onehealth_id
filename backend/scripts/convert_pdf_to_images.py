import sys
from pathlib import Path
import pypdfium2 as pdfium

def convert_pdf(pdf_path: Path, output_dir: Path):
    if not pdf_path.exists():
        print(f"Error: {pdf_path} does not exist")
        sys.exit(1)
        
    pdf = pdfium.PdfDocument(pdf_path)
    total_pages = len(pdf)
    print(f"Total pages in {pdf_path.name}: {total_pages}")
    
    for page_idx in range(total_pages):
        page = pdf[page_idx]
        # Render at 300 DPI (approx scale 4.167 for standard 72 DPI PDF)
        image = page.render(scale=3).to_pil()
        out_file = output_dir / f"new_pdf_page_{page_idx + 1}.png"
        image.save(out_file)
        print(f"Rendered Page {page_idx + 1} to {out_file}")

if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent.parent
    pdf_file = base_dir / "artifacts" / "prescription_RX-20261003-00124.pdf"
    artifacts_dir = base_dir / "artifacts"
    convert_pdf(pdf_file, artifacts_dir)
