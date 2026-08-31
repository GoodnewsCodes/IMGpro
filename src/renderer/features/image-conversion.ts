import { getSettings } from "./settings";
import JSZip from "jszip";
import { GifEncoder } from "./gif-encoder";

interface ProcessedFile {
  file: File;
  id: string;
  status: "pending" | "processing" | "success" | "error";
  resultBlob?: Blob;
  resultFormat?: string;
  error?: string;
}

export function initImageConversion() {
  initSubTabs();
  initImageConversionSubTab();
  initVideoToGifSubTab();
}

/**
 * Sub-tab switching between Image Conversion and Video to GIF
 */
function initSubTabs() {
  const subTabBtns = document.querySelectorAll(".sub-tab-btn");
  const subTabPanes = document.querySelectorAll(".subtab-pane");

  subTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetSubtab = (btn as HTMLElement).dataset.subtab;
      if (!targetSubtab) return;

      subTabBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      subTabPanes.forEach((pane) => {
        if (pane.id === `subtab-${targetSubtab}`) {
          pane.classList.remove("hidden");
        } else {
          pane.classList.add("hidden");
        }
      });
    });
  });
}

/**
 * Image Conversion Logic (Multi-format batch conversion)
 */
function initImageConversionSubTab() {
  const dropZone = document.getElementById("conv-drop-zone");
  const fileInput = document.getElementById(
    "conv-file-input",
  ) as HTMLInputElement;
  const previewContainer = document.getElementById("conv-preview-container");
  const fileListContainer = document.getElementById(
    "conv-file-list",
  ) as HTMLDivElement;
  const processBtn = document.getElementById(
    "conv-process-btn",
  ) as HTMLButtonElement;
  const downloadBtn = document.getElementById(
    "conv-download-btn",
  ) as HTMLButtonElement;
  const resetBtn = document.getElementById(
    "conv-reset-btn",
  ) as HTMLButtonElement;
  const batchSummary = document.getElementById(
    "conv-batch-summary",
  ) as HTMLDivElement;

  if (!dropZone || !fileInput || !processBtn) return;

  const formatSelect = document.getElementById(
    "format-select",
  ) as HTMLSelectElement;
  const qualitySlider = document.getElementById(
    "quality-slider",
  ) as HTMLInputElement;
  const qualityValue = document.getElementById("quality-value");
  const qualityGroup = document.getElementById("quality-group");

  let files: ProcessedFile[] = [];

  // Apply default settings
  const settings = getSettings();
  if (formatSelect) formatSelect.value = settings.defaultFormat;
  if (qualitySlider) {
    qualitySlider.value = settings.defaultQuality.toString();
    if (qualityValue)
      qualityValue.textContent = settings.defaultQuality.toString();
  }

  // Trigger visibility check
  const checkQualityVisibility = () => {
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
  };
  checkQualityVisibility();

  formatSelect.addEventListener("change", checkQualityVisibility);

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
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZone.contains(relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer?.files.length) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) {
      handleFiles(Array.from(fileInput.files));
    }
  });

  function handleFiles(newFiles: File[]) {
    const imageFiles = newFiles.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (imageFiles.length === 0) {
      alert("Please select image files.");
      return;
    }

    const newProcessedFiles: ProcessedFile[] = imageFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: "pending",
    }));

    files = [...files, ...newProcessedFiles];
    updateUI();
  }

  function updateUI() {
    if (files.length > 0) {
      previewContainer?.classList.remove("hidden");
      dropZone?.classList.add("hidden");
      renderFileList();
      updateSummary();
    } else {
      previewContainer?.classList.add("hidden");
      dropZone?.classList.remove("hidden");
      fileInput.value = "";
    }
  }

  function renderFileList() {
    fileListContainer.innerHTML = "";
    files.forEach((item) => {
      const div = document.createElement("div");
      div.className = "file-item";
      div.innerHTML = `
        <img src="${URL.createObjectURL(item.file)}" class="file-preview" />
        <div class="file-info" title="${item.file.name}">${item.file.name}</div>
        <div class="file-status ${item.status}">
          ${getStatusText(item)}
        </div>
        <button class="remove-file-btn" data-id="${item.id}">×</button>
      `;

      const removeBtn = div.querySelector(".remove-file-btn");
      removeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        removeFile(item.id);
      });

      fileListContainer.appendChild(div);
    });

    const hasPending = files.some(
      (f) => f.status === "pending" || f.status === "error",
    );
    const hasSuccess = files.some((f) => f.status === "success");

    processBtn.disabled = !hasPending;

    if (files.length === 1) {
      processBtn.textContent = "Convert Image";
      downloadBtn.textContent = "Download Result";
    } else {
      processBtn.textContent = "Convert Images (All)";
      downloadBtn.textContent = "Download All (ZIP)";
    }

    if (hasSuccess) {
      downloadBtn.classList.remove("hidden");
    } else {
      downloadBtn.classList.add("hidden");
    }
  }

  function getStatusText(item: ProcessedFile) {
    switch (item.status) {
      case "pending":
        return "Pending";
      case "processing":
        return "Converting...";
      case "success":
        return "Done";
      case "error":
        return "Error";
      default:
        return "";
    }
  }

  function removeFile(id: string) {
    files = files.filter((f) => f.id !== id);
    updateUI();
  }

  function updateSummary() {
    if (batchSummary) {
      const total = files.length;
      const success = files.filter((f) => f.status === "success").length;
      if (total > 0) {
        batchSummary.textContent = `${success} / ${total} converted`;
        batchSummary.classList.remove("hidden");
      } else {
        batchSummary.classList.add("hidden");
      }
    }
  }

  // Process Logic
  processBtn.addEventListener("click", async () => {
    const pendingFiles = files.filter(
      (f) => f.status === "pending" || f.status === "error",
    );
    if (pendingFiles.length === 0) return;

    processBtn.disabled = true;
    resetBtn.disabled = true;

    const format = formatSelect.value;
    const quality = parseInt(qualitySlider.value);

    for (const item of pendingFiles) {
      item.status = "processing";
      renderFileList();

      try {
        const arrayBuffer = await item.file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const result = await window.electronAPI.convertImage({
          buffer,
          format,
          quality,
        });

        if (result.success && result.buffer) {
          const blob = new Blob([result.buffer as any], {
            type: `image/${format}`,
          });
          item.resultBlob = blob;
          item.resultFormat = format;
          item.status = "success";
        } else {
          throw new Error(result.error || "Conversion failed");
        }
      } catch (error: any) {
        console.error(error);
        item.status = "error";
        item.error = error.message;
      }

      renderFileList();
      updateSummary();
    }

    processBtn.disabled = false;
    resetBtn.disabled = false;
  });

  // Download Logic
  downloadBtn.addEventListener("click", async () => {
    const successFiles = files.filter(
      (f) => f.status === "success" && f.resultBlob,
    );
    if (successFiles.length === 0) return;

    if (successFiles.length === 1) {
      const item = successFiles[0];
      const originalName = item.file.name.split(".")[0];
      const defaultPath = `${originalName}_converted.${item.resultFormat}`;
      const savePath = await window.electronAPI.selectSavePath(defaultPath);
      if (savePath && item.resultBlob) {
        const arrayBuffer = await item.resultBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        await window.electronAPI.saveFile({ filePath: savePath, buffer });
      }
    } else {
      const zip = new JSZip();
      const folder = zip.folder("converted_images");

      successFiles.forEach((item) => {
        if (item.resultBlob) {
          const originalName = item.file.name.split(".")[0];
          const name = `${originalName}.${item.resultFormat}`;
          folder?.file(name, item.resultBlob);
        }
      });

      const content = await zip.generateAsync({ type: "blob" });
      const defaultPath = "converted_images.zip";
      const savePath = await window.electronAPI.selectSavePath(defaultPath);

      if (savePath) {
        const arrayBuffer = await content.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        await window.electronAPI.saveFile({ filePath: savePath, buffer });
      }
    }
  });

  // Reset Logic
  resetBtn.addEventListener("click", () => {
    files = [];
    updateUI();
  });
}

