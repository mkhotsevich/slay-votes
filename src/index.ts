import {Builder, Browser, By, until, WebElement} from 'selenium-webdriver'
import { Options } from 'selenium-webdriver/chrome'
import axios from "axios";

const votes: string[] = [];
const nameArg = process.argv.slice(2)[0] as unknown as string;
const count = +process.argv.slice(2)[1];

if (nameArg !== '-c') {
    console.log('Укажите количество голосов через параметр -c. Пример npm run start -- -c 100')
    process.exit(0)
}
if (isNaN(count) || count <= 0) {
    console.log('Укажите корректное количество голосов. Минимум 1')
    process.exit(0)
}

(async function slayHack() {
    if (votes.length >= count) {
        console.log(JSON.stringify(votes))
        console.log(`Создано голосов: ${votes.length}`)
        return
    }

    const driver = await new Builder().withCapabilities(Options.chrome().setPageLoadStrategy('eager')).forBrowser(Browser.CHROME).build();

    try {
        await driver.get('https://internxt.com/ru/temporary-email');

        const generateNode = await driver.wait(until.elementLocated(By.xpath("//*[@id=\"__next\"]/section[1]/div/div[2]/div[1]/div[1]/div/p")), 10000)
        const emailNode = await driver.wait(until.elementTextContains(generateNode, '.info'), 10000)
        const email = await emailNode.getText()
        await axios.post('https://api.slay-award.ru/api/user-auth/registration', { email, password: "Slay!"})
        await driver.sleep(1000)
        await driver.executeScript('window.scrollBy(0, 250)')
        const refreshButton = await driver.wait(until.elementLocated(By.css('#__next > section.overflow-hidden.bg-gradient-to-b.from-white.to-gray-1.pt-32.pb-20 > div > div.flex.h-\\[512px\\].w-full.max-w-3xl.flex-row.space-y-2.overflow-hidden.rounded-xl.border.border-gray-10.shadow-subtle-hard > div:nth-child(1) > div > div.flex.w-full.flex-row.justify-between.rounded-tl-xl.border-b.border-gray-10.bg-gray-5.px-4.py-5 > svg')), 10000)
        const newEmailButton = await driver.wait(async () => {
            await driver.actions().click(refreshButton).perform()
            return until.elementLocated(By.xpath('//*[@id="__next"]/section[1]/div/div[3]/div[1]/div/div[2]/button')).fn(driver) as unknown as WebElement
        }, 20000)
        await newEmailButton.click()
        await driver.sleep(1000)

        const codeNode = await driver.wait(until.elementLocated(By.xpath('//*[@id="__next"]/section[1]/div/div[3]/div[2]/div/div/div[3]/h1')), 10000)
        const code = await codeNode.getText()
        if (!code) {
            throw new Error("Ошибка при получении кода");
        }

        const { data } = await axios.post('https://api.slay-award.ru/api/user-auth/email-confirmation', { email, code: Number(code) })
        const jwt = data.jwt_token
        if (!jwt) {
            throw new Error(`Ошибка при получении jwt: ${data.message}`);
        }

        const result = await axios.post('https://api.slay-award.ru/api/votes', {
            categoryId: 1,
            suggestedParticipant: 'hotsavage666'
        }, { headers: { 'Authorization': `Bearer ${jwt}` }})

        if (result.data.id) {
            console.log(`Голос ${result.data.id} добавлен`)
            votes.push(result.data.id)
        }
    } catch (e) {
        // @ts-ignore
        console.log('Ошибка', e?.message)
    } finally {
        await driver.quit()
        await slayHack()
    }
})();

