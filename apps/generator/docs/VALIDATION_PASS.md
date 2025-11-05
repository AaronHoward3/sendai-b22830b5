# MJML Validation Pass Feature

## Overview

The generator now includes an optional **second validation pass** that uses GPT-4o Vision AI to compare the generated email against the brand's website and automatically fix any quality issues.

## How It Works

### Step 1: Initial Generation
1. Generate MJML using the primary prompt with example layouts
2. Convert MJML to HTML for rendering

### Step 2: Vision Validation
1. Take a screenshot of the rendered email
2. Take a screenshot of the brand's website
3. Use GPT-4o Vision to compare both images
4. Identify issues in 5 categories:
   - **Typography Issues**: Font matching, sizing, weights, compression
   - **Spacing Issues**: Padding, section spacing, column balance, alignment
   - **Layout Issues**: Overlapping elements, aspect ratios, symmetry
   - **Color Consistency**: Brand color usage
   - **Design Aesthetic**: Match to intended style (minimal/bold/magazine)

### Step 3: Auto-Fix (if issues found)
1. Parse the list of issues from vision analysis
2. Generate a fix prompt with specific corrections needed
3. Regenerate MJML with fixes applied
4. Use the corrected version if successful

## Configuration

### Enable/Disable Validation

The validation pass is **enabled by default**. To disable it:

```bash
# In .env file
ENABLE_MJML_VALIDATION=false
```

Or keep it enabled (default):
```bash
ENABLE_MJML_VALIDATION=true
# Or simply omit the variable - enabled by default
```

### Screenshot Service

The validation uses ScreenshotAPI to capture website screenshots. Configure the API key:

```bash
SCREENSHOT_API_KEY=your_api_key_here
```

If no key is provided, it will use demo mode (limited functionality).

## Output Examples

### Validation Passed
```
✅ Validation passed - email quality approved
```

### Validation Failed with Auto-Fix
```
⚠️ Validation found 3 issues:
- Text appears compressed in product grid section - needs more padding
- Font weight too light for headings - should be bolder for bold_contrasting aesthetic
- Product images appear stretched - aspect ratio not maintained

🔄 Regenerating MJML with fixes...
✅ Applied auto-fixes in 4.2s
```

## Performance Impact

- Validation adds approximately **5-10 seconds** to generation time
- Uses GPT-4o Vision API calls (additional cost)
- Auto-fix adds another **3-6 seconds** if triggered

## Logs

All validation events are logged to `generation.log`:

```
[2025-01-15T10:30:45.123Z] 🔍 Starting second validation pass...
[2025-01-15T10:30:50.456Z] ⚠️ Validation found issues: Text compressed in grid; Font weight too light
[2025-01-15T10:30:54.789Z] ✅ Auto-fixed MJML after validation (4.3s)
```

## Validation Criteria

The vision AI checks for:

1. **Typography**
   - Font family matches brand website
   - Font sizes are readable and appropriate
   - Font weights match design aesthetic
   - Text is not compressed or stretched

2. **Spacing**
   - Adequate padding around all elements
   - Sections properly spaced (not cramped)
   - Columns have balanced spacing
   - Buttons and images are aligned

3. **Layout**
   - No overlapping or cut-off elements
   - Images maintain aspect ratios
   - Layout is balanced and symmetrical
   - Product grids are evenly spaced

4. **Colors**
   - Brand primary color is used effectively
   - Brand link color is consistent
   - Color scheme matches brand identity

5. **Design Aesthetic**
   - Matches intended style (minimal/bold/magazine)
   - Visual hierarchy is clear
   - Overall design cohesion

## Technical Details

### Functions

- `validateMjmlWithVision(mjmlCode, domain, brandFont, brandColors, designAesthetic)`
  - Converts MJML to HTML
  - Compares with brand website screenshot
  - Returns validation result with issues list

- `regenerateMjmlWithFixes(originalMjml, validationIssues, essentialData, imagePart, aestheticStyles, designAesthetic)`
  - Takes original MJML and issue list
  - Generates fix prompt with specific corrections
  - Returns corrected MJML

### Integration

The validation pass is integrated into the `/generate` endpoint:

```javascript
// After initial MJML generation...
if (enableValidation && cleanedMjml && domain) {
  const validationResult = await validateMjmlWithVision(...);
  
  if (!validationResult.passed && validationResult.issues.length > 0) {
    const fixedMjml = await regenerateMjmlWithFixes(...);
    if (fixedMjml) cleanedMjml = fixedMjml;
  }
}
```

## Benefits

1. **Automatic Quality Control**: Catches and fixes common issues before delivery
2. **Brand Consistency**: Ensures emails match brand website aesthetics
3. **Reduced Manual Revisions**: Fewer iterations needed
4. **Better Typography**: Accurate font matching and sizing
5. **Improved Layouts**: Prevents spacing and alignment issues

## Limitations

1. Requires brand website to be accessible
2. Adds processing time to generation
3. Additional API costs for vision analysis
4. May not catch every edge case
5. Auto-fix success depends on issue complexity

## Best Practices

1. **Keep validation enabled** for production use
2. **Monitor logs** to track validation success rates
3. **Review auto-fixed emails** periodically for quality
4. **Adjust prompts** if certain issues persist
5. **Consider disabling** for rapid testing/development

## Future Enhancements

Potential improvements:
- Multi-round validation (validate after fix)
- Configurable validation strictness levels
- A/B testing with/without validation
- Machine learning to improve fix accuracy
- Caching of website screenshots
- Validation metrics dashboard

