# PPTX Extraction Script

This folder contains a standalone Python CLI script for extracting and sanitizing text from one or more `.pptx` files.

## Prerequisites

- Python 3.8+

## Install

```bash
pip install -r requirements.txt
```

## Run

```bash
python extract_pptx.py "D:\path\to\pptx\folder"
```

If you omit the folder argument, the script uses the current directory.

## Output

The script writes `master_extracted_text.txt` in the same target directory passed to the command.