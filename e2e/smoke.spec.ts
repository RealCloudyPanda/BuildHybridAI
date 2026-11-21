import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("sample-mode flow: report, questions, local-only, accessibility", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Filter resets after Back" }).click();
  await page.getByRole("button", { name: /Write report/ }).click();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(/List shows all products/);
  await expect(page.getByText(/Sample · no AI/)).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

  await page.getByRole("button", { name: "New draft" }).click();
  await page.getByRole("button", { name: "Vague notes" }).click();
  await page.getByRole("button", { name: /Write report/ }).click();
  await expect(page.locator(".q")).toHaveCount(4);
  await page.getByRole("button", { name: "Fill example answers" }).click();
  await page.getByRole("button", { name: "Update report" }).click();
  await expect(page.getByRole("textbox", { name: "Title" })).toHaveValue(/back button|lost my place/i);

  await page.getByRole("button", { name: "New draft" }).click();
  await page.getByRole("button", { name: "Notes with internal details" }).click();
  await expect(page.getByRole("radio", { name: /Local-only/ })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByText("Found an internal URL, an email and a token.")).toBeVisible();
});
