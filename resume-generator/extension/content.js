(() => {
    const clone = document.cloneNode(true)
    clone.querySelectorAll('script, style, noscript').forEach(el => el.remove())
    return clone.body.innerText
})();
