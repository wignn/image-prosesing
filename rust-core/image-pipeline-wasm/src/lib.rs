use wasm_bindgen::prelude::*;
use image_pipeline::{filters, ImagePipeline, FilterOperation};

// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

/// Image processor instance for WebAssembly
#[wasm_bindgen]
pub struct WasmImageProcessor {
    data: Vec<u8>,
    width: u32,
    height: u32,
}

#[wasm_bindgen]
impl WasmImageProcessor {
    /// Create a new processor from RGBA image data
    #[wasm_bindgen(constructor)]
    pub fn new(data: &[u8], width: u32, height: u32) -> Result<WasmImageProcessor, JsValue> {
        let expected_size = (width * height * 4) as usize;
        if data.len() != expected_size {
            return Err(JsValue::from_str(&format!(
                "Invalid data size: expected {}, got {}",
                expected_size,
                data.len()
            )));
        }
        
        Ok(WasmImageProcessor {
            data: data.to_vec(),
            width,
            height,
        })
    }

    /// Get image width
    #[wasm_bindgen(getter)]
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Get image height
    #[wasm_bindgen(getter)]
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Get the processed image data as Uint8Array
    #[wasm_bindgen]
    pub fn get_data(&self) -> Vec<u8> {
        self.data.clone()
    }

    /// Apply grayscale filter
    #[wasm_bindgen]
    pub fn grayscale(&mut self) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::grayscale(img))
    }

    /// Apply brightness adjustment (-1.0 to 1.0)
    #[wasm_bindgen]
    pub fn brightness(&mut self, value: f32) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::brightness(img, value))
    }

    /// Apply contrast adjustment (0.0 to 2.0+)
    #[wasm_bindgen]
    pub fn contrast(&mut self, value: f32) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::contrast(img, value))
    }

    /// Apply Gaussian blur
    #[wasm_bindgen]
    pub fn blur(&mut self, sigma: f32) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::blur(img, sigma))
    }

    /// Apply sharpening filter
    #[wasm_bindgen]
    pub fn sharpen(&mut self) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::sharpen(img))
    }

    /// Apply edge detection (Sobel)
    #[wasm_bindgen]
    pub fn edge_detect(&mut self) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::edge_detect(img))
    }

    /// Resize image
    #[wasm_bindgen]
    pub fn resize(&mut self, new_width: u32, new_height: u32) -> Result<(), JsValue> {
        let img = self.to_image()?;
        let result = filters::resize(&img, new_width, new_height);
        self.width = new_width;
        self.height = new_height;
        self.data = result.into_raw();
        Ok(())
    }

    /// Invert colors
    #[wasm_bindgen]
    pub fn invert(&mut self) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::invert(img))
    }

    /// Apply sepia tone
    #[wasm_bindgen]
    pub fn sepia(&mut self) -> Result<(), JsValue> {
        self.apply_filter(|img| filters::sepia(img))
    }

    /// Apply multiple filters in sequence
    #[wasm_bindgen]
    pub fn apply_filters(&mut self, filters_json: &str) -> Result<(), JsValue> {
        // Parse JSON array of filter operations
        // Format: [{"type": "grayscale"}, {"type": "brightness", "value": 0.2}]
        let operations = parse_filter_json(filters_json)?;
        
        let img = self.to_image()?;
        let pipeline = ImagePipeline::new();
        
        let result = pipeline.process(&img, &operations)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        
        self.width = result.width();
        self.height = result.height();
        self.data = result.into_raw();
        
        Ok(())
    }

    /// Reset to original data (requires keeping original)
    #[wasm_bindgen]
    pub fn reset(&mut self, data: &[u8], width: u32, height: u32) -> Result<(), JsValue> {
        let expected_size = (width * height * 4) as usize;
        if data.len() != expected_size {
            return Err(JsValue::from_str("Invalid data size"));
        }
        
        self.data = data.to_vec();
        self.width = width;
        self.height = height;
        Ok(())
    }

    // Helper to convert internal data to RgbaImage
    fn to_image(&self) -> Result<image::RgbaImage, JsValue> {
        image::RgbaImage::from_raw(self.width, self.height, self.data.clone())
            .ok_or_else(|| JsValue::from_str("Failed to create image from data"))
    }

    // Helper to apply a filter function
    fn apply_filter<F>(&mut self, f: F) -> Result<(), JsValue>
    where
        F: FnOnce(&image::RgbaImage) -> image::RgbaImage,
    {
        let img = self.to_image()?;
        let result = f(&img);
        self.data = result.into_raw();
        Ok(())
    }
}

