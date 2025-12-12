use image::{ImageBuffer, Rgba, RgbaImage};
use rayon::prelude::*;

/// Convert image to grayscale using luminance formula
/// Uses ITU-R BT.709 coefficients: 0.2126*R + 0.7152*G + 0.0722*B
pub fn grayscale(image: &RgbaImage) -> RgbaImage {
    let (width, height) = image.dimensions();
    let pixels: Vec<u8> = image
        .as_raw()
        .par_chunks(4)
        .flat_map(|pixel| {
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;
            let gray = (0.2126 * r + 0.7152 * g + 0.0722 * b) as u8;
            [gray, gray, gray, pixel[3]]
        })
        .collect();

    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

/// Adjust brightness of the image
/// value: -1.0 (dark) to 1.0 (bright)
pub fn brightness(image: &RgbaImage, value: f32) -> RgbaImage {
    let (width, height) = image.dimensions();
    let adjustment = (value * 255.0) as i32;

    let pixels: Vec<u8> = image
        .as_raw()
        .par_chunks(4)
        .flat_map(|pixel| {
            [
                ((pixel[0] as i32 + adjustment).clamp(0, 255)) as u8,
                ((pixel[1] as i32 + adjustment).clamp(0, 255)) as u8,
                ((pixel[2] as i32 + adjustment).clamp(0, 255)) as u8,
                pixel[3],
            ]
        })
        .collect();

    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

/// Adjust contrast of the image
/// value: 0.0 (no contrast) to 2.0+ (high contrast)
pub fn contrast(image: &RgbaImage, value: f32) -> RgbaImage {
    let (width, height) = image.dimensions();
    let factor = value;

    let pixels: Vec<u8> = image
        .as_raw()
        .par_chunks(4)
        .flat_map(|pixel| {
            [
                ((((pixel[0] as f32 - 128.0) * factor) + 128.0).clamp(0.0, 255.0)) as u8,
                ((((pixel[1] as f32 - 128.0) * factor) + 128.0).clamp(0.0, 255.0)) as u8,
                ((((pixel[2] as f32 - 128.0) * factor) + 128.0).clamp(0.0, 255.0)) as u8,
                pixel[3],
            ]
        })
        .collect();

    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

/// Apply Gaussian blur with given sigma
pub fn blur(image: &RgbaImage, sigma: f32) -> RgbaImage {
    let (_width, _height) = image.dimensions();
    let radius = (sigma * 3.0).ceil() as i32;
    let kernel = create_gaussian_kernel(radius, sigma);

    // Horizontal pass
    let horizontal = apply_convolution_1d_horizontal(image, &kernel);
    // Vertical pass
    apply_convolution_1d_vertical(&horizontal, &kernel)
}

/// Create 1D Gaussian kernel
fn create_gaussian_kernel(radius: i32, sigma: f32) -> Vec<f32> {
    let size = (radius * 2 + 1) as usize;
    let mut kernel = vec![0.0f32; size];
    let sigma2 = 2.0 * sigma * sigma;
    let mut sum = 0.0;

    for i in 0..size {
        let x = (i as i32 - radius) as f32;
        kernel[i] = (-x * x / sigma2).exp();
        sum += kernel[i];
    }

    // Normalize
    for k in &mut kernel {
        *k /= sum;
    }

    kernel
}

/// Apply 1D convolution horizontally (parallel over rows)
fn apply_convolution_1d_horizontal(image: &RgbaImage, kernel: &[f32]) -> RgbaImage {
    let (width, height) = image.dimensions();
    let radius = (kernel.len() / 2) as i32;

    let rows: Vec<Vec<u8>> = (0..height)
        .into_par_iter()
        .map(|y| {
            let mut row = Vec::with_capacity((width * 4) as usize);
            for x in 0..width {
                let mut r = 0.0f32;
                let mut g = 0.0f32;
                let mut b = 0.0f32;
                let mut a = 0.0f32;

                for (i, &weight) in kernel.iter().enumerate() {
                    let sample_x = (x as i32 + i as i32 - radius).clamp(0, width as i32 - 1) as u32;
                    let pixel = image.get_pixel(sample_x, y);
                    r += pixel[0] as f32 * weight;
                    g += pixel[1] as f32 * weight;
                    b += pixel[2] as f32 * weight;
                    a += pixel[3] as f32 * weight;
                }

                row.extend_from_slice(&[
                    r.clamp(0.0, 255.0) as u8,
                    g.clamp(0.0, 255.0) as u8,
                    b.clamp(0.0, 255.0) as u8,
                    a.clamp(0.0, 255.0) as u8,
                ]);
            }
            row
        })
        .collect();

    let pixels: Vec<u8> = rows.into_iter().flatten().collect();
    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

/// Apply 1D convolution vertically (parallel over columns)
fn apply_convolution_1d_vertical(image: &RgbaImage, kernel: &[f32]) -> RgbaImage {
    let (width, height) = image.dimensions();
    let radius = (kernel.len() / 2) as i32;

    let mut result = vec![0u8; (width * height * 4) as usize];

    result
        .par_chunks_mut((width * 4) as usize)
        .enumerate()
        .for_each(|(y, row)| {
            for x in 0..width {
                let mut r = 0.0f32;
                let mut g = 0.0f32;
                let mut b = 0.0f32;
                let mut a = 0.0f32;

                for (i, &weight) in kernel.iter().enumerate() {
                    let sample_y =
                        (y as i32 + i as i32 - radius).clamp(0, height as i32 - 1) as u32;
                    let pixel = image.get_pixel(x, sample_y);
                    r += pixel[0] as f32 * weight;
                    g += pixel[1] as f32 * weight;
                    b += pixel[2] as f32 * weight;
                    a += pixel[3] as f32 * weight;
                }

                let idx = (x * 4) as usize;
                row[idx] = r.clamp(0.0, 255.0) as u8;
                row[idx + 1] = g.clamp(0.0, 255.0) as u8;
                row[idx + 2] = b.clamp(0.0, 255.0) as u8;
                row[idx + 3] = a.clamp(0.0, 255.0) as u8;
            }
        });

    ImageBuffer::from_raw(width, height, result).unwrap()
}

/// Apply sharpening filter using unsharp masking
pub fn sharpen(image: &RgbaImage) -> RgbaImage {
    let blurred = blur(image, 1.0);
    let (width, height) = image.dimensions();

    let pixels: Vec<u8> = image
        .as_raw()
        .par_chunks(4)
        .zip(blurred.as_raw().par_chunks(4))
        .flat_map(|(orig, blur)| {
            let amount = 1.5f32;
            [
                ((orig[0] as f32 + amount * (orig[0] as f32 - blur[0] as f32)).clamp(0.0, 255.0))
                    as u8,
                ((orig[1] as f32 + amount * (orig[1] as f32 - blur[1] as f32)).clamp(0.0, 255.0))
                    as u8,
                ((orig[2] as f32 + amount * (orig[2] as f32 - blur[2] as f32)).clamp(0.0, 255.0))
                    as u8,
                orig[3],
            ]
        })
        .collect();

    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

/// Edge detection using Sobel operator
pub fn edge_detect(image: &RgbaImage) -> RgbaImage {
    let gray = grayscale(image);
    let (width, height) = gray.dimensions();

    // Sobel kernels
    let sobel_x: [[i32; 3]; 3] = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    let sobel_y: [[i32; 3]; 3] = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

    let rows: Vec<Vec<u8>> = (1..height - 1)
        .into_par_iter()
        .map(|y| {
            let mut row = Vec::with_capacity(((width - 2) * 4) as usize);
            for x in 1..width - 1 {
                let mut gx = 0i32;
                let mut gy = 0i32;

                for ky in 0..3 {
                    for kx in 0..3 {
                        let px = gray.get_pixel(x + kx - 1, y + ky - 1)[0] as i32;
                        gx += px * sobel_x[ky as usize][kx as usize];
                        gy += px * sobel_y[ky as usize][kx as usize];
                    }
                }

                let magnitude = ((gx * gx + gy * gy) as f32).sqrt().clamp(0.0, 255.0) as u8;
                row.extend_from_slice(&[magnitude, magnitude, magnitude, 255]);
            }
            row
        })
        .collect();

    // Create output image with border handling
    let mut result = ImageBuffer::new(width, height);

    // Copy edge-detected content
    for (y, row) in rows.iter().enumerate() {
        for (x, chunk) in row.chunks(4).enumerate() {
            result.put_pixel(
                (x + 1) as u32,
                (y + 1) as u32,
                Rgba([chunk[0], chunk[1], chunk[2], chunk[3]]),
            );
        }
    }

    result
}

/// Resize image to new dimensions using Lanczos3 interpolation
pub fn resize(image: &RgbaImage, new_width: u32, new_height: u32) -> RgbaImage {
    let resized = image::imageops::resize(
        image,
        new_width,
        new_height,
        image::imageops::FilterType::Lanczos3,
    );
    resized
}

/// Invert colors
pub fn invert(image: &RgbaImage) -> RgbaImage {
    let (width, height) = image.dimensions();

    let pixels: Vec<u8> = image
        .as_raw()
        .par_chunks(4)
        .flat_map(|pixel| [255 - pixel[0], 255 - pixel[1], 255 - pixel[2], pixel[3]])
        .collect();

    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

/// Apply sepia tone effect
pub fn sepia(image: &RgbaImage) -> RgbaImage {
    let (width, height) = image.dimensions();

    let pixels: Vec<u8> = image
        .as_raw()
        .par_chunks(4)
        .flat_map(|pixel| {
            let r = pixel[0] as f32;
            let g = pixel[1] as f32;
            let b = pixel[2] as f32;

            let new_r = (0.393 * r + 0.769 * g + 0.189 * b).clamp(0.0, 255.0) as u8;
            let new_g = (0.349 * r + 0.686 * g + 0.168 * b).clamp(0.0, 255.0) as u8;
            let new_b = (0.272 * r + 0.534 * g + 0.131 * b).clamp(0.0, 255.0) as u8;

            [new_r, new_g, new_b, pixel[3]]
        })
        .collect();

    ImageBuffer::from_raw(width, height, pixels).unwrap()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_image() -> RgbaImage {
        ImageBuffer::from_fn(100, 100, |x, y| {
            Rgba([(x % 256) as u8, (y % 256) as u8, ((x + y) % 256) as u8, 255])
        })
    }

    #[test]
    fn test_grayscale() {
        let image = create_test_image();
        let result = grayscale(&image);
        assert_eq!(result.dimensions(), image.dimensions());

        // Check that all channels are equal (grayscale)
        for pixel in result.pixels() {
            assert_eq!(pixel[0], pixel[1]);
            assert_eq!(pixel[1], pixel[2]);
        }
    }

    #[test]
    fn test_brightness() {
        let image = create_test_image();
        let brighter = brightness(&image, 0.5);
        let darker = brightness(&image, -0.5);

        assert_eq!(brighter.dimensions(), image.dimensions());
        assert_eq!(darker.dimensions(), image.dimensions());
    }

    #[test]
    fn test_contrast() {
        let image = create_test_image();
        let result = contrast(&image, 1.5);
        assert_eq!(result.dimensions(), image.dimensions());
    }

    #[test]
    fn test_blur() {
        let image = create_test_image();
        let result = blur(&image, 2.0);
        assert_eq!(result.dimensions(), image.dimensions());
    }

    #[test]
    fn test_edge_detect() {
        let image = create_test_image();
        let result = edge_detect(&image);
        assert_eq!(result.dimensions(), image.dimensions());
    }

    #[test]
    fn test_resize() {
        let image = create_test_image();
        let result = resize(&image, 50, 50);
        assert_eq!(result.dimensions(), (50, 50));
    }

    #[test]
    fn test_invert() {
        let image = create_test_image();
        let result = invert(&image);

        // Double invert should give back original
        let double_invert = invert(&result);
        assert_eq!(image.as_raw(), double_invert.as_raw());
    }

    #[test]
    fn test_sepia() {
        let image = create_test_image();
        let result = sepia(&image);
        assert_eq!(result.dimensions(), image.dimensions());
    }
}
