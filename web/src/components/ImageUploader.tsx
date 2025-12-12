import { useCallback, useRef, useState } from 'react'

interface ImageUploaderProps {
    onImageLoad: (imageData: ImageData) => void
}

// Professional upload icon
const UploadIcon = () => (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="uploadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00d4ff" />
                <stop offset="50%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
        </defs>
        <rect x="8" y="8" width="64" height="64" rx="16" stroke="url(#uploadGradient)" strokeWidth="2" fill="none" />
        <circle cx="28" cy="28" r="6" fill="url(#uploadGradient)" opacity="0.8" />
        <path d="M8 52L24 36L36 48L52 32L72 48" stroke="url(#uploadGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M40 60V40M40 40L50 50M40 40L30 50" stroke="url(#uploadGradient)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
)

export function ImageUploader({ onImageLoad }: ImageUploaderProps) {
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file')
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                if (!ctx) return

                ctx.drawImage(img, 0, 0)
                const imageData = ctx.getImageData(0, 0, img.width, img.height)
                onImageLoad(imageData)
            }
            img.src = e.target?.result as string
        }
        reader.readAsDataURL(file)
    }, [onImageLoad])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback(() => {
        setIsDragging(false)
    }, [])

    const handleClick = useCallback(() => {
        fileInputRef.current?.click()
    }, [])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }, [handleFile])

    return (
        <div
            className={`image-uploader ${isDragging ? 'dragging' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <div className="upload-content">
                <div className="upload-icon">
                    <UploadIcon />
                </div>
                <h3>Drop your image here</h3>
                <p>or click to browse from your computer</p>
                <span className="supported-formats">
                    JPG • PNG • WebP • GIF • BMP
                </span>
            </div>
        </div>
    )
}
