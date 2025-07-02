// Global variables
let currentCode = '';
let countdownTimer = null;
let uploadStartTime = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeUpload();
    initializeDownload();
    setupEventListeners();
});

// Initialize upload functionality
function initializeUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const browseButton = document.getElementById('browse-button');

    // File input change handler
    fileInput.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Browse button click
    browseButton.addEventListener('click', function() {
        fileInput.click();
    });

    // Drag and drop handlers
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
}

// Initialize download functionality
function initializeDownload() {
    const keypadButtons = document.querySelectorAll('.keypad-btn[data-digit]');
    const clearButton = document.getElementById('clear-btn');
    const submitButton = document.getElementById('submit-code');
    const codeInput = document.getElementById('code-input');

    // Keypad button handlers
    keypadButtons.forEach(button => {
        button.addEventListener('click', function() {
            const digit = this.getAttribute('data-digit');
            addDigitToCode(digit);
        });
    });

    // Clear button handler
    clearButton.addEventListener('click', function() {
        clearCode();
    });

    // Submit button handler
    submitButton.addEventListener('click', function() {
        if (currentCode.length === 6) {
            checkCode(currentCode);
        }
    });

    // Allow keyboard input
    document.addEventListener('keydown', function(e) {
        if (e.key >= '0' && e.key <= '9') {
            addDigitToCode(e.key);
        } else if (e.key === 'Backspace') {
            removeLastDigit();
        } else if (e.key === 'Enter' && currentCode.length === 6) {
            checkCode(currentCode);
        }
    });
}

// Setup additional event listeners
function setupEventListeners() {
    // Copy code button
    const copyCodeBtn = document.getElementById('copy-code-btn');
    if (copyCodeBtn) {
        copyCodeBtn.addEventListener('click', function() {
            const code = document.getElementById('transfer-code').textContent;
            copyToClipboard(code);
        });
    }

    // Upload another button
    const uploadAnotherBtn = document.getElementById('upload-another');
    if (uploadAnotherBtn) {
        uploadAnotherBtn.addEventListener('click', function() {
            resetUploadSection();
        });
    }

    // Back to input button
    const backToInputBtn = document.getElementById('back-to-input');
    if (backToInputBtn) {
        backToInputBtn.addEventListener('click', function() {
            showCodeInput();
        });
    }

    // Download file button
    const downloadFileBtn = document.getElementById('download-file-btn');
    if (downloadFileBtn) {
        downloadFileBtn.addEventListener('click', function() {
            const code = this.getAttribute('data-code');
            window.location.href = `/download_file/${code}`;
        });
    }
}

// Handle file upload
function handleFileUpload(file) {
    // Check file size (2GB limit)
    if (file.size > 2 * 1024 * 1024 * 1024) {
        showToast('Error', 'File size exceeds 2GB limit', 'error');
        return;
    }

    // Show progress section
    showUploadProgress();
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Start upload
    uploadStartTime = Date.now();
    uploadFile(formData, file);
}

// Upload file with progress tracking
function uploadFile(formData, file) {
    const xhr = new XMLHttpRequest();
    const progressBar = document.querySelector('.progress-bar');
    const uploadSpeed = document.querySelector('.upload-speed');
    const uploadEta = document.querySelector('.upload-eta');

    xhr.upload.addEventListener('progress', function(e) {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            progressBar.style.width = percentComplete + '%';

            // Calculate speed and ETA
            const elapsed = (Date.now() - uploadStartTime) / 1000;
            const speed = e.loaded / elapsed;
            const remaining = (e.total - e.loaded) / speed;

            uploadSpeed.textContent = `Speed: ${formatBytes(speed)}/s`;
            uploadEta.textContent = `ETA: ${formatTime(remaining)}`;
        }
    });

    xhr.addEventListener('load', function() {
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
                showUploadSuccess(response);
            } else {
                showToast('Error', response.error, 'error');
                resetUploadSection();
            }
        } else {
            showToast('Error', 'Upload failed. Please try again.', 'error');
            resetUploadSection();
        }
    });

    xhr.addEventListener('error', function() {
        showToast('Error', 'Upload failed. Please check your connection.', 'error');
        resetUploadSection();
    });

    xhr.open('POST', '/upload');
    xhr.send(formData);
}

// Show upload progress
function showUploadProgress() {
    document.getElementById('upload-area').classList.add('d-none');
    document.getElementById('upload-progress').classList.remove('d-none');
    document.getElementById('upload-progress').classList.add('fade-in');
    
    // Add encouraging messages
    showToast('Info', 'Encrypting your file for secure transfer...', 'info');
}

// Show upload success
function showUploadSuccess(response) {
    document.getElementById('upload-progress').classList.add('d-none');
    document.getElementById('upload-success').classList.remove('d-none');

    // Set transfer info
    document.getElementById('transfer-code').textContent = response.code;
    document.getElementById('uploaded-filename').textContent = response.filename;
    document.getElementById('uploaded-filesize').textContent = formatBytes(response.file_size);

    // Set QR code
    if (response.qr_code) {
        document.getElementById('qr-code').innerHTML = 
            `<img src="data:image/png;base64,${response.qr_code}" alt="QR Code">`;
    }

    // Start countdown timer
    startCountdownTimer(response.expires_in);

    // Show success animation
    document.getElementById('upload-success').classList.add('fade-in');
    
    // Show success message with helpful tips
    showToast('Success', `File uploaded! Share code: ${response.code}`, 'success');
    
    // Add pulse effect to code for attention
    document.getElementById('transfer-code').classList.add('pulse');
    setTimeout(() => {
        document.getElementById('transfer-code').classList.remove('pulse');
    }, 3000);
}

