mod error;
pub mod ffi;
pub mod filters;
pub mod simd;

pub use error::PipelineError;
pub use filters::*;

use image::RgbaImage;

/// Result type for pipeline operations
pub type Result<T> = std::result::Result<T, PipelineError>;

/// Core image processing pipeline
pub struct ImagePipeline {
    /// Number of threads to use (0 = auto)
    pub thread_count: usize,
}

impl Default for ImagePipeline {
    fn default() -> Self {
        Self::new()
    }
}

impl ImagePipeline {
    /// Create a new pipeline with default settings
    pub fn new() -> Self {
        Self { thread_count: 0 }
    }

    /// Create a pipeline with specific thread count
    pub fn with_threads(thread_count: usize) -> Self {
        Self { thread_count }
    }

    /// Process an image through the pipeline with given operations
    pub fn process(&self, image: &RgbaImage, operations: &[FilterOperation]) -> Result<RgbaImage> {
        let mut result = image.clone();

        for op in operations {
            result = match op {
                FilterOperation::Grayscale => filters::grayscale(&result),
                FilterOperation::Brightness(value) => filters::brightness(&result, *value),
                FilterOperation::Contrast(value) => filters::contrast(&result, *value),
                FilterOperation::Blur(sigma) => filters::blur(&result, *sigma),
                FilterOperation::Sharpen => filters::sharpen(&result),
                FilterOperation::EdgeDetect => filters::edge_detect(&result),
                FilterOperation::Resize { width, height } => {
                    filters::resize(&result, *width, *height)
                }
                FilterOperation::Invert => filters::invert(&result),
                FilterOperation::Sepia => filters::sepia(&result),
            };
        }

        Ok(result)
    }

    /// Load an image from bytes
    pub fn load_from_bytes(bytes: &[u8]) -> Result<RgbaImage> {
        let img = image::load_from_memory(bytes)?;
        Ok(img.to_rgba8())
    }

    /// Encode image to PNG bytes
    pub fn encode_to_png(image: &RgbaImage) -> Result<Vec<u8>> {
        use image::ImageEncoder;
        use std::io::Cursor;

        let mut buffer = Vec::new();
        let encoder = image::codecs::png::PngEncoder::new(Cursor::new(&mut buffer));
        encoder.write_image(
            image.as_raw(),
            image.width(),
            image.height(),
            image::ExtendedColorType::Rgba8,
        )?;
        Ok(buffer)
    }
}

/// Available filter operations
#[derive(Debug, Clone)]
pub enum FilterOperation {
    /// Convert to grayscale
    Grayscale,
    /// Adjust brightness (-1.0 to 1.0)
    Brightness(f32),
    /// Adjust contrast (0.0 to 2.0+)
    Contrast(f32),
    /// Apply Gaussian blur with sigma
    Blur(f32),
    /// Apply sharpening filter
    Sharpen,
    /// Detect edges using Sobel operator
    EdgeDetect,
    /// Resize to specific dimensions
    Resize { width: u32, height: u32 },
    /// Invert colors
    Invert,
    /// Apply sepia tone
    Sepia,
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ImageBuffer, Rgba};

    fn create_test_image() -> RgbaImage {
        ImageBuffer::from_fn(100, 100, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
        })
    }

    #[test]
    fn test_pipeline_grayscale() {
        let pipeline = ImagePipeline::new();
        let image = create_test_image();
        let result = pipeline.process(&image, &[FilterOperation::Grayscale]);
        assert!(result.is_ok());
    }

    #[test]
    fn test_pipeline_multiple_operations() {
        let pipeline = ImagePipeline::new();
        let image = create_test_image();
        let ops = vec![
            FilterOperation::Brightness(0.2),
            FilterOperation::Contrast(1.2),
            FilterOperation::Grayscale,
        ];
        let result = pipeline.process(&image, &ops);
        assert!(result.is_ok());
    }
}
