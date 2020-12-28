const { sleep } = require("./common.js");
const webdriver = require('selenium-webdriver');
const {Builder, By, until} = webdriver;

async function performActions(username, password, actions) {
    let caps = webdriver.Capabilities.chrome();
    caps.set("chromeOptions", {args: ["--headless"]});
    let driver = await new Builder().forBrowser("chrome").withCapabilities(caps).build();
    try {
        const timeout = 20000;
        const error = "Failed to locate element";
        (await driver.get("https://forum.minetest.net/ucp.php?mode=login"));
        (await driver.findElement(By.name("username"))).sendKeys(username);
        (await driver.findElement(By.name("password"))).sendKeys(password);
        (await driver.findElement(By.name("autologin"))).click();
        (await driver.findElement(By.name("viewonline"))).click();
        (await driver.findElement(By.name("login"))).click();
        await driver.wait(until.elementLocated(By.css("a[title=Logout]")), timeout, error, 1000);
        for (const action of actions) {
            if (action.type === "edit") {
                await driver.get("https://forum.minetest.net/viewtopic.php?t="+action.id);
                (await driver.findElement(By.css('a[title="Edit post"]'))).click();
                await driver.wait(until.elementLocated(By.name('subject')), timeout, error, 1000);
                await driver.wait(until.elementLocated(By.name('message')), timeout, error, 1000);
                await driver.wait(until.elementLocated(By.name('post')), timeout, error, 1000);
                driver.wait(sleep(1));
                await driver.executeScript(
                    "document.getElementsByName('subject')[0].setAttribute('value', "+JSON.stringify(action.subject)+");" + 
                    "document.getElementsByName('message')[0].textContent = "+JSON.stringify(action.message)+";"
                );
                driver.wait(sleep(2));
                (await driver.findElement(By.name("post"))).click();
                // HACK as the above sometimes fails for no reason
                driver.wait(sleep(1));
                (await driver.findElement(By.name("post"))).click();
                await driver.wait(until.titleIs(action.subject + " - Minetest Forums"), timeout, error, 1000);
                console.log("Edited " + action.id + ", new subject: " + action.subject)
            } else {
                throw Error("Action "+action.type+" not supported yet");
            }
        }
        // TODO logout
    } finally {
        try {
            await driver.close();
        } catch (e) {
            // quitting a headless driver causes an error to be thrown
            console.error(e);
        }
    }
}

module.exports = performActions;