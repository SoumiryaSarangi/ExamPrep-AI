'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMaterialStore } from '@/stores/materialStore'
import mermaid from 'mermaid'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, Download, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { useToast } from '@/hooks/useToast'

export default function Diagrams() {
  const params = useParams<{ materialId: string }>()
  const materialId = Number(params?.materialId || 0)
  const router = useRouter()
  const { currentMaterial, getMaterial } = useMaterialStore()
  const { toast } = useToast()
  const [zoom, setZoom] = useState(1)
  const [activeTab, setActiveTab] = useState('mindmap')
  const [renderedDiagrams, setRenderedDiagrams] = useState<Record<string, string>>({})

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#6366f1',
        primaryTextColor: '#fff',
        primaryBorderColor: '#8b5cf6',
        lineColor: '#6b7280',
        secondaryColor: '#1e1e2e',
        tertiaryColor: '#2d2d3f',
      },
    })
  }, [])

  useEffect(() => {
    if (!Number.isFinite(materialId)) return
    getMaterial(materialId)
  }, [getMaterial, materialId])

  useEffect(() => {
    const renderDiagrams = async () => {
      const content = currentMaterial?.content
      if (!content) return

      const diagrams: Record<string, string> = {}

      try {
        if (content.mindmap) {
          const { svg } = await mermaid.render('mindmap-svg', content.mindmap)
          diagrams.mindmap = svg
        }
        if (content.flowchart) {
          const { svg } = await mermaid.render('flowchart-svg', content.flowchart)
          diagrams.flowchart = svg
        }
        if (content.sequence) {
          const { svg } = await mermaid.render('sequence-svg', content.sequence)
          diagrams.sequence = svg
        }

        setRenderedDiagrams(diagrams)
      } catch (error: any) {
        toast({ title: 'Error rendering diagram', description: error?.message, type: 'error' })
      }
    }

    renderDiagrams()
  }, [currentMaterial, toast])

  const handleDownload = () => {
    const svg = renderedDiagrams[activeTab]
    if (!svg) return

    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `diagram-${activeTab}.svg`
    anchor.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Diagram downloaded', type: 'success' })
  }

  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.max(0.5, Math.min(2, prev + delta)))
  }

  if (!currentMaterial) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary"></div>
      </div>
    )
  }

  const content = currentMaterial.content
  const availableTabs = Object.keys(renderedDiagrams)

  if (availableTabs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-xl font-semibold mb-2">No diagrams available</h2>
        <p className="text-muted-foreground mb-4">This material does not have any diagrams.</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{content?.title || 'Diagrams'}</h1>
            <p className="text-muted-foreground text-sm">Visual study aids</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => handleZoom(-0.1)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(1)}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom(0.1)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              {availableTabs.includes('mindmap') && <TabsTrigger value="mindmap">Mind Map</TabsTrigger>}
              {availableTabs.includes('flowchart') && <TabsTrigger value="flowchart">Flowchart</TabsTrigger>}
              {availableTabs.includes('sequence') && <TabsTrigger value="sequence">Sequence</TabsTrigger>}
            </TabsList>

            {availableTabs.map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div
                  className="overflow-auto bg-muted/30 rounded-lg p-4 min-h-[400px] flex items-center justify-center"
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderedDiagrams[tab] || '' }} className="mermaid-diagram" />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
