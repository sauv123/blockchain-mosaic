import re

with open('display/quest.js', 'r', encoding='utf-8') as f:
    js = f.read()

# Make sure Gallery Mode doesn't completely hide the header in VR, and keep it accessible
gallery_old = "if (header) gsap.to(header, { opacity: 0.1, y: -20, duration: 0.8, ease: 'power3.out' });"
gallery_new = "if (header) gsap.to(header, { opacity: isVRActive ? 0.9 : 0.1, y: 0, duration: 0.8, ease: 'power3.out' });"
js = js.replace(gallery_old, gallery_new)

# Make the Header scale up and sit lower in VR so it's in their face, not high up
css_old = ".app-header { background: rgba(8, 9, 12, 0.2) !important; border-bottom: 1px solid rgba(0, 255, 136, 0.1) !important; }"
css_new = """.app-header { 
        background: rgba(8, 9, 12, 0.85) !important; 
        border-bottom: 2px solid #00ff88 !important; 
        transform: scale(1.2) translateY(20px) !important;
        transform-origin: top center;
        z-index: 999999 !important;
      }
      
      /* Make sure the Archive Drawer is front and center in VR, not off to the side */
      .archive-drawer {
        width: 600px !important;
        left: 50% !important;
        transform: translateX(-50%) translateY(100%) !important;
        transition: transform 0.4s ease !important;
        bottom: 0 !important;
        top: auto !important;
        border-top: 2px solid #00ff88 !important;
        border-left: 2px solid #00ff88 !important;
        border-right: 2px solid #00ff88 !important;
      }
      .archive-drawer.open {
        transform: translateX(-50%) translateY(0) !important;
      }
      
      /* Make the Settings sidebar pop out on the left in VR */
      #details-sidebar {
        width: 400px !important;
        left: 0 !important;
        right: auto !important;
        transform: translateX(-100%) !important;
        border-right: 2px solid #00ff88 !important;
      }
      #details-sidebar.open {
        transform: translateX(0) !important;
      }"""
js = js.replace(css_old, css_new)

with open('display/quest.js', 'w', encoding='utf-8') as f:
    f.write(js)

print("Patched VR Menus!")
