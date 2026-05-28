/**
 * =============================================================================
 * Wedding Photo/Video Upload Portal - Google Apps Script Backend
 * =============================================================================
 * 
 * A production-ready backend for a shared wedding photo and video gallery.
 * Handles file uploads, validation, rate limiting, and gallery browsing.
 * 
 * Setup:
 * 1. Replace UPLOAD_FOLDER_ID with your Google Drive folder ID
 * 2. Optionally set EVENT_CODE to restrict access
 * 3. Deploy as a web app (Execute as: Me, Access: Anyone)
 * 
 * @author Wedding Gallery Team
 * @version 1.0.0
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/** @const {string} Google Drive folder ID where uploads are stored */
const UPLOAD_FOLDER_ID = '1qVS3Bllz12-nRkHugMSIdx-j5CvhP2LX'; // <-- Replace with your folder ID

/** @const {number} Maximum image file size in bytes (50 MB) */
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;

/** @const {number} Maximum video file size in bytes (750 MB) */
const MAX_VIDEO_SIZE = 750 * 1024 * 1024;

/** @const {number} Maximum uploads allowed within the rate limit window */
const RATE_LIMIT_MAX = 20;

/** @const {number} Rate limit window duration in seconds (2 minutes) */
const RATE_LIMIT_WINDOW_SECONDS = 120;

/** @const {string} Optional event code for access control (empty string = disabled) */
const EVENT_CODE = '';

/** @const {Object.<string, boolean>} Allowed image MIME types */
const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': true,
  'image/png': true,
  'image/heic': true,
  'image/heif': true,
  'image/webp': true
};

/** @const {Object.<string, boolean>} Allowed video MIME types */
const ALLOWED_VIDEO_TYPES = {
  'video/mp4': true,
  'video/quicktime': true,
  'video/webm': true,
  'video/x-m4v': true,
  'video/3gpp': true,
  'video/3gpp2': true,
  'video/x-matroska': true,
  'video/avi': true,
  'video/x-msvideo': true
};

/** @const {number} Maximum filename length after sanitization */
const MAX_FILENAME_LENGTH = 100;

/** @const {number} Default page size for gallery pagination */
const DEFAULT_PAGE_SIZE = 20;


// =============================================================================
// WEB APP ENTRY POINTS
// =============================================================================

/**
 * Handles GET requests to the web app.
 * Serves the main HTML page with proper mobile and embedding settings.
 * 
 * @param {GoogleAppsScript.Events.DoGet} e - The GET event object
 * @returns {GoogleAppsScript.HTML.HtmlOutput} The rendered HTML page
 */
function doGet(e) {
  try {
    const html = HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('Martina & Tin Wedding Gallery')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    
    return html;
  } catch (error) {
    console.error('doGet error:', error.message, error.stack);
    return HtmlService.createHtmlOutput(
      '<h1>Something went wrong</h1><p>Please try refreshing the page.</p>'
    ).setTitle('Error');
  }
}

/**
 * Handles POST requests for file uploads.
 * Validates event code, rate limit, file type, file size, then saves to Drive.
 * 
 * @param {GoogleAppsScript.Events.DoPost} e - The POST event object
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response with success/error
 */
