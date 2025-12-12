import { useState, useCallback, useEffect, useRef } from 'react'
import type { FilterParams } from '../components/FilterControls'
import { aiUpscale, isAIUpscaleAvailable, type UpscaleScale } from '../utils/aiUpscaler'

// Type definitions for the WASM module
interface WasmModule {
    WasmImageProcessor: new (data: Uint8Array, width: number, height: number) => WasmProcessor
    quick_grayscale: (data: Uint8Array, width: number, height: number) => Uint8Array
    quick_brightness: (data: Uint8Array, width: number, height: number, value: number) => Uint8Array
    quick_blur: (data: Uint8Array, width: number, height: number, sigma: number) => Uint8Array
    get_version: () => string
}

interface WasmProcessor {
    width: number
    height: number
    get_data(): Uint8Array
    grayscale(): void
    brightness(value: number): void
    contrast(value: number): void
    blur(sigma: number): void
    sharpen(): void
    edge_detect(): void
    resize(width: number, height: number): void
    invert(): void
    sepia(): void
    reset(data: Uint8Array, width: number, height: number): void
    free(): void
}

// Operation names for display
const operationNames: Record<string, string> = {
    'grayscale': 'Converting to grayscale',
    'brightness': 'Adjusting brightness',
    'contrast': 'Adjusting contrast',
    'blur': 'Applying blur',
    'sharpen': 'Sharpening image',
    'edge_detect': 'Detecting edges',
    'invert': 'Inverting colors',
    'sepia': 'Applying sepia filter',
    'resize': 'Resizing image',
    'upscale': 'Upscaling image'
}

