# PPTX Text Extraction Script

A standalone Python CLI tool for extracting and sanitizing text from PowerPoint (`.pptx`) files. Designed for offline preprocessing of large presentations before feeding text into the AI pipeline.

## Why Use This

The browser-based PPTX parser (JSZip + XML regex) works well for small files, but has limitations with large presentations (80+ slides):

- **Performance** — Parsing large ZIP archives client-side blocks the UI thread
- **Text coverage** — The regex approach (`<a:t>...</a:t>`) misses grouped shapes, tables, and certain nested elements

This script uses the `python-pptx` library, which provides full access to the PowerPoint object model — including text frames, tables, grouped shapes, and nested content.

## Prerequisites

- Python 3.8+

## Installation

```bash
cd scripts
pip install -r requirements.txt
```

## Usage

```bash
# Extract from a specific directory
python extract_pptx.py "D:\path\to\pptx\folder"

# Extract from the current directory
python extract_pptx.py
```

## Output

The script writes `master_extracted_text.txt` in the target directory with the following structure:

```
=== File: lecture01.pptx ===
--- Slide 1 ---
Title text here

--- Slide 2 ---
Bullet point content
Table cell content

=== File: lecture02.pptx ===
--- Slide 1 ---
...
```

## Features

| Feature | Description |
|---|---|
| Multi-file batch processing | Scans all `*.pptx` files in the target directory |
| Text frame extraction | Captures titles, body text, bullets, and sub-bullets |
| Table extraction | Captures text from every cell in every table |
| Grouped shape support | Recursively extracts text from grouped shapes |
| Whitespace sanitization | Collapses excessive whitespace and filters empty lines |
| Error resilience | Corrupted files and unreadable shapes are skipped with warnings |

## File Structure

```
scripts/
├── extract_pptx.py      # Main extraction script
├── requirements.txt      # Python dependencies (python-pptx)
└── README.md             # This file
```