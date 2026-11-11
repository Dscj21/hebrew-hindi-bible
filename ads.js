// Ad hooks; all IDs in ads.json. Web: AdSense into .ad-slot containers. Android (Capacitor): AdMob banner + optional interstitial.
const Ads = (() => {
  let cfg = null, chapters = 0, admob = null;
  const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const demo = () => /[?&]adsdemo=1/.test(location.search);
  async function init() {
    try { cfg = await (await fetch('ads.json')).json(); } catch { cfg = { enabled: false }; }
    if (!cfg.enabled) return;
    if (native()) {
      admob = window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob;
      if (admob) try {
        await admob.initialize({ initializeForTesting: !!cfg.android.testing });
        if (cfg.android.bannerId) {
          // banner sits just above the bottom navigation bar (60dp); --adh reserves its height in the layout
          try { admob.addListener('bannerAdSizeChanged', s => s && s.height && document.documentElement.style.setProperty('--adh', s.height + 'px')); } catch {}
          await admob.showBanner({ adId: cfg.android.bannerId, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 62, isTesting: !!cfg.android.testing });
          document.body.classList.add('has-native-banner');
          document.documentElement.style.setProperty('--adh', '56px');
        }
        if (cfg.android.interstitialId && cfg.interstitialEveryChapters > 0)
          await admob.prepareInterstitial({ adId: cfg.android.interstitialId, isTesting: !!cfg.android.testing });
      } catch (e) { console.warn('admob', e); }
    } else if (cfg.web && cfg.web.adsenseClient) {
      const s = document.createElement('script');
      s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.web.adsenseClient);
      document.head.appendChild(s);
    }
    fill();
  }
  function fill() {
    if (!cfg || !cfg.enabled) return;
    document.querySelectorAll('.ad-slot:not([data-done])').forEach(el => {
      el.dataset.done = 1;
      const slot = el.dataset.slot === 'banner' ? cfg.web?.bannerSlot : cfg.web?.inChapterSlot;
      if (!native() && cfg.web?.adsenseClient && slot) {
        el.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${cfg.web.adsenseClient}" data-ad-slot="${slot}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
        el.classList.add('on'); try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
      } else if (cfg.showPlaceholders || demo()) { el.classList.add('on', 'demo'); el.textContent = 'Ad'; }
      if (el.id === 'adbar' && el.classList.contains('on')) document.documentElement.style.setProperty('--adh', '52px');
    });
  }
  const everyVerses = () => (cfg && cfg.enabled && (cfg.web?.inChapterSlot || cfg.showPlaceholders || demo()) && !native() && cfg.inChapterEveryVerses) || 0;
  async function onChapter() {
    chapters++;
    const n = cfg && cfg.interstitialEveryChapters;
    if (admob && n > 0 && chapters % n === 0) try {
      await admob.showInterstitial();
      await admob.prepareInterstitial({ adId: cfg.android.interstitialId, isTesting: !!cfg.android.testing });
    } catch {}
  }
  return { init, fill, everyVerses, onChapter, ready: () => cfg !== null };
})();