export function useImageProcessor(originalImage: ImageData | null) {
    const [processedImage, setProcessedImage] = useState<ImageData | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isWasmLoaded, setIsWasmLoaded] = useState(false)

    // Progress tracking
    const [processingProgress, setProcessingProgress] = useState<number>(-1)
    const [processingOperation, setProcessingOperation] = useState<string>('')

    const wasmRef = useRef<WasmModule | null>(null)
    const processorRef = useRef<WasmProcessor | null>(null)
    const originalDataRef = useRef<Uint8ClampedArray | null>(null)
    const progressIntervalRef = useRef<number | null>(null)
    const processingLockRef = useRef<boolean>(false)

    // Load WASM module
    useEffect(() => {
        async function loadWasm() {
            try {
                // Try to load the WASM module
                // In development, this will be served by Vite
                // In production, it should be in the dist folder
                const wasm = await import('../../wasm/image_pipeline_wasm.js')
                await wasm.default()  // Initialize WASM
                wasmRef.current = wasm
                setIsWasmLoaded(true)
                console.log('WASM loaded successfully, version:', wasm.get_version())
            } catch (err) {
                console.warn('WASM module not available, using fallback:', err)
                // Fallback mode - provide mock implementation for demo
                wasmRef.current = createFallbackModule()
                setIsWasmLoaded(true)
            }
        }
        loadWasm()

        return () => {
            if (processorRef.current) {
                processorRef.current.free()
            }
        }
    }, [])

    // Update processor when original image changes
    useEffect(() => {
        if (!originalImage || !wasmRef.current) return

        originalDataRef.current = originalImage.data
        setProcessedImage(null)
        setError(null)

        // Clean up old processor
        if (processorRef.current) {
            processorRef.current.free()
            processorRef.current = null
        }
    }, [originalImage])

    // Helper to stop progress animation
    const stopProgress = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current)
            progressIntervalRef.current = null
        }
    }, [])

    // Helper to start simulated progress
    const startProgress = useCallback((operationType: string, estimatedPixels: number) => {
        stopProgress()
        setProcessingOperation(operationNames[operationType] || 'Processing...')
        setProcessingProgress(0)

        // Estimate duration: ~1ms per 1000 pixels for upscale, faster for simple ops
        const isHeavy = operationType === 'upscale' || operationType === 'resize' || operationType === 'blur'
        const baseDuration = isHeavy ? Math.min(estimatedPixels / 5000, 15000) : 500
        const duration = Math.max(500, baseDuration)
        const interval = 50 // Update every 50ms
        const steps = duration / interval
        const increment = 95 / steps // Go up to 95%, then jump to 100 when done

        let currentProgress = 0
        progressIntervalRef.current = window.setInterval(() => {
            currentProgress += increment
            if (currentProgress >= 95) {
                currentProgress = 95
            }
            setProcessingProgress(currentProgress)
        }, interval)
    }, [stopProgress])

    const applyFilter = useCallback(async (params: FilterParams) => {
        if (!originalImage || !wasmRef.current) {
            setError('No image loaded or WASM not ready')
            return
        }

        // Prevent concurrent processing - wait if already processing
        if (processingLockRef.current) {
            console.warn('Processing already in progress, please wait...')
            return
        }

        processingLockRef.current = true
        setIsProcessing(true)
        setError(null)

        try {
            // For upscale, ALWAYS use original image (not processed)
            // For other filters, use processed image if available
            const isUpscale = params.type === 'upscale'
            const sourceData = isUpscale ? originalImage.data : (processedImage?.data || originalImage.data)
            const sourceWidth = isUpscale ? originalImage.width : (processedImage?.width || originalImage.width)
            const sourceHeight = isUpscale ? originalImage.height : (processedImage?.height || originalImage.height)

            // Calculate target size for progress estimation
            let targetWidth = sourceWidth
            let targetHeight = sourceHeight
            if (params.type === 'upscale') {
                targetWidth = params.width ?? sourceWidth * (params.scale ?? 2)
                targetHeight = params.height ?? sourceHeight * (params.scale ?? 2)
            } else if (params.type === 'resize') {
                targetWidth = params.width ?? sourceWidth
                targetHeight = params.height ?? sourceHeight
            }
            const estimatedPixels = targetWidth * targetHeight

            // Start progress animation
            startProgress(params.type, estimatedPixels)

            // Give UI time to update before heavy computation
            await new Promise(resolve => setTimeout(resolve, 50))

            // For AI upscale, handle separately without creating WASM processor
            if (params.type === 'upscale') {
                const requestedScale = params.scale ?? 2
                const canUseAI = params.useAI &&
                    isAIUpscaleAvailable() &&
                    (requestedScale === 2 || requestedScale === 4)

                if (canUseAI) {
                    // Use AI upscaling (ESRGAN) - NO WASM processor needed
                    stopProgress()
                    setProcessingOperation(`AI Upscaling ${requestedScale}× (ESRGAN)`)

                    const originalImageData = new ImageData(
                        new Uint8ClampedArray(originalImage.data),
                        originalImage.width,
                        originalImage.height
                    )

                    const aiResult = await aiUpscale(originalImageData, {
                        scale: requestedScale as UpscaleScale,
                        onProgress: (progress) => {
                            setProcessingProgress(progress)
                        },
                    })

                    setProcessingProgress(100)
                    await new Promise(resolve => setTimeout(resolve, 200))
                    setProcessedImage(aiResult.imageData)

                    // Cleanup and return
                    stopProgress()
                    setProcessingProgress(-1)
                    setProcessingOperation('')
                    setIsProcessing(false)
                    processingLockRef.current = false
                    return
                }
            }

            // Create WASM processor for non-AI operations
            const data = new Uint8Array(sourceData.buffer.slice(0))
            const wasm = wasmRef.current

            let newWidth = sourceWidth
            let newHeight = sourceHeight
            let resultData: Uint8Array

            // Use the class-based processor for most operations
            const processor = new wasm.WasmImageProcessor(data, sourceWidth, sourceHeight)

            try {
                switch (params.type) {
                    case 'grayscale':
                        processor.grayscale()
                        break
                    case 'brightness':
                        processor.brightness(params.value ?? 0)
                        break
                    case 'contrast':
                        processor.contrast(params.value ?? 1)
                        break
                    case 'blur':
                        processor.blur(params.value ?? 2)
                        break
                    case 'sharpen':
                        processor.sharpen()
                        break
                    case 'edge_detect':
                        processor.edge_detect()
                        break
                    case 'invert':
                        processor.invert()
                        break
                    case 'sepia':
                        processor.sepia()
                        break
                    case 'resize':
                        newWidth = params.width ?? sourceWidth
                        newHeight = params.height ?? sourceHeight
                        processor.resize(newWidth, newHeight)
                        break
                    case 'upscale':
                        // Standard upscale with Lanczos interpolation
                        // (AI path is handled before processor creation)
                        const requestedScale = params.scale ?? 2
                        newWidth = params.width ?? sourceWidth * requestedScale
                        newHeight = params.height ?? sourceHeight * requestedScale
                        processor.resize(newWidth, newHeight)
                        break
                }

                resultData = processor.get_data()
                newWidth = processor.width
                newHeight = processor.height
            } finally {
                processor.free()
            }

            // Create new ImageData - copy to a new ArrayBuffer to avoid SharedArrayBuffer issues
            const clampedData = new Uint8ClampedArray(resultData.length)
            clampedData.set(resultData)
            const newImageData = new ImageData(
                clampedData,
                newWidth,
                newHeight
            )

            // Complete the progress
            stopProgress()
            setProcessingProgress(100)

            // Brief pause to show 100%
            await new Promise(resolve => setTimeout(resolve, 200))

            setProcessedImage(newImageData)
        } catch (err) {
            console.error('Filter error:', err)
            setError(`Failed to apply filter: ${err instanceof Error ? err.message : String(err)}`)
        } finally {
            stopProgress()
            setProcessingProgress(-1)
            setProcessingOperation('')
            setIsProcessing(false)
            processingLockRef.current = false
        }
    }, [originalImage, processedImage, startProgress, stopProgress])

    const resetImage = useCallback(() => {
        setProcessedImage(null)
        setError(null)
    }, [])

    return {
        processedImage,
        isProcessing,
        error,
        applyFilter,
        resetImage,
        isWasmLoaded,
        processingProgress,
        processingOperation,
    }
}