function doPost(e) {
  try {
    // Parse request data
    const params = e.parameter || {};
    const postData = e.postData;

    // Validate event code if enabled
    if (EVENT_CODE && EVENT_CODE.length > 0) {
      const submittedCode = params.eventCode || '';
      if (submittedCode !== EVENT_CODE) {
        return buildJsonResponse({ success: false, error: 'Invalid event code. Please check and try again.' });
      }
    }

    // Check rate limit
    const sessionId = params.sessionId || 'anonymous';
    if (!checkRateLimit(sessionId)) {
      return buildJsonResponse({
        success: false,
        error: 'Upload limit reached. Please wait a few minutes before uploading more files.'
      });
    }

    // Extract file data
    const fileBlob = postData ? postData.getBlob() : null;
    if (!fileBlob) {
      return buildJsonResponse({ success: false, error: 'No file received. Please try again.' });
    }

    const mimeType = params.mimeType || fileBlob.getContentType() || 'application/octet-stream';
    const originalName = params.fileName || fileBlob.getName() || 'unnamed_file';
    const fileSize = fileBlob.getBytes().length;

    // Validate file type and size
    const validation = validateFile(mimeType, fileSize);
    if (!validation.valid) {
      return buildJsonResponse({ success: false, error: validation.error });
    }

    // Sanitize filename
    const safeName = sanitizeFilename(originalName);

    // Determine subfolder based on MIME type
    const isVideo = ALLOWED_VIDEO_TYPES[mimeType] === true || mimeType.startsWith('video/');
    const subfolderName = isVideo ? 'videos' : 'photos';

    // Get or create the target subfolder
    const parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const subfolder = getOrCreateSubfolder(parentFolder, subfolderName);

    // Save file to Drive
    fileBlob.setName(safeName);
    fileBlob.setContentType(mimeType);
    const savedFile = subfolder.createFile(fileBlob);

    // Increment rate limit counter
    incrementRateLimitCounter(sessionId);

    // Update upload stats
    updateUploadStats(fileSize);

    return buildJsonResponse({
      success: true,
      message: 'File uploaded successfully!',
      file: {
        id: savedFile.getId(),
        name: savedFile.getName(),
        mimeType: mimeType,
        size: fileSize
      }
    });

  } catch (error) {
    console.error('doPost error:', error.message, error.stack);
    return buildJsonResponse({
      success: false,
      error: 'An unexpected error occurred during upload. Please try again.'
    });
  }
}


// =============================================================================
// CLIENT-SIDE UPLOAD (called via google.script.run)
// =============================================================================

/**
 * Handles file upload from the client-side frontend via google.script.run.
 * Receives a payload object with base64-encoded file data.
 * 
 * @param {Object} payload - Upload payload from the frontend
 * @param {string} payload.fileName - Original filename
 * @param {string} payload.mimeType - MIME type of the file
 * @param {string} payload.data - Base64-encoded file content
 * @param {string} [payload.eventCode] - Optional event code for access control
 * @returns {Object} Result object with success status and file info or error
 */
function uploadFile(payload) {
  try {
    console.log('uploadFile called: fileName=' + (payload.fileName || 'null') + ', mimeType=' + (payload.mimeType || 'null') + ', dataLength=' + (payload.data ? payload.data.length : 0));

    // Validate event code if enabled
    if (EVENT_CODE && EVENT_CODE.length > 0) {
      const submittedCode = (payload.eventCode || '').toLowerCase().trim();
      if (submittedCode !== EVENT_CODE.toLowerCase().trim()) {
        throw new Error('Neispravan kod. Provjerite i pokušajte ponovo.');
      }
    }

    // Generate a session ID from the payload for rate limiting
    const sessionId = payload.sessionId || Session.getTemporaryActiveUserKey() || 'anonymous';

    // Check rate limit
    if (!checkRateLimit(sessionId)) {
      throw new Error('Previše prijenosa. Pričekajte nekoliko minuta.');
    }

    // Validate inputs
    if (!payload.data || !payload.fileName || !payload.mimeType) {
      throw new Error('Nepotpuni podaci. Pokušajte ponovo.');
    }

    const mimeType = payload.mimeType;
    const originalName = payload.fileName;

    // Decode base64 data
    const decodedData = Utilities.base64Decode(payload.data);
    const fileSize = decodedData.length;

    // Validate file type and size
    const validation = validateFile(mimeType, fileSize);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Sanitize filename
    const safeName = sanitizeFilename(originalName);

    // Determine subfolder based on MIME type
    const isVideo = ALLOWED_VIDEO_TYPES[mimeType] === true || mimeType.startsWith('video/');
    const subfolderName = isVideo ? 'videos' : 'photos';

    // Get or create the target subfolder
    const parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const subfolder = getOrCreateSubfolder(parentFolder, subfolderName);

    // Create blob and save to Drive
    const blob = Utilities.newBlob(decodedData, mimeType, safeName);
    const savedFile = subfolder.createFile(blob);

    // Note: File inherits sharing settings from parent folder.
    // Make sure the upload folder is shared as "Anyone with link = Viewer"
    // so gallery thumbnails work.

    // Increment rate limit counter
    incrementRateLimitCounter(sessionId);

    // Update upload stats
    updateUploadStats(fileSize);

    return {
      success: true,
      message: 'Datoteka uspješno prenesena!',
      file: {
        id: savedFile.getId(),
        name: savedFile.getName(),
        mimeType: mimeType,
        size: fileSize
      }
    };

  } catch (error) {
    console.error('uploadFile error:', error.message, error.stack);
    throw new Error(error.message || 'Prijenos nije uspio. Pokušajte ponovo.');
  }
}


