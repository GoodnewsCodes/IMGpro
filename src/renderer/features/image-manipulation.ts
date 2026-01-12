export function initImageManipulation() {
  // Edit Section Elements
  const editDropZone = document.getElementById("edit-drop-zone");
  const editFileInput = document.getElementById(
    "edit-file-input"
  ) as HTMLInputElement;
  const editPreviewContainer = document.getElementById(
    "edit-preview-container"
  );
  const editCanvas = document.getElementById(
    "edit-canvas"
  ) as HTMLCanvasElement;
  const editResultPreview = document.getElementById(
    "edit-result-preview"
  ) as HTMLImageElement;
  const editResultWrapper = document.getElementById("edit-result-wrapper");
  const editLoadingOverlay = document.getElementById("edit-loading-overlay");

  const rotateLeftBtn = document.getElementById("rotate-left-btn");
  const rotateRightBtn = document.getElementById("rotate-right-btn");
  const flipHBtn = document.getElementById("flip-h-btn");
  const flipVBtn = document.getElementById("flip-v-btn");
  const resetCropBtn = document.getElementById("reset-crop-btn");
  const applyEditBtn = document.getElementById(
    "apply-edit-btn"
  ) as HTMLButtonElement;
  const editDownloadBtn = document.getElementById(
    "edit-download-btn"
  ) as HTMLButtonElement;
  const editResetBtn = document.getElementById(
    "edit-reset-btn"
  ) as HTMLButtonElement;

  // Crop Controls
  const cropAspectRatioSelect = document.getElementById(
    "crop-aspect-ratio"
  ) as HTMLSelectElement;
  const cropShapeSelect = document.getElementById(
    "crop-shape"
  ) as HTMLSelectElement;

  // Tab Logic
  const editTabs = document.querySelectorAll(".edit-tab");
  const editContents = document.querySelectorAll(".edit-tab-content");

  editTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      editTabs.forEach((t) => t.classList.remove("active"));
      // Add active class to clicked tab
      tab.classList.add("active");

      // Hide all contents
      editContents.forEach((c) => c.classList.add("hidden"));

      // Show target content
      const targetId = tab.getAttribute("data-edit-tab");
      const targetContent = document.getElementById(`edit-content-${targetId}`);
      if (targetContent) {
        targetContent.classList.remove("hidden");
      }
    });
  });

  if (!editDropZone || !editFileInput || !editCanvas || !applyEditBtn) return;

  let currentFile: File | null = null;
  let originalImage: HTMLImageElement | null = null;
  let editBuffer: Uint8Array | null = null;

  // Crop State
  let isCropping = false;
  let cropStart = { x: 0, y: 0 };
  let cropEnd = { x: 0, y: 0 };
  let cropRect = { left: 0, top: 0, width: 0, height: 0 };
  let rotation = 0;
  let flipH = false;
  let flipV = false;
  let cropAspectRatio = "free"; // 'free' or '1:1'
  let cropShape = "rect"; // 'rect' or 'round'
  let isDraggingCrop = false;
  let dragOffset = { x: 0, y: 0 };

  // --- Edit Section Logic ---

  editDropZone?.addEventListener("click", () => editFileInput.click());

  editDropZone?.addEventListener("dragenter", (e) => {
    e.preventDefault();
    editDropZone.classList.add("drag-over");
  });

  editDropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    editDropZone.classList.add("drag-over");
  });

  editDropZone?.addEventListener("dragleave", (e) => {
    // Only remove drag-over class if we're actually leaving the drop zone
    const relatedTarget = e.relatedTarget as Node | null;
    if (!relatedTarget || !editDropZone.contains(relatedTarget)) {
      editDropZone.classList.remove("drag-over");
    }
  });

  editDropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    editDropZone.classList.remove("drag-over");
    if (e.dataTransfer?.files.length) handleEditFile(e.dataTransfer.files[0]);
  });
  editFileInput.addEventListener("change", () => {
    if (editFileInput.files?.length) handleEditFile(editFileInput.files[0]);
  });

  function handleEditFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        resetEditState();
        renderEditCanvas();
        editPreviewContainer?.classList.remove("hidden");
        editDropZone?.classList.add("hidden");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function resetEditState() {
    rotation = 0;
    flipH = false;
    flipV = false;
    cropRect = { left: 0, top: 0, width: 0, height: 0 };
    isCropping = false;
    cropAspectRatio = "free";
    cropShape = "rect";

    if (cropAspectRatioSelect) cropAspectRatioSelect.value = "free";
    if (cropShapeSelect) cropShapeSelect.value = "rect";

    editResultWrapper?.classList.add("hidden");
    editDownloadBtn?.classList.add("hidden");
    editResultPreview.src = "";
    editBuffer = null;
  }

  function renderEditCanvas() {
    if (!originalImage || !editCanvas) return;
    const ctx = editCanvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size based on rotation
    const isVertical = (rotation / 90) % 2 !== 0;
    const displayWidth = isVertical
      ? originalImage.height
      : originalImage.width;
    const displayHeight = isVertical
      ? originalImage.width
      : originalImage.height;

    // Scale down for display if too large
    const maxDisplay = 800;
    let scale = 1;
    if (displayWidth > maxDisplay || displayHeight > maxDisplay) {
      scale = Math.min(maxDisplay / displayWidth, maxDisplay / displayHeight);
    }

    editCanvas.width = displayWidth * scale;
    editCanvas.height = displayHeight * scale;

    ctx.save();
    ctx.translate(editCanvas.width / 2, editCanvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const drawW = originalImage.width * scale;
    const drawH = originalImage.height * scale;
    ctx.drawImage(originalImage, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw crop rectangle if exists
    if (cropRect.width > 0 && cropRect.height > 0) {
      ctx.strokeStyle = "var(--primary)";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      if (cropShape === "round") {
        ctx.beginPath();
        ctx.ellipse(
          cropRect.left + cropRect.width / 2,
          cropRect.top + cropRect.height / 2,
          cropRect.width / 2,
          cropRect.height / 2,
          0,
          0,
          2 * Math.PI
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(
          cropRect.left,
          cropRect.top,
          cropRect.width,
          cropRect.height
        );
      }

      // Overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

      // We need to draw the overlay around the selection.
      // Easiest way is to draw full semi-transparent rect and clear the selection part?
      // But clearing with 'destination-out' might clear the image too if not careful with layers.
      // Better: Path based clipping.

      ctx.beginPath();
      ctx.rect(0, 0, editCanvas.width, editCanvas.height);
      if (cropShape === "round") {
        ctx.arc(
          cropRect.left + cropRect.width / 2,
          cropRect.top + cropRect.height / 2,
          cropRect.width / 2,
          0,
          2 * Math.PI,
          true
        );
      } else {
        ctx.rect(cropRect.left, cropRect.top, cropRect.width, cropRect.height);
      }
      // Use even-odd rule to create hole
      ctx.fill("evenodd");
    }
  }

  // Rotation & Flip
  rotateLeftBtn?.addEventListener("click", () => {
    rotation = (rotation - 90) % 360;
    cropRect = { left: 0, top: 0, width: 0, height: 0 };
    renderEditCanvas();
  });
  rotateRightBtn?.addEventListener("click", () => {
    rotation = (rotation + 90) % 360;
    cropRect = { left: 0, top: 0, width: 0, height: 0 };
    renderEditCanvas();
  });
  flipHBtn?.addEventListener("click", () => {
    flipH = !flipH;
    renderEditCanvas();
  });
  flipVBtn?.addEventListener("click", () => {
    flipV = !flipV;
    renderEditCanvas();
  });
  resetCropBtn?.addEventListener("click", () => {
    cropRect = { left: 0, top: 0, width: 0, height: 0 };
    renderEditCanvas();
  });

  // Crop Controls Listeners
  cropAspectRatioSelect?.addEventListener("change", () => {
    cropAspectRatio = cropAspectRatioSelect.value;
    // If we switch to 1:1, we might want to adjust current crop if it exists
    if (cropAspectRatio === "1:1" && cropRect.width > 0) {
      const size = Math.min(cropRect.width, cropRect.height);
      cropRect.width = size;
      cropRect.height = size;
      renderEditCanvas();
    }
  });

  cropShapeSelect?.addEventListener("change", () => {
    cropShape = cropShapeSelect.value;
    if (cropShape === "round") {
      // Round implies 1:1 usually, let's force it or at least set the dropdown
      cropAspectRatioSelect.value = "1:1";
      cropAspectRatio = "1:1";

      if (cropRect.width > 0) {
        const size = Math.min(cropRect.width, cropRect.height);
        cropRect.width = size;
        cropRect.height = size;
      }
    }
    renderEditCanvas();
  });

  // Mouse events for cropping
  editCanvas.addEventListener("mousedown", (e) => {
    if (!originalImage) return;
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const scaleY = editCanvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Check if inside existing crop rect
    if (
      cropRect.width > 0 &&
      cropRect.height > 0 &&
      mouseX >= cropRect.left &&
      mouseX <= cropRect.left + cropRect.width &&
      mouseY >= cropRect.top &&
      mouseY <= cropRect.top + cropRect.height
    ) {
      isDraggingCrop = true;
      dragOffset.x = mouseX - cropRect.left;
      dragOffset.y = mouseY - cropRect.top;
      editCanvas.style.cursor = "move";
    } else {
      // If clicking outside, we might want to clear the crop if it's just a click
      // but for now, we start a new crop.
      // We'll check in mouseup if it was just a click.
      cropStart.x = mouseX;
      cropStart.y = mouseY;
      isCropping = true;
      editCanvas.style.cursor = "crosshair";
    }
  });

  window.addEventListener("mousemove", (e) => {
    if ((!isCropping && !isDraggingCrop) || !editCanvas) return;
    const rect = editCanvas.getBoundingClientRect();
    const scaleX = editCanvas.width / rect.width;
    const scaleY = editCanvas.height / rect.height;

    // Calculate current mouse position relative to canvas (internal coordinates)
    let currentX = Math.max(
      0,
      Math.min((e.clientX - rect.left) * scaleX, editCanvas.width)
    );
    let currentY = Math.max(
      0,
      Math.min((e.clientY - rect.top) * scaleY, editCanvas.height)
    );

    if (isDraggingCrop) {
      let newLeft = currentX - dragOffset.x;
      let newTop = currentY - dragOffset.y;

      // Clamp to canvas bounds
      newLeft = Math.max(
        0,
        Math.min(newLeft, editCanvas.width - cropRect.width)
      );
      newTop = Math.max(
        0,
        Math.min(newTop, editCanvas.height - cropRect.height)
      );

      cropRect.left = newLeft;
      cropRect.top = newTop;
      renderEditCanvas();
      return;
    }

    if (isCropping) {
      let width = currentX - cropStart.x;
      let height = currentY - cropStart.y;

      if (cropAspectRatio === "1:1") {
        const size = Math.min(Math.abs(width), Math.abs(height));
        width = width < 0 ? -size : size;
        height = height < 0 ? -size : size;
      }

      cropRect = {
        left: width < 0 ? cropStart.x + width : cropStart.x,
        top: height < 0 ? cropStart.y + height : cropStart.y,
        width: Math.abs(width),
        height: Math.abs(height),
      };
      renderEditCanvas();
    }
  });

  window.addEventListener("mouseup", (e) => {
    if (!isCropping && !isDraggingCrop) return;

    // If it was a tiny drag (just a click) outside the previous crop, clear it
    if (isCropping) {
      const rect = editCanvas.getBoundingClientRect();
      const scaleX = editCanvas.width / rect.width;
      const scaleY = editCanvas.height / rect.height;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;

      const dist = Math.sqrt(
        Math.pow(currentX - cropStart.x, 2) +
          Math.pow(currentY - cropStart.y, 2)
      );

      if (dist < 5) {
        // Just a click, clear crop
        cropRect = { left: 0, top: 0, width: 0, height: 0 };
        renderEditCanvas();
      }
    }

    isCropping = false;
    isDraggingCrop = false;
    if (editCanvas) editCanvas.style.cursor = "default";
  });

  applyEditBtn.addEventListener("click", async () => {
    if (!currentFile || !originalImage) return;
    editLoadingOverlay?.classList.remove("hidden");
    editResultWrapper?.classList.remove("hidden");
    applyEditBtn.disabled = true;

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      let crop = undefined;
      if (cropRect.width > 0 && cropRect.height > 0) {
        const isVertical = (rotation / 90) % 2 !== 0;
        const actualW = isVertical ? originalImage.height : originalImage.width;
        const actualH = isVertical ? originalImage.width : originalImage.height;
        const sX = actualW / editCanvas.width;
        const sY = actualH / editCanvas.height;

        crop = {
          left: cropRect.left * sX,
          top: cropRect.top * sY,
          width: cropRect.width * sX,
          height: cropRect.height * sY,
        };
      }

      const result = await window.electronAPI.manipulateImage({
        buffer,
        rotate: rotation !== 0 ? rotation : undefined,
        flip: flipV,
        flop: flipH,
        crop,
        round: cropShape === "round" && !!crop, // Only apply round if cropping
      });

      if (result.success && result.buffer) {
        editBuffer = result.buffer;
        const blob = new Blob([result.buffer as any], {
          type: "image/png", // Force PNG for transparency if round
        });
        editResultPreview.src = URL.createObjectURL(blob);
        editDownloadBtn.classList.remove("hidden");
      } else {
        alert("Edit failed: " + result.error);
      }
    } catch (e) {
      console.error(e);
      alert("An error occurred.");
    } finally {
      editLoadingOverlay?.classList.add("hidden");
      applyEditBtn.disabled = false;
    }
  });

  editDownloadBtn.addEventListener("click", async () => {
    if (!editBuffer || !currentFile) return;
    // If round crop, we should suggest PNG
    const isRound = cropShape === "round" && cropRect.width > 0;
    const defaultName = isRound
      ? `edited_${currentFile.name.split(".")[0]}.png`
      : `edited_${currentFile.name}`;

    const savePath = await window.electronAPI.selectSavePath(defaultName);
    if (savePath) {
      const result = await window.electronAPI.saveFile({
        filePath: savePath,
        buffer: editBuffer,
      });

      if (!result.success) {
        alert("Failed to save file: " + result.error);
      }
    }
  });

  editResetBtn?.addEventListener("click", () => {
    editPreviewContainer?.classList.add("hidden");
    editDropZone?.classList.remove("hidden");
    editFileInput.value = "";
    currentFile = null;
    originalImage = null;
    resetEditState();
  });
}