/**
 * Video to GIF Conversion Sub-tab (Optimized High-Speed)
 */
function initVideoToGifSubTab() {
  const dropZone = document.getElementById("video-drop-zone");
  const fileInput = document.getElementById(
    "video-file-input",
  ) as HTMLInputElement;
  const previewContainer = document.getElementById("video-preview-container");

  const video = document.getElementById(
    "v2g-video-element",
  ) as HTMLVideoElement;
  const videoInfoBadge = document.getElementById("video-info-badge");

  const startTimeInput = document.getElementById(
    "v2g-start-time",
  ) as HTMLInputElement;
  const endTimeInput = document.getElementById(
    "v2g-end-time",
  ) as HTMLInputElement;
  const setStartBtn = document.getElementById("v2g-set-start-btn");
  const setEndBtn = document.getElementById("v2g-set-end-btn");
  const durationHint = document.getElementById("v2g-duration-hint");

  const fpsSelect = document.getElementById(
    "v2g-fps-select",
  ) as HTMLSelectElement;
  const widthSelect = document.getElementById(
    "v2g-width-select",
  ) as HTMLSelectElement;
  const customWidthGroup = document.getElementById("v2g-custom-width-group");
  const customWidthInput = document.getElementById(
    "v2g-custom-width",
  ) as HTMLInputElement;
  const qualitySelect = document.getElementById(
    "v2g-quality-select",
  ) as HTMLSelectElement;
  const loopCheckbox = document.getElementById(
    "v2g-loop-checkbox",
  ) as HTMLInputElement;

  const progressContainer = document.getElementById("v2g-progress-container");
  const progressBar = document.getElementById("v2g-progress-bar");
  const progressText = document.getElementById("v2g-progress-text");
  const progressPercent = document.getElementById("v2g-progress-percent");

  const resultContainer = document.getElementById("v2g-result-container");
  const resultImg = document.getElementById(
    "v2g-result-img",
  ) as HTMLImageElement;
  const resultMeta = document.getElementById("v2g-result-meta");

  const convertBtn = document.getElementById(
    "v2g-convert-btn",
  ) as HTMLButtonElement;
  const downloadBtn = document.getElementById(
    "v2g-download-btn",
  ) as HTMLButtonElement;
  const resetBtn = document.getElementById(
    "v2g-reset-btn",
  ) as HTMLButtonElement;

  if (!dropZone || !fileInput || !video || !convertBtn) return;

  let currentVideoFile: File | null = null;
  let videoObjectUrl: string | null = null;
  let generatedGifBlob: Blob | null = null;
  let isConverting = false;

  // Custom Width input toggle
  widthSelect.addEventListener("change", () => {
    if (widthSelect.value === "custom") {
      customWidthGroup?.classList.remove("hidden");
    } else {
      customWidthGroup?.classList.add("hidden");
    }
  });

  // Drop zone events
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", (e) => {
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZone.contains(relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer?.files.length) {
      handleVideoFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) {
      handleVideoFile(fileInput.files[0]);
    }
  });

  function handleVideoFile(file: File) {
    if (!file.type.startsWith("video/") && !/\.(mp4|webm|mov|mkv|avi|ogv)$/i.test(file.name)) {
      alert("Please select a valid video file (MP4, WebM, MOV, etc.)");
      return;
    }

    currentVideoFile = file;
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
    }
    videoObjectUrl = URL.createObjectURL(file);
    video.src = videoObjectUrl;
    video.load();

    // Reset results & progress
    generatedGifBlob = null;
    resultContainer?.classList.add("hidden");
    downloadBtn?.classList.add("hidden");
    progressContainer?.classList.add("hidden");

    dropZone?.classList.add("hidden");
    previewContainer?.classList.remove("hidden");
  }

  // Metadata loaded
  video.addEventListener("loadedmetadata", () => {
    const duration = video.duration || 0;
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;

    startTimeInput.value = "0";
    startTimeInput.max = duration.toFixed(1);

    // Default clip duration up to 5 seconds or total video length
    const initialEnd = Math.min(5, duration);
    endTimeInput.value = initialEnd.toFixed(1);
    endTimeInput.max = duration.toFixed(1);

    if (videoInfoBadge) {
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
      videoInfoBadge.textContent = `${timeStr} • ${width}x${height}`;
    }

    updateDurationHint();
  });

  function updateDurationHint() {
    const start = parseFloat(startTimeInput.value) || 0;
    const end = parseFloat(endTimeInput.value) || 0;
    const duration = Math.max(0, end - start);
    const fps = parseInt(fpsSelect.value) || 10;
    const estimatedFrames = Math.round(duration * fps);

    if (durationHint) {
      durationHint.textContent = `Clip duration: ${duration.toFixed(1)}s (Estimated frames: ${estimatedFrames})`;
    }
  }

  startTimeInput.addEventListener("input", () => {
    const val = parseFloat(startTimeInput.value) || 0;
    video.currentTime = val;
    updateDurationHint();
  });

  endTimeInput.addEventListener("input", () => {
    const val = parseFloat(endTimeInput.value) || 0;
    video.currentTime = val;
    updateDurationHint();
  });

  fpsSelect.addEventListener("change", updateDurationHint);

  setStartBtn?.addEventListener("click", () => {
    const cur = video.currentTime || 0;
    startTimeInput.value = cur.toFixed(1);
    updateDurationHint();
  });

  setEndBtn?.addEventListener("click", () => {
    const cur = video.currentTime || 0;
    endTimeInput.value = cur.toFixed(1);
    updateDurationHint();
  });

  // Fast Video to GIF conversion logic
  convertBtn.addEventListener("click", async () => {
    if (!currentVideoFile || isConverting) return;

    const start = Math.max(0, parseFloat(startTimeInput.value) || 0);
    const end = Math.min(video.duration || 9999, parseFloat(endTimeInput.value) || 0);

    if (end <= start) {
      alert("End time must be greater than start time.");
      return;
    }

    const fps = parseInt(fpsSelect.value) || 10;
    const frameInterval = 1 / fps;
    const totalDuration = end - start;
    const frameCount = Math.max(1, Math.round(totalDuration * fps));

    // Calculate target dimensions
    let targetWidth = video.videoWidth || 480;
    let targetHeight = video.videoHeight || 320;

    const widthMode = widthSelect.value;
    if (widthMode === "custom") {
      const customW = parseInt(customWidthInput.value) || 480;
      targetWidth = customW;
      targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth);
    } else if (widthMode !== "original") {
      const maxW = parseInt(widthMode);
      if (video.videoWidth > maxW) {
        targetWidth = maxW;
        targetHeight = Math.round((video.videoHeight / video.videoWidth) * targetWidth);
      }
    }

    // Ensure even dimensions
    targetWidth = Math.round(targetWidth);
    targetHeight = Math.round(targetHeight);

    const isHighQuality = qualitySelect.value === "high";
    const sampleQuality = isHighQuality ? 8 : 16;
    const dither = isHighQuality;
    const loopCount = loopCheckbox.checked ? 0 : 1;

    // Setup canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      alert("Could not initialize 2D canvas context.");
      return;
    }

    isConverting = true;
    convertBtn.disabled = true;
    resetBtn.disabled = true;
    downloadBtn.classList.add("hidden");
    resultContainer?.classList.add("hidden");
    progressContainer?.classList.remove("hidden");

    const prevMuted = video.muted;
    video.muted = true;
    video.pause();

    const gifEncoder = new GifEncoder(targetWidth, targetHeight, loopCount);
    const frameDelayMs = Math.round(1000 / fps);

    try {
      for (let i = 0; i < frameCount; i++) {
        const currentTime = Math.min(end, start + i * frameInterval);

        // Fast seek video to timestamp
        await seekVideoFast(video, currentTime);

        // Capture frame to canvas
        ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
        const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

        // Fast encode frame with 15-bit color cache & typed LZW
        gifEncoder.addFrame(imageData.data, {
          delayMs: frameDelayMs,
          dither,
          quality: sampleQuality,
        });

        // Update progress UI
        const progressPct = Math.round(((i + 1) / frameCount) * 100);
        if (progressBar) progressBar.style.width = `${progressPct}%`;
        if (progressPercent) progressPercent.textContent = `${progressPct}%`;
        if (progressText) {
          progressText.textContent = `Processing frame ${i + 1} of ${frameCount}...`;
        }

        // Brief yield every 3 frames to keep UI ultra responsive
        if (i % 3 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      if (progressText) progressText.textContent = "Finalizing GIF...";
      const gifBlob = gifEncoder.finish();
      generatedGifBlob = gifBlob;

      // Display result preview
      const gifUrl = URL.createObjectURL(gifBlob);
      resultImg.onload = () => {
        resultContainer?.classList.remove("hidden");
        downloadBtn?.classList.remove("hidden");
      };
      resultImg.src = gifUrl;
      resultContainer?.classList.remove("hidden");
      downloadBtn?.classList.remove("hidden");

      if (resultMeta) {
        const sizeFormatted = formatFileSize(gifBlob.size);
        resultMeta.textContent = `${sizeFormatted} • ${targetWidth}x${targetHeight} (${frameCount} frames)`;
      }

      if (progressText) progressText.textContent = "Completed!";
      setTimeout(() => {
        progressContainer?.classList.add("hidden");
      }, 800);
    } catch (err: any) {
      console.error("Video to GIF Conversion error:", err);
      alert("Failed to convert video to GIF: " + (err?.message || "Unknown error"));
      progressContainer?.classList.add("hidden");
    } finally {
      video.muted = prevMuted;
      isConverting = false;
      convertBtn.disabled = false;
      resetBtn.disabled = false;
    }
  });

  // Download GIF logic
  downloadBtn.addEventListener("click", async () => {
    if (!generatedGifBlob || !currentVideoFile) return;

    const baseName = currentVideoFile.name.replace(/\.[^/.]+$/, "");
    const defaultPath = `${baseName}.gif`;

    const savePath = await window.electronAPI.selectSavePath(defaultPath);
    if (savePath) {
      const arrayBuffer = await generatedGifBlob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      await window.electronAPI.saveFile({ filePath: savePath, buffer });
    }
  });

  // Reset logic
  resetBtn.addEventListener("click", () => {
    if (isConverting) return;
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      videoObjectUrl = null;
    }
    currentVideoFile = null;
    generatedGifBlob = null;
    video.removeAttribute("src");
    video.load();
    fileInput.value = "";

    previewContainer?.classList.add("hidden");
    dropZone?.classList.remove("hidden");
    resultContainer?.classList.add("hidden");
    progressContainer?.classList.add("hidden");
    downloadBtn?.classList.add("hidden");
  });
}

/**
 * Fast video seeking helper with minimal latency
 */
function seekVideoFast(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
  return new Promise((resolve) => {
    if (Math.abs(video.currentTime - timeSeconds) < 0.005) {
      resolve();
      return;
    }

    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }
    }, 200);

    const onSeeked = () => {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        video.removeEventListener("seeked", onSeeked);
        resolve();
      }
    };

    video.addEventListener("seeked", onSeeked, { once: true });

    if ("fastSeek" in video && typeof (video as any).fastSeek === "function") {
      try {
        (video as any).fastSeek(timeSeconds);
      } catch {
        video.currentTime = timeSeconds;
      }
    } else {
      video.currentTime = timeSeconds;
    }
  });
}

/**
 * Format bytes to readable size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}
