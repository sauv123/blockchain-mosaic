with open('mosaic.js', 'r', encoding='utf-8') as f:
    js = f.read()

# ===================================================================
# 1. GSAP — Hover tooltip animation (replace raw visibility toggle)
# ===================================================================
tooltip_show_old = """  hoverTooltip.style.opacity = '1';
  hoverTooltip.style.pointerEvents = 'auto';"""
tooltip_show_new = """  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf(hoverTooltip);
    gsap.to(hoverTooltip, { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' });
  } else {
    hoverTooltip.style.opacity = '1';
  }
  hoverTooltip.style.pointerEvents = 'auto';"""
js = js.replace(tooltip_show_old, tooltip_show_new)

tooltip_hide_old = """  hoverTooltip.style.opacity = '0';
  hoverTooltip.style.pointerEvents = 'none';"""
tooltip_hide_new = """  if (typeof gsap !== 'undefined') {
    gsap.killTweensOf(hoverTooltip);
    gsap.to(hoverTooltip, { opacity: 0, y: 6, duration: 0.15, ease: 'power2.in' });
  } else {
    hoverTooltip.style.opacity = '0';
  }
  hoverTooltip.style.pointerEvents = 'none';"""
js = js.replace(tooltip_hide_old, tooltip_hide_new)

# ===================================================================
# 2. GSAP — Sidebar open/close (details panel)
# ===================================================================
sidebar_open_old = """detailsSidebar.classList.add('open');
    canvasContainer.classList.add('sidebar-open');"""
sidebar_open_new = """detailsSidebar.classList.add('open');
    canvasContainer.classList.add('sidebar-open');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(detailsSidebar, { x: 320, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
    }"""
js = js.replace(sidebar_open_old, sidebar_open_new)

# ===================================================================
# 3. GSAP — Cinematic weather line entrance
# ===================================================================
weather_update_old = """weatherLine.innerHTML = `<span style="color: var(--text-primary); text-shadow: 0 10px 40px var(--bg-color), 0 2px 10px var(--bg-color), 0 0 40px var(--bg-color); font-weight: 300; font-size: 32px; letter-spacing: -0.02em; line-height: 1.4; display: inline-block; animation: fadeIn 2s ease-out;">Today, <strong style="font-weight: 600;">${directCount.toLocaleString()}</strong> human payments moved <strong style="font-weight: 600;">${volStr}</strong>.<br>The network weather is <span style="font-style: italic; font-weight: 400; opacity: 0.8;">${weatherCondition}</span>.</span>`;"""
weather_update_new = """const newHtml = `<span style="font-weight: 300; font-size: clamp(20px, 2.5vw, 34px); letter-spacing: -0.02em; line-height: 1.4; display: inline-block;">Today, <strong style="font-weight: 600;">${directCount.toLocaleString()}</strong> human payments moved <strong style="font-weight: 600;">${volStr}</strong>.<br><span style="font-style: italic; font-weight: 300; opacity: 0.75;">The network weather is ${weatherCondition}.</span></span>`;
    if (weatherLine.innerHTML !== newHtml) {
      weatherLine.innerHTML = newHtml;
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(weatherLine, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' });
      }
    }"""
js = js.replace(weather_update_old, weather_update_new)

# ===================================================================
# 4. GSAP — Archive drawer open/close
# ===================================================================
archive_open_old = """archiveDrawer.classList.add('open');"""
archive_open_new = """archiveDrawer.classList.add('open');
    if (typeof gsap !== 'undefined') {
      gsap.fromTo(archiveDrawer, { x: 360, opacity: 0.5 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' });
    }"""
count = js.count(archive_open_old)
if count == 1:
    js = js.replace(archive_open_old, archive_open_new)
else:
    # Only replace the first instance (the toggle open)
    js = js.replace(archive_open_old, archive_open_new, 1)

# ===================================================================
# 5. GSAP — Portrait overlay entrance
# ===================================================================
artoverlay_after = """    if (typeof gsap !== 'undefined') {
      gsap.fromTo(artOverlay, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3, ease: 'power3.out' });
    }
    document.body.appendChild(artOverlay);"""
artoverlay_before = """document.body.appendChild(artOverlay);"""
# Replace the standalone append (without the surrounding setTimeout)
js = js.replace('    document.body.appendChild(artOverlay);\n    setTimeout', artoverlay_after + '\n    setTimeout')

# ===================================================================
# 6. GSAP — Stats bar fade-in on load
# ===================================================================
init_gsap_old = """requestAnimationFrame(draw);"""
init_gsap_new_marker = "// GSAP_BOOT_DONE"
if init_gsap_new_marker not in js:
    # Only inject once at the very first requestAnimationFrame(draw) call
    js = js.replace(
        "requestAnimationFrame(draw);",
        """// GSAP_BOOT_DONE
  if (typeof gsap !== 'undefined') {
    gsap.from('.stat-item', { opacity: 0, y: -8, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.3 });
    gsap.from('.legend-item', { opacity: 0, y: 6, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.5 });
  }
  requestAnimationFrame(draw);""",
        1  # only the first occurrence
    )

with open('mosaic.js', 'w', encoding='utf-8') as f:
    f.write(js)
print("GSAP transitions injected.")
