use crate::filters;
use std::slice;

/// Opaque handle for image data
pub struct ImageHandle {
    pub data: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

/// Create a new image handle from raw RGBA data
///
/// # Safety
/// - `data` must be a valid pointer to `width * height * 4` bytes
/// - The data must be in RGBA format
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_create(
    data: *const u8,
    width: u32,
    height: u32,
) -> *mut ImageHandle {
    if data.is_null() {
        return std::ptr::null_mut();
    }

    let size = (width * height * 4) as usize;
    let slice = slice::from_raw_parts(data, size);

    let handle = Box::new(ImageHandle {
        data: slice.to_vec(),
        width,
        height,
    });

    Box::into_raw(handle)
}

/// Free an image handle
///
/// # Safety
/// - `handle` must be a valid pointer returned by `image_pipeline_create`
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_free(handle: *mut ImageHandle) {
    if !handle.is_null() {
        drop(Box::from_raw(handle));
    }
}

/// Get the width of the image
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_get_width(handle: *const ImageHandle) -> u32 {
    if handle.is_null() {
        return 0;
    }
    (*handle).width
}

/// Get the height of the image
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_get_height(handle: *const ImageHandle) -> u32 {
    if handle.is_null() {
        return 0;
    }
    (*handle).height
}

/// Get a pointer to the image data
///
/// # Safety
/// - `handle` must be a valid pointer
/// - The returned pointer is valid until the handle is freed or modified
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_get_data(handle: *const ImageHandle) -> *const u8 {
    if handle.is_null() {
        return std::ptr::null();
    }
    (*handle).data.as_ptr()
}

/// Get the size of the image data in bytes
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_get_data_size(handle: *const ImageHandle) -> usize {
    if handle.is_null() {
        return 0;
    }
    (*handle).data.len()
}

/// Apply grayscale filter
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_grayscale(handle: *mut ImageHandle) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::grayscale(&image);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Apply brightness adjustment
///
/// # Safety
/// - `handle` must be a valid pointer
/// - `value` should be between -1.0 and 1.0
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_brightness(handle: *mut ImageHandle, value: f32) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::brightness(&image, value);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Apply contrast adjustment
///
/// # Safety
/// - `handle` must be a valid pointer
/// - `value` is the contrast factor (1.0 = no change)
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_contrast(handle: *mut ImageHandle, value: f32) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::contrast(&image, value);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Apply Gaussian blur
///
/// # Safety
/// - `handle` must be a valid pointer
/// - `sigma` is the blur radius
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_blur(handle: *mut ImageHandle, sigma: f32) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::blur(&image, sigma);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Apply sharpening filter
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_sharpen(handle: *mut ImageHandle) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::sharpen(&image);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Apply edge detection (Sobel)
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_edge_detect(handle: *mut ImageHandle) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::edge_detect(&image);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Resize image
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_resize(
    handle: *mut ImageHandle,
    new_width: u32,
    new_height: u32,
) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::resize(&image, new_width, new_height);
        h.width = new_width;
        h.height = new_height;
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Invert colors
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_invert(handle: *mut ImageHandle) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::invert(&image);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Apply sepia tone
///
/// # Safety
/// - `handle` must be a valid pointer
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_sepia(handle: *mut ImageHandle) -> i32 {
    if handle.is_null() {
        return -1;
    }

    let h = &mut *handle;
    if let Some(image) = image::RgbaImage::from_raw(h.width, h.height, h.data.clone()) {
        let result = filters::sepia(&image);
        h.data = result.into_raw();
        0
    } else {
        -1
    }
}

/// Copy output data to caller-provided buffer
///
/// # Safety
/// - `handle` and `output` must be valid pointers
/// - `output` must have space for at least `width * height * 4` bytes
#[no_mangle]
pub unsafe extern "C" fn image_pipeline_copy_to(
    handle: *const ImageHandle,
    output: *mut u8,
    output_size: usize,
) -> i32 {
    if handle.is_null() || output.is_null() {
        return -1;
    }

    let h = &*handle;
    if output_size < h.data.len() {
        return -2; // Buffer too small
    }

    std::ptr::copy_nonoverlapping(h.data.as_ptr(), output, h.data.len());
    0
}

/// Get version string
#[no_mangle]
pub extern "C" fn image_pipeline_version() -> *const std::ffi::c_char {
    static VERSION: &[u8] = b"0.1.0\0";
    VERSION.as_ptr() as *const std::ffi::c_char
}
