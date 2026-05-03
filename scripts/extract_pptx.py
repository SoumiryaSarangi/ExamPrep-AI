import importlib
import re
import sys
from pathlib import Path


RECOVERABLE_ERRORS = (AttributeError, IndexError, KeyError, OSError, RuntimeError, TypeError, ValueError)


def load_pptx_symbols():
    try:
        presentation_module = importlib.import_module("pptx")
        shapes_module = importlib.import_module("pptx.enum.shapes")
        return presentation_module.Presentation, shapes_module.MSO_SHAPE_TYPE
    except ModuleNotFoundError:
        print("Error: python-pptx is not installed. Run: pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)


def normalize_text(value):
    return re.sub(r"\s+", " ", value).strip()


def paragraph_to_line(paragraph):
    if paragraph.runs:
        text = "".join(run.text or "" for run in paragraph.runs)
    else:
        text = paragraph.text or ""
    return normalize_text(text)


def extract_shape_lines(shape, group_shape_type):
    lines = []

    try:
        if shape.shape_type == group_shape_type.GROUP:
            for child_shape in shape.shapes:
                lines.extend(extract_shape_lines(child_shape, group_shape_type))
            return lines
    except RECOVERABLE_ERRORS:
        return lines

    try:
        if shape.has_text_frame and shape.text_frame:
            for paragraph in shape.text_frame.paragraphs:
                line = paragraph_to_line(paragraph)
                if line:
                    lines.append(line)
    except RECOVERABLE_ERRORS:
        pass

    try:
        if shape.has_table:
            for row in shape.table.rows:
                for cell in row.cells:
                    for paragraph in cell.text_frame.paragraphs:
                        line = paragraph_to_line(paragraph)
                        if line:
                            lines.append(line)
    except RECOVERABLE_ERRORS:
        pass

    return lines


def extract_file_text(file_path, presentation_cls, group_shape_type):
    try:
        presentation = presentation_cls(str(file_path))
    except RECOVERABLE_ERRORS as error:
        print(f"Warning: skipping unreadable file {file_path}: {error}", file=sys.stderr)
        return ""

    parts = [f"=== File: {file_path.name} ==="]

    for slide_number, slide in enumerate(presentation.slides, start=1):
        slide_lines = []

        for shape in slide.shapes:
            try:
                slide_lines.extend(extract_shape_lines(shape, group_shape_type))
            except RECOVERABLE_ERRORS as error:
                print(
                    f"Warning: skipping shape in {file_path.name} slide {slide_number}: {error}",
                    file=sys.stderr,
                )

        if slide_lines:
            parts.append(f"--- Slide {slide_number} ---")
            parts.extend(slide_lines)
            parts.append("")

    return "\n".join(parts).strip()


def main():
    presentation_cls, group_shape_type = load_pptx_symbols()
    target_dir = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.cwd()
    target_dir = target_dir.resolve()

    if not target_dir.exists() or not target_dir.is_dir():
        print(f"Error: target directory does not exist or is not a directory: {target_dir}", file=sys.stderr)
        sys.exit(1)

    pptx_files = sorted(target_dir.glob("*.pptx"))
    combined_parts = []

    for file_path in pptx_files:
        extracted = extract_file_text(file_path, presentation_cls, group_shape_type)
        if extracted:
            combined_parts.append(extracted)

    output_text = "\n\n".join(combined_parts).strip()
    output_path = target_dir / "master_extracted_text.txt"
    output_path.write_text(output_text, encoding="utf-8")

    print(
        f"Saved extracted text to {output_path} "
        f"({len(output_text)} chars from {len(pptx_files)} PPTX file(s))"
    )


if __name__ == "__main__":
    main()