// Spirolite Icon Generator - Pure JavaScript version
class IconGenerator {
    constructor() {
        this.svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
            <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#1A5F7A"/>
                    <stop offset="50%" stop-color="#2D9596"/>
                    <stop offset="100%" stop-color="#57C5B6"/>
                </linearGradient>
            </defs>
            
            <rect width="512" height="512" rx="96" fill="url(#gradient)"/>
            
            <g fill="white" font-family="Arial, sans-serif" font-weight="bold">
                <text x="256" y="220" font-size="140" text-anchor="middle" letter-spacing="0.05em">SL</text>
                <text x="256" y="320" font-size="40" text-anchor="middle" opacity="0.9">Spirolite</text>
                <text x="256" y="380" font-size="24" text-anchor="middle" opacity="0.7">Lung Function</text>
            </g>
            
            <!-- Wave pattern representing lung function/spirometry -->
            <path d="M100,400 Q200,350 300,400 T500,380" 
                  fill="none" 
                  stroke="white" 
                  stroke-width="8" 
                  stroke-linecap="round" 
                  stroke-opacity="0.3"/>
            
            <path d="M50,420 Q150,370 250,420 T450,400" 
                  fill="none" 
                  stroke="white" 
                  stroke-width="6" 
                  stroke-linecap="round" 
                  stroke-opacity="0.5"/>
        </svg>`;
    }

    async generateAllIcons() {
        console.log("🎨 Generating Spirolite Icons...");
        
        try {
            // Generate and save SVG
            await this.saveSVG();
            
            // Generate PNG icons
            await this.generatePNG(192, 'icon-192.png');
            await this.generatePNG(512, 'icon-512.png');
            
            // Generate favicon
            await this.generateFavicon();
            
            // Generate Apple touch icon
            await this.generateAppleTouchIcon();
            
            console.log("✅ All icons generated successfully!");
            console.log("📁 Files created:");
            console.log("  • icon.svg");
            console.log("  • icon-192.png");
            console.log("  • icon-512.png");
            console.log("  • favicon.ico");
            console.log("  • apple-touch-icon.png");
            
            return true;
        } catch (error) {
            console.error("❌ Error generating icons:", error);
            return false;
        }
    }

    async saveSVG() {
        const blob = new Blob([this.svgData], { type: 'image/svg+xml' });
        await this.downloadFile(blob, 'icon.svg');
        console.log("✅ Created: icon.svg");
    }

    async generatePNG(size, filename) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = size;
            canvas.height = size;
            
            img.onload = async () => {
                // Draw on canvas
                ctx.fillStyle = '#1A5F7A';
                ctx.fillRect(0, 0, size, size);
                
                // Calculate scale
                const scale = size / 512;
                ctx.save();
                ctx.scale(scale, scale);
                ctx.drawImage(img, 0, 0);
                ctx.restore();
                
                // Convert to PNG and download
                canvas.toBlob(async (blob) => {
                    await this.downloadFile(blob, filename);
                    console.log(`✅ Created: ${filename} (${size}x${size})`);
                    resolve();
                }, 'image/png');
            };
            
            img.onerror = reject;
            img.src = 'data:image/svg+xml;base64,' + btoa(this.svgData);
        });
    }

    async generateFavicon() {
        // Create 16x16 icon
        const canvas16 = document.createElement('canvas');
        canvas16.width = 16;
        canvas16.height = 16;
        const ctx16 = canvas16.getContext('2d');
        
        // Draw 16x16 icon
        ctx16.fillStyle = '#1A5F7A';
        ctx16.fillRect(0, 0, 16, 16);
        ctx16.fillStyle = '#FFFFFF';
        ctx16.font = 'bold 10px Arial';
        ctx16.textAlign = 'center';
        ctx16.textBaseline = 'middle';
        ctx16.fillText('S', 8, 8);
        
        // Create 32x32 icon
        const canvas32 = document.createElement('canvas');
        canvas32.width = 32;
        canvas32.height = 32;
        const ctx32 = canvas32.getContext('2d');
        
        // Draw 32x32 icon
        ctx32.fillStyle = '#1A5F7A';
        ctx32.fillRect(0, 0, 32, 32);
        ctx32.fillStyle = '#FFFFFF';
        ctx32.font = 'bold 18px Arial';
        ctx32.textAlign = 'center';
        ctx32.textBaseline = 'middle';
        ctx32.fillText('SL', 16, 16);
        
        // For ICO format, we need to use a library or create multi-image ICO manually
        // Since creating ICO in JS is complex, we'll create separate PNG files instead
        await this.downloadCanvas(canvas16, 'favicon-16.png');
        await this.downloadCanvas(canvas32, 'favicon-32.png');
        
        console.log("✅ Created: favicon-16.png (16x16)");
        console.log("✅ Created: favicon-32.png (32x32)");
    }

    async generateAppleTouchIcon() {
        const size = 180;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Draw rounded rectangle background
        ctx.fillStyle = '#1A5F7A';
        this.drawRoundedRect(ctx, 0, 0, size, size, 36);
        
        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SL', size/2, size/2);
        
        await this.downloadCanvas(canvas, 'apple-touch-icon.png');
        console.log("✅ Created: apple-touch-icon.png (180x180)");
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    async downloadCanvas(canvas, filename) {
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                await this.downloadFile(blob, filename);
                resolve();
            }, 'image/png');
        });
    }

    async downloadFile(blob, filename) {
        return new Promise((resolve) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
            }, 100);
        });
    }
}

// Usage
if (typeof window !== 'undefined') {
    window.generateSpiroliteIcons = async function() {
        const generator = new IconGenerator();
        return await generator.generateAllIcons();
    };
    
    console.log("🎨 Spirolite Icon Generator loaded!");
    console.log("Run 'generateSpiroliteIcons()' in the console to generate icons.");
}
