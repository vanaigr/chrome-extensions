console.log('loaded')

const observer = new MutationObserver(() => {
    document.querySelectorAll('.rc-image-tile-wrapper > img').forEach(it => {
        it.style.backfaceVisibility = 'unset'
        it.style.webkitBackfaceVisibility = 'unset'
    })
});

observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  characterData: true,
});

