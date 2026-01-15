import { getSettings } from "./settings";
import JSZip from "jszip";

interface ProcessedFile {
  file: File;
  id: string;
  status: "pending" | "processing" | "success" | "error";
  resultBlob?: Blob;
  resultFormat?: string;
  error?: string;
}

export function initImageConversion() {
  const dropZone = document.getElementById("conv-drop-zone");
  const fileInput = document.getElementById(
    "conv-file-input"
  ) as HTMLInputElement;
  const previewContainer = document.getElementById("conv-preview-container");
  const fileListContainer = document.getElementById(
    "conv-file-list"
  ) as HTMLDivElement;
  const processBtn = document.getElementById(
    "conv-process-btn"
  ) as HTMLButtonElement;
  const downloadBtn = document.getElementById(
    "conv-download-btn"
  ) as HTMLButtonElement;
  const resetBtn = document.getElementById(
    "conv-reset-btn"
  ) as HTMLButtonElement;
  const batchSummary = document.getElementById(
    "conv-batch-summary"
  ) as HTMLDivElement;

  if (!dropZone || !fileInput || !processBtn) return;

  const formatSelect = document.getElementById(
    "format-select"
  ) as HTMLSelectElement;
  const qualitySlider = document.getElementById(
    "quality-slider"
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
      file.type.startsWith("image/")
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
      (f) => f.status === "pending" || f.status === "error"
    );
    const hasSuccess = files.some((f) => f.status === "success");

    processBtn.disabled = !hasPending;
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
      (f) => f.status === "pending" || f.status === "error"
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
      (f) => f.status === "success" && f.resultBlob
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
