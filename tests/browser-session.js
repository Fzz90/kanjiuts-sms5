return (async () => {
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  const firstMeeting = document.querySelector('.meeting-card');
  firstMeeting.click();
  await pause();
  let count = 0;
  while (document.querySelector('.practice-screen') && count < 100) {
    const skip = document.querySelector('.skip-button');
    if (!skip) throw new Error('Skip button missing');
    skip.click();
    count++;
    await pause();
  }
  const summary = document.querySelector('.result-screen')?.textContent;
  const review = document.querySelector('.result-screen .primary-button');
  if (!summary || !review) throw new Error('Session summary or review missing');
  review.click();
  await pause();
  return { skippedQuestions: count, summary, reviewStarted: !!document.querySelector('.practice-screen'), reviewProgress: document.querySelector('.session-progress')?.textContent };
})();
