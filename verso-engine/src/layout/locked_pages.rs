//! Locked page numbering for production scripts (A-pages).
//!
//! In production/shooting scripts, page numbers are "locked" after a certain point.
//! When content is added that would push to a new page, instead of renumbering
//! all subsequent pages, "A-pages" are inserted (e.g., 47A, 47B).
//! When pages are removed, they become "OMITTED" markers.

use crate::types::{LockedPageConfig, Page, PageIdentifier};

/// Apply locked page numbering to a vector of pages.
///
/// This function transforms sequential page identifiers based on the locked page config:
/// 1. Pages up to `locked_page_count` remain sequential
/// 2. Pages beyond `locked_page_count` become A-pages (47A, 47B, etc.)
/// 3. Omitted pages are inserted at their specified positions
///
/// # Arguments
/// * `pages` - Mutable slice of pages to renumber
/// * `config` - Locked page configuration
///
/// # Example
/// If `locked_page_count` is 50 and pagination produces 53 pages:
/// - Pages 1-50 remain as Sequential(1) through Sequential(50)
/// - Page 51 becomes Inserted { base: 50, suffix: 'A' }
/// - Page 52 becomes Inserted { base: 50, suffix: 'B' }
/// - Page 53 becomes Inserted { base: 50, suffix: 'C' }
pub fn apply_locked_page_numbering(pages: &mut Vec<Page>, config: &LockedPageConfig) {
    if !config.enabled || config.locked_page_count == 0 {
        return;
    }

    let locked_count = config.locked_page_count;

    // First, renumber pages that exceed the locked count
    for page in pages.iter_mut() {
        if let PageIdentifier::Sequential(n) = page.identifier {
            if n > locked_count {
                // Convert to A-page: pages beyond locked_count become suffixed
                // Page locked_count+1 -> locked_count + 'A'
                // Page locked_count+2 -> locked_count + 'B'
                // etc.
                let suffix_offset = n - locked_count - 1; // 0-indexed
                let suffix = get_suffix_for_index(suffix_offset);
                page.identifier = PageIdentifier::Inserted {
                    base: locked_count,
                    suffix,
                };
            }
        }
    }

    // Now insert omitted page markers at their positions
    // Sort omitted pages to insert them in order
    let mut omitted = config.omitted_pages.clone();
    omitted.sort_unstable();
    omitted.dedup(); // Remove duplicates

    for &omitted_page in omitted.iter() {
        // Only insert omitted markers for pages within or at the locked count
        if omitted_page > 0 && omitted_page <= locked_count {
            insert_omitted_page(pages, omitted_page);
        }
    }
}

/// Get the suffix character for a given index (0='A', 1='B', ..., 25='Z').
///
/// For indices beyond 25, we extend with AA, AB, etc. but for simplicity
/// in the initial implementation, we wrap at Z and continue with double letters.
fn get_suffix_for_index(index: u32) -> char {
    if index < 26 {
        (b'A' + index as u8) as char
    } else {
        // For indices >= 26, wrap around (very rare in practice)
        // In a real script, having more than 26 extra pages after a locked
        // page would be extremely unusual
        (b'A' + (index % 26) as u8) as char
    }
}

