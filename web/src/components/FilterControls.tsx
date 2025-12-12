import { useState } from 'react'

export type FilterType =
    | 'grayscale'
    | 'brightness'
    | 'contrast'
    | 'blur'
    | 'sharpen'
    | 'edge_detect'
    | 'invert'
    | 'sepia'
    | 'resize'
    | 'upscale'

export interface FilterParams {
    type: FilterType
    value?: number
    width?: number
    height?: number
    scale?: number
}

interface FilterControlsProps {
    onApplyFilter: (params: FilterParams) => void
    onReset: () => void
    disabled: boolean
    isProcessing: boolean
    currentWidth?: number
    currentHeight?: number
}

// Professional SVG Icons
const Icons = {
    grayscale: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20" />
            <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" fillOpacity="0.2" />
        </svg>
    ),
    invert: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 0 0 20" fill="currentColor" fillOpacity="0.9" />
        </svg>
    ),
    sepia: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" strokeOpacity="0.4" />
            <circle cx="14" cy="14" r="3" fill="currentColor" fillOpacity="0.3" />
        </svg>
    ),
    sharpen: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12,2 22,20 2,20" />
            <line x1="12" y1="8" x2="12" y2="14" />
            <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
    ),
    edgeDetect: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M7 17L10 10L14 13L17 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    brightness: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
    ),
    contrast: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20" strokeWidth="0" />
            <path d="M12 2a10 10 0 0 1 0 20" fill="currentColor" />
        </svg>
    ),
    blur: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="6" strokeOpacity="0.6" />
            <circle cx="12" cy="12" r="9" strokeOpacity="0.3" />
        </svg>
    ),
    resize: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
        </svg>
    ),
    upscale: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    ),
    reset: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    ),
}

// Loading spinner component
const ButtonSpinner = () => (
    <svg className="button-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
)

