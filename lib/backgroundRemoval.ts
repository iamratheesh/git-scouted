/**
 * Removes the background of an image URL by converting it to base64,
 * posting it to the configured background-removal service, and returning
 * the processed image.
 * Falls back to the original image URL on failure or timeout.
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  if (!imageUrl) return imageUrl;

  const endpoint = getBackgroundRemovalEndpoint();
  if (!endpoint) {
    console.warn(
      "[backgroundRemoval] No background-removal endpoint is configured; returning original image."
    );
    return imageUrl;
  }

  try {
    // 1. Fetch original image as a blob with a short timeout.
    const response = await fetchWithTimeout(imageUrl, 10000);

    if (!response.ok) {
      throw new Error(`Failed to fetch original image: ${response.statusText}`);
    }

    const blob = await response.blob();

    // 2. Convert blob to base64
    const base64Image = await blobToBase64(blob);

    // 3. Post base64 image to the API with a longer timeout for cold starts.
    const apiResponse = await fetchWithTimeout(endpoint, 45000, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: base64Image })
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `API error: ${apiResponse.statusText}`);
    }

    const result = await apiResponse.json();
    if (result.image) {
      return result.image;
    }

    throw new Error("API response did not contain the processed image");
  } catch (error) {
    console.error("[backgroundRemoval] Background removal failed, falling back to original:", error);
    return imageUrl;
  }
}

function getBackgroundRemovalEndpoint(): string | null {
  const configured = process.env.NEXT_PUBLIC_BG_REMOVE_URL?.trim();
  if (configured) return configured;

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:5328/api/remove-bg";
  }

  return null;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  timeoutMs: number,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: init?.credentials ?? "omit",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Converts a Blob to a data URL base64 string.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert blob to base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