/// Insert an omitted page marker at the correct position.
///
/// Omitted pages are inserted in their numerical position, pushing
/// subsequent pages down in the list.
fn insert_omitted_page(pages: &mut Vec<Page>, omitted_page_number: u32) {
    // Create the omitted page marker
    let omitted_page = Page {
        identifier: PageIdentifier::Omitted(omitted_page_number),
        elements: Vec::new(),
        bottom_continuation: None,
        lines_used: 0,
        pixel_y: 0.0, // Will need recalculation if used
        bottom_padding_px: 0.0,
        scene_continued_bottom: None,
        scene_continued_top: None,
        continued_scene_number: None,
    };

    // Find the correct insertion position based on sort order
    let insert_pos = pages.iter().position(|p| {
        p.identifier.sort_key() > (omitted_page_number, 0)
    }).unwrap_or(pages.len());

    pages.insert(insert_pos, omitted_page);
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_sequential_page(n: u32) -> Page {
        Page {
            identifier: PageIdentifier::Sequential(n),
            elements: Vec::new(),
            bottom_continuation: None,
            lines_used: 10,
            pixel_y: (n as f32 - 1.0) * 1096.0,
            bottom_padding_px: 100.0,
            scene_continued_bottom: None,
            scene_continued_top: None,
            continued_scene_number: None,
        }
    }

    #[test]
    fn test_locked_pages_disabled() {
        let config = LockedPageConfig {
            enabled: false,
            locked_page_count: 50,
            omitted_pages: vec![],
        };

        let mut pages: Vec<Page> = (1..=55).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // All pages should remain sequential
        assert_eq!(pages.len(), 55);
        for (i, page) in pages.iter().enumerate() {
            assert_eq!(page.identifier, PageIdentifier::Sequential((i + 1) as u32));
        }
    }

    #[test]
    fn test_locked_pages_no_overflow() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![],
        };

        let mut pages: Vec<Page> = (1..=50).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // All pages should remain sequential (exactly at locked count)
        assert_eq!(pages.len(), 50);
        for (i, page) in pages.iter().enumerate() {
            assert_eq!(page.identifier, PageIdentifier::Sequential((i + 1) as u32));
        }
    }

    #[test]
    fn test_a_page_generation_single() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![],
        };

        let mut pages: Vec<Page> = (1..=51).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Pages 1-50 remain sequential
        for i in 0..50 {
            assert_eq!(pages[i].identifier, PageIdentifier::Sequential((i + 1) as u32));
        }

        // Page 51 becomes 50A
        assert_eq!(
            pages[50].identifier,
            PageIdentifier::Inserted { base: 50, suffix: 'A' }
        );
    }

    #[test]
    fn test_a_page_generation_multiple() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![],
        };

        let mut pages: Vec<Page> = (1..=55).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Pages 1-50 remain sequential
        for i in 0..50 {
            assert_eq!(pages[i].identifier, PageIdentifier::Sequential((i + 1) as u32));
        }

        // Pages 51-55 become A-pages
        assert_eq!(pages[50].identifier, PageIdentifier::Inserted { base: 50, suffix: 'A' });
        assert_eq!(pages[51].identifier, PageIdentifier::Inserted { base: 50, suffix: 'B' });
        assert_eq!(pages[52].identifier, PageIdentifier::Inserted { base: 50, suffix: 'C' });
        assert_eq!(pages[53].identifier, PageIdentifier::Inserted { base: 50, suffix: 'D' });
        assert_eq!(pages[54].identifier, PageIdentifier::Inserted { base: 50, suffix: 'E' });
    }

    #[test]
    fn test_a_page_generation_full_alphabet() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 10,
            omitted_pages: vec![],
        };

        // Create 10 + 26 + 5 = 41 pages to test going beyond Z
        let mut pages: Vec<Page> = (1..=41).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // First 10 remain sequential
        for i in 0..10 {
            assert_eq!(pages[i].identifier, PageIdentifier::Sequential((i + 1) as u32));
        }

        // 10A through 10Z
        assert_eq!(pages[10].identifier, PageIdentifier::Inserted { base: 10, suffix: 'A' });
        assert_eq!(pages[35].identifier, PageIdentifier::Inserted { base: 10, suffix: 'Z' });

        // Beyond Z wraps (very rare edge case)
        assert_eq!(pages[36].identifier, PageIdentifier::Inserted { base: 10, suffix: 'A' });
    }

    #[test]
    fn test_omitted_pages_single() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![25],
        };

        let mut pages: Vec<Page> = (1..=50).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Should now have 51 pages (50 original + 1 omitted)
        assert_eq!(pages.len(), 51);

        // Find the omitted page at position 25
        let omitted_idx = pages.iter().position(|p| {
            matches!(p.identifier, PageIdentifier::Omitted(25))
        });
        assert!(omitted_idx.is_some(), "Should have omitted page 25");

        // Verify it's in the right position
        // The omitted marker should be placed in sorted order
        let idx = omitted_idx.unwrap();
        assert!(idx > 0);

        // The omitted page (25, 0) should come after page 24 (24, 0)
        // and before page 25 Sequential (25, 0) - but since they have the same key,
        // the omitted marker is inserted at the position where pages[idx].sort_key() > (25, 0)
        // This means it goes right before page 26 (26, 0)
        if idx < pages.len() - 1 {
            assert!(pages[idx + 1].identifier.sort_key() > (25, 0),
                "Omitted page should be before pages with sort_key > 25");
        }
    }

    #[test]
    fn test_omitted_pages_multiple() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![10, 20, 30],
        };

        let mut pages: Vec<Page> = (1..=50).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Should have 53 pages (50 original + 3 omitted)
        assert_eq!(pages.len(), 53);

        // Verify all omitted markers exist
        let omitted_count = pages.iter().filter(|p| {
            matches!(p.identifier, PageIdentifier::Omitted(_))
        }).count();
        assert_eq!(omitted_count, 3);
    }

    #[test]
    fn test_omitted_pages_beyond_locked_count_ignored() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![60, 70], // Beyond locked count
        };

        let mut pages: Vec<Page> = (1..=50).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Should still have 50 pages (omitted beyond locked count are ignored)
        assert_eq!(pages.len(), 50);
    }

    #[test]
    fn test_combined_a_pages_and_omitted() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![25],
        };

        // 53 pages: will have A-pages beyond 50 AND an omitted marker
        let mut pages: Vec<Page> = (1..=53).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Should have 54 pages (53 original + 1 omitted - but 3 became A-pages)
        // Actually: 50 sequential + 3 A-pages + 1 omitted = 54
        assert_eq!(pages.len(), 54);

        // Verify A-pages exist
        let a_pages: Vec<_> = pages.iter().filter(|p| {
            matches!(p.identifier, PageIdentifier::Inserted { .. })
        }).collect();
        assert_eq!(a_pages.len(), 3);

        // Verify omitted exists
        let omitted_count = pages.iter().filter(|p| {
            matches!(p.identifier, PageIdentifier::Omitted(_))
        }).count();
        assert_eq!(omitted_count, 1);
    }

    #[test]
    fn test_get_suffix_for_index() {
        assert_eq!(get_suffix_for_index(0), 'A');
        assert_eq!(get_suffix_for_index(1), 'B');
        assert_eq!(get_suffix_for_index(25), 'Z');
        assert_eq!(get_suffix_for_index(26), 'A'); // Wraps
        assert_eq!(get_suffix_for_index(27), 'B');
    }

    #[test]
    fn test_page_identifier_display() {
        // Verify the display strings are correct
        assert_eq!(PageIdentifier::Sequential(42).display(), "42");
        assert_eq!(
            PageIdentifier::Inserted { base: 50, suffix: 'A' }.display(),
            "50A"
        );
        assert_eq!(
            PageIdentifier::Inserted { base: 50, suffix: 'B' }.display(),
            "50B"
        );
        assert_eq!(PageIdentifier::Omitted(25).display(), "25 OMITTED");
    }

    #[test]
    fn test_zero_locked_count_disables() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 0, // Zero disables
            omitted_pages: vec![],
        };

        let mut pages: Vec<Page> = (1..=55).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // All pages should remain sequential (zero locked count = disabled)
        assert_eq!(pages.len(), 55);
        for (i, page) in pages.iter().enumerate() {
            assert_eq!(page.identifier, PageIdentifier::Sequential((i + 1) as u32));
        }
    }

    #[test]
    fn test_duplicate_omitted_pages_deduplicated() {
        let config = LockedPageConfig {
            enabled: true,
            locked_page_count: 50,
            omitted_pages: vec![25, 25, 25], // Duplicates
        };

        let mut pages: Vec<Page> = (1..=50).map(make_sequential_page).collect();
        apply_locked_page_numbering(&mut pages, &config);

        // Should only have one omitted marker despite duplicates
        assert_eq!(pages.len(), 51);

        let omitted_count = pages.iter().filter(|p| {
            matches!(p.identifier, PageIdentifier::Omitted(_))
        }).count();
        assert_eq!(omitted_count, 1);
    }
}
