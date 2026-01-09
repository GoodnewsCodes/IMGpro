import { getSettings } from "./settings";

export function initOptimization() {
  const fileInput = document.getElementById(
    "opt-file-input"
  ) as HTMLInputElement;
  const dropZone = document.getElementById("opt-drop-zone");
  const previewContainer = document.getElementById("opt-preview-container");
  const originalPreview = document.getElementById(
    "opt-original-preview"
  ) as HTMLImageElement;
  const resultPreview = document.getElementById(
    "opt-result-preview"
  ) as HTMLImageElement;
  const resultWrapper = document.getElementById("opt-result-wrapper");
  const loadingOverlay = document.getElementById("opt-loading-overlay");
  const processBtn = document.getElementById("opt-process-btn");
  const downloadBtn = document.getElementById("opt-download-btn");
  const resetBtn = document.getElementById("opt-reset-btn");
  const qualitySlider = document.getElementById(
    "opt-quality-slider"
  ) as HTMLInputElement;
  const qualityValue = document.getElementById("opt-quality-value");
  const formatSelect = document.getElementById(
    "opt-format-select"
  ) as HTMLSelectElement;

  let currentFile: File | null = null;
  let resultBuffer: Uint8Array | null = null;

  // Drag and drop handlers
  dropZone?.addEventListener("click", () => fileInput.click());

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--primary)";
  });

  dropZone?.addEventListener("dragleave", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border-color)";
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "var(--border-color)";
    if (e.dataTransfer?.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener("change", (e) => {
    if (fileInput.files?.length) {
      handleFile(fileInput.files[0]);
    }
  });

  // Quality slider
  qualitySlider?.addEventListener("input", () => {
    if (qualityValue) qualityValue.textContent = qualitySlider.value;
  });

  // Process button
  processBtn?.addEventListener("click", async () => {
    if (!currentFile) return;

    if (loadingOverlay) loadingOverlay.classList.remove("hidden");
    if (resultWrapper) resultWrapper.classList.remove("hidden");

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const quality = parseInt(qualitySlider.value);
      const format =
        formatSelect.value || currentFile.name.split(".").pop() || "png";

      const result = await window.electronAPI.convertImage({
        buffer,
        format,
        quality,
      });

      if (result.success && result.buffer) {
        resultBuffer = result.buffer;
        const blob = new Blob([resultBuffer as any], {
          type: `image/${format}`,
        });
        resultPreview.src = URL.createObjectURL(blob);
        if (downloadBtn) downloadBtn.classList.remove("hidden");
      } else {
        alert("Optimization failed: " + result.error);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during optimization.");
    } finally {
      if (loadingOverlay) loadingOverlay.classList.add("hidden");
    }
  });

  // Download button
  downloadBtn?.addEventListener("click", async () => {
    if (!resultBuffer) return;

    const format =
      formatSelect.value || currentFile?.name.split(".").pop() || "png";
    const defaultName = `optimized-${Date.now()}.${format}`;

    const filePath = await window.electronAPI.selectSavePath(defaultName);
    if (filePath) {
      const result = await window.electronAPI.saveFile({
        filePath,
        buffer: resultBuffer,
      });
      if (result.success) {
        alert("File saved successfully!");
      } else {
        alert("Failed to save file: " + result.error);
      }
    }
  });

  // Reset button
  resetBtn?.addEventListener("click", () => {
    currentFile = null;
    resultBuffer = null;
    if (dropZone) dropZone.classList.remove("hidden");
    if (previewContainer) previewContainer.classList.add("hidden");
    if (fileInput) fileInput.value = "";
    if (downloadBtn) downloadBtn.classList.add("hidden");
    if (resultPreview) resultPreview.src = "";
  });

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }

    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (originalPreview) originalPreview.src = e.target?.result as string;
      if (dropZone) dropZone.classList.add("hidden");
      if (previewContainer) previewContainer.classList.remove("hidden");

      // Load default settings
      const settings = getSettings();
      if (qualitySlider) {
        qualitySlider.value = settings.defaultQuality.toString();
        if (qualityValue)
          qualityValue.textContent = settings.defaultQuality.toString();
      }
    };
    reader.readAsDataURL(file);
  }
}
