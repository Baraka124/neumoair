// Add this to your main script
async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.log('Service workers not supported');
        return;
    }
    
    try {
        // Use relative path
        const registration = await navigator.serviceWorker.register('./sw.js', {
            scope: './'
        });
        
        console.log('SW registered:', registration.scope);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('New SW found:', newWorker.state);
            
            newWorker.addEventListener('statechange', () => {
                console.log('New SW state:', newWorker.state);
            });
        });
        
        return registration;
    } catch (error) {
        console.error('SW registration failed:', error);
    }
}

// Register on load
window.addEventListener('load', () => {
    registerServiceWorker();
});

// Handle beforeinstallprompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    console.log('🎯 PWA Install Prompt Available!');
    
    // Prevent Chrome 67 and earlier from automatically showing prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show your own install button
    showCustomInstallButton();
    
    // Optional: Log the platforms available
    console.log('Available platforms:', e.platforms);
});

function showCustomInstallButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('pwa-install-btn');
    if (existingBtn) existingBtn.remove();
    
    // Create install button
    const installBtn = document.createElement('button');
    installBtn.id = 'pwa-install-btn';
    installBtn.innerHTML = `
        <span style="font-size: 1.2em; margin-right: 8px;">📱</span>
        Install PulmoMetrics Pro
    `;
    
    // Style the button professionally
    installBtn.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: linear-gradient(135deg, #1A5F7A, #2D9596);
        color: white;
        border: none;
        padding: 14px 24px;
        border-radius: 30px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 6px 20px rgba(26, 95, 122, 0.4);
        z-index: 10000;
        display: flex;
        align-items: center;
        transition: all 0.3s ease;
        animation: pulse 2s infinite;
    `;
    
    // Add hover effects
    installBtn.onmouseenter = () => {
        installBtn.style.transform = 'translateY(-2px)';
        installBtn.style.boxShadow = '0 8px 25px rgba(26, 95, 122, 0.5)';
    };
    
    installBtn.onmouseleave = () => {
        installBtn.style.transform = 'translateY(0)';
        installBtn.style.boxShadow = '0 6px 20px rgba(26, 95, 122, 0.4)';
    };
    
    // Handle click
    installBtn.onclick = async () => {
        if (!deferredPrompt) return;
        
        // Show the install prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond
        const { outcome } = await deferredPrompt.userChoice;
        
        console.log(`User response: ${outcome}`);
        
        // Clear the saved prompt
        deferredPrompt = null;
        
        // Hide the button
        installBtn.style.display = 'none';
    };
    
    // Add to page
    document.body.appendChild(installBtn);
    
    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 6px 20px rgba(26, 95, 122, 0.4); }
            50% { box-shadow: 0 6px 30px rgba(26, 95, 122, 0.6); }
            100% { box-shadow: 0 6px 20px rgba(26, 95, 122, 0.4); }
        }
    `;
    document.head.appendChild(style);
}

// Check if already installed
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('Already installed as PWA');
}

// Listen for app installed event
window.addEventListener('appinstalled', (evt) => {
    console.log('PWA was installed successfully!');
    
    // Hide install button
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) installBtn.style.display = 'none';
    
    // Send analytics or show welcome message
    showToast('PulmoMetrics Pro installed successfully!', 'success');
});