// Fallback module when WASM is not available (for development/demo)
function createFallbackModule(): WasmModule {
    class FallbackProcessor implements WasmProcessor {
        private data: Uint8Array
        width: number
        height: number

        constructor(data: Uint8Array, width: number, height: number) {
            this.data = new Uint8Array(data)
            this.width = width
            this.height = height
        }

        get_data(): Uint8Array {
            return this.data
        }

        grayscale(): void {
            for (let i = 0; i < this.data.length; i += 4) {
                const gray = Math.round(
                    0.2126 * this.data[i] +
                    0.7152 * this.data[i + 1] +
                    0.0722 * this.data[i + 2]
                )
                this.data[i] = gray
                this.data[i + 1] = gray
                this.data[i + 2] = gray
            }
        }

        brightness(value: number): void {
            const adjustment = Math.round(value * 255)
            for (let i = 0; i < this.data.length; i += 4) {
                this.data[i] = Math.max(0, Math.min(255, this.data[i] + adjustment))
                this.data[i + 1] = Math.max(0, Math.min(255, this.data[i + 1] + adjustment))
                this.data[i + 2] = Math.max(0, Math.min(255, this.data[i + 2] + adjustment))
            }
        }

        contrast(value: number): void {
            for (let i = 0; i < this.data.length; i += 4) {
                this.data[i] = Math.max(0, Math.min(255, ((this.data[i] - 128) * value) + 128))
                this.data[i + 1] = Math.max(0, Math.min(255, ((this.data[i + 1] - 128) * value) + 128))
                this.data[i + 2] = Math.max(0, Math.min(255, ((this.data[i + 2] - 128) * value) + 128))
            }
        }

        blur(_sigma: number): void {
            // Simple box blur fallback
            console.warn('Blur not available in fallback mode')
        }

        sharpen(): void {
            console.warn('Sharpen not available in fallback mode')
        }

        edge_detect(): void {
            console.warn('Edge detect not available in fallback mode')
        }

        resize(width: number, height: number): void {
            // Simple nearest-neighbor resize
            const newData = new Uint8Array(width * height * 4)
            const xRatio = this.width / width
            const yRatio = this.height / height

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const srcX = Math.floor(x * xRatio)
                    const srcY = Math.floor(y * yRatio)
                    const srcIdx = (srcY * this.width + srcX) * 4
                    const dstIdx = (y * width + x) * 4

                    newData[dstIdx] = this.data[srcIdx]
                    newData[dstIdx + 1] = this.data[srcIdx + 1]
                    newData[dstIdx + 2] = this.data[srcIdx + 2]
                    newData[dstIdx + 3] = this.data[srcIdx + 3]
                }
            }

            this.data = newData
            this.width = width
            this.height = height
        }

        invert(): void {
            for (let i = 0; i < this.data.length; i += 4) {
                this.data[i] = 255 - this.data[i]
                this.data[i + 1] = 255 - this.data[i + 1]
                this.data[i + 2] = 255 - this.data[i + 2]
            }
        }

        sepia(): void {
            for (let i = 0; i < this.data.length; i += 4) {
                const r = this.data[i]
                const g = this.data[i + 1]
                const b = this.data[i + 2]
                this.data[i] = Math.min(255, 0.393 * r + 0.769 * g + 0.189 * b)
                this.data[i + 1] = Math.min(255, 0.349 * r + 0.686 * g + 0.168 * b)
                this.data[i + 2] = Math.min(255, 0.272 * r + 0.534 * g + 0.131 * b)
            }
        }

        reset(data: Uint8Array, width: number, height: number): void {
            this.data = new Uint8Array(data)
            this.width = width
            this.height = height
        }

        free(): void {
            // No cleanup needed in JS fallback
        }
    }

    return {
        WasmImageProcessor: FallbackProcessor as unknown as WasmModule['WasmImageProcessor'],
        quick_grayscale: (data, width, height) => {
            const p = new FallbackProcessor(data, width, height)
            p.grayscale()
            return p.get_data()
        },
        quick_brightness: (data, width, height, value) => {
            const p = new FallbackProcessor(data, width, height)
            p.brightness(value)
            return p.get_data()
        },
        quick_blur: (data, _width, _height, _sigma) => {
            return new Uint8Array(data) // No-op for fallback
        },
        get_version: () => 'Fallback 0.1.0 (no WASM)',
    }
}
