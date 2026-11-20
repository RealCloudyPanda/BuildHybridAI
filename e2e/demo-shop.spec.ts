import { expect, test } from "@playwright/test";

test("the linked shop reproduces the filter reset and lost scroll position", async ({ page }) => {
  await page.goto("/");
  const [shop] = await Promise.all([
    page.context().waitForEvent("page"),
    page.getByRole("link", { name: "Demo shop" }).click(),
  ]);
  await expect(shop).toHaveTitle(/Trailhead Supply/);
  await shop.getByRole("button", { name: "Tents" }).click();
  await expect(shop.locator(".card")).toHaveCount(4);
  await shop.getByRole("link", { name: /Ridgeline 2P/ }).click();
  await expect(shop.getByRole("heading", { name: "Ridgeline 2P" })).toBeVisible();
  await shop.goBack();
  await expect(shop.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  await expect(shop.locator(".card")).toHaveCount(12);

  await shop.getByRole("checkbox", { name: "In stock only" }).check();
  const kettle = shop.getByRole("link", { name: /Trail Kettle/ });
  await kettle.scrollIntoViewIfNeeded();
  expect(await shop.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await kettle.click();
  await expect(shop.getByRole("heading", { name: "Trail Kettle" })).toBeVisible();
  await shop.goBack();
  await expect(shop.getByRole("checkbox", { name: "In stock only" })).toBeChecked();
  await expect.poll(() => shop.evaluate(() => window.scrollY)).toBe(0);
});