// =============================================================================
// CHUNKED UPLOAD (for files > 25 MB)
// =============================================================================

/** @const {string} Name of the temporary folder for chunks */
const TEMP_FOLDER_NAME = '_chunks_temp';

/**
 * Receives a single chunk of a large file upload.
 * Stores the chunk as a temporary file in Drive.
 * When the last chunk arrives, assembles all chunks into the final file.
 *
 * @param {Object} payload - Chunk payload
 * @param {string} payload.uploadId - Unique ID for this upload session
 * @param {number} payload.chunkIndex - Index of this chunk (0-based)
 * @param {number} payload.totalChunks - Total number of chunks expected
 * @param {string} payload.data - Base64-encoded chunk data
 * @param {string} payload.fileName - Original filename (sent with every chunk for safety)
 * @param {string} payload.mimeType - MIME type of the file
 * @returns {Object} Status: {success, done, chunkIndex} or final file info
 */
function uploadChunk(payload) {
  try {
    const { uploadId, chunkIndex, totalChunks, data, fileName, mimeType } = payload;

    console.log('uploadChunk: id=' + uploadId + ', chunk=' + chunkIndex + '/' + totalChunks + ', dataLen=' + (data ? data.length : 0));

    // Rate limit check for chunk uploads
    const sessionId = payload.sessionId || Session.getTemporaryActiveUserKey() || 'anonymous';
    if (!checkRateLimit(sessionId)) {
      throw new Error('Previše prijenosa. Pričekajte nekoliko minuta.');
    }

    // Validate inputs
    if (!uploadId || chunkIndex === undefined || !totalChunks || !data || !fileName || !mimeType) {
      throw new Error('Nepotpuni podaci za chunk upload.');
    }

    // Validate file type
    const isImage = ALLOWED_IMAGE_TYPES[mimeType] === true;
    const isVideo = ALLOWED_VIDEO_TYPES[mimeType] === true || mimeType.startsWith('video/');
    if (!isImage && !isVideo) {
      throw new Error('Nepodržani format datoteke.');
    }

    const parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);

    // Determine estimated total size (chunkSize ~5MB × totalChunks)
    const estimatedTotalSize = totalChunks * 5 * 1024 * 1024;
    const ASSEMBLY_LIMIT = 50 * 1024 * 1024;

    if (estimatedTotalSize <= ASSEMBLY_LIMIT) {
      // SMALL FILE PATH: save to temp folder, assemble on last chunk
      const tempFolder = getOrCreateSubfolder(parentFolder, TEMP_FOLDER_NAME);
      const chunkBlob = Utilities.newBlob(Utilities.base64Decode(data), 'application/octet-stream', uploadId + '_chunk_' + String(chunkIndex).padStart(4, '0'));
      tempFolder.createFile(chunkBlob);

      if (chunkIndex === totalChunks - 1) {
        return assembleSmallFile(uploadId, totalChunks, fileName, mimeType, tempFolder, parentFolder);
      }
    } else {
      // LARGE FILE PATH: save directly to dedicated subfolder with final name
      const subfolderName = isVideo ? 'videos' : 'photos';
      const targetFolder = getOrCreateSubfolder(parentFolder, subfolderName);

      // Create/get the dedicated chunk folder — use uploadId for consistency across all chunks
      const cleanOriginalName = fileName.replace(/[\/\\:*?"<>|\x00]/g, '').trim();
      const lastDot = cleanOriginalName.lastIndexOf('.');
      const baseNameForFolder = lastDot > 0 ? cleanOriginalName.substring(0, lastDot) : cleanOriginalName;
      const chunkFolderName = '[CHUNKED] ' + uploadId + ' ' + baseNameForFolder;
      const chunkFolder = getOrCreateSubfolder(targetFolder, chunkFolderName);

      // Save chunk directly with final name
      const partNum = String(chunkIndex + 1).padStart(3, '0');
      const totalStr = String(totalChunks).padStart(3, '0');
      const chunkName = baseNameForFolder + '_part' + partNum + '_of_' + totalStr + '.bin';

      const chunkBlob = Utilities.newBlob(Utilities.base64Decode(data), 'application/octet-stream', chunkName);
      chunkFolder.createFile(chunkBlob);

      // On last chunk, add README
      if (chunkIndex === totalChunks - 1) {
        const readmeContent = 'CHUNKED VIDEO FILE\n'
          + '==================\n\n'
          + 'Original filename: ' + fileName + '\n'
          + 'MIME type: ' + mimeType + '\n'
          + 'Total parts: ' + totalChunks + '\n'
          + 'Estimated size: ~' + Math.round(estimatedTotalSize / (1024 * 1024)) + ' MB\n'
          + 'Upload date: ' + new Date().toISOString() + '\n\n'
          + 'HOW TO REASSEMBLE:\n'
          + '1. Download all .bin parts to a single folder on your computer\n'
          + '2. Open terminal/command prompt in that folder\n'
          + '3. Run:\n\n'
          + '   Windows (CMD):\n'
          + '   copy /b *_part*.bin "' + fileName + '"\n\n'
          + '   Mac/Linux:\n'
          + '   cat *_part*.bin > "' + fileName + '"\n\n'
          + '4. The reassembled file is ready to play.\n';

        const readmeBlob = Utilities.newBlob(readmeContent, 'text/plain', '_README_HOW_TO_REASSEMBLE.txt');
        chunkFolder.createFile(readmeBlob);

        updateUploadStats(estimatedTotalSize);
        console.log('uploadChunk complete (large file stored): ' + chunkFolderName + ', parts=' + totalChunks);

        return {
          success: true,
          done: true,
          message: 'Datoteka uspješno prenesena!',
          file: { id: chunkFolder.getId(), name: chunkFolderName, mimeType: mimeType, size: estimatedTotalSize }
        };
      }
    }

    // Not the last chunk — acknowledge receipt
    return {
      success: true,
      done: false,
      chunkIndex: chunkIndex,
      message: 'Chunk ' + (chunkIndex + 1) + '/' + totalChunks + ' primljen.'
    };

  } catch (error) {
    console.error('uploadChunk error:', error.message, error.stack);
    throw new Error(error.message || 'Chunk upload nije uspio.');
  }
}

/**
 * Assembles all chunks into a single file (for files ≤50 MB).
 * Cleans up temp files after assembly.
 */
function assembleSmallFile(uploadId, totalChunks, fileName, mimeType, tempFolder, parentFolder) {
  console.log('assembleSmallFile: id=' + uploadId + ', totalChunks=' + totalChunks);

  // Collect all chunk files for this upload, sorted by name
  const chunkFiles = [];
  const files = tempFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().startsWith(uploadId + '_chunk_')) {
      chunkFiles.push(file);
    }
  }

  chunkFiles.sort(function (a, b) {
    return a.getName().localeCompare(b.getName());
  });

  if (chunkFiles.length !== totalChunks) {
    chunkFiles.forEach(function (f) { f.setTrashed(true); });
    throw new Error('Nedostaju dijelovi datoteke (' + chunkFiles.length + '/' + totalChunks + '). Pokušajte ponovo.');
  }

  // Assemble into single file
  const safeName = sanitizeFilename(fileName);
  const isVideo = ALLOWED_VIDEO_TYPES[mimeType] === true || mimeType.startsWith('video/');
  const subfolderName = isVideo ? 'videos' : 'photos';
  const targetFolder = getOrCreateSubfolder(parentFolder, subfolderName);

  let allBytes = [];
  for (let i = 0; i < chunkFiles.length; i++) {
    const chunkBytes = chunkFiles[i].getBlob().getBytes();
    allBytes = allBytes.concat(chunkBytes);
  }

  const finalBlob = Utilities.newBlob(allBytes, mimeType, safeName);
  const savedFile = targetFolder.createFile(finalBlob);

  chunkFiles.forEach(function (f) { f.setTrashed(true); });
  updateUploadStats(allBytes.length);
  console.log('assembleSmallFile complete: ' + safeName + ', size=' + allBytes.length);

  return {
    success: true,
    done: true,
    message: 'Datoteka uspješno prenesena!',
    file: { id: savedFile.getId(), name: savedFile.getName(), mimeType: mimeType, size: allBytes.length }
  };
}


