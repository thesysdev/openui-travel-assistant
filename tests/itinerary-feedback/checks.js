async (page) => {
  const assert = (ok, message) => { if (!ok) throw new Error(message); };
  const results = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const heart = page.locator('.pl-heart');
  const buttons = page.locator('.pl-save');
  const toast = page.locator('.pl-island');
  const flight = page.locator('body > .pl-flight');
  const tick = ms => page.clock.runFor(ms);
  const feedback = async (name, action) => {
    assert(await toast.locator('.pl-island__name').textContent() === name, 'Wrong place');
    assert(await toast.locator('.pl-island__line').textContent() === action, 'Wrong outcome');
  };
  await heart.click();
  const size = await flight.evaluate(el => {
    const s = getComputedStyle(el);
    return { width: s.width, height: s.height, position: s.position, pointerEvents: s.pointerEvents, hidden: el.getAttribute('aria-hidden') };
  });
  assert(size.width === '56px' && size.height === '56px' && size.position === 'fixed' && size.pointerEvents === 'none' && size.hidden === 'true', JSON.stringify(size));
  await tick(710);
  await feedback('Alpha', 'Saved to itinerary');
  assert(await heart.getAttribute('aria-pressed') === 'true', 'Heart not saved');
  assert(await flight.count() === 0, 'Flight leaked');
  results.push('Add: body flight fixed at 56x56, decorative; heart and toast agree');

  await heart.click();
  await feedback('Alpha', 'Removed from itinerary');
  assert(await heart.getAttribute('aria-pressed') === 'false', 'Heart not removed');
  await heart.click();
  assert(await toast.count() === 0, 'Old toast persisted during re-add');
  await tick(710);
  await feedback('Alpha', 'Saved to itinerary');
  results.push('Remove/re-add: explicit feedback and no stale toast');

  await heart.click();
  await heart.click();
  await tick(100);
  await heart.click();
  assert(await flight.count() === 0, 'Removal failed to cancel flight');
  await tick(750);
  await feedback('Alpha', 'Removed from itinerary');
  results.push('Rapid add/remove: cancelled 700ms arrival cannot show Saved');

  await buttons.nth(0).click();
  await buttons.nth(1).click();
  assert(await flight.count() === 1, 'Superseded flight leaked');
  await tick(710);
  await feedback('Beta', 'Saved to itinerary');
  assert(await page.locator('[data-testid=items]').textContent() === 'Alpha,Beta', 'Different-place state incorrect');
  await buttons.nth(0).click();
  await feedback('Alpha', 'Removed from itinerary');
  await tick(1710);
  assert(await toast.count() === 0, 'Toast failed to expire');
  results.push('SaveButton/different places: latest action is named correctly; toast expires');

  await heart.focus();
  await page.keyboard.press('Enter');
  await tick(710);
  await feedback('Alpha', 'Saved to itinerary');
  await page.keyboard.press('Space');
  await feedback('Alpha', 'Removed from itinerary');
  await heart.dispatchEvent('keydown', { key: 'Enter', repeat: true });
  assert(await heart.getAttribute('aria-pressed') === 'false', 'Repeated key toggled');
  results.push('Keyboard: Enter/Space toggle, held-key repeats ignored');

  await heart.click();
  await page.getByRole('button', { name: 'Switch trip' }).click();
  assert(await flight.count() === 0, 'Trip change leaked flight');
  await tick(710);
  assert(await toast.count() === 0, 'Trip change leaked feedback');
  await heart.click();
  await page.getByRole('button', { name: 'Toggle provider' }).click();
  assert(await flight.count() === 0, 'Unmount leaked flight');
  await tick(2400);
  assert(await toast.count() === 0, 'Unmount leaked toast');
  await page.getByRole('button', { name: 'Toggle provider' }).click();
  await heart.click();
  await feedback('Alpha', 'Removed from itinerary');
  results.push('Trip switch and StrictMode unmount/remount: pending flights and timers cleaned up');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await heart.click();
  assert(await flight.count() === 0, 'Reduced motion flew');
  await feedback('Alpha', 'Saved to itinerary');
  assert(await toast.evaluate(el => getComputedStyle(el).animationName) === 'none', 'Reduced motion animated');
  await heart.click();
  await feedback('Alpha', 'Removed from itinerary');
  results.push('Reduced motion toggled at runtime: immediate feedback, no animation');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 844 });
  await heart.click();
  assert(await flight.count() === 0, 'Hidden mobile tab received flight');
  await feedback('Alpha', 'Saved to itinerary');
  await tick(600);
  const bounds = await toast.boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 390, 'Mobile toast overflow');
  await page.screenshot({ path: 'output/playwright/mobile-feedback.png' });
  await heart.click();
  await feedback('Alpha', 'Removed from itinerary');
  await buttons.nth(2).click();
  await feedback('No photo', 'Saved to itinerary');
  assert(await flight.count() === 0, 'No-photo item flew');
  await page.getByRole('button', { name: 'Toggle provider' }).click();
  await tick(2400);
  assert(await toast.count() === 0, 'Open toast leaked after unmount');
  assert(errors.length === 0, errors.join('\n'));
  results.push('390px mobile/hidden target and no-photo fallback; open-toast unmount cleanup');
  return { browser: await page.context().browser().version(), passed: results };
}
