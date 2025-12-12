use thiserror::Error;

#[derive(Error, Debug)]
pub enum PipelineError {
    #[error("Image loading error: {0}")]
    ImageError(#[from] image::ImageError),
    
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),
    
    #[error("Processing error: {0}")]
    ProcessingError(String),
    
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}
