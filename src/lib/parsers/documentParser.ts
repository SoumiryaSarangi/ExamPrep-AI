import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

/**
 * Extract text from PDF file
 */
export async function extractPdfText(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    const numPages = pdf.numPages
    
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      const pageText = textContent.items
        .map(item => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (pageText) {
        fullText += `\n\n--- Page ${pageNum} ---\n\n${pageText}`
      }
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('PDF extraction error:', error)
    throw new Error(`Failed to extract PDF text: ${error.message}`)
  }
}

/**
 * Extract text from PPTX file
 */
export async function extractPptxText(file: File) {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const zip = await JSZip.loadAsync(arrayBuffer)
    
    // PPTX files are ZIP archives with XML content
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/ppt\/slides\/slide\d+\.xml$/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)![1])
        const numB = parseInt(b.match(/slide(\d+)/)![1])
        return numA - numB
      })
    
    let fullText = ''
    
    for (const slideFile of slideFiles) {
      const slideNum = slideFile.match(/slide(\d+)/)![1]
      const content = await zip.files[slideFile].async('text')
      
      // Parse XML to extract text
      const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || []
      const slideText = textMatches
        .map(match => match.replace(/<a:t>|<\/a:t>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (slideText) {
        fullText += `\n\n--- Slide ${slideNum} ---\n\n${slideText}`
      }
    }
    
    // Also try to extract from notes
    const notesFiles = Object.keys(zip.files)
      .filter(name => name.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/))
    
    for (const notesFile of notesFiles) {
      const content = await zip.files[notesFile].async('text')
      const textMatches = content.match(/<a:t>([^<]*)<\/a:t>/g) || []
      const notesText = textMatches
        .map(match => match.replace(/<a:t>|<\/a:t>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
      
      if (notesText) {
        fullText += `\n\nSpeaker Notes: ${notesText}`
      }
    }
    
    return fullText.trim() || 'No text content found in presentation'
  } catch (error) {
    console.error('PPTX extraction error:', error)
    throw new Error(`Failed to extract PPTX text: ${error.message}`)
  }
}

/**
 * Detect file type and extract text
 */
export async function extractText(file: File) {
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.pdf')) {
    return extractPdfText(file)
  } else if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) {
    return extractPptxText(file)
  } else {
    throw new Error(`Unsupported file type: ${fileName}`)
  }
}
