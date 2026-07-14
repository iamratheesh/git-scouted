/**
 * Removes the background of an image URL using the client-side library `@imgly/background-removal`.
 * Runs entirely in the browser using WebAssembly.
 * Falls back to the original image URL on failure or timeout.
 */
export async function removeBackground(imageUrl: string): Promise<string> {
  if (!imageUrl) return imageUrl;

  if (typeof window === "undefined") {
    return imageUrl;
  }

  try {
    // Dynamic import to prevent SSR build issues in Next.js
    const { removeBackground: imglyRemoveBackground } = await import("@imgly/background-removal");
    
    // Process background removal directly in the browser
    const resultBlob = await imglyRemoveBackground(imageUrl, {
      progress: (key: string, current: number, total: number) => {
        console.log(`[backgroundRemoval] Downloading ${key}: ${Math.round((current / total) * 100)}%`);
      }
    });
    
    return URL.createObjectURL(resultBlob);
  } catch (error) {
    console.error("[backgroundRemoval] Browser-side background removal failed, falling back to original:", error);
    return imageUrl;
  }
}
