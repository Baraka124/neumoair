// PWA Install Prompt Handler
class PWAInstallHandler {
  constructor() {
    this.deferredPrompt = null;
    this.installButton = null;
    this.isInstalled = false;
    
    this.init();
  }
  
  init() {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone ||
        document.referrer.includes('android-app://')) {
      this.isInstalled = true;
      console.log('PWA already installed');
      return;
    }
    
    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });
    
    // Check if app was successfully installed
    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showInstallSuccess();
    });
    
    // Create install button
    this.createInstallButton();
  }
  
  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'pwa-install-button';
    button.innerHTML = `
      <span>📲</span>
      <span>Install App</span>
    `;
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: linear-gradient(135deg, #1A5F7A, #2D9596);
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 24px;
      font-weight: 600;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(26, 95, 122, 0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 9999;
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s ease;
    `;
    
    button.onclick = () => this.showInstallPrompt();
    
    document.body.appendChild(button);
    this.installButton = button;
    
    // Check if we should show button after a delay
    setTimeout(() => {
      if (this.deferredPrompt && !this.isInstalled) {
        this.showInstallButton();
      }
    }, 3000);
  }
  
  showInstallButton() {
    if (this.installButton && this.deferredPrompt) {
      this.installButton.style.opacity = '1';
      this.installButton.style.transform = 'translateY(0)';
    }
  }
  
  hideInstallButton() {
    if (this.installButton) {
      this.installButton.style.opacity = '0';
      this.installButton.style.transform = 'translateY(20px)';
      setTimeout(() => {
        if (this.installButton.parentNode) {
          this.installButton.parentNode.removeChild(this.installButton);
        }
      }, 300);
    }
  }
  
  async showInstallPrompt() {
    if (!this.deferredPrompt) return;
    
    this.deferredPrompt.prompt();
    
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    this.deferredPrompt = null;
    this.hideInstallButton();
  }
  
  showInstallSuccess() {
    // Show success message
    const toast = document.createElement('div');
    toast.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #059669;
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(5, 150, 105, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
      ">
        <strong>✅ Spirolite Installed!</strong><br>
        <small>App is now available from your home screen</small>
      </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }
  
  // Manual trigger for install
  static triggerInstall() {
    if (window.pwaInstallHandler) {
      window.pwaInstallHandler.showInstallPrompt();
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pwaInstallHandler = new PWAInstallHandler();
});

// Export for manual control
window.PWAInstallHandler = PWAInstallHandler;
