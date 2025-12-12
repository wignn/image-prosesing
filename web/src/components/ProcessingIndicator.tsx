interface ProcessingIndicatorProps {
    progress?: number  // 0-100
    operation?: string // e.g., "Upscaling 4×"
}

export function ProcessingIndicator({ progress, operation }: ProcessingIndicatorProps) {
    const hasProgress = progress !== undefined && progress >= 0

    return (
        <div className="processing-indicator">
            {hasProgress ? (
                <div className="progress-container">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${Math.min(100, progress)}%` }}
                        />
                    </div>
                    <div className="progress-text">
                        <span className="progress-percent">{Math.round(progress)}%</span>
                    </div>
                </div>
            ) : (
                <div className="spinner"></div>
            )}
            <p>{operation || 'Processing your image...'}</p>
            <span style={{
                fontSize: '0.75rem',
                color: 'var(--color-text-muted)',
                marginTop: '-8px'
            }}>
                Powered by WebAssembly
            </span>
        </div>
    )
}
