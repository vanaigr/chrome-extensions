(() => {
    const removeRoman = (text) => {
        return text.replace(/ [IV]+$/, '')
    }

    const tabName = document.title

    const title = (() => {
        let match = tabName.match(/^Job Application for (.+?) at .+$/)

        if(match) {
            return removeRoman(match[1])
        }

        return ''
    })()

  return {
    title,
    targetLocation: "",
  };
})();
