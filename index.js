const puppeteer = require('puppeteer');

const testLinkAvailable = 'https://holland2stay.com/residences.html?available_to_book=179';
const testLinkAmsterdam = 'https://holland2stay.com/residences.html?available_to_book=179&city=24';
const testLinkRotterdam = 'https://holland2stay.com/residences.html?city=25';
const liveLinkRotterdam = 'https://holland2stay.com/residences.html?available_to_book=179&city=25';
const activeLink = testLinkAvailable;
const testProperty = 'https://holland2stay.com/residences/kon-wilhelminaplein-29-k2.html';

(async () => {

    const browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--enable-logging',
            '--v=1',
            '--blink-settings=imagesEnabled=false',
        ]
    })
    console.log(await browser.version())

    // Navigate to listings page
    const page = await browser.newPage();
    await page.goto(activeLink, { waitUntil: 'networkidle2' });
    let listings = await page.$$('.productitem')
    console.info("Available listings:", listings.length)

    // Nothing to do if no listings
    if (listings.length < 1) return

    // Parse details of listings
    let listingDetails = []
    if (testProperty) listings = []
    for (const item of listings) {
        
        const priceEl = await item.$('.price')
        const priceContent = await page.evaluate(el => el.innerHTML, priceEl)
        const price = parseInt(priceContent.replace(/[€,]/g, ''))

        const detailsEl = await item.$('.area.city p')
        const detailsContent = await page.evaluate(el => el.innerHTML, detailsEl)
        const rooms = parseInt(detailsContent.match(/\d(?= Room)/g)[0])

        const titleEl = await item.$('.product-item-link')
        const titleContent = await page.evaluate(el => el.innerHTML, titleEl)
        const aptNo = titleContent.match(/(?!-)\d{3}(?=, )/g)[0]
        const story = parseInt(aptNo.toString()[0])
        const side = aptNo.toString()[2] % 2 ? false : true

        const link = await page.evaluate(el => el.href, titleEl)

        listingDetails.push({price, rooms, story, side, link})
    }

    // Score properties from worst to best
    /*
        1. Paarisarvuga korteri number
        2. Mida kõrgem korrus seda parem
        3.* Kahe toaline oleks super
    */
    let highestScore = 0
    let bestLink = listingDetails.length > 0 ? null : testProperty
    for (item of listingDetails) {

        item.score = item.rooms + item.story + ((item.side ? 1 : 0) * 3)
        
        // Too expensive
        if (item.price > 1000)
            item.score = 0

        // Too low
        if (item.story < 2)
            item.score = 0

        // We'll need this later
        if (item.score > highestScore) {
            highestScore = item.score
            bestLink = item.link
        }

        // Print this stuff out in the console
        const logItem = Object.assign({}, item)
        delete logItem.link
        console.log(logItem)
    }

    // Booking step 1: set calendar
    await page.goto(bestLink, { waitUntil: 'networkidle2' });
    page.evaluate(() => {
        document.querySelector('.ui-datepicker-calendar a').click()

        // Not sure if the website JS is sync or in what order it executes
        setTimeout(() => {
            document.querySelector('#product-addtocart-button').click()
        }, 1000);
    })
    page.waitForNavigation({ waitUntil: 'networkidle2'})

    // Booking step 2: place order
    page.evaluate(() => {
        document.querySelector('#appmerce_omnikassa_mastercard').click()

        // Prices and stuff is recalculating for a few seconds
        setTimeout(() => {
            document.querySelector('button[title="Place Order"]:not([disabled])').click()
        }, 4000)

    })
    page.waitForNavigation({ waitUntil: 'networkidle2' })

    await browser.close()
})()