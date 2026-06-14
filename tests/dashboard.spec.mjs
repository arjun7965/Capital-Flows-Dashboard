import { expect, test } from "@playwright/test";

const marketData = {
  status: "ok",
  generatedAt: "2026-06-13T17:00:00.000Z",
  loadedCount: 7,
  totalCount: 7,
  oldestObservation: "2026-06-12",
  latestObservation: "2026-06-12",
  fields: {
    tny: { value: 4.25, observedAt: "2026-06-12", state: "fresh" },
    irx: { value: 4.05, observedAt: "2026-06-12", state: "fresh" },
    spread: { value: 0.2, observedAt: "2026-06-12", state: "fresh" },
    vix: { value: 18.2, observedAt: "2026-06-12", state: "fresh" },
    dxy: { value: 98.75, observedAt: "2026-06-12", state: "fresh" },
    sofr: { value: 4.31, observedAt: "2026-06-12", state: "fresh" },
    basis: { value: 2, observedAt: "2026-06-12", state: "fresh" },
  },
};

async function openDashboard(page) {
  await page.route("**/api/market-data", route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(marketData),
    }),
  );
  await page.goto("/");
  await expect(page.locator("#live-ts")).toContainText("7/7 fields");
}

function monitorRuntimeFailures(page) {
  const failures = [];
  page.on("pageerror", error => failures.push(`page error: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`console error: ${message.text()}`);
  });
  page.on("response", response => {
    if (response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on("requestfailed", request => {
    failures.push(`request failed: ${request.url()} (${request.failure()?.errorText})`);
  });
  return failures;
}

test("all tabs remain reachable and only one section is active", async ({ page }) => {
  const failures = monitorRuntimeFailures(page);
  await openDashboard(page);

  const buttons = page.locator("#nav button");
  await expect(buttons).toHaveCount(10);
  for (const button of await buttons.all()) {
    await button.click();
    await expect(page.locator(".section.active")).toHaveCount(1);
    await expect(button).toHaveClass(/active/);
  }

  expect(failures).toEqual([]);
});

test("Regime Check renders a complete playbook", async ({ page }) => {
  await openDashboard(page);
  await page.getByRole("button", { name: /Regime Check/ }).click();

  await page.locator("#rc-growth").selectOption({ index: 1 });
  await page.locator("#rc-inflation").selectOption({ index: 1 });
  await page.locator("#rc-fed").selectOption({ index: 1 });
  await page.locator("#rc-curve").selectOption({ index: 1 });
  await page.locator("#rc-credit").selectOption({ index: 1 });
  await page.locator("#rc-plumbing").selectOption({ index: 1 });
  await page.locator("#rc-check-btn").click();

  await expect(page.locator("#rc-result")).toHaveClass(/show/);
  await expect(page.locator("#rc-banner")).not.toBeEmpty();
  await expect(page.locator("#rc-own li")).not.toHaveCount(0);
  await expect(page.locator("#rc-stability")).toBeVisible();
});

for (const width of [320, 390, 768, 1280]) {
  test(`no page overflow across all tabs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openDashboard(page);

    const buttons = page.locator("#nav button");
    for (const button of await buttons.all()) {
      await button.click();
      const dimensions = await page.evaluate(() => {
        const clientWidth = document.documentElement.clientWidth;
        const offenders = [...document.querySelectorAll("body *")]
          .filter(element => {
            const rect = element.getBoundingClientRect();
            const outsideViewport = rect.right > clientWidth + 1 || rect.left < -1;
            const clipsItself = ["auto", "hidden", "scroll"].includes(
              getComputedStyle(element).overflowX,
            );
            return (
              (outsideViewport &&
                !element.closest("nav") &&
                !element.closest(".table-scroll")) ||
              (element.scrollWidth > element.clientWidth + 1 && !clipsItself)
            );
          })
          .slice(0, 8)
          .map(element => ({
            className: element.className,
            clientWidth: element.clientWidth,
            id: element.id,
            left: Math.round(element.getBoundingClientRect().left),
            overflowX: getComputedStyle(element).overflowX,
            right: Math.round(element.getBoundingClientRect().right),
            scrollWidth: element.scrollWidth,
            tag: element.tagName,
          }));
        return {
          clientWidth,
          offenders,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      expect(
        dimensions.scrollWidth,
        `Overflow in ${await button.textContent()}: ${JSON.stringify(dimensions.offenders)}`,
      ).toBeLessThanOrEqual(dimensions.clientWidth + 1);

      const overflowingTables = page.locator(
        ".section.active .table-scroll-shell.is-overflowing",
      );
      for (const shell of await overflowingTables.all()) {
        const localScroll = await shell.locator(".table-scroll").evaluate(element => ({
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
        expect(localScroll.scrollWidth).toBeGreaterThan(localScroll.clientWidth);
        if (width <= 700) {
          await expect(shell.locator(".table-scroll-hint")).toBeVisible();
        }
      }
    }
  });
}
