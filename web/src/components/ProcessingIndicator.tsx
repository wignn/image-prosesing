export function ProcessingIndicator() {
    return (
        <div className="processing-indicator">
            <div className="spinner"></div>
            <p>Processing your image...</p>
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