export function FilterControls({ onApplyFilter, onReset, disabled, isProcessing, currentWidth, currentHeight }: FilterControlsProps) {
    const [brightness, setBrightness] = useState(0)
    const [contrast, setContrast] = useState(1)
    const [blurSigma, setBlurSigma] = useState(2)
    const [resizeWidth, setResizeWidth] = useState(256)
    const [resizeHeight, setResizeHeight] = useState(256)
    const [upscaleFactor, setUpscaleFactor] = useState(2)
    const [activeFilter, setActiveFilter] = useState<string | null>(null)

    // Wrapper to track which filter is being applied
    const handleApplyFilter = (params: FilterParams, filterKey: string) => {
        setActiveFilter(filterKey)
        onApplyFilter(params)
    }

    // Reset active filter when processing completes
    if (!isProcessing && activeFilter) {
        setActiveFilter(null)
    }

    const isButtonDisabled = disabled || isProcessing

    return (
        <div className="filter-controls">
            <h2>Processing Tools</h2>

            {/* Quick Filters */}
            <div className="filter-section">
                <h3>Quick Filters</h3>
                <div className="button-grid">
                    <button
                        className={`filter-btn ${activeFilter === 'grayscale' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'grayscale' }, 'grayscale')}
                        disabled={isButtonDisabled}
                        title="Convert to grayscale"
                    >
                        <span className="filter-icon">
                            {activeFilter === 'grayscale' ? <ButtonSpinner /> : Icons.grayscale}
                        </span>
                        Grayscale
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'invert' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'invert' }, 'invert')}
                        disabled={isButtonDisabled}
                        title="Invert colors"
                    >
                        <span className="filter-icon">
                            {activeFilter === 'invert' ? <ButtonSpinner /> : Icons.invert}
                        </span>
                        Invert
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'sepia' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'sepia' }, 'sepia')}
                        disabled={isButtonDisabled}
                        title="Apply sepia tone"
                    >
                        <span className="filter-icon">
                            {activeFilter === 'sepia' ? <ButtonSpinner /> : Icons.sepia}
                        </span>
                        Sepia
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'sharpen' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'sharpen' }, 'sharpen')}
                        disabled={isButtonDisabled}
                        title="Sharpen image"
                    >
                        <span className="filter-icon">
                            {activeFilter === 'sharpen' ? <ButtonSpinner /> : Icons.sharpen}
                        </span>
                        Sharpen
                    </button>
                    <button
                        className={`filter-btn ${activeFilter === 'edge_detect' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'edge_detect' }, 'edge_detect')}
                        disabled={isButtonDisabled}
                        title="Detect edges"
                    >
                        <span className="filter-icon">
                            {activeFilter === 'edge_detect' ? <ButtonSpinner /> : Icons.edgeDetect}
                        </span>
                        Edge Detect
                    </button>
                </div>
            </div>

            {/* Adjustable Filters */}
            <div className="filter-section">
                <h3>Adjustments</h3>

                {/* Brightness */}
                <div className="slider-control">
                    <label>
                        <span>{Icons.brightness}</span>
                        Brightness: {brightness > 0 ? '+' : ''}{(brightness * 100).toFixed(0)}%
                    </label>
                    <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.05"
                        value={brightness}
                        onChange={(e) => setBrightness(parseFloat(e.target.value))}
                        disabled={isButtonDisabled}
                    />
                    <button
                        className={`apply-btn ${activeFilter === 'brightness' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'brightness', value: brightness }, 'brightness')}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'brightness' ? <><ButtonSpinner /> Applying...</> : 'Apply Brightness'}
                    </button>
                </div>

                {/* Contrast */}
                <div className="slider-control">
                    <label>
                        <span>{Icons.contrast}</span>
                        Contrast: {(contrast * 100).toFixed(0)}%
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="0.1"
                        value={contrast}
                        onChange={(e) => setContrast(parseFloat(e.target.value))}
                        disabled={isButtonDisabled}
                    />
                    <button
                        className={`apply-btn ${activeFilter === 'contrast' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'contrast', value: contrast }, 'contrast')}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'contrast' ? <><ButtonSpinner /> Applying...</> : 'Apply Contrast'}
                    </button>
                </div>

                {/* Blur */}
                <div className="slider-control">
                    <label>
                        <span>{Icons.blur}</span>
                        Gaussian Blur: σ = {blurSigma.toFixed(1)}
                    </label>
                    <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.5"
                        value={blurSigma}
                        onChange={(e) => setBlurSigma(parseFloat(e.target.value))}
                        disabled={isButtonDisabled}
                    />
                    <button
                        className={`apply-btn ${activeFilter === 'blur' ? 'processing' : ''}`}
                        onClick={() => handleApplyFilter({ type: 'blur', value: blurSigma }, 'blur')}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'blur' ? <><ButtonSpinner /> Applying...</> : 'Apply Blur'}
                    </button>
                </div>
            </div>

            {/* Resize */}
            <div className="filter-section">
                <h3>Dimensions</h3>
                <div className="resize-inputs">
                    <div className="input-group">
                        <label>Width (px)</label>
                        <input
                            type="number"
                            min="1"
                            max="4096"
                            value={resizeWidth}
                            onChange={(e) => setResizeWidth(parseInt(e.target.value) || 256)}
                            disabled={isButtonDisabled}
                        />
                    </div>
                    <span className="dimension-separator">×</span>
                    <div className="input-group">
                        <label>Height (px)</label>
                        <input
                            type="number"
                            min="1"
                            max="4096"
                            value={resizeHeight}
                            onChange={(e) => setResizeHeight(parseInt(e.target.value) || 256)}
                            disabled={isButtonDisabled}
                        />
                    </div>
                </div>
                <button
                    className={`apply-btn full-width ${activeFilter === 'resize' ? 'processing' : ''}`}
                    onClick={() => handleApplyFilter({
                        type: 'resize',
                        width: resizeWidth,
                        height: resizeHeight
                    }, 'resize')}
                    disabled={isButtonDisabled}
                >
                    {activeFilter === 'resize' ? (
                        <><ButtonSpinner /> Resizing...</>
                    ) : (
                        <>{Icons.resize} Apply Resize</>
                    )}
                </button>
            </div>

            {/* Upscale */}
            <div className="filter-section">
                <h3>AI Upscaling</h3>
                <p className="section-desc">Enlarge images with high-quality interpolation</p>
                <div className="upscale-presets">
                    <button
                        className={`filter-btn upscale-btn ${upscaleFactor === 2 ? 'active' : ''} ${activeFilter === 'upscale-2' ? 'processing' : ''}`}
                        onClick={() => {
                            const w = currentWidth || 256
                            const h = currentHeight || 256
                            setUpscaleFactor(2) // Sync slider
                            handleApplyFilter({ type: 'upscale', scale: 2, width: w * 2, height: h * 2 }, 'upscale-2')
                        }}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'upscale-2' ? <ButtonSpinner /> : '2×'}
                        {currentWidth && currentHeight && (
                            <span className="preview-size">
                                {currentWidth * 2} × {currentHeight * 2}
                            </span>
                        )}
                    </button>
                    <button
                        className={`filter-btn upscale-btn ${upscaleFactor === 4 ? 'active' : ''} ${activeFilter === 'upscale-4' ? 'processing' : ''}`}
                        onClick={() => {
                            const w = currentWidth || 256
                            const h = currentHeight || 256
                            setUpscaleFactor(4) // Sync slider
                            handleApplyFilter({ type: 'upscale', scale: 4, width: w * 4, height: h * 4 }, 'upscale-4')
                        }}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'upscale-4' ? <ButtonSpinner /> : '4×'}
                        {currentWidth && currentHeight && (
                            <span className="preview-size">
                                {currentWidth * 4} × {currentHeight * 4}
                            </span>
                        )}
                    </button>
                    <button
                        className={`filter-btn upscale-btn ${upscaleFactor === 8 ? 'active' : ''} ${activeFilter === 'upscale-8' ? 'processing' : ''}`}
                        onClick={() => {
                            const w = currentWidth || 256
                            const h = currentHeight || 256
                            setUpscaleFactor(8) // Sync slider
                            handleApplyFilter({ type: 'upscale', scale: 8, width: w * 8, height: h * 8 }, 'upscale-8')
                        }}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'upscale-8' ? <ButtonSpinner /> : '8×'}
                        {currentWidth && currentHeight && (
                            <span className="preview-size">
                                {currentWidth * 8} × {currentHeight * 8}
                            </span>
                        )}
                    </button>
                </div>
                <div className="slider-control">
                    <label>
                        Custom Scale: {upscaleFactor}×
                        {currentWidth && currentHeight && (
                            <span className="preview-size">
                                ({currentWidth * upscaleFactor} × {currentHeight * upscaleFactor})
                            </span>
                        )}
                    </label>
                    <input
                        type="range"
                        min="1"
                        max="8"
                        step="1"
                        value={upscaleFactor}
                        onChange={(e) => setUpscaleFactor(parseInt(e.target.value))}
                        disabled={isButtonDisabled}
                    />
                    <button
                        className={`apply-btn ${activeFilter === 'upscale-custom' ? 'processing' : ''}`}
                        onClick={() => {
                            const w = currentWidth || 256
                            const h = currentHeight || 256
                            handleApplyFilter({
                                type: 'upscale',
                                scale: upscaleFactor,
                                width: w * upscaleFactor,
                                height: h * upscaleFactor
                            }, 'upscale-custom')
                        }}
                        disabled={isButtonDisabled}
                    >
                        {activeFilter === 'upscale-custom' ? (
                            <><ButtonSpinner /> Upscaling...</>
                        ) : (
                            <>{Icons.upscale} Apply {upscaleFactor}× Upscale</>
                        )}
                    </button>
                </div>
            </div>

            {/* Reset */}
            <div className="filter-section">
                <button
                    className="reset-btn"
                    onClick={onReset}
                    disabled={isButtonDisabled}
                >
                    <span className="reset-icon">{Icons.reset}</span>
                    Reset to Original
                </button>
            </div>
        </div>
    )
}
