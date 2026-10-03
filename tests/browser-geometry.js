return (async () => {
  const { loadCharacter } = await import('/src/lib/bank.js');
  const { gradeDrawing } = await import(`/src/lib/grading.js?qa=${Date.now()}`);
  const manifest = await (await fetch('/strokes/manifest.json')).json();
  const exactFailures = [], translatedFailures = [], reverseAccepted = [], swappedAccepted = [];
  const references = {};
  for (const character of Object.keys(manifest.characters)) {
    const asset = await loadCharacter(character);
    references[character] = asset.reference;
    if (!gradeDrawing(asset.reference, asset.reference).correct) exactFailures.push(character);
    const translated = asset.reference.map(stroke => stroke.map((p, i) => ({ x: p.x * .87 + .05 + Math.sin(i) * .008, y: p.y * .87 + .04 + Math.cos(i) * .008 })));
    const translatedResult = gradeDrawing(translated, asset.reference);
    if (!translatedResult.correct) translatedFailures.push({ character, type: translatedResult.type, stroke: translatedResult.stroke });
    const reversed = asset.reference.map((stroke, i) => i === 0 ? [...stroke].reverse() : stroke);
    if (gradeDrawing(reversed, asset.reference).correct) reverseAccepted.push(character);
    if (asset.reference.length > 1) {
      const swapped = [asset.reference[1], asset.reference[0], ...asset.reference.slice(2)];
      if (gradeDrawing(swapped, asset.reference, 'relaxed').correct) swappedAccepted.push(character);
    }
  }
  window.__qaReferences = references;
  window.__qaGeometry = { characters: Object.keys(references).length, exactFailures, translatedFailures, reverseAccepted, swappedAccepted };
  return { ...window.__qaGeometry, translatedFailures: translatedFailures.slice(0, 12), translatedFailureCount: translatedFailures.length };
})()
