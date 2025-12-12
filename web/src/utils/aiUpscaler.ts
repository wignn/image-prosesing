import Upscaler from 'upscaler'
import esrganSlim2x from '@upscalerjs/esrgan-slim/2x'
import esrganSlim4x from '@upscalerjs/esrgan-slim/4x'

// Type for Upscaler instance
type UpscalerInstance = InstanceType<typeof Upscaler>

// Singleton instances for each scale
let upscaler2x: UpscalerInstance | null = null
let upscaler4x: UpscalerInstance | null = null
let isWarmedUp2x = false
let isWarmedUp4x = false

export type UpscaleScale = 2 | 4

export interface AIUpscaleOptions {
    scale: UpscaleScale
    onProgress?: (progress: number) => void
}

export interface AIUpscaleResult {
    imageData: ImageData
    width: number
    height: number
}

/**
 * Get or create upscaler instance
 */
async function getUpscaler(scale: UpscaleScale): Promise<UpscalerInstance> {
    if (scale === 2) {
        if (!upscaler2x) {
            upscaler2x = new Upscaler({
                model: esrganSlim2x,
            })
        }
        return upscaler2x
    } else {
        if (!upscaler4x) {
            upscaler4x = new Upscaler({
                model: esrganSlim4x,
            })
        }
        return upscaler4x
    }
}

/**
 * Warmup the AI model (pre-load for faster first inference)
 */
export async function warmupAIUpscaler(scale: UpscaleScale = 2): Promise<void> {
    const upscaler = await getUpscaler(scale)

    if (scale === 2 && isWarmedUp2x) return
    if (scale === 4 && isWarmedUp4x) return

    // Create a tiny test image for warmup
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#888888'
    ctx.fillRect(0, 0, 8, 8)

    try {
        await upscaler.upscale(canvas, {
            output: 'tensor',
        })

        if (scale === 2) isWarmedUp2x = true
        else isWarmedUp4x = true

        console.log(`AI Upscaler ${scale}x warmed up successfully`)
    } catch (error) {
        console.warn(`Failed to warmup AI Upscaler ${scale}x:`, error)
    }
}

/**
 * Convert ImageData to Canvas
 */
function imageDataToCanvas(imageData: ImageData): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    return canvas
}

/**
 * AI-powered image upscaling using ESRGAN
 */
export async function aiUpscale(
    imageData: ImageData,
    options: AIUpscaleOptions
): Promise<AIUpscaleResult> {
    const { scale, onProgress } = options

    // Report initial progress
    onProgress?.(5)

    // Get upscaler instance
    const upscaler = await getUpscaler(scale)
    onProgress?.(15)

    // Convert ImageData to canvas
    const inputCanvas = imageDataToCanvas(imageData)
    onProgress?.(20)

    // Perform AI upscaling
    const result = await upscaler.upscale(inputCanvas, {
        output: 'base64',
        patchSize: 64, // Process in smaller patches for memory efficiency
        padding: 4,
        progress: (percent: number) => {
            // Map upscaler progress (0-1) to our range (20-95)
            const mappedProgress = 20 + (percent * 75)
            onProgress?.(mappedProgress)
        },
    })

    onProgress?.(95)

    // Convert base64 result to ImageData
    const outputImageData = await base64ToImageData(result as string)

    onProgress?.(100)

    return {
        imageData: outputImageData,
        width: outputImageData.width,
        height: outputImageData.height,
    }
}

/**
 * Convert base64 image to ImageData
 */
async function base64ToImageData(base64: string): Promise<ImageData> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0)
            resolve(ctx.getImageData(0, 0, canvas.width, canvas.height))
        }
        img.onerror = reject
        img.src = base64
    })
}

/**
 * Check if AI upscaling is available
 */
export function isAIUpscaleAvailable(): boolean {
    // Check for WebGL support (required for TensorFlow.js)
    try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        return !!gl
    } catch {
        return false
    }
}

/**
 * Dispose upscaler instances to free memory
 */
export async function disposeAIUpscaler(): Promise<void> {
    if (upscaler2x) {
        await upscaler2x.dispose()
        upscaler2x = null
        isWarmedUp2x = false
    }
    if (upscaler4x) {
        await upscaler4x.dispose()
        upscaler4x = null
        isWarmedUp4x = false
    }
}
