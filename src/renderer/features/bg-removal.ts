import { removeBackground } from "@imgly/background-removal";

export function initBgRemoval() {
  const fileInput = document.getElementById("file-input") as HTMLInputElement;
  const dropZone = document.getElementById("drop-zone") as HTMLDivElement;
  const previewContainer = document.getElementById(
    "preview-container"
  ) as HTMLDivElement;
  const originalPreview = document.getElementById(
    "original-preview"
  ) as HTMLImageElement;
  const resultPreview = document.getElementById(
    "result-preview"
  ) as HTMLImageElement;
  const processBtn = document.getElementById(
    "process-btn"
  ) as HTMLButtonElement;
  const downloadBtn = document.getElementById(
    "download-btn"
  ) as HTMLButtonElement;
  const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;
  const loadingOverlay = document.getElementById(
    "loading-overlay"
  ) as HTMLDivElement;
  const loadingText = document.getElementById(
    "loading-text"
  ) as HTMLParagraphElement;
  const removeBgApiBtn = document.getElementById(
    "remove-bg-api-btn"
  ) as HTMLButtonElement;

  let selectedFile: File | null = null;
  let processedBlob: Blob | null = null;

  if (
    !fileInput ||
    !dropZone ||
    !previewContainer ||
    !originalPreview ||
    !resultPreview ||
    !processBtn ||
    !downloadBtn ||
    !resetBtn ||
    !loadingOverlay ||
    !loadingText ||
    !removeBgApiBtn
  ) {
    console.error("Background removal elements not found");
    return;
  }

  // Handle file selection
  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dropZone.classList.add("active");
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("active");
  });

  dropZone.addEventListener("dragleave", (e) => {
    // Only remove active class if we're actually leaving the drop zone
    // relatedTarget will be null when leaving the window entirely
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !dropZone.contains(relatedTarget)) {
      dropZone.classList.remove("active");
    }
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("active");
    if (e.dataTransfer?.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files?.length) {
      handleFile(fileInput.files[0]);
    }
  });

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      originalPreview.src = e.target?.result as string;
      previewContainer.classList.remove("hidden");
      dropZone.classList.add("hidden");
      resultPreview.src = "";
      downloadBtn.classList.add("hidden");
      removeBgApiBtn.classList.add("hidden");
    };
    reader.readAsDataURL(file);
  }

  // Handle processing
  processBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    try {
      loadingOverlay.classList.remove("hidden");
      processBtn.disabled = true;
      loadingText.textContent = "Removing background (High Quality)...";

      processedBlob = await removeBackground(selectedFile, {
        model: "isnet",
        output: {
          format: "image/png",
          type: "foreground",
        },
      } as any);

      const url = URL.createObjectURL(processedBlob);
      resultPreview.src = url;
      downloadBtn.classList.remove("hidden");
      removeBgApiBtn.classList.remove("hidden");
    } catch (error) {
      console.error("Background removal failed:", error);
      alert("Failed to remove background. Please try again.");
    } finally {
      loadingOverlay.classList.add("hidden");
      processBtn.disabled = false;
    }
  });

  // Handle remove.bg API processing
  removeBgApiBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    try {
      loadingOverlay.classList.remove("hidden");
      processBtn.disabled = true;
      removeBgApiBtn.disabled = true;
      loadingText.textContent = "Removing background (remove.bg API)...";

      const arrayBuffer = await selectedFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const result = await window.electronAPI.removeBgApi(buffer);

      if (result.success && result.buffer) {
        processedBlob = new Blob([result.buffer as any], { type: "image/png" });
        const url = URL.createObjectURL(processedBlob);
        resultPreview.src = url;
        downloadBtn.classList.remove("hidden");
      } else {
        throw new Error(result.error || "API call failed");
      }
    } catch (error: any) {
      console.error("remove.bg API failed:", error);
      alert("Failed to remove background via API: " + error.message);
    } finally {
      loadingOverlay.classList.add("hidden");
      processBtn.disabled = false;
      removeBgApiBtn.disabled = false;
    }
  });

  // Handle download
  downloadBtn.addEventListener("click", async () => {
    if (!processedBlob || !selectedFile) return;

    const defaultPath = `imgpro_${selectedFile.name.split(".")[0]}_no_bg.png`;

    const savePath = await window.electronAPI.selectSavePath(defaultPath);
    if (savePath) {
      const arrayBuffer = await processedBlob.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const result = await window.electronAPI.saveFile({
        filePath: savePath,
        buffer,
      });

      if (!result.success) {
        alert("Failed to save file: " + result.error);
      }
    }
  });

  // Handle reset
  resetBtn.addEventListener("click", () => {
    selectedFile = null;
    processedBlob = null;
    fileInput.value = "";
    originalPreview.src = "";
    resultPreview.src = "";
    previewContainer.classList.add("hidden");
    dropZone.classList.remove("hidden");
    downloadBtn.classList.add("hidden");
    removeBgApiBtn.classList.add("hidden");
  });
}
