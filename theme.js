// ========================================================
// ระบบโหมดกลางวัน / กลางคืน (Unified Demo Dark Mode)
// ========================================================
(function () {
    function parseRgb(str) {
        if (!str) return null;
        const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!m) return null;
        return {
            r: Number(m[1]),
            g: Number(m[2]),
            b: Number(m[3]),
            a: m[4] !== undefined ? Number(m[4]) : 1
        };
    }

    function isWhiteSurface(bg) {
        return bg && bg.a > 0.35 && bg.r > 210 && bg.g > 210 && bg.b > 210;
    }

    function insideColoredBadge(el) {
        let cur = el;
        while (cur && cur !== document.body) {
            if (cur.hasAttribute("data-dm-card") || cur.hasAttribute("data-dm-sub") || cur.hasAttribute("data-dm-btn")) {
                return false;
            }
            const bg = parseRgb(window.getComputedStyle(cur).backgroundColor);
            if (bg && bg.a > 0.35 && !isWhiteSurface(bg)) {
                return true; // ป้ายสถานะที่มีสีสัน (เหลือง/เขียว/ฟ้า/ส้ม/แดง) คงสีตัวอักษรเดิมไว้
            }
            cur = cur.parentElement;
        }
        return false;
    }

    function applyDarkAttributes() {
        if (!document.body || !document.body.classList.contains("dark-mode")) return;

        document.body.querySelectorAll("*").forEach((el) => {
            if (
                el.id === "themeToggleBtn" ||
                el.closest(".leaflet-container") ||
                ["SCRIPT", "STYLE", "LINK", "META", "IMG", "SVG", "PATH", "BR", "HR"].includes(el.tagName)
            ) {
                return;
            }

            const style = window.getComputedStyle(el);
            const bg = parseRgb(style.backgroundColor);

            // เปลี่ยนเฉพาะกล่องพื้นหลังสีขาว/เทาอ่อน (ไม่แตะกล่องโปร่งใสหลังหัวข้อ)
            if (isWhiteSurface(bg) && !["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) {
                if (el.tagName === "BUTTON" || el.getAttribute("role") === "button") {
                    el.setAttribute("data-dm-btn", "true");
                } else if (el.parentElement && el.parentElement.closest("[data-dm-card]")) {
                    el.setAttribute("data-dm-sub", "true");
                } else {
                    el.setAttribute("data-dm-card", "true");
                }
            }

            // ปรับตัวอักษรสีเข้มให้สว่าง (ยกเว้นข้อความบนป้ายสถานะสีต่างๆ)
            const fg = parseRgb(style.color);
            if (fg && fg.a > 0.2 && fg.r < 130 && fg.g < 130 && fg.b < 130 && !insideColoredBadge(el)) {
                el.setAttribute("data-dm-text", (fg.r < 60 && fg.g < 60 && fg.b < 60) ? "main" : "muted");
            }
        });
    }

    function updateButtonLabel() {
        const btn = document.getElementById("themeToggleBtn");
        if (!btn) return;
        const isDark = document.body.classList.contains("dark-mode");
        btn.innerHTML = isDark ? "🌙 โหมดกลางคืน" : "☀️ โหมดกลางวัน";
    }

    function syncTheme() {
        const isDark = (localStorage.getItem("village_theme") || "light") === "dark";
        document.body.classList.toggle("dark-mode", isDark);
        updateButtonLabel();
        if (isDark) applyDarkAttributes();
    }

    window.toggleThemeMode = function () {
        const isDark = document.body.classList.toggle("dark-mode");
        localStorage.setItem("village_theme", isDark ? "dark" : "light");
        updateButtonLabel();
        if (isDark) applyDarkAttributes();
    };

    document.addEventListener("DOMContentLoaded", function () {
        document.querySelectorAll("#themeToggleBtn").forEach((b) => b.remove());

        const btn = document.createElement("button");
        btn.id = "themeToggleBtn";
        btn.type = "button";
        btn.className = "floating-theme-btn";
        btn.onclick = window.toggleThemeMode;
        document.body.appendChild(btn);

        syncTheme();

        let timer = null;
        new MutationObserver(() => {
            if (!document.body.classList.contains("dark-mode")) return;
            clearTimeout(timer);
            timer = setTimeout(applyDarkAttributes, 40);
        }).observe(document.body, { childList: true, subtree: true });
    });
})();