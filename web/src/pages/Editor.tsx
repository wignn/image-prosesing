import { useState, useCallback } from 'react'
import { ImageCanvas } from '../components/ImageCanvas'
import { FilterControls } from '../components/FilterControls'
import { ProcessingIndicator } from '../components/ProcessingIndicator'
import { ImageUploader } from '../components/ImageUploader'
import { useImageProcessor } from '../hooks/useImageProcessor'

const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

const NewImageIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
)

function App() {
    const [originalImage, setOriginalImage] = useState<ImageData | null>(null)
    const {
        processedImage,
        isProcessing,
        error,
        applyFilter,
        resetImage,
        isWasmLoaded,
        processingProgress,
        processingOperation
    } = useImageProcessor(originalImage)

    const handleImageLoad = useCallback((imageData: ImageData) => {
        setOriginalImage(imageData)
    }, [])

    const handleReset = useCallback(() => {
        resetImage()
    }, [resetImage])

    const handleNewImage = useCallback(() => {
        setOriginalImage(null)
        resetImage()
    }, [resetImage])

    const handleDownload = useCallback(() => {
        const imageToDownload = processedImage || originalImage
        if (!imageToDownload) return

        const canvas = document.createElement('canvas')
        canvas.width = imageToDownload.width
        canvas.height = imageToDownload.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.putImageData(imageToDownload, 0, 0)

        canvas.toBlob((blob) => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `imagepro-${Date.now()}.png`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
        }, 'image/png', 1.0)
    }, [processedImage, originalImage])

    return (
        <div className="app">

            <main className="main-content">
                <aside className="sidebar">
                    <FilterControls
                    isWasmLoaded={isWasmLoaded}
                        onApplyFilter={applyFilter}
                        onReset={handleReset}
                        disabled={!originalImage || !isWasmLoaded}
                        isProcessing={isProcessing}
                        currentWidth={processedImage?.width || originalImage?.width}
                        currentHeight={processedImage?.height || originalImage?.height}
                    />
                </aside>

                <section className="canvas-section">
                    {!originalImage ? (
                        <ImageUploader onImageLoad={handleImageLoad} />
                    ) : (
                        <div className="canvas-container">
                            <div className="image-panel">
                                <h3>Source Image</h3>
                                <ImageCanvas imageData={originalImage} label="Original" />
                            </div>
                            <div className="image-panel">
                                <div className="panel-header">
                                    <h3>Processed Output</h3>
                                    {isProcessing && (
                                        <span className="processing-badge">
                                            <span className="processing-dot"></span>
                                            Processing...
                                        </span>
                                    )}
                                </div>
                                <ImageCanvas
                                    imageData={processedImage || originalImage}
                                    label="Processed"
                                />
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <ProcessingIndicator
                            progress={processingProgress}
                            operation={processingOperation}
                        />
                    )}

                    {error && (
                        <div className="error-message">
                            <span className="error-icon">⚠️</span>
                            {error}
                        </div>
                    )}
                </section>
            </main>

            <footer className="footer">
                <p>© 2024 wignn Studio • Built with Rust, WebAssembly and React</p>
            </footer>
        </div>
    )
}

export default App
