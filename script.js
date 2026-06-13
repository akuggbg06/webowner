// ============================================
// TOMBOL NAVIGASI
// ============================================

// Tombol Jasgen -> /Chat
document.getElementById('btnJasgen').addEventListener('click', function() {
    window.location.href = '/Chat';
});

// Tombol Chat Zexzo -> /Chat  
document.getElementById('btnChat').addEventListener('click', function() {
    window.location.href = '/Chat';
});

// Tombol Sosial Media -> /Sosial-Media
document.getElementById('btnSosmed').addEventListener('click', function() {
    window.location.href = '/Sosial-Media';
});


// ============================================
// EDIT LINK SOSIAL MEDIA DI SINI!
// Ganti link yang ada (#) dengan link asli kamu
// ============================================

// Telegram
document.getElementById('teleLink').href = 'https://t.me/zexzo_example';
// Ganti 'zexzo_example' dengan username Telegram asli kamu
// Contoh: 'https://t.me/usernamekamu'


// TikTok
document.getElementById('tiktokLink').href = 'https://tiktok.com/@zexzo_example';
// Ganti 'zexzo_example' dengan username TikTok asli kamu
// Contoh: 'https://tiktok.com/@usernamekamu'


// ============================================
// CARA TAMBAH SOSIAL MEDIA BARU:
// 
// 1. Buka file index.html
// 2. Cari <div class="sosmed-grid" id="sosmedGrid">
// 3. Tambah baris ini:
//    <a href="#" id="igLink" class="sosmed-item">📷 Instagram</a>
// 4. Buka file ini (script.js)
// 5. Tambah baris ini:
//    document.getElementById('igLink').href = 'https://instagram.com/usernamekamu';
// ============================================


// Animasi tambahan: efek klik semua tombol
const allButtons = document.querySelectorAll('.btn, .sosmed-item');
allButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        // Efek ripple
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.width = '100px';
        ripple.style.height = '100px';
        ripple.style.backgroundColor = 'rgba(255,255,255,0.3)';
        ripple.style.borderRadius = '50%';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.5s ease-out';
        ripple.style.pointerEvents = 'none';
        
        const rect = this.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        ripple.style.left = x - 50 + 'px';
        ripple.style.top = y - 50 + 'px';
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 500);
    });
});

// Tambah style untuk animasi ripple
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Console friendly
console.log('🚀 Zexzo Web siap! Edit link sosial media di script.js');