// =============================================================================
// GALLERY FUNCTIONS
// =============================================================================

/**
 * Fetches gallery files with pagination support.
 * Returns image and video files sorted by creation date (newest first).
 * 
 * @param {number} [page=1] - The page number to retrieve (1-indexed)
 * @param {number} [pageSize=20] - Number of items per page
 * @returns {Object} Paginated gallery data with file metadata
 */
function getGalleryImages(page, pageSize) {
  try {
    page = parseInt(page, 10) || 0;
    pageSize = parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE;

    // Clamp values
    if (page < 0) page = 0;
    if (pageSize < 1) pageSize = 1;
    if (pageSize > 100) pageSize = 100;

    const parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const allFiles = [];

    // Collect files from photos subfolder
    collectMediaFiles(parentFolder, 'photos', allFiles);

    // Collect files from videos subfolder
    collectMediaFiles(parentFolder, 'videos', allFiles);

    // Also check root folder for any direct uploads (excludes _chunks_temp subfolder by design,
    // since we only iterate files, not subfolders, at the root level)
    const rootFiles = parentFolder.getFiles();
    while (rootFiles.hasNext()) {
      const file = rootFiles.next();
      const mime = file.getMimeType();
      if (ALLOWED_IMAGE_TYPES[mime] || ALLOWED_VIDEO_TYPES[mime]) {
        allFiles.push(buildFileMetadata(file));
      }
    }

    // Sort by date descending (newest first)
    allFiles.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));

    // Paginate (page is 0-indexed from frontend)
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, allFiles.length);
    const pageFiles = allFiles.slice(startIndex, endIndex);

    // Transform to format expected by frontend
    const images = pageFiles.map(f => ({
      id: f.id,
      name: f.name,
      url: f.url,
      thumbnailUrl: f.thumbnailUrl,
      isVideo: f.isVideo,
      dateCreated: f.dateCreated
    }));

    return {
      success: true,
      images: images
    };

  } catch (error) {
    console.error('getGalleryImages error:', error.message, error.stack);
    return {
      success: false,
      error: 'Unable to load gallery. Please try again later.',
      images: []
    };
  }
}


// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Checks whether a session has exceeded the upload rate limit.
 * Uses CacheService with a sliding window approach.
 * 
 * @param {string} sessionId - Unique identifier for the user session
 * @returns {boolean} True if the session is under the limit, false if exceeded
 */
function checkRateLimit(sessionId) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'ratelimit_' + sessionId;
    const cached = cache.get(cacheKey);

    if (!cached) {
      return true; // No previous uploads recorded
    }

    const count = parseInt(cached, 10);
    return count < RATE_LIMIT_MAX;

  } catch (error) {
    console.error('checkRateLimit error:', error.message, error.stack);
    // Fail open: allow upload if rate limiting system errors
    return true;
  }
}

/**
 * Increments the rate limit counter for a given session.
 * Sets or updates the cache entry with the current window expiration.
 * 
 * @param {string} sessionId - Unique identifier for the user session
 */
function incrementRateLimitCounter(sessionId) {
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'ratelimit_' + sessionId;
    const cached = cache.get(cacheKey);

    let count = 0;
    if (cached) {
      count = parseInt(cached, 10);
    }

    count += 1;
    cache.put(cacheKey, count.toString(), RATE_LIMIT_WINDOW_SECONDS);

  } catch (error) {
    console.error('incrementRateLimitCounter error:', error.message, error.stack);
  }
}


// =============================================================================
// FILE VALIDATION
// =============================================================================

/**
 * Validates a file's MIME type and size against allowed limits.
 * 
 * @param {string} mimeType - The MIME type of the file
 * @param {number} size - The file size in bytes
 * @returns {{valid: boolean, error: string}} Validation result
 */
