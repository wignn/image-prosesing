import { useState, useCallback } from 'react'
import { ImageCanvas } from './components/ImageCanvas'
import { FilterControls } from './components/FilterControls'
import { ProcessingIndicator } from './components/ProcessingIndicator'
import { ImageUploader } from './components/ImageUploader'
import { useImageProcessor } from './hooks/useImageProcessor'

// Download icon
const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
)

// New image icon
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
        isWasmLoaded
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

    // Download processed image
    const handleDownload = useCallback(() => {
        const imageToDownload = processedImage || originalImage
        if (!imageToDownload) return

        // Create canvas and draw image
        const canvas = document.createElement('canvas')
        canvas.width = imageToDownload.width
        canvas.height = imageToDownload.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        ctx.putImageData(imageToDownload, 0, 0)

        // Convert to blob and download
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
            <header className="header">
                <div className="header-content">
                    <h1 className="logo">
                        <span className="logo-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 5C4 4.44772 4.44772 4 5 4H19C19.5523 4 20 4.44772 20 5V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V5Z" stroke="currentColor" strokeWidth="1.5" />
                                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                                <path d="M4 15L8 11L12 15L16 10L20 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </span>
                        wignn Studio
                    </h1>
                </div>
                <div className="header-actions">
                    {originalImage && (
                        <>
                            <button
                                className="header-btn"
                                onClick={handleNewImage}
                                title="Upload new image"
                            >
                                <NewImageIcon />
                                New Image
                            </button>
                            <button
                                className="header-btn primary"
                                onClick={handleDownload}
                                disabled={isProcessing}
                                title="Download processed image"
                            >
                                <DownloadIcon />
                                Download
                            </button>
                        </>
                    )}
                    <div className="wasm-status">
                        <span className={`status-dot ${isWasmLoaded ? 'loaded' : 'loading'}`}></span>
                        {isWasmLoaded ? 'Engine Ready' : 'Initializing...'}
                    </div>
                </div>
            </header>

            <main className="main-content">
                <aside className="sidebar">
                    <FilterControls
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

                    {isProcessing && <ProcessingIndicator />}

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