/// Parse JSON filter configuration
fn parse_filter_json(json: &str) -> Result<Vec<FilterOperation>, JsValue> {
    // Simple JSON parsing without serde (to keep WASM size small)
    let mut operations = Vec::new();
    
    // Basic parsing - in production, use serde_json with wasm feature
    let json = json.trim();
    if !json.starts_with('[') || !json.ends_with(']') {
        return Err(JsValue::from_str("Invalid JSON: expected array"));
    }
    
    // Extract individual filter objects
    let inner = &json[1..json.len()-1];
    
    for part in inner.split("},") {
        let part = part.trim().trim_start_matches('{').trim_end_matches('}').trim();
        if part.is_empty() {
            continue;
        }
        
        if let Some(op) = parse_single_filter(part) {
            operations.push(op);
        }
    }
    
    Ok(operations)
}

fn parse_single_filter(s: &str) -> Option<FilterOperation> {
    // Extract type field
    if s.contains("\"grayscale\"") {
        Some(FilterOperation::Grayscale)
    } else if s.contains("\"invert\"") {
        Some(FilterOperation::Invert)
    } else if s.contains("\"sepia\"") {
        Some(FilterOperation::Sepia)
    } else if s.contains("\"sharpen\"") {
        Some(FilterOperation::Sharpen)
    } else if s.contains("\"edge_detect\"") {
        Some(FilterOperation::EdgeDetect)
    } else if s.contains("\"brightness\"") {
        extract_f32_value(s, "value").map(FilterOperation::Brightness)
    } else if s.contains("\"contrast\"") {
        extract_f32_value(s, "value").map(FilterOperation::Contrast)
    } else if s.contains("\"blur\"") {
        extract_f32_value(s, "sigma").or_else(|| extract_f32_value(s, "value"))
            .map(FilterOperation::Blur)
    } else if s.contains("\"resize\"") {
        let width = extract_u32_value(s, "width")?;
        let height = extract_u32_value(s, "height")?;
        Some(FilterOperation::Resize { width, height })
    } else {
        None
    }
}

fn extract_f32_value(s: &str, key: &str) -> Option<f32> {
    let pattern = format!("\"{}\":", key);
    let idx = s.find(&pattern)?;
    let rest = &s[idx + pattern.len()..];
    let rest = rest.trim();
    
    // Find the end of the number
    let end = rest.find(|c: char| !c.is_numeric() && c != '.' && c != '-')
        .unwrap_or(rest.len());
    
    rest[..end].trim().parse().ok()
}

fn extract_u32_value(s: &str, key: &str) -> Option<u32> {
    extract_f32_value(s, key).map(|v| v as u32)
}

/// Get library version
#[wasm_bindgen]
pub fn get_version() -> String {
    "0.1.0".to_string()
}

/// Quick grayscale conversion without creating processor object
#[wasm_bindgen]
pub fn quick_grayscale(data: &[u8], width: u32, height: u32) -> Result<Vec<u8>, JsValue> {
    let img = image::RgbaImage::from_raw(width, height, data.to_vec())
        .ok_or_else(|| JsValue::from_str("Invalid image data"))?;
    
    let result = filters::grayscale(&img);
    Ok(result.into_raw())
}

/// Quick brightness adjustment
#[wasm_bindgen]
pub fn quick_brightness(data: &[u8], width: u32, height: u32, value: f32) -> Result<Vec<u8>, JsValue> {
    let img = image::RgbaImage::from_raw(width, height, data.to_vec())
        .ok_or_else(|| JsValue::from_str("Invalid image data"))?;
    
    let result = filters::brightness(&img, value);
    Ok(result.into_raw())
}

/// Quick blur
#[wasm_bindgen]
pub fn quick_blur(data: &[u8], width: u32, height: u32, sigma: f32) -> Result<Vec<u8>, JsValue> {
    let img = image::RgbaImage::from_raw(width, height, data.to_vec())
        .ok_or_else(|| JsValue::from_str("Invalid image data"))?;
    
    let result = filters::blur(&img, sigma);
    Ok(result.into_raw())
}