function validateFile(mimeType, size) {
  // Check MIME type against whitelist
  const isImage = ALLOWED_IMAGE_TYPES[mimeType] === true;
  const isVideo = ALLOWED_VIDEO_TYPES[mimeType] === true || mimeType.startsWith('video/');

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'File type not supported. Please upload JPEG, PNG, HEIC, HEIF, WebP images or MP4, MOV, WebM videos.'
    };
  }

  // Check size against appropriate limit
  if (isImage && size > MAX_IMAGE_SIZE) {
    const maxMB = Math.round(MAX_IMAGE_SIZE / (1024 * 1024));
    return {
      valid: false,
      error: `Image file is too large. Maximum size is ${maxMB} MB.`
    };
  }

  if (isVideo && size > MAX_VIDEO_SIZE) {
    const maxMB = Math.round(MAX_VIDEO_SIZE / (1024 * 1024));
    return {
      valid: false,
      error: `Video file is too large. Maximum size is ${maxMB} MB.`
    };
  }

  if (size === 0) {
    return {
      valid: false,
      error: 'File appears to be empty. Please select a valid file.'
    };
  }

  return { valid: true, error: '' };
}


// =============================================================================
// FILENAME SANITIZATION
// =============================================================================

/**
 * Sanitizes a filename by removing dangerous characters and prepending
 * a timestamp with random hex for uniqueness.
 * 
 * Pattern: YYYYMMDD_HHmmss_randomHex_originalname
 * 
 * @param {string} originalName - The original filename from the upload
 * @returns {string} A sanitized, unique filename
 */
