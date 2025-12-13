use rayon::prelude::*;

#[inline]
pub fn grayscale_fast(pixels: &mut [u8]) {
    pixels.par_chunks_mut(16).for_each(|chunk| {
        for i in (0..chunk.len()).step_by(4) {
            if i + 3 < chunk.len() {
                let r = chunk[i] as u16;
                let g = chunk[i + 1] as u16;
                let b = chunk[i + 2] as u16;
                let gray = ((r + g + g + b) >> 2) as u8;
                chunk[i] = gray;
                chunk[i + 1] = gray;
                chunk[i + 2] = gray;
            }
        }
    });
}

#[inline]
pub fn brightness_simd(pixels: &mut [u8], adjustment: i16) {
    pixels.par_chunks_mut(16).for_each(|chunk| {
        for i in (0..chunk.len()).step_by(4) {
            if i + 3 < chunk.len() {
                chunk[i] = ((chunk[i] as i16 + adjustment).clamp(0, 255)) as u8;
                chunk[i + 1] = ((chunk[i + 1] as i16 + adjustment).clamp(0, 255)) as u8;
                chunk[i + 2] = ((chunk[i + 2] as i16 + adjustment).clamp(0, 255)) as u8;
            }
        }
    });
}

#[inline]
pub fn invert_simd(pixels: &mut [u8]) {
    pixels.par_chunks_mut(16).for_each(|chunk| {
        for i in (0..chunk.len()).step_by(4) {
            if i + 3 < chunk.len() {
                chunk[i] = 255 - chunk[i];
                chunk[i + 1] = 255 - chunk[i + 1];
                chunk[i + 2] = 255 - chunk[i + 2];
                // Alpha unchanged
            }
        }
    });
}

pub fn process_pixels_parallel<F>(pixels: &mut [u8], chunk_size: usize, f: F)
where
    F: Fn(&mut [u8]) + Sync + Send,
{
    pixels.par_chunks_mut(chunk_size).for_each(|chunk| {
        f(chunk);
    });
}

#[cfg(target_arch = "x86_64")]
pub mod x86 {

    /// Check if AVX2 is available at runtime
    pub fn has_avx2() -> bool {
        #[cfg(target_feature = "avx2")]
        {
            true
        }
        #[cfg(not(target_feature = "avx2"))]
        {
            false
        }
    }

    /// Check if SSE4.1 is available at runtime
    pub fn has_sse41() -> bool {
        #[cfg(target_feature = "sse4.1")]
        {
            true
        }
        #[cfg(not(target_feature = "sse4.1"))]
        {
            false
        }
    }
}

#[cfg(target_arch = "wasm32")]
pub mod wasm {

    /// Check if WASM SIMD is available
    pub fn has_simd() -> bool {
        #[cfg(target_feature = "simd128")]
        {
            true
        }
        #[cfg(not(target_feature = "simd128"))]
        {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grayscale_fast() {
        let mut pixels = vec![255u8, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255];
        grayscale_fast(&mut pixels);

        // Red pixel should become gray
        assert_eq!(pixels[0], pixels[1]);
        assert_eq!(pixels[1], pixels[2]);
        // Alpha should be unchanged
        assert_eq!(pixels[3], 255);
    }

    #[test]
    fn test_brightness_simd() {
        let mut pixels = vec![100u8, 100, 100, 255];
        brightness_simd(&mut pixels, 50);

        assert_eq!(pixels[0], 150);
        assert_eq!(pixels[1], 150);
        assert_eq!(pixels[2], 150);
        assert_eq!(pixels[3], 255);
    }

    #[test]
    fn test_invert_simd() {
        let mut pixels = vec![100u8, 150, 200, 255];
        invert_simd(&mut pixels);

        assert_eq!(pixels[0], 155);
        assert_eq!(pixels[1], 105);
        assert_eq!(pixels[2], 55);
        assert_eq!(pixels[3], 255);
    }
}
