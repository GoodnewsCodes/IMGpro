import { getSettings } from "./settings";

export function initImageConversion() {
  const dropZone = document.getElementById("conv-drop-zone");
  const fileInput = document.getElementById(
    "conv-file-input"
  ) as HTMLInputElement;
  const previewContainer = document.getElementById("conv-preview-container");
  const originalPreview = document.getElementById(
    "conv-original-preview"
  ) as HTMLImageElement;
  const resultPreview = document.getElementById(
    "conv-result-preview"
  ) as HTMLImageElement;
  const resultWrapper = document.getElementById("conv-result-wrapper");
  const loadingOverlay = document.getElementById("conv-loading-overlay");
  const processBtn = document.getElementById(
    "conv-process-btn"
  ) as HTMLButtonElement;
  const downloadBtn = document.getElementById(
    "conv-download-btn"
  ) as HTMLButtonElement;
  const resetBtn = document.getElementById(
    "conv-reset-btn"
  ) as HTMLButtonElement;

  if (!dropZone || !fileInput || !processBtn) return;

  const formatSelect = document.getElementById(
    "format-select"
  ) as HTMLSelectElement;
  const qualitySlider = document.getElementById(
    "quality-slider"
  ) as HTMLInputElement;
  const qualityValue = document.getElementById("quality-value");
  const qualityGroup = document.getElementById("quality-group");

  let currentFile: File | null = null;
  let convertedBuffer: Uint8Array | null = null;

  // Apply default settings
  const settings = getSettings();
  if (formatSelect) formatSelect.value = settings.defaultFormat;
  if (qualitySlider) {
    qualitySlider.value = settings.defaultQuality.toString();
    if (qualityValue)
      qualityValue.textContent = settings.defaultQuality.toString();
  }

  // Trigger visibility check
  const initialFormat = formatSelect.value;
  if (
    initialFormat === "png" ||
    initialFormat === "gif" ||
    initialFormat === "svg" ||
    initialFormat === "icns"
  ) {
    qualityGroup?.classList.add("hidden");
  } else {
    qualityGroup?.classList.remove("hidden");
  }

  // Handle quality slider visibility
  formatSelect.addEventListener("change", () => {
    const format = formatSelect.value;
    if (
      format === "png" ||
      format === "gif" ||
      format === "svg" ||
      format === "icns"
    ) {
      qualityGroup?.classList.add("hidden");
    } else {
      qualityGroup?.classList.remove("hidden");
    }
  });

  qualitySlider.addEventListener("input", () => {
    if (qualityValue) qualityValue.textContent = qualitySlider.value;
  });

  // Upload Logic
  dropZone?.addEventListener("click", () => fileInput.click());

  dropZone?.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone?.addEventListener("dragleave", (e) => {
    // Only remove drag-over class if we're actually leaving the drop zone
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZone.contains(relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (originalPreview) {
        originalPreview.src = e.target?.result as string;
        previewContainer?.classList.remove("hidden");
        dropZone?.classList.add("hidden");
      }
    };
    reader.readAsDataURL(file);
  }

  // Handle drag and drop on original preview to reset and upload new image
  originalPreview?.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    originalPreview.classList.add("drag-over");
  });

  originalPreview?.addEventListener("dragleave", () => {
    originalPreview.classList.remove("drag-over");
  });

  originalPreview?.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    originalPreview.classList.remove("drag-over");

    if (e.dataTransfer?.files.length) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        // Reset state
        currentFile = null;
        convertedBuffer = null;
        if (fileInput) fileInput.value = "";
        if (resultPreview) resultPreview.src = "";
        downloadBtn.classList.add("hidden");
        resultWrapper?.classList.add("hidden");

        // Handle new file
        handleFile(file);
      }
    }
  });

  // Process Logic
  processBtn.addEventListener("click", async () => {
    if (!currentFile) return;

    loadingOverlay?.classList.remove("hidden");
    resultWrapper?.classList.remove("hidden");
    processBtn.disabled = true;

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const format = formatSelect.value;
      const quality = parseInt(qualitySlider.value);

      const result = await window.electronAPI.convertImage({
        buffer,
        format,
        quality,
      });

      if (result.success && result.buffer) {
        convertedBuffer = result.buffer;
        const blob = new Blob([result.buffer as any], {
          type: `image/${format}`,
        });
        const url = URL.createObjectURL(blob);
        if (resultPreview) {
          resultPreview.src = url;
          downloadBtn.classList.remove("hidden");
        }
      } else {
        alert("Conversion failed: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during conversion.");
    } finally {
      loadingOverlay?.classList.add("hidden");
      processBtn.disabled = false;
    }
  });

  // Download/Save Logic
  downloadBtn.addEventListener("click", async () => {
    if (!convertedBuffer || !currentFile) return;

    const format = formatSelect.value;
    const originalName = currentFile.name.split(".")[0];
    const defaultPath = `${originalName}_converted.${format}`;

    const savePath = await window.electronAPI.selectSavePath(defaultPath);
    if (savePath) {
      const result = await window.electronAPI.saveFile({
        filePath: savePath,
        buffer: convertedBuffer,
      });

      if (!result.success) {
        alert("Failed to save file: " + result.error);
      }
    }
  });

  // Reset Logic
  resetBtn.addEventListener("click", () => {
    currentFile = null;
    convertedBuffer = null;
    if (fileInput) fileInput.value = "";
    if (originalPreview) originalPreview.src = "";
    if (resultPreview) resultPreview.src = "";
    previewContainer?.classList.add("hidden");
    dropZone?.classList.remove("hidden");
    downloadBtn.classList.add("hidden");
    resultWrapper?.classList.add("hidden");
  });
}