// Reset upload section
function resetUploadSection() {
    document.getElementById('upload-area').classList.remove('d-none');
    document.getElementById('upload-progress').classList.add('d-none');
    document.getElementById('upload-success').classList.add('d-none');
    
    // Reset progress bar
    document.querySelector('.progress-bar').style.width = '0%';
    
    // Clear file input
    document.getElementById('file-input').value = '';

    // Stop countdown timer
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

// Start countdown timer
function startCountdownTimer(seconds) {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    const timerElement = document.getElementById('countdown-timer');
    let remaining = seconds;

    countdownTimer = setInterval(function() {
        remaining--;
        
        if (remaining <= 0) {
            clearInterval(countdownTimer);
            timerElement.textContent = '00:00';
            showToast('Warning', 'Transfer has expired', 'warning');
            return;
        }

        const minutes = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

// Add digit to code
function addDigitToCode(digit) {
    if (currentCode.length < 6) {
        currentCode += digit;
        updateCodeDisplay();
        
        // Add visual feedback
        const codeInput = document.getElementById('code-input');
        codeInput.classList.add('pulse');
        setTimeout(() => codeInput.classList.remove('pulse'), 200);
        
        // Auto-submit when 6 digits entered
        if (currentCode.length === 6) {
            showToast('Info', 'Checking code...', 'info');
            setTimeout(() => checkCode(currentCode), 300);
        }
    }
}

// Remove last digit from code
function removeLastDigit() {
    if (currentCode.length > 0) {
        currentCode = currentCode.slice(0, -1);
        updateCodeDisplay();
    }
}

// Clear code
function clearCode() {
    currentCode = '';
    updateCodeDisplay();
}

// Update code display
function updateCodeDisplay() {
    const codeInput = document.getElementById('code-input');
    codeInput.value = currentCode.padEnd(6, '0').replace(/0/g, '_').replace(/_/g, '0').substring(0, currentCode.length);
}

// Check code validity
async function checkCode(code) {
    try {
        const response = await fetch('/check_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code })
        });

        const data = await response.json();

        if (data.valid) {
            showDownloadPreview(data, code);
        } else {
            showToast('Error', data.error, 'error');
            clearCode();
        }
    } catch (error) {
        showToast('Error', 'Failed to verify code. Please try again.', 'error');
        clearCode();
    }
}

// Show download preview
function showDownloadPreview(fileInfo, code) {
    document.getElementById('code-input-section').classList.add('d-none');
    document.getElementById('download-preview').classList.remove('d-none');

    // Set file info
    document.getElementById('preview-filename').textContent = fileInfo.filename;
    document.getElementById('preview-filesize').textContent = formatBytes(fileInfo.file_size);

    // Set download button
    const downloadBtn = document.getElementById('download-file-btn');
    downloadBtn.setAttribute('data-code', code);
    downloadBtn.addEventListener('click', function() {
        showToast('Info', 'Starting download...', 'info');
        window.location.href = `/download_file/${code}`;
    });

    // Add animation and success feedback
    document.getElementById('download-preview').classList.add('slide-in');
    showToast('Success', 'Code verified! File ready for download', 'success');
    
    // Add countdown warning
    if (fileInfo.time_remaining < 300) { // Less than 5 minutes
        showToast('Warning', `File expires in ${Math.floor(fileInfo.time_remaining / 60)} minutes!`, 'warning');
    }
}

// Show code input section
function showCodeInput() {
    document.getElementById('download-preview').classList.add('d-none');
    document.getElementById('code-input-section').classList.remove('d-none');
    clearCode();
}

// Copy to clipboard
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('Success', 'Code copied to clipboard!', 'success');
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Success', 'Code copied to clipboard!', 'success');
    }
}

// Show toast notification
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toast-title');
    const toastBody = document.getElementById('toast-body');

    toastTitle.textContent = title;
    toastBody.textContent = message;

    // Remove existing type classes
    toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    
    // Add appropriate class based on type
    switch (type) {
        case 'success':
            toast.classList.add('bg-success');
            break;
        case 'error':
            toast.classList.add('bg-danger');
            break;
        case 'warning':
            toast.classList.add('bg-warning');
            break;
        default:
            toast.classList.add('bg-info');
    }

    // Show toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format time in seconds to readable format
function formatTime(seconds) {
    if (seconds < 60) {
        return Math.round(seconds) + 's';
    } else if (seconds < 3600) {
        return Math.round(seconds / 60) + 'm';
    } else {
        return Math.round(seconds / 3600) + 'h';
    }
}

// Utility function to check if element exists
function elementExists(id) {
    return document.getElementById(id) !== null;
}

// Initialize tooltips (Bootstrap 5)
document.addEventListener('DOMContentLoaded', function() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});
