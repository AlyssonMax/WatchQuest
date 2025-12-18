
/**
 * Compresses an image file to a smaller JPG Base64 string.
 * This is crucial for localStorage which has a ~5MB limit.
 */
export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Resize to max 800px width/height to save space
                const MAX_SIZE = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context not available"));
                    return;
                }
                
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG with 0.7 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Processes a PNG specifically for Patches/Badges.
 * Preserves transparency but resizes to be small (icon size).
 */
export const processPatchImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (file.type !== 'image/png') {
            reject(new Error("Only PNG files are allowed for patches (to preserve transparency)."));
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Icons are small, limit to 256px
                const MAX_SIZE = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context not available"));
                    return;
                }
                
                // Draw image preserving transparency
                ctx.drawImage(img, 0, 0, width, height);
                
                // Export as PNG to keep transparency
                const compressedBase64 = canvas.toDataURL('image/png');
                resolve(compressedBase64);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};