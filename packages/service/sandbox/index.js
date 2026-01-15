import { chromium } from "playwright"

async function main() {
    const browser = await chromium.launch({
        headless: true,
        args: [
            '--disable-features=PrivateNetworkAccessSendPreflights,PrivateNetworkAccessRespectPreflightResults',
            '--disable-web-security',
        ],
    })

    const page = await browser.newPage()
    page.on('console', msg => console.log(msg.text()));
    page.on("request", req => console.log(req.url()));

    await page.goto("https://maditya.sh")

    // Inject Sentry after page loads
    await page.addScriptTag({
        url: "https://browser.sentry-cdn.com/10.33.0/bundle.tracing.min.js",
        type: "text/javascript",
    });

    await page.addScriptTag({
        url: "https://browser.sentry-cdn.com/10.33.0/spotlight.min.js",
        type: "text/javascript",
    });

    await page.evaluate(() => {
        Sentry.init({
            dsn: "",
            sendDefaultPii: true,
            spotlight: true,
            enableLogs: true,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.spotlightBrowserIntegration()
            ],
            tracesSampleRate: 1.0,
        });
        console.log("Sentry initialized");
    });

    await page.waitForTimeout(2000)

    await page.goto("https://maditya.sh/404")

    await browser.close()
}

main()