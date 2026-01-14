 // 1. Device Detection & Download Logic
        function handleDownload() {
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // Mobile Alert
                alert("YT-Ripper is a powerful Windows desktop application. \n\nPlease visit this site on your computer to download!");
            } else {
                // Desktop Download
                const link = "https://github.com/DevHarshx/YT-Ripper/releases/download/v1.0.1/YT-Ripper.exe";
                window.location.href = link;
                showToast();
            }
        }

        // 2. Toast Notification
        function showToast() {
            const toast = document.getElementById('toast');
            toast.classList.add('active');
            setTimeout(() => {
                toast.classList.remove('active');
            }, 5000);
        }

        // 3. 3D Tilt Effect for Hero Image
        const tiltWrapper = document.getElementById('tilt-wrapper');
        const tiltCard = document.getElementById('tilt-card');

        if (window.matchMedia("(pointer: fine)").matches) { // Only on mouse devices
            document.addEventListener('mousemove', (e) => {
                const x = (window.innerWidth / 2 - e.pageX) / 30;
                const y = (window.innerHeight / 2 - e.pageY) / 30;
                
                // Limit the tilt so it doesn't go crazy
                const clampedX = Math.max(-15, Math.min(15, x));
                const clampedY = Math.max(-15, Math.min(15, y));

                // Apply to hero card
                tiltCard.style.transform = `rotateY(${clampedX}deg) rotateX(${clampedY}deg)`;
            });
        }

        // 4. Code Block Typing Animation (Intersection Observer)
        const codeBlock = document.getElementById('code-block');
        const codeLines = document.querySelectorAll('.code-line');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    codeLines.forEach((line, index) => {
                        setTimeout(() => {
                            line.classList.add('visible');
                        }, index * 200); // Staggered reveal
                    });
                }
            });
        }, { threshold: 0.5 });

        observer.observe(codeBlock);

        // 5. Navbar Frosted Glass effect enhancement
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if (window.scrollY > 50) {
                nav.style.background = 'rgba(3, 3, 4, 0.85)';
                nav.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            } else {
                nav.style.background = 'rgba(3, 3, 4, 0.6)';
                nav.style.boxShadow = 'none';
            }
        });