function sanitizeFilename(originalName) {
  try {
    // Remove dangerous characters: / \ : * ? " < > | and null bytes
    let cleaned = originalName.replace(/[\/\\:*?"<>|\x00]/g, '');

    // Remove any leading/trailing whitespace and dots (prevent hidden files)
    cleaned = cleaned.replace(/^[\s.]+|[\s.]+$/g, '');

    // If nothing remains, use a default name
    if (!cleaned || cleaned.length === 0) {
      cleaned = 'unnamed_file';
    }

    // Extract extension
    const lastDot = cleaned.lastIndexOf('.');
    let baseName = lastDot > 0 ? cleaned.substring(0, lastDot) : cleaned;
    let extension = lastDot > 0 ? cleaned.substring(lastDot) : '';

    // Generate timestamp prefix
    const now = new Date();
    const timestamp = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');

    // Generate random hex (8 characters)
    const randomBytes = Utilities.getUuid().replace(/-/g, '').substring(0, 8);

    // Build the new filename
    const prefix = `${timestamp}_${randomBytes}_`;

    // Calculate max length for the original name portion
    const maxBaseLength = MAX_FILENAME_LENGTH - prefix.length - extension.length;

    if (maxBaseLength > 0 && baseName.length > maxBaseLength) {
      baseName = baseName.substring(0, maxBaseLength);
    }

    const finalName = `${prefix}${baseName}${extension}`;

    // Final safety check on total length
    if (finalName.length > MAX_FILENAME_LENGTH) {
      return finalName.substring(0, MAX_FILENAME_LENGTH - extension.length) + extension;
    }

    return finalName;

  } catch (error) {
    console.error('sanitizeFilename error:', error.message, error.stack);
    // Fallback: generate a safe name
    const fallbackTimestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    const fallbackRandom = Utilities.getUuid().replace(/-/g, '').substring(0, 8);
    return `${fallbackTimestamp}_${fallbackRandom}_upload`;
  }
}


// =============================================================================
// UPLOAD STATISTICS
// =============================================================================

/**
 * Returns upload statistics: total file count, total size, and last upload time.
 * Uses PropertiesService to cache stats for performance.
 * 
 * @returns {Object} Upload statistics
 */
function getUploadStats() {
  try {
    const props = PropertiesService.getScriptProperties();
    const totalCount = parseInt(props.getProperty('stats_totalCount') || '0', 10);
    const totalSize = parseInt(props.getProperty('stats_totalSize') || '0', 10);
    const lastUpload = props.getProperty('stats_lastUpload') || null;

    return {
      success: true,
      stats: {
        totalFiles: totalCount,
        totalSizeBytes: totalSize,
        totalSizeMB: Math.round((totalSize / (1024 * 1024)) * 100) / 100,
        lastUploadTimestamp: lastUpload
      }
    };

  } catch (error) {
    console.error('getUploadStats error:', error.message, error.stack);
    return {
      success: false,
      error: 'Unable to retrieve upload statistics.',
      stats: { totalFiles: 0, totalSizeBytes: 0, totalSizeMB: 0, lastUploadTimestamp: null }
    };
  }
}

/**
 * Updates the cached upload statistics after a successful upload.
 * 
 * @param {number} fileSize - Size of the uploaded file in bytes
 */
function updateUploadStats(fileSize) {
  try {
    const props = PropertiesService.getScriptProperties();
    const currentCount = parseInt(props.getProperty('stats_totalCount') || '0', 10);
    const currentSize = parseInt(props.getProperty('stats_totalSize') || '0', 10);

    props.setProperties({
      'stats_totalCount': (currentCount + 1).toString(),
      'stats_totalSize': (currentSize + fileSize).toString(),
      'stats_lastUpload': new Date().toISOString()
    });

  } catch (error) {
    console.error('updateUploadStats error:', error.message, error.stack);
  }
}


// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Builds a JSON text output response for the web app.
 * 
 * @param {Object} data - The response data to serialize
 * @returns {GoogleAppsScript.Content.TextOutput} JSON content output
 */
function buildJsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Gets or creates a subfolder within a parent folder.
 * 
 * @param {GoogleAppsScript.Drive.Folder} parentFolder - The parent folder
 * @param {string} subfolderName - Name of the subfolder to find or create
 * @returns {GoogleAppsScript.Drive.Folder} The subfolder
 */
function getOrCreateSubfolder(parentFolder, subfolderName) {
  const folders = parentFolder.getFoldersByName(subfolderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return parentFolder.createFolder(subfolderName);
}

/**
 * Collects media files from a named subfolder into the provided array.
 * 
 * @param {GoogleAppsScript.Drive.Folder} parentFolder - The parent folder
 * @param {string} subfolderName - Name of the subfolder to scan
 * @param {Array} filesArray - Array to push file metadata objects into
 */
function collectMediaFiles(parentFolder, subfolderName, filesArray) {
  const subfolders = parentFolder.getFoldersByName(subfolderName);
  if (!subfolders.hasNext()) return;

  const folder = subfolders.next();
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const mime = file.getMimeType();
    if (ALLOWED_IMAGE_TYPES[mime] || ALLOWED_VIDEO_TYPES[mime]) {
      filesArray.push(buildFileMetadata(file));
    }
  }
}

/**
 * Builds a metadata object for a Drive file suitable for gallery display.
 * 
 * @param {GoogleAppsScript.Drive.File} file - The Drive file
 * @returns {Object} File metadata with id, name, mimeType, URLs, and date
 */
function buildFileMetadata(file) {
  const fileId = file.getId();
  const mimeType = file.getMimeType();
  const isVideo = mimeType.startsWith('video/');

  // For videos, use a direct view link; for images, use thumbnail
  const thumbnailUrl = isVideo
    ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`
    : `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;

  // Full view URL: images get large thumbnail, videos get direct view link
  const viewUrl = isVideo
    ? `https://drive.google.com/uc?id=${fileId}&export=download`
    : `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;

  return {
    id: fileId,
    name: file.getName(),
    mimeType: mimeType,
    isVideo: isVideo,
    thumbnailUrl: thumbnailUrl,
    url: viewUrl,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    dateCreated: file.getDateCreated().toISOString()
  };
}


// =============================================================================
// MAINTENANCE FUNCTIONS
// =============================================================================

/**
 * Cleans up orphaned chunk files older than 1 hour.
 * Should be called periodically via time-driven trigger.
 * 
 * Setup: In Apps Script editor, go to Triggers > Add Trigger:
 *   Function: cleanupOrphanedChunks
 *   Event source: Time-driven
 *   Type: Hour timer (every 1 hour)
 */
function cleanupOrphanedChunks() {
  try {
    const parentFolder = DriveApp.getFolderById(UPLOAD_FOLDER_ID);
    const tempFolders = parentFolder.getFoldersByName(TEMP_FOLDER_NAME);
    if (!tempFolders.hasNext()) return;
    
    const tempFolder = tempFolders.next();
    const files = tempFolder.getFiles();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let cleaned = 0;
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getDateCreated() < oneHourAgo) {
        file.setTrashed(true);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log('cleanupOrphanedChunks: removed ' + cleaned + ' stale chunks');
    }
  } catch (error) {
    console.error('cleanupOrphanedChunks error:', error.message);
  }
}
