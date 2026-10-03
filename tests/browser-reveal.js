return (async () => {
  [...document.querySelectorAll('.practice-actions button')].find(button => button.textContent.includes('Show answer')).click();
  await new Promise(resolve => setTimeout(resolve, 30));
  const animated = [...document.querySelectorAll('.answer-animation path')];
  const delays = animated.map(path => Number.parseFloat(getComputedStyle(path).animationDelay));
  return {
    shadowPaths: document.querySelectorAll('.answer-shadow path').length,
    animationPaths: animated.length,
    firstStrokeDelay: delays[0],
    firstStrokeHiddenInitially: getComputedStyle(animated[0]).strokeDashoffset === '1px',
    sequential: delays.every((delay, i) => i === 0 || delay > delays[i - 1]),
    shadowSeparateFromDrawing: !!document.querySelector('.writing-box .answer-shadow') && !!document.querySelector('.writing-box .user-ink'),
    note: document.querySelector('.answer-note').textContent,
  };
})();
