import { useRef, useEffect } from 'react'

interface ImageCanvasProps {
    imageData: ImageData | null
    label: string
}

export function ImageCanvas({ imageData, label }: ImageCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        if (!canvasRef.current || !imageData) return

        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        canvas.width = imageData.width
        canvas.height = imageData.height
        ctx.putImageData(imageData, 0, 0)
    }, [imageData])

    if (!imageData) {
        return (
            <div className="canvas-placeholder">
                <p>No image loaded</p>
            </div>
        )
    }

    return (
        <div className="image-canvas-wrapper">
            <canvas
                ref={canvasRef}
                className="image-canvas"
                aria-label={label}
            />
            <div className="image-info">
                {imageData.width} × {imageData.height}
            </div>
        </div>
    )
}
