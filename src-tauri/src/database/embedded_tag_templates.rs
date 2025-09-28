/// Embedded tag template HTML files for production builds
/// This ensures tag printing works without filesystem access

pub const TAG_32MM_TEMPLATE: &str = include_str!("../templates/tags/tag_32mm.html");
pub const TAG_40MM_TEMPLATE: &str = include_str!("../templates/tags/tag_40mm.html");
pub const TAG_50MM_TEMPLATE: &str = include_str!("../templates/tags/tag_50mm.html");

/// Get tag template HTML by roll width
pub fn get_tag_template(roll_width: &str) -> &'static str {
    match roll_width {
        "32mm" => TAG_32MM_TEMPLATE,
        "40mm" => TAG_40MM_TEMPLATE,
        "50mm" => TAG_50MM_TEMPLATE,
        _ => TAG_40MM_TEMPLATE, // Default to 40mm
    }
}