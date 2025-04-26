const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const baseUrl = 'https://www.kitapyurdu.com/index.php?route=product/category&filter_category_all=true&path=1&filter_in_stock=0&sort=purchased_365&order=DESC&limit=100&page=';
const outputDir = 'output/books.json';
const defaultBatchSize = 5;

function randomizeDelay(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getTotalPages() {
    const response = await axios.get(baseUrl + '1');
    const html = response.data;
    const $ = cheerio.load(html);
    const totalPages = parseInt($('.pagination .results').text().trim().split('(')[1].split(' ')[0]);
    return totalPages;
}

async function scrapePage(pageNumber) {
    const response = await axios.get(baseUrl + pageNumber);
    const html = response.data;
    const $ = cheerio.load(html);

    let books = [];

    $('.product-grid .product-cr').each((index, element) => {
        const mainParts = $(element).find('.product-info').text().trim().split('|').map(p => p.trim()).filter(Boolean) || [];

        let isbn = null;
        let language = null;
        let pageCount = null;
        let publishDate = null;

        if (mainParts.length > 0)  {
            mainParts.forEach(part => {
                if (/^\d{13}$/.test(part)) {
                    if (!isbn) isbn = part;
                } else if (/^[0-9]{1,4}$/.test(part)) {
                    if (!pageCount) pageCount = part;
                } else if (/TÜRKÇE|İNGİLİZCE|ALMANCA|FRANSIZCA|İSPANYOLCA/i.test(part)) {
                    if (!language) language = part;
                }
            });
    
            if (mainParts[mainParts.length - 1].length >= 10 && /^\d{4}-\d{2}-\d{2}$/.test(mainParts[mainParts.length - 1].slice(-10))) {
                publishDate = mainParts[mainParts.length - 1].slice(-10);
            }
        }

        const bookData = {
            id: $(element).attr('id').split('-')[1],
            title: $(element).find('.name span').text().trim(),
            author: $(element).find('.author a span').text().trim(),
            publisher: $(element).find('.publisher a span').text().trim(),
            image: $(element).find('.pr-img-link img').attr('src'),
            price: $(element).find('.price-new .value').text().trim(),
        };

        if (isbn || language || pageCount || publishDate) {
            bookData.details = {
                ...(isbn && { isbn }),
                ...(language && { language }),
                ...(pageCount && { pageCount }),
                ...(publishDate && { publishDate }),
            };
        }

        books.push(bookData);
    });

    return { books };
}

async function getBooks(totalPages) {
    fs.mkdirSync(path.dirname(outputDir), { recursive: true });
    fs.mkdirSync(path.dirname('output/booksWithoutDetails.json'), { recursive: true });

    let allBooks = [];

    const batchSize = defaultBatchSize || 5;
    for (let i = 1; i <= totalPages; i += batchSize) {
        const batchPages = [];

        for (let j = i; j < i + batchSize && j <= totalPages; j++) {
            batchPages.push(scrapePage(j));
        }

        const results = await Promise.all(batchPages);

        results.forEach(result => {
            allBooks.push(...result.books);
        });

        fs.writeFileSync(outputDir, JSON.stringify(allBooks, null, 2));

        console.log(`[${Math.min(i + batchSize - 1, totalPages)}/${totalPages}] scraping...`);
        
        await new Promise(resolve => setTimeout(resolve, randomizeDelay(250, 500)));
    }

    console.log(`Total books scraped: ${allBooks.length}`);
}

(async () => {
    const totalPages = await getTotalPages();
    console.log(`Total pages: ${totalPages}`);
    await getBooks(totalPages);
})();