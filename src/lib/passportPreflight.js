const MIME_TO_EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function extensionOf(name = '') {
  const cleanName = String(name).split(/[?#]/, 1)[0];
  const match = cleanName.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : '';
}

function formatBound(bound) {
  return bound && Number.isFinite(bound.value) ? `${bound.value} ${bound.unit}` : '';
}

function fileSizeDescription(rule) {
  const min = formatBound(rule?.min);
  const max = formatBound(rule?.max);
  if (min && max) return `${min}–${max}`;
  if (min) return `At least ${min}`;
  if (max) return `Up to ${max}`;
  return 'See the official source';
}

function pixelDescription(min, max) {
  const px = (value) => value && Number.isFinite(value.widthPx) && Number.isFinite(value.heightPx)
    ? `${value.widthPx} × ${value.heightPx} px`
    : '';
  const lower = px(min);
  const upper = max?.status === 'notSpecified' ? '' : px(max);
  if (lower && upper) return `${lower} to ${upper}`;
  if (lower) return `At least ${lower}; no upper limit specified`;
  if (upper) return `Up to ${upper}; no lower limit specified`;
  return 'See the official source';
}

function fieldStatus(field) {
  if (field?.status === 'notSpecified') return 'notSpecified';
  if (field?.status === 'notApplicable') return 'notApplicable';
  if (field?.status === 'pathwayDependent') return 'pathwayDependent';
  return 'notCheckable';
}

function baseResult(status, message) {
  return { status, message, checks: [] };
}

/**
 * Compare a selected file's name/type/byte count and decoded pixel dimensions with
 * fields explicitly marked as specified for the selected submission mode.
 * This function is pure: it does not read, mutate, encode, or return image data.
 */
export function inspectPassportFile(fileInfo, mode) {
  const digital = mode?.digitalUpload;
  if (!digital) return baseResult('notCheckable', 'No digital-upload rule is recorded for this pathway.');
  if (digital.status === 'notApplicable') {
    return baseResult('notApplicable', 'A user-supplied digital photo does not apply to this pathway.');
  }
  if (digital.status !== 'specified') {
    return baseResult(digital.status || 'notSpecified', 'The digital-photo pathway is uncertain; confirm the exact process with the issuing authority. No file checks were run.');
  }

  const file = fileInfo || {};
  const checks = [];
  const format = digital.format;
  if (format?.status === 'specified' && Array.isArray(format.values)) {
    const actual = extensionOf(file.name) || MIME_TO_EXTENSION[String(file.type || '').toLowerCase()] || '';
    const accepted = format.values.map((value) => String(value).toLowerCase());
    checks.push(actual
      ? {
          field: 'format',
          status: accepted.includes(actual) ? 'matches' : 'outside',
          actual,
          expected: accepted.join(', '),
          message: accepted.includes(actual)
            ? `The file label .${actual} is listed as an allowed format.`
            : `The file label .${actual} is not in the listed formats.`,
        }
      : {
          field: 'format',
          status: 'notCheckable',
          expected: accepted.join(', '),
          message: 'The file extension or browser image type could not be identified.',
        });
  } else {
    checks.push({
      field: 'format',
      status: fieldStatus(format),
      message: 'The reviewed official source does not publish an automated file-type check for this pathway.',
    });
  }

  const fileSize = digital.fileSize;
  if (fileSize?.status === 'specified') {
    checks.push({
      field: 'fileSize',
      status: 'manualReview',
      actualBytes: Number.isFinite(file.sizeBytes) ? file.sizeBytes : null,
      expected: fileSizeDescription(fileSize),
      message: `Official range: ${fileSizeDescription(fileSize)}. Actual size is shown in bytes; no pass/fail is assigned because this dataset does not record the source's KB/MB-to-byte convention.`,
    });
  } else {
    checks.push({
      field: 'fileSize',
      status: fieldStatus(fileSize),
      actualBytes: Number.isFinite(file.sizeBytes) ? file.sizeBytes : null,
      message: 'No automated file-size comparison is available for this pathway.',
    });
  }

  const dimensions = digital.dimensions;
  if (dimensions?.status === 'specified') {
    const width = file.widthPx;
    const height = file.heightPx;
    const hasPixels = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
    if (!hasPixels) {
      checks.push({
        field: 'dimensions',
        status: 'notCheckable',
        expected: pixelDescription(dimensions.min, dimensions.max),
        message: 'The browser could not read this file’s pixel dimensions.',
      });
    } else {
      const min = dimensions.min?.status === 'notSpecified' ? null : dimensions.min;
      const max = dimensions.max?.status === 'notSpecified' ? null : dimensions.max;
      const withinMin = !min || ((min.widthPx == null || width >= min.widthPx) && (min.heightPx == null || height >= min.heightPx));
      const withinMax = !max || ((max.widthPx == null || width <= max.widthPx) && (max.heightPx == null || height <= max.heightPx));
      checks.push({
        field: 'dimensions',
        status: withinMin && withinMax ? 'matches' : 'outside',
        actual: `${width} × ${height} px`,
        expected: pixelDescription(dimensions.min, dimensions.max),
        message: withinMin && withinMax
          ? `The recorded dimensions are within the listed pixel bounds (${width} × ${height} px).`
          : `The recorded dimensions are outside one or more listed pixel bounds (${width} × ${height} px).`,
      });
    }
  } else {
    checks.push({
      field: 'dimensions',
      status: fieldStatus(dimensions),
      message: 'Pixel dimensions are not published as a machine-checkable limit for this pathway.',
    });
  }

  const aspectRatio = digital.aspectRatio;
  if (aspectRatio?.status === 'specified' && Number.isFinite(aspectRatio.width) && Number.isFinite(aspectRatio.height) && aspectRatio.width > 0 && aspectRatio.height > 0) {
    const width = file.widthPx;
    const height = file.heightPx;
    const hasPixels = Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0;
    if (!hasPixels) {
      checks.push({
        field: 'aspectRatio',
        status: 'notCheckable',
        expected: `${aspectRatio.width}:${aspectRatio.height}`,
        message: 'The browser could not read this file’s pixel dimensions.',
      });
    } else {
      const matches = width * aspectRatio.height === height * aspectRatio.width;
      checks.push({
        field: 'aspectRatio',
        status: matches ? 'matches' : 'outside',
        actual: `${width}:${height}`,
        expected: `${aspectRatio.width}:${aspectRatio.height}`,
        message: matches
          ? `The pixel dimensions exactly match the listed ${aspectRatio.width}:${aspectRatio.height} ratio.`
          : `The pixel dimensions are not an exact ${aspectRatio.width}:${aspectRatio.height} ratio. Near matches need the authority’s checker or instructions.`,
      });
    }
  } else {
    checks.push({
      field: 'aspectRatio',
      status: fieldStatus(aspectRatio),
      message: 'Aspect ratio is not specified for an automated check in the reviewed source.',
    });
  }

  const hasOutside = checks.some((check) => check.status === 'outside');
  const allMatched = checks.length > 0 && checks.every((check) => check.status === 'matches');
  return {
    status: hasOutside ? 'needsReview' : allMatched ? 'matchesListedChecks' : 'partial',
    message: hasOutside
      ? 'One or more measured properties differ from a listed technical rule. Review the official guidance.'
      : allMatched
        ? 'The measured properties match the listed checks. This is not an acceptance guarantee.'
        : 'Some properties remain unverified or require manual review. Check the official guidance.',
    checks,
  };
}
